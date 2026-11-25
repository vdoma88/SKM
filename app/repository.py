"""
Data Repository Layer (PostgreSQL via psycopg3 + In-Memory Seed Fallback).

Connects to PostgreSQL when DATABASE_URL is configured and queries
`v_insert_selector_catalog`, `material_subgroups`, `machine_profiles`,
`holder_insert_compatibility`, `cutting_recommendations`, and `insert_cross_references`.
Falls back to an in-memory mirror of db/seed.sql if DATABASE_URL is unset.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional
import json
from uuid import UUID, uuid4
from app.inventory import DEFAULT_STOCK_ITEMS, normalize_iso_key

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # pragma: no cover
    psycopg = None  # type: ignore[assignment]
    dict_row = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

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
        {"code": "P3", "iso_group": "P", "name_ru": "Высоколегированные и инструм. стали (Х12МФ, H13)", "kc1_1_mpa": 1950.0, "mc_exponent": 0.250, "hb": "250–330 HB"},
        {"code": "M1", "iso_group": "M", "name_ru": "Аустенитные нерж. (12Х18Н10Т, AISI 304/316L)", "kc1_1_mpa": 1800.0, "mc_exponent": 0.210, "hb": "150–220 HB"},
        {"code": "M2", "iso_group": "M", "name_ru": "Дуплексные нерж. (SAF 2205, 08Х22Н6Т)", "kc1_1_mpa": 2000.0, "mc_exponent": 0.210, "hb": "220–290 HB"},
        {"code": "K1", "iso_group": "K", "name_ru": "Серый чугун (СЧ20, СЧ25, GG25)", "kc1_1_mpa": 1150.0, "mc_exponent": 0.280, "hb": "160–240 HB"},
        {"code": "K2", "iso_group": "K", "name_ru": "Высокопрочный чугун ВЧ (ВЧ50, GGG50)", "kc1_1_mpa": 1350.0, "mc_exponent": 0.280, "hb": "180–270 HB"},
        {"code": "N1", "iso_group": "N", "name_ru": "Алюминиевые сплавы (Д16Т, АМг6, 6061-T6)", "kc1_1_mpa": 450.0, "mc_exponent": 0.250, "hb": "60–120 HB"},
        {"code": "N2", "iso_group": "N", "name_ru": "Медь и латунь (ЛС59-1, БрАЖ9-4)", "kc1_1_mpa": 750.0, "mc_exponent": 0.240, "hb": "70–140 HB"},
        {"code": "S1", "iso_group": "S", "name_ru": "Никелевые суперсплавы (Inconel 718, ХН77ТЮР)", "kc1_1_mpa": 2600.0, "mc_exponent": 0.240, "hb": "260–380 HB"},
        {"code": "S2", "iso_group": "S", "name_ru": "Титановые сплавы (ВТ6, Ti-6Al-4V)", "kc1_1_mpa": 1450.0, "mc_exponent": 0.230, "hb": "280–350 HB"},
        {"code": "H1", "iso_group": "H", "name_ru": "Закалённые стали 48–58 HRC (Х12МФ, ШХ15, D2)", "kc1_1_mpa": 3200.0, "mc_exponent": 0.300, "hb": "48–58 HRC"},
    ],
    "machines": [
        {"id": "m1", "name": "Токарно-фрезерный центр (BMT55)", "machine_type": "TURN_MILL", "max_rpm": 4500, "spindle_power_kw": 18.5, "max_torque_nm": 320.0, "coolant_pressure_bar": 20.0, "max_thrust_kn": 28.0, "rigidity_class": "HIGH"},
        {"id": "m2", "name": "Вертикальный фрезерный ОЦ (BT40)", "machine_type": "MILL_3AX", "max_rpm": 12000, "spindle_power_kw": 15.0, "max_torque_nm": 95.0, "coolant_pressure_bar": 25.0, "max_thrust_kn": 20.0, "rigidity_class": "MEDIUM"},
        {"id": "m3", "name": "Универсальный токарный ЧПУ (лёгкий)", "machine_type": "LATHE", "max_rpm": 3000, "spindle_power_kw": 7.5, "max_torque_nm": 160.0, "coolant_pressure_bar": 10.0, "max_thrust_kn": 12.0, "rigidity_class": "LOW"},
    ],
    "inserts": [
        # --- TURNING (10) ---
        {
            "id": "ins-1", "iso_code": "CNMG 120408", "operation_domain": "TURNING",
            "shape_code": "C", "clearance_angle_deg": 0.0, "ic_mm": 12.7, "thickness_mm": 4.76, "corner_radius_mm": 0.8,
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
                "P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.30, "ap": 2.5, "coolant": "FLOOD"},
                "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"},
                "P3": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.24, "ap": 2.0, "coolant": "FLOOD"},
                "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"},
            },
        },
        {
            "id": "ins-2", "iso_code": "CNMG 120404", "operation_domain": "TURNING",
            "shape_code": "C", "clearance_angle_deg": 0.0, "ic_mm": 12.7, "thickness_mm": 4.76, "corner_radius_mm": 0.4,
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
                "M1": {"vc": 165.0, "vc_min": 120.0, "vc_max": 210.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"},
                "M2": {"vc": 125.0, "vc_min": 90.0, "vc_max": 160.0, "feed": 0.14, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S2": {"vc": 55.0, "vc_min": 40.0, "vc_max": 75.0, "feed": 0.12, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P1": {"vc": 230.0, "vc_min": 180.0, "vc_max": 280.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"},
            },
        },
        {
            "id": "ins-3", "iso_code": "CCMT 09T304", "operation_domain": "TURNING",
            "shape_code": "C", "clearance_angle_deg": 7.0, "ic_mm": 9.525, "thickness_mm": 3.97, "corner_radius_mm": 0.4,
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
                "M1": {"vc": 155.0, "vc_min": 110.0, "vc_max": 195.0, "feed": 0.14, "ap": 0.8, "coolant": "FLOOD"},
                "P1": {"vc": 220.0, "vc_min": 160.0, "vc_max": 270.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"},
                "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 68.0, "feed": 0.10, "ap": 0.6, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-7", "iso_code": "WNMG 080408", "operation_domain": "TURNING",
            "shape_code": "W", "clearance_angle_deg": 0.0, "ic_mm": 12.7, "thickness_mm": 4.76, "corner_radius_mm": 0.8,
            "cutting_edges_count": 6, "is_double_sided": True, "has_wiper_geometry": False,
            "seat_pocket_signature": "W-N-1270-476-G", "relative_cost_index": 1.05,
            "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN",
            "toughness_index": 6, "wear_resistance_index": 8,
            "suitability": {"P": "PRIMARY", "K": "SECONDARY"},
            "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.8, "ap_max_mm": 4.5, "fn_min_mm": 0.15, "fn_max_mm": 0.45,
            "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.20, 4.0], [0.15, 2.2]],
            "holders": [{"code": "PWLNR 2525M 08", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}],
            "recommendations": {
                "P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.30, "ap": 2.5, "coolant": "FLOOD"},
                "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"},
                "P3": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.24, "ap": 2.0, "coolant": "FLOOD"},
                "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"},
            },
        },
        {
            "id": "ins-8", "iso_code": "WNMG 080412", "operation_domain": "TURNING",
            "shape_code": "W", "clearance_angle_deg": 0.0, "ic_mm": 12.7, "thickness_mm": 4.76, "corner_radius_mm": 1.2,
            "cutting_edges_count": 6, "is_double_sided": True, "has_wiper_geometry": False,
            "seat_pocket_signature": "W-N-1270-476-G", "relative_cost_index": 1.12,
            "grade_code": "GEN-P35-TOUGH", "coating_method": "CVD", "coating_composition": "MT-TiCN-Al2O3",
            "toughness_index": 8, "wear_resistance_index": 6,
            "suitability": {"P": "PRIMARY", "M": "SECONDARY"},
            "chipbreaker_code": "GEN-PR", "application_class": "ROUGHING", "edge_prep": "CHAMFERED_HONED",
            "ap_min_mm": 1.5, "ap_max_mm": 6.5, "fn_min_mm": 0.25, "fn_max_mm": 0.65,
            "operating_zone_polygon": [[0.25, 1.8], [0.35, 1.5], [0.65, 2.0], [0.58, 6.5], [0.30, 6.0], [0.25, 3.5]],
            "holders": [{"code": "PWLNR 2525M 08", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}],
            "recommendations": {
                "P1": {"vc": 245.0, "vc_min": 180.0, "vc_max": 310.0, "feed": 0.42, "ap": 3.8, "coolant": "FLOOD"},
                "P2": {"vc": 205.0, "vc_min": 150.0, "vc_max": 260.0, "feed": 0.38, "ap": 3.5, "coolant": "FLOOD"},
                "M1": {"vc": 145.0, "vc_min": 110.0, "vc_max": 180.0, "feed": 0.32, "ap": 3.0, "coolant": "FLOOD"},
            },
        },
        {
            "id": "ins-9", "iso_code": "DNMG 150608", "operation_domain": "TURNING",
            "shape_code": "D", "clearance_angle_deg": 0.0, "ic_mm": 12.7, "thickness_mm": 6.35, "corner_radius_mm": 0.8,
            "cutting_edges_count": 4, "is_double_sided": True, "has_wiper_geometry": False,
            "seat_pocket_signature": "D-N-1270-635-G", "relative_cost_index": 1.25,
            "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN",
            "toughness_index": 6, "wear_resistance_index": 8,
            "suitability": {"P": "PRIMARY", "K": "SECONDARY"},
            "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.8, "ap_max_mm": 4.5, "fn_min_mm": 0.15, "fn_max_mm": 0.45,
            "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.20, 4.0], [0.15, 2.2]],
            "holders": [{"code": "PDJNR 2525M 15", "category": "TURNING_EXTERNAL", "lead_angle_deg": 93.0, "clamping": "LEVER"}],
            "recommendations": {
                "P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.30, "ap": 2.5, "coolant": "FLOOD"},
                "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"},
                "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"},
            },
        },
        {
            "id": "ins-10", "iso_code": "VNMG 160404", "operation_domain": "TURNING",
            "shape_code": "V", "clearance_angle_deg": 0.0, "ic_mm": 9.525, "thickness_mm": 4.76, "corner_radius_mm": 0.4,
            "cutting_edges_count": 4, "is_double_sided": True, "has_wiper_geometry": False,
            "seat_pocket_signature": "V-N-953-476-G", "relative_cost_index": 1.35,
            "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano",
            "toughness_index": 7, "wear_resistance_index": 8,
            "suitability": {"S": "PRIMARY", "M": "PRIMARY"},
            "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP",
            "ap_min_mm": 0.25, "ap_max_mm": 2.0, "fn_min_mm": 0.08, "fn_max_mm": 0.25,
            "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.10, 1.6]],
            "holders": [{"code": "MVJNR 2525M 16", "category": "TURNING_EXTERNAL", "lead_angle_deg": 93.0, "clamping": "TOP_CLAMP"}],
            "recommendations": {
                "S1": {"vc": 40.0, "vc_min": 25.0, "vc_max": 55.0, "feed": 0.12, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S2": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.14, "ap": 1.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 175.0, "vc_min": 130.0, "vc_max": 220.0, "feed": 0.15, "ap": 1.0, "coolant": "FLOOD"},
            },
        },
        {
            "id": "ins-11", "iso_code": "SNMG 120412", "operation_domain": "TURNING",
            "shape_code": "S", "clearance_angle_deg": 0.0, "ic_mm": 12.7, "thickness_mm": 4.76, "corner_radius_mm": 1.2,
            "cutting_edges_count": 8, "is_double_sided": True, "has_wiper_geometry": False,
            "seat_pocket_signature": "S-N-1270-476-G", "relative_cost_index": 1.10,
            "grade_code": "GEN-K15-CVD", "coating_method": "CVD", "coating_composition": "Thick Al2O3-TiCN",
            "toughness_index": 5, "wear_resistance_index": 9,
            "suitability": {"K": "PRIMARY", "P": "SECONDARY"},
            "chipbreaker_code": "GEN-KR", "application_class": "ROUGHING", "edge_prep": "CHAMFERED",
            "ap_min_mm": 1.0, "ap_max_mm": 6.0, "fn_min_mm": 0.20, "fn_max_mm": 0.60,
            "operating_zone_polygon": [[0.20, 1.0], [0.60, 1.2], [0.55, 6.0], [0.20, 5.5]],
            "holders": [{"code": "PSBNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 75.0, "clamping": "LEVER"}],
            "recommendations": {
                "K1": {"vc": 340.0, "vc_min": 260.0, "vc_max": 420.0, "feed": 0.35, "ap": 3.0, "coolant": "DRY"},
                "K2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.32, "ap": 2.8, "coolant": "FLOOD"},
                "P1": {"vc": 270.0, "vc_min": 210.0, "vc_max": 330.0, "feed": 0.34, "ap": 3.0, "coolant": "FLOOD"},
            },
        },
        {
            "id": "ins-12", "iso_code": "DCMT 11T304", "operation_domain": "TURNING",
            "shape_code": "D", "clearance_angle_deg": 7.0, "ic_mm": 9.525, "thickness_mm": 3.97, "corner_radius_mm": 0.4,
            "cutting_edges_count": 2, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "D-C-953-397-T", "relative_cost_index": 0.95,
            "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron",
            "toughness_index": 7, "wear_resistance_index": 7,
            "suitability": {"N": "PRIMARY"},
            "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP",
            "ap_min_mm": 0.25, "ap_max_mm": 2.0, "fn_min_mm": 0.08, "fn_max_mm": 0.25,
            "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.10, 1.6]],
            "holders": [{"code": "S16Q-SDUCR 11", "category": "BORING_BAR", "lead_angle_deg": 93.0, "clamping": "SCREW"}],
            "recommendations": {
                "N1": {"vc": 700.0, "vc_min": 450.0, "vc_max": 1000.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"},
                "N2": {"vc": 320.0, "vc_min": 220.0, "vc_max": 450.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"},
            },
        },
        {
            "id": "ins-13", "iso_code": "CNGA 120408", "operation_domain": "TURNING",
            "shape_code": "C", "clearance_angle_deg": 0.0, "ic_mm": 12.7, "thickness_mm": 4.76, "corner_radius_mm": 0.8,
            "cutting_edges_count": 4, "is_double_sided": True, "has_wiper_geometry": False,
            "seat_pocket_signature": "C-N-1270-476-A", "relative_cost_index": 4.80,
            "grade_code": "GEN-H10-CBN", "coating_method": "PVD", "coating_composition": "TiAlN-CBN",
            "toughness_index": 3, "wear_resistance_index": 10,
            "suitability": {"H": "PRIMARY", "K": "SECONDARY"},
            "chipbreaker_code": "GEN-HCBN", "application_class": "FINISHING", "edge_prep": "CHAMFERED",
            "ap_min_mm": 0.08, "ap_max_mm": 0.8, "fn_min_mm": 0.05, "fn_max_mm": 0.18,
            "operating_zone_polygon": [[0.05, 0.10], [0.12, 0.08], [0.18, 0.15], [0.16, 0.80], [0.06, 0.65]],
            "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}],
            "recommendations": {
                "H1": {"vc": 155.0, "vc_min": 110.0, "vc_max": 200.0, "feed": 0.10, "ap": 0.25, "coolant": "DRY"},
                "K1": {"vc": 480.0, "vc_min": 350.0, "vc_max": 620.0, "feed": 0.14, "ap": 0.40, "coolant": "DRY"},
            },
        },
        # --- MILLING (4) ---
        {
            "id": "ins-4", "iso_code": "APKT 160408", "operation_domain": "MILLING",
            "shape_code": "A", "clearance_angle_deg": 11.0, "ic_mm": 9.525, "thickness_mm": 4.76, "corner_radius_mm": 0.8,
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
                "P1": {"vc": 210.0, "vc_min": 160.0, "vc_max": 260.0, "feed": 0.15, "ap": 3.5, "ae_ratio": 0.50, "coolant": "AIR_BLAST"},
                "P2": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.14, "ap": 3.0, "ae_ratio": 0.50, "coolant": "AIR_BLAST"},
                "M1": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.12, "ap": 2.5, "ae_ratio": 0.40, "coolant": "FLOOD"},
                "K1": {"vc": 220.0, "vc_min": 170.0, "vc_max": 270.0, "feed": 0.16, "ap": 4.0, "ae_ratio": 0.60, "coolant": "DRY"},
            },
        },
        {
            "id": "ins-5", "iso_code": "APKT 160408-AL", "operation_domain": "MILLING",
            "shape_code": "A", "clearance_angle_deg": 11.0, "ic_mm": 9.525, "thickness_mm": 4.76, "corner_radius_mm": 0.8,
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
                "N1": {"vc": 650.0, "vc_min": 400.0, "vc_max": 900.0, "feed": 0.15, "ap": 4.0, "ae_ratio": 0.60, "coolant": "FLOOD"},
                "N2": {"vc": 320.0, "vc_min": 220.0, "vc_max": 420.0, "feed": 0.14, "ap": 3.0, "ae_ratio": 0.55, "coolant": "FLOOD"},
            },
        },
        {
            "id": "ins-14", "iso_code": "SEKT 120408", "operation_domain": "MILLING",
            "shape_code": "S", "clearance_angle_deg": 20.0, "ic_mm": 12.7, "thickness_mm": 4.76, "corner_radius_mm": 0.8,
            "cutting_edges_count": 4, "is_double_sided": False, "has_wiper_geometry": True,
            "seat_pocket_signature": "S-E-1270-476-T", "relative_cost_index": 1.30,
            "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN",
            "toughness_index": 8, "wear_resistance_index": 7,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"},
            "chipbreaker_code": "GEN-FM45", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED",
            "ap_min_mm": 0.5, "ap_max_mm": 5.5, "fn_min_mm": 0.10, "fn_max_mm": 0.30,
            "operating_zone_polygon": [[0.10, 0.5], [0.30, 0.8], [0.26, 5.5], [0.10, 5.0]],
            "holders": [{"code": "FM45-SE12-D80-Z6", "category": "FACE_MILL", "lead_angle_deg": 45.0, "dc_mm": 80.0, "z": 6, "clamping": "SCREW"}],
            "recommendations": {
                "P1": {"vc": 235.0, "vc_min": 180.0, "vc_max": 290.0, "feed": 0.22, "ap": 3.0, "ae_ratio": 0.65, "coolant": "AIR_BLAST"},
                "P2": {"vc": 200.0, "vc_min": 155.0, "vc_max": 250.0, "feed": 0.19, "ap": 2.8, "ae_ratio": 0.65, "coolant": "AIR_BLAST"},
                "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.24, "ap": 3.5, "ae_ratio": 0.70, "coolant": "DRY"},
                "M1": {"vc": 145.0, "vc_min": 110.0, "vc_max": 180.0, "feed": 0.16, "ap": 2.5, "ae_ratio": 0.55, "coolant": "FLOOD"},
            },
        },
        {
            "id": "ins-15", "iso_code": "RDMT 120400", "operation_domain": "MILLING",
            "shape_code": "R", "clearance_angle_deg": 15.0, "ic_mm": 12.0, "thickness_mm": 4.76, "corner_radius_mm": 6.0,
            "cutting_edges_count": 6, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "R-D-1200-476-T", "relative_cost_index": 1.40,
            "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano",
            "toughness_index": 7, "wear_resistance_index": 8,
            "suitability": {"S": "PRIMARY", "M": "PRIMARY"},
            "chipbreaker_code": "GEN-RND", "application_class": "ROUGHING", "edge_prep": "HONED",
            "ap_min_mm": 0.5, "ap_max_mm": 5.0, "fn_min_mm": 0.12, "fn_max_mm": 0.35,
            "operating_zone_polygon": [[0.12, 0.5], [0.35, 0.8], [0.30, 5.0], [0.12, 4.5]],
            "holders": [{"code": "CM-RD12-D50-Z4", "category": "COPY_MILL", "lead_angle_deg": 45.0, "dc_mm": 50.0, "z": 4, "clamping": "SCREW"}],
            "recommendations": {
                "S1": {"vc": 38.0, "vc_min": 25.0, "vc_max": 52.0, "feed": 0.20, "ap": 1.5, "ae_ratio": 0.35, "coolant": "FLOOD"},
                "S2": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.22, "ap": 2.0, "ae_ratio": 0.40, "coolant": "FLOOD"},
                "M1": {"vc": 150.0, "vc_min": 110.0, "vc_max": 190.0, "feed": 0.24, "ap": 2.5, "ae_ratio": 0.50, "coolant": "FLOOD"},
            },
        },
        # --- AXIAL DRILLING (3) ---
        {
            "id": "ins-6", "iso_code": "WCMX 050308", "operation_domain": "DRILLING",
            "shape_code": "W", "clearance_angle_deg": 7.0, "ic_mm": 7.938, "thickness_mm": 3.18, "corner_radius_mm": 0.8,
            "cutting_edges_count": 3, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "W-C-794-318-X", "relative_cost_index": 1.10,
            "grade_code": "GEN-DRL-CORE", "coating_method": "PVD", "coating_composition": "TiAlN",
            "toughness_index": 9, "wear_resistance_index": 5,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"},
            "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.06, "fn_max_mm": 0.16,
            "operating_zone_polygon": [],
            "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 3.0, "tolerance_hole": "IT11",
            "holders": [{"code": "UDRL-WCMX05-D26-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 26.0, "z": 1, "ld_ratio_max": 3.0, "clamping": "SCREW"}],
            "recommendations": {
                "P1": {"vc": 160.0, "vc_min": 120.0, "vc_max": 200.0, "feed": 0.11, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P2": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 110.0, "vc_min": 80.0, "vc_max": 140.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-16", "iso_code": "SPMG 07T308", "operation_domain": "DRILLING",
            "shape_code": "S", "clearance_angle_deg": 11.0, "ic_mm": 7.938, "thickness_mm": 3.97, "corner_radius_mm": 0.8,
            "cutting_edges_count": 4, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "S-P-794-397-G", "relative_cost_index": 1.15,
            "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN",
            "toughness_index": 8, "wear_resistance_index": 7,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"},
            "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.06, "fn_max_mm": 0.16,
            "operating_zone_polygon": [],
            "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 4.0, "tolerance_hole": "IT11",
            "holders": [{"code": "UDRL-SPMG07-D22-4D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 22.0, "z": 1, "ld_ratio_max": 4.0, "clamping": "SCREW"}],
            "recommendations": {
                "P1": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P2": {"vc": 155.0, "vc_min": 115.0, "vc_max": 195.0, "feed": 0.10, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "K1": {"vc": 200.0, "vc_min": 150.0, "vc_max": 250.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 65.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-17", "iso_code": "SPMG 090408", "operation_domain": "DRILLING",
            "shape_code": "S", "clearance_angle_deg": 11.0, "ic_mm": 9.525, "thickness_mm": 4.76, "corner_radius_mm": 0.8,
            "cutting_edges_count": 4, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "S-P-953-476-G", "relative_cost_index": 1.30,
            "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN",
            "toughness_index": 8, "wear_resistance_index": 7,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"},
            "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.06, "fn_max_mm": 0.16,
            "operating_zone_polygon": [],
            "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 3.0, "tolerance_hole": "IT11",
            "holders": [{"code": "UDRL-SPMG09-D32-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 32.0, "z": 1, "ld_ratio_max": 3.0, "clamping": "SCREW"}],
            "recommendations": {
                "P1": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P2": {"vc": 155.0, "vc_min": 115.0, "vc_max": 195.0, "feed": 0.10, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "K1": {"vc": 200.0, "vc_min": 150.0, "vc_max": 250.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 65.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-18", "iso_code": "TNMG 160408", "operation_domain": "TURNING",
            "shape_code": "T", "clearance_angle_deg": 0.0, "ic_mm": 9.525, "thickness_mm": 4.76, "corner_radius_mm": 0.8,
            "cutting_edges_count": 6, "is_double_sided": True, "has_wiper_geometry": False,
            "seat_pocket_signature": "T-N-953-476-G", "relative_cost_index": 0.88,
            "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN",
            "toughness_index": 6, "wear_resistance_index": 8,
            "suitability": {"P": "PRIMARY", "K": "SECONDARY"},
            "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.8, "ap_max_mm": 4.5, "fn_min_mm": 0.15, "fn_max_mm": 0.45,
            "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.20, 4.0], [0.15, 2.2]],
            "holders": [{"code": "PTJNR 2525M 16", "category": "TURNING_EXTERNAL", "lead_angle_deg": 93.0, "clamping": "LEVER"}],
            "recommendations": {
                "P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.30, "ap": 2.5, "coolant": "FLOOD"},
                "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"},
                "P3": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.24, "ap": 2.0, "coolant": "FLOOD"},
                "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"},
            },
        },
        {
            "id": "ins-19", "iso_code": "CCGT 09T304-AL", "operation_domain": "TURNING",
            "shape_code": "C", "clearance_angle_deg": 7.0, "ic_mm": 9.525, "thickness_mm": 3.97, "corner_radius_mm": 0.4,
            "cutting_edges_count": 2, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "C-C-953-397-T", "relative_cost_index": 1.02,
            "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron",
            "toughness_index": 7, "wear_resistance_index": 7,
            "suitability": {"N": "PRIMARY"},
            "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP",
            "ap_min_mm": 0.25, "ap_max_mm": 2.0, "fn_min_mm": 0.08, "fn_max_mm": 0.25,
            "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.10, 1.6]],
            "holders": [{"code": "S20R-SCLCR 09", "category": "BORING_BAR", "lead_angle_deg": 95.0, "clamping": "SCREW"}],
            "recommendations": {
                "N1": {"vc": 700.0, "vc_min": 450.0, "vc_max": 1000.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"},
                "N2": {"vc": 320.0, "vc_min": 220.0, "vc_max": 450.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"},
            },
        },
        # --- GROOVING & THREADING (2) ---
        {
            "id": "ins-20", "iso_code": "MGMN 300", "operation_domain": "GROOVING_THREADING",
            "shape_code": "L", "clearance_angle_deg": 0.0, "ic_mm": 3.0, "thickness_mm": 4.76, "corner_radius_mm": 0.2,
            "cutting_edges_count": 2, "is_double_sided": True, "has_wiper_geometry": False,
            "seat_pocket_signature": "L-N-300-476-N", "relative_cost_index": 0.98,
            "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN",
            "toughness_index": 8, "wear_resistance_index": 6,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "S": "PRIMARY", "K": "SECONDARY"},
            "chipbreaker_code": "GEN-GRV", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 1.5, "ap_max_mm": 4.0, "fn_min_mm": 0.05, "fn_max_mm": 0.22,
            "operating_zone_polygon": [[0.05, 1.5], [0.22, 2.0], [0.20, 4.0], [0.05, 3.8]],
            "holders": [{"code": "MGEHR 2525-3", "category": "GROOVING_HOLDER", "lead_angle_deg": 90.0, "clamping": "TOP_CLAMP"}],
            "recommendations": {
                "P1": {"vc": 150.0, "vc_min": 110.0, "vc_max": 190.0, "feed": 0.10, "ap": 3.0, "coolant": "FLOOD"},
                "P2": {"vc": 125.0, "vc_min": 90.0, "vc_max": 160.0, "feed": 0.09, "ap": 3.0, "coolant": "FLOOD"},
                "M1": {"vc": 115.0, "vc_min": 80.0, "vc_max": 145.0, "feed": 0.08, "ap": 3.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S2": {"vc": 45.0, "vc_min": 30.0, "vc_max": 60.0, "feed": 0.07, "ap": 3.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-21", "iso_code": "16ER AG60", "operation_domain": "GROOVING_THREADING",
            "shape_code": "T", "clearance_angle_deg": 0.0, "ic_mm": 9.525, "thickness_mm": 3.97, "corner_radius_mm": 0.1,
            "cutting_edges_count": 3, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "T-N-953-397-T", "relative_cost_index": 1.22,
            "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN",
            "toughness_index": 8, "wear_resistance_index": 6,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "S": "PRIMARY", "K": "SECONDARY"},
            "chipbreaker_code": "GEN-GRV", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.5, "ap_max_mm": 3.0, "fn_min_mm": 0.05, "fn_max_mm": 0.25,
            "operating_zone_polygon": [[0.05, 0.5], [0.25, 0.8], [0.22, 3.0], [0.05, 2.8]],
            "holders": [{"code": "SER 2525M 16", "category": "GROOVING_HOLDER", "lead_angle_deg": 90.0, "clamping": "SCREW"}],
            "recommendations": {
                "P1": {"vc": 145.0, "vc_min": 100.0, "vc_max": 180.0, "feed": 0.12, "ap": 1.5, "coolant": "FLOOD"},
                "P2": {"vc": 120.0, "vc_min": 85.0, "vc_max": 155.0, "feed": 0.10, "ap": 1.5, "coolant": "FLOOD"},
                "M1": {"vc": 105.0, "vc_min": 75.0, "vc_max": 135.0, "feed": 0.10, "ap": 1.5, "coolant": "FLOOD"},
                "S2": {"vc": 40.0, "vc_min": 28.0, "vc_max": 55.0, "feed": 0.08, "ap": 1.2, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        # --- EXTENDED AXIAL TOOLING (8 new tools) ---
        {
            "id": "ins-22", "iso_code": "SOMT 11T308", "operation_domain": "DRILLING",
            "shape_code": "S", "clearance_angle_deg": 11.0, "ic_mm": 11.0, "thickness_mm": 3.97, "corner_radius_mm": 0.8,
            "cutting_edges_count": 4, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "S-O-1100-397-T", "relative_cost_index": 1.45,
            "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN",
            "toughness_index": 8, "wear_resistance_index": 7,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"},
            "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.08, "fn_max_mm": 0.18,
            "operating_zone_polygon": [],
            "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 3.0, "tolerance_hole": "IT11",
            "holders": [{"code": "UDRL-SOMT11-D40-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 40.0, "z": 1, "ld_ratio_max": 3.0, "clamping": "SCREW"}],
            "recommendations": {
                "P1": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P2": {"vc": 155.0, "vc_min": 115.0, "vc_max": 195.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.10, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "K1": {"vc": 200.0, "vc_min": 150.0, "vc_max": 250.0, "feed": 0.16, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S2": {"vc": 48.0, "vc_min": 35.0, "vc_max": 62.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-23", "iso_code": "WCMT 06T308", "operation_domain": "DRILLING",
            "shape_code": "W", "clearance_angle_deg": 7.0, "ic_mm": 9.525, "thickness_mm": 3.97, "corner_radius_mm": 0.8,
            "cutting_edges_count": 3, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "W-C-953-397-T", "relative_cost_index": 1.35,
            "grade_code": "GEN-DRL-CORE", "coating_method": "PVD", "coating_composition": "TiAlN",
            "toughness_index": 9, "wear_resistance_index": 6,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY", "N": "SECONDARY"},
            "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.06, "fn_max_mm": 0.16,
            "operating_zone_polygon": [],
            "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT11",
            "holders": [{"code": "UDRL-WCMT06-D30-5D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 30.0, "z": 1, "ld_ratio_max": 5.0, "clamping": "SCREW"}],
            "recommendations": {
                "P1": {"vc": 165.0, "vc_min": 120.0, "vc_max": 205.0, "feed": 0.11, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P2": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.10, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 110.0, "vc_min": 80.0, "vc_max": 140.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "K1": {"vc": 180.0, "vc_min": 135.0, "vc_max": 220.0, "feed": 0.13, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "N1": {"vc": 320.0, "vc_min": 220.0, "vc_max": 420.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-24", "iso_code": "MOD-DRL-140", "operation_domain": "DRILLING",
            "shape_code": "DRL", "clearance_angle_deg": 11.0, "ic_mm": 14.0, "thickness_mm": 6.72, "corner_radius_mm": 0.2,
            "cutting_edges_count": 2, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "DRL-M-1400-672-B", "relative_cost_index": 3.80,
            "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN",
            "toughness_index": 8, "wear_resistance_index": 8,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"},
            "chipbreaker_code": "GEN-DRL-MOD", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.14, "fn_max_mm": 0.34,
            "operating_zone_polygon": [],
            "axial_subtype": "MODULAR_TIP", "point_angle_deg": 140.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT9",
            "holders": [{"code": "MOD-BODY-D14-5D", "category": "MODULAR_DRILL", "lead_angle_deg": 70.0, "dc_mm": 14.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "BAYONET"}],
            "recommendations": {
                "P1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.24, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P2": {"vc": 100.0, "vc_min": 75.0, "vc_max": 130.0, "feed": 0.22, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 70.0, "vc_min": 50.0, "vc_max": 90.0, "feed": 0.18, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "K1": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.30, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S2": {"vc": 38.0, "vc_min": 25.0, "vc_max": 50.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-25", "iso_code": "MOD-DRL-200", "operation_domain": "DRILLING",
            "shape_code": "DRL", "clearance_angle_deg": 11.0, "ic_mm": 20.0, "thickness_mm": 9.60, "corner_radius_mm": 0.2,
            "cutting_edges_count": 2, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "DRL-M-2000-960-B", "relative_cost_index": 4.90,
            "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN",
            "toughness_index": 8, "wear_resistance_index": 8,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"},
            "chipbreaker_code": "GEN-DRL-MOD", "application_class": "MEDIUM", "edge_prep": "HONED",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.16, "fn_max_mm": 0.38,
            "operating_zone_polygon": [],
            "axial_subtype": "MODULAR_TIP", "point_angle_deg": 140.0, "ld_ratio_max": 8.0, "tolerance_hole": "IT9",
            "holders": [{"code": "MOD-BODY-D20-8D", "category": "MODULAR_DRILL", "lead_angle_deg": 70.0, "dc_mm": 20.0, "z": 2, "ld_ratio_max": 8.0, "clamping": "BAYONET"}],
            "recommendations": {
                "P1": {"vc": 115.0, "vc_min": 85.0, "vc_max": 145.0, "feed": 0.26, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P2": {"vc": 95.0, "vc_min": 70.0, "vc_max": 125.0, "feed": 0.24, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.19, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "K1": {"vc": 130.0, "vc_min": 95.0, "vc_max": 165.0, "feed": 0.32, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S2": {"vc": 36.0, "vc_min": 25.0, "vc_max": 48.0, "feed": 0.15, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-26", "iso_code": "SC-DRL-080-5D", "operation_domain": "DRILLING",
            "shape_code": "DRL", "clearance_angle_deg": 11.0, "ic_mm": 8.0, "thickness_mm": 5.00, "corner_radius_mm": 0.1,
            "cutting_edges_count": 2, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "DRL-S-800-500-I", "relative_cost_index": 4.20,
            "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN",
            "toughness_index": 8, "wear_resistance_index": 8,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"},
            "chipbreaker_code": "GEN-DRL-SC", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.10, "fn_max_mm": 0.28,
            "operating_zone_polygon": [],
            "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 140.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT8",
            "holders": [{"code": "HYD-CHUCK-D08-5D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 70.0, "dc_mm": 8.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "INTEGRAL"}],
            "recommendations": {
                "P1": {"vc": 115.0, "vc_min": 85.0, "vc_max": 145.0, "feed": 0.20, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P2": {"vc": 95.0, "vc_min": 70.0, "vc_max": 120.0, "feed": 0.18, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.15, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "K1": {"vc": 130.0, "vc_min": 95.0, "vc_max": 165.0, "feed": 0.24, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S2": {"vc": 38.0, "vc_min": 25.0, "vc_max": 50.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-27", "iso_code": "SC-DRL-120-8D", "operation_domain": "DRILLING",
            "shape_code": "DRL", "clearance_angle_deg": 11.0, "ic_mm": 12.0, "thickness_mm": 8.00, "corner_radius_mm": 0.1,
            "cutting_edges_count": 2, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "DRL-S-1200-800-I", "relative_cost_index": 6.40,
            "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN",
            "toughness_index": 8, "wear_resistance_index": 8,
            "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"},
            "chipbreaker_code": "GEN-DRL-SC", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.12, "fn_max_mm": 0.28,
            "operating_zone_polygon": [],
            "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 140.0, "ld_ratio_max": 8.0, "tolerance_hole": "IT8",
            "holders": [{"code": "HYD-CHUCK-D12-8D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 70.0, "dc_mm": 12.0, "z": 2, "ld_ratio_max": 8.0, "clamping": "INTEGRAL"}],
            "recommendations": {
                "P1": {"vc": 105.0, "vc_min": 80.0, "vc_max": 130.0, "feed": 0.22, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P2": {"vc": 88.0, "vc_min": 65.0, "vc_max": 110.0, "feed": 0.19, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 60.0, "vc_min": 45.0, "vc_max": 80.0, "feed": 0.16, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "K1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.25, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S2": {"vc": 34.0, "vc_min": 24.0, "vc_max": 45.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-28", "iso_code": "SC-DRL-100-AL", "operation_domain": "DRILLING",
            "shape_code": "DRL", "clearance_angle_deg": 11.0, "ic_mm": 10.0, "thickness_mm": 5.00, "corner_radius_mm": 0.1,
            "cutting_edges_count": 2, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "DRL-S-1000-500-I", "relative_cost_index": 4.60,
            "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron",
            "toughness_index": 7, "wear_resistance_index": 7,
            "suitability": {"N": "PRIMARY"},
            "chipbreaker_code": "GEN-DRL-AL", "application_class": "ALUMINUM_SHARP", "edge_prep": "SHARP",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.12, "fn_max_mm": 0.38,
            "operating_zone_polygon": [],
            "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 130.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT8",
            "holders": [{"code": "HYD-CHUCK-D10-5D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 65.0, "dc_mm": 10.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "INTEGRAL"}],
            "recommendations": {
                "N1": {"vc": 260.0, "vc_min": 180.0, "vc_max": 360.0, "feed": 0.26, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "N2": {"vc": 160.0, "vc_min": 110.0, "vc_max": 220.0, "feed": 0.20, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
        {
            "id": "ins-29", "iso_code": "SC-DRL-060-H", "operation_domain": "DRILLING",
            "shape_code": "DRL", "clearance_angle_deg": 11.0, "ic_mm": 6.0, "thickness_mm": 5.00, "corner_radius_mm": 0.1,
            "cutting_edges_count": 2, "is_double_sided": False, "has_wiper_geometry": False,
            "seat_pocket_signature": "DRL-S-600-500-I", "relative_cost_index": 4.90,
            "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano",
            "toughness_index": 7, "wear_resistance_index": 9,
            "suitability": {"H": "PRIMARY", "S": "PRIMARY", "M": "SECONDARY"},
            "chipbreaker_code": "GEN-DRL-SC", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED",
            "ap_min_mm": 0.0, "ap_max_mm": 0.0, "fn_min_mm": 0.05, "fn_max_mm": 0.16,
            "operating_zone_polygon": [],
            "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 140.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT8",
            "holders": [{"code": "SHRINK-FIT-D06-5D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 70.0, "dc_mm": 6.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "INTEGRAL"}],
            "recommendations": {
                "H1": {"vc": 32.0, "vc_min": 20.0, "vc_max": 45.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S1": {"vc": 22.0, "vc_min": 15.0, "vc_max": 32.0, "feed": 0.10, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "S2": {"vc": 42.0, "vc_min": 28.0, "vc_max": 58.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 62.0, "vc_min": 45.0, "vc_max": 82.0, "feed": 0.13, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
    ],
    "cross_references": [
        {"source_insert_id": "ins-1", "target_insert_id": "ins-7",  "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.92, "notes": "WNMG 080408 даёт 6 кромок вместо 4 при том же угле 80° (державка PWLNR)"},
        {"source_insert_id": "ins-7", "target_insert_id": "ins-1",  "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.92, "notes": "CNMG 120408 обеспечивает большую глубину резания ap при том же угле 80°"},
        {"source_insert_id": "ins-1", "target_insert_id": "ins-2",  "match_type": "HIGHER_TOUGHNESS",      "confidence_score": 0.88, "notes": "Та же державка PCLNR 12; переход на острую PVD-кромку и радиус 0.4"},
        {"source_insert_id": "ins-1", "target_insert_id": "ins-13", "match_type": "HIGHER_WEAR_RESISTANCE","confidence_score": 0.85, "notes": "Та же державка PCLNR 12; переход на CBN для закалённых сталей >48 HRC"},
        {"source_insert_id": "ins-7", "target_insert_id": "ins-8",  "match_type": "HIGHER_TOUGHNESS",      "confidence_score": 0.95, "notes": "То же гнездо PWLNR 08; усиленный черновой стружколом и сплав P35"},
        {"source_insert_id": "ins-9", "target_insert_id": "ins-10", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.80, "notes": "Переход с 55° (DNMG) на 35° (VNMG) для сложного профилирования"},
        {"source_insert_id": "ins-6", "target_insert_id": "ins-16", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.86, "notes": "SPMG 07T308 даёт 4 кромки вместо 3 у WCMX (корпус UDRL-SPMG07)"},
        {"source_insert_id": "ins-1", "target_insert_id": "ins-18", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.84, "notes": "TNMG 160408: 6 кромок и минимальная цена за кромку для нежёстких валов"},
        {"source_insert_id": "ins-3", "target_insert_id": "ins-19", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.96, "notes": "Та же оправка S20R-SCLCR 09; полированная шлифованная CCGT для алюминия"},
        {"source_insert_id": "ins-17", "target_insert_id": "ins-22", "match_type": "HIGHER_TOUGHNESS",      "confidence_score": 0.90, "notes": "SOMT 11T308 для мощных отверстий Ø40 мм с усиленной квадратной кромкой"},
        {"source_insert_id": "ins-6",  "target_insert_id": "ins-23", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.88, "notes": "WCMT 06T308 позволяет сверлить до 5xD вместо 3xD (корпус UDRL-WCMT06-D30-5D)"},
        {"source_insert_id": "ins-24", "target_insert_id": "ins-27", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.86, "notes": "Переход со сменной коронки Ø14 на монолит Ø12 8xD для точности IT8 и глубоких отверстий"},
        {"source_insert_id": "ins-25", "target_insert_id": "ins-16", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.82, "notes": "Альтернатива Ø20–22 мм: U-сверло SPMG 07T308 дешевле на кромку при глубине до 4xD"},
    ],
}


def _is_valid_uuid(value: str) -> bool:
    try:
        UUID(str(value))
        return True
    except (ValueError, TypeError):
        return False


def _format_hardness(row: Dict[str, Any]) -> str:
    if row.get("hardness_hb_min") is not None and row.get("hardness_hb_max") is not None:
        return f"{row['hardness_hb_min']}–{row['hardness_hb_max']} HB"
    if row.get("hardness_hrc_min") is not None and row.get("hardness_hrc_max") is not None:
        return f"{row['hardness_hrc_min']}–{row['hardness_hrc_max']} HRC"
    return ""


class ToolingRepository:
    def __init__(self, db_url: Optional[str] = None) -> None:
        self.db_url = db_url if db_url is not None else os.getenv("DATABASE_URL")
        if self.db_url and psycopg is None:
            raise RuntimeError(
                "DATABASE_URL is set, but psycopg (psycopg3) is not installed. "
                "Install it via: pip install 'psycopg[binary]>=3.2.0'"
            )
        self.mode = "postgres" if self.db_url else "memory_seed"
        self._stock_items: List[Dict[str, Any]] = [
            {**item, "normalized_code": normalize_iso_key(item["iso_code"])}
            for item in DEFAULT_STOCK_ITEMS
        ]
        self._custom_machines: List[Dict[str, Any]] = []
        self._saved_assemblies: List[Dict[str, Any]] = []

    def _connect(self):
        assert self.db_url is not None and psycopg is not None
        return psycopg.connect(self.db_url, row_factory=dict_row, connect_timeout=5)

    def get_meta(self) -> Dict[str, Any]:
        if self.mode != "postgres":
            return {
                "storage_mode": self.mode,
                "iso_groups": SEED_DATA["iso_groups"],
                "material_subgroups": SEED_DATA["material_subgroups"],
                "machines": SEED_DATA["machines"] + self._custom_machines,
            }

        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT code::text AS code, name_ru, TRIM(color_hex) AS color_hex
                FROM iso_material_groups
                ORDER BY ARRAY_POSITION(ARRAY['P','M','K','N','S','H']::text[], code::text)
                """
            )
            iso_groups = [dict(r) for r in cur.fetchall()]

            cur.execute(
                """
                SELECT
                    code,
                    iso_group::text AS iso_group,
                    name_ru,
                    kc1_1_mpa,
                    mc_exponent,
                    hardness_hb_min,
                    hardness_hb_max,
                    hardness_hrc_min,
                    hardness_hrc_max
                FROM material_subgroups
                ORDER BY code
                """
            )
            subgroups = [
                {
                    "code": r["code"],
                    "iso_group": r["iso_group"],
                    "name_ru": r["name_ru"],
                    "kc1_1_mpa": float(r["kc1_1_mpa"]),
                    "mc_exponent": float(r["mc_exponent"]),
                    "hb": _format_hardness(r),
                }
                for r in cur.fetchall()
            ]

            cur.execute(
                """
                SELECT
                    id::text AS id,
                    name,
                    machine_type::text AS machine_type,
                    max_rpm,
                    spindle_power_kw,
                    max_torque_nm,
                    rigidity_class
                FROM machine_profiles
                ORDER BY created_at ASC, name ASC
                """
            )
            machines = [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "machine_type": r["machine_type"],
                    "max_rpm": int(r["max_rpm"]),
                    "spindle_power_kw": float(r["spindle_power_kw"]),
                    "max_torque_nm": float(r["max_torque_nm"]),
                    "rigidity_class": r["rigidity_class"],
                }
                for r in cur.fetchall()
            ]

        return {
            "storage_mode": self.mode,
            "iso_groups": iso_groups,
            "material_subgroups": subgroups,
            "machines": machines,
        }

    def get_subgroup(self, code: str) -> Optional[Dict[str, Any]]:
        if self.mode != "postgres":
            for sg in SEED_DATA["material_subgroups"]:
                if sg["code"] == code:
                    return sg
            return None

        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    code,
                    iso_group::text AS iso_group,
                    name_ru,
                    kc1_1_mpa,
                    mc_exponent,
                    hardness_hb_min,
                    hardness_hb_max,
                    hardness_hrc_min,
                    hardness_hrc_max
                FROM material_subgroups
                WHERE code = %s
                """,
                (code,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "code": row["code"],
                "iso_group": row["iso_group"],
                "name_ru": row["name_ru"],
                "kc1_1_mpa": float(row["kc1_1_mpa"]),
                "mc_exponent": float(row["mc_exponent"]),
                "hb": _format_hardness(row),
            }

    def get_machine(self, machine_id: str) -> Optional[Dict[str, Any]]:
        if self.mode != "postgres":
            for m in SEED_DATA["machines"] + self._custom_machines:
                if m["id"] == machine_id:
                    return m
            return SEED_DATA["machines"][0] if SEED_DATA["machines"] else None

        with self._connect() as conn, conn.cursor() as cur:
            if _is_valid_uuid(machine_id):
                cur.execute(
                    """
                    SELECT
                        id::text AS id,
                        name,
                        machine_type::text AS machine_type,
                        max_rpm,
                        spindle_power_kw,
                        max_torque_nm,
                        rigidity_class
                    FROM machine_profiles
                    WHERE id = %s::uuid
                    """,
                    (machine_id,),
                )
            else:
                cur.execute(
                    """
                    SELECT
                        id::text AS id,
                        name,
                        machine_type::text AS machine_type,
                        max_rpm,
                        spindle_power_kw,
                        max_torque_nm,
                        rigidity_class
                    FROM machine_profiles
                    ORDER BY created_at ASC
                    LIMIT 1
                    """
                )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": row["id"],
                "name": row["name"],
                "machine_type": row["machine_type"],
                "max_rpm": int(row["max_rpm"]),
                "spindle_power_kw": float(row["spindle_power_kw"]),
                "max_torque_nm": float(row["max_torque_nm"]),
                "rigidity_class": row["rigidity_class"],
            }

    def list_inserts(self, operation_domain: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.mode != "postgres":
            if not operation_domain:
                return SEED_DATA["inserts"]
            return [i for i in SEED_DATA["inserts"] if i["operation_domain"] == operation_domain]

        with self._connect() as conn, conn.cursor() as cur:
            sql = """
                SELECT
                    v.insert_id::text AS insert_id,
                    v.iso_code,
                    v.operation_domain::text AS operation_domain,
                    v.shape_code,
                    v.clearance_angle_deg,
                    v.ic_mm,
                    v.thickness_mm,
                    v.corner_radius_mm,
                    v.cutting_edges_count,
                    v.is_double_sided,
                    v.has_wiper_geometry,
                    v.seat_pocket_signature,
                    v.relative_cost_index,
                    v.grade_id::text AS grade_id,
                    v.grade_code,
                    v.substrate_type,
                    v.coating_method,
                    cg.coating_composition,
                    v.toughness_index,
                    v.wear_resistance_index,
                    v.chipbreaker_id::text AS chipbreaker_id,
                    v.chipbreaker_code,
                    v.application_class::text AS application_class,
                    v.edge_prep::text AS edge_prep,
                    v.ap_min_mm,
                    v.ap_max_mm,
                    v.fn_min_mm,
                    v.fn_max_mm,
                    v.operating_zone_polygon,
                    v.iso_group::text AS iso_group,
                    v.suitability_rank::text AS suitability_rank
                FROM v_insert_selector_catalog v
                JOIN carbide_grades cg ON cg.id = v.grade_id
            """
            params: List[Any] = []
            if operation_domain:
                sql += " WHERE v.operation_domain = %s::operation_domain_enum"
                params.append(operation_domain)
            sql += " ORDER BY v.iso_code ASC"

            cur.execute(sql, params)
            view_rows = cur.fetchall()
            if not view_rows:
                return []

            inserts_by_id: Dict[str, Dict[str, Any]] = {}
            pocket_signatures: set[str] = set()
            grade_ids: set[str] = set()

            for r in view_rows:
                ins_id = r["insert_id"]
                pocket_signatures.add(r["seat_pocket_signature"])
                grade_ids.add(r["grade_id"])

                if ins_id not in inserts_by_id:
                    inserts_by_id[ins_id] = {
                        "id": ins_id,
                        "iso_code": r["iso_code"],
                        "operation_domain": r["operation_domain"],
                        "shape_code": r["shape_code"],
                        "clearance_angle_deg": float(r["clearance_angle_deg"]),
                        "ic_mm": float(r["ic_mm"]),
                        "thickness_mm": float(r["thickness_mm"]),
                        "corner_radius_mm": float(r["corner_radius_mm"]),
                        "cutting_edges_count": int(r["cutting_edges_count"]),
                        "is_double_sided": bool(r["is_double_sided"]),
                        "has_wiper_geometry": bool(r["has_wiper_geometry"]),
                        "seat_pocket_signature": r["seat_pocket_signature"],
                        "relative_cost_index": float(r["relative_cost_index"] or 1.0),
                        "grade_id": r["grade_id"],
                        "grade_code": r["grade_code"],
                        "coating_method": r["coating_method"],
                        "coating_composition": r["coating_composition"] or r["substrate_type"],
                        "toughness_index": int(r["toughness_index"]),
                        "wear_resistance_index": int(r["wear_resistance_index"]),
                        "suitability": {},
                        "chipbreaker_id": r["chipbreaker_id"],
                        "chipbreaker_code": r["chipbreaker_code"] or "GENERIC",
                        "application_class": r["application_class"] or "MEDIUM",
                        "edge_prep": r["edge_prep"] or "HONED",
                        "ap_min_mm": float(r["ap_min_mm"] or 0.0),
                        "ap_max_mm": float(r["ap_max_mm"] or 0.0),
                        "fn_min_mm": float(r["fn_min_mm"] or 0.0),
                        "fn_max_mm": float(r["fn_max_mm"] or 0.0),
                        "operating_zone_polygon": r["operating_zone_polygon"] or [],
                        "holders": [],
                        "recommendations": {},
                    }
                inserts_by_id[ins_id]["suitability"][r["iso_group"]] = r["suitability_rank"]

            cur.execute(
                """
                SELECT
                    hic.seat_pocket_signature,
                    hic.seat_position,
                    hic.inserts_required_qty,
                    hic.allowed_radius_min_mm,
                    hic.allowed_radius_max_mm,
                    th.code,
                    th.tool_category::text AS category,
                    th.clamping_system::text AS clamping,
                    th.lead_angle_deg,
                    th.cutting_diameter_mm,
                    th.effective_teeth_count,
                    th.ld_ratio_max
                FROM holder_insert_compatibility hic
                JOIN tool_holders th ON th.id = hic.holder_id
                WHERE hic.seat_pocket_signature = ANY(%s)
                ORDER BY th.code ASC, hic.seat_position ASC
                """,
                (list(pocket_signatures),),
            )
            holder_rows = cur.fetchall()

            rec_sql = """
                SELECT
                    grade_id::text AS grade_id,
                    chipbreaker_id::text AS chipbreaker_id,
                    material_subgroup_code,
                    operation_domain::text AS operation_domain,
                    vc_min_m_min,
                    vc_opt_m_min,
                    vc_max_m_min,
                    feed_opt_mm,
                    ap_opt_mm,
                    ae_ratio_opt,
                    coolant_mode::text AS coolant_mode
                FROM cutting_recommendations
                WHERE grade_id = ANY(%s::uuid[])
            """
            rec_params: List[Any] = [list(grade_ids)]
            if operation_domain:
                rec_sql += " AND operation_domain = %s::operation_domain_enum"
                rec_params.append(operation_domain)

            cur.execute(rec_sql, rec_params)
            rec_rows = cur.fetchall()

        for ins in inserts_by_id.values():
            re_mm = ins["corner_radius_mm"]
            sig = ins["seat_pocket_signature"]
            matched_holders: List[Dict[str, Any]] = []
            seen_codes: set[str] = set()

            for hr in holder_rows:
                if hr["seat_pocket_signature"] != sig:
                    continue
                r_min = float(hr["allowed_radius_min_mm"] or 0.0)
                r_max = float(hr["allowed_radius_max_mm"] or 99.0)
                if not (r_min <= re_mm <= r_max):
                    continue
                if hr["code"] in seen_codes:
                    continue
                seen_codes.add(hr["code"])
                matched_holders.append(
                    {
                        "code": hr["code"],
                        "category": hr["category"],
                        "lead_angle_deg": float(hr["lead_angle_deg"]) if hr["lead_angle_deg"] is not None else 90.0,
                        "dc_mm": float(hr["cutting_diameter_mm"]) if hr["cutting_diameter_mm"] is not None else None,
                        "z": int(hr["effective_teeth_count"]) if hr["effective_teeth_count"] is not None else 1,
                        "ld_ratio_max": float(hr["ld_ratio_max"]) if hr.get("ld_ratio_max") is not None else None,
                        "clamping": hr["clamping"],
                        "seat_position": hr["seat_position"],
                        "inserts_required_qty": int(hr["inserts_required_qty"]),
                    }
                )
            ins["holders"] = matched_holders

            recs: Dict[str, Dict[str, Any]] = {}
            for rr in rec_rows:
                if rr["grade_id"] != ins["grade_id"]:
                    continue
                if rr["operation_domain"] != ins["operation_domain"]:
                    continue
                cb_match = rr["chipbreaker_id"] == ins["chipbreaker_id"]
                sg_code = rr["material_subgroup_code"]
                if sg_code not in recs or cb_match:
                    recs[sg_code] = {
                        "vc": float(rr["vc_opt_m_min"]),
                        "vc_min": float(rr["vc_min_m_min"]),
                        "vc_max": float(rr["vc_max_m_min"]),
                        "feed": float(rr["feed_opt_mm"]),
                        "ap": float(rr["ap_opt_mm"]),
                        "ae_ratio": float(rr["ae_ratio_opt"]) if rr["ae_ratio_opt"] is not None else None,
                        "coolant": rr["coolant_mode"],
                    }
            if not recs:
                recs["DEFAULT"] = {
                    "vc": 180.0,
                    "vc_min": 120.0,
                    "vc_max": 240.0,
                    "feed": 0.20,
                    "ap": 2.0,
                    "coolant": "FLOOD",
                }
            ins["recommendations"] = recs

        return list(inserts_by_id.values())

    def get_cross_references(self, insert_id: str) -> List[Dict[str, Any]]:
        """Returns functional equivalents and grade upgrades for a given insert."""
        if self.mode != "postgres":
            by_id = {i["id"]: i for i in SEED_DATA["inserts"]}
            out: List[Dict[str, Any]] = []
            for xref in SEED_DATA["cross_references"]:
                if xref["source_insert_id"] != insert_id:
                    continue
                target = by_id.get(xref["target_insert_id"])
                if not target:
                    continue
                out.append(
                    {
                        "target_insert_id": target["id"],
                        "target_iso_code": target["iso_code"],
                        "target_grade_code": target["grade_code"],
                        "target_seat_pocket_signature": target["seat_pocket_signature"],
                        "match_type": xref["match_type"],
                        "confidence_score": float(xref["confidence_score"]),
                        "notes": xref["notes"],
                    }
                )
            return out

        if not _is_valid_uuid(insert_id):
            return []

        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ci.id::text AS target_insert_id,
                    ci.iso_code AS target_iso_code,
                    cg.code AS target_grade_code,
                    ci.seat_pocket_signature AS target_seat_pocket_signature,
                    icr.match_type,
                    icr.confidence_score,
                    icr.notes
                FROM insert_cross_references icr
                JOIN cutting_inserts ci ON ci.id = icr.target_insert_id
                JOIN carbide_grades cg ON cg.id = ci.grade_id
                WHERE icr.source_insert_id = %s::uuid
                ORDER BY icr.confidence_score DESC
                """,
                (insert_id,),
            )
            return [
                {
                    "target_insert_id": r["target_insert_id"],
                    "target_iso_code": r["target_iso_code"],
                    "target_grade_code": r["target_grade_code"],
                    "target_seat_pocket_signature": r["target_seat_pocket_signature"],
                    "match_type": r["match_type"],
                    "confidence_score": float(r["confidence_score"]),
                    "notes": r["notes"] or "",
                }
                for r in cur.fetchall()
            ]

    # -------------------------------------------------------------------------
    # Warehouse Stock, Custom Machines & Saved Tool Assemblies CRUD
    # -------------------------------------------------------------------------

    def list_stock(self) -> List[Dict[str, Any]]:
        return list(self._stock_items)

    def replace_stock(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized: List[Dict[str, Any]] = []
        for item in items:
            code = str(item.get("iso_code", "")).strip().upper()
            if not code:
                continue
            normalized.append(
                {
                    "iso_code": code,
                    "normalized_code": normalize_iso_key(code),
                    "grade_code": item.get("grade_code") or None,
                    "qty": max(0, int(item.get("qty", 0))),
                    "unit_price_rub": round(max(0.0, float(item.get("unit_price_rub", 650.0))), 2),
                    "bin_location": str(item.get("bin_location", "")),
                    "supplier": str(item.get("supplier", "")),
                }
            )
        self._stock_items = normalized
        return list(self._stock_items)

    def get_stock_match(self, iso_code: str, grade_code: Optional[str] = None) -> Optional[Dict[str, Any]]:
        norm = normalize_iso_key(iso_code)
        exact_grade = None
        fallback = None
        for item in self._stock_items:
            if item["normalized_code"] != norm:
                continue
            if grade_code and item.get("grade_code") == grade_code:
                exact_grade = item
                break
            if fallback is None:
                fallback = item
        return exact_grade or fallback

    def create_machine(self, machine: Dict[str, Any]) -> Dict[str, Any]:
        if self.mode != "postgres":
            rec = {
                "id": f"custom-{uuid4().hex[:8]}",
                "name": machine["name"],
                "machine_type": machine.get("machine_type", "TURN_MILL"),
                "max_rpm": int(machine["max_rpm"]),
                "spindle_power_kw": float(machine["spindle_power_kw"]),
                "max_torque_nm": float(machine["max_torque_nm"]),
                "rigidity_class": machine.get("rigidity_class", "MEDIUM"),
            }
            self._custom_machines.append(rec)
            return rec

        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO machine_profiles (
                    name, machine_type, max_rpm, spindle_power_kw, max_torque_nm, spindle_interface, rigidity_class
                ) VALUES (%s, %s::machine_type_enum, %s, %s, %s, %s, %s)
                RETURNING id::text AS id, name, machine_type::text AS machine_type, max_rpm, spindle_power_kw, max_torque_nm, rigidity_class
                """,
                (
                    machine["name"],
                    machine.get("machine_type", "TURN_MILL"),
                    int(machine["max_rpm"]),
                    float(machine["spindle_power_kw"]),
                    float(machine["max_torque_nm"]),
                    machine.get("spindle_interface", "BT40"),
                    machine.get("rigidity_class", "MEDIUM"),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return {
                "id": row["id"],
                "name": row["name"],
                "machine_type": row["machine_type"],
                "max_rpm": int(row["max_rpm"]),
                "spindle_power_kw": float(row["spindle_power_kw"]),
                "max_torque_nm": float(row["max_torque_nm"]),
                "rigidity_class": row["rigidity_class"],
            }

    def list_assemblies(self) -> List[Dict[str, Any]]:
        if self.mode != "postgres":
            return list(self._saved_assemblies)

        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    uta.id::text AS id,
                    uta.assembly_name AS name,
                    uta.overhang_mm,
                    uta.saved_cutting_params AS params,
                    uta.created_at::text AS created_at,
                    ci.iso_code,
                    ci.seat_pocket_signature,
                    th.code AS holder_code,
                    mp.name AS machine_name
                FROM user_tool_assemblies uta
                JOIN cutting_inserts ci ON ci.id = uta.primary_insert_id
                JOIN tool_holders th ON th.id = uta.holder_id
                LEFT JOIN machine_profiles mp ON mp.id = uta.machine_id
                ORDER BY uta.created_at DESC
                """
            )
            return [dict(r) for r in cur.fetchall()]

    def create_assembly(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        rec = {
            "id": f"asm-{uuid4().hex[:8]}",
            **payload,
        }
        if self.mode != "postgres":
            self._saved_assemblies.insert(0, rec)
            return rec

        # Persist to user_tool_assemblies if valid UUIDs are provided, otherwise keep session copy
        ins_id = payload.get("primary_insert_id", "")
        hld_id = payload.get("holder_id", "")
        mach_id = payload.get("machine_id")
        if _is_valid_uuid(ins_id) and _is_valid_uuid(hld_id):
            with self._connect() as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO user_tool_assemblies (
                        assembly_name, machine_id, holder_id, primary_insert_id, overhang_mm, saved_cutting_params
                    ) VALUES (%s, %s::uuid, %s::uuid, %s::uuid, %s, %s::jsonb)
                    RETURNING id::text AS id
                    """,
                    (
                        payload.get("name", "Наладка"),
                        mach_id if (mach_id and _is_valid_uuid(mach_id)) else None,
                        hld_id,
                        ins_id,
                        payload.get("overhang_mm"),
                        json.dumps(payload.get("params", {})),
                    ),
                )
                row = cur.fetchone()
                conn.commit()
                rec["id"] = row["id"]
                return rec
        self._saved_assemblies.insert(0, rec)
        return rec

    def delete_assembly(self, assembly_id: str) -> bool:
        if self.mode == "postgres" and _is_valid_uuid(assembly_id):
            with self._connect() as conn, conn.cursor() as cur:
                cur.execute("DELETE FROM user_tool_assemblies WHERE id = %s::uuid", (assembly_id,))
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
        before = len(self._saved_assemblies)
        self._saved_assemblies = [a for a in self._saved_assemblies if a["id"] != assembly_id]
        return len(self._saved_assemblies) < before
