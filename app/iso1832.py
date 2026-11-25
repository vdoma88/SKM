"""
ISO 1832 Indexable Insert Code Parser & Pocket Signature Generator.
Supports Turning, Milling, and Axial Drilling standard ISO codes
(e.g. CNMG 120408, CNGA 120408, WNMG 080408, DNMG 150608, VNMG 160404,
CCMT 09T304, DCMT 11T304, APKT 160408, SEKT 120408, RDMT 120400, WCMX 050308, SPMG 090408).
"""

import re
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

SHAPES: Dict[str, Dict[str, Any]] = {
    "C": {"name": "Ромб 80°", "angle_deg": 80, "edges_single": 2, "ic_factor": 1.016},
    "D": {"name": "Ромб 55°", "angle_deg": 55, "edges_single": 2, "ic_factor": 0.819},
    "S": {"name": "Квадрат 90°", "angle_deg": 90, "edges_single": 4, "ic_factor": 1.000},
    "T": {"name": "Треугольник 60°", "angle_deg": 60, "edges_single": 3, "ic_factor": 0.577},
    "V": {"name": "Ромб 35°", "angle_deg": 35, "edges_single": 2, "ic_factor": 0.574},
    "W": {"name": "Тригон 80°", "angle_deg": 80, "edges_single": 3, "ic_factor": 1.464},
    "R": {"name": "Круг", "angle_deg": 360, "edges_single": 6, "ic_factor": 1.000},
    "A": {"name": "Параллелограмм 85°", "angle_deg": 85, "edges_single": 2, "ic_factor": 0.577},
    "P": {"name": "Пятиугольник 108°", "angle_deg": 108, "edges_single": 5, "ic_factor": 1.376},
    "H": {"name": "Шестиугольник 120°", "angle_deg": 120, "edges_single": 6, "ic_factor": 1.732},
    "O": {"name": "Восьмиугольник 135°", "angle_deg": 135, "edges_single": 8, "ic_factor": 2.414},
    "L": {"name": "Прямоугольник 90°", "angle_deg": 90, "edges_single": 2, "ic_factor": 0.600},
    "DRL": {"name": "Осевое сверло (2-зубое)", "angle_deg": 140, "edges_single": 2, "ic_factor": 1.000},
}

CLEARANCE_ANGLES: Dict[str, Dict[str, Any]] = {
    "N": {"deg": 0, "desc": "Негативная (0°), двусторонняя"},
    "A": {"deg": 3, "desc": "Позитивная 3°"},
    "B": {"deg": 5, "desc": "Позитивная 5°"},
    "C": {"deg": 7, "desc": "Позитивная 7°"},
    "P": {"deg": 11, "desc": "Позитивная 11°"},
    "D": {"deg": 15, "desc": "Позитивная 15°"},
    "E": {"deg": 20, "desc": "Позитивная 20°"},
    "F": {"deg": 25, "desc": "Позитивная 25°"},
    "G": {"deg": 30, "desc": "Позитивная 30°"},
    "O": {"deg": 11, "desc": "Специальный позитивный угол (сверлильный/фрезерный)"},
}

TOLERANCES: Dict[str, str] = {
    "M": "Прессованная (стандарт, ±0.05..±0.15 мм)",
    "G": "Шлифованная по периферии (±0.025 мм)",
    "E": "Прецизионная шлифованная (±0.025 мм, S ±0.025)",
    "U": "Черновая прессованная (±0.08..±0.25 мм)",
    "K": "Фрезерная шлифованная (±0.05..±0.15 мм, S ±0.025)",
    "H": "Высокоточная шлифованная (±0.013 мм)",
}

FIXING_TYPES: Dict[str, Dict[str, Any]] = {
    "G": {"desc": "Цилиндрическое отверстие, двусторонний стружколом", "double_sided": True},
    "M": {"desc": "Цилиндрическое отверстие, односторонний стружколом", "double_sided": False},
    "T": {"desc": "Отверстие с зенковкой 40–60°, односторонний стружколом (винт)", "double_sided": False},
    "W": {"desc": "Отверстие с зенковкой 40–60°, без стружколома", "double_sided": False},
    "A": {"desc": "Цилиндрическое отверстие, без стружколома (CBN/керамика)", "double_sided": True},
    "N": {"desc": "Без отверстия, без стружколома (прихват сверху)", "double_sided": True},
    "X": {"desc": "Специальное исполнение (сверлильная/фрезерная геометрия)", "double_sided": False},
}

