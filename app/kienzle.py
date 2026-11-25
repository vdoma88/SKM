"""
Kienzle Cutting Physics Engine, Surface Roughness (Ra), Beam Deflection (L/D),
Axial Drilling Thrust / Coolant / G-Code Cycle Engine, and Chipbreaker Polygon Checker.
Supports Turning, Milling (with radial chip thinning), Axial Tooling (U-Drills, Modular
Crowns, Solid Carbide Drills), and Grooving/Threading.
All internal units are strictly SI / Metric (mm, m/min, MPa, N, kW, Nm, cm3/min, um, bar).
"""

import math
from typing import List, Optional, Literal
from pydantic import BaseModel, Field

SHANK_ELASTIC_MODULUS_MPA = {
    "STEEL": 210_000.0,
    "CARBIDE": 580_000.0,
    "DAMPED": 210_000.0,
}

SHANK_SAFE_LD_LIMIT = {
    "STEEL": 4.0,
    "CARBIDE": 6.5,
    "DAMPED": 10.0,
}


class CuttingCalcInput(BaseModel):
    operation_domain: Literal["TURNING", "MILLING", "DRILLING", "GROOVING_THREADING"]
    kc1_1_mpa: float = Field(..., gt=0)
    mc_exponent: float = Field(..., gt=0, lt=1)
    vc_m_min: float = Field(..., gt=0)
    feed_mm: float = Field(..., gt=0)           # fn (mm/rev) for turning/drilling, fz (mm/tooth) for milling
    ap_mm: float = Field(0.0, ge=0)             # axial depth of cut (ignored for drilling)
    ae_mm: Optional[float] = Field(None, gt=0)  # radial width of cut (milling)
    diameter_mm: float = Field(50.0, gt=0)      # workpiece D (turning) or tool Dc (milling/drilling)
    teeth_count: int = Field(1, ge=1)           # z (milling)
    lead_angle_deg: float = Field(90.0, gt=0, le=95)
    efficiency: float = Field(0.80, gt=0.1, le=1.0)
    # Surface roughness & overhang / boring-bar deflection parameters
    corner_radius_mm: Optional[float] = Field(None, ge=0)
    has_wiper_geometry: bool = False
    overhang_mm: Optional[float] = Field(None, gt=0)
    shank_diameter_mm: Optional[float] = Field(None, gt=0)
    shank_material: Literal["STEEL", "CARBIDE", "DAMPED"] = "STEEL"
    # Axial drilling engineering parameters
    hole_depth_mm: Optional[float] = Field(None, gt=0)
    axial_tool_subtype: Optional[Literal["INDEXABLE_U_DRILL", "MODULAR_TIP", "SOLID_CARBIDE"]] = None
    point_angle_deg: float = Field(140.0, gt=90.0, le=180.0)
    drill_ld_max: Optional[float] = Field(None, gt=0)
    hole_entry_type: Literal["FLAT", "ANGLED_OR_CURVED", "CROSS_HOLE", "STACKED"] = "FLAT"
    coolant_pressure_bar: Optional[float] = Field(None, ge=0)
    # Optional machine limits
    machine_max_rpm: Optional[int] = None
    machine_max_power_kw: Optional[float] = None
    machine_max_torque_nm: Optional[float] = None
    machine_max_thrust_kn: Optional[float] = None
    # Optional chipbreaker polygon [[fn, ap], ...]
    chipbreaker_polygon: Optional[List[List[float]]] = None


class CuttingCalcResult(BaseModel):
    rpm: float
    rpm_clamped: float
    vf_mm_min: float
    hm_mm: float
    kc_mpa: float
    fc_n: float
    mrr_cm3_min: float
    power_net_kw: float
    power_motor_kw: float
    torque_nm: float
    chip_thinning_factor: float
    ra_um: Optional[float] = None
    ld_ratio: Optional[float] = None
    deflection_mm: Optional[float] = None
    # Axial drilling outputs
    axial_thrust_n: Optional[float] = None
    drill_ld_ratio: Optional[float] = None
    required_coolant_bar: Optional[float] = None
    recommended_cycle: Optional[str] = None
    entry_feed_mm: Optional[float] = None
    pilot_hole_required: bool = False
    hole_cycle_time_sec: Optional[float] = None
    in_chipbreaker_zone: Optional[bool] = None
    warnings: List[str] = []


def point_in_polygon(x: float, y: float, polygon: List[List[float]]) -> bool:
    """Ray-casting algorithm for 2D chipbreaker operating zone check."""
    if not polygon or len(polygon) < 3:
        return True
    inside = False
    n = len(polygon)
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    else:
                        xinters = p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


