"""
3D CAD Workpiece Analyzer & Automatic Feature Recognition (AFR) Engine (SKM v2.3).

Pure-Python (zero external native dependencies) parser for:
1. ISO 10303-21 STEP (.step / .stp, AP203 / AP214 / AP242):
   - Extracts part name, 3D bounding box (X x Y x Z mm), stock volume.
   - Reads B-Rep topology: ADVANCED_FACE -> CYLINDRICAL_SURFACE / PLANE / CONICAL / TOROIDAL / B_SPLINE.
   - Distinguishes EXTERNAL cylinders (same_sense=.T., shaft/flange OD) vs INTERNAL bores & holes
     (same_sense=.F. or inner radial cylinders), merges split-half cylinders, extracts hole depths
     from linked CIRCLE/VERTEX_POINT projections, detects narrow grooves, planar milling faces,
     and 3D freeform surfaces.
2. Binary & ASCII STL (.stl):
   - Computes exact 3D bounding box, signed mesh volume (divergence theorem), stock volume,
     and estimated chip removal volume (cm3).
   - Analyzes triangle normal distributions to classify rotational vs prismatic workpieces
     and detect primary machining operations & internal hole clusters.
3. Parametric ISO 10303-21 STEP Demo Workpiece Generator (shaft, flange, milled housing).
"""

from __future__ import annotations

import math
import re
import struct
from typing import Any, Dict, List, Literal, Optional, Tuple


# -----------------------------------------------------------------------------
# STEP ISO 10303-21 Entity Parser & B-Rep Feature Recognizer
# -----------------------------------------------------------------------------

def _split_top_level_args(arg_str: str) -> List[str]:
    """Splits a STEP entity parameter string by top-level commas (respecting parens & quotes)."""
    parts: List[str] = []
    cur: List[str] = []
    depth = 0
    in_str = False
    i = 0
    n = len(arg_str)
    while i < n:
        ch = arg_str[i]
        if ch == "'" and not in_str:
            in_str = True
            cur.append(ch)
        elif ch == "'" and in_str:
            if i + 1 < n and arg_str[i + 1] == "'":
                cur.append("''")
                i += 1
            else:
                in_str = False
                cur.append(ch)
        elif not in_str:
            if ch == "(":
                depth += 1
                cur.append(ch)
            elif ch == ")":
                depth = max(0, depth - 1)
                cur.append(ch)
            elif ch == "," and depth == 0:
                parts.append("".join(cur).strip())
                cur = []
            else:
                cur.append(ch)
        else:
            cur.append(ch)
        i += 1
    if cur or parts:
        parts.append("".join(cur).strip())
    return parts


