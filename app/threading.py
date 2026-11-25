"""
Threading (M, MF, G/BSPP, NPT), Tapping (Cutting & Forming), Helical Thread Milling,
and ISO 286 H7 Hole-Finishing (Reaming & Micrometric Fine Boring) Engineering Engine.
All units are metric SI (mm, m/min, mm/rev, mm/min, Nm, um).
"""

from __future__ import annotations

import math
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# Standard thread database: designation -> spec
# cut_drill_mm: standard pre-drill for cutting tap (~75% thread height)
# form_drill_mm: standard pre-drill for roll/forming tap (~65-70% engagement)
THREAD_STANDARDS: List[Dict[str, object]] = [
    # Metric Coarse (ISO 261 / ГОСТ 24705)
    {"code": "M3",      "family": "M",   "major_mm": 3.000,  "pitch_mm": 0.500, "tpi": None,  "cut_drill_mm": 2.50,  "form_drill_mm": 2.75,  "angle_deg": 60},
    {"code": "M4",      "family": "M",   "major_mm": 4.000,  "pitch_mm": 0.700, "tpi": None,  "cut_drill_mm": 3.30,  "form_drill_mm": 3.68,  "angle_deg": 60},
    {"code": "M5",      "family": "M",   "major_mm": 5.000,  "pitch_mm": 0.800, "tpi": None,  "cut_drill_mm": 4.20,  "form_drill_mm": 4.62,  "angle_deg": 60},
    {"code": "M6",      "family": "M",   "major_mm": 6.000,  "pitch_mm": 1.000, "tpi": None,  "cut_drill_mm": 5.00,  "form_drill_mm": 5.53,  "angle_deg": 60},
    {"code": "M8",      "family": "M",   "major_mm": 8.000,  "pitch_mm": 1.250, "tpi": None,  "cut_drill_mm": 6.80,  "form_drill_mm": 7.42,  "angle_deg": 60},
    {"code": "M10",     "family": "M",   "major_mm": 10.000, "pitch_mm": 1.500, "tpi": None,  "cut_drill_mm": 8.50,  "form_drill_mm": 9.30,  "angle_deg": 60},
    {"code": "M12",     "family": "M",   "major_mm": 12.000, "pitch_mm": 1.750, "tpi": None,  "cut_drill_mm": 10.20, "form_drill_mm": 11.18, "angle_deg": 60},
    {"code": "M14",     "family": "M",   "major_mm": 14.000, "pitch_mm": 2.000, "tpi": None,  "cut_drill_mm": 12.00, "form_drill_mm": 13.06, "angle_deg": 60},
    {"code": "M16",     "family": "M",   "major_mm": 16.000, "pitch_mm": 2.000, "tpi": None,  "cut_drill_mm": 14.00, "form_drill_mm": 15.06, "angle_deg": 60},
    {"code": "M20",     "family": "M",   "major_mm": 20.000, "pitch_mm": 2.500, "tpi": None,  "cut_drill_mm": 17.50, "form_drill_mm": 18.83, "angle_deg": 60},
    {"code": "M24",     "family": "M",   "major_mm": 24.000, "pitch_mm": 3.000, "tpi": None,  "cut_drill_mm": 21.00, "form_drill_mm": 22.60, "angle_deg": 60},
    {"code": "M30",     "family": "M",   "major_mm": 30.000, "pitch_mm": 3.500, "tpi": None,  "cut_drill_mm": 26.50, "form_drill_mm": 28.35, "angle_deg": 60},
    # Metric Fine (MF)
    {"code": "M8x1",    "family": "MF",  "major_mm": 8.000,  "pitch_mm": 1.000, "tpi": None,  "cut_drill_mm": 7.00,  "form_drill_mm": 7.53,  "angle_deg": 60},
    {"code": "M10x1",   "family": "MF",  "major_mm": 10.000, "pitch_mm": 1.000, "tpi": None,  "cut_drill_mm": 9.00,  "form_drill_mm": 9.53,  "angle_deg": 60},
    {"code": "M10x1.25","family": "MF",  "major_mm": 10.000, "pitch_mm": 1.250, "tpi": None,  "cut_drill_mm": 8.80,  "form_drill_mm": 9.42,  "angle_deg": 60},
    {"code": "M12x1.25","family": "MF",  "major_mm": 12.000, "pitch_mm": 1.250, "tpi": None,  "cut_drill_mm": 10.80, "form_drill_mm": 11.42, "angle_deg": 60},
    {"code": "M12x1.5", "family": "MF",  "major_mm": 12.000, "pitch_mm": 1.500, "tpi": None,  "cut_drill_mm": 10.50, "form_drill_mm": 11.30, "angle_deg": 60},
    {"code": "M16x1.5", "family": "MF",  "major_mm": 16.000, "pitch_mm": 1.500, "tpi": None,  "cut_drill_mm": 14.50, "form_drill_mm": 15.30, "angle_deg": 60},
    {"code": "M20x1.5", "family": "MF",  "major_mm": 20.000, "pitch_mm": 1.500, "tpi": None,  "cut_drill_mm": 18.50, "form_drill_mm": 19.30, "angle_deg": 60},
    {"code": "M24x1.5", "family": "MF",  "major_mm": 24.000, "pitch_mm": 1.500, "tpi": None,  "cut_drill_mm": 22.50, "form_drill_mm": 23.30, "angle_deg": 60},
    # BSPP Cylindrical Pipe (G, ISO 228, 55°)
    {"code": "G1/8",    "family": "G",   "major_mm": 9.728,  "pitch_mm": 0.907, "tpi": 28.0,  "cut_drill_mm": 8.80,  "form_drill_mm": 9.25,  "angle_deg": 55},
    {"code": "G1/4",    "family": "G",   "major_mm": 13.157, "pitch_mm": 1.337, "tpi": 19.0,  "cut_drill_mm": 11.80, "form_drill_mm": 12.45, "angle_deg": 55},
    {"code": "G3/8",    "family": "G",   "major_mm": 16.662, "pitch_mm": 1.337, "tpi": 19.0,  "cut_drill_mm": 15.25, "form_drill_mm": 15.95, "angle_deg": 55},
    {"code": "G1/2",    "family": "G",   "major_mm": 20.955, "pitch_mm": 1.814, "tpi": 14.0,  "cut_drill_mm": 19.00, "form_drill_mm": 20.00, "angle_deg": 55},
    {"code": "G3/4",    "family": "G",   "major_mm": 26.441, "pitch_mm": 1.814, "tpi": 14.0,  "cut_drill_mm": 24.50, "form_drill_mm": 25.50, "angle_deg": 55},
    {"code": "G1",      "family": "G",   "major_mm": 33.249, "pitch_mm": 2.309, "tpi": 11.0,  "cut_drill_mm": 30.75, "form_drill_mm": 32.00, "angle_deg": 55},
    # Tapered Pipe (NPT, ASME B1.20.1, 60°)
    {"code": "NPT 1/8", "family": "NPT", "major_mm": 10.287, "pitch_mm": 0.941, "tpi": 27.0,  "cut_drill_mm": 8.50,  "form_drill_mm": None,  "angle_deg": 60},
    {"code": "NPT 1/4", "family": "NPT", "major_mm": 13.716, "pitch_mm": 1.411, "tpi": 18.0,  "cut_drill_mm": 11.10, "form_drill_mm": None,  "angle_deg": 60},
    {"code": "NPT 3/8", "family": "NPT", "major_mm": 17.145, "pitch_mm": 1.411, "tpi": 18.0,  "cut_drill_mm": 14.50, "form_drill_mm": None,  "angle_deg": 60},
    {"code": "NPT 1/2", "family": "NPT", "major_mm": 21.336, "pitch_mm": 1.814, "tpi": 14.0,  "cut_drill_mm": 17.80, "form_drill_mm": None,  "angle_deg": 60},
    {"code": "NPT 3/4", "family": "NPT", "major_mm": 26.670, "pitch_mm": 1.814, "tpi": 14.0,  "cut_drill_mm": 23.00, "form_drill_mm": None,  "angle_deg": 60},
    {"code": "NPT 1",   "family": "NPT", "major_mm": 33.401, "pitch_mm": 2.209, "tpi": 11.5,  "cut_drill_mm": 29.00, "form_drill_mm": None,  "angle_deg": 60},
]

