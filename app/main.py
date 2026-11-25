"""
FastAPI Backend for SKM — Vendor-Agnostic Indexable Insert & Tooling Selector Suite (v1.0).
Run locally: uvicorn app.main:app --reload --port 8000
"""

from pathlib import Path
from typing import Optional, List, Literal, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.cam_export import (
    AssemblyExportItem,
    build_freecad_toolbit,
    build_fusion360_library,
    build_gtc_iso13399_package,
)
from app.economics import EconomicsInput, EconomicsResult, calculate_economics
from app.geometry3d import build_iso1832_mesh, export_iso1832_stl, InsertMesh3D
from app.inventory import StockItem, generate_sample_stock_csv, parse_stock_csv
from app.iso1832 import parse_iso1832, ISO1832Parsed
from app.gcode import GCodeRequest, GCodeResponse, generate_gcode
from app.kienzle import calculate_kienzle, evaluate_spindle_curve, CuttingCalcInput, CuttingCalcResult
from app.threading import (
    HoleFinishInput, HoleFinishResult, ThreadCalcInput, ThreadCalcResult,
    calculate_hole_finishing, calculate_threading, list_thread_standards,
)
from app.repository import ToolingRepository
from app.sales import (
    OrderQuoteRequest, OrderQuoteResponse, SalesCatalogItem,
    build_commercial_quote, build_sales_catalog,
)

app = FastAPI(
    title="SKM · ISO Tooling Selector API",
    version="2.1.0",
    description=(
        "Vendor-agnostic indexable insert selector with ISO 1832 parser, Kienzle physics, "
        "Taylor tool-life economics, shop-floor warehouse stock, 3D STL/STEP geometry, "
        "CAM exporters (GTC ISO 13399, Fusion 360, FreeCAD), and PostgreSQL/psycopg3 backend."
    ),
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
    operation_domain: Literal["TURNING", "MILLING", "DRILLING", "GROOVING_THREADING"] = "TURNING"
    material_subgroup: str = "P1"
    stability: Literal["STABLE", "INTERRUPTED", "UNSTABLE"] = "STABLE"
    ap_mm: float = Field(2.0, ge=0)
    feed_mm: float = Field(0.25, gt=0)
    ae_mm: Optional[float] = Field(25.0, gt=0)
    diameter_mm: float = Field(50.0, gt=0)
    machine_id: Optional[str] = "m1"
    pocket_filter: Optional[str] = None
    overhang_mm: Optional[float] = Field(None, gt=0)
    shank_diameter_mm: Optional[float] = Field(None, gt=0)
    shank_material: Literal["STEEL", "CARBIDE", "DAMPED"] = "STEEL"
    # Shop-floor stock & part economics
    only_in_stock: bool = False
    volume_to_remove_cm3: float = Field(80.0, gt=0)
    machine_rate_rub_hr: float = Field(3500.0, ge=0)
    # Axial drilling parameters
    axial_subtype_filter: Optional[Literal["ALL", "INDEXABLE_U_DRILL", "MODULAR_TIP", "SOLID_CARBIDE", "TAP_THREAD_MILL", "REAMER_FINE_BORE"]] = "ALL"
    hole_depth_mm: Optional[float] = Field(60.0, gt=0)
    hole_entry_type: Literal["FLAT", "ANGLED_OR_CURVED", "CROSS_HOLE", "STACKED"] = "FLAT"
    coolant_pressure_bar: Optional[float] = Field(20.0, ge=0)


class CrossRefItem(BaseModel):
    target_insert_id: str
    target_iso_code: str
    target_grade_code: str
    target_seat_pocket_signature: str
    match_type: str
    confidence_score: float
    notes: str


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
    has_wiper_geometry: bool = False
    seat_pocket_signature: str
    operating_zone_polygon: List[List[float]]
    holders: List[Dict[str, Any]]
    recommended_vc: float
    recommended_coolant: str
    stock_qty: int = 0
    unit_price_rub: float = 650.0
    bin_location: str = ""
    axial_subtype: Optional[str] = None
    point_angle_deg: Optional[float] = None
    ld_ratio_max: Optional[float] = None
    tolerance_hole: Optional[str] = None
    physics: CuttingCalcResult
    economics: EconomicsResult


class MachineCreateRequest(BaseModel):
    name: str
    machine_type: Literal["LATHE", "MILL_3AX", "MILL_5AX", "TURN_MILL"] = "TURN_MILL"
    max_rpm: int = Field(..., gt=0)
    spindle_power_kw: float = Field(..., gt=0)
    max_torque_nm: float = Field(..., gt=0)
    spindle_interface: str = "BT40"
    rigidity_class: Literal["HIGH", "MEDIUM", "LOW"] = "MEDIUM"


class CsvUploadRequest(BaseModel):
    csv_text: str


# -----------------------------------------------------------------------------
# Static Frontend & PWA Routes
# -----------------------------------------------------------------------------

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def _serve_static(filename: str, media_type: str):
    p = STATIC_DIR / filename
    if p.exists():
        return FileResponse(p, media_type=media_type)
    raise HTTPException(status_code=404, detail=f"{filename} not found")


@app.get("/")
def serve_gui():
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"status": "ok", "docs": "/docs"}


