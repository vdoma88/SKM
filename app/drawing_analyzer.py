"""
Blueprint / Workpiece Drawing Analyzer & Automatic Tooling Kit Recommender (SKM v2.2).

Supports:
1. ASCII DXF CAD files (AutoCAD / KOMPAS-3D / SolidWorks): extracts CIRCLE holes,
   overall envelope, and TEXT/MTEXT/DIMENSION annotations.
2. Vector PDF drawings: extracts embedded Russian/English ESKD title block & technical notes
   (uses pypdf if installed, with pure-Python zlib stream fallback).
3. Raster blueprint scans (PNG/JPG/WEBP): optional Gemini Vision AI integration
   (via GEMINI_API_KEY env var or per-request key using standard urllib, zero extra deps).
4. Direct ESKD text / technical requirements (ТТ) parsing & interactive feature editing.
5. Full Process Plan -> Tooling BOM & Batch Quantity Recommender linked to ToolingRepository,
   warehouse stock, threading standards, and ISO 286 H7/IT6 finishing rules.
"""

from __future__ import annotations

import base64
import json
import math
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import zlib
from typing import Any, Dict, List, Literal, Optional, Tuple
from pydantic import BaseModel, Field

from app.cad_workpiece import generate_demo_step_file, parse_step_workpiece, parse_stl_workpiece
from app.sales import HOLDER_UPSELL_PRICE_RUB, _determine_pack_qty
from app.threading import THREAD_BY_CODE, calculate_hole_finishing, calculate_threading, HoleFinishInput, ThreadCalcInput


# -----------------------------------------------------------------------------
# Pydantic Models
# -----------------------------------------------------------------------------

FeatureKind = Literal[
    "EXTERNAL_ROUGH",
    "EXTERNAL_FINISH",
    "INTERNAL_BORE",
    "GROOVE_PARTING",
    "THREAD_EXTERNAL",
    "THREAD_INTERNAL",
    "HOLE_DRILL",
    "HOLE_PRECISION",
    "FACE_MILL",
    "SHOULDER_POCKET",
    "COPY_3D",
]


class DrawingFeature(BaseModel):
    id: str
    kind: FeatureKind
    title: str
    diameter_mm: Optional[float] = None
    length_or_depth_mm: Optional[float] = None
    width_mm: Optional[float] = None
    count: int = Field(1, ge=1)
    thread_code: Optional[str] = None
    tolerance: Optional[str] = None
    ra_um: Optional[float] = None
    hole_type: Literal["BLIND", "THROUGH"] = "BLIND"
    notes: str = ""
    source: str = "AUTO"  # AUTO, DXF, PDF, VISION_AI, USER


class DrawingSpec(BaseModel):
    part_name: str = "Деталь по чертежу"
    part_type: Literal["SHAFT_TURNED", "PRISMATIC_MILLED", "MILL_TURN"] = "MILL_TURN"
    material_raw: str = "Сталь 45"
    material_subgroup: str = "P1"
    iso_group: Literal["P", "M", "K", "N", "S", "H"] = "P"
    hardness_hrc: Optional[float] = None
    envelope_diameter_mm: Optional[float] = None
    envelope_length_mm: Optional[float] = None
    ra_min_um: Optional[float] = None
    batch_qty: int = Field(50, ge=1, le=100000)
    stability: Literal["STABLE", "INTERRUPTED", "UNSTABLE"] = "STABLE"
    include_holders: bool = True
    features: List[DrawingFeature] = []


class ToolingKitLine(BaseModel):
    step_no: int
    feature_id: str
    operation_title: str
    feature_summary: str
    insert_id: str
    iso_code: str
    shape_code: str
    operation_domain: str
    grade_code: str
    coating_method: str
    cutting_edges_count: int
    unit_price_rub: float
    pack_qty: int
    recommended_qty: int
    line_total_rub: float
    stock_qty: int
    in_stock: bool
    bin_location: str = ""
    holder_code: Optional[str] = None
    holder_category: Optional[str] = None
    holder_price_rub: Optional[float] = None
    pre_drill_note: Optional[str] = None
    shared_with_step: Optional[int] = None
    rationale: str


class DrawingToolingPlan(BaseModel):
    spec: DrawingSpec
    kit_lines: List[ToolingKitLine]
    total_operations: int
    total_inserts_rub: float
    total_holders_rub: float
    grand_total_rub: float
    in_stock_count: int
    backorder_count: int
    warnings: List[str] = []


class DrawingAnalyzeRequest(BaseModel):
    filename: str = "drawing.txt"
    content_base64: Optional[str] = None
    notes_text: str = ""
    batch_qty: int = Field(50, ge=1, le=100000)
    stability: Literal["STABLE", "INTERRUPTED", "UNSTABLE"] = "STABLE"
    include_holders: bool = True
    gemini_api_key: Optional[str] = None


class DrawingAnalyzeResponse(BaseModel):
    detected_format: str
    analysis_method: str
    extracted_text: str
    dxf_summary: Optional[Dict[str, Any]] = None
    cad3d_summary: Optional[Dict[str, Any]] = None
    plan: DrawingToolingPlan


# -----------------------------------------------------------------------------
# Material & ESKD Annotation Parsers
# -----------------------------------------------------------------------------

MATERIAL_PATTERNS: List[Tuple[str, str, str, str]] = [
    # (regex, subgroup, iso_group, display_name)
    (r"(?:inconel|инконель|хн77|хн73|waspaloy|никелев|жаропроч)", "S1", "S", "Жаропрочный сплав (Inconel / ХН77)"),
    (r"(?:вт6|вт1|ti-?6al|титан)", "S2", "S", "Титановый сплав (ВТ6 / Ti-6Al-4V)"),
    (r"(?:saf\s*2205|дуплекс|08х22н6)", "M2", "M", "Дуплексная нержавейка (SAF 2205)"),
    (r"(?:12х18н10т|08х18н10|aisi\s*304|aisi\s*316|304l|316l|нержаве|нерж\.?)", "M1", "M", "Нержавеющая сталь (12Х18Н10Т / AISI 304)"),
    (r"(?:вч\s*40|вч\s*50|вч\s*60|ggg\s*50|высокопрочн\w*\s+чугун)", "K2", "K", "Высокопрочный чугун (ВЧ50)"),
    (r"(?:сч\s*15|сч\s*20|сч\s*25|сч\s*30|gg\s*25|чугун)", "K1", "K", "Серый чугун (СЧ20 / GG25)"),
    (r"(?:д16т|д16|амг\d?|амц|в95|ак4|6061|7075|алюмин)", "N1", "N", "Алюминиевый сплав (Д16Т / 6061)"),
    (r"(?:лс59|браж|бронз|латун|медь|медн)", "N2", "N", "Латунь / Бронза (ЛС59-1)"),
    (r"(?:шх15|х12мф|5хнм|9хс|у8|у10|h13|d2)", "P3", "P", "Инструментальная сталь (Х12МФ / ШХ15)"),
    (r"(?:40х|30хгса|38хмюа|42crmo4|4140|легирован)", "P2", "P", "Легированная сталь (40Х / 30ХГСА)"),
    (r"(?:ст\.?\s*45|сталь\s*45|ст\.?\s*20|сталь\s*20|ст\.?\s*3|09г2с|s355|1045|сталь)", "P1", "P", "Конструкционная сталь (Ст45)"),
]


