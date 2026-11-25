"""
Taylor Tool Life & Part Machining Economics Engine.
Calculates expected tool life per cutting edge (min), cutting time per part,
tool cost per part, machine cost per part, and total cost per part.
"""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field


# Extended Taylor exponents n by coating/substrate family
TAYLOR_N_EXPONENT = {
    "CVD": 0.25,
    "PVD": 0.22,
    "UNCOATED": 0.18,
    "CBN": 0.30,
    "CERAMIC": 0.32,
}

# Reference edge life T_ref (min) at optimal Vc under STABLE conditions by ISO 513 group
REFERENCE_TOOL_LIFE_MIN = {
    "P": 15.0,
    "M": 15.0,
    "K": 18.0,
    "N": 30.0,
    "S": 10.0,
    "H": 12.0,
}

STABILITY_LIFE_FACTOR = {
    "STABLE": 1.00,
    "INTERRUPTED": 0.65,
    "UNSTABLE": 0.78,
}


class EconomicsInput(BaseModel):
    iso_group: Literal["P", "M", "K", "N", "S", "H"] = "P"
    coating_method: str = "CVD"
    substrate_type: str = "WC_CO"
    stability: Literal["STABLE", "INTERRUPTED", "UNSTABLE"] = "STABLE"
    vc_actual_m_min: float = Field(..., gt=0)
    vc_opt_m_min: float = Field(..., gt=0)
    mrr_cm3_min: float = Field(..., gt=0)
    volume_to_remove_cm3: float = Field(80.0, gt=0)
    insert_price_rub: float = Field(650.0, ge=0)
    cutting_edges_count: int = Field(4, ge=1)
    machine_rate_rub_hr: float = Field(3500.0, ge=0)
    index_change_time_min: float = Field(1.5, ge=0)


class EconomicsResult(BaseModel):
    tool_life_edge_min: float
    cutting_time_part_min: float
    parts_per_edge: float
    cost_per_edge_rub: float
    tool_cost_part_rub: float
    machine_cost_part_rub: float
    total_cost_part_rub: float


def calculate_economics(inp: EconomicsInput) -> EconomicsResult:
    sub = (inp.substrate_type or "WC_CO").upper()
    coat = (inp.coating_method or "CVD").upper()
    n_exp = TAYLOR_N_EXPONENT.get(sub, TAYLOR_N_EXPONENT.get(coat, 0.24))

    t_ref = REFERENCE_TOOL_LIFE_MIN.get(inp.iso_group, 15.0)
    stab_factor = STABILITY_LIFE_FACTOR.get(inp.stability, 1.0)

    # Taylor relation: T = T_ref * (Vc_opt / Vc_actual)^(1 / n)
    vc_ratio = max(0.35, min(2.5, inp.vc_opt_m_min / max(inp.vc_actual_m_min, 1.0)))
    raw_life = t_ref * (vc_ratio ** (1.0 / n_exp)) * stab_factor
    tool_life_min = max(2.0, min(180.0, raw_life))

    cutting_time_min = inp.volume_to_remove_cm3 / max(inp.mrr_cm3_min, 0.01)
    parts_per_edge = tool_life_min / max(cutting_time_min, 0.001)
    edges_per_part = 1.0 / max(parts_per_edge, 0.001)

    cost_per_edge = inp.insert_price_rub / max(inp.cutting_edges_count, 1)
    tool_cost_part = cost_per_edge * edges_per_part
    change_time_part = inp.index_change_time_min * edges_per_part
    machine_cost_part = ((cutting_time_min + change_time_part) / 60.0) * inp.machine_rate_rub_hr
    total_cost_part = tool_cost_part + machine_cost_part

    return EconomicsResult(
        tool_life_edge_min=round(tool_life_min, 1),
        cutting_time_part_min=round(cutting_time_min, 2),
        parts_per_edge=round(parts_per_edge, 1),
        cost_per_edge_rub=round(cost_per_edge, 1),
        tool_cost_part_rub=round(tool_cost_part, 1),
        machine_cost_part_rub=round(machine_cost_part, 1),
        total_cost_part_rub=round(total_cost_part, 1),
    )