THREAD_BY_CODE: Dict[str, Dict[str, object]] = {str(t["code"]).upper(): t for t in THREAD_STANDARDS}

# ISO 286 H7 upper deviation (EI = 0, ES in um)
ISO_H7_BANDS = [
    (3.0,   10),
    (6.0,   12),
    (10.0,  15),
    (18.0,  18),
    (30.0,  21),
    (50.0,  25),
    (80.0,  30),
    (120.0, 35),
    (180.0, 40),
    (250.0, 46),
]

TAPPING_VC_BY_GROUP = {
    "P": {"CUT_TAP": 16.0, "FORM_TAP": 24.0, "THREAD_MILL": 110.0},
    "M": {"CUT_TAP": 9.0,  "FORM_TAP": 14.0, "THREAD_MILL": 65.0},
    "K": {"CUT_TAP": 20.0, "FORM_TAP": 0.0,  "THREAD_MILL": 125.0},
    "N": {"CUT_TAP": 32.0, "FORM_TAP": 45.0, "THREAD_MILL": 240.0},
    "S": {"CUT_TAP": 5.0,  "FORM_TAP": 0.0,  "THREAD_MILL": 35.0},
    "H": {"CUT_TAP": 4.0,  "FORM_TAP": 0.0,  "THREAD_MILL": 45.0},
}