def detect_material(text: str) -> Tuple[str, str, str, Optional[float]]:
    low = (text or "").lower()
    hrc_val: Optional[float] = None
    m_hrc = re.search(r"(\d{2}(?:[.,]\d)?)\s*(?:[-–—..]+\s*(\d{2}(?:[.,]\d)?))?\s*hrc", low)
    if not m_hrc:
        m_hrc = re.search(r"hrc[эe]?\s*[:=]?\s*(\d{2}(?:[.,]\d)?)(?:\s*[-–—..]+\s*(\d{2}(?:[.,]\d)?))?", low)
    if m_hrc:
        v1 = float(m_hrc.group(1).replace(",", "."))
        v2 = float(m_hrc.group(2).replace(",", ".")) if m_hrc.group(2) else v1
        hrc_val = round((v1 + v2) / 2.0, 1)

    sg, grp, disp = "P1", "P", "Конструкционная сталь (Ст45)"
    for pat, p_sg, p_grp, p_disp in MATERIAL_PATTERNS:
        if re.search(pat, low):
            sg, grp, disp = p_sg, p_grp, p_disp
            break

    # Hardened steel override >= 45 HRC -> ISO H1 (CBN / Hard carbide)
    if hrc_val is not None and hrc_val >= 45.0 and grp in ("P", "K", "H"):
        sg, grp = "H1", "H"
        disp = f"Закалённая сталь ({hrc_val:g} HRC)"

    return sg, grp, disp, hrc_val


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extracts embedded text from vector PDF blueprints (pypdf if available, else pure-Python zlib)."""
    try:
        import io
        from pypdf import PdfReader  # type: ignore
        reader = PdfReader(io.BytesIO(pdf_bytes))
        chunks = [page.extract_text() or "" for page in reader.pages[:6]]
        txt = "\n".join(c for c in chunks if c.strip())
        if txt.strip():
            return txt
    except Exception:
        pass

    # Pure-Python fallback: decompress FlateDecode streams and extract (...) Tj strings
    found: List[str] = []
    for m in re.finditer(rb"stream[\r\n]+(.*?)[\r\n]+endstream", pdf_bytes, flags=re.DOTALL):
        raw_stream = m.group(1)
        data = raw_stream
        try:
            data = zlib.decompress(raw_stream)
        except Exception:
            pass
        for tm in re.finditer(rb"\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj", data):
            try:
                s = tm.group(1).decode("utf-8", errors="ignore")
            except Exception:
                s = ""
            if len(s.strip()) >= 2:
                found.append(s.strip())
    return "\n".join(found)


def parse_dxf_blueprint(dxf_text: str) -> Dict[str, Any]:
    """
    Lightweight pure-Python ASCII DXF parser (AutoCAD / KOMPAS-3D / SolidWorks exports).
    Reads ENTITIES section: CIRCLE, ARC, LINE, LWPOLYLINE, TEXT, MTEXT, DIMENSION.
    """
    lines = [ln.strip() for ln in (dxf_text or "").splitlines()]
    entities: List[Dict[str, Any]] = []
    in_entities = False
    cur: Optional[Dict[str, Any]] = None

    i = 0
    n = len(lines)
    while i + 1 < n:
        code = lines[i]
        val = lines[i + 1]
        i += 2

        if code == "2" and val.upper() == "ENTITIES":
            in_entities = True
            continue
        if in_entities and code == "0" and val.upper() == "ENDSEC":
            if cur:
                entities.append(cur)
                cur = None
            break
        if not in_entities:
            continue

        if code == "0":
            if cur:
                entities.append(cur)
            cur = {"type": val.upper(), "xs": [], "ys": [], "texts": [], "r": None}
            continue
        if cur is None:
            continue

        if code in ("10", "11"):
            try:
                cur["xs"].append(float(val))
            except ValueError:
                pass
        elif code in ("20", "21"):
            try:
                cur["ys"].append(float(val))
            except ValueError:
                pass
        elif code == "40" and cur["type"] in ("CIRCLE", "ARC"):
            try:
                cur["r"] = float(val)
            except ValueError:
                pass
        elif code in ("1", "3") and cur["type"] in ("TEXT", "MTEXT", "DIMENSION", "ATTRIB"):
            # Strip common DXF MTEXT formatting codes like \P, \fArial;
            clean_t = re.sub(r"\\P", " ", val)
            clean_t = re.sub(r"\\[A-Za-z][^;]*;", "", clean_t)
            clean_t = clean_t.replace("{", "").replace("}", "").replace("%%c", "Ø").replace("%%C", "Ø").replace("%%d", "°")
            if clean_t.strip():
                cur["texts"].append(clean_t.strip())

    all_x: List[float] = []
    all_y: List[float] = []
    circles_by_d: Dict[float, int] = {}
    texts: List[str] = []
    segments: List[List[float]] = []
    circles_raw: List[List[float]] = []

    for ent in entities:
        et = ent["type"]
        xs, ys = ent["xs"], ent["ys"]
        if et == "CIRCLE" and ent["r"] and xs and ys:
            cx, cy, r = xs[0], ys[0], ent["r"]
            d = round(r * 2.0, 2)
            if 1.5 <= d <= 300.0:
                circles_by_d[d] = circles_by_d.get(d, 0) + 1
            circles_raw.append([cx, cy, r])
            all_x.extend([cx - r, cx + r])
            all_y.extend([cy - r, cy + r])
        elif et in ("LINE", "LWPOLYLINE") and len(xs) >= 2 and len(ys) >= 2:
            for k in range(min(len(xs), len(ys)) - 1):
                segments.append([xs[k], ys[k], xs[k + 1], ys[k + 1]])
            all_x.extend(xs)
            all_y.extend(ys)
        elif xs and ys:
            all_x.extend(xs)
            all_y.extend(ys)
        texts.extend(ent["texts"])

    bbox_w = round(max(all_x) - min(all_x), 1) if all_x else 0.0
    bbox_h = round(max(all_y) - min(all_y), 1) if all_y else 0.0

    return {
        "entity_count": len(entities),
        "bbox_w_mm": bbox_w,
        "bbox_h_mm": bbox_h,
        "circles_by_diameter": [
            {"diameter_mm": d, "count": cnt}
            for d, cnt in sorted(circles_by_d.items(), key=lambda kv: kv[0])
        ],
        "texts": texts,
        "preview_segments": segments[:400],
        "preview_circles": circles_raw[:120],
    }


def parse_drawing_annotations(
    text: str,
    part_name: str = "Деталь по чертежу",
    dxf_summary: Optional[Dict[str, Any]] = None,
    batch_qty: int = 50,
    stability: Literal["STABLE", "INTERRUPTED", "UNSTABLE"] = "STABLE",
    include_holders: bool = True,
) -> DrawingSpec:
    """Builds a structured DrawingSpec from ESKD text annotations + optional DXF geometry."""
    full_text = text or ""
    if dxf_summary and dxf_summary.get("texts"):
        full_text = (full_text + "\n" + "\n".join(dxf_summary["texts"])).strip()

    low = full_text.lower()
    sg, grp, mat_disp, hrc_val = detect_material(full_text)

    features: List[DrawingFeature] = []
    fid_seq = 1

    def next_id() -> str:
        nonlocal fid_seq
        s = f"feat-{fid_seq}"
        fid_seq += 1
        return s

    # 1. Surface roughness Ra
    ra_matches = [float(m.group(1).replace(",", ".")) for m in re.finditer(r"ra\s*[=:]?\s*(\d+(?:[.,]\d+)?)", low)]
    ra_min = min(ra_matches) if ra_matches else None

    # 2. Detect Part Type hints
    has_turning_kw = any(w in low for w in ("вал", "втулк", "точен", "токар", "шкив", "палец", "ось", "фланец", "проточ", "канавк", "отрезк", "расточ"))
    low_no_tm = low.replace("резьбофрез", "")
    has_milling_kw = any(w in low_no_tm for w in ("корпус", "плит", "кронштейн", "фрезер", "карман", "уступ", "лыск", "паз", "плоскост", "крышк"))

    # 3. Threads (M, MF, G, NPT)
    seen_threads: set[str] = set()
    # Match patterns like "4 отв. M12", "M16x1.5", "G1/2", "NPT 1/2", "резьба M20"
    thr_pattern = re.compile(
        r"(?:(\d+)\s*(?:отв\.?|шт\.?|x|х|\*)\s*)?"
        r"(?<!\w)(?:(м|m)\s*(\d{1,2})(?:\s*[xх×]\s*(\d+(?:[.,]\d+)?))?|(g)\s*(1/8|1/4|3/8|1/2|3/4|1)|(npt)\s*(1/8|1/4|3/8|1/2|3/4|1))(?!\w)",
        flags=re.IGNORECASE,
    )
    for m in thr_pattern.finditer(full_text):
        cnt_str = m.group(1)
        cnt = int(cnt_str) if cnt_str else 1
        ctx_start = max(0, m.start() - 28)
        ctx_end = min(len(full_text), m.end() + 28)
        ctx = full_text[ctx_start:ctx_end].lower()

        # Avoid matching ISO subgroup codes like "M1", "M2" or material names
        if m.group(2):
            sz = int(m.group(3))
            if sz < 3 or sz > 48:
                continue
            pitch_s = m.group(4).replace(",", ".") if m.group(4) else None
            code = f"M{sz}x{pitch_s}" if pitch_s else f"M{sz}"
            if code.upper() not in THREAD_BY_CODE:
                code = f"M{sz}"
            major = float(sz)
        elif m.group(5):
            code = f"G{m.group(6)}"
            major = float(THREAD_BY_CODE.get(code.upper(), {}).get("major_mm", 21.0))
        else:
            code = f"NPT {m.group(8)}"
            major = float(THREAD_BY_CODE.get(code.upper(), {}).get("major_mm", 21.3))

        is_external = any(w in ctx for w in ("наруж", "на валу", "резцом", "цапф", "шпильк"))
        if not is_external and has_turning_kw and not any(w in ctx for w in ("отв", "внутр", "глух", "сквоз")) and major >= 18 and cnt == 1:
            is_external = True

        key = f"{'EXT' if is_external else 'INT'}:{code.upper()}"
        if key in seen_threads:
            continue
        seen_threads.add(key)

        hole_type: Literal["BLIND", "THROUGH"] = "THROUGH" if "сквоз" in ctx else "BLIND"
        depth_m = re.search(r"(?:глуб\.?|l=|h=)\s*(\d+(?:[.,]\d+)?)", ctx)
        t_depth = float(depth_m.group(1).replace(",", ".")) if depth_m else round(major * 1.8, 1)

        if is_external:
            features.append(
                DrawingFeature(
                    id=next_id(),
                    kind="THREAD_EXTERNAL",
                    title=f"Наружная резьба {code}",
                    diameter_mm=major,
                    length_or_depth_mm=t_depth,
                    count=cnt,
                    thread_code=code.upper(),
                    notes="Токарное резьбонарезание 60° (резьбовая пластина)",
                )
            )
        else:
            features.append(
                DrawingFeature(
                    id=next_id(),
                    kind="THREAD_INTERNAL",
                    title=f"Резьбовое отверстие {code}" + (f" ({cnt} отв.)" if cnt > 1 else ""),
                    diameter_mm=major,
                    length_or_depth_mm=t_depth,
                    count=cnt,
                    thread_code=code.upper(),
                    hole_type=hole_type,
                    notes="Сверление под резьбу + метчик / резьбофреза",
                )
            )

    # 4. Precision Holes (ISO 286 UPPERCASE H7 / H8 / H6 / IT6 only — lowercase h6/h7 is an EXTERNAL shaft!)
    seen_prec: set[float] = set()
    has_shaft_precision = bool(re.search(r"(?:ø|Ø|d|D|ф|Ф)?\s*\d{1,3}(?:[.,]\d+)?\s*(?:h6|h7|g6|k6|js6|m6)\b", full_text))
    prec_pat = re.compile(
        r"(?:(\d+)\s*(?:отв\.?|шт\.?|x|х)\s*)?(?:ø|Ø|d|D|ф|Ф)?\s*(\d{1,3}(?:[.,]\d+)?)\s*(H7|H8|IT6|H6|Н7|Н8|Н6)\b",
    )
    for m in prec_pat.finditer(full_text):
        cnt = int(m.group(1)) if m.group(1) else 1
        diam = float(m.group(2).replace(",", "."))
        tol = m.group(3).replace("Н", "H").upper()
        if tol == "H6":
            tol = "IT6"
        if diam < 3.0 or diam > 220.0 or diam in seen_prec:
            continue
        seen_prec.add(diam)
        features.append(
            DrawingFeature(
                id=next_id(),
                kind="HOLE_PRECISION",
                title=f"Точное отверстие Ø{diam:g} {tol}" + (f" ({cnt} отв.)" if cnt > 1 else ""),
                diameter_mm=diam,
                length_or_depth_mm=round(diam * 2.2, 1),
                count=cnt,
                tolerance=tol,
                ra_um=0.8 if tol in ("H7", "IT6") else 1.6,
                notes=f"Чистовое развёртывание / растачивание под {tol}",
            )
        )

    # 5. Grooves & Parting
    grv_m = re.search(r"(?:канавк\w*|проточк\w*|отрезк\w*)(?:\s*(?:шир\.?|b=|w=)?\s*(\d+(?:[.,]\d+)?))?", low)
    if grv_m:
        gw = float(grv_m.group(1).replace(",", ".")) if grv_m.group(1) else 3.0
        features.append(
            DrawingFeature(
                id=next_id(),
                kind="GROOVE_PARTING",
                title=f"Канавка / Отрезка (ширина {gw:g} мм)",
                width_mm=gw,
                diameter_mm=45.0,
                count=1,
                notes="Отрезная/канавочная пластина с выходом стружки",
            )
        )

    # 6. Standard Drilled Holes from text annotations (e.g. "6 отв. Ø12", "Ø8 глуб. 40")
    seen_holes: set[float] = set()
    hole_pat = re.compile(
        r"(?:(\d+)\s*(?:отв\.?|шт\.?|x|х)\s*)?(?:отв\.?\s*)?(?:ø|Ø|ф|Ф)\s*(\d{1,3}(?:[.,]\d+)?)(?:\s*(?:глуб\.?|l=|h=)\s*(\d{1,3}(?:[.,]\d+)?))?",
        flags=re.IGNORECASE,
    )
    outer_diam_candidates: List[float] = []
    for m in hole_pat.finditer(full_text):
        cnt = int(m.group(1)) if m.group(1) else 1
        diam = float(m.group(2).replace(",", "."))
        depth = float(m.group(3).replace(",", ".")) if m.group(3) else None
        ctx = full_text[max(0, m.start() - 20):min(len(full_text), m.end() + 24)].lower()

        after_d = full_text[m.end():min(len(full_text), m.end() + 8)].lower()
        if re.search(r"\b(?:H7|H8|H6|IT6|Н7|Н8|Н6)\b", full_text[m.end():min(len(full_text), m.end() + 8)]):
            continue
        if any(w in ctx for w in ("отв", "сверл", "глуб", "сквоз")) or cnt >= 2:
            if 1.5 <= diam <= 55.0 and diam not in seen_holes:
                seen_holes.add(diam)
                features.append(
                    DrawingFeature(
                        id=next_id(),
                        kind="HOLE_DRILL",
                        title=f"Сверление отверстия Ø{diam:g}" + (f" ({cnt} отв.)" if cnt > 1 else ""),
                        diameter_mm=diam,
                        length_or_depth_mm=depth or round(diam * 3.0, 1),
                        count=cnt,
                        notes="Осевое сверление (монолит ЦТ / коронка / U-сверло)",
                    )
                )
        elif any(w in ctx for w in ("внутр", "расточ", "отверстие")):
            features.append(
                DrawingFeature(
                    id=next_id(),
                    kind="INTERNAL_BORE",
                    title=f"Внутреннее растачивание Ø{diam:g}",
                    diameter_mm=diam,
                    length_or_depth_mm=depth or round(diam * 1.5, 1),
                    count=1,
                    notes="Расточная державка с позитивной пластиной",
                )
            )
        else:
            if diam >= 12.0:
                outer_diam_candidates.append(diam)

    # 7. Circles extracted directly from DXF CAD geometry!
    if dxf_summary and dxf_summary.get("circles_by_diameter"):
        circles = dxf_summary["circles_by_diameter"]
        max_c = max(c["diameter_mm"] for c in circles)
        for c in circles:
            d = float(c["diameter_mm"])
            cnt = int(c["count"])
            if cnt == 1 and d == max_c and d >= 40.0:
                outer_diam_candidates.append(d)
                continue
            if 3.0 <= d <= 50.0 and d not in seen_holes:
                seen_holes.add(d)
                features.append(
                    DrawingFeature(
                        id=next_id(),
                        kind="HOLE_DRILL",
                        title=f"Отверстие из DXF Ø{d:g}" + (f" ({cnt} отв.)" if cnt > 1 else ""),
                        diameter_mm=d,
                        length_or_depth_mm=round(d * 3.0, 1),
                        count=cnt,
                        source="DXF",
                        notes="Обнаружено по окружностям DXF",
                    )
                )

    # 8. Turning & Milling primary surfaces
    env_d = max(outer_diam_candidates) if outer_diam_candidates else (dxf_summary.get("bbox_h_mm") if dxf_summary and dxf_summary.get("bbox_h_mm") else None)
    env_l = dxf_summary.get("bbox_w_mm") if dxf_summary and dxf_summary.get("bbox_w_mm") else None
    len_m = re.search(r"(?:длина|l\s*=|дл\.?)\s*(\d{2,4})", low)
    if len_m:
        env_l = float(len_m.group(1))

    if has_turning_kw or (outer_diam_candidates and not has_milling_kw):
        d_turn = env_d or 60.0
        features.insert(
            0,
            DrawingFeature(
                id=next_id(),
                kind="EXTERNAL_ROUGH",
                title=f"Наружное точение Ø{d_turn:g} (черн./получист.)",
                diameter_mm=d_turn,
                length_or_depth_mm=env_l or 120.0,
                count=1,
                notes="Основной съём припуска с наружного контура",
            ),
        )
        if (hrc_val is None or hrc_val < 45.0) and ((ra_min is not None and ra_min <= 1.6) or "чистов" in low or has_shaft_precision):
            features.insert(
                1,
                DrawingFeature(
                    id=next_id(),
                    kind="EXTERNAL_FINISH",
                    title=f"Чистовое точение Ø{d_turn:g}" + (f" (Ra {ra_min:g})" if ra_min else ""),
                    diameter_mm=d_turn,
                    length_or_depth_mm=env_l or 120.0,
                    count=1,
                    ra_um=ra_min or 1.6,
                    notes="Финишный проход для обеспечения шероховатости и допуска",
                ),
            )

    if has_milling_kw:
        if any(w in low for w in ("плоскост", "торец", "плит", "корпус", "фланец")):
            features.insert(
                0,
                DrawingFeature(
                    id=next_id(),
                    kind="FACE_MILL",
                    title="Торцевое фрезерование плоскостей",
                    length_or_depth_mm=env_l or 150.0,
                    count=1,
                    ra_um=ra_min,
                    notes="Выравнивание базовых плоскостей фрезой 45°",
                ),
            )
        if any(w in low_no_tm for w in ("карман", "уступ", "паз", "контур", "лыск", "кронштейн", "фрезер")):
            features.append(
                DrawingFeature(
                    id=next_id(),
                    kind="SHOULDER_POCKET",
                    title="Фрезерование уступов / карманов (90°)",
                    length_or_depth_mm=env_l or 100.0,
                    count=1,
                    notes="Контурное и уступное фрезерование 90°",
                )
            )
        if any(w in low for w in ("3d", "сфера", "радиусн", "матриц", "штамп")) or grp == "S":
            features.append(
                DrawingFeature(
                    id=next_id(),
                    kind="COPY_3D",
                    title="Копировальное / черновое 3D-фрезерование",
                    count=1,
                    notes="Круглая фрезерная пластина для сложных поверхностей",
                )
            )

    # Fallback if text had minimal hints: create sensible starter turning or milling op
    if not features:
        features.append(
            DrawingFeature(
                id=next_id(),
                kind="EXTERNAL_ROUGH",
                title="Наружное точение (базовая обработка)",
                diameter_mm=60.0,
                length_or_depth_mm=100.0,
                count=1,
                notes="Добавьте отверстия, резьбы или канавки с чертежа при необходимости",
            )
        )

    has_turn_feat = any(f.kind in ("EXTERNAL_ROUGH", "EXTERNAL_FINISH", "INTERNAL_BORE", "GROOVE_PARTING", "THREAD_EXTERNAL") for f in features)
    has_mill_or_hole = any(f.kind in ("FACE_MILL", "SHOULDER_POCKET", "COPY_3D", "HOLE_DRILL", "HOLE_PRECISION", "THREAD_INTERNAL") for f in features)
    if has_turn_feat and has_mill_or_hole:
        part_type: Literal["SHAFT_TURNED", "PRISMATIC_MILLED", "MILL_TURN"] = "MILL_TURN"
    elif has_mill_or_hole:
        part_type = "PRISMATIC_MILLED"
    else:
        part_type = "SHAFT_TURNED"

    return DrawingSpec(
        part_name=part_name,
        part_type=part_type,
        material_raw=mat_disp,
        material_subgroup=sg,
        iso_group=grp,  # type: ignore[arg-type]
        hardness_hrc=hrc_val,
        envelope_diameter_mm=env_d,
        envelope_length_mm=env_l,
        ra_min_um=ra_min,
        batch_qty=batch_qty,
        stability=stability,
        include_holders=include_holders,
        features=features,
    )


def _clean_api_key(api_key: Optional[str]) -> str:
    return (api_key or "").strip().strip('"').strip("'")


def resolve_vision_api_key(request_key: Optional[str] = None) -> str:
    """Resolves Vision AI key from request or environment (Groq, GitHub Models, OpenRouter, AI Studio, Vertex)."""
    for candidate in (
        request_key,
        os.getenv("VISION_API_KEY"),
        os.getenv("GROQ_API_KEY"),
        os.getenv("GITHUB_MODELS_TOKEN"),
        os.getenv("OPENROUTER_API_KEY"),
        os.getenv("GEMINI_API_KEY"),
    ):
        cleaned = _clean_api_key(candidate)
        if cleaned:
            return cleaned
    return ""


def detect_vision_provider(api_key: str) -> str:
    clean_key = _clean_api_key(api_key)
    if not clean_key:
        return "none"
    if clean_key.startswith("gsk_"):
        return "groq_free"
    if clean_key.startswith("sk-or-"):
        return "openrouter_free"
    if clean_key.startswith(("github_pat_", "ghp_")):
        return "github_models"
    if clean_key.startswith("AQ."):
        return "vertex_ai_aq"
    return "ai_studio_aiza"


def _build_vision_endpoint(api_key: str, model: str = "gemini-2.5-flash", api_ver: str = "v1") -> str:
    """Routes keys to Groq, OpenRouter, GitHub Models, Vertex AI Express Mode, or Gemini Developer API."""
    clean_key = _clean_api_key(api_key)
    if clean_key.startswith("gsk_"):
        return "https://api.groq.com/openai/v1/chat/completions"
    if clean_key.startswith("sk-or-"):
        return "https://openrouter.ai/api/v1/chat/completions"
    if clean_key.startswith(("github_pat_", "ghp_")):
        return "https://models.github.ai/inference/chat/completions"
    enc_key = urllib.parse.quote(clean_key, safe="._-")
    if clean_key.startswith("AQ."):
        return f"https://aiplatform.googleapis.com/{api_ver}/publishers/google/models/{model}:generateContent?key={enc_key}"
    return f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={enc_key}"


def _extract_json_object(raw_text: str) -> Dict[str, Any]:
    txt = (raw_text or "").lstrip("\ufeff").strip()
    txt = re.sub(r"^```(?:json)?\s*|\s*```$", "", txt, flags=re.IGNORECASE).strip()
    try:
        obj = json.loads(txt)
        if isinstance(obj, dict):
            return obj
    except ValueError:
        pass
    m = re.search(r"\{[\s\S]*\}", txt)
    if m:
        obj = json.loads(m.group(0))
        if isinstance(obj, dict):
            return obj
    raise ValueError(f"Модель вернула не JSON: {txt[:180] or '<пустой ответ>'}")


def _extract_openai_text(body: Dict[str, Any]) -> Tuple[str, Optional[str]]:
    """Extracts assistant text (or refusal/error) from OpenAI-compatible chat completion JSON."""
    if isinstance(body.get("error"), dict):
        return "", str(body["error"].get("message") or body["error"])[:220]
    choices = body.get("choices") or []
    if not choices:
        return "", f"Нет choices в ответе: {json.dumps(body, ensure_ascii=False)[:200]}"
    msg = choices[0].get("message") or {}
    content = msg.get("content")
    if isinstance(content, list):
        content = "".join(p.get("text", "") for p in content if isinstance(p, dict))
    txt = str(content or "").strip()
    if not txt:
        # Some reasoning models place output into reasoning / reasoning_content if max_tokens hit
        for rk in ("reasoning_content", "reasoning"):
            if msg.get(rk):
                txt = str(msg.get(rk)).strip()
                break
    if not txt and msg.get("refusal"):
        return "", f"Отказ модели: {str(msg['refusal'])[:180]}"
    return txt, None


def _build_openai_attempts(provider: str, clean_key: str) -> Tuple[str, List[Tuple[str, str, Dict[str, str], bool]]]:
    """
    Returns (prov_label, list of (url, model_name, headers, use_json_format)) for OpenAI-compatible providers.
    """
    custom_model = _clean_api_key(os.getenv("VISION_MODEL"))
    base_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {clean_key}",
        "User-Agent": "SKM-Tooling-Selector/2.3.9",
    }

    if provider == "groq_free":
        url = "https://api.groq.com/openai/v1/chat/completions"
        models = [
            "qwen/qwen3.8-27b",
        ]
        if custom_model:
            models = [custom_model] + [m for m in models if m != custom_model]
        return "Groq Free", [(url, m, dict(base_headers), True) for m in models]

    if provider == "openrouter_free":
        url = "https://openrouter.ai/api/v1/chat/completions"
        hdrs = {
            **base_headers,
            "HTTP-Referer": "https://skm-tooling-selector.onrender.com",
            "X-Title": "SKM Tooling Selector",
        }
        models = [
            "nvidia/nemotron-3.5-super-vl:free",
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            "google/gemma-4-31b-it:free",
        ]
        if custom_model:
            models = [custom_model] + [m for m in models if m != custom_model]
        return "OpenRouter Free", [(url, m, dict(hdrs), False) for m in models]

    # GitHub Models: official models.github.ai headers + fallback to legacy Azure endpoint
    gh_headers = {
        **base_headers,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    az_headers = dict(base_headers)
    attempts: List[Tuple[str, str, Dict[str, str], bool]] = []
    if custom_model:
        attempts.append(("https://models.github.ai/inference/chat/completions", custom_model, gh_headers, True))
    attempts.extend([
        ("https://models.github.ai/inference/chat/completions", "openai/gpt-4o-mini", gh_headers, True),
        ("https://models.github.ai/inference/chat/completions", "openai/gpt-4.1-mini", gh_headers, False),
        ("https://models.inference.ai.azure.com/chat/completions", "gpt-4o-mini", az_headers, True),
    ])
    return "GitHub Models", attempts


def _read_json_http_response(req: urllib.request.Request, timeout: int = 20) -> Tuple[Dict[str, Any], int, str]:
    """Executes request and parses JSON safely, reporting exact HTTP status/content-type/snippet on non-JSON."""
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        status = getattr(resp, "status", 200)
        final_url = resp.geturl() if hasattr(resp, "geturl") else req.full_url
        ctype = resp.headers.get("Content-Type", "unknown") if resp.headers else "unknown"
        raw_bytes = resp.read()
        raw_text = raw_bytes.decode("utf-8", errors="replace").lstrip("\ufeff").strip()
    if not raw_text:
        raise ValueError(f"Пустой ответ HTTP {status} (Content-Type: {ctype}, URL: {final_url.split('?')[0]})")
    try:
        parsed = json.loads(raw_text)
    except ValueError as exc:
        snippet = re.sub(r"\s+", " ", raw_text)[:180]
        raise ValueError(f"Ответ не JSON (HTTP {status}, {ctype}): {snippet}") from exc
    if not isinstance(parsed, dict):
        raise ValueError(f"Неожиданный формат JSON (HTTP {status}): {raw_text[:160]}")
    return parsed, status, final_url


def test_vision_connection(api_key: Optional[str] = None) -> Dict[str, Any]:
    """Quick diagnostic ping for /api/drawing/vision-test without uploading a drawing."""
    clean_key = resolve_vision_api_key(api_key)
    provider = detect_vision_provider(clean_key)
    if not clean_key:
        return {"ok": False, "provider": "none", "detail": "Ключ Vision AI не задан в Render Environment Variables."}
    if provider == "github_models":
        return {
            "ok": False,
            "provider": "github_models",
            "detail": "Сервис GitHub Models официально закрыт 30.07.2026 (отдаёт заглушку OK). Используйте бесплатный ключ Groq (gsk_...) или OpenRouter (sk-or-v1-...).",
        }

    if provider in ("groq_free", "openrouter_free", "github_models"):
        prov_label, attempts = _build_openai_attempts(provider, clean_key)
        errors: List[str] = []
        for url, model_name, hdrs, _ in attempts:
            payload: Dict[str, Any] = {
                "model": model_name,
                "max_tokens": 80,
                "temperature": 0,
                "messages": [{"role": "user", "content": 'Return JSON {"status":"ok"}'}],
            }
            if provider == "groq_free" and "qwen3" in model_name:
                payload["reasoning_effort"] = "none"
            elif provider == "openrouter_free" and "nemotron-3.5" in model_name:
                payload["reasoning"] = {"enabled": False}
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=hdrs, method="POST")
            try:
                body, status, final_url = _read_json_http_response(req, timeout=14)
                txt, err_msg = _extract_openai_text(body)
                if err_msg:
                    errors.append(f"{model_name}: {err_msg}")
                    continue
                return {
                    "ok": True,
                    "provider": provider,
                    "provider_label": prov_label,
                    "model": model_name,
                    "endpoint": final_url.split("?")[0],
                    "http_status": status,
                    "reply": txt[:120],
                }
            except urllib.error.HTTPError as exc:
                eb = ""
                try:
                    eb = exc.read().decode("utf-8", errors="ignore")[:220]
                except Exception:
                    pass
                errors.append(f"{model_name} HTTP {exc.code}: {eb or exc.reason}")
            except Exception as exc:
                errors.append(f"{model_name}: {exc}")
        return {"ok": False, "provider": provider, "provider_label": prov_label, "errors": errors}

    # Google AI Studio / Vertex AI test ping
    url = _build_vision_endpoint(clean_key, "gemini-2.5-flash", "v1")
    payload = {"contents": [{"role": "user", "parts": [{"text": 'Return {"status":"ok"}'}]}]}
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    try:
        body, status, _ = _read_json_http_response(req, timeout=14)
        txt = body["candidates"][0]["content"]["parts"][0]["text"]
        return {"ok": True, "provider": provider, "http_status": status, "reply": str(txt)[:120]}
    except urllib.error.HTTPError as exc:
        eb = ""
        try:
            eb = exc.read().decode("utf-8", errors="ignore")[:240]
        except Exception:
            pass
        return {"ok": False, "provider": provider, "http_status": exc.code, "error": eb or str(exc.reason)}
    except Exception as exc:
        return {"ok": False, "provider": provider, "error": str(exc)}


def analyze_blueprint_with_gemini_vision(
    file_bytes: bytes,
    mime_type: str,
    api_key: str,
    filename: str = "drawing.png",
    batch_qty: int = 50,
    stability: Literal["STABLE", "INTERRUPTED", "UNSTABLE"] = "STABLE",
    include_holders: bool = True,
    error_out: Optional[List[str]] = None,
) -> Optional[DrawingSpec]:
    """
    Universal Vision AI REST client (stdlib urllib only) to read scanned raster blueprints.
    Auto-routes by key prefix:
      - gsk_*               -> Groq Free Vision (Llama 4 Scout, ~2s, no billing card)
      - github_pat_* / ghp_ -> GitHub Models (gpt-4o-mini / gpt-4.1-mini, no billing card)
      - sk-or-*             -> OpenRouter Free Vision (no billing card)
      - AIza*               -> Google AI Studio Gemini API
      - AQ.*                -> Vertex AI Express Mode
    """
    clean_key = _clean_api_key(api_key)
    if not clean_key:
        return None

    provider = detect_vision_provider(clean_key)
    if provider == "github_models":
        if error_out is not None:
            error_out.append(
                "Сервис GitHub Models закрыт 30.07.2026 (эндпоинт отдаёт заглушку OK). "
                "Замените GEMINI_API_KEY в Render на бесплатный ключ Groq (gsk_..., console.groq.com) или OpenRouter (sk-or-v1-...)."
            )
        return None
    b64_img = base64.b64encode(file_bytes).decode("ascii")

    prompt = (
        "You are a CNC manufacturing & ESKD blueprint engineer. Analyze this engineering drawing carefully. "
        "Read all outer diameters, internal bore diameters, ISO 286 tolerances (remember uppercase H7/H8/IT6 = hole, "
        "lowercase h6/h7 = external shaft), surface roughness Ra, grooves (width & diameter), threads (M/MF/G/NPT), "
        "and small drilled holes (including radial oil holes like 2 отв. Ø2). "
        "Return ONLY valid JSON (no markdown, no explanation) with this exact schema:\n"
        "{\n"
        '  "part_name": "short Russian part name, e.g. Втулка ступенчатая Ø58x70",\n'
        '  "material_text": "material & hardness from title block, or Сталь 45 if not specified on drawing",\n'
        '  "envelope_diameter_mm": number or null,\n'
        '  "envelope_length_mm": number or null,\n'
        '  "ra_min_um": number or null,\n'
        '  "features": [\n'
        '    {"kind": "EXTERNAL_ROUGH|EXTERNAL_FINISH|INTERNAL_BORE|GROOVE_PARTING|THREAD_EXTERNAL|THREAD_INTERNAL|HOLE_DRILL|HOLE_PRECISION|FACE_MILL|SHOULDER_POCKET|COPY_3D",\n'
        '     "title": "Russian description", "diameter_mm": number|null, "length_or_depth_mm": number|null,\n'
        '     "width_mm": number|null, "count": int, "thread_code": "M12"|null, "tolerance": "H7"|"H8"|"IT6"|null,\n'
        '     "ra_um": number|null, "hole_type": "BLIND"|"THROUGH"}\n'
        "  ]\n"
        "}"
    )

    data: Optional[Dict[str, Any]] = None
    fallback_plain_text = ""
    last_err = ""

    if provider in ("groq_free", "openrouter_free", "github_models"):
        prov_label, attempts = _build_openai_attempts(provider, clean_key)
        data_uri = f"data:{mime_type};base64,{b64_img}"
        attempt_errors: List[str] = []

        for url, model_name, hdrs, use_json_fmt in attempts:
            img_obj: Dict[str, Any] = {"url": data_uri}
            if provider == "github_models":
                img_obj["detail"] = "high"
            payload: Dict[str, Any] = {
                "model": model_name,
                "temperature": 0.1,
                "max_tokens": 2200,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": img_obj},
                        ],
                    }
                ],
            }
            if use_json_fmt:
                payload["response_format"] = {"type": "json_object"}
            if provider == "groq_free" and "qwen3" in model_name:
                payload["reasoning_effort"] = "none"
            elif provider == "openrouter_free" and "nemotron-3.5" in model_name:
                payload["reasoning"] = {"enabled": False}
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=hdrs,
                method="POST",
            )
            try:
                body, _, _ = _read_json_http_response(req, timeout=20)
                msg_text, extract_err = _extract_openai_text(body)
                if extract_err:
                    attempt_errors.append(f"{prov_label} ({model_name}): {extract_err}")
                    continue
                try:
                    data = _extract_json_object(msg_text)
                    break
                except ValueError as jerr:
                    # Save plain text in case model described dimensions without JSON wrapper
                    if len(msg_text) >= 25 and not fallback_plain_text:
                        fallback_plain_text = msg_text
                    attempt_errors.append(f"{prov_label} ({model_name}): {jerr}")
                    continue
            except urllib.error.HTTPError as exc:
                err_body = ""
                try:
                    err_body = exc.read().decode("utf-8", errors="ignore")[:220]
                except Exception:
                    pass
                err_msg = f"{prov_label} ({model_name}) HTTP {exc.code}: {err_body or exc.reason}"
                attempt_errors.append(err_msg)
                last_err = f"Ошибка {err_msg}"
                # For GitHub Models, still try Azure fallback on 401/403/404; for others stop on 401/403
                if exc.code in (401, 403) and provider != "github_models":
                    break
            except (urllib.error.URLError, KeyError, ValueError, TimeoutError, OSError) as exc:
                err_msg = f"{prov_label} ({model_name}): {exc}"
                attempt_errors.append(err_msg)
                last_err = f"Сбой запроса {err_msg}"
                continue

        if data is None and attempt_errors:
            last_err = " | ".join(attempt_errors[:3])
    else:
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt},
                        {"inlineData": {"mimeType": mime_type, "data": b64_img}},
                    ],
                }
            ],
            "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"},
        }
        attempts_g = (
            [("gemini-2.5-flash", "v1"), ("gemini-2.5-flash", "v1beta1"), ("gemini-2.0-flash", "v1")]
            if provider == "vertex_ai_aq"
            else [("gemini-2.5-flash", "v1beta"), ("gemini-2.0-flash", "v1beta")]
        )
        for model_name, api_ver in attempts_g:
            url = _build_vision_endpoint(clean_key, model_name, api_ver)
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "SKM-Tooling-Selector/2.3.9"},
                method="POST",
            )
            try:
                body, _, _ = _read_json_http_response(req, timeout=25)
                text_out = body["candidates"][0]["content"]["parts"][0]["text"]
                data = _extract_json_object(text_out)
                break
            except urllib.error.HTTPError as exc:
                err_body = ""
                try:
                    err_body = exc.read().decode("utf-8", errors="ignore")[:240]
                except Exception:
                    pass
                prov_label = "Vertex AI (AQ.*)" if provider == "vertex_ai_aq" else "Gemini AI Studio (AIza*)"
                last_err = f"Ошибка {prov_label} ({model_name}/{api_ver}) HTTP {exc.code}: {err_body or exc.reason}"
                if exc.code not in (404, 400):
                    break
            except (urllib.error.URLError, KeyError, ValueError, TimeoutError, OSError) as exc:
                last_err = f"Сбой запроса Vision AI ({model_name}): {exc}"
                break

    if data is None:
        # Smart fallback: if Vision AI returned readable ESKD dimensions as plain text, parse them!
        if fallback_plain_text and re.search(r"(?:Ø|ø|H7|H8|IT6|M\d|Ra|сталь|втулк|вал|фланец)", fallback_plain_text, re.IGNORECASE):
            spec_fb = parse_drawing_annotations(
                text=fallback_plain_text,
                part_name=filename.rsplit(".", 1)[0] if "." in filename else filename,
                batch_qty=batch_qty,
                stability=stability,
                include_holders=include_holders,
            )
            for f_item in spec_fb.features:
                f_item.source = "VISION_AI"
            return spec_fb
        if error_out is not None and last_err:
            error_out.append(last_err)
        return None

    sg, grp, mat_disp, hrc_val = detect_material(str(data.get("material_text", "")))
    feats: List[DrawingFeature] = []
    valid_kinds = {
        "EXTERNAL_ROUGH", "EXTERNAL_FINISH", "INTERNAL_BORE", "GROOVE_PARTING",
        "THREAD_EXTERNAL", "THREAD_INTERNAL", "HOLE_DRILL", "HOLE_PRECISION",
        "FACE_MILL", "SHOULDER_POCKET", "COPY_3D",
    }
    for idx, f in enumerate(data.get("features") or [], start=1):
        kind = str(f.get("kind", "EXTERNAL_ROUGH")).upper()
        if kind not in valid_kinds:
            kind = "EXTERNAL_ROUGH"
        feats.append(
            DrawingFeature(
                id=f"vis-{idx}",
                kind=kind,  # type: ignore[arg-type]
                title=str(f.get("title") or kind),
                diameter_mm=float(f["diameter_mm"]) if f.get("diameter_mm") is not None else None,
                length_or_depth_mm=float(f["length_or_depth_mm"]) if f.get("length_or_depth_mm") is not None else None,
                width_mm=float(f["width_mm"]) if f.get("width_mm") is not None else None,
                count=max(1, int(f.get("count") or 1)),
                thread_code=str(f["thread_code"]).upper() if f.get("thread_code") else None,
                tolerance=str(f["tolerance"]).upper() if f.get("tolerance") else None,
                ra_um=float(f["ra_um"]) if f.get("ra_um") is not None else None,
                hole_type="THROUGH" if str(f.get("hole_type", "")).upper() == "THROUGH" else "BLIND",
                source="VISION_AI",
                notes="Распознано ИИ-зрением с чертежа",
            )
        )

    if not feats:
        return None

    return DrawingSpec(
        part_name=str(data.get("part_name") or filename),
        part_type="MILL_TURN",
        material_raw=str(data.get("material_text") or mat_disp),
        material_subgroup=sg,
        iso_group=grp,  # type: ignore[arg-type]
        hardness_hrc=hrc_val,
        envelope_diameter_mm=float(data["envelope_diameter_mm"]) if data.get("envelope_diameter_mm") else None,
        envelope_length_mm=float(data["envelope_length_mm"]) if data.get("envelope_length_mm") else None,
        ra_min_um=float(data["ra_min_um"]) if data.get("ra_min_um") else None,
        batch_qty=batch_qty,
        stability=stability,
        include_holders=include_holders,
        features=feats,
    )


# -----------------------------------------------------------------------------
# Tooling Kit Recommender (Features -> Optimal Inserts + Holders + Batch Qty)
# -----------------------------------------------------------------------------

def _pick_best_insert(
    inserts: List[Dict[str, Any]],
    iso_group: str,
    domain: str,
    prefer_codes: Optional[List[str]] = None,
    prefer_app: Optional[str] = None,
    axial_subtype: Optional[str] = None,
    target_diam_mm: Optional[float] = None,
    target_ld: Optional[float] = None,
    prefer_holder_cat: Optional[str] = None,
    repo: Any = None,
) -> Dict[str, Any]:
    pool = [i for i in inserts if i["operation_domain"] == domain]
    if axial_subtype:
        sub_pool = [i for i in pool if i.get("axial_subtype") == axial_subtype]
        if sub_pool:
            pool = sub_pool
    if not pool:
        pool = inserts

    def _score(ins: Dict[str, Any]) -> Tuple[int, float]:
        s = 0
        rank = ins.get("suitability", {}).get(iso_group)
        if rank == "PRIMARY":
            s += 100
        elif rank == "SECONDARY":
            s += 55
        else:
            s -= 40

        if prefer_codes:
            for idx, pcode in enumerate(prefer_codes):
                if ins["iso_code"].upper().startswith(pcode.upper()):
                    s += 45 - idx * 5
                    break

        if prefer_app and ins.get("application_class") == prefer_app:
            s += 24
        if prefer_holder_cat and any(h.get("category") == prefer_holder_cat for h in ins.get("holders", [])):
            s += 35

        if target_diam_mm is not None:
            h0 = ins["holders"][0] if ins.get("holders") else {}
            dc = float(h0.get("dc_mm") or ins.get("ic_mm") or target_diam_mm)
            diff = abs(dc - target_diam_mm)
            s += max(-30, int(28 - diff * 2.5))

        if target_ld is not None and ins.get("ld_ratio_max"):
            if float(ins["ld_ratio_max"]) >= target_ld:
                s += 18
            else:
                s -= 15

        if repo is not None:
            st = repo.get_stock_match(ins["iso_code"], ins["grade_code"])
            if st and int(st.get("qty", 0)) > 0:
                s += 12

        # Tie-breaker: lower cost per cutting edge
        cost_edge = float(ins.get("relative_cost_index", 1.0)) / max(int(ins.get("cutting_edges_count", 1)), 1)
        return (s, -cost_edge)

    return max(pool, key=_score)


def _calc_batch_qty(pack_qty: int, edges: int, batch_qty: int, feat_count: int, domain: str, is_solid: bool) -> int:
    total_ops = max(1, batch_qty * max(1, feat_count))
    if is_solid:
        # Solid carbide drill / tap / reamer lasts ~120-250 holes
        return max(1, math.ceil(total_ops / 180.0))
    # Indexable insert: ~20-35 operations per cutting edge
    ops_per_edge = 25.0 if domain in ("TURNING", "MILLING") else 35.0
    needed_edges = math.ceil(total_ops / ops_per_edge)
    needed_inserts = math.ceil(needed_edges / max(edges, 1))
    # Round up to full packs (minimum 1 pack)
    packs = max(1, math.ceil(needed_inserts / max(pack_qty, 1)))
    return packs * pack_qty


def recommend_tooling_for_blueprint(repo: Any, spec: DrawingSpec) -> DrawingToolingPlan:
    inserts = repo.list_inserts()
    iso_g = spec.iso_group
    sg = repo.get_subgroup(spec.material_subgroup)
    kc1_1 = float(sg["kc1_1_mpa"]) if sg else 1500.0

    kit_lines: List[ToolingKitLine] = []
    warnings: List[str] = []
    step_no = 10

    for feat in spec.features:
        pre_drill_note: Optional[str] = None
        rationale = ""
        ins: Dict[str, Any]

        if feat.kind == "EXTERNAL_ROUGH":
            if iso_g == "H":
                ins = _pick_best_insert(inserts, iso_g, "TURNING", prefer_codes=["CNGA"], repo=repo)
                rationale = f"Закалённая сталь ({spec.hardness_hrc or 52:g} HRC): CBN-пластина для твёрдого точения насухо."
            elif iso_g == "K":
                ins = _pick_best_insert(inserts, iso_g, "TURNING", prefer_codes=["SNMG", "WNMG"], prefer_app="ROUGHING", repo=repo)
                rationale = "Чугун: 8-кромочная SNMG с толстым Al2O3 даёт минимальную цену за кромку."
            elif iso_g == "N":
                ins = _pick_best_insert(inserts, iso_g, "TURNING", prefer_codes=["CCGT", "DCMT"], repo=repo)
                rationale = "Алюминий/цветмет: полированная острая кромка без покрытия исключает нарост."
            elif iso_g == "M":
                ins = _pick_best_insert(inserts, iso_g, "TURNING", prefer_codes=["WNMG 080412", "CNMG 120404"], prefer_app="ROUGHING", repo=repo)
                rationale = "Нержавейка: вязкий сплав и усиленная кромка для чернового/получистового съёма."
            elif spec.stability == "INTERRUPTED":
                ins = _pick_best_insert(inserts, iso_g, "TURNING", prefer_codes=["WNMG 080412", "CNMG 120408"], prefer_app="ROUGHING", repo=repo)
                rationale = "Ударная/черновая обработка: усиленная кромка R1.2 и 6 кромок WNMG."
            else:
                ins = _pick_best_insert(inserts, iso_g, "TURNING", prefer_codes=["WNMG 080408", "CNMG 120408"], prefer_app="MEDIUM", repo=repo)
                rationale = f"Оптимальный баланс съёма и цены за кромку (6 кр.) для материала {spec.material_subgroup}."

        elif feat.kind == "EXTERNAL_FINISH":
            if iso_g == "H":
                ins = _pick_best_insert(inserts, iso_g, "TURNING", prefer_codes=["CNGA"], repo=repo)
                rationale = "Финишное твёрдое точение CBN (Ra ≤ 0.8 мкм вместо шлифования)."
            elif iso_g == "N":
                ins = _pick_best_insert(inserts, iso_g, "TURNING", prefer_codes=["CCGT", "DCMT"], prefer_app="FINISHING", repo=repo)
                rationale = "Зеркально полированная пластина RE 0.4 для чистой поверхности по цветмету."
            elif iso_g in ("M", "S"):
                ins = _pick_best_insert(inserts, iso_g, "TURNING", prefer_codes=["VNMG", "CNMG 120404"], prefer_app="FINISHING", repo=repo)
                rationale = "Острый PVD-сплав с RE 0.4 для чистового прохода по нерж./титану без наклёпа."
            else:
                ins = _pick_best_insert(inserts, iso_g, "TURNING", prefer_codes=["CNMG 120404", "DNMG", "TNMG"], prefer_app="FINISHING", repo=repo)
                rationale = f"Чистовая пластина под требование Ra {feat.ra_um or spec.ra_min_um or 1.6:g} мкм."

        elif feat.kind == "INTERNAL_BORE":
            ins = _pick_best_insert(
                inserts, iso_g, "TURNING",
                prefer_codes=["CCGT", "DCMT"] if iso_g == "N" else ["CCMT", "DCMT"],
                prefer_holder_cat="BORING_BAR",
                repo=repo,
            )
            rationale = f"Позитивная 7° пластина для внутреннего растачивания Ø{feat.diameter_mm or 30:g} (низкие радиальные силы)."

        elif feat.kind == "GROOVE_PARTING":
            ins = _pick_best_insert(inserts, iso_g, "GROOVING_THREADING", prefer_codes=["MGMN"], repo=repo)
            rationale = f"Отрезка и проточка канавок шириной {feat.width_mm or 3.0:g} мм (2 кромки)."

        elif feat.kind == "THREAD_EXTERNAL":
            ins = _pick_best_insert(inserts, iso_g, "GROOVING_THREADING", prefer_codes=["16ER"], repo=repo)
            rationale = f"Наружное токарное резьбонарезание {feat.thread_code or '60°'} (универсальный профиль AG60, 3 вершины)."

        elif feat.kind == "THREAD_INTERNAL":
            t_code = (feat.thread_code or "M12").upper()
            method: Literal["CUT_TAP", "FORM_TAP", "THREAD_MILL"] = (
                "THREAD_MILL" if iso_g in ("S", "H") or (feat.diameter_mm or 12) >= 16
                else ("FORM_TAP" if iso_g == "N" and "NPT" not in t_code else "CUT_TAP")
            )
            if t_code in THREAD_BY_CODE:
                tr = calculate_threading(
                    ThreadCalcInput(
                        thread_code=t_code,
                        iso_group=iso_g,
                        kc1_1_mpa=kc1_1,
                        hole_type=feat.hole_type,
                        method=method,
                        thread_depth_mm=feat.length_or_depth_mm or 20.0,
                    )
                )
                pre_drill_note = f"Предварит. сверло под {t_code}: Ø{tr.pre_drill_mm:.2f} мм (глуб. ≥ {tr.min_drill_depth_mm} мм)"
                if tr.warnings:
                    warnings.extend(tr.warnings[:1])
            pref = ["TM-"] if method == "THREAD_MILL" else (["FORM-"] if method == "FORM_TAP" else (["TAP-M12-BL"] if feat.hole_type == "BLIND" else ["TAP-M10-TH"]))
            ins = _pick_best_insert(inserts, iso_g, "DRILLING", axial_subtype="TAP_THREAD_MILL", prefer_codes=pref, target_diam_mm=feat.diameter_mm, repo=repo)
            rationale = (
                f"ЦТ резьбофреза для {t_code} (безопасно для {spec.material_subgroup}, без риска поломки метчика)."
                if method == "THREAD_MILL"
                else (f"Бесстружечный раскатник для {t_code} (высокая прочность резьбы в цветмете)." if method == "FORM_TAP" else f"Машинный метчик для {t_code} ({'глухие' if feat.hole_type == 'BLIND' else 'сквозные'} отв.).")
            )

        elif feat.kind == "HOLE_PRECISION":
            d_hole = feat.diameter_mm or 20.0
            tol = feat.tolerance if feat.tolerance in ("H7", "H8", "IT6") else "H7"
            use_bore = (tol == "IT6") or (d_hole >= 24.0)
            hf = calculate_hole_finishing(
                HoleFinishInput(
                    target_diameter_mm=d_hole,
                    tolerance_grade=tol,  # type: ignore[arg-type]
                    hole_depth_mm=feat.length_or_depth_mm or round(d_hole * 2.2, 1),
                    iso_group=iso_g,
                    kc1_1_mpa=kc1_1,
                    method="FINE_BORING" if use_bore else "REAMING",
                )
            )
            pre_drill_note = f"Предварит. отверстие под {tol}: Ø{hf.pre_drill_opt_mm:.2f} мм (окно {hf.pre_drill_min_mm:.2f}..{hf.pre_drill_max_mm:.2f} мм)"
            if hf.warnings:
                warnings.extend(hf.warnings[:1])
            ins = _pick_best_insert(
                inserts, iso_g, "DRILLING",
                axial_subtype="REAMER_FINE_BORE",
                prefer_codes=["FBORE"] if use_bore else ["REAM-H7"],
                target_diam_mm=d_hole,
                repo=repo,
            )
            rationale = (
                f"Микрометрическая расточка под Ø{d_hole:g} {tol} (точность 0.002 мм, Ra {hf.expected_ra_um} мкм)."
                if use_bore
                else f"6-зубая ЦТ развёртка под Ø{d_hole:g} {tol} (+{hf.upper_dev_um:g}/0 мкм, цикл G85)."
            )

        elif feat.kind == "HOLE_DRILL":
            d_hole = feat.diameter_mm or 12.0
            depth = feat.length_or_depth_mm or round(d_hole * 3.0, 1)
            ld = round(depth / max(d_hole, 1.0), 1)
            if d_hole <= 13.0 or iso_g == "H":
                sub = "SOLID_CARBIDE"
                rationale = f"Монолитное ЦТ-сверло с внутр. СОЖ для Ø{d_hole:g} ({ld}xD, точность IT8)."
            elif d_hole <= 20.5:
                sub = "MODULAR_TIP"
                rationale = f"Модульное сверло со сменной коронкой для Ø{d_hole:g} ({ld}xD, быстрая замена, IT9)."
            else:
                sub = "INDEXABLE_U_DRILL"
                rationale = f"Корпусное U-сверло со СМП для Ø{d_hole:g} ({ld}xD, минимальная цена за отверстие)."
            ins = _pick_best_insert(
                inserts, iso_g, "DRILLING",
                axial_subtype=sub,
                target_diam_mm=d_hole,
                target_ld=ld,
                repo=repo,
            )
            if ld > 5.0:
                pre_drill_note = f"Глубокое сверление {ld}xD: требуется пилот 2xD и СОЖ ≥ 35 бар"

        elif feat.kind == "FACE_MILL":
            if iso_g == "N":
                ins = _pick_best_insert(inserts, iso_g, "MILLING", prefer_codes=["APKT 160408-AL"], repo=repo)
                rationale = "Полированная фрезерная пластина для чистых плоскостей по алюминию."
            else:
                ins = _pick_best_insert(inserts, iso_g, "MILLING", prefer_codes=["SEKT"], repo=repo)
                rationale = "Торцевая фреза 45° (SEKT, 4 кромки) — мягкий вход и максимальная производительность."

        elif feat.kind == "COPY_3D":
            ins = _pick_best_insert(inserts, iso_g, "MILLING", prefer_codes=["RDMT", "APKT"], repo=repo)
            rationale = "Круглая копировальная пластина RDMT (6 кромок) для 3D-поверхностей и сложных сплавов."

        else:  # SHOULDER_POCKET
            ins = _pick_best_insert(
                inserts, iso_g, "MILLING",
                prefer_codes=["APKT 160408-AL"] if iso_g == "N" else ["APKT 160408"],
                repo=repo,
            )
            rationale = "Уступное и контурное фрезерование 90° (APKT с зачистной фаской Wiper)."

        st = repo.get_stock_match(ins["iso_code"], ins["grade_code"])
        stock_qty = int(st["qty"]) if st else 0
        unit_price = float(st["unit_price_rub"]) if st else round(float(ins.get("relative_cost_index", 1.0)) * 650.0, 0)
        pack_qty = _determine_pack_qty(ins)
        is_solid = ins.get("axial_subtype") in ("SOLID_CARBIDE", "TAP_THREAD_MILL", "REAMER_FINE_BORE")
        rec_qty = _calc_batch_qty(pack_qty, int(ins.get("cutting_edges_count", 2)), spec.batch_qty, feat.count, ins["operation_domain"], is_solid)

        h0 = ins["holders"][0] if ins.get("holders") else None
        h_code = h0["code"] if h0 else None
        h_cat = h0["category"] if h0 else None
        h_price = HOLDER_UPSELL_PRICE_RUB.get(h_cat or "", 5500.0) if h0 else None

        dim_parts = []
        if feat.diameter_mm:
            dim_parts.append(f"Ø{feat.diameter_mm:g} мм")
        if feat.length_or_depth_mm:
            dim_parts.append(f"L={feat.length_or_depth_mm:g} мм")
        if feat.width_mm:
            dim_parts.append(f"W={feat.width_mm:g} мм")
        if feat.count > 1:
            dim_parts.append(f"{feat.count} шт/дет")
        if feat.tolerance:
            dim_parts.append(feat.tolerance)
        if feat.ra_um:
            dim_parts.append(f"Ra {feat.ra_um:g}")
        feat_summary = " · ".join(dim_parts) or feat.notes or feat.title

        kit_lines.append(
            ToolingKitLine(
                step_no=step_no,
                feature_id=feat.id,
                operation_title=feat.title,
                feature_summary=feat_summary,
                insert_id=ins["id"],
                iso_code=ins["iso_code"],
                shape_code=ins.get("shape_code", "C"),
                operation_domain=ins["operation_domain"],
                grade_code=ins["grade_code"],
                coating_method=ins["coating_method"],
                cutting_edges_count=int(ins.get("cutting_edges_count", 2)),
                unit_price_rub=round(unit_price, 2),
                pack_qty=pack_qty,
                recommended_qty=rec_qty,
                line_total_rub=round(unit_price * rec_qty, 2),
                stock_qty=stock_qty,
                in_stock=stock_qty >= rec_qty,
                bin_location=st["bin_location"] if st else "",
                holder_code=h_code,
                holder_category=h_cat,
                holder_price_rub=h_price,
                pre_drill_note=pre_drill_note,
                rationale=rationale,
            )
        )
        step_no += 10

    seen_insert_step: Dict[str, int] = {}
    for ln in kit_lines:
        if ln.insert_id in seen_insert_step:
            ln.shared_with_step = seen_insert_step[ln.insert_id]
            ln.line_total_rub = 0.0
            ln.recommended_qty = 0
            ln.rationale += f" (Используется тот же инструмент, что и на Оп. {ln.shared_with_step} — без доплаты.)"
        else:
            seen_insert_step[ln.insert_id] = ln.step_no

    total_inserts = round(sum(ln.line_total_rub for ln in kit_lines), 2)
    # Deduplicate holders so the customer isn't billed twice for the same holder (e.g. PCLNR 2525M 12)
    unique_holders: Dict[str, float] = {}
    for ln in kit_lines:
        if ln.holder_code and ln.holder_price_rub:
            unique_holders[ln.holder_code] = ln.holder_price_rub
    total_holders = round(sum(unique_holders.values()), 2) if spec.include_holders else 0.0
    in_stock_cnt = sum(1 for ln in kit_lines if ln.stock_qty > 0)
    backorder_cnt = len(kit_lines) - in_stock_cnt

    return DrawingToolingPlan(
        spec=spec,
        kit_lines=kit_lines,
        total_operations=len(kit_lines),
        total_inserts_rub=total_inserts,
        total_holders_rub=total_holders,
        grand_total_rub=round(total_inserts + total_holders, 2),
        in_stock_count=in_stock_cnt,
        backorder_count=backorder_cnt,
        warnings=warnings,
    )


def _build_spec_from_cad3d(
    cad3d: Dict[str, Any],
    notes_text: str,
    batch_qty: int,
    stability: Literal["STABLE", "INTERRUPTED", "UNSTABLE"],
    include_holders: bool,
) -> DrawingSpec:
    combined_meta = f"{cad3d.get('part_name', '')}\n{notes_text or ''}".strip()
    sg, grp, mat_disp, hrc_val = detect_material(combined_meta)

    features: List[DrawingFeature] = []
    for raw_f in cad3d.get("features") or []:
        features.append(
            DrawingFeature(
                id=str(raw_f["id"]),
                kind=raw_f["kind"],
                title=str(raw_f["title"]),
                diameter_mm=raw_f.get("diameter_mm"),
                length_or_depth_mm=raw_f.get("length_or_depth_mm"),
                width_mm=raw_f.get("width_mm"),
                count=int(raw_f.get("count", 1)),
                ra_um=raw_f.get("ra_um"),
                notes=str(raw_f.get("notes", "")),
                source=str(raw_f.get("source", "STEP_3D")),
            )
        )

    # If user also typed ESKD notes (threads M12, H7/IT6 tolerances, Ra), merge them cleanly!
    ra_min = None
    if notes_text and notes_text.strip():
        notes_spec = parse_drawing_annotations(
            text=notes_text,
            part_name=cad3d.get("part_name", "3D-модель"),
            batch_qty=batch_qty,
            stability=stability,
            include_holders=include_holders,
        )
        ra_min = notes_spec.ra_min_um
        for nf in notes_spec.features:
            if nf.kind in ("THREAD_INTERNAL", "THREAD_EXTERNAL", "HOLE_PRECISION", "GROOVE_PARTING"):
                # Avoid duplicate groove if STEP already detected one
                if nf.kind == "GROOVE_PARTING" and any(f.kind == "GROOVE_PARTING" for f in features):
                    continue
                # If H7/IT6 matches diameter of a detected CAD hole/bore, upgrade that feature in place!
                if nf.kind == "HOLE_PRECISION" and nf.diameter_mm:
                    replaced = False
                    for idx, cf in enumerate(features):
                        if cf.kind in ("HOLE_DRILL", "INTERNAL_BORE") and cf.diameter_mm and abs(cf.diameter_mm - nf.diameter_mm) <= 0.6:
                            features[idx] = DrawingFeature(
                                id=cf.id,
                                kind="HOLE_PRECISION",
                                title=nf.title,
                                diameter_mm=nf.diameter_mm,
                                length_or_depth_mm=cf.length_or_depth_mm or nf.length_or_depth_mm,
                                count=max(cf.count, nf.count),
                                tolerance=nf.tolerance,
                                ra_um=nf.ra_um,
                                notes=f"{nf.notes} (уточнено по ТТ для 3D-отверстия)",
                                source=cf.source,
                            )
                            replaced = True
                            break
                    if replaced:
                        continue
                features.append(nf)

    if not features:
        features.append(
            DrawingFeature(
                id="cad-fallback-1",
                kind="FACE_MILL",
                title="Базовая фрезерная обработка 3D-заготовки",
                length_or_depth_mm=max(cad3d.get("bbox_x_mm") or 100.0, cad3d.get("bbox_y_mm") or 100.0),
                count=1,
                source="STEP_3D",
            )
        )

    dims = [cad3d.get("bbox_x_mm") or 0.0, cad3d.get("bbox_y_mm") or 0.0, cad3d.get("bbox_z_mm") or 0.0]
    env_l = max(dims) if any(dims) else None
    env_d = cad3d.get("max_outer_diameter_mm")

    return DrawingSpec(
        part_name=str(cad3d.get("part_name") or "3D-модель заготовки"),
        part_type=cad3d.get("part_type", "MILL_TURN"),
        material_raw=mat_disp,
        material_subgroup=sg,
        iso_group=grp,  # type: ignore[arg-type]
        hardness_hrc=hrc_val,
        envelope_diameter_mm=env_d,
        envelope_length_mm=env_l,
        ra_min_um=ra_min,
        batch_qty=batch_qty,
        stability=stability,
        include_holders=include_holders,
        features=features,
    )


def analyze_uploaded_drawing(repo: Any, req: DrawingAnalyzeRequest) -> DrawingAnalyzeResponse:
    fname = (req.filename or "drawing.txt").strip()
    ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else "txt"
    raw_bytes = base64.b64decode(req.content_base64) if req.content_base64 else b""

    dxf_summary: Optional[Dict[str, Any]] = None
    cad3d_summary: Optional[Dict[str, Any]] = None
    extracted_text = (req.notes_text or "").strip()
    method = "ESKD_TEXT_PARSER"
    vision_spec: Optional[DrawingSpec] = None
    vision_errors: List[str] = []

    if ext in ("step", "stp") and raw_bytes:
        step_str = raw_bytes.decode("utf-8", errors="ignore")
        cad3d_summary = parse_step_workpiece(step_str, fname)
        vision_spec = _build_spec_from_cad3d(
            cad3d_summary, extracted_text, req.batch_qty, req.stability, req.include_holders
        )
        method = "STEP_3D_CAD_AFR"

    elif ext == "stl" and raw_bytes:
        cad3d_summary = parse_stl_workpiece(raw_bytes, fname)
        vision_spec = _build_spec_from_cad3d(
            cad3d_summary, extracted_text, req.batch_qty, req.stability, req.include_holders
        )
        method = "STL_3D_MESH_AFR"

    elif ext == "dxf" and raw_bytes:
        dxf_str = raw_bytes.decode("utf-8", errors="ignore")
        dxf_summary = parse_dxf_blueprint(dxf_str)
        dxf_txt = "\n".join(dxf_summary.get("texts", []))
        extracted_text = (extracted_text + "\n" + dxf_txt).strip()
        method = "DXF_CAD_GEOMETRY_PARSER"

    elif ext == "pdf" and raw_bytes:
        pdf_txt = extract_pdf_text(raw_bytes)
        if pdf_txt.strip():
            extracted_text = (extracted_text + "\n" + pdf_txt).strip()
            method = "PDF_TEXT_ESKD_PARSER"
        api_key = resolve_vision_api_key(req.gemini_api_key)
        if not pdf_txt.strip() and api_key:
            vision_spec = analyze_blueprint_with_gemini_vision(
                raw_bytes, "application/pdf", api_key, fname, req.batch_qty, req.stability, req.include_holders, error_out=vision_errors
            )
            if vision_spec:
                method = "GEMINI_VISION_AI"

    elif ext in ("png", "jpg", "jpeg", "webp", "bmp") and raw_bytes:
        mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
        api_key = resolve_vision_api_key(req.gemini_api_key)
        if api_key:
            vision_spec = analyze_blueprint_with_gemini_vision(
                raw_bytes, mime, api_key, fname, req.batch_qty, req.stability, req.include_holders, error_out=vision_errors
            )
            if vision_spec:
                method = "GEMINI_VISION_AI"
        if vision_spec is None:
            method = "IMAGE_PREVIEW_AND_TT"

    elif raw_bytes and not extracted_text:
        extracted_text = raw_bytes.decode("utf-8", errors="ignore").strip()

    spec = vision_spec or parse_drawing_annotations(
        text=extracted_text,
        part_name=fname.rsplit(".", 1)[0] if "." in fname else fname,
        dxf_summary=dxf_summary,
        batch_qty=req.batch_qty,
        stability=req.stability,
        include_holders=req.include_holders,
    )
    plan = recommend_tooling_for_blueprint(repo, spec)
    if vision_errors:
        for ve in reversed(vision_errors):
            plan.warnings.insert(0, ve)
    elif method == "IMAGE_PREVIEW_AND_TT" and not extracted_text:
        plan.warnings.insert(
            0,
            "Загружено растровое изображение (JPG/PNG), но GEMINI_API_KEY не настроен на сервере Render и не введён в браузере. "
            "Добавьте GEMINI_API_KEY (AIza... или Vertex AQ....) в Render Environment Variables или впишите размеры с чертежа в поле «Технические требования (ТТ)» ниже.",
        )
    return DrawingAnalyzeResponse(
        detected_format=ext.upper(),
        analysis_method=method,
        extracted_text=extracted_text,
        dxf_summary=dxf_summary,
        cad3d_summary=cad3d_summary,
        plan=plan,
    )


DEMO_BLUEPRINTS: List[Dict[str, Any]] = [
    {
        "id": "demo-shaft-p1",
        "title": "Вал ступенчатый Ø60 (Ст45)",
        "badge": "Токарно-фрезерный · P1",
        "filename": "Val_stupenchatyj_D60_St45.pdf",
        "notes_text": (
            "Деталь: Вал ступенчатый приводной\n"
            "Материал: Сталь 45 ГОСТ 1050 (HB 185)\n"
            "Наружное точение Ø60, длина L=180 мм, чистовая посадка под подшипник Ra 1.6\n"
            "Канавка под стопорное кольцо ширина 3 мм\n"
            "Наружная резьба M20x1.5 на валу\n"
            "Осевое отверстие Ø12 глуб. 40 мм"
        ),
    },
    {
        "id": "demo-flange-m1",
        "title": "Фланец Ø120 (12Х18Н10Т · H7 + M12)",
        "badge": "Нержавейка · M1",
        "filename": "Flanec_D120_12X18H10T.dxf",
        "notes_text": (
            "Деталь: Фланец напорный коррозионностойкий\n"
            "Материал: 12Х18Н10Т (AISI 321)\n"
            "Точение наружного диаметра Ø120, чистовой торец Ra 1.6\n"
            "Точное центральное отверстие Ø20 H7 глуб. 35 мм\n"
            "6 отв. Ø12 сквозные по делительной окружности\n"
            "4 отв. M12 глуб. 24 мм глухие"
        ),
    },
    {
        "id": "demo-housing-n1",
        "title": "Корпус редуктора (Д16Т · фрезеровка)",
        "badge": "Алюминий · N1",
        "filename": "Korpus_D16T_CNC.dxf",
        "notes_text": (
            "Деталь: Корпус приборный фрезерный\n"
            "Материал: Д16Т (алюминий)\n"
            "Фрезерование базовой плоскости и кармана 160x120, Ra 1.6\n"
            "2 отв. Ø10 H7 глуб. 25 мм под штифты\n"
            "8 отв. M8 глуб. 18 мм\n"
            "4 отв. Ø10 сквозные"
        ),
    },
    {
        "id": "demo-bushing-h1",
        "title": "Втулка закалённая (Х12МФ · 54 HRC)",
        "badge": "Закалённая · H1 (CBN)",
        "filename": "Vtulka_X12MF_54HRC.pdf",
        "notes_text": (
            "Деталь: Втулка направляющая прецизионная\n"
            "Материал: Х12МФ, закалка 52-56 HRC\n"
            "Наружное точение Ø50, L=70 мм, чистовое Ra 0.8\n"
            "Внутреннее точное отверстие Ø25 IT6 глуб. 55 мм\n"
            "2 отв. M16 резьбофрезерование"
        ),
    },
]
