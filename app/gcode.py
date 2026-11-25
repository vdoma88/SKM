"""
Shop-Floor CNC G-Code Snippet Generator (Fanuc / Haas & Siemens Sinumerik 840D).
Generates ready-to-verify canned cycles and cutting blocks for Turning, Milling,
Drilling (G81/G73/Pilot), Rigid Tapping (G84), Helical Thread Milling (G02/G03),
Reaming (G85), and Fine Boring (G76).
"""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field


class GCodeRequest(BaseModel):
    controller: Literal["FANUC", "SIEMENS"] = "FANUC"
    operation: Literal[
        "TURNING",
        "MILLING",
        "DRILLING",
        "GROOVING_THREADING",
        "TAPPING",
        "THREAD_MILLING",
        "REAMING",
        "FINE_BORING",
    ] = "DRILLING"
    tool_number: int = Field(1, ge=1, le=99)
    tool_label: str = "SC-DRL-120-8D"
    diameter_mm: float = Field(12.0, gt=0)
    rpm: float = Field(2800.0, gt=0)
    vc_m_min: float = Field(105.0, gt=0)
    feed_mm: float = Field(0.22, gt=0)
    vf_mm_min: float = Field(616.0, gt=0)
    depth_mm: float = Field(40.0, gt=0)
    ap_mm: float = Field(2.0, ge=0)
    pitch_mm: float = Field(1.75, gt=0)
    cutter_dc_mm: Optional[float] = None
    coolant: str = "HIGH_PRESSURE_THROUGH"
    pilot_required: bool = False
    entry_feed_mm: Optional[float] = None
    recommended_cycle: Optional[str] = None


class GCodeResponse(BaseModel):
    controller: str
    operation: str
    program_text: str


