"""
Kienzle Cutting Physics Engine & Chipbreaker Polygon Containment Checker.
Supports Turning, Milling (with radial chip thinning), and Axial Indexable Drilling.
All internal units are strictly SI / Metric (mm, m/min, MPa, N, kW, Nm, cm3/min).
"""

import math
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class CuttingCalcInput(BaseModel):
    operation_domain: Literal["TURNING", "MILLING", "DRILLING"]
    kc1_1_mpa: float = Field(..., gt=0)
    mc_exponent: float = Field(..., gt=0, lt=1)
    vc_m_min: float = Field(..., gt=0)
    feed_mm: float = Field(..., gt=0)         # fn (mm/rev) for turning/drilling, fz (mm/tooth) for milling
    ap_mm: float = Field(0.0, ge=0)           # axial depth of cut (ignored for drilling)
    ae_mm: Optional[float] = Field(None, gt=0)  # radial width of cut (milling)
    diameter_mm: float = Field(50.0, gt=0)    # workpiece D (turning) or tool Dc (milling/drilling)
    teeth_count: int = Field(1, ge=1)         # z (milling)
    lead_angle_deg: float = Field(90.0, gt=0, le=95)
    efficiency: float = Field(0.80, gt=0.1, le=1.0)
    # Optional machine limits
    machine_max_rpm: Optional[int] = None
    machine_max_power_kw: Optional[float] = None
    machine_max_torque_nm: Optional[float] = None
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

    # 2. Operation-specific chip thickness hm, feedrate vf, MRR, Power, Force
    if inp.operation_domain == "TURNING":
        hm = max(inp.feed_mm * sin_kapr, 0.01)
        kc = inp.kc1_1_mpa * (hm ** (-inp.mc_exponent))
        vf = inp.feed_mm * rpm_clamped
        # MRR (cm3/min) = ap * fn * Vc
        mrr = inp.ap_mm * inp.feed_mm * effective_vc
        # Tangential force Fc (N) = ap * fn * kc
        fc = inp.ap_mm * inp.feed_mm * kc
        # Net cutting power (kW) = (Fc * Vc) / 60000
        power_net = (fc * effective_vc) / 60000.0

    elif inp.operation_domain == "MILLING":
        ae = min(inp.ae_mm or (inp.diameter_mm * 0.5), inp.diameter_mm)
        ratio = ae / inp.diameter_mm
        # Radial chip thinning for ae/Dc < 0.5
        if ratio < 0.5:
            hm = max(inp.feed_mm * sin_kapr * math.sqrt(ratio), 0.01)
            chip_thinning_factor = round(1.0 / math.sqrt(ratio), 2)
        else:
            hm = max(inp.feed_mm * sin_kapr, 0.01)
        kc = inp.kc1_1_mpa * (hm ** (-inp.mc_exponent))
        vf = inp.feed_mm * inp.teeth_count * rpm_clamped
        # MRR (cm3/min) = (ap * ae * vf) / 1000
        mrr = (inp.ap_mm * ae * vf) / 1000.0
        # Net power (kW) = (ap * ae * vf * kc) / (60 * 10^6)
        power_net = (inp.ap_mm * ae * vf * kc) / 60_000_000.0
        fc = (power_net * 60000.0) / max(effective_vc, 0.1)

    else:  # DRILLING (Indexable U-Drill)
        # Effective cutting edge radius = Dc / 2, single effective cutting radius per rev
        hm = max(inp.feed_mm * 0.5 * sin_kapr, 0.01)
        kc = inp.kc1_1_mpa * (hm ** (-inp.mc_exponent))
        vf = inp.feed_mm * rpm_clamped
        # MRR (cm3/min) = (pi * Dc^2 / 4 * vf) / 1000
        mrr = (math.pi * (inp.diameter_mm ** 2) / 4.0 * vf) / 1000.0
        # Net power (kW) = (fn * Dc * Vc * kc) / (240 * 10^3)
        power_net = (inp.feed_mm * inp.diameter_mm * effective_vc * kc) / 240_000.0
        fc = (power_net * 60000.0) / max(effective_vc, 0.1)

    power_motor = power_net / inp.efficiency
    torque_nm = (9550.0 * power_motor) / max(rpm_clamped, 1.0)

    # 3. Machine limits check
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

    # 4. Chipbreaker operating zone check
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
        in_chipbreaker_zone=in_zone,
        warnings=warnings,
    )