def _parse_num_tuple(s: str) -> Optional[Tuple[float, float, float]]:
    # Strip quoted STEP label strings like 'P1' or 'H0_B' before extracting numeric tuple (x, y, z)
    no_quotes = re.sub(r"'[^']*'", "", s)
    m_tup = re.search(r"\(([^()]+)\)", no_quotes)
    target = m_tup.group(1) if m_tup else no_quotes
    nums = re.findall(r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?", target)
    if len(nums) >= 3:
        return (float(nums[0]), float(nums[1]), float(nums[2]))
    return None


def _extract_refs(s: str) -> List[int]:
    return [int(x) for x in re.findall(r"#(\d+)", re.sub(r"'[^']*'", "", s))]


def _normalize_vec(v: Tuple[float, float, float]) -> Tuple[float, float, float]:
    mag = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    if mag < 1e-9:
        return (0.0, 0.0, 1.0)
    vx, vy, vz = v[0] / mag, v[1] / mag, v[2] / mag
    # Canonical sign so +Z and -Z map to the same axis direction
    if (vz < -1e-4) or (abs(vz) <= 1e-4 and vy < -1e-4) or (abs(vz) <= 1e-4 and abs(vy) <= 1e-4 and vx < -1e-4):
        vx, vy, vz = -vx, -vy, -vz
    return (vx, vy, vz)


def _dot(a: Tuple[float, float, float], b: Tuple[float, float, float]) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def parse_step_workpiece(step_text: str, filename: str = "model.step") -> Dict[str, Any]:
    """
    Parses an ISO 10303-21 ASCII STEP file and extracts B-Rep geometry & machining features.
    """
    # Strip /* ... */ comments and collapse newlines inside DATA section
    cleaned = re.sub(r"/\*.*?\*/", " ", step_text or "", flags=re.DOTALL)

    part_name = filename.rsplit(".", 1)[0] if "." in filename else filename
    m_fn = re.search(r"FILE_NAME\s*\(\s*'([^']+)'", cleaned, flags=re.IGNORECASE)
    if m_fn and m_fn.group(1).strip():
        part_name = m_fn.group(1).strip().rsplit(".", 1)[0]

    # Parse all #id = TYPE(args); statements
    entities: Dict[int, Tuple[str, str]] = {}
    for m in re.finditer(r"#(\d+)\s*=\s*([A-Z0-9_]+)\s*\((.*?)\)\s*;", cleaned, flags=re.DOTALL | re.IGNORECASE):
        eid = int(m.group(1))
        etype = m.group(2).upper()
        eargs = m.group(3).strip()
        entities[eid] = (etype, eargs)

    # Check PRODUCT name if more descriptive
    for etype, eargs in entities.values():
        if etype == "PRODUCT":
            args = _split_top_level_args(eargs)
            if len(args) >= 2:
                pname = args[1].strip().strip("'")
                if pname and pname.lower() not in ("none", "part", "solid", ""):
                    part_name = pname
                    break

    points: Dict[int, Tuple[float, float, float]] = {}
    directions: Dict[int, Tuple[float, float, float]] = {}
    axes: Dict[int, Tuple[Tuple[float, float, float], Tuple[float, float, float]]] = {}
    cyl_surfs: Dict[int, Dict[str, Any]] = {}
    planes: Dict[int, Tuple[Tuple[float, float, float], Tuple[float, float, float]]] = {}
    circles: Dict[int, Dict[str, Any]] = {}
    vertex_pts: List[Tuple[float, float, float]] = []

    conical_count = 0
    freeform_count = 0

    for eid, (etype, eargs) in entities.items():
        if etype == "CARTESIAN_POINT":
            pt = _parse_num_tuple(eargs)
            if pt is not None:
                points[eid] = pt
        elif etype == "DIRECTION":
            dv = _parse_num_tuple(eargs)
            if dv is not None:
                directions[eid] = _normalize_vec(dv)

    for eid, (etype, eargs) in entities.items():
        if etype == "VERTEX_POINT":
            refs = _extract_refs(eargs)
            if refs and refs[0] in points:
                vertex_pts.append(points[refs[0]])
        elif etype == "AXIS2_PLACEMENT_3D":
            refs = _extract_refs(eargs)
            origin = points.get(refs[0], (0.0, 0.0, 0.0)) if len(refs) >= 1 else (0.0, 0.0, 0.0)
            z_dir = directions.get(refs[1], (0.0, 0.0, 1.0)) if len(refs) >= 2 else (0.0, 0.0, 1.0)
            axes[eid] = (origin, z_dir)

    for eid, (etype, eargs) in entities.items():
        if etype == "CYLINDRICAL_SURFACE":
            args = _split_top_level_args(eargs)
            refs = _extract_refs(args[1]) if len(args) >= 2 else []
            rad = None
            if len(args) >= 3:
                try:
                    rad = abs(float(args[2]))
                except ValueError:
                    rad = None
            if refs and refs[0] in axes and rad and rad > 0.2:
                origin, axis_dir = axes[refs[0]]
                cyl_surfs[eid] = {
                    "id": eid,
                    "origin": origin,
                    "axis": axis_dir,
                    "radius_mm": rad,
                    "diameter_mm": round(rad * 2.0, 2),
                    "same_senses": [],
                    "z_coords": [],
                }
        elif etype == "PLANE":
            refs = _extract_refs(eargs)
            if refs and refs[0] in axes:
                planes[eid] = axes[refs[0]]
        elif etype == "CIRCLE":
            args = _split_top_level_args(eargs)
            refs = _extract_refs(args[1]) if len(args) >= 2 else []
            rad = None
            if len(args) >= 3:
                try:
                    rad = abs(float(args[2]))
                except ValueError:
                    rad = None
            if refs and refs[0] in axes and rad and rad > 0.2:
                origin, axis_dir = axes[refs[0]]
                circles[eid] = {"origin": origin, "axis": axis_dir, "radius_mm": rad}
        elif etype == "CONICAL_SURFACE":
            conical_count += 1
        elif etype in ("TOROIDAL_SURFACE", "SPHERICAL_SURFACE", "B_SPLINE_SURFACE", "B_SPLINE_SURFACE_WITH_KNOTS"):
            freeform_count += 1

    # Link ADVANCED_FACE -> CYLINDRICAL_SURFACE to determine same_sense (.T. external vs .F. internal)
    # and trace linked EDGE_LOOP -> ORIENTED_EDGE -> EDGE_CURVE -> CIRCLE / VERTEX_POINT for cylinder length!
    edge_curve_pts: Dict[int, List[Tuple[float, float, float]]] = {}
    for eid, (etype, eargs) in entities.items():
        if etype == "EDGE_CURVE":
            refs = _extract_refs(eargs)
            pts_here: List[Tuple[float, float, float]] = []
            for r in refs[:2]:
                if r in entities and entities[r][0] == "VERTEX_POINT":
                    vp_refs = _extract_refs(entities[r][1])
                    if vp_refs and vp_refs[0] in points:
                        pts_here.append(points[vp_refs[0]])
            if len(refs) >= 3 and refs[2] in circles:
                pts_here.append(circles[refs[2]]["origin"])
            edge_curve_pts[eid] = pts_here

    oriented_edge_to_ec: Dict[int, int] = {}
    for eid, (etype, eargs) in entities.items():
        if etype == "ORIENTED_EDGE":
            refs = _extract_refs(eargs)
            if refs:
                oriented_edge_to_ec[eid] = refs[-1]

    loop_pts: Dict[int, List[Tuple[float, float, float]]] = {}
    for eid, (etype, eargs) in entities.items():
        if etype == "EDGE_LOOP":
            pts_l: List[Tuple[float, float, float]] = []
            for oe_id in _extract_refs(eargs):
                ec_id = oriented_edge_to_ec.get(oe_id)
                if ec_id and ec_id in edge_curve_pts:
                    pts_l.extend(edge_curve_pts[ec_id])
            loop_pts[eid] = pts_l

    bound_pts: Dict[int, List[Tuple[float, float, float]]] = {}
    for eid, (etype, eargs) in entities.items():
        if etype in ("FACE_OUTER_BOUND", "FACE_BOUND"):
            refs = _extract_refs(eargs)
            if refs and refs[0] in loop_pts:
                bound_pts[eid] = loop_pts[refs[0]]

    for eid, (etype, eargs) in entities.items():
        if etype == "ADVANCED_FACE":
            args = _split_top_level_args(eargs)
            if len(args) >= 4:
                bound_refs = _extract_refs(args[1])
                surf_refs = _extract_refs(args[2])
                same_sense = args[3].strip().upper() == ".T."
                if surf_refs and surf_refs[0] in cyl_surfs:
                    cs = cyl_surfs[surf_refs[0]]
                    cs["same_senses"].append(same_sense)
                    for br in bound_refs:
                        for pt in bound_pts.get(br, []):
                            cs["z_coords"].append(_dot(pt, cs["axis"]))

    # Also match standalone CIRCLEs to cylindrical surfaces sharing the same axis line & radius
    for c_info in circles.values():
        c_ax = c_info["axis"]
        c_or = c_info["origin"]
        c_r = c_info["radius_mm"]
        for cs in cyl_surfs.values():
            if abs(cs["radius_mm"] - c_r) > 0.08:
                continue
            if abs(_dot(cs["axis"], c_ax)) < 0.995:
                continue
            # Check perpendicular distance from circle origin to cylinder axis
            dx = c_or[0] - cs["origin"][0]
            dy = c_or[1] - cs["origin"][1]
            dz = c_or[2] - cs["origin"][2]
            proj = dx * cs["axis"][0] + dy * cs["axis"][1] + dz * cs["axis"][2]
            perp_sq = max(0.0, (dx * dx + dy * dy + dz * dz) - proj * proj)
            if math.sqrt(perp_sq) < 0.15:
                cs["z_coords"].append(_dot(c_or, cs["axis"]))

    # Bounding Box calculation (prefer vertex points + circle extents, fallback to all CARTESIAN_POINTs)
    bbox_pts: List[Tuple[float, float, float]] = list(vertex_pts)
    for c_info in circles.values():
        ox, oy, oz = c_info["origin"]
        r = c_info["radius_mm"]
        ax = c_info["axis"]
        # Add rough radial extrema around circle
        if abs(ax[2]) > 0.9:
            bbox_pts.extend([(ox - r, oy, oz), (ox + r, oy, oz), (ox, oy - r, oz), (ox, oy + r, oz)])
        elif abs(ax[0]) > 0.9:
            bbox_pts.extend([(ox, oy - r, oz), (ox, oy + r, oz), (ox, oy, oz - r), (ox, oy, oz + r)])
        else:
            bbox_pts.extend([(ox - r, oy, oz), (ox + r, oy, oz), (ox, oy, oz - r), (ox, oy, oz + r)])

    if not bbox_pts:
        bbox_pts = list(points.values())

    if bbox_pts:
        xs = [p[0] for p in bbox_pts]
        ys = [p[1] for p in bbox_pts]
        zs = [p[2] for p in bbox_pts]
        bbox_x = round(max(xs) - min(xs), 1)
        bbox_y = round(max(ys) - min(ys), 1)
        bbox_z = round(max(zs) - min(zs), 1)
    else:
        bbox_x = bbox_y = bbox_z = 0.0

    # Merge split cylindrical faces representing the same physical cylinder (axis line + radius)
    merged_cyls: Dict[Tuple[Any, ...], Dict[str, Any]] = {}
    for cs in cyl_surfs.values():
        ax = cs["axis"]
        orig = cs["origin"]
        # Project origin onto plane perpendicular to axis to get unique line signature
        proj = _dot(orig, ax)
        px = round(orig[0] - proj * ax[0], 1)
        py = round(orig[1] - proj * ax[1], 1)
        pz = round(orig[2] - proj * ax[2], 1)
        key = (
            round(ax[0], 2), round(ax[1], 2), round(ax[2], 2),
            px, py, pz,
            round(cs["diameter_mm"], 2),
        )
        if key not in merged_cyls:
            merged_cyls[key] = {
                "diameter_mm": cs["diameter_mm"],
                "axis": ax,
                "origin_perp": (px, py, pz),
                "same_senses": list(cs["same_senses"]),
                "z_coords": list(cs["z_coords"]),
            }
        else:
            merged_cyls[key]["same_senses"].extend(cs["same_senses"])
            merged_cyls[key]["z_coords"].extend(cs["z_coords"])

    # Classify each merged cylinder: EXTERNAL vs INTERNAL + length
    external_cyls: List[Dict[str, Any]] = []
    internal_cyls: List[Dict[str, Any]] = []
    dims_sorted = sorted([bbox_x, bbox_y, bbox_z])
    default_depth = round(max(dims_sorted[0], 15.0), 1) if dims_sorted[0] > 0 else 25.0

    all_merged = list(merged_cyls.values())
    max_cyl_d = max((c["diameter_mm"] for c in all_merged), default=0.0)

    for c in all_merged:
        zs = c["z_coords"]
        length_mm = round(max(zs) - min(zs), 1) if len(zs) >= 2 and (max(zs) - min(zs)) > 0.2 else default_depth
        senses = c["same_senses"]
        if senses:
            # In STEP B-Rep: same_sense=.T. => outward normal away from axis (external OD);
            # same_sense=.F. => outward normal toward axis (internal hole / bore).
            is_internal = (senses.count(False) >= senses.count(True))
        else:
            is_internal = c["diameter_mm"] < max_cyl_d * 0.85

        entry = {
            "diameter_mm": c["diameter_mm"],
            "length_mm": length_mm,
            "axis": c["axis"],
            "origin_perp": c["origin_perp"],
            "is_internal": is_internal,
        }
        if is_internal:
            internal_cyls.append(entry)
        else:
            external_cyls.append(entry)

    # Check if part is rotational (body of revolution) vs prismatic
    max_ext_d = max((c["diameter_mm"] for c in external_cyls), default=0.0)
    # Count distinct plane normals
    plane_normals = {
        (round(ax[0], 2), round(ax[1], 2), round(ax[2], 2))
        for _, ax in planes.values()
    }
    # If the largest external cylinder spans ~2 of the 3 bbox dimensions -> rotational shaft/flange
    rotational_match = False
    if max_ext_d > 5.0 and bbox_x > 0 and bbox_y > 0 and bbox_z > 0:
        near_d = sum(1 for dim in (bbox_x, bbox_y, bbox_z) if abs(dim - max_ext_d) <= max(2.5, max_ext_d * 0.08))
        if near_d >= 2:
            rotational_match = True

    # Group internal cylinders by (diameter, length) to detect hole patterns (e.g., 6x Ø12)
    hole_groups: Dict[Tuple[float, float], int] = {}
    for ic in internal_cyls:
        d_key = round(ic["diameter_mm"], 1)
        l_key = round(ic["length_mm"], 0)
        hole_groups[(d_key, l_key)] = hole_groups.get((d_key, l_key), 0) + 1

    # Detect grooves: narrow external step cylinders (width <= 8 mm and smaller than max_ext_d)
    grooves: List[Dict[str, float]] = []
    if rotational_match and len(external_cyls) >= 2:
        for ec in external_cyls:
            if ec["diameter_mm"] < max_ext_d * 0.96 and 1.2 <= ec["length_mm"] <= 8.0:
                grooves.append({"diameter_mm": ec["diameter_mm"], "width_mm": ec["length_mm"]})

    # Build recognized features list (ready for DrawingFeature)
    features_raw: List[Dict[str, Any]] = []
    f_seq = 1

    def add_feat(kind: str, title: str, **kw: Any) -> None:
        nonlocal f_seq
        features_raw.append({"id": f"cad-{f_seq}", "kind": kind, "title": title, "source": "STEP_3D", **kw})
        f_seq += 1

    if rotational_match:
        # Rotational workpiece (shaft, flange, bushing)
        axial_len = round(
            next((dim for dim in (bbox_x, bbox_y, bbox_z) if abs(dim - max_ext_d) > max(2.5, max_ext_d * 0.08)), max(bbox_x, bbox_y, bbox_z)),
            1,
        )
        add_feat(
            "EXTERNAL_ROUGH",
            f"Наружное точение Ø{max_ext_d:g} (из STEP)",
            diameter_mm=max_ext_d,
            length_or_depth_mm=axial_len,
            count=1,
            notes=f"Распознано {len(external_cyls)} наруж. цилиндр. поверхностей (3D STEP)",
        )
        if len(external_cyls) >= 2:
            add_feat(
                "EXTERNAL_FINISH",
                f"Чистовое точение ступеней Ø{max_ext_d:g}",
                diameter_mm=max_ext_d,
                length_or_depth_mm=axial_len,
                count=1,
                ra_um=1.6,
                notes="Ступенчатый профиль в 3D-модели требует чистового прохода",
            )
        for g in grooves[:2]:
            add_feat(
                "GROOVE_PARTING",
                f"Канавка из STEP (шир. {g['width_mm']:g} мм, Ø{g['diameter_mm']:g})",
                diameter_mm=g["diameter_mm"],
                width_mm=g["width_mm"],
                count=1,
                notes="Обнаружена узкая цилиндрическая проточка в 3D STEP",
            )
    else:
        # Prismatic / Housing / Plate workpiece
        if len(planes) >= 2:
            add_feat(
                "FACE_MILL",
                f"Торцевое фрезерование плоскостей ({bbox_x:g}×{bbox_y:g} мм)",
                length_or_depth_mm=max(bbox_x, bbox_y, bbox_z) or 120.0,
                count=1,
                notes=f"Обнаружено {len(planes)} плоских граней ({len(plane_normals)} ортогон. направлений)",
            )
        if len(planes) >= 6 or len(external_cyls) >= 1:
            add_feat(
                "SHOULDER_POCKET",
                "Фрезерование уступов / контура / карманов (90°)",
                length_or_depth_mm=max(bbox_x, bbox_y, bbox_z) or 100.0,
                count=1,
                notes="Контурная и уступная 3D-обработка призматической заготовки",
            )

    # Internal holes & bores
    for (d_val, l_val), cnt in sorted(hole_groups.items(), key=lambda kv: (-kv[0][0] if kv[0][0] > 42 else kv[0][0])):
        if d_val < 2.0:
            continue
        if (d_val >= 42.0 or (rotational_match and d_val >= 26.0 and cnt == 1)):
            add_feat(
                "INTERNAL_BORE",
                f"Внутреннее растачивание Ø{d_val:g} (из STEP)",
                diameter_mm=d_val,
                length_or_depth_mm=l_val,
                count=cnt,
                notes="Крупное внутреннее цилиндрическое отверстие в 3D STEP",
            )
        else:
            add_feat(
                "HOLE_DRILL",
                f"Сверление отверстия Ø{d_val:g} (из STEP)" + (f" ({cnt} отв.)" if cnt > 1 else ""),
                diameter_mm=d_val,
                length_or_depth_mm=l_val,
                count=cnt,
                notes=f"Распознано по B-Rep CYLINDRICAL_SURFACE (Ø{d_val:g}, глуб. {l_val:g} мм)",
            )

    if freeform_count >= 2:
        add_feat(
            "COPY_3D",
            "3D-фрезерование криволинейных поверхностей",
            count=1,
            notes=f"В STEP обнаружено {freeform_count} тороидальных / B-spline поверхностей",
        )

    # Estimate bar/block stock volume & chip removal volume (cm3)
    if rotational_match and max_ext_d > 0:
        axial_len = next((dim for dim in (bbox_x, bbox_y, bbox_z) if abs(dim - max_ext_d) > max(2.5, max_ext_d * 0.08)), max(bbox_x, bbox_y, bbox_z))
        stock_vol_cm3 = round((math.pi * ((max_ext_d + 4.0) / 2.0) ** 2 * (axial_len + 4.0)) / 1000.0, 1)
        part_vol_cm3 = round(stock_vol_cm3 * 0.68, 1)
    else:
        stock_vol_cm3 = round(((bbox_x + 4.0) * (bbox_y + 4.0) * (bbox_z + 4.0)) / 1000.0, 1) if (bbox_x and bbox_y and bbox_z) else 0.0
        part_vol_cm3 = round(stock_vol_cm3 * 0.62, 1)
    removal_vol_cm3 = round(max(0.0, stock_vol_cm3 - part_vol_cm3), 1)

    has_turn = any(f["kind"] in ("EXTERNAL_ROUGH", "EXTERNAL_FINISH", "INTERNAL_BORE", "GROOVE_PARTING") for f in features_raw)
    has_mill_hole = any(f["kind"] in ("FACE_MILL", "SHOULDER_POCKET", "COPY_3D", "HOLE_DRILL") for f in features_raw)
    part_type: Literal["SHAFT_TURNED", "PRISMATIC_MILLED", "MILL_TURN"] = (
        "MILL_TURN" if (has_turn and has_mill_hole) else ("PRISMATIC_MILLED" if has_mill_hole else "SHAFT_TURNED")
    )

    return {
        "format": "STEP",
        "part_name": part_name,
        "part_type": part_type,
        "entity_count": len(entities),
        "bbox_x_mm": bbox_x,
        "bbox_y_mm": bbox_y,
        "bbox_z_mm": bbox_z,
        "max_outer_diameter_mm": max_ext_d if rotational_match else None,
        "planes_count": len(planes),
        "external_cylinders_count": len(external_cyls),
        "internal_holes_count": sum(hole_groups.values()),
        "hole_groups": [
            {"diameter_mm": d, "depth_mm": l, "count": cnt}
            for (d, l), cnt in sorted(hole_groups.items())
        ],
        "freeform_surfaces_count": freeform_count,
        "conical_surfaces_count": conical_count,
        "stock_volume_cm3": stock_vol_cm3,
        "part_volume_cm3": part_vol_cm3,
        "removal_volume_cm3": removal_vol_cm3,
        "features": features_raw,
    }


# -----------------------------------------------------------------------------
# Binary & ASCII STL 3D Workpiece Analyzer
# -----------------------------------------------------------------------------

def parse_stl_workpiece(stl_bytes: bytes, filename: str = "model.stl") -> Dict[str, Any]:
    """Parses Binary or ASCII STL mesh and extracts 3D dimensions, volume, chip removal & machining ops."""
    part_name = filename.rsplit(".", 1)[0] if "." in filename else filename
    triangles: List[Tuple[Tuple[float, float, float], Tuple[float, float, float], Tuple[float, float, float], Tuple[float, float, float]]] = []

    is_binary = False
    if len(stl_bytes) >= 84:
        tri_cnt = struct.unpack_from("<I", stl_bytes, 80)[0]
        if 84 + tri_cnt * 50 == len(stl_bytes):
            is_binary = True

    if is_binary:
        tri_cnt = struct.unpack_from("<I", stl_bytes, 80)[0]
        off = 84
        for _ in range(min(tri_cnt, 250000)):
            vals = struct.unpack_from("<12f", stl_bytes, off)
            nrm = (vals[0], vals[1], vals[2])
            v0 = (vals[3], vals[4], vals[5])
            v1 = (vals[6], vals[7], vals[8])
            v2 = (vals[9], vals[10], vals[11])
            triangles.append((nrm, v0, v1, v2))
            off += 50
    else:
        txt = stl_bytes.decode("utf-8", errors="ignore")
        pat = re.compile(
            r"facet\s+normal\s+([^\s]+)\s+([^\s]+)\s+([^\s]+).*?"
            r"vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+).*?"
            r"vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+).*?"
            r"vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)",
            flags=re.IGNORECASE | re.DOTALL,
        )
        for m in pat.finditer(txt):
            g = [float(x) for x in m.groups()]
            triangles.append(((g[0], g[1], g[2]), (g[3], g[4], g[5]), (g[6], g[7], g[8]), (g[9], g[10], g[11])))

    if not triangles:
        return {
            "format": "STL",
            "part_name": part_name,
            "part_type": "PRISMATIC_MILLED",
            "triangle_count": 0,
            "bbox_x_mm": 0.0, "bbox_y_mm": 0.0, "bbox_z_mm": 0.0,
            "stock_volume_cm3": 0.0, "part_volume_cm3": 0.0, "removal_volume_cm3": 0.0,
            "internal_holes_count": 0, "hole_groups": [],
            "features": [],
        }

    min_x = min_y = min_z = float("inf")
    max_x = max_y = max_z = float("-inf")
    signed_vol_mm3 = 0.0
    ortho_area = 0.0
    curved_area = 0.0
    radial_inward_area = 0.0

    # First pass: bbox & volume
    for _, v0, v1, v2 in triangles:
        for vx, vy, vz in (v0, v1, v2):
            if vx < min_x: min_x = vx
            if vx > max_x: max_x = vx
            if vy < min_y: min_y = vy
            if vy > max_y: max_y = vy
            if vz < min_z: min_z = vz
            if vz > max_z: max_z = vz
        # Divergence theorem: v0 . (v1 x v2) / 6
        cx = v1[1] * v2[2] - v1[2] * v2[1]
        cy = v1[2] * v2[0] - v1[0] * v2[2]
        cz = v1[0] * v2[1] - v1[1] * v2[0]
        signed_vol_mm3 += (v0[0] * cx + v0[1] * cy + v0[2] * cz) / 6.0

    dx = round(max_x - min_x, 1)
    dy = round(max_y - min_y, 1)
    dz = round(max_z - min_z, 1)
    center = ((min_x + max_x) / 2.0, (min_y + max_y) / 2.0, (min_z + max_z) / 2.0)

    # Second pass: face orientation analysis (orthogonal planar vs curved / rotational)
    for _, v0, v1, v2 in triangles:
        ux, uy, uz = v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]
        wx, wy, wz = v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]
        nx, ny, nz = uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx
        mag = math.sqrt(nx * nx + ny * ny + nz * nz)
        if mag < 1e-9:
            continue
        area = 0.5 * mag
        nx, ny, nz = nx / mag, ny / mag, nz / mag
        if max(abs(nx), abs(ny), abs(nz)) >= 0.98:
            ortho_area += area
        else:
            curved_area += area
            # Check if triangle normal points inward toward global center (indicator of bores/holes)
            tx = (v0[0] + v1[0] + v2[0]) / 3.0 - center[0]
            ty = (v0[1] + v1[1] + v2[1]) / 3.0 - center[1]
            tz = (v0[2] + v1[2] + v2[2]) / 3.0 - center[2]
            if (nx * tx + ny * ty + nz * tz) < -0.1:
                radial_inward_area += area

    total_area = max(ortho_area + curved_area, 1.0)
    curved_ratio = curved_area / total_area
    part_vol_cm3 = round(abs(signed_vol_mm3) / 1000.0, 1)

    # Rotational heuristic: 2 dimensions nearly equal and significant curved area
    dims = sorted([dx, dy, dz])
    is_rotational = (
        (abs(dx - dy) <= max(2.0, dx * 0.05) and curved_ratio > 0.30)
        or (abs(dy - dz) <= max(2.0, dy * 0.05) and curved_ratio > 0.30)
        or (abs(dx - dz) <= max(2.0, dx * 0.05) and curved_ratio > 0.30)
    )

    if is_rotational:
        if abs(dx - dy) <= max(2.0, dx * 0.05):
            outer_d, axial_l = round((dx + dy) / 2.0, 1), dz
        elif abs(dy - dz) <= max(2.0, dy * 0.05):
            outer_d, axial_l = round((dy + dz) / 2.0, 1), dx
        else:
            outer_d, axial_l = round((dx + dz) / 2.0, 1), dy
        stock_vol_cm3 = round((math.pi * ((outer_d + 4.0) / 2.0) ** 2 * (axial_l + 4.0)) / 1000.0, 1)
    else:
        outer_d = None
        stock_vol_cm3 = round(((dx + 4.0) * (dy + 4.0) * (dz + 4.0)) / 1000.0, 1)

    removal_vol_cm3 = round(max(0.0, stock_vol_cm3 - part_vol_cm3), 1)

    features_raw: List[Dict[str, Any]] = []
    if is_rotational and outer_d:
        features_raw.append({
            "id": "stl-1", "kind": "EXTERNAL_ROUGH",
            "title": f"Наружное точение Ø{outer_d:g} (из STL)",
            "diameter_mm": outer_d, "length_or_depth_mm": axial_l, "count": 1, "source": "STL_3D",
            "notes": f"Тело вращения из 3D STL ({len(triangles)} треуг., съём ~{removal_vol_cm3} см³)",
        })
        if radial_inward_area > total_area * 0.06:
            est_bore = round(max(8.0, outer_d * 0.35), 1)
            features_raw.append({
                "id": "stl-2", "kind": "INTERNAL_BORE" if est_bore >= 25.0 else "HOLE_DRILL",
                "title": f"Внутренняя полость / отверстие (из STL, ориентир. Ø{est_bore:g})",
                "diameter_mm": est_bore, "length_or_depth_mm": round(axial_l * 0.8, 1), "count": 1, "source": "STL_3D",
                "notes": "Обнаружены внутренние цилиндрические грани в STL — уточните Ø при необходимости",
            })
    else:
        features_raw.append({
            "id": "stl-1", "kind": "FACE_MILL",
            "title": f"Торцевое фрезерование плоскостей ({dx:g}×{dy:g}×{dz:g} мм)",
            "length_or_depth_mm": max(dx, dy, dz), "count": 1, "source": "STL_3D",
            "notes": f"Призматическая заготовка STL (съём ~{removal_vol_cm3} см³)",
        })
        features_raw.append({
            "id": "stl-2", "kind": "SHOULDER_POCKET",
            "title": "Контурное / уступное фрезерование 90°",
            "length_or_depth_mm": max(dx, dy), "count": 1, "source": "STL_3D",
            "notes": "Обработка стенок и карманов по 3D-модели STL",
        })
        if curved_ratio > 0.35:
            features_raw.append({
                "id": "stl-3", "kind": "COPY_3D",
                "title": "3D-копировальная обработка криволинейных зон",
                "count": 1, "source": "STL_3D",
                "notes": f"Доля криволинейных поверхностей в STL: {round(curved_ratio * 100)}%",
            })

    return {
        "format": "STL",
        "part_name": part_name,
        "part_type": "SHAFT_TURNED" if is_rotational else "PRISMATIC_MILLED",
        "triangle_count": len(triangles),
        "bbox_x_mm": dx,
        "bbox_y_mm": dy,
        "bbox_z_mm": dz,
        "max_outer_diameter_mm": outer_d,
        "planes_count": 0,
        "external_cylinders_count": 1 if is_rotational else 0,
        "internal_holes_count": 1 if (is_rotational and radial_inward_area > total_area * 0.06) else 0,
        "hole_groups": [],
        "freeform_surfaces_count": 1 if curved_ratio > 0.35 else 0,
        "stock_volume_cm3": stock_vol_cm3,
        "part_volume_cm3": part_vol_cm3,
        "removal_volume_cm3": removal_vol_cm3,
        "features": features_raw,
    }


