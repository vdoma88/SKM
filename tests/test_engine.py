import sys
import types
from decimal import Decimal
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.cam_export import AssemblyExportItem, build_freecad_toolbit, build_fusion360_library, build_gtc_iso13399_package
from app.economics import EconomicsInput, calculate_economics
from app.geometry3d import build_iso1832_mesh, export_iso1832_stl
from app.inventory import generate_sample_stock_csv, parse_stock_csv
from app.iso1832 import parse_iso1832
from app.gcode import GCodeRequest, generate_gcode
from app.kienzle import calculate_kienzle, evaluate_spindle_curve, CuttingCalcInput
from app.threading import HoleFinishInput, ThreadCalcInput, calculate_hole_finishing, calculate_threading, list_thread_standards
import app.repository as repo_mod
from app.repository import ToolingRepository
from app.sales import OrderQuoteRequest, QuoteLineInput, build_commercial_quote, build_sales_catalog
import base64
from app.cad_workpiece import generate_demo_step_file, parse_step_workpiece, parse_stl_workpiece
from app.drawing_analyzer import (
    DEMO_BLUEPRINTS, DrawingAnalyzeRequest, DrawingFeature, DrawingSpec,
    analyze_uploaded_drawing, parse_dxf_blueprint, recommend_tooling_for_blueprint,
)


def test_iso1832_pg_rounding_and_expanded_codes():
    cases = [
        ("CNMG 120408", "C-N-1270-476-G", 4),
        ("CNGA 120408", "C-N-1270-476-A", 4),
        ("WNMG 080408", "W-N-1270-476-G", 6),
        ("DNMG 150608", "D-N-1270-635-G", 4),
        ("VNMG 160404", "V-N-953-476-G", 4),
        ("SNMG 120412", "S-N-1270-476-G", 8),
        ("CCMT 09T304", "C-C-953-397-T", 2),
        ("DCMT 11T304", "D-C-953-397-T", 2),
        ("APKT 160408-AL", "A-P-953-476-T", 2),
        ("SEKT 120408", "S-E-1270-476-T", 4),
        ("RDMT 120400", "R-D-1200-476-T", 6),
        ("WCMX 050308", "W-C-794-318-X", 3),
        ("SPMG 07T308", "S-P-794-397-G", 4),
        ("SPMG 090408", "S-P-953-476-G", 4),
    ]
    for code, expected_sig, expected_edges in cases:
        p = parse_iso1832(code)
        assert p.valid is True, f"Failed to parse {code}: {p.error}"
        assert p.seat_pocket_signature == expected_sig, f"{code}: {p.seat_pocket_signature} != {expected_sig}"
        assert p.cutting_edges_count == expected_edges, f"{code}: {p.cutting_edges_count} != {expected_edges}"


def test_kienzle_turning_and_milling():
    res_t = calculate_kienzle(
        CuttingCalcInput(
            operation_domain="TURNING",
            kc1_1_mpa=1500.0,
            mc_exponent=0.25,
            vc_m_min=290.0,
            feed_mm=0.30,
            ap_mm=2.5,
            diameter_mm=60.0,
            lead_angle_deg=95.0,
            machine_max_rpm=4500,
            machine_max_power_kw=18.5,
            machine_max_torque_nm=320.0,
            chipbreaker_polygon=[[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.20, 4.0], [0.15, 2.2]],
        )
    )
    assert res_t.in_chipbreaker_zone is True
    assert 5.0 < res_t.power_motor_kw < 15.0

    res_m = calculate_kienzle(
        CuttingCalcInput(
            operation_domain="MILLING",
            kc1_1_mpa=1700.0,
            mc_exponent=0.25,
            vc_m_min=185.0,
            feed_mm=0.14,
            ap_mm=3.0,
            ae_mm=10.0,
            diameter_mm=50.0,
            teeth_count=5,
            machine_max_rpm=12000,
            machine_max_power_kw=15.0,
            machine_max_torque_nm=95.0,
        )
    )
    assert res_m.chip_thinning_factor > 1.5
    assert res_m.mrr_cm3_min > 10.0


def test_repository_memory_seed_and_cross_references():
    repo = ToolingRepository(db_url="")
    assert repo.mode == "memory_seed"
    meta = repo.get_meta()
    assert len(meta["material_subgroups"]) == 12
    assert len(repo.list_inserts()) == 36
    assert len(repo.list_inserts("TURNING")) == 12
    assert len(repo.list_inserts("MILLING")) == 4
    assert len(repo.list_inserts("DRILLING")) == 18

    xrefs = repo.get_cross_references("ins-1")
    assert len(xrefs) >= 2
    assert any(x["target_iso_code"] == "WNMG 080408" for x in xrefs)