class ThreadCalcInput(BaseModel):
    thread_code: str = "M12"
    iso_group: Literal["P", "M", "K", "N", "S", "H"] = "P"
    kc1_1_mpa: float = Field(1500.0, gt=0)
    hole_type: Literal["BLIND", "THROUGH"] = "BLIND"
    method: Literal["CUT_TAP", "FORM_TAP", "THREAD_MILL"] = "CUT_TAP"
    thread_depth_mm: float = Field(20.0, gt=0)
    mill_cutter_dc_mm: Optional[float] = Field(None, gt=0)
    mill_flutes: int = Field(4, ge=1, le=12)
    mill_fz_mm: float = Field(0.05, gt=0)
    radial_passes: int = Field(1, ge=1, le=5)


class ThreadCalcResult(BaseModel):
    thread_code: str
    family: str
    major_mm: float
    pitch_mm: float
    tpi: Optional[float] = None
    angle_deg: int
    method: str
    hole_type: str
    pre_drill_mm: float
    min_drill_depth_mm: float
    recommended_tool_type: str
    vc_m_min: float
    rpm: float
    feed_mm_rev: float
    vf_mm_min: float
    vf_centerline_mm_min: Optional[float] = None
    estimated_torque_nm: float
    recommended_cycle: str
    coolant_advice: str
    warnings: List[str] = []


class HoleFinishInput(BaseModel):
    target_diameter_mm: float = Field(20.0, gt=2.0, le=250.0)
    tolerance_grade: Literal["H7", "H8", "IT6"] = "H7"
    hole_depth_mm: float = Field(45.0, gt=0)
    iso_group: Literal["P", "M", "K", "N", "S", "H"] = "P"
    kc1_1_mpa: float = Field(1500.0, gt=0)
    method: Literal["REAMING", "FINE_BORING"] = "REAMING"


class HoleFinishResult(BaseModel):
    target_diameter_mm: float
    tolerance_grade: str
    upper_dev_um: float
    lower_dev_um: float
    pre_drill_min_mm: float
    pre_drill_max_mm: float
    pre_drill_opt_mm: float
    radial_allowance_mm: float
    vc_m_min: float
    rpm: float
    feed_mm_rev: float
    vf_mm_min: float
    expected_ra_um: float
    ld_ratio: float
    recommended_tool_code: str
    holder_advice: str
    recommended_cycle: str
    warnings: List[str] = []


def list_thread_standards() -> List[Dict[str, object]]:
    return THREAD_STANDARDS