# Standard IC lookup table by (shape, edge_code) in mm
STANDARD_IC_MM: Dict[tuple, float] = {
    ("C", "06"): 6.350, ("C", "09"): 9.525, ("C", "12"): 12.700, ("C", "16"): 15.875, ("C", "19"): 19.050,
    ("D", "07"): 6.350, ("D", "11"): 9.525, ("D", "15"): 12.700,
    ("S", "07"): 7.938, ("S", "09"): 9.525, ("S", "11"): 11.000, ("S", "12"): 12.700, ("S", "15"): 15.875, ("S", "19"): 19.050,
    ("T", "11"): 6.350, ("T", "16"): 9.525, ("T", "22"): 12.700,
    ("V", "11"): 6.350, ("V", "16"): 9.525,
    ("W", "05"): 7.938, ("W", "06"): 9.525, ("W", "08"): 12.700,
    ("R", "08"): 8.000, ("R", "10"): 10.000, ("R", "12"): 12.000, ("R", "16"): 16.000,
    ("A", "10"): 6.350, ("A", "11"): 6.350, ("A", "16"): 9.525,
}

# Standard thickness code -> mm
THICKNESS_MM: Dict[str, float] = {
    "01": 1.59, "T1": 1.98, "02": 2.38, "03": 3.18, "T3": 3.97,
    "04": 4.76, "05": 5.56, "06": 6.35, "07": 7.94, "09": 9.52,
}

# Standard corner radius code -> mm
RADIUS_MM: Dict[str, float] = {
    "00": 0.0, "02": 0.2, "04": 0.4, "08": 0.8, "12": 1.2,
    "16": 1.6, "20": 2.0, "24": 2.4, "32": 3.2,
    "M0": 0.0,
}


