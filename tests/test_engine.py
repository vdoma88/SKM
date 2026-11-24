import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.iso1832 import parse_iso1832
from app.kienzle import calculate_kienzle, CuttingCalcInput


def test_iso1832_turning_cnmg():
    p = parse_iso1832("CNMG 120408")
    assert p.valid is True
    assert p.shape_code == "C"
    assert p.ic_mm == 12.7
    assert p.thickness_mm == 4.76
    assert p.corner_radius_mm == 0.8
    assert p.seat_pocket_signature == "C-N-1270-476-G"
    assert p.cutting_edges_count == 4


def test_iso1832_positive_ccmt_and_milling_suffix():
    p2 = parse_iso1832("CCMT 09T304")
    assert p2.valid is True
    assert p2.thickness_mm == 3.97
    assert p2.seat_pocket_signature in ("C-C-952-397-T", "C-C-953-397-T")

    p3 = parse_iso1832("APKT 160408-AL")
    assert p3.valid is True
    assert p3.suffix == "AL"


def test_kienzle_turning():
    res = calculate_kienzle(
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
            chipbreaker_polygon=[
                [0.15, 1.0],
                [0.22, 0.8],
                [0.45, 1.2],
                [0.42, 4.5],
                [0.20, 4.0],
                [0.15, 2.2],
            ],
        )
    )
    assert res.in_chipbreaker_zone is True
    assert 5.0 < res.power_motor_kw < 15.0
    assert res.fc_n > 1000


def test_kienzle_milling_chip_thinning():
    res = calculate_kienzle(
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
    assert res.chip_thinning_factor > 1.5
    assert res.mrr_cm3_min > 10.0


if __name__ == "__main__":
    test_iso1832_turning_cnmg()
    test_iso1832_positive_ccmt_and_milling_suffix()
    test_kienzle_turning()
    test_kienzle_milling_chip_thinning()
    print("All engine tests passed.")