def test_repository_postgres_mock_driver():
    class FakeCursor:
        def __init__(self):
            self._rows = []
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def execute(self, sql, params=None):
            s = " ".join(sql.split())
            if "FROM v_insert_selector_catalog" in s:
                self._rows = [
                    {
                        "insert_id": "30000000-0000-0000-0000-000000000007",
                        "iso_code": "WNMG 080408",
                        "operation_domain": "TURNING",
                        "shape_code": "W",
                        "clearance_angle_deg": Decimal("0"),
                        "ic_mm": Decimal("12.700"),
                        "thickness_mm": Decimal("4.760"),
                        "corner_radius_mm": Decimal("0.800"),
                        "cutting_edges_count": 6,
                        "is_double_sided": True,
                        "has_wiper_geometry": False,
                        "seat_pocket_signature": "W-N-1270-476-G",
                        "relative_cost_index": Decimal("1.05"),
                        "grade_id": "10000000-0000-0000-0000-000000000001",
                        "grade_code": "GEN-P25-CVD",
                        "substrate_type": "WC_CO",
                        "coating_method": "CVD",
                        "coating_composition": "TiCN-Al2O3-TiN",
                        "toughness_index": 6,
                        "wear_resistance_index": 8,
                        "chipbreaker_id": "20000000-0000-0000-0000-000000000001",
                        "chipbreaker_code": "GEN-PM",
                        "application_class": "MEDIUM",
                        "edge_prep": "HONED",
                        "ap_min_mm": Decimal("0.800"),
                        "ap_max_mm": Decimal("4.500"),
                        "fn_min_mm": Decimal("0.1500"),
                        "fn_max_mm": Decimal("0.4500"),
                        "operating_zone_polygon": [[0.15, 1.0], [0.45, 4.5]],
                        "iso_group": "P",
                        "suitability_rank": "PRIMARY",
                    }
                ]
            elif "FROM holder_insert_compatibility" in s:
                self._rows = [
                    {
                        "seat_pocket_signature": "W-N-1270-476-G",
                        "seat_position": "MAIN",
                        "inserts_required_qty": 1,
                        "allowed_radius_min_mm": Decimal("0.400"),
                        "allowed_radius_max_mm": Decimal("1.600"),
                        "code": "PWLNR 2525M 08",
                        "category": "TURNING_EXTERNAL",
                        "clamping": "LEVER",
                        "lead_angle_deg": Decimal("95.00"),
                        "cutting_diameter_mm": None,
                        "effective_teeth_count": 1,
                    }
                ]
            elif "FROM cutting_recommendations" in s:
                self._rows = [
                    {
                        "grade_id": "10000000-0000-0000-0000-000000000001",
                        "chipbreaker_id": "20000000-0000-0000-0000-000000000001",
                        "material_subgroup_code": "P1",
                        "operation_domain": "TURNING",
                        "vc_min_m_min": Decimal("220"),
                        "vc_opt_m_min": Decimal("290"),
                        "vc_max_m_min": Decimal("360"),
                        "feed_opt_mm": Decimal("0.30"),
                        "ap_opt_mm": Decimal("2.50"),
                        "ae_ratio_opt": None,
                        "coolant_mode": "FLOOD",
                    }
                ]
        def fetchall(self):
            return self._rows
        def fetchone(self):
            return self._rows[0] if self._rows else None

    class FakeConn:
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def cursor(self):
            return FakeCursor()

    orig_pg, orig_dr = repo_mod.psycopg, repo_mod.dict_row
    try:
        repo_mod.psycopg = types.SimpleNamespace(connect=lambda *a, **kw: FakeConn())
        repo_mod.dict_row = object()
        repo = ToolingRepository(db_url="postgresql://postgres:postgres@localhost:5432/tooling_db")
        assert repo.mode == "postgres"
        inserts = repo.list_inserts("TURNING")
        assert len(inserts) == 1
        assert inserts[0]["iso_code"] == "WNMG 080408"
        assert inserts[0]["holders"][0]["code"] == "PWLNR 2525M 08"
        assert inserts[0]["recommendations"]["P1"]["vc"] == 290.0
    finally:
        repo_mod.psycopg, repo_mod.dict_row = orig_pg, orig_dr


def test_surface_roughness_and_beam_deflection():
    # Standard turning Ra: fn=0.20, RE=0.8 -> 0.04 / 25.6 * 1000 = 1.56 um
    res_std = calculate_kienzle(
        CuttingCalcInput(
            operation_domain="TURNING",
            kc1_1_mpa=1500.0,
            mc_exponent=0.25,
            vc_m_min=240.0,
            feed_mm=0.20,
            ap_mm=2.0,
            diameter_mm=50.0,
            corner_radius_mm=0.8,
            has_wiper_geometry=False,
            overhang_mm=100.0,
            shank_diameter_mm=20.0,
            shank_material="STEEL",
        )
    )
    assert res_std.ra_um == 1.56
    assert res_std.ld_ratio == 5.0
    assert res_std.deflection_mm is not None and res_std.deflection_mm > 0.05
    assert any("L/D=5.0" in w for w in res_std.warnings)
    assert any("прогиб оправки" in w for w in res_std.warnings)

    # Wiper geometry halves theoretical Ra; Carbide shank cuts deflection >2.7x
    res_carbide = calculate_kienzle(
        CuttingCalcInput(
            operation_domain="TURNING",
            kc1_1_mpa=1500.0,
            mc_exponent=0.25,
            vc_m_min=240.0,
            feed_mm=0.20,
            ap_mm=2.0,
            diameter_mm=50.0,
            corner_radius_mm=0.8,
            has_wiper_geometry=True,
            overhang_mm=100.0,
            shank_diameter_mm=20.0,
            shank_material="CARBIDE",
        )
    )
    assert res_carbide.ra_um == 0.78
    assert res_carbide.deflection_mm < res_std.deflection_mm * 0.4
    assert not any("L/D=5.0" in w for w in res_carbide.warnings)


