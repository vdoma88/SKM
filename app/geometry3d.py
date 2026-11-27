"""
Parametric 3D Geometry Generator & STL Exporter for ISO 1832 Indexable Inserts.

Generates accurate 3D meshes (outer perimeter with corner fillets RE, clearance angle
draft taper alpha, thickness S, central mounting bore D1 with optional countersink)
for all standard ISO 1832 insert shapes (C, D, V, S, T, W, R, A, P, H, O, L).
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel

from app.iso1832 import parse_iso1832, ISO1832Parsed


class InsertMesh3D(BaseModel):
    iso_code: str
    normalized_code: str
    shape_code: str
    ic_mm: float
    thickness_mm: float
    corner_radius_mm: float
    clearance_angle_deg: float
    has_hole: bool
    has_countersink: bool
    hole_diameter_mm: float
    bbox_mm: Dict[str, float]
    vertex_count: int
    triangle_count: int
    # Flat arrays ready for WebGL / Three.js BufferGeometry
    positions: List[float]
    normals: List[float]


def _normalize_2d(vx: float, vy: float) -> Tuple[float, float]:
    length = math.hypot(vx, vy)
    if length < 1e-9:
        return 1.0, 0.0
    return vx / length, vy / length


def _raw_polygon_vertices(parsed: ISO1832Parsed) -> List[Tuple[float, float]]:
    """Returns counter-clockwise 2D sharp-corner polygon vertices in mm centered at (0, 0)."""
    shape = parsed.shape_code or "C"
    ic = parsed.ic_mm or 12.7
    r = ic / 2.0
    length = parsed.cutting_edge_length_mm or ic

    if shape in ("C", "D", "V"):
        acute_deg = {"C": 80.0, "D": 55.0, "V": 35.0}[shape]
        half_rad = math.radians(acute_deg / 2.0)
        a = r / math.sin(half_rad)
        b = r / math.cos(half_rad)
        return [(a, 0.0), (0.0, b), (-a, 0.0), (0.0, -b)]

    if shape == "S":
        return [(r, r), (-r, r), (-r, -r), (r, -r)]

    if shape == "T":
        rv = 2.0 * r
        return [
            (rv * math.cos(math.radians(90 + 120 * k)), rv * math.sin(math.radians(90 + 120 * k)))
            for k in range(3)
        ]

    if shape == "W":
        # ISO Trigon 80°: alternating 80° cutting corners and 160° obtuse corners
        r_cut = r / math.sin(math.radians(40.0))
        r_obt = r / math.sin(math.radians(80.0))
        pts: List[Tuple[float, float]] = []
        for k in range(3):
            a_cut = math.radians(90.0 + 120.0 * k)
            a_obt = math.radians(150.0 + 120.0 * k)
            pts.append((r_cut * math.cos(a_cut), r_cut * math.sin(a_cut)))
            pts.append((r_obt * math.cos(a_obt), r_obt * math.sin(a_obt)))
        return pts

    if shape in ("A", "E"):
        # 85° parallelogram (e.g. APKT 160408): width ~ IC, height ~ L
        w_half = r
        h_half = max(length, ic * 1.1) / 2.0
        skew = h_half / math.tan(math.radians(85.0))
        return [
            (w_half + skew, h_half),
            (-w_half + skew, h_half),
            (-w_half - skew, -h_half),
            (w_half - skew, -h_half),
        ]

    if shape == "L":
        w_half = r
        h_half = max(length, ic * 1.1) / 2.0
        return [(w_half, h_half), (-w_half, h_half), (-w_half, -h_half), (w_half, -h_half)]

    if shape in ("P", "H", "O", "X"):
        n_sides = {"P": 5, "H": 6, "O": 8, "X": 7}[shape]
        rv = r / math.cos(math.pi / n_sides)
        return [
            (rv * math.cos(2.0 * math.pi * k / n_sides), rv * math.sin(2.0 * math.pi * k / n_sides))
            for k in range(n_sides)
        ]

    # Round insert ('R')
    n_seg = 64
    return [
        (r * math.cos(2.0 * math.pi * k / n_seg), r * math.sin(2.0 * math.pi * k / n_seg))
        for k in range(n_seg)
    ]


def _fillet_polygon(
    verts: List[Tuple[float, float]],
    radius: float,
    arc_steps: int = 8,
) -> List[Tuple[float, float]]:
    """Applies circular fillets of given radius at each corner of a CCW 2D polygon."""
    n = len(verts)
    if radius <= 1e-4 or n > 12:
        return verts

    out: List[Tuple[float, float]] = []
    for i in range(n):
        p_prev = verts[(i - 1) % n]
        p_curr = verts[i]
        p_next = verts[(i + 1) % n]

        v1x, v1y = p_prev[0] - p_curr[0], p_prev[1] - p_curr[1]
        v2x, v2y = p_next[0] - p_curr[0], p_next[1] - p_curr[1]
        len1 = math.hypot(v1x, v1y)
        len2 = math.hypot(v2x, v2y)
        u1x, u1y = v1x / len1, v1y / len1
        u2x, u2y = v2x / len2, v2y / len2

        dot = max(-0.9999, min(0.9999, u1x * u2x + u1y * u2y))
        angle = math.acos(dot)
        half_angle = angle / 2.0

        # Clamp fillet tangent distance to 42% of shortest adjacent edge
        max_dist = min(len1, len2) * 0.42
        tan_half = math.tan(half_angle)
        if tan_half < 1e-4:
            out.append(p_curr)
            continue

        dist = radius / tan_half
        eff_r = radius
        if dist > max_dist:
            dist = max_dist
            eff_r = dist * tan_half

        t1x, t1y = p_curr[0] + u1x * dist, p_curr[1] + u1y * dist
        t2x, t2y = p_curr[0] + u2x * dist, p_curr[1] + u2y * dist

        bx, by = _normalize_2d(u1x + u2x, u1y + u2y)
        center_dist = eff_r / max(math.sin(half_angle), 1e-4)
        cx, cy = p_curr[0] + bx * center_dist, p_curr[1] + by * center_dist

        a1 = math.atan2(t1y - cy, t1x - cx)
        a2 = math.atan2(t2y - cy, t2x - cx)
        # Ensure CCW sweep (positive delta)
        delta = a2 - a1
        while delta <= -math.pi:
            delta += 2.0 * math.pi
        while delta > math.pi:
            delta -= 2.0 * math.pi

        for s in range(arc_steps + 1):
            ang = a1 + delta * (s / arc_steps)
            out.append((cx + eff_r * math.cos(ang), cy + eff_r * math.sin(ang)))

    return out


def _inset_loop(pts: List[Tuple[float, float]], inset_mm: float) -> List[Tuple[float, float]]:
    """Offsets a CCW closed 2D loop inward by inset_mm using mitered vertex normals."""
    if inset_mm <= 1e-5:
        return list(pts)
    n = len(pts)
    result: List[Tuple[float, float]] = []
    for i in range(n):
        p_prev = pts[(i - 1) % n]
        p_curr = pts[i]
        p_next = pts[(i + 1) % n]

        e1x, e1y = _normalize_2d(p_curr[0] - p_prev[0], p_curr[1] - p_prev[1])
        e2x, e2y = _normalize_2d(p_next[0] - p_curr[0], p_next[1] - p_curr[1])
        # Inward normals for CCW polygon: (-ey, ex)
        n1x, n1y = -e1y, e1x
        n2x, n2y = -e2y, e2x

        mx, my = n1x + n2x, n1y + n2y
        m_len = math.hypot(mx, my)
        if m_len < 1e-5:
            nx, ny = n1x, n1y
            scale = inset_mm
        else:
            nx, ny = mx / m_len, my / m_len
            cos_half = max(nx * n1x + ny * n1y, 0.35)
            scale = min(inset_mm / cos_half, inset_mm * 2.2)

        result.append((p_curr[0] + nx * scale, p_curr[1] + ny * scale))
    return result


def _tri_normal(
    a: Tuple[float, float, float],
    b: Tuple[float, float, float],
    c: Tuple[float, float, float],
) -> Tuple[float, float, float]:
    ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
    nx = uy * vz - uz * vy
    ny = uz * vx - ux * vz
    nz = ux * vy - uy * vx
    mag = math.sqrt(nx * nx + ny * ny + nz * nz)
    if mag < 1e-12:
        return (0.0, 0.0, 1.0)
    return (nx / mag, ny / mag, nz / mag)


def _append_tri(
    positions: List[float],
    normals: List[float],
    a: Tuple[float, float, float],
    b: Tuple[float, float, float],
    c: Tuple[float, float, float],
) -> None:
    nx, ny, nz = _tri_normal(a, b, c)
    positions.extend([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]])
    normals.extend([nx, ny, nz, nx, ny, nz, nx, ny, nz])


def _build_axial_drill_mesh(parsed: ISO1832Parsed) -> InsertMesh3D:
    """Builds a watertight 3D 2-flute helical axial drill / modular crown mesh with 140° conical point."""
    dc = parsed.ic_mm or 12.0
    r_outer = dc / 2.0
    is_solid = parsed.normalized_code.startswith("SCDRL")
    body_h = min(dc * 2.6, 36.0) if is_solid else max(dc * 0.65, 6.0)
    point_deg = 130.0 if (parsed.suffix == "AL") else 140.0
    tip_h = r_outer / math.tan(math.radians(point_deg / 2.0))

    is_tap = parsed.shape_code == "TAP"
    is_rm = parsed.shape_code == "RM"
    n_flutes = 6 if is_rm else (3 if is_tap else 2)
    n_seg = 48
    n_stacks = 18 if is_tap else (12 if (is_solid or is_rm) else 5)
    if is_tap or is_rm:
        body_h = min(dc * 2.2, 34.0)
        tip_h = r_outer * (0.28 if is_tap else 0.14)
    twist_total = math.radians(90.0 if is_tap else (30.0 if is_rm else (150.0 if is_solid else 35.0)))
    z_base = -body_h / 2.0
    z_shld = body_h / 2.0
    z_apex = z_shld + tip_h

    def ring_pts(z_val: float, frac: float, radius_scale: float = 1.0) -> List[Tuple[float, float, float]]:
        twist = twist_total * frac
        thread_rib = (1.0 - 0.10 * (1.0 - math.cos(frac * 12.0 * math.pi))) if is_tap else 1.0
        pts: List[Tuple[float, float, float]] = []
        for k in range(n_seg):
            ang = 2.0 * math.pi * k / n_seg
            flute_phase = math.cos(n_flutes * (ang - twist))
            depth_f = 0.84 if is_rm else 0.72
            flute_factor = depth_f + (1.0 - depth_f) * flute_phase if flute_phase < 0.25 else 1.0
            rad = r_outer * radius_scale * flute_factor * thread_rib
            pts.append((rad * math.cos(ang), rad * math.sin(ang), z_val))
        return pts

    positions: List[float] = []
    normals: List[float] = []

    rings = [ring_pts(z_base + body_h * (st / n_stacks), st / n_stacks, 1.0) for st in range(n_stacks + 1)]
    for st in range(n_stacks):
        r0 = rings[st]
        r1 = rings[st + 1]
        for i in range(n_seg):
            j = (i + 1) % n_seg
            _append_tri(positions, normals, r0[i], r0[j], r1[j])
            _append_tri(positions, normals, r0[i], r1[j], r1[i])

    # Conical drill point (top ring -> apex)
    top_ring = rings[-1]
    apex = (0.0, 0.0, z_apex)
    for i in range(n_seg):
        j = (i + 1) % n_seg
        _append_tri(positions, normals, top_ring[i], top_ring[j], apex)

    # Flat base cap (-Z normal)
    bot_ring = rings[0]
    c_bot = (0.0, 0.0, z_base)
    for i in range(n_seg):
        j = (i + 1) % n_seg
        _append_tri(positions, normals, c_bot, bot_ring[j], bot_ring[i])

    xs = positions[0::3]
    ys = positions[1::3]
    zs = positions[2::3]
    bbox = {
        "x": round(max(xs) - min(xs), 3),
        "y": round(max(ys) - min(ys), 3),
        "z": round(max(zs) - min(zs), 3),
    }
    v_cnt = len(positions) // 3
    return InsertMesh3D(
        iso_code=parsed.raw_code,
        normalized_code=parsed.normalized_code,
        shape_code=parsed.shape_code or "DRL",
        ic_mm=dc,
        thickness_mm=round(body_h + tip_h, 2),
        corner_radius_mm=parsed.corner_radius_mm or 0.2,
        clearance_angle_deg=parsed.clearance_angle_deg or 11.0,
        has_hole=False,
        has_countersink=False,
        hole_diameter_mm=0.0,
        bbox_mm=bbox,
        vertex_count=v_cnt,
        triangle_count=v_cnt // 3,
        positions=[round(v, 4) for v in positions],
        normals=[round(v, 4) for v in normals],
    )


def build_iso1832_mesh(code: str) -> InsertMesh3D:
    """Builds a watertight, manifold 3D triangle mesh for an ISO 1832 insert code."""
    parsed = parse_iso1832(code)
    if not parsed.valid:
        raise ValueError(parsed.error or f"Некорректный код ISO 1832: {code}")

    if parsed.shape_code in ("DRL", "TAP", "RM"):
        return _build_axial_drill_mesh(parsed)

    ic = parsed.ic_mm or 12.7
    s = parsed.thickness_mm or 4.76
    re_mm = parsed.corner_radius_mm or 0.4
    alpha_deg = parsed.clearance_angle_deg or 0.0
    fixing = parsed.fixing_type_code or "G"

    has_hole = fixing != "N"
    has_countersink = fixing in ("T", "W")
    hole_d = round(ic * 0.40, 2) if has_hole else 0.0
    hole_r = hole_d / 2.0
    cs_r = min(hole_r * 1.34, ic * 0.34) if has_countersink else hole_r

    raw_poly = _raw_polygon_vertices(parsed)
    inset_mm = min(s * math.tan(math.radians(alpha_deg)), ic * 0.22)
    if parsed.shape_code == "R":
        top_outer = raw_poly
        scale_bot = max(0.35, (ic / 2.0 - inset_mm) / (ic / 2.0))
        bot_outer = [(p[0] * scale_bot, p[1] * scale_bot) for p in raw_poly]
    else:
        top_outer = _fillet_polygon(raw_poly, re_mm, arc_steps=8)
        raw_bot = _inset_loop(raw_poly, inset_mm)
        bot_re = max(0.08, re_mm - inset_mm * 0.5)
        bot_outer = _fillet_polygon(raw_bot, bot_re, arc_steps=8)

    n = len(top_outer)
    z_top = s / 2.0
    z_mid = s * 0.05
    z_bot = -s / 2.0

    positions: List[float] = []
    normals: List[float] = []

    # 1. Outer side wall (CCW outward)
    for i in range(n):
        j = (i + 1) % n
        t0 = (top_outer[i][0], top_outer[i][1], z_top)
        t1 = (top_outer[j][0], top_outer[j][1], z_top)
        b0 = (bot_outer[i][0], bot_outer[i][1], z_bot)
        b1 = (bot_outer[j][0], bot_outer[j][1], z_bot)
        _append_tri(positions, normals, b0, b1, t1)
        _append_tri(positions, normals, b0, t1, t0)

    if has_hole:
        # Parameterize inner hole vertices by the exact polar angle of each outer vertex
        # so every radial quad on top & bottom faces is guaranteed non-crossing.
        angles = [math.atan2(p[1], p[0]) for p in top_outer]
        top_inner = [(cs_r * math.cos(a), cs_r * math.sin(a)) for a in angles]
        mid_inner = [(hole_r * math.cos(a), hole_r * math.sin(a)) for a in angles]
        bot_inner = [(hole_r * math.cos(a), hole_r * math.sin(a)) for a in angles]

        for i in range(n):
            j = (i + 1) % n
            # Top annular face (+Z normal)
            to0 = (top_outer[i][0], top_outer[i][1], z_top)
            to1 = (top_outer[j][0], top_outer[j][1], z_top)
            ti0 = (top_inner[i][0], top_inner[i][1], z_top)
            ti1 = (top_inner[j][0], top_inner[j][1], z_top)
            _append_tri(positions, normals, ti0, to0, to1)
            _append_tri(positions, normals, ti0, to1, ti1)

            # Bottom annular face (-Z normal)
            bo0 = (bot_outer[i][0], bot_outer[i][1], z_bot)
            bo1 = (bot_outer[j][0], bot_outer[j][1], z_bot)
            bi0 = (bot_inner[i][0], bot_inner[i][1], z_bot)
            bi1 = (bot_inner[j][0], bot_inner[j][1], z_bot)
            _append_tri(positions, normals, bo0, bi0, bi1)
            _append_tri(positions, normals, bo0, bi1, bo1)

            # Inner bore wall (inward-facing normal toward center)
            if has_countersink:
                mi0 = (mid_inner[i][0], mid_inner[i][1], z_mid)
                mi1 = (mid_inner[j][0], mid_inner[j][1], z_mid)
                _append_tri(positions, normals, ti0, ti1, mi1)
                _append_tri(positions, normals, ti0, mi1, mi0)
                _append_tri(positions, normals, mi0, mi1, bi1)
                _append_tri(positions, normals, mi0, bi1, bi0)
            else:
                _append_tri(positions, normals, ti0, ti1, bi1)
                _append_tri(positions, normals, ti0, bi1, bi0)
    else:
        c_top = (0.0, 0.0, z_top)
        c_bot = (0.0, 0.0, z_bot)
        for i in range(n):
            j = (i + 1) % n
            to0 = (top_outer[i][0], top_outer[i][1], z_top)
            to1 = (top_outer[j][0], top_outer[j][1], z_top)
            bo0 = (bot_outer[i][0], bot_outer[i][1], z_bot)
            bo1 = (bot_outer[j][0], bot_outer[j][1], z_bot)
            _append_tri(positions, normals, c_top, to0, to1)
            _append_tri(positions, normals, c_bot, bo1, bo0)

    xs = positions[0::3]
    ys = positions[1::3]
    zs = positions[2::3]
    bbox = {
        "x": round(max(xs) - min(xs), 3),
        "y": round(max(ys) - min(ys), 3),
        "z": round(max(zs) - min(zs), 3),
    }

    vertex_count = len(positions) // 3
    triangle_count = vertex_count // 3

    return InsertMesh3D(
        iso_code=parsed.raw_code,
        normalized_code=parsed.normalized_code,
        shape_code=parsed.shape_code or "C",
        ic_mm=ic,
        thickness_mm=s,
        corner_radius_mm=re_mm,
        clearance_angle_deg=alpha_deg,
        has_hole=has_hole,
        has_countersink=has_countersink,
        hole_diameter_mm=hole_d,
        bbox_mm=bbox,
        vertex_count=vertex_count,
        triangle_count=triangle_count,
        positions=[round(v, 4) for v in positions],
        normals=[round(v, 4) for v in normals],
    )


def export_iso1832_stl(code: str) -> str:
    """Exports an ASCII STL string for the given ISO 1832 insert code."""
    mesh = build_iso1832_mesh(code)
    lines = [f"solid {mesh.normalized_code}"]
    pos = mesh.positions
    nrm = mesh.normals
    for t in range(mesh.triangle_count):
        base = t * 9
        nx, ny, nz = nrm[base], nrm[base + 1], nrm[base + 2]
        lines.append(f"  facet normal {nx:.5f} {ny:.5f} {nz:.5f}")
        lines.append("    outer loop")
        lines.append(f"      vertex {pos[base]:.4f} {pos[base + 1]:.4f} {pos[base + 2]:.4f}")
        lines.append(f"      vertex {pos[base + 3]:.4f} {pos[base + 4]:.4f} {pos[base + 5]:.4f}")
        lines.append(f"      vertex {pos[base + 6]:.4f} {pos[base + 7]:.4f} {pos[base + 8]:.4f}")
        lines.append("    endloop")
        lines.append("  endfacet")
    lines.append(f"endsolid {mesh.normalized_code}")
    return "\n".join(lines) + "\n"