def _round_half_up_x100(value: float) -> int:
    """Matches PostgreSQL ROUND(val * 100)::TEXT (half away from zero)."""
    return int((Decimal(str(value)) * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


class ISO1832Segment(BaseModel):
    position: int
    label: str
    code: str
    meaning: str
    color: str


class ISO1832Parsed(BaseModel):
    raw_code: str
    normalized_code: str
    valid: bool
    error: Optional[str] = None
    shape_code: Optional[str] = None
    shape_name: Optional[str] = None
    clearance_angle_code: Optional[str] = None
    clearance_angle_deg: Optional[float] = None
    tolerance_class: Optional[str] = None
    fixing_type_code: Optional[str] = None
    ic_mm: Optional[float] = None
    cutting_edge_length_mm: Optional[float] = None
    thickness_mm: Optional[float] = None
    corner_radius_mm: Optional[float] = None
    is_double_sided: bool = False
    cutting_edges_count: Optional[int] = None
    suffix: Optional[str] = None
    seat_pocket_signature: Optional[str] = None
    segments: List[ISO1832Segment] = []


def _parse_special_grooving_threading(raw: str, core: str, suffix: Optional[str]) -> Optional[ISO1832Parsed]:
    core_nodash = re.sub(r"[^A-Za-z0-9]", "", raw).upper()
    """Parses standard industry Grooving (MGMN 200/300/400) and Threading (16ER/16IR AG60) codes."""
    # Grooving / Parting: e.g. MGMN 300, MGMN 200, MGMN 400
    m_grv = re.match(r"^MGMN(\d{3})", core)
    if m_grv:
        w_code = m_grv.group(1)
        w_mm = round(int(w_code) / 100.0, 2)
        pocket = f"L-N-{_round_half_up_x100(w_mm)}-476-N"
        return ISO1832Parsed(
            raw_code=raw,
            normalized_code=core,
            valid=True,
            shape_code="L",
            shape_name=f"Отрезная / канавочная (w={w_mm} мм)",
            clearance_angle_code="N",
            clearance_angle_deg=0.0,
            tolerance_class="M",
            fixing_type_code="N",
            ic_mm=w_mm,
            cutting_edge_length_mm=21.0,
            thickness_mm=4.76,
            corner_radius_mm=0.2,
            is_double_sided=True,
            cutting_edges_count=2,
            suffix=suffix,
            seat_pocket_signature=pocket,
            segments=[
                ISO1832Segment(position=1, label="Серия", code="MG", meaning="Канавочная / отрезная (2 кромки)", color="#38BDF8"),
                ISO1832Segment(position=2, label="Угол в плане", code="M", meaning="Нейтральная (0°)", color="#A78BFA"),
                ISO1832Segment(position=3, label="Тип", code="N", meaning="Двухсторонняя без отверстия (прижим)", color="#FBBF24"),
                ISO1832Segment(position=4, label="Ширина (W)", code=w_code, meaning=f"{w_mm} мм", color="#FB7185"),
                ISO1832Segment(position=5, label="Длина (L)", code="21", meaning="21.0 мм", color="#F97316"),
                ISO1832Segment(position=6, label="Радиус (RE)", code="02", meaning="0.2 мм (при вершине)", color="#2DD4BF"),
            ],
        )

    # ISO Laydown Threading: e.g. 16ER AG60, 16IR AG60, 16ER 2.0ISO
    m_thr = re.match(r"^(11|16|22)(E|I)(R|L)([A-Z0-9\.]+)?$", core)
    if m_thr:
        size_code, ext_int, hand, pitch = m_thr.groups()
        ic_map = {"11": 6.350, "16": 9.525, "22": 12.700}
        thk_map = {"11": 3.18, "16": 3.97, "22": 4.76}
        ic_mm = ic_map[size_code]
        thk_mm = thk_map[size_code]
        pitch_label = pitch or "AG60"
        pocket = f"T-N-{_round_half_up_x100(ic_mm)}-{_round_half_up_x100(thk_mm)}-T"
        return ISO1832Parsed(
            raw_code=raw,
            normalized_code=core,
            valid=True,
            shape_code="T",
            shape_name=f"Резьбовая треугольная 60° ({'наруж.' if ext_int == 'E' else 'внутр.'})",
            clearance_angle_code="N",
            clearance_angle_deg=0.0,
            tolerance_class="M",
            fixing_type_code="T",
            ic_mm=ic_mm,
            cutting_edge_length_mm=float(size_code),
            thickness_mm=thk_mm,
            corner_radius_mm=0.1,
            is_double_sided=False,
            cutting_edges_count=3,
            suffix=pitch_label,
            seat_pocket_signature=pocket,
            segments=[
                ISO1832Segment(position=1, label="Размер (L / IC)", code=size_code, meaning=f"L={size_code} мм, IC={ic_mm} мм", color="#38BDF8"),
                ISO1832Segment(position=2, label="Резьба", code=ext_int, meaning="Наружная" if ext_int == "E" else "Внутренняя", color="#A78BFA"),
                ISO1832Segment(position=3, label="Направление", code=hand, meaning="Правая" if hand == "R" else "Левая", color="#34D399"),
                ISO1832Segment(position=4, label="Профиль / Шаг", code=pitch_label, meaning="60° неполный профиль (0.5–3.0 мм)" if "AG60" in pitch_label else f"Профиль {pitch_label}", color="#FBBF24"),
                ISO1832Segment(position=5, label="Толщина (S)", code="T3" if size_code == "16" else "04", meaning=f"{thk_mm} мм", color="#F97316"),
                ISO1832Segment(position=6, label="Кромок", code="3", meaning="3 режущие вершины", color="#2DD4BF"),
            ],
        )

    # Modular Exchangeable-Tip Drill Crown: e.g. MOD-DRL-140, MOD-DRL-200
    m_mod = re.match(r"^MODDRL(\d{3})$", core_nodash)
    if m_mod:
        dc_mm = round(int(m_mod.group(1)) / 10.0, 2)
        thk_mm = round(dc_mm * 0.48, 2)
        pocket = f"DRL-M-{_round_half_up_x100(dc_mm)}-{_round_half_up_x100(thk_mm)}-B"
        return ISO1832Parsed(
            raw_code=raw,
            normalized_code=core_nodash,
            valid=True,
            shape_code="DRL",
            shape_name=f"Сменная твердосплавная коронка Ø{dc_mm:g} мм (140°)",
            clearance_angle_code="P",
            clearance_angle_deg=11.0,
            tolerance_class="G",
            fixing_type_code="X",
            ic_mm=dc_mm,
            cutting_edge_length_mm=round(dc_mm * 0.52, 2),
            thickness_mm=thk_mm,
            corner_radius_mm=0.2,
            is_double_sided=False,
            cutting_edges_count=2,
            suffix=suffix,
            seat_pocket_signature=pocket,
            segments=[
                ISO1832Segment(position=1, label="Тип", code="MOD", meaning="Модульное сверло (сменная коронка)", color="#38BDF8"),
                ISO1832Segment(position=2, label="Группа", code="DRL", meaning="Осевое сверление (IT9–IT10)", color="#A78BFA"),
                ISO1832Segment(position=3, label="Диаметр (DC)", code=m_mod.group(1), meaning=f"Ø{dc_mm:g} мм", color="#FB7185"),
                ISO1832Segment(position=4, label="Угол при верш.", code="140°", meaning="Самоцентрирующая подточка перемычки", color="#34D399"),
                ISO1832Segment(position=5, label="Крепление", code="BAY", meaning="Байонетный замок без снятия корпуса", color="#FBBF24"),
                ISO1832Segment(position=6, label="Кромок / СОЖ", code="2 / IC", meaning="2 кромки, внутренний подвод СОЖ", color="#2DD4BF"),
            ],
        )

    # Solid Carbide Internal-Coolant Drill: e.g. SC-DRL-080-5D, SC-DRL-120-8D, SC-DRL-100-AL, SC-DRL-060-H
    m_sc = re.match(r"^SCDRL(\d{3})(3D|5D|8D|AL|H)?$", core_nodash)
    if m_sc:
        dc_mm = round(int(m_sc.group(1)) / 10.0, 2)
        tag = m_sc.group(2) or "5D"
        ld_val = 8.0 if tag == "8D" else (3.0 if tag == "3D" else 5.0)
        point_deg = 130.0 if tag == "AL" else 140.0
        flute_len = round(dc_mm * (ld_val + 1.2), 1)
        pocket = f"DRL-S-{_round_half_up_x100(dc_mm)}-{int(ld_val * 100)}-I"
        return ISO1832Parsed(
            raw_code=raw,
            normalized_code=core_nodash,
            valid=True,
            shape_code="DRL",
            shape_name=f"Монолитное ЦТ-сверло Ø{dc_mm:g} мм ({int(ld_val)}xD, {int(point_deg)}°)",
            clearance_angle_code="P",
            clearance_angle_deg=11.0,
            tolerance_class="H",
            fixing_type_code="N",
            ic_mm=dc_mm,
            cutting_edge_length_mm=flute_len,
            thickness_mm=round(dc_mm * 1.4, 2),
            corner_radius_mm=0.1,
            is_double_sided=False,
            cutting_edges_count=2,
            suffix=tag,
            seat_pocket_signature=pocket,
            segments=[
                ISO1832Segment(position=1, label="Исполнение", code="SC", meaning="Цельнотвердосплавное (монолит, IT8)", color="#38BDF8"),
                ISO1832Segment(position=2, label="Назначение", code="DRL", meaning="Сверление с внутр. СОЖ (2 канала)", color="#A78BFA"),
                ISO1832Segment(position=3, label="Диаметр (DC)", code=m_sc.group(1), meaning=f"Ø{dc_mm:g} мм (допуск m7)", color="#FB7185"),
                ISO1832Segment(position=4, label="Глубина / Серия", code=tag, meaning=f"До {int(ld_val)}xD (Lраб≈{flute_len} мм)", color="#FBBF24"),
                ISO1832Segment(position=5, label="Угол при верш.", code=f"{int(point_deg)}°", meaning="Полированная алюминиевая" if tag == "AL" else "Усиленная кромка (S-перемычка)", color="#34D399"),
                ISO1832Segment(position=6, label="Хвостовик", code="DIN6535", meaning="Цилиндрический HA под гидро/термопатрон", color="#2DD4BF"),
            ],
        )

    return None


def parse_iso1832(code: str) -> ISO1832Parsed:
    raw = (code or "").strip()
    cleaned = re.sub(r"[^A-Za-z0-9\-]", "", raw).upper()
    parts = cleaned.split("-", 1)
    core = parts[0]
    suffix = parts[1] if len(parts) > 1 and parts[1] else None

    special = _parse_special_grooving_threading(raw, core, suffix)
    if special is not None:
        return special

    if len(core) < 10:
        return ISO1832Parsed(
            raw_code=raw,
            normalized_code=core,
            valid=False,
            error="Код ISO 1832 должен содержать минимум 10 символов (например, CNMG 120408).",
        )

    s1_shape = core[0]
    s2_clear = core[1]
    s3_tol = core[2]
    s4_fix = core[3]
    s5_len = core[4:6]
    s6_thk = core[6:8]
    s7_rad = core[8:10]
    extra = core[10:]
    if extra and not suffix:
        suffix = extra

    if s1_shape not in SHAPES:
        return ISO1832Parsed(raw_code=raw, normalized_code=core, valid=False, error=f"Неизвестная форма пластины: '{s1_shape}'")
    if s2_clear not in CLEARANCE_ANGLES:
        return ISO1832Parsed(raw_code=raw, normalized_code=core, valid=False, error=f"Неизвестный задний угол: '{s2_clear}'")
    if s3_tol not in TOLERANCES:
        return ISO1832Parsed(raw_code=raw, normalized_code=core, valid=False, error=f"Неизвестный класс допуска: '{s3_tol}'")
    if s4_fix not in FIXING_TYPES:
        return ISO1832Parsed(raw_code=raw, normalized_code=core, valid=False, error=f"Неизвестный тип крепления: '{s4_fix}'")
    if s6_thk not in THICKNESS_MM:
        return ISO1832Parsed(raw_code=raw, normalized_code=core, valid=False, error=f"Неизвестный код толщины: '{s6_thk}'")

    shape_info = SHAPES[s1_shape]
    clear_info = CLEARANCE_ANGLES[s2_clear]
    fix_info = FIXING_TYPES[s4_fix]

    try:
        edge_len_mm = float(s5_len)
    except ValueError:
        return ISO1832Parsed(raw_code=raw, normalized_code=core, valid=False, error=f"Некорректный код длины кромки: '{s5_len}'")

    ic_mm = STANDARD_IC_MM.get((s1_shape, s5_len), round(edge_len_mm * shape_info["ic_factor"], 3))
    thickness_mm = THICKNESS_MM[s6_thk]

    if s1_shape == "R" and s7_rad in ("00", "M0"):
        radius_mm = round(ic_mm / 2.0, 2)
    elif s7_rad in RADIUS_MM:
        radius_mm = RADIUS_MM[s7_rad]
    else:
        try:
            radius_mm = round(int(s7_rad) / 10.0, 2)
        except ValueError:
            radius_mm = 0.0

    is_double = (s2_clear == "N") and fix_info["double_sided"]
    edges = shape_info["edges_single"] * (2 if is_double else 1)

    pocket_sig = (
        f"{s1_shape}-{s2_clear}-"
        f"{_round_half_up_x100(ic_mm)}-"
        f"{_round_half_up_x100(thickness_mm)}-"
        f"{s4_fix}"
    )

    segments = [
        ISO1832Segment(position=1, label="Форма", code=s1_shape, meaning=shape_info["name"], color="#38BDF8"),
        ISO1832Segment(position=2, label="Задний угол", code=s2_clear, meaning=f"{clear_info['deg']}° ({clear_info['desc']})", color="#A78BFA"),
        ISO1832Segment(position=3, label="Допуск", code=s3_tol, meaning=TOLERANCES[s3_tol], color="#34D399"),
        ISO1832Segment(position=4, label="Крепление", code=s4_fix, meaning=fix_info["desc"], color="#FBBF24"),
        ISO1832Segment(position=5, label="Размер (L / IC)", code=s5_len, meaning=f"L≈{edge_len_mm:g} мм, IC={ic_mm} мм", color="#FB7185"),
        ISO1832Segment(position=6, label="Толщина (S)", code=s6_thk, meaning=f"{thickness_mm} мм", color="#F97316"),
        ISO1832Segment(position=7, label="Радиус (RE)", code=s7_rad, meaning=f"{radius_mm} мм", color="#2DD4BF"),
    ]

    return ISO1832Parsed(
        raw_code=raw,
        normalized_code=core,
        valid=True,
        shape_code=s1_shape,
        shape_name=shape_info["name"],
        clearance_angle_code=s2_clear,
        clearance_angle_deg=clear_info["deg"],
        tolerance_class=s3_tol,
        fixing_type_code=s4_fix,
        ic_mm=ic_mm,
        cutting_edge_length_mm=edge_len_mm,
        thickness_mm=thickness_mm,
        corner_radius_mm=radius_mm,
        is_double_sided=is_double,
        cutting_edges_count=edges,
        suffix=suffix,
        seat_pocket_signature=pocket_sig,
        segments=segments,
    )