def test_geometry3d_parametric_meshes_and_stl():
    # Negative double-sided rhombic CNMG vs positive countersunk SEKT & round RDMT
    cnmg = build_iso1832_mesh("CNMG 120408")
    assert cnmg.shape_code == "C"
    assert cnmg.clearance_angle_deg == 0.0
    assert cnmg.has_hole is True
    assert cnmg.has_countersink is False
    assert abs(cnmg.bbox_mm["z"] - 4.76) < 0.01
    assert cnmg.triangle_count >= 200

    sekt = build_iso1832_mesh("SEKT 120408")
    assert sekt.clearance_angle_deg == 20.0
    assert sekt.has_countersink is True
    assert abs(sekt.bbox_mm["x"] - 12.7) < 0.05
    assert abs(sekt.bbox_mm["y"] - 12.7) < 0.05

    # Verify outward normals on top (+Z) and bottom (-Z) faces across positive inserts
    for code in ("CCMT 09T304", "APKT 160408", "RDMT 120400", "WNMG 080408", "SPMG 090408"):
        m = build_iso1832_mesh(code)
        z_top, z_bot = m.thickness_mm / 2.0, -m.thickness_mm / 2.0
        for t in range(m.triangle_count):
            b = t * 9
            zs = (m.positions[b + 2], m.positions[b + 5], m.positions[b + 8])
            nz = m.normals[b + 2]
            if all(abs(z - z_top) < 1e-3 for z in zs):
                assert nz > 0.9, f"Inverted top face in {code}"
            if all(abs(z - z_bot) < 1e-3 for z in zs):
                assert nz < -0.9, f"Inverted bottom face in {code}"

    stl = export_iso1832_stl("WNMG 080408")
    assert stl.startswith("solid WNMG080408")
    assert "facet normal" in stl
    assert stl.strip().endswith("endsolid WNMG080408")


def test_grooving_threading_parser_and_kienzle():
    p_grv = parse_iso1832("MGMN 300")
    assert p_grv.valid is True
    assert p_grv.seat_pocket_signature == "L-N-300-476-N"
    assert p_grv.cutting_edges_count == 2

    p_thr = parse_iso1832("16ER AG60")
    assert p_thr.valid is True
    assert p_thr.seat_pocket_signature == "T-N-953-397-T"
    assert p_thr.cutting_edges_count == 3

    p_tnmg = parse_iso1832("TNMG 160408")
    assert p_tnmg.valid is True
    assert p_tnmg.seat_pocket_signature == "T-N-953-476-G"
    assert p_tnmg.cutting_edges_count == 6

    res = calculate_kienzle(
        CuttingCalcInput(
            operation_domain="GROOVING_THREADING",
            kc1_1_mpa=1500.0,
            mc_exponent=0.25,
            vc_m_min=150.0,
            feed_mm=0.10,
            ap_mm=3.0,
            diameter_mm=50.0,
        )
    )
    assert res.rpm_clamped > 900.0
    assert res.fc_n > 500.0


def test_taylor_economics_and_warehouse_csv():
    econ_stable = calculate_economics(
        EconomicsInput(
            iso_group="P",
            coating_method="CVD",
            stability="STABLE",
            vc_actual_m_min=290.0,
            vc_opt_m_min=290.0,
            mrr_cm3_min=150.0,
            volume_to_remove_cm3=75.0,
            insert_price_rub=620.0,
            cutting_edges_count=4,
            machine_rate_rub_hr=3600.0,
        )
    )
    assert econ_stable.tool_life_edge_min == 15.0
    assert econ_stable.cutting_time_part_min == 0.5
    assert econ_stable.parts_per_edge == 30.0
    assert econ_stable.total_cost_part_rub > econ_stable.machine_cost_part_rub

    # Higher speed reduces Taylor tool life sharply
    econ_fast = calculate_economics(
        EconomicsInput(
            iso_group="P",
            coating_method="CVD",
            stability="STABLE",
            vc_actual_m_min=350.0,
            vc_opt_m_min=290.0,
            mrr_cm3_min=180.0,
            volume_to_remove_cm3=75.0,
            insert_price_rub=620.0,
            cutting_edges_count=4,
            machine_rate_rub_hr=3600.0,
        )
    )
    assert econ_fast.tool_life_edge_min < econ_stable.tool_life_edge_min

    # Warehouse CSV parsing (sample + Russian headers)
    sample_csv = generate_sample_stock_csv()
    parsed = parse_stock_csv(sample_csv)
    assert len(parsed) == 27
    assert any(i.normalized_code == "CNMG120408" and i.qty == 40 for i in parsed)

    ru_csv = "Пластина;Сплав;Остаток;Цена;Ячейка\nWNMG 080408;GEN-P25-CVD;15;720,5;B-02\n"
    parsed_ru = parse_stock_csv(ru_csv)
    assert len(parsed_ru) == 1
    assert parsed_ru[0].qty == 15
    assert parsed_ru[0].unit_price_rub == 720.5

    repo = ToolingRepository(db_url="")
    assert len(repo.list_inserts("GROOVING_THREADING")) == 2
    saved_asm = repo.create_assembly({"name": "Test Setup", "iso_code": "CNMG 120408"})
    assert len(repo.list_assemblies()) == 1
    assert repo.delete_assembly(saved_asm["id"]) is True


