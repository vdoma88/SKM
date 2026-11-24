import sys
import types
from decimal import Decimal
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.geometry3d import build_iso1832_mesh, export_iso1832_stl
from app.iso1832 import parse_iso1832
from app.kienzle import calculate_kienzle, CuttingCalcInput
import app.repository as repo_mod
from app.repository import ToolingRepository


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
    assert len(repo.list_inserts()) == 17
    assert len(repo.list_inserts("TURNING")) == 10
    assert len(repo.list_inserts("MILLING")) == 4
    assert len(repo.list_inserts("DRILLING")) == 3

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


if __name__ == "__main__":
    test_iso1832_pg_rounding_and_expanded_codes()
    test_kienzle_turning_and_milling()
    test_repository_memory_seed_and_cross_references()
    test_repository_postgres_mock_driver()
    test_surface_roughness_and_beam_deflection()
    test_geometry3d_parametric_meshes_and_stl()
    print("ALL SKM v0.4 TESTS (INCLUDING 3D GEOMETRY & STL) PASSED!")