def calculate_threading(inp: ThreadCalcInput) -> ThreadCalcResult:
    key = inp.thread_code.strip().upper()
    spec = THREAD_BY_CODE.get(key)
    if not spec:
        raise ValueError(f"Неизвестная резьба '{inp.thread_code}'. Доступны: M3..M30, MF, G1/8..G1, NPT 1/8..NPT 1.")

    major = float(spec["major_mm"])
    pitch = float(spec["pitch_mm"])
    tpi = float(spec["tpi"]) if spec["tpi"] is not None else None
    family = str(spec["family"])
    angle_deg = int(spec["angle_deg"])
    warnings: List[str] = []

    method = inp.method
    if method == "FORM_TAP":
        if inp.iso_group in ("K", "H", "S"):
            warnings.append(
                f"Раскатник (бесстружечный метчик) не рекомендуется для хрупких/жаропрочных материалов группы {inp.iso_group} — перейдите на режущий метчик или резьбофрезу."
            )
        if spec["form_drill_mm"] is None:
            warnings.append(f"Для конической резьбы {spec['code']} раскатники не применяются — используйте режущий метчик или резьбофрезу.")
        pre_drill = float(spec["form_drill_mm"] or spec["cut_drill_mm"])
    else:
        pre_drill = float(spec["cut_drill_mm"])

    vc = TAPPING_VC_BY_GROUP[inp.iso_group].get(method, 12.0)
    if vc <= 0:
        vc = 12.0

    # Extra depth for chip lead-in on blind holes
    lead_allowance = (pitch * 3.5) if (inp.hole_type == "BLIND" and method != "THREAD_MILL") else (pitch * 1.5)
    min_drill_depth = round(inp.thread_depth_mm + lead_allowance, 1)
    ld_thread = inp.thread_depth_mm / major
    if ld_thread > 2.5 and method != "THREAD_MILL":
        warnings.append(f"Глубокая резьба ({ld_thread:.1f}xD): высокий риск поломки метчика — рассмотрите резьбофрезерование или эмульсию 10%.")

    vf_center: Optional[float] = None
    if method == "CUT_TAP":
        rpm = round((1000.0 * vc) / (math.pi * major), 0)
        feed_rev = pitch
        vf = round(rpm * pitch, 1)
        # Empirical tapping torque M (Nm) ~= kc1.1 * D * P^1.8 / 28000
        torque_nm = round((inp.kc1_1_mpa * major * (pitch ** 1.8)) / 28000.0, 2)
        if inp.hole_type == "BLIND":
            tool_rec = f"Спиральный метчик 40° ({spec['code']}, отвод стружки вверх)"
        else:
            tool_rec = f"Метчик с винтовой подточкой ({spec['code']}, стружка вперёд)"
        cycle = "G84 (жёсткое нарезание M29 S..)"
        coolant = "Эмульсия 8–10% или масло для нарезания резьбы"
    elif method == "FORM_TAP":
        rpm = round((1000.0 * vc) / (math.pi * major), 0)
        feed_rev = pitch
        vf = round(rpm * pitch, 1)
        torque_nm = round((inp.kc1_1_mpa * major * (pitch ** 1.8)) / 21000.0, 2)
        tool_rec = f"Раскатник (бесстружечный метчик) {spec['code']} с масляными канавками"
        cycle = "G84 (жёсткое, контроль отверстия ±0.03 мм!)"
        coolant = "Высококонцентрированная эмульсия ≥ 10% или чистое масло (обязательно)"
        warnings.append(f"Критично для раскатника: диаметр отверстия должен быть строго Ø{pre_drill:.2f} ±0.03 мм!")
    else:  # THREAD_MILL (Helical Interpolation)
        dc_mill = inp.mill_cutter_dc_mm or round(min(pre_drill * 0.72, major - 2.2 * pitch), 1)
        dc_mill = max(2.0, min(dc_mill, pre_drill - 0.6))
        rpm = round((1000.0 * vc) / (math.pi * dc_mill), 0)
        vf_periph = inp.mill_fz_mm * inp.mill_flutes * rpm
        # Internal helical interpolation centerline feed compensation!
        vf_center = round(vf_periph * ((major - dc_mill) / major), 1)
        vf = round(vf_periph, 1)
        feed_rev = round(inp.mill_fz_mm * inp.mill_flutes, 3)
        # Milling cutting torque is dramatically lower than tapping
        torque_nm = round((inp.kc1_1_mpa * pitch * inp.mill_fz_mm * (dc_mill / 2.0)) / (2500.0 * inp.radial_passes), 2)
        tool_rec = f"Цельнотвердосплавная резьбофреза Ø{dc_mill:.1f} мм (шаг {pitch:g} мм, Z={inp.mill_flutes})"
        cycle = f"G02/G03 винтовая интерполяция (Z={pitch:g}/об, проходов: {inp.radial_passes})"
        coolant = "Внутренний СОЖ или обильный полив (попутное фрезерование снизу вверх)"
        if inp.iso_group in ("H", "S") and inp.radial_passes < 2:
            warnings.append(f"Для группы {inp.iso_group} рекомендуется минимум 2–3 радиальных прохода резьбофрезой.")

    return ThreadCalcResult(
        thread_code=str(spec["code"]),
        family=family,
        major_mm=major,
        pitch_mm=pitch,
        tpi=tpi,
        angle_deg=angle_deg,
        method=method,
        hole_type=inp.hole_type,
        pre_drill_mm=pre_drill,
        min_drill_depth_mm=min_drill_depth,
        recommended_tool_type=tool_rec,
        vc_m_min=vc,
        rpm=rpm,
        feed_mm_rev=feed_rev,
        vf_mm_min=vf,
        vf_centerline_mm_min=vf_center,
        estimated_torque_nm=torque_nm,
        recommended_cycle=cycle,
        coolant_advice=coolant,
        warnings=warnings,
    )