def test_cam_exporters_gtc_fusion360_freecad():
    item = AssemblyExportItem(
        name="CNMG 120408 · P1",
        operation="TURNING",
        iso_code="CNMG 120408",
        grade_code="GEN-P25-CVD",
        chipbreaker_code="GEN-PM",
        holder_code="PCLNR 2525M 12",
        diameter_mm=60.0,
        vc_m_min=290.0,
        rpm=1538.0,
        feed_mm=0.30,
        vf_mm_min=461.0,
        ap_mm=2.5,
    )
    gtc = build_gtc_iso13399_package([item])
    assert gtc["gtc_package_information"]["standard"] == "ISO 13399"
    assert gtc["products"][0]["cutting_item"]["POCKET_SIGNATURE"] == "C-N-1270-476-G"

    f360 = build_fusion360_library([item])
    assert f360["version"] == 23
    assert f360["data"][0]["product-id"] == "CNMG 120408"

    fc = build_freecad_toolbit(item)
    assert fc["version"] == 2
    assert fc["attribute"]["holder_code"] == "PCLNR 2525M 12"


def test_axial_tooling_suite_physics_parser_and_3d():
    # 1. Parser for extended axial tools (U-drill SOMT/WCMT, Modular Crowns, Solid Carbide)
    for code, exp_sig in (
        ("SOMT 11T308", "S-O-1100-397-T"),
        ("WCMT 06T308", "W-C-953-397-T"),
        ("MOD-DRL-140", "DRL-M-1400-672-B"),
        ("MOD-DRL-200", "DRL-M-2000-960-B"),
        ("SC-DRL-080-5D", "DRL-S-800-500-I"),
        ("SC-DRL-120-8D", "DRL-S-1200-800-I"),
        ("SC-DRL-100-AL", "DRL-S-1000-500-I"),
        ("SC-DRL-060-H", "DRL-S-600-500-I"),
    ):
        p = parse_iso1832(code)
        assert p.valid is True, f"Failed axial parse for {code}: {p.error}"
        assert p.seat_pocket_signature == exp_sig, f"{code}: {p.seat_pocket_signature} != {exp_sig}"

    # 2. Deep solid carbide 8xD drilling: thrust Ff, pilot hole, coolant warning, G-code cycle
    res_deep = calculate_kienzle(
        CuttingCalcInput(
            operation_domain="DRILLING",
            kc1_1_mpa=1500.0,
            mc_exponent=0.25,
            vc_m_min=105.0,
            feed_mm=0.22,
            diameter_mm=12.0,
            hole_depth_mm=90.0,
            axial_tool_subtype="SOLID_CARBIDE",
            point_angle_deg=140.0,
            drill_ld_max=8.0,
            hole_entry_type="FLAT",
            coolant_pressure_bar=20.0,
            machine_max_rpm=12000,
            machine_max_power_kw=15.0,
            machine_max_thrust_kn=20.0,
        )
    )
    assert res_deep.axial_thrust_n is not None and res_deep.axial_thrust_n > 2000.0
    assert res_deep.drill_ld_ratio == 7.5
    assert res_deep.pilot_hole_required is True
    assert res_deep.required_coolant_bar == 40.0
    assert "Пилот 2xD" in (res_deep.recommended_cycle or "")
    assert any("Давление СОЖ" in w for w in res_deep.warnings)

    # 3. U-drill on angled entry: 40% entry feed reduction & no pecking G83
    res_udrill = calculate_kienzle(
        CuttingCalcInput(
            operation_domain="DRILLING",
            kc1_1_mpa=1700.0,
            mc_exponent=0.25,
            vc_m_min=160.0,
            feed_mm=0.12,
            diameter_mm=30.0,
            hole_depth_mm=120.0,
            axial_tool_subtype="INDEXABLE_U_DRILL",
            point_angle_deg=180.0,
            drill_ld_max=3.0,
            hole_entry_type="ANGLED_OR_CURVED",
            coolant_pressure_bar=25.0,
        )
    )
    assert res_udrill.entry_feed_mm == 0.072
    assert "БЕЗ G83" in (res_udrill.recommended_cycle or "")
    assert any("превышает вылет корпуса" in w for w in res_udrill.warnings)
    assert any("Наклонный/криволинейный вход" in w for w in res_udrill.warnings)

    # 4. 3D helical drill mesh & STL export for solid and modular drills
    m_sc = build_iso1832_mesh("SC-DRL-120-8D")
    assert m_sc.shape_code == "DRL"
    assert m_sc.triangle_count >= 500
    assert abs(m_sc.bbox_mm["x"] - 12.0) < 0.2

    stl_mod = export_iso1832_stl("MOD-DRL-200")
    assert stl_mod.startswith("solid MODDRL200")
    assert stl_mod.strip().endswith("endsolid MODDRL200")


