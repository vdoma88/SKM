"""
FastAPI Backend for Vendor-Agnostic Indexable Insert Selector.
Run locally: uvicorn app.main:app --reload --port 8000
"""

from pathlib import Path
from typing import Optional, List, Literal, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.iso1832 import parse_iso1832, ISO1832Parsed
from app.kienzle import calculate_kienzle, CuttingCalcInput, CuttingCalcResult, point_in_polygon
from app.repository import ToolingRepository

app = FastAPI(
    title="ISO Tooling Selector API",
    version="0.1.0",
    description="Vendor-agnostic indexable insert selector with ISO 1832 parser and Kienzle physics engine.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

repo = ToolingRepository()
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


class SelectionRequest(BaseModel):
    operation_domain: Literal["TURNING", "MILLING", "DRILLING"] = "TURNING"
    material_subgroup: str = "P1"
    stability: Literal["STABLE", "INTERRUPTED", "UNSTABLE"] = "STABLE"
    ap_mm: float = Field(2.0, ge=0)
    feed_mm: float = Field(0.25, gt=0)
    ae_mm: Optional[float] = Field(25.0, gt=0)
    diameter_mm: float = Field(50.0, gt=0)
    machine_id: Optional[str] = "m1"
    pocket_filter: Optional[str] = None


class CandidateResult(BaseModel):
    insert_id: str
    iso_code: str
    grade_code: str
    coating_method: str
    coating_composition: str
    chipbreaker_code: str
    application_class: str
    edge_prep: str
    suitability_rank: str
    score: int
    cost_per_edge: float
    cutting_edges_count: int
    seat_pocket_signature: str
    operating_zone_polygon: List[List[float]]
    holders: List[Dict[str, Any]]
    recommended_vc: float
    recommended_coolant: str
    physics: CuttingCalcResult


@app.get("/")
def serve_gui():
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"status": "ok", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok", "storage_mode": repo.mode}


@app.get("/api/catalog/meta")
def catalog_meta():
    return repo.get_meta()


@app.get("/api/iso1832/parse", response_model=ISO1832Parsed)
def api_parse_iso1832(code: str = Query(..., description="ISO 1832 code, e.g. CNMG 120408")):
    return parse_iso1832(code)


@app.post("/api/calculate", response_model=CuttingCalcResult)
def api_calculate(payload: CuttingCalcInput):
    return calculate_kienzle(payload)


@app.post("/api/select", response_model=List[CandidateResult])
def api_select(req: SelectionRequest):
    subgroup = repo.get_subgroup(req.material_subgroup)
    if not subgroup:
        raise HTTPException(status_code=404, detail=f"Подгруппа материала '{req.material_subgroup}' не найдена")

    iso_group = subgroup["iso_group"]
    machine = repo.get_machine(req.machine_id) if req.machine_id else None
    inserts = repo.list_inserts(req.operation_domain)

    # Stability Vc derating factor
    vc_factor = {"STABLE": 1.0, "INTERRUPTED": 0.80, "UNSTABLE": 0.85}[req.stability]

    results: List[CandidateResult] = []
    for ins in inserts:
        rank = ins["suitability"].get(iso_group)
        if not rank:
            continue
        if req.pocket_filter and ins["seat_pocket_signature"] != req.pocket_filter:
            continue

        rec = ins["recommendations"].get(req.material_subgroup)
        if not rec:
            # Fallback to first available recommendation if subgroup not explicitly listed
            rec = next(iter(ins["recommendations"].values()))

        vc_target = round(rec["vc"] * vc_factor, 1)
        holder0 = ins["holders"][0] if ins["holders"] else {}
        dc = holder0.get("dc_mm") or req.diameter_mm
        teeth = holder0.get("z") or 1
        lead_angle = holder0.get("lead_angle_deg") or 90.0

        physics = calculate_kienzle(
            CuttingCalcInput(
                operation_domain=req.operation_domain,
                kc1_1_mpa=subgroup["kc1_1_mpa"],
                mc_exponent=subgroup["mc_exponent"],
                vc_m_min=vc_target,
                feed_mm=req.feed_mm,
                ap_mm=req.ap_mm,
                ae_mm=req.ae_mm,
                diameter_mm=dc if req.operation_domain != "TURNING" else req.diameter_mm,
                teeth_count=teeth,
                lead_angle_deg=lead_angle,
                machine_max_rpm=machine["max_rpm"] if machine else None,
                machine_max_power_kw=machine["spindle_power_kw"] if machine else None,
                machine_max_torque_nm=machine["max_torque_nm"] if machine else None,
                chipbreaker_polygon=ins["operating_zone_polygon"],
            )
        )

        # Scoring algorithm (0..100)
        score = 60 if rank == "PRIMARY" else 40
        if physics.in_chipbreaker_zone is True or req.operation_domain == "DRILLING":
            score += 20
        if req.stability == "INTERRUPTED":
            score += ins["toughness_index"] * 2
        elif req.stability == "UNSTABLE":
            score += 12 if ins["edge_prep"] == "SHARP" else 4
        else:
            score += ins["wear_resistance_index"] * 2
        if physics.warnings:
            score -= min(len(physics.warnings) * 8, 24)
        score = max(10, min(100, score))

        cost_per_edge = round(ins["relative_cost_index"] / max(ins["cutting_edges_count"], 1), 3)

        results.append(
            CandidateResult(
                insert_id=ins["id"],
                iso_code=ins["iso_code"],
                grade_code=ins["grade_code"],
                coating_method=ins["coating_method"],
                coating_composition=ins["coating_composition"],
                chipbreaker_code=ins["chipbreaker_code"],
                application_class=ins["application_class"],
                edge_prep=ins["edge_prep"],
                suitability_rank=rank,
                score=score,
                cost_per_edge=cost_per_edge,
                cutting_edges_count=ins["cutting_edges_count"],
                seat_pocket_signature=ins["seat_pocket_signature"],
                operating_zone_polygon=ins["operating_zone_polygon"],
                holders=ins["holders"],
                recommended_vc=vc_target,
                recommended_coolant=rec["coolant"],
                physics=physics,
            )
        )

    results.sort(key=lambda r: (-r.score, r.cost_per_edge))
    return results