def _lookup_h7_um(diam_mm: float) -> float:
    for upper, es in ISO_H7_BANDS:
        if diam_mm <= upper:
            return float(es)
    return 52.0


def calculate_hole_finishing(inp: HoleFinishInput) -> HoleFinishResult:
    es_h7 = _lookup_h7_um(inp.target_diameter_mm)
    mult = {"IT6": 0.65, "H7": 1.0, "H8": 1.55}[inp.tolerance_grade]
    upper_um = round(es_h7 * mult, 1)
    ld = round(inp.hole_depth_mm / inp.target_diameter_mm, 2)
    warnings: List[str] = []

    if inp.method == "REAMING":
        # Diametral stock allowance for carbide reamers (ISO recommendations)
        if inp.target_diameter_mm <= 6.0:
            allow_d = 0.12
        elif inp.target_diameter_mm <= 16.0:
            allow_d = 0.20
        elif inp.target_diameter_mm <= 32.0:
            allow_d = 0.25
        else:
            allow_d = 0.35
        pre_opt = round(inp.target_diameter_mm - allow_d, 2)
        pre_min = round(pre_opt - 0.05, 2)
        pre_max = round(pre_opt + 0.05, 2)
        vc_map = {"P": 95.0, "M": 55.0, "K": 110.0, "N": 180.0, "S": 28.0, "H": 32.0}
        vc = vc_map[inp.iso_group]
        rpm = round((1000.0 * vc) / (math.pi * inp.target_diameter_mm), 0)
        z_teeth = 6 if inp.target_diameter_mm <= 16.0 else 8
        fz = 0.06 if inp.iso_group in ("P", "K", "N") else 0.04
        feed_rev = round(fz * z_teeth, 2)
        vf = round(rpm * feed_rev, 1)
        ra = 0.8 if inp.iso_group != "M" else 1.1
        tool_code = f"REAM-H7-{int(round(inp.target_diameter_mm * 10)):03d}"
        holder = "Гидропатрон / термопатрон (биение ≤ 0.005 мм) или плавающий патрон"
        cycle = "G85 (рабочая подача на входе И на выходе! Без остановки шпинделя)"
        if ld > 5.0:
            warnings.append(f"Высокий вылет L/D={ld}xD для развёртки — требуется предварительное растачивание для исправления оси отверстия.")
    else:  # FINE_BORING (Micrometric Boring Head)
        allow_d = 0.40 if inp.target_diameter_mm <= 30.0 else 0.60
        pre_opt = round(inp.target_diameter_mm - allow_d, 2)
        pre_min = round(pre_opt - 0.10, 2)
        pre_max = round(pre_opt + 0.10, 2)
        vc_map = {"P": 210.0, "M": 135.0, "K": 240.0, "N": 450.0, "S": 48.0, "H": 130.0}
        vc = vc_map[inp.iso_group]
        rpm = round((1000.0 * vc) / (math.pi * inp.target_diameter_mm), 0)
        feed_rev = 0.07 if inp.tolerance_grade == "IT6" else 0.10
        vf = round(rpm * feed_rev, 1)
        # Theoretical Ra for RE=0.4mm boring insert
        ra = round(((feed_rev ** 2) / (32.0 * 0.4)) * 1000.0, 2)
        tool_code = f"FBORE-MIC-{int(round(inp.target_diameter_mm)):02d}"
        holder = "Микрометрическая чистовая расточная головка (цена деления 0.002 мм на Ø)"
        cycle = "G76 (ориентация шпинделя M19 + отвод резца на Q0.2 мм перед выходом)"
        if ld > 4.0 and ld <= 6.5:
            warnings.append(f"L/D={ld}xD: используйте твёрдосплавную расточную оправку для исключения дробления.")
        elif ld > 6.5:
            warnings.append(f"L/D={ld}xD > 6.5: требуется антивибрационная демпфированная расточная оправка!")

    return HoleFinishResult(
        target_diameter_mm=inp.target_diameter_mm,
        tolerance_grade=inp.tolerance_grade,
        upper_dev_um=upper_um,
        lower_dev_um=0.0,
        pre_drill_min_mm=pre_min,
        pre_drill_max_mm=pre_max,
        pre_drill_opt_mm=pre_opt,
        radial_allowance_mm=round(allow_d / 2.0, 3),
        vc_m_min=vc,
        rpm=rpm,
        feed_mm_rev=feed_rev,
        vf_mm_min=vf,
        expected_ra_um=ra,
        ld_ratio=ld,
        recommended_tool_code=tool_code,
        holder_advice=holder,
        recommended_cycle=cycle,
        warnings=warnings,
    )