# -----------------------------------------------------------------------------
# Valid ISO 10303-21 STEP Demo File Generators (for 1-click test & download)
# -----------------------------------------------------------------------------

def generate_demo_step_file(demo_id: str) -> Tuple[str, str]:
    """Generates a clean, valid ISO 10303-21 STEP file for demo workpieces."""
    if demo_id == "step-flange-m1":
        fname = "Flanec_D120_12X18H10T.step"
        lines = [
            "ISO-10303-21;",
            "HEADER;",
            "FILE_DESCRIPTION(('SKM Demo 3D Flange D120'),'2;1');",
            f"FILE_NAME('{fname}','2026-11-26T12:00:00',('SKM'),('SKM CAD'),'','SKM v2.3','');",
            "FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));",
            "ENDSEC;",
            "DATA;",
            "#1 = PRODUCT('Flanec_D120_12X18H10T','Фланец напорный Ø120 (12Х18Н10Т)','',(#2));",
            "#10 = DIRECTION('Z',(0.0,0.0,1.0));",
            "#11 = DIRECTION('X',(1.0,0.0,0.0));",
            # Outer flange OD Ø120, height 30 mm
            "#20 = CARTESIAN_POINT('O0',(0.0,0.0,0.0));",
            "#21 = CARTESIAN_POINT('O1',(0.0,0.0,30.0));",
            "#22 = AXIS2_PLACEMENT_3D('A_OD',#20,#10,#11);",
            "#23 = AXIS2_PLACEMENT_3D('A_OD_TOP',#21,#10,#11);",
            "#24 = CYLINDRICAL_SURFACE('OD_120',#22,60.0);",
            "#25 = CIRCLE('C_OD_BOT',#22,60.0);",
            "#26 = CIRCLE('C_OD_TOP',#23,60.0);",
            "#27 = ADVANCED_FACE('F_OD',(#28),#24,.T.);",
            "#29 = PLANE('P_BOT',#22);",
            "#30 = PLANE('P_TOP',#23);",
            # Central bore Ø28, depth 30 mm (same_sense=.F. -> INTERNAL)
            "#31 = CYLINDRICAL_SURFACE('BORE_28',#22,14.0);",
            "#32 = CIRCLE('C_B_BOT',#22,14.0);",
            "#33 = CIRCLE('C_B_TOP',#23,14.0);",
            "#34 = ADVANCED_FACE('F_BORE',(#35),#31,.F.);",
        ]
        # 6 bolt holes Ø12 on pitch circle R=44 mm, depth 30 mm
        eid = 100
        for k in range(6):
            ang = math.radians(k * 60.0)
            hx = round(44.0 * math.cos(ang), 3)
            hy = round(44.0 * math.sin(ang), 3)
            lines.extend([
                f"#{eid} = CARTESIAN_POINT('H{k}_B',({hx},{hy},0.0));",
                f"#{eid+1} = CARTESIAN_POINT('H{k}_T',({hx},{hy},30.0));",
                f"#{eid+2} = AXIS2_PLACEMENT_3D('AH{k}_B',#{eid},#10,#11);",
                f"#{eid+3} = AXIS2_PLACEMENT_3D('AH{k}_T',#{eid+1},#10,#11);",
                f"#{eid+4} = CYLINDRICAL_SURFACE('HOLE_12_{k}',#{eid+2},6.0);",
                f"#{eid+5} = CIRCLE('CH{k}_B',#{eid+2},6.0);",
                f"#{eid+6} = CIRCLE('CH{k}_T',#{eid+3},6.0);",
                f"#{eid+7} = ADVANCED_FACE('FH_{k}',(#{eid+8}),#{eid+4},.F.);",
            ])
            eid += 10
        lines.extend(["ENDSEC;", "END-ISO-10303-21;"])
        return fname, "\n".join(lines) + "\n"

    if demo_id == "step-housing-n1":
        fname = "Korpus_140x100x45_D16T.step"
        lines = [
            "ISO-10303-21;",
            "HEADER;",
            "FILE_DESCRIPTION(('SKM Demo 3D Milled Housing 140x100x45'),'2;1');",
            f"FILE_NAME('{fname}','2026-11-26T12:00:00',('SKM'),('SKM CAD'),'','SKM v2.3','');",
            "FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));",
            "ENDSEC;",
            "DATA;",
            "#1 = PRODUCT('Korpus_140x100x45_D16T','Корпус фрезерный 140×100×45 (Д16Т)','',(#2));",
            "#10 = DIRECTION('Z',(0.0,0.0,1.0));",
            "#11 = DIRECTION('X',(1.0,0.0,0.0));",
            "#12 = DIRECTION('Y',(0.0,1.0,0.0));",
            # Box corners 0..140, 0..100, 0..45
            "#20 = CARTESIAN_POINT('V0',(0.0,0.0,0.0));",
            "#21 = CARTESIAN_POINT('V1',(140.0,100.0,45.0));",
            "#22 = VERTEX_POINT('VP0',#20);",
            "#23 = VERTEX_POINT('VP1',#21);",
            "#24 = AXIS2_PLACEMENT_3D('AZ',#20,#10,#11);",
            "#25 = AXIS2_PLACEMENT_3D('AX',#20,#11,#12);",
            "#26 = AXIS2_PLACEMENT_3D('AY',#20,#12,#10);",
            "#30 = PLANE('P1',#24); #31 = PLANE('P2',#24); #32 = PLANE('P3',#25);",
            "#33 = PLANE('P4',#25); #34 = PLANE('P5',#26); #35 = PLANE('P6',#26);",
            # Central bearing pocket Ø32 depth 25 mm
            "#40 = CARTESIAN_POINT('CB0',(70.0,50.0,20.0));",
            "#41 = CARTESIAN_POINT('CB1',(70.0,50.0,45.0));",
            "#42 = AXIS2_PLACEMENT_3D('ACB0',#40,#10,#11);",
            "#43 = AXIS2_PLACEMENT_3D('ACB1',#41,#10,#11);",
            "#44 = CYLINDRICAL_SURFACE('BORE_32',#42,16.0);",
            "#45 = CIRCLE('CCB0',#42,16.0);",
            "#46 = CIRCLE('CCB1',#43,16.0);",
            "#47 = ADVANCED_FACE('FCB',(#48),#44,.F.);",
        ]
        # 4 mounting holes Ø10 depth 45 mm
        eid = 100
        for idx, (hx, hy) in enumerate([(15.0, 15.0), (125.0, 15.0), (125.0, 85.0), (15.0, 85.0)]):
            lines.extend([
                f"#{eid} = CARTESIAN_POINT('H{idx}_B',({hx},{hy},0.0));",
                f"#{eid+1} = CARTESIAN_POINT('H{idx}_T',({hx},{hy},45.0));",
                f"#{eid+2} = AXIS2_PLACEMENT_3D('AH{idx}_B',#{eid},#10,#11);",
                f"#{eid+3} = AXIS2_PLACEMENT_3D('AH{idx}_T',#{eid+1},#10,#11);",
                f"#{eid+4} = CYLINDRICAL_SURFACE('HOLE_10_{idx}',#{eid+2},5.0);",
                f"#{eid+5} = CIRCLE('CH{idx}_B',#{eid+2},5.0);",
                f"#{eid+6} = CIRCLE('CH{idx}_T',#{eid+3},5.0);",
                f"#{eid+7} = ADVANCED_FACE('FH_{idx}',(#{eid+8}),#{eid+4},.F.);",
            ])
            eid += 10
        lines.extend(["ENDSEC;", "END-ISO-10303-21;"])
        return fname, "\n".join(lines) + "\n"

    # Default: step-shaft-p1 (Stepped drive shaft Ø65 x 160, groove 4mm, axial bore Ø14x45)
    fname = "Val_D65x160_40X.step"
    lines = [
        "ISO-10303-21;",
        "HEADER;",
        "FILE_DESCRIPTION(('SKM Demo 3D Stepped Shaft D65x160'),'2;1');",
        f"FILE_NAME('{fname}','2026-11-26T12:00:00',('SKM'),('SKM CAD'),'','SKM v2.3','');",
        "FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));",
        "ENDSEC;",
        "DATA;",
        "#1 = PRODUCT('Val_D65x160_40X','Вал приводной Ø65×160 (40Х)','',(#2));",
        "#10 = DIRECTION('Z',(0.0,0.0,1.0));",
        "#11 = DIRECTION('X',(1.0,0.0,0.0));",
        # Step 1: Ø45 from Z=0..50
        "#20 = CARTESIAN_POINT('P0',(0.0,0.0,0.0));",
        "#21 = CARTESIAN_POINT('P1',(0.0,0.0,50.0));",
        "#22 = AXIS2_PLACEMENT_3D('A0',#20,#10,#11);",
        "#23 = AXIS2_PLACEMENT_3D('A1',#21,#10,#11);",
        "#24 = CYLINDRICAL_SURFACE('STEP_45',#22,22.5);",
        "#25 = CIRCLE('C45_0',#22,22.5); #26 = CIRCLE('C45_1',#23,22.5);",
        "#27 = ADVANCED_FACE('F_S45',(#28),#24,.T.);",
        # Step 2 (Main OD): Ø65 from Z=50..115
        "#30 = CARTESIAN_POINT('P2',(0.0,0.0,115.0));",
        "#31 = AXIS2_PLACEMENT_3D('A2',#30,#10,#11);",
        "#32 = CYLINDRICAL_SURFACE('OD_65',#23,32.5);",
        "#33 = CIRCLE('C65_0',#23,32.5); #34 = CIRCLE('C65_1',#31,32.5);",
        "#35 = ADVANCED_FACE('F_OD65',(#36),#32,.T.);",
        # Groove: Ø38 width 4 mm from Z=115..119
        "#40 = CARTESIAN_POINT('P3',(0.0,0.0,119.0));",
        "#41 = AXIS2_PLACEMENT_3D('A3',#40,#10,#11);",
        "#42 = CYLINDRICAL_SURFACE('GRV_38',#31,19.0);",
        "#43 = CIRCLE('CG_0',#31,19.0); #44 = CIRCLE('CG_1',#41,19.0);",
        "#45 = ADVANCED_FACE('F_GRV',(#46),#42,.T.);",
        # Step 3: Ø42 from Z=119..160
        "#50 = CARTESIAN_POINT('P4',(0.0,0.0,160.0));",
        "#51 = AXIS2_PLACEMENT_3D('A4',#50,#10,#11);",
        "#52 = CYLINDRICAL_SURFACE('STEP_42',#41,21.0);",
        "#53 = CIRCLE('C42_0',#41,21.0); #54 = CIRCLE('C42_1',#51,21.0);",
        "#55 = ADVANCED_FACE('F_S42',(#56),#52,.T.);",
        # Axial drilled hole: Ø14 depth 45 mm from Z=0..45 (INTERNAL same_sense=.F.)
        "#60 = CARTESIAN_POINT('PH',(0.0,0.0,45.0));",
        "#61 = AXIS2_PLACEMENT_3D('AH',#60,#10,#11);",
        "#62 = CYLINDRICAL_SURFACE('HOLE_14',#22,7.0);",
        "#63 = CIRCLE('CH_0',#22,7.0); #64 = CIRCLE('CH_1',#61,7.0);",
        "#65 = ADVANCED_FACE('F_HOLE',(#66),#62,.F.);",
        "ENDSEC;",
        "END-ISO-10303-21;",
    ]
    return fname, "\n".join(lines) + "\n"