def test_spindle_power_torque_curve():
    # BT40 15kW / 95Nm / 12000 RPM -> base speed ~= 1508 RPM
    p_lo, m_lo, n_base = evaluate_spindle_curve(500, 15.0, 95.0, 12000)
    assert 1480 <= n_base <= 1530
    assert m_lo == 95.0
    assert p_lo < 5.5  # Power is torque-limited below base speed!

    p_mid, m_mid, _ = evaluate_spindle_curve(4000, 15.0, 95.0, 12000)
    assert p_mid == 15.0
    assert m_mid < 40.0

    p_hi, _, _ = evaluate_spindle_curve(12000, 15.0, 95.0, 12000)
    assert p_hi < 15.0  # High-speed field-weakening taper

    # Verify calculate_kienzle warns when required power exceeds LOW-RPM available power on the curve
    res = calculate_kienzle(
        CuttingCalcInput(
            operation_domain="DRILLING",
            kc1_1_mpa=1700.0,
            mc_exponent=0.25,
            vc_m_min=60.0,
            feed_mm=0.20,
            diameter_mm=40.0,  # ~477 RPM -> BT40 only has ~4.7 kW!
            axial_tool_subtype="INDEXABLE_U_DRILL",
            machine_max_rpm=12000,
            machine_max_power_kw=15.0,
            machine_max_torque_nm=95.0,
        )
    )
    assert res.available_power_kw is not None and res.available_power_kw < 6.0
    assert any("кривой шпинделя" in w for w in res.warnings)


def test_threading_taps_forming_and_helical_mill():
    assert len(list_thread_standards()) >= 30

    r_cut = calculate_threading(ThreadCalcInput(thread_code="M12", iso_group="P", method="CUT_TAP", hole_type="BLIND", thread_depth_mm=24.0))
    assert r_cut.pre_drill_mm == 10.20
    assert r_cut.min_drill_depth_mm > 28.0
    assert r_cut.estimated_torque_nm > 1.0

    r_form = calculate_threading(ThreadCalcInput(thread_code="M10", iso_group="N", method="FORM_TAP", hole_type="THROUGH"))
    assert r_form.pre_drill_mm == 9.30
    assert r_form.pre_drill_mm > 8.50  # Forming tap requires larger pre-drill than cutting tap

    r_tm = calculate_threading(ThreadCalcInput(thread_code="G1/2", iso_group="M", method="THREAD_MILL", radial_passes=2))
    assert r_tm.pre_drill_mm == 19.0
    assert r_tm.vf_centerline_mm_min is not None
    assert r_tm.vf_centerline_mm_min < r_tm.vf_mm_min  # Internal helical centerline feed reduction

    r_npt = calculate_threading(ThreadCalcInput(thread_code="NPT 1/2", iso_group="P", method="FORM_TAP"))
    assert any("раскатники не применяются" in w for w in r_npt.warnings)


def test_hole_finishing_h7_it6_and_3d_tap_reamer():
    rm = calculate_hole_finishing(HoleFinishInput(target_diameter_mm=20.0, tolerance_grade="H7", hole_depth_mm=50.0, method="REAMING"))
    assert rm.upper_dev_um == 21.0
    assert rm.pre_drill_opt_mm == 19.75
    assert "G85" in rm.recommended_cycle

    fb = calculate_hole_finishing(HoleFinishInput(target_diameter_mm=30.0, tolerance_grade="IT6", hole_depth_mm=210.0, method="FINE_BORING"))
    assert fb.upper_dev_um < 21.0
    assert fb.expected_ra_um < 0.6
    assert any("антивибрационная" in w for w in fb.warnings)

    for code, exp_sig in (
        ("TAP-M12-BL", "TAP-T-1200-100-I"),
        ("FORM-M8", "TAP-F-800-100-I"),
        ("TM-M16", "TAP-T-1600-100-I"),
        ("REAM-H7-100", "RM-R-1000-700-I"),
        ("FBORE-MIC-25", "RM-B-2500-700-I"),
    ):
        p = parse_iso1832(code)
        assert p.valid is True and p.seat_pocket_signature == exp_sig
        m = build_iso1832_mesh(code)
        assert m.triangle_count >= 1000
    stl_tap = export_iso1832_stl("TAP-M12-BL")
    assert stl_tap.startswith("solid TAPM12BL")


