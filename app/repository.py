"""
Data Repository Layer.
Automatically connects to PostgreSQL if DATABASE_URL is configured;
otherwise runs seamlessly on an in-memory mirror of db/seed.sql for instant local prototyping.
"""

import os
from typing import Dict, Any, List, Optional

SEED_DATA: Dict[str, Any] = {
    "iso_groups": [
        {"code": "P", "name_ru": "Стали", "color_hex": "#0072CE"},
        {"code": "M", "name_ru": "Нержавеющие стали", "color_hex": "#F2C94C"},
        {"code": "K", "name_ru": "Чугуны", "color_hex": "#EB5757"},
        {"code": "N", "name_ru": "Цветные металлы", "color_hex": "#27AE60"},
        {"code": "S", "name_ru": "Жаропрочные и титан", "color_hex": "#F2994A"},
        {"code": "H", "name_ru": "Закалённые стали", "color_hex": "#828282"},
    ],
    "material_subgroups": [
        {"code": "P1", "iso_group": "P", "name_ru": "Нелегированные стали (Ст20, Ст45, S355)", "kc1_1_mpa": 1500.0, "mc_exponent": 0.250, "hb": "125–190 HB"},
        {"code": "P2", "iso_group": "P", "name_ru": "Низколегированные стали (40Х, 30ХГСА, 42CrMo4)", "kc1_1_mpa": 1700.0, "mc_exponent": 0.250, "hb": "180–275 HB"},
        {"code": "M1", "iso_group": "M", "name_ru": "Аустенитные нерж. (12Х18Н10Т, AISI 304/316L)", "kc1_1_mpa": 1800.0, "mc_exponent": 0.210, "hb": "150–220 HB"},
        {"code": "K1", "iso_group": "K", "name_ru": "Серый чугун (СЧ20, СЧ25, GG25)", "kc1_1_mpa": 1150.0, "mc_exponent": 0.280, "hb": "160–240 HB"},
        {"code": "N1", "iso_group": "N", "name_ru": "Алюминиевые сплавы (Д16Т, АМг6, 6061-T6)", "kc1_1_mpa": 450.0, "mc_exponent": 0.250, "hb": "60–120 HB"},
        {"code": "S2", "iso_group": "S", "name_ru": "Титановые сплавы (ВТ6, Ti-6Al-4V)", "kc1_1_mpa": 1450.0, "mc_exponent": 0.230, "hb": "280–350 HB"},
        {"code": "H1", "iso_group": "H", "name_ru": "Закалённые стали 48–58 HRC (Х12МФ, D2)", "kc1_1_mpa": 3200.0, "mc_exponent": 0.300, "hb": "48–58 HRC"},
    ],
    "machines": [
        {"id": "m1", "name": "Токарно-фрезерный центр (BMT55)", "machine_type": "TURN_MILL", "max_rpm": 4500, "spindle_power_kw": 18.5, "max_torque_nm": 320.0, "rigidity_class": "HIGH"},
        {"id": "m2", "name": "Вертикальный фрезерный ОЦ (BT40)", "machine_type": "MILL_3AX", "max_rpm": 12000, "spindle_power_kw": 15.0, "max_torque_nm": 95.0, "rigidity_class": "MEDIUM"},
        {"id": "m3", "name": "Универсальный токарный ЧПУ (лёгкий)", "machine_type": "LATHE", "max_rpm": 3000, "spindle_power_kw": 7.5, "max_torque_nm": 160.0, "rigidity_class": "LOW"},
    ],
    "inserts": [
        {
            "id": "ins-1", "iso_code": "CNMG 120408", "operation_domain": "TURNING",
            "shape_code": "C", "clearance_angle_deg": 0, "ic_mm": 12.7, "thickness_mm": 4.76, "corner_radius_mm": 0.8,
            "cutting_edges_count": 4, "is_double_sided": True, "has_wiper_geometry": False,
            "seat_pocket_signature": "C-N-1270-476-G", "relative_cost_index": 1.00,
            "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN",
            "toughness_index": 6, "wear_resistance_index": 8,
            "suitability": {"P": "PRIMARY", "K": "SECONDARY"},
            "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.8, "ap_max_mm": 4.5, "fn_min_mm": 0.15, "fn_max_mm": 0.45,
            "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.20, 4.0], [0.15, 2.2]],
            "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}],
            "recommendations": {
                "P1": {"vc": 290, "vc_min": 220, "vc_max": 360, "feed": 0.30, "ap": 2.5, "coolant": "FLOOD"},
                "P2": {"vc": 240, "vc_min": 180, "vc_max": 300, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"},
                "K1": {"vc": 260, "vc_min": 200, "vc_max": 320, "feed": 0.32, "ap": 2.5, "coolant": "DRY"},
            }
        },
        {
            "id": "ins-2", "iso_code": "CNMG 120404", "operation_domain": "TURNING",
            "shape_code": "C", "clearance_angle_deg": 0, "ic_mm": 12.7, "thickness_mm": 4.76, "corner_radius_mm": 0.4,
            "cutting_edges_count": 4, "is_double_sided": True, "has_wiper_geometry": False,
            "seat_pocket_signature": "C-N-1270-476-G", "relative_cost_index": 1.15,
            "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN",
            "toughness_index": 8, "wear_resistance_index": 6,
            "suitability": {"M": "PRIMARY", "S": "PRIMARY", "P": "SECONDARY"},
            "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP",
            "ap_min_mm": 0.25, "ap_max_mm": 2.0, "fn_min_mm": 0.08, "fn_max_mm": 0.25,
            "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.10, 1.6]],
            "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}],
            "recommendations": {
                "M1": {"vc": 165, "vc_min": 120, "vc_max": 210, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"},
                "S2": {"vc": 55, "vc_min": 40, "vc_max": 75, "feed": 0.12, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P1": {"vc": 230, "vc_min": 180, "vc_max": 280, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"},
                "P2": {"vc": 195, "vc_min": 150, "vc_max": 240, "feed": 0.15, "ap": 1.0, "coolant": "FLOOD"},
            }
        },
        {
            "id": "ins-3", "iso_code": "CCMT 09T304", "operation_domain": "TURNING",
            "shape_code": "C", "clearance_angle_deg": 7, "ic_mm": 9.525, "thickness_mm": 3.97, "corner_radius_mm": 0.4,
            "cutting_edges_count": 2, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "C-C-953-397-T", "relative_cost_index": 0.90,
            "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN",
            "toughness_index": 8, "wear_resistance_index": 6,
            "suitability": {"M": "PRIMARY", "S": "PRIMARY", "P": "SECONDARY"},
            "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP",
            "ap_min_mm": 0.25, "ap_max_mm": 2.0, "fn_min_mm": 0.08, "fn_max_mm": 0.25,
            "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.10, 1.6]],
            "holders": [{"code": "S20R-SCLCR 09", "category": "BORING_BAR", "lead_angle_deg": 95.0, "clamping": "SCREW"}],
            "recommendations": {
                "M1": {"vc": 155, "vc_min": 110, "vc_max": 195, "feed": 0.14, "ap": 0.8, "coolant": "FLOOD"},
                "P1": {"vc": 220, "vc_min": 160, "vc_max": 270, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"},
                "S2": {"vc": 50, "vc_min": 35, "vc_max": 68, "feed": 0.10, "ap": 0.6, "coolant": "HIGH_PRESSURE_THROUGH"},
            }
        },
        {
            "id": "ins-4", "iso_code": "APKT 160408", "operation_domain": "MILLING",
            "shape_code": "A", "clearance_angle_deg": 11, "ic_mm": 9.525, "thickness_mm": 4.76, "corner_radius_mm": 0.8,
            "cutting_edges_count": 2, "is_double_sided": False, "has_wiper_geometry": True,
            "seat_pocket_signature": "A-P-953-476-T", "relative_cost_index": 1.20,
            "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN",
            "toughness_index": 8, "wear_resistance_index": 7,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"},
            "chipbreaker_code": "GEN-GM", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED",
            "ap_min_mm": 0.5, "ap_max_mm": 10.0, "fn_min_mm": 0.08, "fn_max_mm": 0.22,
            "operating_zone_polygon": [[0.08, 0.5], [0.22, 0.8], [0.18, 10.0], [0.08, 8.0]],
            "holders": [{"code": "SHM-AP16-D50-Z5", "category": "SHOULDER_MILL", "lead_angle_deg": 90.0, "dc_mm": 50.0, "z": 5, "clamping": "SCREW"}],
            "recommendations": {
                "P1": {"vc": 210, "vc_min": 160, "vc_max": 260, "feed": 0.15, "ap": 3.5, "ae_ratio": 0.50, "coolant": "AIR_BLAST"},
                "P2": {"vc": 185, "vc_min": 140, "vc_max": 230, "feed": 0.14, "ap": 3.0, "ae_ratio": 0.50, "coolant": "AIR_BLAST"},
                "M1": {"vc": 135, "vc_min": 100, "vc_max": 170, "feed": 0.12, "ap": 2.5, "ae_ratio": 0.40, "coolant": "FLOOD"},
                "K1": {"vc": 220, "vc_min": 170, "vc_max": 270, "feed": 0.16, "ap": 4.0, "ae_ratio": 0.60, "coolant": "DRY"},
            }
        },
        {
            "id": "ins-5", "iso_code": "APKT 160408-AL", "operation_domain": "MILLING",
            "shape_code": "A", "clearance_angle_deg": 11, "ic_mm": 9.525, "thickness_mm": 4.76, "corner_radius_mm": 0.8,
            "cutting_edges_count": 2, "is_double_sided": False, "has_wiper_geometry": True,
            "seat_pocket_signature": "A-P-953-476-T", "relative_cost_index": 1.25,
            "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron",
            "toughness_index": 7, "wear_resistance_index": 7,
            "suitability": {"N": "PRIMARY"},
            "chipbreaker_code": "GEN-AL", "application_class": "ALUMINUM_SHARP", "edge_prep": "SHARP",
            "ap_min_mm": 0.5, "ap_max_mm": 12.0, "fn_min_mm": 0.05, "fn_max_mm": 0.25,
            "operating_zone_polygon": [[0.05, 0.5], [0.25, 1.0], [0.20, 12.0], [0.05, 10.0]],
            "holders": [{"code": "SHM-AP16-D50-Z5", "category": "SHOULDER_MILL", "lead_angle_deg": 90.0, "dc_mm": 50.0, "z": 5, "clamping": "SCREW"}],
            "recommendations": {
                "N1": {"vc": 650, "vc_min": 400, "vc_max": 900, "feed": 0.15, "ap": 4.0, "ae_ratio": 0.60, "coolant": "FLOOD"},
            }
        },
        {
            "id": "ins-6", "iso_code": "WCMX 050308", "operation_domain": "DRILLING",
            "shape_code": "W", "clearance_angle_deg": 7, "ic_mm": 7.938, "thickness_mm": 3.18, "corner_radius_mm": 0.8,
            "cutting_edges_count": 3, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "W-C-794-318-X", "relative_cost_index": 1.10,
            "grade_code": "GEN-DRL-CORE", "coating_method": "PVD", "coating_composition": "TiAlN",
            "toughness_index": 9, "wear_resistance_index": 5,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY"},
            "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.06, "fn_max_mm": 0.16,
            "operating_zone_polygon": [],
            "holders": [{"code": "UDRL-WCMX05-D26-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 26.0, "z": 1, "clamping": "SCREW"}],
            "recommendations": {
                "P1": {"vc": 160, "vc_min": 120, "vc_max": 200, "feed": 0.11, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P2": {"vc": 135, "vc_min": 100, "vc_max": 170, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 110, "vc_min": 80, "vc_max": 140, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            }
        }
    ]
}


class ToolingRepository:
    def __init__(self) -> None:
        self.db_url = os.getenv("DATABASE_URL")
        self.mode = "postgres" if self.db_url else "memory_seed"

    def get_meta(self) -> Dict[str, Any]:
        return {
            "storage_mode": self.mode,
            "iso_groups": SEED_DATA["iso_groups"],
            "material_subgroups": SEED_DATA["material_subgroups"],
            "machines": SEED_DATA["machines"],
        }

    def get_subgroup(self, code: str) -> Optional[Dict[str, Any]]:
        for sg in SEED_DATA["material_subgroups"]:
            if sg["code"] == code:
                return sg
        return None

    def get_machine(self, machine_id: str) -> Optional[Dict[str, Any]]:
        for m in SEED_DATA["machines"]:
            if m["id"] == machine_id:
                return m
        return None

    def list_inserts(self, operation_domain: Optional[str] = None) -> List[Dict[str, Any]]:
        if not operation_domain:
            return SEED_DATA["inserts"]
        return [i for i in SEED_DATA["inserts"] if i["operation_domain"] == operation_domain]