def generate_gcode(req: GCodeRequest) -> GCodeResponse:
    t_str = f"T{req.tool_number:02d}"
    s_rpm = int(round(req.rpm))
    cool_on = "M88 (THROUGH-TOOL COOLANT)" if req.coolant == "HIGH_PRESSURE_THROUGH" else ("M08 (FLOOD COOLANT)" if req.coolant != "DRY" else "(DRY CUTTING)")
    cool_off = "M89" if req.coolant == "HIGH_PRESSURE_THROUGH" else "M09"
    is_siemens = req.controller == "SIEMENS"
    cmt = (lambda txt: f"; {txt}") if is_siemens else (lambda txt: f"({txt})")

    lines = [
        cmt(f"SKM v2.0 GENERATED BLOCK | {req.operation} | {req.tool_label}"),
        cmt(f"Vc={req.vc_m_min:.1f} m/min | S={s_rpm} RPM | f={req.feed_mm:.3f} mm | Vf={req.vf_mm_min:.0f} mm/min"),
    ]

    if is_siemens:
        lines.append(f'T="{req.tool_label}" M6')
        lines.append(f"G54 G90 G17 D1")
    else:
        lines.append(f"{t_str} M06")
        lines.append("G54 G90 G17 G40 G80")

    if req.operation == "TURNING":
        if is_siemens:
            lines += [
                f"G96 S{int(round(req.vc_m_min))} LIMS={s_rpm} M4",
                "M08" if req.coolant != "DRY" else "; DRY",
                f"G00 X{req.diameter_mm + 4.0:.2f} Z2.0",
                f"G01 X{max(req.diameter_mm - 2.0 * req.ap_mm, 2.0):.2f} F{req.feed_mm:.3f}",
                f"G01 Z-{req.depth_mm:.2f}",
                f"G00 X{req.diameter_mm + 4.0:.2f} Z5.0",
                "M09",
                "M05",
            ]
        else:
            lines += [
                f"G50 S{s_rpm}",
                f"G96 S{int(round(req.vc_m_min))} M03",
                "M08" if req.coolant != "DRY" else "(DRY)",
                f"G00 X{req.diameter_mm + 4.0:.2f} Z2.0",
                f"G01 X{max(req.diameter_mm - 2.0 * req.ap_mm, 2.0):.2f} F{req.feed_mm:.3f}",
                f"G01 Z-{req.depth_mm:.2f}",
                f"G00 X{req.diameter_mm + 4.0:.2f} Z5.0",
                "M09",
                "M05",
            ]

    elif req.operation == "GROOVING_THREADING":
        lines += [
            f"G97 S{s_rpm} M03",
            "M08" if req.coolant != "DRY" else cmt("DRY"),
            f"G00 X{req.diameter_mm + 3.0:.2f} Z-{req.depth_mm:.2f}",
            f"G01 X{max(req.diameter_mm - 2.0 * req.ap_mm, 2.0):.2f} F{req.feed_mm:.3f}",
            "G04 P300" if not is_siemens else "G04 F0.3",
            f"G00 X{req.diameter_mm + 4.0:.2f}",
            "M09",
            "M05",
        ]

    elif req.operation == "MILLING":
        lines += [
            f"S{s_rpm} M03",
            f"G00 X0.0 Y0.0",
            f"G43 Z25.0 H{req.tool_number:02d}" if not is_siemens else "G00 Z25.0",
            cool_on if not is_siemens else ("M08" if req.coolant != "DRY" else "; AIR/DRY"),
            f"G00 Z2.0",
            f"G01 Z-{req.ap_mm:.2f} F{max(req.vf_mm_min * 0.35, 80.0):.0f}",
            f"G01 X{req.depth_mm:.2f} F{req.vf_mm_min:.0f}",
            "G00 Z25.0",
            cool_off if not is_siemens else "M09",
            "M05",
        ]

    elif req.operation == "DRILLING":
        use_g73 = "G73" in (req.recommended_cycle or "")
        if req.pilot_required:
            lines += [
                cmt("STEP 1: ENTER PILOT HOLE AT LOW RPM BEFORE COOLANT"),
                "S350 M03",
                "G00 X0.0 Y0.0",
                f"G43 Z25.0 H{req.tool_number:02d}" if not is_siemens else "G00 Z25.0",
                f"G01 Z-{min(req.diameter_mm * 1.5, req.depth_mm * 0.4):.1f} F300",
                cool_on if not is_siemens else "M08 ; HIGH-PRESSURE COOLANT ON",
                f"S{s_rpm} M03",
                f"G01 Z-{req.depth_mm:.2f} F{req.vf_mm_min:.0f}",
                "G00 Z2.0",
                "S350 M03",
                "G00 Z25.0",
                cool_off if not is_siemens else "M09",
                "M05",
            ]
        elif is_siemens:
            lines += [
                f"S{s_rpm} M03",
                "G00 X0.0 Y0.0 Z25.0",
                "M08 ; INTERNAL COOLANT",
                f"CYCLE81(25, 0, 2, -{req.depth_mm:.2f}, ) ; F={req.vf_mm_min:.0f}",
                f"G94 F{req.vf_mm_min:.0f}",
                "M09",
                "M05",
            ]
        else:
            f_use = round((req.entry_feed_mm or req.feed_mm) * req.rpm, 0) if (req.entry_feed_mm and req.entry_feed_mm < req.feed_mm) else round(req.vf_mm_min, 0)
            cycle_line = (
                f"G98 G73 Z-{req.depth_mm:.2f} R2.0 Q{max(req.diameter_mm * 0.75, 4.0):.1f} F{f_use:.0f}"
                if use_g73
                else f"G98 G81 Z-{req.depth_mm:.2f} R2.0 F{f_use:.0f}"
            )
            lines += [
                f"S{s_rpm} M03",
                "G00 X0.0 Y0.0",
                f"G43 Z25.0 H{req.tool_number:02d}",
                cool_on,
                cycle_line,
                "G80",
                "G00 Z25.0",
                cool_off,
                "M05",
            ]

    elif req.operation == "TAPPING":
        if is_siemens:
            lines += [
                f"S{s_rpm} M03",
                "G00 X0.0 Y0.0 Z25.0",
                "M08",
                f"CYCLE84(25, 0, 3, -{req.depth_mm:.2f}, , 0, 3, , {req.pitch_mm:.3f}, 0, {s_rpm}, {s_rpm})",
                "M09",
                "M05",
            ]
        else:
            lines += [
                "G00 X0.0 Y0.0",
                f"G43 Z25.0 H{req.tool_number:02d}",
                "M08",
                f"M29 S{s_rpm}",
                f"G98 G84 Z-{req.depth_mm:.2f} R3.0 F{req.vf_mm_min:.1f}",
                "G80",
                "G00 Z25.0",
                "M09",
                "M05",
            ]

    elif req.operation == "THREAD_MILLING":
        dc = req.cutter_dc_mm or round(req.diameter_mm * 0.65, 2)
        r_path = round((req.diameter_mm - dc) / 2.0, 3)
        r_lead = round(r_path / 2.0, 3)
        lines += [
            f"S{s_rpm} M03",
            "G00 X0.0 Y0.0",
            f"G43 Z25.0 H{req.tool_number:02d}" if not is_siemens else "G00 Z25.0",
            "M08",
            f"G00 Z-{req.depth_mm:.2f}",
            cmt(f"CLIMB HELICAL INTERPOLATION (BOTTOM-UP, R_path={r_path:.3f} mm)"),
            f"G91 G03 X{r_path:.3f} Y0.0 I{r_lead:.3f} J0.0 Z{req.pitch_mm / 4.0:.3f} F{req.vf_mm_min:.0f}",
            f"G03 X0.0 Y0.0 I-{r_path:.3f} J0.0 Z{req.pitch_mm:.3f}",
            f"G03 X-{r_path:.3f} Y0.0 I-{r_lead:.3f} J0.0 Z{req.pitch_mm / 4.0:.3f}",
            "G90 G00 Z25.0",
            "M09",
            "M05",
        ]

    elif req.operation == "REAMING":
        if is_siemens:
            lines += [
                f"S{s_rpm} M03",
                "G00 X0.0 Y0.0 Z25.0",
                "M08",
                f"CYCLE85(25, 0, 2, -{req.depth_mm:.2f}, , 0, {req.vf_mm_min:.0f}, {req.vf_mm_min:.0f})",
                "M09",
                "M05",
            ]
        else:
            lines += [
                f"S{s_rpm} M03",
                "G00 X0.0 Y0.0",
                f"G43 Z25.0 H{req.tool_number:02d}",
                "M08",
                f"G98 G85 Z-{req.depth_mm:.2f} R2.0 F{req.vf_mm_min:.0f}",
                "G80",
                "G00 Z25.0",
                "M09",
                "M05",
            ]

    else:  # FINE_BORING
        if is_siemens:
            lines += [
                f"S{s_rpm} M03",
                "G00 X0.0 Y0.0 Z25.0",
                "M08",
                f"CYCLE86(25, 0, 2, -{req.depth_mm:.2f}, , 0, 3, 0.2, 0, 0, 0)",
                "M09",
                "M05",
            ]
        else:
            lines += [
                f"S{s_rpm} M03",
                "G00 X0.0 Y0.0",
                f"G43 Z25.0 H{req.tool_number:02d}",
                "M08",
                f"G98 G76 Z-{req.depth_mm:.2f} R2.0 Q0.20 F{req.vf_mm_min:.0f}",
                "G80",
                "G00 Z25.0",
                "M09",
                "M05",
            ]

    return GCodeResponse(
        controller=req.controller,
        operation=req.operation,
        program_text="\n".join(lines) + "\n",
    )