def test_cnc_gcode_generator_fanuc_and_siemens():
    g_pilot = generate_gcode(GCodeRequest(controller="FANUC", operation="DRILLING", diameter_mm=12.0, depth_mm=90.0, rpm=2800, vf_mm_min=616, pilot_required=True))
    assert "S350 M03" in g_pilot.program_text
    assert "M88" in g_pilot.program_text

    g_tap_s = generate_gcode(GCodeRequest(controller="SIEMENS", operation="TAPPING", diameter_mm=12.0, depth_mm=24.0, pitch_mm=1.75, rpm=424, vf_mm_min=742))
    assert "CYCLE84(" in g_tap_s.program_text

    g_tm_f = generate_gcode(GCodeRequest(controller="FANUC", operation="THREAD_MILLING", diameter_mm=16.0, cutter_dc_mm=10.0, depth_mm=20.0, pitch_mm=2.0, rpm=3500, vf_mm_min=260))
    assert "G91 G03" in g_tm_f.program_text

    g_bore_f = generate_gcode(GCodeRequest(controller="FANUC", operation="FINE_BORING", diameter_mm=25.0, depth_mm=40.0, rpm=2600, vf_mm_min=210))
    assert "G98 G76" in g_bore_f.program_text

    g_turn_s = generate_gcode(GCodeRequest(controller="SIEMENS", operation="TURNING", diameter_mm=50.0, ap_mm=2.0, depth_mm=40.0, vc_m_min=290, rpm=1846, feed_mm=0.3))
    assert "G96 S290 LIMS=1846" in g_turn_s.program_text


def test_sales_catalog_search_filters_pricing_and_upsell():
    repo = ToolingRepository(db_url="")
    all_items = build_sales_catalog(repo)
    assert len(all_items) == 36

    # Russian alloy/material synonym search ("нержавейка" -> M group, "д16т" -> N group)
    ss_items = build_sales_catalog(repo, q="нержавейка", only_in_stock=True)
    assert len(ss_items) >= 5
    assert all(i.in_stock for i in ss_items)

    al_items = build_sales_catalog(repo, q="Д16Т")
    assert len(al_items) >= 3
    assert any("AL" in i.iso_code or i.iso_code == "DCMT 11T304" for i in al_items)

    # Price-per-edge sorting for Steel turning puts multi-edge economical inserts on top
    p_turn = build_sales_catalog(repo, iso_group="P", operation="TURNING", sort_by="edge_price_asc")
    assert len(p_turn) >= 5
    assert p_turn[0].price_per_edge_rub <= p_turn[-1].price_per_edge_rub
    # Standard turning inserts sell in 10-pc boxes, solid drills/taps sell by 1 pc
    assert p_turn[0].pack_qty == 10
    assert p_turn[0].holder_code is not None and p_turn[0].holder_upsell_price_rub > 0

    tap_items = build_sales_catalog(repo, q="метчик")
    assert len(tap_items) >= 3
    assert all(t.pack_qty == 1 for t in tap_items)


def test_commercial_quote_vat_discount_and_orders_crud():
    q = build_commercial_quote(
        OrderQuoteRequest(
            customer_name="ООО ПромСнаб",
            customer_inn="0274123456",
            discount_pct=10.0,
            include_vat_20=True,
            comment="Отгрузка ТК Деловые Линии",
            lines=[
                QuoteLineInput(code="WNMG 080408", description="Сталь, 6 кр.", qty=20, unit_price_rub=690.0, stock_qty=60, pack_qty=10),
                QuoteLineInput(item_type="HOLDER", code="PWLNR 2525M 08", description="Державка", qty=1, unit_price_rub=4800.0, stock_qty=5, pack_qty=1),
                QuoteLineInput(code="CNGA 120408", description="CBN", qty=10, unit_price_rub=3120.0, stock_qty=0, pack_qty=10),
            ],
        )
    )
    assert q.total_positions == 3
    assert q.total_units == 31
    assert q.subtotal_rub == 49800.0
    assert q.discount_rub == 4980.0
    assert q.total_rub == 44820.0
    assert q.vat_rub == 7470.0
    assert q.in_stock_lines_count == 2
    assert q.backorder_lines_count == 1
    assert "ООО ПромСнаб" in q.messenger_text
    assert "НДС 20%" in q.messenger_text

    repo = ToolingRepository(db_url="")
    saved = repo.create_order({"quoteNumber": q.quote_number, "total": q.total_rub})
    assert len(repo.list_orders()) == 1
    assert repo.delete_order(saved["id"]) is True