@app.get("/styles.css")
def serve_styles_css():
    return _serve_static("styles.css", "text/css")


@app.get("/app.js")
def serve_app_js():
    return _serve_static("app.js", "application/javascript")


@app.get("/viewer3d.js")
def serve_viewer3d_js():
    return _serve_static("viewer3d.js", "application/javascript")


@app.get("/manifest.json")
def serve_manifest():
    return _serve_static("manifest.json", "application/manifest+json")


@app.get("/sw.js")
def serve_sw():
    return _serve_static("sw.js", "application/javascript")


# -----------------------------------------------------------------------------
# Core Catalog, ISO 1832, 3D Geometry & Physics Endpoints
# -----------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.1.0", "storage_mode": repo.mode}


@app.get("/api/catalog/meta")
def catalog_meta():
    meta = repo.get_meta()
    meta["stock_count"] = len(repo.list_stock())
    return meta


@app.get("/api/iso1832/parse", response_model=ISO1832Parsed)
def api_parse_iso1832(code: str = Query(..., description="ISO 1832 code, e.g. CNMG 120408, MGMN 300, 16ER AG60")):
    return parse_iso1832(code)


@app.get("/api/geometry/iso1832", response_model=InsertMesh3D)
def api_geometry_iso1832(code: str = Query(..., description="ISO 1832 code, e.g. CNMG 120408")):
    try:
        return build_iso1832_mesh(code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/geometry/iso1832/stl")
def api_geometry_iso1832_stl(code: str = Query(..., description="ISO 1832 code, e.g. CNMG 120408")):
    try:
        parsed = parse_iso1832(code)
        stl_text = export_iso1832_stl(code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    filename = f"{parsed.normalized_code or 'insert'}.stl"
    return Response(
        content=stl_text,
        media_type="model/stl",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/inserts/{insert_id}/equivalents", response_model=List[CrossRefItem])
def api_equivalents(insert_id: str):
    return repo.get_cross_references(insert_id)


@app.post("/api/calculate", response_model=CuttingCalcResult)
def api_calculate(payload: CuttingCalcInput):
    return calculate_kienzle(payload)


@app.post("/api/economics/calculate", response_model=EconomicsResult)
def api_calculate_economics(payload: EconomicsInput):
    return calculate_economics(payload)


@app.post("/api/select", response_model=List[CandidateResult])
def api_select(req: SelectionRequest):
    subgroup = repo.get_subgroup(req.material_subgroup)
    if not subgroup:
        raise HTTPException(status_code=404, detail=f"Подгруппа материала '{req.material_subgroup}' не найдена")

    iso_group = subgroup["iso_group"]
    machine = repo.get_machine(req.machine_id) if req.machine_id else None
    inserts = repo.list_inserts(req.operation_domain)

    vc_factor = {"STABLE": 1.0, "INTERRUPTED": 0.80, "UNSTABLE": 0.85}[req.stability]

    results: List[CandidateResult] = []
    for ins in inserts:
        rank = ins["suitability"].get(iso_group)
        if not rank:
            continue
        if req.pocket_filter and ins["seat_pocket_signature"] != req.pocket_filter:
            continue

        holder0 = ins["holders"][0] if ins["holders"] else {}
        cat0 = holder0.get("category", "")
        inferred_subtype = ins.get("axial_subtype") or (
            "MODULAR_TIP" if cat0 == "MODULAR_DRILL"
            else ("SOLID_CARBIDE" if cat0 == "SOLID_CARBIDE_DRILL" else ("INDEXABLE_U_DRILL" if req.operation_domain == "DRILLING" else None))
        )
        if (
            req.operation_domain == "DRILLING"
            and req.axial_subtype_filter
            and req.axial_subtype_filter != "ALL"
            and inferred_subtype != req.axial_subtype_filter
        ):
            continue

        stock_match = repo.get_stock_match(ins["iso_code"], ins["grade_code"])
        stock_qty = int(stock_match["qty"]) if stock_match else 0
        if req.only_in_stock and stock_qty <= 0:
            continue

        unit_price_rub = (
            float(stock_match["unit_price_rub"])
            if stock_match
            else round(float(ins["relative_cost_index"]) * 650.0, 1)
        )
        bin_location = stock_match["bin_location"] if stock_match else ""

        rec = ins["recommendations"].get(req.material_subgroup)
        if not rec:
            rec = next(iter(ins["recommendations"].values()))

        vc_opt = float(rec["vc"])
        vc_target = round(vc_opt * vc_factor, 1)
        dc = holder0.get("dc_mm") or req.diameter_mm
        teeth = holder0.get("z") or 1
        lead_angle = holder0.get("lead_angle_deg") or 90.0
        drill_ld_max = ins.get("ld_ratio_max") or holder0.get("ld_ratio_max")
        point_angle = ins.get("point_angle_deg") or (180.0 if inferred_subtype == "INDEXABLE_U_DRILL" else 140.0)
        eff_diam = req.diameter_mm if req.operation_domain in ("TURNING", "GROOVING_THREADING", "DRILLING") else dc

        physics = calculate_kienzle(
            CuttingCalcInput(
                operation_domain=req.operation_domain,
                kc1_1_mpa=subgroup["kc1_1_mpa"],
                mc_exponent=subgroup["mc_exponent"],
                vc_m_min=vc_target,
                feed_mm=req.feed_mm,
                ap_mm=req.ap_mm,
                ae_mm=req.ae_mm,
                diameter_mm=eff_diam,
                teeth_count=teeth,
                lead_angle_deg=lead_angle,
                corner_radius_mm=ins["corner_radius_mm"],
                has_wiper_geometry=ins["has_wiper_geometry"],
                overhang_mm=req.overhang_mm,
                shank_diameter_mm=req.shank_diameter_mm,
                shank_material=req.shank_material,
                hole_depth_mm=req.hole_depth_mm if req.operation_domain == "DRILLING" else None,
                axial_tool_subtype=inferred_subtype,
                point_angle_deg=point_angle,
                drill_ld_max=drill_ld_max,
                hole_entry_type=req.hole_entry_type,
                coolant_pressure_bar=req.coolant_pressure_bar,
                machine_max_rpm=machine["max_rpm"] if machine else None,
                machine_max_power_kw=machine["spindle_power_kw"] if machine else None,
                machine_max_torque_nm=machine["max_torque_nm"] if machine else None,
                machine_max_thrust_kn=machine.get("max_thrust_kn") if machine else None,
                machine_base_rpm=machine.get("base_rpm") if machine else None,
                chipbreaker_polygon=ins["operating_zone_polygon"],
            )
        )

        economics = calculate_economics(
            EconomicsInput(
                iso_group=iso_group,
                coating_method=ins["coating_method"],
                substrate_type="CBN" if "CBN" in ins["grade_code"] else "WC_CO",
                stability=req.stability,
                vc_actual_m_min=vc_target,
                vc_opt_m_min=vc_opt,
                mrr_cm3_min=max(physics.mrr_cm3_min, 0.1),
                volume_to_remove_cm3=req.volume_to_remove_cm3,
                insert_price_rub=unit_price_rub,
                cutting_edges_count=ins["cutting_edges_count"],
                machine_rate_rub_hr=req.machine_rate_rub_hr,
            )
        )

        score = 60 if rank == "PRIMARY" else 40
        if physics.in_chipbreaker_zone is True or req.operation_domain == "DRILLING":
            score += 20
        if req.stability == "INTERRUPTED":
            score += ins["toughness_index"] * 2
        elif req.stability == "UNSTABLE":
            score += 12 if ins["edge_prep"] == "SHARP" else 4
        else:
            score += ins["wear_resistance_index"] * 2
        if req.operation_domain == "DRILLING":
            # Reward diameter proximity to target hole diameter & depth capability
            diam_diff = abs((holder0.get("dc_mm") or req.diameter_mm) - req.diameter_mm)
            if diam_diff <= 2.0:
                score += 12
            elif diam_diff <= 6.0:
                score += 6
            elif diam_diff > 14.0:
                score -= 10
            if drill_ld_max and physics.drill_ld_ratio and physics.drill_ld_ratio <= drill_ld_max:
                score += 6
        if stock_qty > 0:
            score += 4
        if physics.warnings:
            score -= min(len(physics.warnings) * 8, 24)
        score = max(10, min(100, score))

        cost_per_edge = round(float(ins["relative_cost_index"]) / max(ins["cutting_edges_count"], 1), 3)

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
                has_wiper_geometry=ins["has_wiper_geometry"],
                seat_pocket_signature=ins["seat_pocket_signature"],
                operating_zone_polygon=ins["operating_zone_polygon"],
                holders=ins["holders"],
                recommended_vc=vc_target,
                recommended_coolant=rec["coolant"],
                stock_qty=stock_qty,
                unit_price_rub=unit_price_rub,
                bin_location=bin_location,
                axial_subtype=inferred_subtype,
                point_angle_deg=point_angle if req.operation_domain == "DRILLING" else None,
                ld_ratio_max=drill_ld_max,
                tolerance_hole=ins.get("tolerance_hole"),
                physics=physics,
                economics=economics,
            )
        )

    results.sort(key=lambda r: (-r.score, r.economics.total_cost_part_rub))
    return results


# -----------------------------------------------------------------------------
# Warehouse Stock, Machines, Assemblies & CAM Export Endpoints
# -----------------------------------------------------------------------------

@app.get("/api/stock")
def api_list_stock():
    return repo.list_stock()


@app.post("/api/stock")
def api_replace_stock(items: List[StockItem]):
    return repo.replace_stock([i.model_dump() for i in items])


@app.post("/api/stock/upload-csv")
def api_upload_stock_csv(payload: CsvUploadRequest):
    parsed = parse_stock_csv(payload.csv_text)
    if not parsed:
        raise HTTPException(status_code=400, detail="Не удалось распознать строки CSV. Проверьте заголовки iso_code;qty;unit_price_rub.")
    saved = repo.replace_stock([i.model_dump() for i in parsed])
    return {"imported": len(saved), "items": saved}


@app.get("/api/stock/sample-csv")
def api_sample_stock_csv():
    return Response(
        content=generate_sample_stock_csv(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="skm_warehouse_stock_sample.csv"'},
    )


@app.post("/api/machines")
def api_create_machine(payload: MachineCreateRequest):
    return repo.create_machine(payload.model_dump())


@app.get("/api/assemblies")
def api_list_assemblies():
    return repo.list_assemblies()


@app.post("/api/assemblies")
def api_create_assembly(payload: Dict[str, Any] = Body(...)):
    return repo.create_assembly(payload)


@app.delete("/api/assemblies/{assembly_id}")
def api_delete_assembly(assembly_id: str):
    return {"deleted": repo.delete_assembly(assembly_id)}


@app.post("/api/export/gtc")
def api_export_gtc(items: List[AssemblyExportItem]):
    return build_gtc_iso13399_package(items)


@app.post("/api/export/fusion360")
def api_export_fusion360(items: List[AssemblyExportItem]):
    return build_fusion360_library(items)


@app.post("/api/export/freecad")
def api_export_freecad(item: AssemblyExportItem):
    return build_freecad_toolbit(item)
# -----------------------------------------------------------------------------
# v2.0 Endpoints: Threading, Hole Finishing H7/IT6, G-Code & Spindle Curve
# -----------------------------------------------------------------------------

@app.get("/api/threading/standards")
def api_threading_standards():
    return list_thread_standards()


@app.post("/api/threading/calculate", response_model=ThreadCalcResult)
def api_threading_calculate(payload: ThreadCalcInput):
    try:
        return calculate_threading(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/hole-finishing/calculate", response_model=HoleFinishResult)
def api_hole_finishing_calculate(payload: HoleFinishInput):
    return calculate_hole_finishing(payload)


@app.post("/api/gcode/generate", response_model=GCodeResponse)
def api_gcode_generate(payload: GCodeRequest):
    return generate_gcode(payload)


class SpindleCurveRequest(BaseModel):
    max_rpm: int = Field(12000, gt=0)
    spindle_power_kw: float = Field(15.0, gt=0)
    max_torque_nm: float = Field(95.0, gt=0)
    base_rpm: Optional[int] = None
    points: int = Field(24, ge=8, le=100)


@app.post("/api/spindle/curve")
def api_spindle_curve(req: SpindleCurveRequest):
    _, _, base_rpm = evaluate_spindle_curve(
        req.max_rpm * 0.5, req.spindle_power_kw, req.max_torque_nm, req.max_rpm, req.base_rpm
    )
    rpms = sorted({
        100,
        int(base_rpm),
        int(req.max_rpm * 0.85),
        req.max_rpm,
        *[int(req.max_rpm * i / req.points) for i in range(1, req.points + 1)],
    })
    curve = []
    for r in rpms:
        if r <= 0 or r > req.max_rpm:
            continue
        p_kw, t_nm, _ = evaluate_spindle_curve(r, req.spindle_power_kw, req.max_torque_nm, req.max_rpm, req.base_rpm)
        curve.append({"rpm": r, "power_kw": p_kw, "torque_nm": t_nm})
    return {"base_rpm": base_rpm, "max_rpm": req.max_rpm, "curve": curve}
# -----------------------------------------------------------------------------
# v2.1 Commercial Sales & Order Endpoints
# -----------------------------------------------------------------------------

@app.get("/api/sales/catalog", response_model=List[SalesCatalogItem])
def api_sales_catalog(
    q: str = Query("", description="Поиск по коду, сплаву, державке или материалу"),
    iso_group: Optional[str] = Query(None, description="P, M, K, N, S, H или ALL"),
    operation: Optional[str] = Query(None, description="TURNING, MILLING, DRILLING, GROOVING_THREADING или ALL"),
    application_class: Optional[str] = Query(None, description="FINISHING, MEDIUM, ROUGHING или ALL"),
    only_in_stock: bool = Query(False),
    pocket: Optional[str] = Query(None),
    sort_by: Literal["relevance", "price_asc", "edge_price_asc", "stock_desc"] = Query("relevance"),
):
    return build_sales_catalog(
        repo=repo,
        q=q,
        iso_group=iso_group,
        operation=operation,
        application_class=application_class,
        only_in_stock=only_in_stock,
        pocket=pocket,
        sort_by=sort_by,
    )


@app.post("/api/sales/quote", response_model=OrderQuoteResponse)
def api_sales_quote(payload: OrderQuoteRequest):
    return build_commercial_quote(payload)


@app.get("/api/sales/orders")
def api_list_orders():
    return repo.list_orders()


@app.post("/api/sales/orders")
def api_create_order(payload: Dict[str, Any] = Body(...)):
    return repo.create_order(payload)


@app.delete("/api/sales/orders/{order_id}")
def api_delete_order(order_id: str):
    return {"deleted": repo.delete_order(order_id)}