def calculate_kienzle(inp: CuttingCalcInput) -> CuttingCalcResult:
    warnings: List[str] = []
    kapr_rad = math.radians(min(inp.lead_angle_deg, 90.0))
    sin_kapr = max(math.sin(kapr_rad), 0.15)

    # 1. Spindle speed (RPM)
    rpm_raw = (1000.0 * inp.vc_m_min) / (math.pi * inp.diameter_mm)
    rpm_clamped = rpm_raw
    effective_vc = inp.vc_m_min

    if inp.machine_max_rpm and rpm_raw > inp.machine_max_rpm:
        rpm_clamped = float(inp.machine_max_rpm)
        effective_vc = (math.pi * inp.diameter_mm * rpm_clamped) / 1000.0
        warnings.append(
            f"Расчётные обороты ({rpm_raw:.0f} об/мин) превышают лимит станка ({inp.machine_max_rpm} об/мин). "
            f"Фактическая Vc снижена до {effective_vc:.1f} м/мин."
        )

    chip_thinning_factor = 1.0
    axial_thrust_n: Optional[float] = None
    drill_ld_ratio: Optional[float] = None
    required_coolant_bar: Optional[float] = None
    recommended_cycle: Optional[str] = None
    entry_feed_mm: Optional[float] = None
    pilot_hole_required: bool = False
    hole_cycle_time_sec: Optional[float] = None

    # 2. Operation-specific chip thickness hm, feedrate vf, MRR, Power, Force
    if inp.operation_domain in ("TURNING", "GROOVING_THREADING"):
        hm = max(inp.feed_mm * sin_kapr, 0.01)
        kc = inp.kc1_1_mpa * (hm ** (-inp.mc_exponent))
        vf = inp.feed_mm * rpm_clamped
        mrr = inp.ap_mm * inp.feed_mm * effective_vc
        fc = inp.ap_mm * inp.feed_mm * kc
        power_net = (fc * effective_vc) / 60000.0

    elif inp.operation_domain == "MILLING":
        ae = min(inp.ae_mm or (inp.diameter_mm * 0.5), inp.diameter_mm)
        ratio = ae / inp.diameter_mm
        if ratio < 0.5:
            hm = max(inp.feed_mm * sin_kapr * math.sqrt(ratio), 0.01)
            chip_thinning_factor = round(1.0 / math.sqrt(ratio), 2)
        else:
            hm = max(inp.feed_mm * sin_kapr, 0.01)
        kc = inp.kc1_1_mpa * (hm ** (-inp.mc_exponent))
        vf = inp.feed_mm * inp.teeth_count * rpm_clamped
        mrr = (inp.ap_mm * ae * vf) / 1000.0
        power_net = (inp.ap_mm * ae * vf * kc) / 60_000_000.0
        fc = (power_net * 60000.0) / max(effective_vc, 0.1)

    else:  # DRILLING (U-Drill, Modular Crown, Solid Carbide Drill)
        subtype = inp.axial_tool_subtype or "INDEXABLE_U_DRILL"
        sin_half_point = max(math.sin(math.radians(inp.point_angle_deg / 2.0)), 0.5)
        if subtype == "INDEXABLE_U_DRILL":
            # U-drill: 1 effective edge per radius (center + peripheral offset), flat ~180° entry
            hm = max(inp.feed_mm * 0.5 * sin_kapr, 0.01)
            kc = inp.kc1_1_mpa * (hm ** (-inp.mc_exponent))
            # Axial thrust force Ff (N) for U-drill (no chisel web, balanced inserts)
            thrust_raw = 0.42 * kc * inp.feed_mm * inp.diameter_mm
        else:
            # 2-flute solid carbide / modular crown: fz = fn / 2, chip thickness = (fn/2) * sin(sigma/2)
            hm = max((inp.feed_mm / 2.0) * sin_half_point, 0.01)
            kc = inp.kc1_1_mpa * (hm ** (-inp.mc_exponent))
            # Includes chisel-edge thrust contribution (~35-45% of total axial force)
            thrust_factor = 0.50 if subtype == "MODULAR_TIP" else 0.54
            thrust_raw = thrust_factor * kc * inp.feed_mm * inp.diameter_mm * sin_half_point

        axial_thrust_n = round(thrust_raw, 1)
        vf = inp.feed_mm * rpm_clamped
        mrr = (math.pi * (inp.diameter_mm ** 2) / 4.0 * vf) / 1000.0
        power_net = (inp.feed_mm * inp.diameter_mm * effective_vc * kc) / 240_000.0
        fc = (power_net * 60000.0) / max(effective_vc, 0.1)

        # Hole depth, L/D ratio, coolant pressure & G-code strategy
        depth = inp.hole_depth_mm or (inp.diameter_mm * 3.0)
        drill_ld_ratio = round(depth / inp.diameter_mm, 2)
        hole_cycle_time_sec = round(((depth + 3.0) / max(vf, 1.0)) * 60.0, 1)

        # Required internal coolant pressure (bar)
        if subtype == "INDEXABLE_U_DRILL":
            req_bar = 15.0 if drill_ld_ratio <= 3.0 else (22.0 if drill_ld_ratio <= 4.0 else 30.0)
        elif subtype == "MODULAR_TIP":
            req_bar = 15.0 if drill_ld_ratio <= 3.5 else (25.0 if drill_ld_ratio <= 5.5 else 38.0)
        else:  # SOLID_CARBIDE
            req_bar = 15.0 if drill_ld_ratio <= 3.5 else (25.0 if drill_ld_ratio <= 5.5 else 40.0)
        if inp.diameter_mm <= 8.0:
            req_bar += 5.0
        required_coolant_bar = round(req_bar, 0)

        # Entry feed factor & pilot hole logic
        entry_factor = {
            "FLAT": 1.0,
            "ANGLED_OR_CURVED": 0.60,
            "CROSS_HOLE": 0.60,
            "STACKED": 0.70,
        }[inp.hole_entry_type]
        entry_feed_mm = round(inp.feed_mm * entry_factor, 3)

        if drill_ld_ratio > 5.0:
            pilot_hole_required = True
        elif subtype == "INDEXABLE_U_DRILL" and inp.hole_entry_type == "ANGLED_OR_CURVED":
            pilot_hole_required = True

        # Recommended CNC drilling cycle
        if subtype == "INDEXABLE_U_DRILL":
            if inp.hole_entry_type != "FLAT":
                recommended_cycle = "G81 (сниж. f на входе/выходе, БЕЗ G83!)"
            else:
                recommended_cycle = "G81 (непрерывное сверление, БЕЗ G83)"
        else:
            if pilot_hole_required:
                recommended_cycle = "Пилот 2xD + G81 (вход 300 об/м)"
            elif inp.hole_entry_type in ("ANGLED_OR_CURVED", "CROSS_HOLE"):
                recommended_cycle = "G81 (сниж. f на входе) / G73"
            elif inp.kc1_1_mpa <= 800.0 and drill_ld_ratio >= 4.0:
                recommended_cycle = "G73 (короткая ломка стружки)"
            else:
                recommended_cycle = "G81 (непрерывный с внутр. СОЖ)"

        # Axial engineering warnings
        if inp.drill_ld_max and drill_ld_ratio > inp.drill_ld_max:
            warnings.append(
                f"Глубина сверления L/D={drill_ld_ratio:.1f}xD превышает вылет корпуса ({inp.drill_ld_max:.1f}xD) — выберите более длинное сверло."
            )
        if inp.coolant_pressure_bar is not None and inp.coolant_pressure_bar < required_coolant_bar:
            warnings.append(
                f"Давление СОЖ ({inp.coolant_pressure_bar:.0f} бар) ниже требуемого ({required_coolant_bar:.0f} бар) для {drill_ld_ratio:.1f}xD — риск пакетирования стружки и поломки."
            )
        if inp.machine_max_thrust_kn and (axial_thrust_n / 1000.0) > inp.machine_max_thrust_kn:
            warnings.append(
                f"Осевое усилие подачи ({axial_thrust_n / 1000.0:.1f} кН) превышает лимит оси Z станка ({inp.machine_max_thrust_kn:.1f} кН)."
            )
        if pilot_hole_required:
            warnings.append(
                f"Для L/D={drill_ld_ratio:.1f}xD требуется пилотное отверстие глубиной 1.5–2xD (вход на 300–500 об/мин до включения СОЖ)."
            )
        if inp.hole_entry_type == "ANGLED_OR_CURVED":
            warnings.append(
                f"Наклонный/криволинейный вход: снизьте подачу врезания до f={entry_feed_mm:.2f} мм/об"
                + (" (для U-сверла желательно предварительно подфрезеровать площадку)." if subtype == "INDEXABLE_U_DRILL" else ".")
            )
        elif inp.hole_entry_type == "CROSS_HOLE":
            warnings.append(
                f"Пересечение отверстий: снизьте подачу до f={entry_feed_mm:.2f} мм/об в зоне прохода пересечения."
            )
        elif inp.hole_entry_type == "STACKED":
            warnings.append(
                f"Пакет листов: снизьте подачу до f={entry_feed_mm:.2f} мм/об и исключите зазор между листами (риск заклинивания стружки)."
            )

    power_motor = power_net / inp.efficiency
    torque_nm = (9550.0 * power_motor) / max(rpm_clamped, 1.0)

    # 3. Theoretical Surface Roughness Ra (um) for Turning
    ra_um: Optional[float] = None
    if inp.operation_domain == "TURNING" and inp.corner_radius_mm and inp.corner_radius_mm > 0:
        ra_raw = ((inp.feed_mm ** 2) / (32.0 * inp.corner_radius_mm)) * 1000.0
        if inp.has_wiper_geometry:
            ra_raw *= 0.5
        ra_um = round(ra_raw, 2)

    # 4. Cantilever Beam Deflection & Overhang L/D Check (for turning/milling/grooving)
    ld_ratio: Optional[float] = None
    deflection_mm: Optional[float] = None
    if inp.operation_domain != "DRILLING" and inp.overhang_mm and inp.shank_diameter_mm:
        ld_ratio = round(inp.overhang_mm / inp.shank_diameter_mm, 2)
        safe_ld = SHANK_SAFE_LD_LIMIT[inp.shank_material]
        e_mpa = SHANK_ELASTIC_MODULUS_MPA[inp.shank_material]
        inertia_mm4 = (math.pi * (inp.shank_diameter_mm ** 4)) / 64.0
        f_radial_n = fc * 0.35
        deflection = (f_radial_n * (inp.overhang_mm ** 3)) / (3.0 * e_mpa * inertia_mm4)
        deflection_mm = round(deflection, 4)

        if ld_ratio > safe_ld:
            warnings.append(
                f"Высокий вылет L/D={ld_ratio:.1f} для оправки {inp.shank_material} (рекомендовано ≤ {safe_ld:.1f}) — риск вибраций."
            )
        if deflection_mm > 0.05:
            warnings.append(
                f"Расчётный прогиб оправки δ={deflection_mm:.3f} мм превышает 0.05 мм — уменьшите вылет, ap или перейдите на твёрдосплавную оправку."
            )
    elif inp.operation_domain == "DRILLING":
        ld_ratio = drill_ld_ratio

    # 5. Machine limits check
    if inp.machine_max_power_kw and power_motor > inp.machine_max_power_kw:
        warnings.append(
            f"Требуемая мощность ({power_motor:.2f} кВт) превышает мощность станка ({inp.machine_max_power_kw:.1f} кВт)."
        )
    elif inp.machine_max_power_kw and power_motor > inp.machine_max_power_kw * 0.85:
        warnings.append(
            f"Нагрузка по мощности выше 85% ({power_motor:.2f} / {inp.machine_max_power_kw:.1f} кВт)."
        )

    if inp.machine_max_torque_nm and torque_nm > inp.machine_max_torque_nm:
        warnings.append(
            f"Крутящий момент ({torque_nm:.1f} Н·м) превышает лимит станка ({inp.machine_max_torque_nm:.1f} Н·м)."
        )

    # 6. Chipbreaker operating zone check
    in_zone: Optional[bool] = None
    if inp.chipbreaker_polygon and len(inp.chipbreaker_polygon) >= 3 and inp.operation_domain != "DRILLING":
        in_zone = point_in_polygon(inp.feed_mm, inp.ap_mm, inp.chipbreaker_polygon)
        if not in_zone:
            warnings.append(
                f"Точка (f={inp.feed_mm} мм, ap={inp.ap_mm} мм) выходит за полигон стружколома — риск сливной стружки или перегрузки кромки."
            )

    return CuttingCalcResult(
        rpm=round(rpm_raw, 1),
        rpm_clamped=round(rpm_clamped, 1),
        vf_mm_min=round(vf, 1),
        hm_mm=round(hm, 4),
        kc_mpa=round(kc, 1),
        fc_n=round(fc, 1),
        mrr_cm3_min=round(mrr, 2),
        power_net_kw=round(power_net, 2),
        power_motor_kw=round(power_motor, 2),
        torque_nm=round(torque_nm, 1),
        chip_thinning_factor=chip_thinning_factor,
        ra_um=ra_um,
        ld_ratio=ld_ratio,
        deflection_mm=deflection_mm,
        axial_thrust_n=axial_thrust_n,
        drill_ld_ratio=drill_ld_ratio,
        required_coolant_bar=required_coolant_bar,
        recommended_cycle=recommended_cycle,
        entry_feed_mm=entry_feed_mm,
        pilot_hole_required=pilot_hole_required,
        hole_cycle_time_sec=hole_cycle_time_sec,
        in_chipbreaker_zone=in_zone,
        warnings=warnings,
    )