def test_drawing_dxf_and_eskd_annotation_parser():
    repo = ToolingRepository(db_url="")
    sample_dxf = "\n".join([
        "0", "SECTION", "2", "ENTITIES",
        "0", "LINE", "10", "0", "20", "0", "11", "120", "21", "0",
        "0", "CIRCLE", "10", "60", "20", "60", "40", "55",
        "0", "CIRCLE", "10", "20", "20", "60", "40", "6",
        "0", "CIRCLE", "10", "100", "20", "60", "40", "6",
        "0", "CIRCLE", "10", "60", "20", "20", "40", "6",
        "0", "CIRCLE", "10", "60", "20", "100", "40", "6",
        "0", "TEXT", "10", "10", "20", "10", "1", "Фланец 12Х18Н10Т %%c20H7 4 отв. M12 Ra 1.6",
        "0", "ENDSEC", "0", "EOF",
    ])
    parsed = parse_dxf_blueprint(sample_dxf)
    assert parsed["bbox_w_mm"] == 120.0
    assert any(c["diameter_mm"] == 12.0 and c["count"] == 4 for c in parsed["circles_by_diameter"])

    resp = analyze_uploaded_drawing(
        repo,
        DrawingAnalyzeRequest(
            filename="flange_stainless.dxf",
            content_base64=base64.b64encode(sample_dxf.encode("utf-8")).decode("ascii"),
            batch_qty=40,
            include_holders=True,
        ),
    )
    assert resp.detected_format == "DXF"
    assert resp.analysis_method == "DXF_CAD_GEOMETRY_PARSER"
    assert resp.plan.spec.iso_group == "M"
    assert resp.plan.spec.material_subgroup == "M1"
    codes = [ln.iso_code for ln in resp.plan.kit_lines]
    assert "REAM-H7-200" in codes
    assert "TAP-M12-BL" in codes
    assert any(c.startswith("SC-DRL-") for c in codes)
    # Ensure pre-drill guidance is generated for both H7 and M12
    assert any(ln.pre_drill_note and "10.20" in ln.pre_drill_note for ln in resp.plan.kit_lines)
    assert any(ln.pre_drill_note and "19.75" in ln.pre_drill_note for ln in resp.plan.kit_lines)


def test_drawing_demo_blueprints_shared_tools_and_hardened_cbn():
    repo = ToolingRepository(db_url="")
    # Hardened bushing 54 HRC -> CBN turning + IT6 fine boring + thread mill (zero milling hallucinations!)
    bushing = next(d for d in DEMO_BLUEPRINTS if d["id"] == "demo-bushing-h1")
    res_h = analyze_uploaded_drawing(
        repo,
        DrawingAnalyzeRequest(filename=bushing["filename"], notes_text=bushing["notes_text"], batch_qty=50),
    )
    assert res_h.plan.spec.iso_group == "H"
    assert res_h.plan.spec.hardness_hrc == 54.0
    h_codes = [ln.iso_code for ln in res_h.plan.kit_lines]
    assert "CNGA 120408" in h_codes
    assert "FBORE-MIC-25" in h_codes
    assert "TM-M16" in h_codes
    assert all(ln.operation_domain != "MILLING" for ln in res_h.plan.kit_lines)

    # Aluminum housing -> shared APKT 160408-AL isn't double-billed across Face Mill & Shoulder Pocket
    housing = next(d for d in DEMO_BLUEPRINTS if d["id"] == "demo-housing-n1")
    res_n = analyze_uploaded_drawing(
        repo,
        DrawingAnalyzeRequest(filename=housing["filename"], notes_text=housing["notes_text"], batch_qty=100),
    )
    assert res_n.plan.spec.iso_group == "N"
    apkt_lines = [ln for ln in res_n.plan.kit_lines if ln.iso_code == "APKT 160408-AL"]
    assert len(apkt_lines) == 2
    assert apkt_lines[0].line_total_rub > 0 and apkt_lines[1].line_total_rub == 0.0
    assert apkt_lines[1].shared_with_step == apkt_lines[0].step_no
    assert any(ln.iso_code == "FORM-M8" for ln in res_n.plan.kit_lines)
    assert any(ln.iso_code == "SC-DRL-100-AL" for ln in res_n.plan.kit_lines)


def test_cad3d_step_brep_feature_recognition_and_tooling_kit():
    repo = ToolingRepository(db_url="")

    # 1) Stepped shaft Ø65x160 with 4mm groove & Ø14 axial hole
    fn_s, step_s = generate_demo_step_file("step-shaft-p1")
    cad_s = parse_step_workpiece(step_s, fn_s)
    assert cad_s["bbox_x_mm"] == 65.0 and cad_s["bbox_z_mm"] == 160.0
    assert cad_s["max_outer_diameter_mm"] == 65.0
    assert cad_s["internal_holes_count"] == 1
    kinds_s = [f["kind"] for f in cad_s["features"]]
    assert "EXTERNAL_ROUGH" in kinds_s and "GROOVE_PARTING" in kinds_s and "HOLE_DRILL" in kinds_s

    # 2) Flange Ø120x30 (12Х18Н10Т) + ESKD notes upgrading Ø28 -> H7 & adding 4x M10
    fn_f, step_f = generate_demo_step_file("step-flange-m1")
    resp = analyze_uploaded_drawing(
        repo,
        DrawingAnalyzeRequest(
            filename=fn_f,
            content_base64=base64.b64encode(step_f.encode("utf-8")).decode("ascii"),
            notes_text="Ø28 H7, 4 отв. M10",
            batch_qty=60,
        ),
    )
    assert resp.detected_format == "STEP"
    assert resp.analysis_method == "STEP_3D_CAD_AFR"
    assert resp.cad3d_summary is not None
    assert resp.cad3d_summary["bbox_x_mm"] == 120.0 and resp.cad3d_summary["bbox_z_mm"] == 30.0
    assert resp.plan.spec.iso_group == "M"
    codes = [ln.iso_code for ln in resp.plan.kit_lines]
    assert "FBORE-MIC-25" in codes  # Ø28 H7 upgraded in-place to fine boring
    assert any(c.startswith("SC-DRL-") for c in codes)  # 6x Ø12 holes
    assert any(c.startswith("TAP-") for c in codes)  # 4x M10 thread


def test_cad3d_stl_mesh_analyzer_and_housing_step():
    repo = ToolingRepository(db_url="")

    # Prismatic housing STEP 140x100x45 (Д16Т)
    fn_h, step_h = generate_demo_step_file("step-housing-n1")
    resp_h = analyze_uploaded_drawing(
        repo,
        DrawingAnalyzeRequest(
            filename=fn_h,
            content_base64=base64.b64encode(step_h.encode("utf-8")).decode("ascii"),
            batch_qty=40,
        ),
    )
    assert resp_h.cad3d_summary["bbox_x_mm"] == 140.0
    assert resp_h.cad3d_summary["bbox_y_mm"] == 100.0
    assert resp_h.cad3d_summary["bbox_z_mm"] == 45.0
    assert resp_h.plan.spec.iso_group == "N"
    assert any(ln.iso_code == "APKT 160408-AL" for ln in resp_h.plan.kit_lines)

    # STL workpiece analyzer (using generated ASCII STL)
    stl_bytes = export_iso1832_stl("SC-DRL-120-8D").encode("utf-8")
    stl_res = parse_stl_workpiece(stl_bytes, "shaft_blank.stl")
    assert stl_res["triangle_count"] >= 500
    assert stl_res["part_volume_cm3"] > 0.0
    assert stl_res["removal_volume_cm3"] > 0.0
    assert len(stl_res["features"]) >= 1


def test_drawing_shaft_h6_vs_hole_H7_and_small_holes():
    repo = ToolingRepository(db_url="")
    tt = "Втулка Ст45, наруж. Ø50 h6, Ø58, L=70, Ra 0.8, отв. Ø32 H7, внутр. расточка Ø42, канавка шир. 6 мм, 2 отв. Ø2"
    resp = analyze_uploaded_drawing(repo, DrawingAnalyzeRequest(filename="bushing.txt", notes_text=tt, batch_qty=50))
    feats = [(f.kind, f.diameter_mm) for f in resp.plan.spec.features]
    assert ("HOLE_PRECISION", 50.0) not in feats
    assert ("HOLE_PRECISION", 32.0) in feats
    assert ("HOLE_DRILL", 2.0) in feats
    assert any(f.kind == "EXTERNAL_FINISH" for f in resp.plan.spec.features)


if __name__ == "__main__":
    test_iso1832_pg_rounding_and_expanded_codes()
    test_kienzle_turning_and_milling()
    test_repository_memory_seed_and_cross_references()
    test_repository_postgres_mock_driver()
    test_surface_roughness_and_beam_deflection()
    test_geometry3d_parametric_meshes_and_stl()
    test_grooving_threading_parser_and_kienzle()
    test_taylor_economics_and_warehouse_csv()
    test_cam_exporters_gtc_fusion360_freecad()
    test_axial_tooling_suite_physics_parser_and_3d()
    test_spindle_power_torque_curve()
    test_threading_taps_forming_and_helical_mill()
    test_hole_finishing_h7_it6_and_3d_tap_reamer()
    test_cnc_gcode_generator_fanuc_and_siemens()
    test_sales_catalog_search_filters_pricing_and_upsell()
    test_commercial_quote_vat_discount_and_orders_crud()
    test_drawing_dxf_and_eskd_annotation_parser()
    test_drawing_demo_blueprints_shared_tools_and_hardened_cbn()
    test_cad3d_step_brep_feature_recognition_and_tooling_kit()
    test_cad3d_stl_mesh_analyzer_and_housing_step()
    test_drawing_shaft_h6_vs_hole_H7_and_small_holes()
    print("ALL SKM v2.3.2 DRAWING + 3D CAD TESTS (21 SUITES) PASSED!")
