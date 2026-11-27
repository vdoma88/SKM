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
        {"id": "m1", "name": "Токарно-фрезерный центр (BMT55)", "machine_type": "TURN_MILL", "max_rpm": 4500, "spindle_power_kw": 18.5, "max_torque_nm": 320.0, "base_rpm": 550, "coolant_pressure_bar": 20.0, "max_thrust_kn": 28.0, "rigidity_class": "HIGH"},
        {"id": "m2", "name": "Вертикальный фрезерный ОЦ (BT40)", "machine_type": "MILL_3AX", "max_rpm": 12000, "spindle_power_kw": 15.0, "max_torque_nm": 95.0, "base_rpm": 1500, "coolant_pressure_bar": 25.0, "max_thrust_kn": 20.0, "rigidity_class": "MEDIUM"},
        {"id": "m3", "name": "Универсальный токарный ЧПУ (лёгкий)", "machine_type": "LATHE", "max_rpm": 3000, "spindle_power_kw": 7.5, "max_torque_nm": 160.0, "base_rpm": 450, "coolant_pressure_bar": 10.0, "max_thrust_kn": 12.0, "rigidity_class": "LOW"},
    ],
    "inserts": [
        {'id': 'ht-t01', 'iso_code': 'CNMG 120408-CM', 'brand': 'HARDTOOL', 'catalog_page': 'B-01', 'analog_note': 'Серебристый PVD H9760PMS · аналог Mitsubishi MS/MA, Sandvik MM, Taegutec PC/MP', 'operation_domain': 'TURNING', 'shape_code': 'C', 'clearance_angle_deg': 0.0, 'ic_mm': 12.7, 'thickness_mm': 4.76, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'C-N-1270-476-G', 'relative_cost_index': 1.0, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'H': 'SECONDARY'}, 'chipbreaker_code': 'HT-CM', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.5, 'ap_max_mm': 3.8, 'fn_min_mm': 0.12, 'fn_max_mm': 0.42, 'operating_zone_polygon': [[0.12, 0.5], [0.22, 0.45], [0.42, 0.9], [0.38, 3.8], [0.18, 3.4], [0.12, 1.8]], 'holders': [{'code': 'PCLNR 2525M 12', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 95.0, 'clamping': 'LEVER'}], 'recommendations': {'P1': {'vc': 220.0, 'vc_min': 150.0, 'vc_max': 280.0, 'feed': 0.28, 'ap': 2.2, 'coolant': 'FLOOD'}, 'P2': {'vc': 185.0, 'vc_min': 130.0, 'vc_max': 240.0, 'feed': 0.25, 'ap': 2.0, 'coolant': 'FLOOD'}, 'M1': {'vc': 130.0, 'vc_min': 60.0, 'vc_max': 180.0, 'feed': 0.2, 'ap': 1.5, 'coolant': 'FLOOD'}, 'S1': {'vc': 55.0, 'vc_min': 40.0, 'vc_max': 80.0, 'feed': 0.14, 'ap': 1.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'S2': {'vc': 50.0, 'vc_min': 40.0, 'vc_max': 60.0, 'feed': 0.15, 'ap': 1.2, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'H1': {'vc': 50.0, 'vc_min': 30.0, 'vc_max': 80.0, 'feed': 0.1, 'ap': 0.4, 'coolant': 'DRY'}}},
        {'id': 'ht-t02', 'iso_code': 'CNMG 120404-CF', 'brand': 'HARDTOOL', 'catalog_page': 'B-03', 'analog_note': 'Бронзовый PVD H9960MSH · первый выбор для нержавейки, титана и суперсплавов', 'operation_domain': 'TURNING', 'shape_code': 'C', 'clearance_angle_deg': 0.0, 'ic_mm': 12.7, 'thickness_mm': 4.76, 'corner_radius_mm': 0.4, 'cutting_edges_count': 4, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'C-N-1270-476-G', 'relative_cost_index': 1.15, 'grade_code': 'H9960MSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 7, 'wear_resistance_index': 9, 'suitability': {'M': 'PRIMARY', 'S': 'PRIMARY', 'P': 'SECONDARY', 'H': 'SECONDARY'}, 'chipbreaker_code': 'HT-CF', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.25, 'ap_max_mm': 2.0, 'fn_min_mm': 0.08, 'fn_max_mm': 0.25, 'operating_zone_polygon': [[0.06, 0.2], [0.14, 0.18], [0.24, 0.35], [0.22, 2.0], [0.1, 1.6]], 'holders': [{'code': 'PCLNR 2525M 12', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 95.0, 'clamping': 'LEVER'}], 'recommendations': {'M1': {'vc': 150.0, 'vc_min': 100.0, 'vc_max': 180.0, 'feed': 0.15, 'ap': 1.0, 'coolant': 'FLOOD'}, 'M2': {'vc': 115.0, 'vc_min': 80.0, 'vc_max': 150.0, 'feed': 0.13, 'ap': 0.8, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'S1': {'vc': 55.0, 'vc_min': 40.0, 'vc_max': 80.0, 'feed': 0.12, 'ap': 0.8, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'S2': {'vc': 65.0, 'vc_min': 50.0, 'vc_max': 80.0, 'feed': 0.13, 'ap': 0.9, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'P1': {'vc': 210.0, 'vc_min': 150.0, 'vc_max': 270.0, 'feed': 0.16, 'ap': 1.0, 'coolant': 'FLOOD'}}},
        {'id': 'ht-t03', 'iso_code': 'CNMG 120412-GH', 'brand': 'HARDTOOL', 'catalog_page': 'B-09', 'analog_note': 'CVD H7270PK · черновое точение стального проката, поковок и отливок (R1.2)', 'operation_domain': 'TURNING', 'shape_code': 'C', 'clearance_angle_deg': 0.0, 'ic_mm': 12.7, 'thickness_mm': 4.76, 'corner_radius_mm': 1.2, 'cutting_edges_count': 4, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'C-N-1270-476-G', 'relative_cost_index': 1.08, 'grade_code': 'H7270PK', 'coating_method': 'CVD', 'coating_composition': 'TiCN-Al2O3-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 7, 'suitability': {'P': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-GH', 'application_class': 'ROUGHING', 'edge_prep': 'CHAMFERED_HONED', 'ap_min_mm': 1.5, 'ap_max_mm': 6.0, 'fn_min_mm': 0.22, 'fn_max_mm': 0.55, 'operating_zone_polygon': [[0.2, 1.2], [0.55, 1.5], [0.5, 6.0], [0.2, 5.5]], 'holders': [{'code': 'PCLNR 2525M 12', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 95.0, 'clamping': 'LEVER'}], 'recommendations': {'P1': {'vc': 240.0, 'vc_min': 150.0, 'vc_max': 320.0, 'feed': 0.38, 'ap': 3.5, 'coolant': 'FLOOD'}, 'P2': {'vc': 200.0, 'vc_min': 150.0, 'vc_max': 280.0, 'feed': 0.35, 'ap': 3.2, 'coolant': 'FLOOD'}, 'K1': {'vc': 260.0, 'vc_min': 180.0, 'vc_max': 340.0, 'feed': 0.36, 'ap': 3.5, 'coolant': 'DRY'}}},
        {'id': 'ht-t04', 'iso_code': 'WNMG 080408-CTM', 'brand': 'HARDTOOL', 'catalog_page': 'B-07', 'analog_note': 'CVD H7270PK · 6 кромок, ударопрочный для стали и чугуна (Vc 150–350 м/мин)', 'operation_domain': 'TURNING', 'shape_code': 'W', 'clearance_angle_deg': 0.0, 'ic_mm': 12.7, 'thickness_mm': 4.76, 'corner_radius_mm': 0.8, 'cutting_edges_count': 6, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'W-N-1270-476-G', 'relative_cost_index': 1.04, 'grade_code': 'H7270PK', 'coating_method': 'CVD', 'coating_composition': 'TiCN-Al2O3-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'K': 'PRIMARY'}, 'chipbreaker_code': 'HT-CTM', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.8, 'ap_max_mm': 4.2, 'fn_min_mm': 0.15, 'fn_max_mm': 0.45, 'operating_zone_polygon': [[0.12, 0.5], [0.22, 0.45], [0.42, 0.9], [0.38, 3.8], [0.18, 3.4], [0.12, 1.8]], 'holders': [{'code': 'PWLNR 2525M 08', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 95.0, 'clamping': 'LEVER'}], 'recommendations': {'P1': {'vc': 270.0, 'vc_min': 150.0, 'vc_max': 350.0, 'feed': 0.3, 'ap': 2.5, 'coolant': 'FLOOD'}, 'P2': {'vc': 225.0, 'vc_min': 150.0, 'vc_max': 300.0, 'feed': 0.28, 'ap': 2.2, 'coolant': 'FLOOD'}, 'P3': {'vc': 185.0, 'vc_min': 130.0, 'vc_max': 240.0, 'feed': 0.24, 'ap': 2.0, 'coolant': 'FLOOD'}, 'K1': {'vc': 280.0, 'vc_min': 200.0, 'vc_max': 360.0, 'feed': 0.32, 'ap': 2.5, 'coolant': 'DRY'}, 'K2': {'vc': 220.0, 'vc_min': 150.0, 'vc_max': 280.0, 'feed': 0.28, 'ap': 2.2, 'coolant': 'FLOOD'}}},
        {'id': 'ht-t05', 'iso_code': 'WNMG 080412-MR', 'brand': 'HARDTOOL', 'catalog_page': 'B-08', 'analog_note': 'CVD H7270PK · прерывистое точение стали и чугуна с шаровидным графитом (6 кр., R1.2)', 'operation_domain': 'TURNING', 'shape_code': 'W', 'clearance_angle_deg': 0.0, 'ic_mm': 12.7, 'thickness_mm': 4.76, 'corner_radius_mm': 1.2, 'cutting_edges_count': 6, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'W-N-1270-476-G', 'relative_cost_index': 1.1, 'grade_code': 'H7270PK', 'coating_method': 'CVD', 'coating_composition': 'TiCN-Al2O3-HARDTOOL', 'toughness_index': 9, 'wear_resistance_index': 7, 'suitability': {'P': 'PRIMARY', 'K': 'PRIMARY', 'M': 'SECONDARY'}, 'chipbreaker_code': 'HT-MR', 'application_class': 'ROUGHING', 'edge_prep': 'CHAMFERED_HONED', 'ap_min_mm': 1.5, 'ap_max_mm': 6.2, 'fn_min_mm': 0.24, 'fn_max_mm': 0.58, 'operating_zone_polygon': [[0.2, 1.2], [0.55, 1.5], [0.5, 6.0], [0.2, 5.5]], 'holders': [{'code': 'PWLNR 2525M 08', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 95.0, 'clamping': 'LEVER'}], 'recommendations': {'P1': {'vc': 235.0, 'vc_min': 150.0, 'vc_max': 310.0, 'feed': 0.4, 'ap': 3.6, 'coolant': 'FLOOD'}, 'P2': {'vc': 200.0, 'vc_min': 150.0, 'vc_max': 260.0, 'feed': 0.36, 'ap': 3.2, 'coolant': 'FLOOD'}, 'K2': {'vc': 210.0, 'vc_min': 150.0, 'vc_max': 280.0, 'feed': 0.34, 'ap': 3.0, 'coolant': 'FLOOD'}, 'M1': {'vc': 135.0, 'vc_min': 90.0, 'vc_max': 175.0, 'feed': 0.28, 'ap': 2.6, 'coolant': 'FLOOD'}}},
        {'id': 'ht-t06', 'iso_code': 'WNMG 080408-CM', 'brand': 'HARDTOOL', 'catalog_page': 'B-01', 'analog_note': 'Серебристый PVD H9760PMS · 6 кромок для нержавейки, жаропрочки и легированных сталей', 'operation_domain': 'TURNING', 'shape_code': 'W', 'clearance_angle_deg': 0.0, 'ic_mm': 12.7, 'thickness_mm': 4.76, 'corner_radius_mm': 0.8, 'cutting_edges_count': 6, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'W-N-1270-476-G', 'relative_cost_index': 1.08, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'M': 'PRIMARY', 'P': 'PRIMARY', 'S': 'PRIMARY'}, 'chipbreaker_code': 'HT-CM', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.5, 'ap_max_mm': 3.6, 'fn_min_mm': 0.12, 'fn_max_mm': 0.4, 'operating_zone_polygon': [[0.12, 0.5], [0.22, 0.45], [0.42, 0.9], [0.38, 3.8], [0.18, 3.4], [0.12, 1.8]], 'holders': [{'code': 'PWLNR 2525M 08', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 95.0, 'clamping': 'LEVER'}], 'recommendations': {'M1': {'vc': 140.0, 'vc_min': 80.0, 'vc_max': 180.0, 'feed': 0.2, 'ap': 1.6, 'coolant': 'FLOOD'}, 'M2': {'vc': 110.0, 'vc_min': 70.0, 'vc_max': 150.0, 'feed': 0.16, 'ap': 1.4, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'P1': {'vc': 220.0, 'vc_min': 150.0, 'vc_max': 280.0, 'feed': 0.26, 'ap': 2.0, 'coolant': 'FLOOD'}, 'S2': {'vc': 55.0, 'vc_min': 40.0, 'vc_max': 75.0, 'feed': 0.14, 'ap': 1.2, 'coolant': 'HIGH_PRESSURE_THROUGH'}}},
        {'id': 'ht-t07', 'iso_code': 'DNMG 150604-CF', 'brand': 'HARDTOOL', 'catalog_page': 'B-03', 'analog_note': 'Бронзовый PVD H9960MSH · чистовое точение Ra 0.8 мкм и закалённых сталей HRC 40–63', 'operation_domain': 'TURNING', 'shape_code': 'D', 'clearance_angle_deg': 0.0, 'ic_mm': 12.7, 'thickness_mm': 6.35, 'corner_radius_mm': 0.4, 'cutting_edges_count': 4, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'D-N-1270-635-G', 'relative_cost_index': 1.22, 'grade_code': 'H9960MSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 7, 'wear_resistance_index': 9, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'H': 'PRIMARY'}, 'chipbreaker_code': 'HT-CF', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.2, 'ap_max_mm': 2.2, 'fn_min_mm': 0.06, 'fn_max_mm': 0.24, 'operating_zone_polygon': [[0.06, 0.2], [0.14, 0.18], [0.24, 0.35], [0.22, 2.0], [0.1, 1.6]], 'holders': [{'code': 'PDJNR 2525M 15', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 93.0, 'clamping': 'LEVER'}], 'recommendations': {'P1': {'vc': 215.0, 'vc_min': 140.0, 'vc_max': 280.0, 'feed': 0.14, 'ap': 0.8, 'coolant': 'FLOOD'}, 'P2': {'vc': 185.0, 'vc_min': 120.0, 'vc_max': 240.0, 'feed': 0.13, 'ap': 0.8, 'coolant': 'FLOOD'}, 'M1': {'vc': 140.0, 'vc_min': 80.0, 'vc_max': 180.0, 'feed': 0.12, 'ap': 0.7, 'coolant': 'FLOOD'}, 'S1': {'vc': 60.0, 'vc_min': 40.0, 'vc_max': 90.0, 'feed': 0.1, 'ap': 0.6, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'S2': {'vc': 65.0, 'vc_min': 50.0, 'vc_max': 80.0, 'feed': 0.12, 'ap': 0.8, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'H1': {'vc': 65.0, 'vc_min': 30.0, 'vc_max': 100.0, 'feed': 0.08, 'ap': 0.3, 'coolant': 'DRY'}}},
        {'id': 'ht-t08', 'iso_code': 'DNMG 150608-CM', 'brand': 'HARDTOOL', 'catalog_page': 'B-01', 'analog_note': 'Серебристый PVD H9760PMS · контурное получистовое точение 55° (P/M/S)', 'operation_domain': 'TURNING', 'shape_code': 'D', 'clearance_angle_deg': 0.0, 'ic_mm': 12.7, 'thickness_mm': 6.35, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'D-N-1270-635-G', 'relative_cost_index': 1.18, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-CM', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.5, 'ap_max_mm': 3.8, 'fn_min_mm': 0.12, 'fn_max_mm': 0.4, 'operating_zone_polygon': [[0.12, 0.5], [0.22, 0.45], [0.42, 0.9], [0.38, 3.8], [0.18, 3.4], [0.12, 1.8]], 'holders': [{'code': 'PDJNR 2525M 15', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 93.0, 'clamping': 'LEVER'}], 'recommendations': {'P1': {'vc': 230.0, 'vc_min': 150.0, 'vc_max': 290.0, 'feed': 0.26, 'ap': 2.2, 'coolant': 'FLOOD'}, 'P2': {'vc': 195.0, 'vc_min': 130.0, 'vc_max': 250.0, 'feed': 0.24, 'ap': 2.0, 'coolant': 'FLOOD'}, 'M1': {'vc': 130.0, 'vc_min': 80.0, 'vc_max': 175.0, 'feed': 0.18, 'ap': 1.5, 'coolant': 'FLOOD'}, 'K1': {'vc': 240.0, 'vc_min': 180.0, 'vc_max': 300.0, 'feed': 0.28, 'ap': 2.2, 'coolant': 'DRY'}}},
        {'id': 'ht-t09', 'iso_code': 'VNMG 160404-AU', 'brand': 'HARDTOOL', 'catalog_page': 'B-06', 'analog_note': 'Бронзовый PVD H9960MSH · сверхострый стружколом AU для профильного чистового точения 35°', 'operation_domain': 'TURNING', 'shape_code': 'V', 'clearance_angle_deg': 0.0, 'ic_mm': 9.525, 'thickness_mm': 4.76, 'corner_radius_mm': 0.4, 'cutting_edges_count': 4, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'V-N-953-476-G', 'relative_cost_index': 1.32, 'grade_code': 'H9960MSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 7, 'wear_resistance_index': 9, 'suitability': {'M': 'PRIMARY', 'S': 'PRIMARY', 'P': 'SECONDARY', 'H': 'SECONDARY'}, 'chipbreaker_code': 'HT-AU', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.15, 'ap_max_mm': 1.8, 'fn_min_mm': 0.05, 'fn_max_mm': 0.22, 'operating_zone_polygon': [[0.06, 0.2], [0.14, 0.18], [0.24, 0.35], [0.22, 2.0], [0.1, 1.6]], 'holders': [{'code': 'MVJNR 2525M 16', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 93.0, 'clamping': 'TOP_CLAMP'}], 'recommendations': {'M1': {'vc': 145.0, 'vc_min': 100.0, 'vc_max': 180.0, 'feed': 0.12, 'ap': 0.6, 'coolant': 'FLOOD'}, 'S1': {'vc': 55.0, 'vc_min': 35.0, 'vc_max': 80.0, 'feed': 0.1, 'ap': 0.5, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'S2': {'vc': 65.0, 'vc_min': 50.0, 'vc_max': 80.0, 'feed': 0.12, 'ap': 0.6, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'P1': {'vc': 205.0, 'vc_min': 140.0, 'vc_max': 260.0, 'feed': 0.14, 'ap': 0.8, 'coolant': 'FLOOD'}}},
        {'id': 'ht-t10', 'iso_code': 'SNMG 120412-GH', 'brand': 'HARDTOOL', 'catalog_page': 'B-09', 'analog_note': 'CVD H7820K · черновое точение серого и ковкого чугуна (8 кромок, R1.2)', 'operation_domain': 'TURNING', 'shape_code': 'S', 'clearance_angle_deg': 0.0, 'ic_mm': 12.7, 'thickness_mm': 4.76, 'corner_radius_mm': 1.2, 'cutting_edges_count': 8, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'S-N-1270-476-G', 'relative_cost_index': 1.08, 'grade_code': 'H7820K', 'coating_method': 'CVD', 'coating_composition': 'Thick-Al2O3-HARDTOOL', 'toughness_index': 6, 'wear_resistance_index': 9, 'suitability': {'K': 'PRIMARY', 'P': 'SECONDARY'}, 'chipbreaker_code': 'HT-GH', 'application_class': 'ROUGHING', 'edge_prep': 'CHAMFERED', 'ap_min_mm': 1.2, 'ap_max_mm': 6.0, 'fn_min_mm': 0.2, 'fn_max_mm': 0.55, 'operating_zone_polygon': [[0.2, 1.2], [0.55, 1.5], [0.5, 6.0], [0.2, 5.5]], 'holders': [{'code': 'PSBNR 2525M 12', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 75.0, 'clamping': 'LEVER'}], 'recommendations': {'K1': {'vc': 330.0, 'vc_min': 250.0, 'vc_max': 400.0, 'feed': 0.35, 'ap': 3.0, 'coolant': 'DRY'}, 'K2': {'vc': 225.0, 'vc_min': 150.0, 'vc_max': 280.0, 'feed': 0.3, 'ap': 2.8, 'coolant': 'FLOOD'}, 'P1': {'vc': 245.0, 'vc_min': 180.0, 'vc_max': 300.0, 'feed': 0.32, 'ap': 3.0, 'coolant': 'FLOOD'}}},
        {'id': 'ht-t11', 'iso_code': 'TNMG 160408-R-TC', 'brand': 'HARDTOOL', 'catalog_page': 'B-10', 'analog_note': 'CVD H7270P · 6 кромок, высокая скорость по стали (Vc 150–350 м/мин)', 'operation_domain': 'TURNING', 'shape_code': 'T', 'clearance_angle_deg': 0.0, 'ic_mm': 9.525, 'thickness_mm': 4.76, 'corner_radius_mm': 0.8, 'cutting_edges_count': 6, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'T-N-953-476-G', 'relative_cost_index': 0.9, 'grade_code': 'H7270P', 'coating_method': 'CVD', 'coating_composition': 'TiCN-Al2O3-HARDTOOL', 'toughness_index': 6, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-TC', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.6, 'ap_max_mm': 4.0, 'fn_min_mm': 0.14, 'fn_max_mm': 0.42, 'operating_zone_polygon': [[0.12, 0.5], [0.22, 0.45], [0.42, 0.9], [0.38, 3.8], [0.18, 3.4], [0.12, 1.8]], 'holders': [{'code': 'PTJNR 2525M 16', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 93.0, 'clamping': 'LEVER'}], 'recommendations': {'P1': {'vc': 280.0, 'vc_min': 150.0, 'vc_max': 350.0, 'feed': 0.28, 'ap': 2.2, 'coolant': 'FLOOD'}, 'P2': {'vc': 230.0, 'vc_min': 150.0, 'vc_max': 300.0, 'feed': 0.25, 'ap': 2.0, 'coolant': 'FLOOD'}, 'K1': {'vc': 260.0, 'vc_min': 180.0, 'vc_max': 320.0, 'feed': 0.3, 'ap': 2.2, 'coolant': 'DRY'}}},
        {'id': 'ht-t12', 'iso_code': 'CCMT 09T304-XM1', 'brand': 'HARDTOOL', 'catalog_page': 'B-05', 'analog_note': 'PVD H9760PM · позитивная 7° пластина для внутреннего растачивания и чистовой', 'operation_domain': 'TURNING', 'shape_code': 'C', 'clearance_angle_deg': 7.0, 'ic_mm': 9.525, 'thickness_mm': 3.97, 'corner_radius_mm': 0.4, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'C-C-953-397-T', 'relative_cost_index': 0.92, 'grade_code': 'H9760PM', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 7, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'SECONDARY', 'S': 'SECONDARY'}, 'chipbreaker_code': 'HT-XM1', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.25, 'ap_max_mm': 2.5, 'fn_min_mm': 0.08, 'fn_max_mm': 0.28, 'operating_zone_polygon': [[0.06, 0.2], [0.14, 0.18], [0.24, 0.35], [0.22, 2.0], [0.1, 1.6]], 'holders': [{'code': 'S20R-SCLCR 09', 'category': 'BORING_BAR', 'lead_angle_deg': 95.0, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 230.0, 'feed': 0.16, 'ap': 1.0, 'coolant': 'FLOOD'}, 'P2': {'vc': 150.0, 'vc_min': 90.0, 'vc_max': 200.0, 'feed': 0.15, 'ap': 1.0, 'coolant': 'FLOOD'}, 'M1': {'vc': 120.0, 'vc_min': 70.0, 'vc_max': 160.0, 'feed': 0.14, 'ap': 0.8, 'coolant': 'FLOOD'}, 'S2': {'vc': 50.0, 'vc_min': 35.0, 'vc_max': 70.0, 'feed': 0.1, 'ap': 0.6, 'coolant': 'HIGH_PRESSURE_THROUGH'}}},
        {'id': 'ht-t13', 'iso_code': 'DCMT 11T304-AL', 'brand': 'HARDTOOL', 'catalog_page': 'B-14', 'analog_note': 'Полированный H040N без покрытия · чистовое точение алюминия и меди (55°)', 'operation_domain': 'TURNING', 'shape_code': 'D', 'clearance_angle_deg': 7.0, 'ic_mm': 9.525, 'thickness_mm': 3.97, 'corner_radius_mm': 0.4, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'D-C-953-397-T', 'relative_cost_index': 0.98, 'grade_code': 'H040N', 'coating_method': 'UNCOATED', 'coating_composition': 'Polished-Submicron-HARDTOOL', 'toughness_index': 7, 'wear_resistance_index': 7, 'suitability': {'N': 'PRIMARY'}, 'chipbreaker_code': 'HT-AL', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.2, 'ap_max_mm': 2.2, 'fn_min_mm': 0.06, 'fn_max_mm': 0.26, 'operating_zone_polygon': [[0.06, 0.2], [0.14, 0.18], [0.24, 0.35], [0.22, 2.0], [0.1, 1.6]], 'holders': [{'code': 'SDJCR 2525M 11', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 93.0, 'clamping': 'SCREW'}, {'code': 'S16Q-SDUCR 11', 'category': 'BORING_BAR', 'lead_angle_deg': 93.0, 'clamping': 'SCREW'}], 'recommendations': {'N1': {'vc': 380.0, 'vc_min': 250.0, 'vc_max': 500.0, 'feed': 0.18, 'ap': 1.2, 'coolant': 'FLOOD'}, 'N2': {'vc': 230.0, 'vc_min': 180.0, 'vc_max': 300.0, 'feed': 0.15, 'ap': 1.0, 'coolant': 'FLOOD'}}},
        {'id': 'ht-t14', 'iso_code': 'CCGT 09T304-AL', 'brand': 'HARDTOOL', 'catalog_page': 'B-14', 'analog_note': 'Зеркально-полированный H040N · внутреннее и наружное точение цветмета (80°)', 'operation_domain': 'TURNING', 'shape_code': 'C', 'clearance_angle_deg': 7.0, 'ic_mm': 9.525, 'thickness_mm': 3.97, 'corner_radius_mm': 0.4, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'C-C-953-397-T', 'relative_cost_index': 1.02, 'grade_code': 'H040N', 'coating_method': 'UNCOATED', 'coating_composition': 'Polished-Submicron-HARDTOOL', 'toughness_index': 7, 'wear_resistance_index': 7, 'suitability': {'N': 'PRIMARY'}, 'chipbreaker_code': 'HT-AL', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.2, 'ap_max_mm': 2.2, 'fn_min_mm': 0.06, 'fn_max_mm': 0.26, 'operating_zone_polygon': [[0.06, 0.2], [0.14, 0.18], [0.24, 0.35], [0.22, 2.0], [0.1, 1.6]], 'holders': [{'code': 'S20R-SCLCR 09', 'category': 'BORING_BAR', 'lead_angle_deg': 95.0, 'clamping': 'SCREW'}], 'recommendations': {'N1': {'vc': 380.0, 'vc_min': 250.0, 'vc_max': 500.0, 'feed': 0.18, 'ap': 1.2, 'coolant': 'FLOOD'}, 'N2': {'vc': 230.0, 'vc_min': 180.0, 'vc_max': 300.0, 'feed': 0.15, 'ap': 1.0, 'coolant': 'FLOOD'}}},
        {'id': 'ht-t15', 'iso_code': 'CNGA 120408-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-04', 'analog_note': 'PVD H9280PMSH · обработка закалённых сталей HRC 48–63 (в гнездо PCLNR 12)', 'operation_domain': 'TURNING', 'shape_code': 'C', 'clearance_angle_deg': 0.0, 'ic_mm': 12.7, 'thickness_mm': 4.76, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'C-N-1270-476-A', 'relative_cost_index': 3.9, 'grade_code': 'H9280PMSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 5, 'wear_resistance_index': 10, 'suitability': {'H': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-HARD', 'application_class': 'FINISHING', 'edge_prep': 'CHAMFERED', 'ap_min_mm': 0.08, 'ap_max_mm': 0.8, 'fn_min_mm': 0.05, 'fn_max_mm': 0.18, 'operating_zone_polygon': [[0.05, 0.1], [0.18, 0.15], [0.16, 0.8], [0.05, 0.65]], 'holders': [{'code': 'PCLNR 2525M 12', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 95.0, 'clamping': 'LEVER'}], 'recommendations': {'H1': {'vc': 110.0, 'vc_min': 60.0, 'vc_max': 160.0, 'feed': 0.1, 'ap': 0.25, 'coolant': 'DRY'}, 'K1': {'vc': 320.0, 'vc_min': 220.0, 'vc_max': 420.0, 'feed': 0.14, 'ap': 0.4, 'coolant': 'DRY'}}},
        {'id': 'ht-t16', 'iso_code': 'XPGT 110304-CF', 'brand': 'HARDTOOL', 'catalog_page': 'B-22', 'analog_note': 'PVD H9960MSH · мелкоразмерное продольное точение и растачивание от Ø8 мм', 'operation_domain': 'TURNING', 'shape_code': 'X', 'clearance_angle_deg': 11.0, 'ic_mm': 6.35, 'thickness_mm': 3.18, 'corner_radius_mm': 0.4, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'X-P-635-318-T', 'relative_cost_index': 1.15, 'grade_code': 'H9960MSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY'}, 'chipbreaker_code': 'HT-XP-CF', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.1, 'ap_max_mm': 1.5, 'fn_min_mm': 0.02, 'fn_max_mm': 0.15, 'operating_zone_polygon': [[0.02, 0.1], [0.15, 0.2], [0.14, 1.5], [0.02, 1.2]], 'holders': [{'code': 'SVJCR 1212F-11', 'category': 'TURNING_EXTERNAL', 'lead_angle_deg': 93.0, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 160.0, 'vc_min': 80.0, 'vc_max': 200.0, 'feed': 0.08, 'ap': 0.6, 'coolant': 'FLOOD'}, 'M1': {'vc': 110.0, 'vc_min': 60.0, 'vc_max': 150.0, 'feed': 0.06, 'ap': 0.5, 'coolant': 'FLOOD'}, 'S2': {'vc': 55.0, 'vc_min': 35.0, 'vc_max': 80.0, 'feed': 0.05, 'ap': 0.4, 'coolant': 'HIGH_PRESSURE_THROUGH'}}},
        {'id': 'ht-m01', 'iso_code': 'EDHT 0402ER-CM', 'brand': 'HARDTOOL', 'catalog_page': 'A-02', 'analog_note': 'High-Feed R=1.5 мм · H9660PMSH сухое/воздух, для маломощных станков (Ø8–16 мм)', 'operation_domain': 'MILLING', 'shape_code': 'E', 'clearance_angle_deg': 15.0, 'ic_mm': 4.2, 'thickness_mm': 2.38, 'corner_radius_mm': 1.5, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'E-D-420-238-T', 'relative_cost_index': 0.95, 'grade_code': 'H9660PMSH', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'PRIMARY', 'H': 'PRIMARY'}, 'chipbreaker_code': 'HT-HF-CM', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.15, 'ap_max_mm': 0.5, 'fn_min_mm': 0.1, 'fn_max_mm': 0.5, 'operating_zone_polygon': [[0.1, 0.15], [0.5, 0.2], [0.45, 0.5], [0.1, 0.45]], 'holders': [{'code': 'ASR-16X100-ED04-4T', 'category': 'SHOULDER_MILL', 'lead_angle_deg': 17.0, 'dc_mm': 16.0, 'z': 4, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 160.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.3, 'ap': 0.4, 'ae_ratio': 0.7, 'coolant': 'AIR_BLAST'}, 'P2': {'vc': 140.0, 'vc_min': 100.0, 'vc_max': 200.0, 'feed': 0.28, 'ap': 0.35, 'ae_ratio': 0.7, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 110.0, 'vc_min': 60.0, 'vc_max': 150.0, 'feed': 0.25, 'ap': 0.3, 'ae_ratio': 0.65, 'coolant': 'AIR_BLAST'}, 'K1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 220.0, 'feed': 0.4, 'ap': 0.35, 'ae_ratio': 0.75, 'coolant': 'DRY'}, 'S2': {'vc': 60.0, 'vc_min': 30.0, 'vc_max': 80.0, 'feed': 0.35, 'ap': 0.3, 'ae_ratio': 0.6, 'coolant': 'AIR_BLAST'}, 'H1': {'vc': 80.0, 'vc_min': 50.0, 'vc_max': 120.0, 'feed': 0.1, 'ap': 0.15, 'ae_ratio': 0.5, 'coolant': 'AIR_BLAST'}}},
        {'id': 'ht-m02', 'iso_code': 'EPMT 060308-CM', 'brand': 'HARDTOOL', 'catalog_page': 'A-03', 'analog_note': 'High-Feed fz до 1.2 мм/зуб, ap до 0.8 мм (H9760PMS)', 'operation_domain': 'MILLING', 'shape_code': 'E', 'clearance_angle_deg': 11.0, 'ic_mm': 6.0, 'thickness_mm': 3.18, 'corner_radius_mm': 0.8, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'E-P-600-318-T', 'relative_cost_index': 1.05, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'SECONDARY'}, 'chipbreaker_code': 'HT-EP-CM', 'application_class': 'ROUGHING', 'edge_prep': 'HONED', 'ap_min_mm': 0.2, 'ap_max_mm': 0.8, 'fn_min_mm': 0.3, 'fn_max_mm': 1.2, 'operating_zone_polygon': [[0.3, 0.2], [1.2, 0.3], [1.0, 0.8], [0.3, 0.8]], 'holders': [{'code': 'ASR-25X110-EP06-4T', 'category': 'SHOULDER_MILL', 'lead_angle_deg': 17.0, 'dc_mm': 25.0, 'z': 4, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 165.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.75, 'ap': 0.6, 'ae_ratio': 0.7, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 115.0, 'vc_min': 80.0, 'vc_max': 150.0, 'feed': 0.5, 'ap': 0.5, 'ae_ratio': 0.6, 'coolant': 'FLOOD'}, 'K1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 220.0, 'feed': 0.8, 'ap': 0.6, 'ae_ratio': 0.75, 'coolant': 'DRY'}}},
        {'id': 'ht-m03', 'iso_code': 'LNMU 0303ZER-CM', 'brand': 'HARDTOOL', 'catalog_page': 'A-06', 'analog_note': 'Двусторонняя 4 кр. High-Feed (R=1.5 мм) · замена круглых R5 и APMT11', 'operation_domain': 'MILLING', 'shape_code': 'L', 'clearance_angle_deg': 0.0, 'ic_mm': 6.5, 'thickness_mm': 3.18, 'corner_radius_mm': 1.2, 'cutting_edges_count': 4, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'L-N-650-318-U', 'relative_cost_index': 1.15, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'PRIMARY', 'H': 'SECONDARY'}, 'chipbreaker_code': 'HT-EXN', 'application_class': 'ROUGHING', 'edge_prep': 'HONED', 'ap_min_mm': 0.2, 'ap_max_mm': 1.0, 'fn_min_mm': 0.3, 'fn_max_mm': 1.5, 'operating_zone_polygon': [[0.2, 0.2], [1.5, 0.3], [1.2, 0.8], [0.2, 1.0]], 'holders': [{'code': 'EXN03R 50X22X45-6T', 'category': 'FACE_MILL', 'lead_angle_deg': 17.0, 'dc_mm': 50.0, 'z': 6, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 170.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.9, 'ap': 0.7, 'ae_ratio': 0.7, 'coolant': 'AIR_BLAST'}, 'P2': {'vc': 150.0, 'vc_min': 100.0, 'vc_max': 200.0, 'feed': 0.8, 'ap': 0.5, 'ae_ratio': 0.7, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 120.0, 'vc_min': 100.0, 'vc_max': 150.0, 'feed': 0.5, 'ap': 0.5, 'ae_ratio': 0.6, 'coolant': 'FLOOD'}, 'K1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 1.0, 'ap': 0.8, 'ae_ratio': 0.75, 'coolant': 'DRY'}, 'S2': {'vc': 70.0, 'vc_min': 40.0, 'vc_max': 100.0, 'feed': 0.4, 'ap': 0.4, 'ae_ratio': 0.55, 'coolant': 'FLOOD'}}},
        {'id': 'ht-m04', 'iso_code': 'LNHX 11T408AFN', 'brand': 'HARDTOOL', 'catalog_page': 'A-10', 'analog_note': 'Двусторонняя 90° (4 кр., ap до 9 мм) · замена APMT11 и APKT11', 'operation_domain': 'MILLING', 'shape_code': 'L', 'clearance_angle_deg': 0.0, 'ic_mm': 6.6, 'thickness_mm': 4.37, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': True, 'has_wiper_geometry': True, 'seat_pocket_signature': 'L-N-660-437-X', 'relative_cost_index': 1.18, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'PRIMARY', 'H': 'SECONDARY'}, 'chipbreaker_code': 'HT-AFN', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.3, 'ap_max_mm': 9.0, 'fn_min_mm': 0.1, 'fn_max_mm': 0.5, 'operating_zone_polygon': [[0.08, 0.3], [0.45, 0.6], [0.38, 8.5], [0.08, 8.0]], 'holders': [{'code': 'LDR 50X22X45-LN11-6T', 'category': 'SHOULDER_MILL', 'lead_angle_deg': 90.0, 'dc_mm': 50.0, 'z': 6, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.25, 'ap': 4.0, 'ae_ratio': 0.5, 'coolant': 'AIR_BLAST'}, 'P2': {'vc': 150.0, 'vc_min': 100.0, 'vc_max': 200.0, 'feed': 0.22, 'ap': 3.5, 'ae_ratio': 0.5, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 120.0, 'vc_min': 60.0, 'vc_max': 150.0, 'feed': 0.2, 'ap': 3.0, 'ae_ratio': 0.4, 'coolant': 'FLOOD'}, 'K1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 0.35, 'ap': 4.5, 'ae_ratio': 0.6, 'coolant': 'DRY'}, 'S2': {'vc': 60.0, 'vc_min': 40.0, 'vc_max': 80.0, 'feed': 0.18, 'ap': 2.5, 'ae_ratio': 0.35, 'coolant': 'FLOOD'}}},
        {'id': 'ht-m05', 'iso_code': 'LOHT 080408FN', 'brand': 'HARDTOOL', 'catalog_page': 'A-13', 'analog_note': '90° тангенциальное крепление (4 кр., ap до 8 мм, сверхжёсткий корпус ALR/ALFR)', 'operation_domain': 'MILLING', 'shape_code': 'L', 'clearance_angle_deg': 11.0, 'ic_mm': 6.4, 'thickness_mm': 4.76, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'L-O-640-476-T', 'relative_cost_index': 1.16, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 9, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'PRIMARY'}, 'chipbreaker_code': 'HT-LOHT', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.3, 'ap_max_mm': 8.0, 'fn_min_mm': 0.05, 'fn_max_mm': 0.5, 'operating_zone_polygon': [[0.08, 0.3], [0.45, 0.6], [0.38, 8.5], [0.08, 8.0]], 'holders': [{'code': 'ALFR 50X22X45-LO08-7T-W', 'category': 'SHOULDER_MILL', 'lead_angle_deg': 90.0, 'dc_mm': 50.0, 'z': 7, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.24, 'ap': 4.0, 'ae_ratio': 0.5, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 120.0, 'vc_min': 60.0, 'vc_max': 150.0, 'feed': 0.2, 'ap': 3.0, 'ae_ratio': 0.4, 'coolant': 'FLOOD'}, 'K1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 0.32, 'ap': 4.5, 'ae_ratio': 0.6, 'coolant': 'DRY'}}},
        {'id': 'ht-m06', 'iso_code': 'LOHT 120510FN', 'brand': 'HARDTOOL', 'catalog_page': 'A-13', 'analog_note': '90° тангенциальное крепление (4 кр., ap до 12 мм, тяжёлое фрезерование уступов)', 'operation_domain': 'MILLING', 'shape_code': 'L', 'clearance_angle_deg': 11.0, 'ic_mm': 8.2, 'thickness_mm': 5.56, 'corner_radius_mm': 1.0, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'L-O-820-556-T', 'relative_cost_index': 1.34, 'grade_code': 'H9780PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 9, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY'}, 'chipbreaker_code': 'HT-LOHT12', 'application_class': 'ROUGHING', 'edge_prep': 'HONED', 'ap_min_mm': 0.3, 'ap_max_mm': 12.0, 'fn_min_mm': 0.08, 'fn_max_mm': 0.8, 'operating_zone_polygon': [[0.08, 0.3], [0.8, 0.8], [0.65, 12.0], [0.08, 11.0]], 'holders': [{'code': 'ALFR 80X27X50-LO12-7T-W', 'category': 'SHOULDER_MILL', 'lead_angle_deg': 90.0, 'dc_mm': 80.0, 'z': 7, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 175.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.32, 'ap': 6.0, 'ae_ratio': 0.5, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 115.0, 'vc_min': 60.0, 'vc_max': 150.0, 'feed': 0.24, 'ap': 4.5, 'ae_ratio': 0.4, 'coolant': 'FLOOD'}, 'K1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 0.4, 'ap': 6.5, 'ae_ratio': 0.6, 'coolant': 'DRY'}}},
        {'id': 'ht-m07', 'iso_code': 'SDKT 093508-CM', 'brand': 'HARDTOOL', 'catalog_page': 'A-17', 'analog_note': 'High-Feed «генератор стружки» · R=2.0 мм, fz до 1.5 мм/зуб (H9760PMS)', 'operation_domain': 'MILLING', 'shape_code': 'S', 'clearance_angle_deg': 15.0, 'ic_mm': 9.525, 'thickness_mm': 3.57, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'S-D-953-357-T', 'relative_cost_index': 1.28, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 9, 'wear_resistance_index': 7, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'PRIMARY', 'H': 'SECONDARY'}, 'chipbreaker_code': 'HT-SD-HF', 'application_class': 'ROUGHING', 'edge_prep': 'CHAMFERED_HONED', 'ap_min_mm': 0.3, 'ap_max_mm': 0.8, 'fn_min_mm': 0.3, 'fn_max_mm': 1.5, 'operating_zone_polygon': [[0.2, 0.2], [1.5, 0.3], [1.2, 0.8], [0.2, 1.0]], 'holders': [{'code': 'CSDR-50-SD09-6T-22-W', 'category': 'FACE_MILL', 'lead_angle_deg': 16.0, 'dc_mm': 50.0, 'z': 6, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 160.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 1.0, 'ap': 0.7, 'ae_ratio': 0.7, 'coolant': 'AIR_BLAST'}, 'P2': {'vc': 140.0, 'vc_min': 100.0, 'vc_max': 200.0, 'feed': 0.85, 'ap': 0.6, 'ae_ratio': 0.65, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 120.0, 'vc_min': 100.0, 'vc_max': 150.0, 'feed': 0.55, 'ap': 0.5, 'ae_ratio': 0.6, 'coolant': 'FLOOD'}, 'K1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 1.1, 'ap': 0.8, 'ae_ratio': 0.75, 'coolant': 'DRY'}}},
        {'id': 'ht-m08', 'iso_code': 'SDHT 120520-FN', 'brand': 'HARDTOOL', 'catalog_page': 'A-17', 'analog_note': 'High-Feed острая кромка · R=3.0 мм, fz до 2.0 мм/зуб, ap до 1.2 мм', 'operation_domain': 'MILLING', 'shape_code': 'S', 'clearance_angle_deg': 15.0, 'ic_mm': 12.7, 'thickness_mm': 5.56, 'corner_radius_mm': 2.0, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'S-D-1270-556-T', 'relative_cost_index': 1.42, 'grade_code': 'H9960MSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-SD12-FN', 'application_class': 'ROUGHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.4, 'ap_max_mm': 1.2, 'fn_min_mm': 0.5, 'fn_max_mm': 2.0, 'operating_zone_polygon': [[0.5, 0.4], [2.0, 0.5], [1.6, 1.2], [0.5, 1.2]], 'holders': [{'code': 'CSDR-63-SD12-5T-22', 'category': 'FACE_MILL', 'lead_angle_deg': 16.0, 'dc_mm': 63.0, 'z': 5, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 165.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 1.2, 'ap': 0.9, 'ae_ratio': 0.7, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 120.0, 'vc_min': 100.0, 'vc_max': 150.0, 'feed': 0.65, 'ap': 0.7, 'ae_ratio': 0.6, 'coolant': 'FLOOD'}, 'S2': {'vc': 60.0, 'vc_min': 30.0, 'vc_max': 80.0, 'feed': 0.65, 'ap': 0.6, 'ae_ratio': 0.55, 'coolant': 'FLOOD'}}},
        {'id': 'ht-m09', 'iso_code': 'WNMU 060610-SN', 'brand': 'HARDTOOL', 'catalog_page': 'A-21', 'analog_note': 'Двусторонняя тригон 90° (6 кр.) · прямая замена APMT1604PDER-H2', 'operation_domain': 'MILLING', 'shape_code': 'W', 'clearance_angle_deg': 0.0, 'ic_mm': 9.525, 'thickness_mm': 6.35, 'corner_radius_mm': 1.0, 'cutting_edges_count': 6, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'W-N-953-635-U', 'relative_cost_index': 1.24, 'grade_code': 'H9760PM', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 7, 'suitability': {'P': 'PRIMARY', 'K': 'PRIMARY', 'M': 'SECONDARY'}, 'chipbreaker_code': 'HT-WN-SN', 'application_class': 'MEDIUM', 'edge_prep': 'CHAMFERED_HONED', 'ap_min_mm': 0.1, 'ap_max_mm': 4.0, 'fn_min_mm': 0.1, 'fn_max_mm': 0.5, 'operating_zone_polygon': [[0.1, 0.2], [0.5, 0.5], [0.45, 4.5], [0.1, 4.2]], 'holders': [{'code': 'MFWN06-90-50-22-4T-W', 'category': 'SHOULDER_MILL', 'lead_angle_deg': 90.0, 'dc_mm': 50.0, 'z': 4, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.25, 'ap': 3.0, 'ae_ratio': 0.5, 'coolant': 'AIR_BLAST'}, 'P2': {'vc': 155.0, 'vc_min': 100.0, 'vc_max': 200.0, 'feed': 0.22, 'ap': 2.8, 'ae_ratio': 0.5, 'coolant': 'AIR_BLAST'}, 'K1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 0.35, 'ap': 3.5, 'ae_ratio': 0.6, 'coolant': 'DRY'}}},
        {'id': 'ht-m10', 'iso_code': 'XNMX 080608TR-CM', 'brand': 'HARDTOOL', 'catalog_page': 'A-21', 'analog_note': 'Двусторонняя 90° усиленная (6 кр., ap до 4 мм) · корпус MFXN08', 'operation_domain': 'MILLING', 'shape_code': 'X', 'clearance_angle_deg': 0.0, 'ic_mm': 12.7, 'thickness_mm': 6.35, 'corner_radius_mm': 0.8, 'cutting_edges_count': 6, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'X-N-1270-635-X', 'relative_cost_index': 1.32, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'K': 'PRIMARY', 'M': 'SECONDARY'}, 'chipbreaker_code': 'HT-XNMX-CM', 'application_class': 'ROUGHING', 'edge_prep': 'CHAMFERED_HONED', 'ap_min_mm': 0.1, 'ap_max_mm': 4.0, 'fn_min_mm': 0.1, 'fn_max_mm': 0.5, 'operating_zone_polygon': [[0.1, 0.2], [0.5, 0.5], [0.45, 4.5], [0.1, 4.2]], 'holders': [{'code': 'MFXN08-90-80-27-6T', 'category': 'SHOULDER_MILL', 'lead_angle_deg': 90.0, 'dc_mm': 80.0, 'z': 6, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.28, 'ap': 3.2, 'ae_ratio': 0.5, 'coolant': 'AIR_BLAST'}, 'K1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 0.38, 'ap': 3.5, 'ae_ratio': 0.6, 'coolant': 'DRY'}}},
        {'id': 'ht-m11', 'iso_code': 'SNMJ 10T308-SN', 'brand': 'HARDTOOL', 'catalog_page': 'A-25', 'analog_note': 'Квадратная двусторонняя 88° (8 кр., ap до 4 мм) · корпус DGCM-50-SN10', 'operation_domain': 'MILLING', 'shape_code': 'S', 'clearance_angle_deg': 0.0, 'ic_mm': 10.0, 'thickness_mm': 3.97, 'corner_radius_mm': 0.8, 'cutting_edges_count': 8, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'S-N-1000-397-J', 'relative_cost_index': 1.14, 'grade_code': 'H9780PM', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'K': 'PRIMARY', 'M': 'SECONDARY'}, 'chipbreaker_code': 'HT-SNMJ', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.1, 'ap_max_mm': 4.0, 'fn_min_mm': 0.1, 'fn_max_mm': 0.5, 'operating_zone_polygon': [[0.1, 0.2], [0.5, 0.5], [0.45, 4.5], [0.1, 4.2]], 'holders': [{'code': 'DGCM-50-22-SN10-5T-88-W', 'category': 'SHOULDER_MILL', 'lead_angle_deg': 88.0, 'dc_mm': 50.0, 'z': 5, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.26, 'ap': 3.0, 'ae_ratio': 0.55, 'coolant': 'AIR_BLAST'}, 'K1': {'vc': 185.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 0.35, 'ap': 3.5, 'ae_ratio': 0.65, 'coolant': 'DRY'}}},
        {'id': 'ht-m12', 'iso_code': 'SNHT 13T6ANER-CM', 'brand': 'HARDTOOL', 'catalog_page': 'A-29', 'analog_note': 'Торцовая 45° (4 кр., ap до 4.5 мм) · совместима с корпусами Sumitomo и DGCM', 'operation_domain': 'MILLING', 'shape_code': 'S', 'clearance_angle_deg': 11.0, 'ic_mm': 13.4, 'thickness_mm': 6.35, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'S-H-1340-635-T', 'relative_cost_index': 1.26, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'K': 'PRIMARY', 'M': 'SECONDARY'}, 'chipbreaker_code': 'HT-SN13', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.1, 'ap_max_mm': 4.5, 'fn_min_mm': 0.07, 'fn_max_mm': 0.5, 'operating_zone_polygon': [[0.1, 0.2], [0.5, 0.5], [0.45, 4.5], [0.1, 4.2]], 'holders': [{'code': 'DGCM 080-27-6T-45°', 'category': 'FACE_MILL', 'lead_angle_deg': 45.0, 'dc_mm': 80.0, 'z': 6, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 185.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.25, 'ap': 3.0, 'ae_ratio': 0.65, 'coolant': 'AIR_BLAST'}, 'K1': {'vc': 190.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 0.32, 'ap': 3.5, 'ae_ratio': 0.7, 'coolant': 'DRY'}}},
        {'id': 'ht-m13', 'iso_code': 'PNHU 0905GNER-X', 'brand': 'HARDTOOL', 'catalog_page': 'A-33', 'analog_note': 'Двусторонняя 5-гранная (10 кр., ap до 2 мм) · аналог Tungaloy, корпус TEN 67°', 'operation_domain': 'MILLING', 'shape_code': 'P', 'clearance_angle_deg': 0.0, 'ic_mm': 14.5, 'thickness_mm': 5.56, 'corner_radius_mm': 0.8, 'cutting_edges_count': 10, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'P-N-1450-556-U', 'relative_cost_index': 1.38, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-PNHU', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.1, 'ap_max_mm': 2.0, 'fn_min_mm': 0.05, 'fn_max_mm': 0.3, 'operating_zone_polygon': [[0.05, 0.1], [0.3, 0.3], [0.25, 2.0], [0.05, 2.0]], 'holders': [{'code': 'TEN09R080M27-7T-67°-W', 'category': 'FACE_MILL', 'lead_angle_deg': 67.0, 'dc_mm': 80.0, 'z': 7, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.18, 'ap': 1.5, 'ae_ratio': 0.6, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 120.0, 'vc_min': 100.0, 'vc_max': 150.0, 'feed': 0.15, 'ap': 1.2, 'ae_ratio': 0.55, 'coolant': 'FLOOD'}, 'S2': {'vc': 60.0, 'vc_min': 30.0, 'vc_max': 80.0, 'feed': 0.14, 'ap': 1.0, 'ae_ratio': 0.5, 'coolant': 'FLOOD'}}},
        {'id': 'ht-m14', 'iso_code': 'HNGX 0906ANSN', 'brand': 'HARDTOOL', 'catalog_page': 'A-37', 'analog_note': 'Двусторонняя 6-гранная 45° (12 кр., ap до 5.5 мм) · аналог Pramet', 'operation_domain': 'MILLING', 'shape_code': 'H', 'clearance_angle_deg': 0.0, 'ic_mm': 15.0, 'thickness_mm': 6.35, 'corner_radius_mm': 0.8, 'cutting_edges_count': 12, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'H-N-1500-635-X', 'relative_cost_index': 1.48, 'grade_code': 'H9760PM', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'K': 'PRIMARY', 'M': 'SECONDARY'}, 'chipbreaker_code': 'HT-HNGX', 'application_class': 'ROUGHING', 'edge_prep': 'HONED', 'ap_min_mm': 0.1, 'ap_max_mm': 5.5, 'fn_min_mm': 0.07, 'fn_max_mm': 0.4, 'operating_zone_polygon': [[0.07, 0.2], [0.4, 0.5], [0.35, 5.5], [0.07, 5.0]], 'holders': [{'code': '80A08R-S45HN09-W', 'category': 'FACE_MILL', 'lead_angle_deg': 45.0, 'dc_mm': 80.0, 'z': 8, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.24, 'ap': 3.5, 'ae_ratio': 0.65, 'coolant': 'AIR_BLAST'}, 'K1': {'vc': 185.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 0.3, 'ap': 4.0, 'ae_ratio': 0.7, 'coolant': 'DRY'}}},
        {'id': 'ht-m15', 'iso_code': 'XNMU 0805ANTN', 'brand': 'HARDTOOL', 'catalog_page': 'A-41', 'analog_note': 'Собственная разработка HARDTOOL · 7-гранная 14 кромок (ap до 4.8 мм, R1.2)', 'operation_domain': 'MILLING', 'shape_code': 'X', 'clearance_angle_deg': 0.0, 'ic_mm': 14.8, 'thickness_mm': 5.56, 'corner_radius_mm': 1.2, 'cutting_edges_count': 14, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'X-N-1480-556-U', 'relative_cost_index': 1.55, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'PRIMARY'}, 'chipbreaker_code': 'HT-XN08', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.1, 'ap_max_mm': 4.8, 'fn_min_mm': 0.05, 'fn_max_mm': 0.3, 'operating_zone_polygon': [[0.05, 0.2], [0.3, 0.5], [0.26, 4.8], [0.05, 4.5]], 'holders': [{'code': '80A07R-S45-XN08', 'category': 'FACE_MILL', 'lead_angle_deg': 45.0, 'dc_mm': 80.0, 'z': 7, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.22, 'ap': 3.0, 'ae_ratio': 0.65, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 120.0, 'vc_min': 100.0, 'vc_max': 150.0, 'feed': 0.18, 'ap': 2.5, 'ae_ratio': 0.55, 'coolant': 'FLOOD'}, 'K1': {'vc': 185.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 0.28, 'ap': 3.5, 'ae_ratio': 0.7, 'coolant': 'DRY'}}},
        {'id': 'ht-m16', 'iso_code': 'ONMU 0605ANSN', 'brand': 'HARDTOOL', 'catalog_page': 'A-49', 'analog_note': '8-гранная 16 кромок (44°) · глянцевая плоскость Ra 0.6 мкм за один проход', 'operation_domain': 'MILLING', 'shape_code': 'O', 'clearance_angle_deg': 0.0, 'ic_mm': 14.5, 'thickness_mm': 5.56, 'corner_radius_mm': 0.8, 'cutting_edges_count': 16, 'is_double_sided': True, 'has_wiper_geometry': True, 'seat_pocket_signature': 'O-N-1450-556-U', 'relative_cost_index': 1.65, 'grade_code': 'H9280PMSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 7, 'wear_resistance_index': 9, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'PRIMARY', 'H': 'PRIMARY'}, 'chipbreaker_code': 'HT-ON-SN', 'application_class': 'MEDIUM', 'edge_prep': 'CHAMFERED_HONED', 'ap_min_mm': 0.1, 'ap_max_mm': 3.8, 'fn_min_mm': 0.1, 'fn_max_mm': 0.5, 'operating_zone_polygon': [[0.1, 0.2], [0.5, 0.5], [0.45, 4.5], [0.1, 4.2]], 'holders': [{'code': '80A06R-S44W-ON06', 'category': 'FACE_MILL', 'lead_angle_deg': 44.0, 'dc_mm': 80.0, 'z': 6, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 250.0, 'feed': 0.25, 'ap': 2.5, 'ae_ratio': 0.65, 'coolant': 'AIR_BLAST'}, 'P2': {'vc': 150.0, 'vc_min': 100.0, 'vc_max': 200.0, 'feed': 0.22, 'ap': 2.5, 'ae_ratio': 0.65, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 125.0, 'vc_min': 100.0, 'vc_max': 180.0, 'feed': 0.2, 'ap': 2.0, 'ae_ratio': 0.55, 'coolant': 'FLOOD'}, 'K1': {'vc': 190.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 0.32, 'ap': 3.0, 'ae_ratio': 0.7, 'coolant': 'DRY'}, 'H1': {'vc': 80.0, 'vc_min': 50.0, 'vc_max': 120.0, 'feed': 0.15, 'ap': 0.5, 'ae_ratio': 0.5, 'coolant': 'AIR_BLAST'}}},
        {'id': 'ht-m17', 'iso_code': 'JXHT 1905ZZTN-RA', 'brand': 'HARDTOOL', 'catalog_page': 'A-56', 'analog_note': 'Собственная разработка HARDTOOL · 12-кромочная чистовая Ra 0.6 мкм (ap до 5 мм)', 'operation_domain': 'MILLING', 'shape_code': 'J', 'clearance_angle_deg': 11.0, 'ic_mm': 19.0, 'thickness_mm': 5.56, 'corner_radius_mm': 0.8, 'cutting_edges_count': 12, 'is_double_sided': False, 'has_wiper_geometry': True, 'seat_pocket_signature': 'J-P-1900-556-T', 'relative_cost_index': 1.72, 'grade_code': 'H9280PMSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 7, 'wear_resistance_index': 9, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'PRIMARY'}, 'chipbreaker_code': 'HT-JX19', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.1, 'ap_max_mm': 5.0, 'fn_min_mm': 0.1, 'fn_max_mm': 0.6, 'operating_zone_polygon': [[0.1, 0.1], [0.6, 0.3], [0.5, 5.0], [0.1, 4.5]], 'holders': [{'code': '80A06R-FM-JX1905-W', 'category': 'FACE_MILL', 'lead_angle_deg': 42.0, 'dc_mm': 80.0, 'z': 6, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 250.0, 'feed': 0.28, 'ap': 1.5, 'ae_ratio': 0.65, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 120.0, 'vc_min': 60.0, 'vc_max': 150.0, 'feed': 0.22, 'ap': 1.2, 'ae_ratio': 0.55, 'coolant': 'FLOOD'}, 'K1': {'vc': 185.0, 'vc_min': 150.0, 'vc_max': 220.0, 'feed': 0.35, 'ap': 2.0, 'ae_ratio': 0.7, 'coolant': 'DRY'}}},
        {'id': 'ht-m18', 'iso_code': 'SDMT 09T308-CM', 'brand': 'HARDTOOL', 'catalog_page': 'A-58', 'analog_note': 'Т-образная фреза HARDTOOL для пазов и обратных цековок (ap до 10 мм)', 'operation_domain': 'MILLING', 'shape_code': 'S', 'clearance_angle_deg': 15.0, 'ic_mm': 9.525, 'thickness_mm': 3.97, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'S-D-953-397-T', 'relative_cost_index': 1.18, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'PRIMARY'}, 'chipbreaker_code': 'HT-TSLOT', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.5, 'ap_max_mm': 10.0, 'fn_min_mm': 0.05, 'fn_max_mm': 0.15, 'operating_zone_polygon': [[0.05, 0.5], [0.15, 1.0], [0.14, 10.0], [0.05, 9.0]], 'holders': [{'code': 'BMCS84X14-S32-SD09-10T', 'category': 'SHOULDER_MILL', 'lead_angle_deg': 90.0, 'dc_mm': 84.0, 'z': 10, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 160.0, 'vc_min': 120.0, 'vc_max': 250.0, 'feed': 0.1, 'ap': 5.0, 'ae_ratio': 0.35, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 110.0, 'vc_min': 60.0, 'vc_max': 150.0, 'feed': 0.08, 'ap': 4.0, 'ae_ratio': 0.3, 'coolant': 'FLOOD'}}},
        {'id': 'ht-m19', 'iso_code': 'P3204-D16', 'brand': 'HARDTOOL', 'catalog_page': 'A-60', 'analog_note': 'Круглая профильная пластина Ø16 мм (замена Walter) · пресс-формы до HRC 62', 'operation_domain': 'MILLING', 'shape_code': 'R', 'clearance_angle_deg': 11.0, 'ic_mm': 16.0, 'thickness_mm': 4.76, 'corner_radius_mm': 8.0, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'R-P-1600-476-T', 'relative_cost_index': 1.45, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'H': 'PRIMARY'}, 'chipbreaker_code': 'HT-P3204', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.2, 'ap_max_mm': 4.0, 'fn_min_mm': 0.1, 'fn_max_mm': 0.45, 'operating_zone_polygon': [[0.1, 0.2], [0.45, 0.6], [0.38, 4.0], [0.1, 3.8]], 'holders': [{'code': 'T2139-R8-C16-130L', 'category': 'COPY_MILL', 'lead_angle_deg': 45.0, 'dc_mm': 16.0, 'z': 2, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 100.0, 'vc_max': 240.0, 'feed': 0.25, 'ap': 1.5, 'ae_ratio': 0.35, 'coolant': 'AIR_BLAST'}, 'H1': {'vc': 85.0, 'vc_min': 50.0, 'vc_max': 120.0, 'feed': 0.15, 'ap': 0.5, 'ae_ratio': 0.25, 'coolant': 'AIR_BLAST'}, 'S2': {'vc': 60.0, 'vc_min': 40.0, 'vc_max': 85.0, 'feed': 0.2, 'ap': 1.2, 'ae_ratio': 0.3, 'coolant': 'FLOOD'}}},
        {'id': 'ht-m20', 'iso_code': 'SEKT 1204AFEN-11', 'brand': 'HARDTOOL', 'catalog_page': 'A-62', 'analog_note': 'Торцовая 45° (4 кр., H9760PMS) · чистовая/получистовая плоскостей P/M/S', 'operation_domain': 'MILLING', 'shape_code': 'S', 'clearance_angle_deg': 20.0, 'ic_mm': 12.7, 'thickness_mm': 4.76, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': True, 'seat_pocket_signature': 'S-E-1270-476-T', 'relative_cost_index': 1.22, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-AFEN', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.1, 'ap_max_mm': 4.0, 'fn_min_mm': 0.05, 'fn_max_mm': 0.25, 'operating_zone_polygon': [[0.1, 0.2], [0.5, 0.5], [0.45, 4.5], [0.1, 4.2]], 'holders': [{'code': 'KM12-80-27-6T', 'category': 'FACE_MILL', 'lead_angle_deg': 45.0, 'dc_mm': 80.0, 'z': 6, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 250.0, 'feed': 0.18, 'ap': 2.5, 'ae_ratio': 0.65, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 120.0, 'vc_min': 60.0, 'vc_max': 150.0, 'feed': 0.14, 'ap': 2.0, 'ae_ratio': 0.55, 'coolant': 'FLOOD'}, 'S2': {'vc': 60.0, 'vc_min': 40.0, 'vc_max': 80.0, 'feed': 0.12, 'ap': 1.5, 'ae_ratio': 0.45, 'coolant': 'FLOOD'}}},
        {'id': 'ht-m21', 'iso_code': 'SEHT 1204AFFN', 'brand': 'HARDTOOL', 'catalog_page': 'A-62', 'analog_note': 'Полированная 45° (H040N без покрытия) · алюминий, медь, латунь и пластики', 'operation_domain': 'MILLING', 'shape_code': 'S', 'clearance_angle_deg': 20.0, 'ic_mm': 12.7, 'thickness_mm': 4.76, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': True, 'seat_pocket_signature': 'S-E-1270-476-T', 'relative_cost_index': 1.25, 'grade_code': 'H040N', 'coating_method': 'UNCOATED', 'coating_composition': 'Polished-Submicron-HARDTOOL', 'toughness_index': 7, 'wear_resistance_index': 7, 'suitability': {'N': 'PRIMARY'}, 'chipbreaker_code': 'HT-AFFN', 'application_class': 'ALUMINUM_SHARP', 'edge_prep': 'SHARP', 'ap_min_mm': 0.1, 'ap_max_mm': 4.0, 'fn_min_mm': 0.05, 'fn_max_mm': 0.25, 'operating_zone_polygon': [[0.1, 0.2], [0.5, 0.5], [0.45, 4.5], [0.1, 4.2]], 'holders': [{'code': 'KM12-80-27-6T', 'category': 'FACE_MILL', 'lead_angle_deg': 45.0, 'dc_mm': 80.0, 'z': 6, 'clamping': 'SCREW'}], 'recommendations': {'N1': {'vc': 550.0, 'vc_min': 300.0, 'vc_max': 800.0, 'feed': 0.18, 'ap': 3.0, 'ae_ratio': 0.65, 'coolant': 'FLOOD'}, 'N2': {'vc': 280.0, 'vc_min': 200.0, 'vc_max': 380.0, 'feed': 0.15, 'ap': 2.5, 'ae_ratio': 0.6, 'coolant': 'FLOOD'}}},
        {'id': 'ht-m22', 'iso_code': 'RDMT 1204MO-ST14', 'brand': 'HARDTOOL', 'catalog_page': 'A-64', 'analog_note': 'Круглая профильная 6 кр. (H9760PMS) · карманы, уступы и 3D-фрезерование', 'operation_domain': 'MILLING', 'shape_code': 'R', 'clearance_angle_deg': 15.0, 'ic_mm': 12.0, 'thickness_mm': 4.76, 'corner_radius_mm': 6.0, 'cutting_edges_count': 6, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'R-D-1200-476-T', 'relative_cost_index': 1.35, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-ST14', 'application_class': 'ROUGHING', 'edge_prep': 'HONED', 'ap_min_mm': 0.4, 'ap_max_mm': 4.5, 'fn_min_mm': 0.15, 'fn_max_mm': 0.8, 'operating_zone_polygon': [[0.15, 0.4], [0.8, 0.8], [0.65, 4.5], [0.15, 4.2]], 'holders': [{'code': 'EMRW-6R-50-22', 'category': 'COPY_MILL', 'lead_angle_deg': 45.0, 'dc_mm': 50.0, 'z': 4, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 250.0, 'feed': 0.35, 'ap': 2.0, 'ae_ratio': 0.45, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 120.0, 'vc_min': 60.0, 'vc_max': 150.0, 'feed': 0.28, 'ap': 1.8, 'ae_ratio': 0.4, 'coolant': 'FLOOD'}, 'S2': {'vc': 60.0, 'vc_min': 40.0, 'vc_max': 80.0, 'feed': 0.25, 'ap': 1.5, 'ae_ratio': 0.35, 'coolant': 'FLOOD'}}},
        {'id': 'ht-m23', 'iso_code': 'APMT 1604PDER-M2', 'brand': 'HARDTOOL', 'catalog_page': 'A-70', 'analog_note': 'Уступная 90° HARDTOOL (H9760PMS) · пазы, карманы, стенки P/M/S/H', 'operation_domain': 'MILLING', 'shape_code': 'A', 'clearance_angle_deg': 11.0, 'ic_mm': 9.525, 'thickness_mm': 4.76, 'corner_radius_mm': 0.8, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': True, 'seat_pocket_signature': 'A-P-953-476-T', 'relative_cost_index': 1.12, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-M2', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.3, 'ap_max_mm': 12.0, 'fn_min_mm': 0.08, 'fn_max_mm': 0.35, 'operating_zone_polygon': [[0.08, 0.3], [0.35, 0.6], [0.26, 12.0], [0.08, 10.0]], 'holders': [{'code': 'BAP400R-50-22', 'category': 'SHOULDER_MILL', 'lead_angle_deg': 90.0, 'dc_mm': 50.0, 'z': 4, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 250.0, 'feed': 0.16, 'ap': 3.5, 'ae_ratio': 0.5, 'coolant': 'AIR_BLAST'}, 'P2': {'vc': 150.0, 'vc_min': 100.0, 'vc_max': 200.0, 'feed': 0.14, 'ap': 3.0, 'ae_ratio': 0.5, 'coolant': 'AIR_BLAST'}, 'M1': {'vc': 115.0, 'vc_min': 60.0, 'vc_max': 150.0, 'feed': 0.12, 'ap': 2.5, 'ae_ratio': 0.4, 'coolant': 'FLOOD'}, 'S2': {'vc': 60.0, 'vc_min': 40.0, 'vc_max': 80.0, 'feed': 0.1, 'ap': 2.0, 'ae_ratio': 0.35, 'coolant': 'FLOOD'}}},
        {'id': 'ht-m24', 'iso_code': 'APMT 1604PDER-AL', 'brand': 'HARDTOOL', 'catalog_page': 'A-70', 'analog_note': 'Полированная 90° (H040N) · уступное и контурное фрезерование алюминия и меди', 'operation_domain': 'MILLING', 'shape_code': 'A', 'clearance_angle_deg': 11.0, 'ic_mm': 9.525, 'thickness_mm': 4.76, 'corner_radius_mm': 0.8, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': True, 'seat_pocket_signature': 'A-P-953-476-T', 'relative_cost_index': 1.18, 'grade_code': 'H040N', 'coating_method': 'UNCOATED', 'coating_composition': 'Polished-Submicron-HARDTOOL', 'toughness_index': 7, 'wear_resistance_index': 7, 'suitability': {'N': 'PRIMARY'}, 'chipbreaker_code': 'HT-AL-90', 'application_class': 'ALUMINUM_SHARP', 'edge_prep': 'SHARP', 'ap_min_mm': 0.3, 'ap_max_mm': 12.0, 'fn_min_mm': 0.05, 'fn_max_mm': 0.3, 'operating_zone_polygon': [[0.05, 0.3], [0.3, 0.8], [0.24, 12.0], [0.05, 10.0]], 'holders': [{'code': 'BAP400R-50-22', 'category': 'SHOULDER_MILL', 'lead_angle_deg': 90.0, 'dc_mm': 50.0, 'z': 4, 'clamping': 'SCREW'}], 'recommendations': {'N1': {'vc': 520.0, 'vc_min': 300.0, 'vc_max': 800.0, 'feed': 0.16, 'ap': 4.0, 'ae_ratio': 0.6, 'coolant': 'FLOOD'}, 'N2': {'vc': 280.0, 'vc_min': 200.0, 'vc_max': 380.0, 'feed': 0.14, 'ap': 3.0, 'ae_ratio': 0.55, 'coolant': 'FLOOD'}}},
        {'id': 'ht-m25', 'iso_code': 'HAA-100X3X22-Z24', 'brand': 'HARDTOOL', 'catalog_page': 'C-06', 'analog_note': 'Монолитная ЦТ дисковая фреза HARDTOOL Ø100×3×22 (DIN 1837/1838, Z=24)', 'operation_domain': 'MILLING', 'shape_code': 'R', 'clearance_angle_deg': 0.0, 'ic_mm': 100.0, 'thickness_mm': 3.0, 'corner_radius_mm': 0.2, 'cutting_edges_count': 24, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'R-N-10000-300-I', 'relative_cost_index': 6.8, 'grade_code': 'KM10T', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 9, 'suitability': {'P': 'PRIMARY', 'N': 'PRIMARY', 'M': 'SECONDARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-DISC-A', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.5, 'ap_max_mm': 3.0, 'fn_min_mm': 0.03, 'fn_max_mm': 0.12, 'operating_zone_polygon': [[0.03, 0.5], [0.12, 1.0], [0.1, 3.0], [0.03, 3.0]], 'holders': [{'code': 'ARB-ISO40-D22', 'category': 'FACE_MILL', 'lead_angle_deg': 90.0, 'dc_mm': 100.0, 'z': 24, 'clamping': 'INTEGRAL'}], 'recommendations': {'P1': {'vc': 110.0, 'vc_min': 70.0, 'vc_max': 150.0, 'feed': 0.06, 'ap': 3.0, 'ae_ratio': 0.3, 'coolant': 'FLOOD'}, 'N1': {'vc': 260.0, 'vc_min': 180.0, 'vc_max': 360.0, 'feed': 0.08, 'ap': 3.0, 'ae_ratio': 0.35, 'coolant': 'FLOOD'}}},
        {'id': 'ht-g01', 'iso_code': 'MGMN 300-M', 'brand': 'HARDTOOL', 'catalog_page': 'B-47', 'analog_note': 'Универсальная отрезка и канавки 3.0 мм HARDTOOL (PVD H9760PMS)', 'operation_domain': 'GROOVING_THREADING', 'shape_code': 'L', 'clearance_angle_deg': 0.0, 'ic_mm': 3.0, 'thickness_mm': 4.76, 'corner_radius_mm': 0.2, 'cutting_edges_count': 2, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'L-N-300-476-N', 'relative_cost_index': 0.96, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-MG-M', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 1.5, 'ap_max_mm': 4.0, 'fn_min_mm': 0.05, 'fn_max_mm': 0.22, 'operating_zone_polygon': [[0.04, 1.0], [0.22, 1.8], [0.2, 4.0], [0.04, 3.8]], 'holders': [{'code': 'MGEHR 2525-3', 'category': 'GROOVING_HOLDER', 'lead_angle_deg': 90.0, 'clamping': 'TOP_CLAMP'}], 'recommendations': {'P1': {'vc': 155.0, 'vc_min': 110.0, 'vc_max': 200.0, 'feed': 0.1, 'ap': 3.0, 'coolant': 'FLOOD'}, 'P2': {'vc': 130.0, 'vc_min': 95.0, 'vc_max': 165.0, 'feed': 0.09, 'ap': 3.0, 'coolant': 'FLOOD'}, 'M1': {'vc': 115.0, 'vc_min': 80.0, 'vc_max': 150.0, 'feed': 0.08, 'ap': 3.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'S2': {'vc': 48.0, 'vc_min': 32.0, 'vc_max': 65.0, 'feed': 0.07, 'ap': 3.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}},
        {'id': 'ht-g02', 'iso_code': 'CD200-300M', 'brand': 'HARDTOOL', 'catalog_page': 'B-39', 'analog_note': 'Канавки наружные, торцовые и расточные 3.0 мм (CVD H7170P · TER / TJFR)', 'operation_domain': 'GROOVING_THREADING', 'shape_code': 'L', 'clearance_angle_deg': 0.0, 'ic_mm': 3.0, 'thickness_mm': 4.76, 'corner_radius_mm': 0.2, 'cutting_edges_count': 2, 'is_double_sided': True, 'has_wiper_geometry': False, 'seat_pocket_signature': 'L-N-300-476-N', 'relative_cost_index': 1.05, 'grade_code': 'H7170P', 'coating_method': 'CVD', 'coating_composition': 'TiCN-Al2O3-HARDTOOL', 'toughness_index': 7, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'K': 'PRIMARY', 'M': 'SECONDARY'}, 'chipbreaker_code': 'HT-CD-M', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 1.5, 'ap_max_mm': 4.0, 'fn_min_mm': 0.05, 'fn_max_mm': 0.22, 'operating_zone_polygon': [[0.04, 1.0], [0.22, 1.8], [0.2, 4.0], [0.04, 3.8]], 'holders': [{'code': 'TER 2525-3', 'category': 'GROOVING_HOLDER', 'lead_angle_deg': 90.0, 'clamping': 'TOP_CLAMP'}], 'recommendations': {'P1': {'vc': 170.0, 'vc_min': 120.0, 'vc_max': 220.0, 'feed': 0.12, 'ap': 3.0, 'coolant': 'FLOOD'}, 'P2': {'vc': 140.0, 'vc_min': 100.0, 'vc_max': 180.0, 'feed': 0.1, 'ap': 3.0, 'coolant': 'FLOOD'}, 'M1': {'vc': 110.0, 'vc_min': 75.0, 'vc_max': 145.0, 'feed': 0.09, 'ap': 3.0, 'coolant': 'FLOOD'}, 'K1': {'vc': 185.0, 'vc_min': 130.0, 'vc_max': 230.0, 'feed': 0.14, 'ap': 3.0, 'coolant': 'DRY'}}},
        {'id': 'ht-g03', 'iso_code': 'CMTPR 100FN', 'brand': 'HARDTOOL', 'catalog_page': 'B-37', 'analog_note': 'Шлифованная пластина HARDTOOL для узких канавок 1.0 мм и отрезки мелкоразмерных деталей', 'operation_domain': 'GROOVING_THREADING', 'shape_code': 'L', 'clearance_angle_deg': 0.0, 'ic_mm': 1.0, 'thickness_mm': 3.18, 'corner_radius_mm': 0.1, 'cutting_edges_count': 1, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'L-N-100-318-N', 'relative_cost_index': 1.15, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'N': 'SECONDARY'}, 'chipbreaker_code': 'HT-CMTP', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.5, 'ap_max_mm': 2.5, 'fn_min_mm': 0.02, 'fn_max_mm': 0.1, 'operating_zone_polygon': [[0.02, 0.5], [0.1, 0.8], [0.09, 2.5], [0.02, 2.2]], 'holders': [{'code': 'CTPR 2020K-10', 'category': 'GROOVING_HOLDER', 'lead_angle_deg': 90.0, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 135.0, 'vc_min': 90.0, 'vc_max': 180.0, 'feed': 0.05, 'ap': 1.0, 'coolant': 'FLOOD'}, 'M1': {'vc': 95.0, 'vc_min': 65.0, 'vc_max': 130.0, 'feed': 0.04, 'ap': 1.0, 'coolant': 'FLOOD'}, 'N1': {'vc': 240.0, 'vc_min': 180.0, 'vc_max': 320.0, 'feed': 0.06, 'ap': 1.0, 'coolant': 'FLOOD'}}},
        {'id': 'ht-g04', 'iso_code': '16ER AG60-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-36', 'analog_note': 'Резьбовая пластина HARDTOOL 60° со стружколомом (шаг 0.5–3.0 мм, 3 вершины)', 'operation_domain': 'GROOVING_THREADING', 'shape_code': 'T', 'clearance_angle_deg': 0.0, 'ic_mm': 9.525, 'thickness_mm': 3.97, 'corner_radius_mm': 0.1, 'cutting_edges_count': 3, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'T-N-953-397-T', 'relative_cost_index': 1.18, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-THR60', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.5, 'ap_max_mm': 3.0, 'fn_min_mm': 0.05, 'fn_max_mm': 0.25, 'operating_zone_polygon': [[0.05, 0.5], [0.25, 0.8], [0.22, 3.0], [0.05, 2.8]], 'holders': [{'code': 'SER 2525M 16', 'category': 'GROOVING_HOLDER', 'lead_angle_deg': 90.0, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 150.0, 'vc_min': 100.0, 'vc_max': 190.0, 'feed': 0.12, 'ap': 1.5, 'coolant': 'FLOOD'}, 'P2': {'vc': 125.0, 'vc_min': 85.0, 'vc_max': 160.0, 'feed': 0.1, 'ap': 1.5, 'coolant': 'FLOOD'}, 'M1': {'vc': 110.0, 'vc_min': 75.0, 'vc_max': 140.0, 'feed': 0.1, 'ap': 1.5, 'coolant': 'FLOOD'}, 'S2': {'vc': 45.0, 'vc_min': 28.0, 'vc_max': 60.0, 'feed': 0.08, 'ap': 1.2, 'coolant': 'HIGH_PRESSURE_THROUGH'}}},
        {'id': 'ht-g05', 'iso_code': 'CBGR-060', 'brand': 'HARDTOOL', 'catalog_page': 'B-33', 'analog_note': 'Монолитный ЦТ внутренний канавочный резец HARDTOOL (вылет 7xD, внутр. СОЖ)', 'operation_domain': 'GROOVING_THREADING', 'shape_code': 'RM', 'clearance_angle_deg': 11.0, 'ic_mm': 6.0, 'thickness_mm': 7.2, 'corner_radius_mm': 0.2, 'cutting_edges_count': 1, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'RM-B-600-700-I', 'relative_cost_index': 3.6, 'grade_code': 'H9760PM', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 9, 'wear_resistance_index': 7, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'SECONDARY', 'S': 'SECONDARY', 'N': 'SECONDARY'}, 'chipbreaker_code': 'HT-CBGR', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.5, 'ap_max_mm': 2.5, 'fn_min_mm': 0.02, 'fn_max_mm': 0.08, 'operating_zone_polygon': [[0.02, 0.5], [0.08, 0.8], [0.07, 2.5], [0.02, 2.2]], 'holders': [{'code': 'CBR-20', 'category': 'BORING_BAR', 'lead_angle_deg': 90.0, 'clamping': 'INTEGRAL'}], 'recommendations': {'P1': {'vc': 110.0, 'vc_min': 80.0, 'vc_max': 150.0, 'feed': 0.04, 'ap': 1.5, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 85.0, 'vc_min': 60.0, 'vc_max': 120.0, 'feed': 0.03, 'ap': 1.5, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'N1': {'vc': 220.0, 'vc_min': 160.0, 'vc_max': 300.0, 'feed': 0.05, 'ap': 1.5, 'coolant': 'FLOOD'}}},
        {'id': 'ht-g06', 'iso_code': 'CBFR-080', 'brand': 'HARDTOOL', 'catalog_page': 'B-28', 'analog_note': 'Монолитный ЦТ универсальный расточной резец HARDTOOL от Ø8 мм (вылет 7xD, внутр. СОЖ)', 'operation_domain': 'GROOVING_THREADING', 'shape_code': 'RM', 'clearance_angle_deg': 11.0, 'ic_mm': 8.0, 'thickness_mm': 9.6, 'corner_radius_mm': 0.2, 'cutting_edges_count': 1, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'RM-B-800-700-I', 'relative_cost_index': 3.45, 'grade_code': 'H9760PM', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 9, 'wear_resistance_index': 7, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'SECONDARY', 'S': 'SECONDARY', 'N': 'SECONDARY'}, 'chipbreaker_code': 'HT-CBFR', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.2, 'ap_max_mm': 2.0, 'fn_min_mm': 0.02, 'fn_max_mm': 0.1, 'operating_zone_polygon': [[0.02, 0.2], [0.1, 0.5], [0.09, 2.0], [0.02, 1.8]], 'holders': [{'code': 'CBR-20', 'category': 'BORING_BAR', 'lead_angle_deg': 90.0, 'clamping': 'INTEGRAL'}], 'recommendations': {'P1': {'vc': 120.0, 'vc_min': 80.0, 'vc_max': 160.0, 'feed': 0.05, 'ap': 1.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 90.0, 'vc_min': 60.0, 'vc_max': 130.0, 'feed': 0.04, 'ap': 1.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'N1': {'vc': 240.0, 'vc_min': 160.0, 'vc_max': 320.0, 'feed': 0.06, 'ap': 1.2, 'coolant': 'FLOOD'}}},
        {'id': 'ht-d01', 'iso_code': 'WCMX 050308-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-52', 'analog_note': 'Сверлильная 3-кр. HARDTOOL (H9960MSH бронзовый) · U-сверло Ø26 мм', 'operation_domain': 'DRILLING', 'shape_code': 'W', 'clearance_angle_deg': 7.0, 'ic_mm': 7.938, 'thickness_mm': 3.18, 'corner_radius_mm': 0.8, 'cutting_edges_count': 3, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'W-C-794-318-X', 'relative_cost_index': 1.12, 'grade_code': 'H9960MSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-WCMX', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.06, 'fn_max_mm': 0.15, 'operating_zone_polygon': [], 'holders': [{'code': 'UDRL-WCMX05-D26-3D', 'category': 'INDEXABLE_DRILL', 'lead_angle_deg': 90.0, 'dc_mm': 26.0, 'z': 1, 'ld_ratio_max': 3.0, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 165.0, 'vc_min': 120.0, 'vc_max': 205.0, 'feed': 0.11, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'P2': {'vc': 140.0, 'vc_min': 100.0, 'vc_max': 175.0, 'feed': 0.09, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 115.0, 'vc_min': 80.0, 'vc_max': 145.0, 'feed': 0.08, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'S2': {'vc': 48.0, 'vc_min': 35.0, 'vc_max': 65.0, 'feed': 0.08, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'INDEXABLE_U_DRILL', 'point_angle_deg': 180.0, 'ld_ratio_max': 3.0, 'tolerance_hole': 'IT11'},
        {'id': 'ht-d02', 'iso_code': 'SPMT 07T308-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-53', 'analog_note': 'Сверлильная 4-кр. HARDTOOL (H9760PMS) · U-сверло Ø22 мм до 4xD', 'operation_domain': 'DRILLING', 'shape_code': 'S', 'clearance_angle_deg': 11.0, 'ic_mm': 7.938, 'thickness_mm': 3.97, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'S-P-794-397-G', 'relative_cost_index': 1.15, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'SECONDARY'}, 'chipbreaker_code': 'HT-SPMT07', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.06, 'fn_max_mm': 0.16, 'operating_zone_polygon': [], 'holders': [{'code': 'UDRL-SPMG07-D22-4D', 'category': 'INDEXABLE_DRILL', 'lead_angle_deg': 90.0, 'dc_mm': 22.0, 'z': 1, 'ld_ratio_max': 4.0, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 185.0, 'vc_min': 140.0, 'vc_max': 230.0, 'feed': 0.12, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'P2': {'vc': 155.0, 'vc_min': 115.0, 'vc_max': 195.0, 'feed': 0.1, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 120.0, 'vc_min': 90.0, 'vc_max': 150.0, 'feed': 0.09, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'K1': {'vc': 200.0, 'vc_min': 150.0, 'vc_max': 250.0, 'feed': 0.14, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'INDEXABLE_U_DRILL', 'point_angle_deg': 180.0, 'ld_ratio_max': 4.0, 'tolerance_hole': 'IT11'},
        {'id': 'ht-d03', 'iso_code': 'SPMT 090408-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-53', 'analog_note': 'Сверлильная 4-кр. HARDTOOL (H9760PMS) · U-сверло Ø32 мм', 'operation_domain': 'DRILLING', 'shape_code': 'S', 'clearance_angle_deg': 11.0, 'ic_mm': 9.525, 'thickness_mm': 4.76, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'S-P-953-476-G', 'relative_cost_index': 1.24, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'PRIMARY'}, 'chipbreaker_code': 'HT-SPMT09', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.06, 'fn_max_mm': 0.16, 'operating_zone_polygon': [], 'holders': [{'code': 'UDRL-SPMG09-D32-3D', 'category': 'INDEXABLE_DRILL', 'lead_angle_deg': 90.0, 'dc_mm': 32.0, 'z': 1, 'ld_ratio_max': 3.0, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 180.0, 'vc_min': 135.0, 'vc_max': 225.0, 'feed': 0.12, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'P2': {'vc': 150.0, 'vc_min': 110.0, 'vc_max': 190.0, 'feed': 0.1, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 120.0, 'vc_min': 85.0, 'vc_max': 150.0, 'feed': 0.09, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'K1': {'vc': 195.0, 'vc_min': 145.0, 'vc_max': 240.0, 'feed': 0.14, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'S2': {'vc': 50.0, 'vc_min': 35.0, 'vc_max': 65.0, 'feed': 0.08, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'INDEXABLE_U_DRILL', 'point_angle_deg': 180.0, 'ld_ratio_max': 3.0, 'tolerance_hole': 'IT11'},
        {'id': 'ht-d04', 'iso_code': 'SPGT 11T308-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-53', 'analog_note': 'Шлифованная сверлильная 4-кр. HARDTOOL (H9660PMSH) · U-сверло Ø40 мм', 'operation_domain': 'DRILLING', 'shape_code': 'S', 'clearance_angle_deg': 11.0, 'ic_mm': 11.0, 'thickness_mm': 3.97, 'corner_radius_mm': 0.8, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'S-G-1100-397-T', 'relative_cost_index': 1.4, 'grade_code': 'H9660PMSH', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'SECONDARY'}, 'chipbreaker_code': 'HT-SPGT11', 'application_class': 'MEDIUM', 'edge_prep': 'SHARP', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.08, 'fn_max_mm': 0.18, 'operating_zone_polygon': [], 'holders': [{'code': 'UDRL-SOMT11-D40-3D', 'category': 'INDEXABLE_DRILL', 'lead_angle_deg': 90.0, 'dc_mm': 40.0, 'z': 1, 'ld_ratio_max': 3.0, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 185.0, 'vc_min': 140.0, 'vc_max': 230.0, 'feed': 0.14, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 120.0, 'vc_min': 90.0, 'vc_max': 150.0, 'feed': 0.1, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'K1': {'vc': 200.0, 'vc_min': 150.0, 'vc_max': 250.0, 'feed': 0.16, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'INDEXABLE_U_DRILL', 'point_angle_deg': 180.0, 'ld_ratio_max': 3.0, 'tolerance_hole': 'IT11'},
        {'id': 'ht-d05', 'iso_code': 'TOHT 090305-GP', 'brand': 'HARDTOOL', 'catalog_page': 'B-54', 'analog_note': 'Сверлильная пластина TOHT + направляющая GP для пушечных свёрл HARDTOOL (до 12xD)', 'operation_domain': 'DRILLING', 'shape_code': 'L', 'clearance_angle_deg': 11.0, 'ic_mm': 9.0, 'thickness_mm': 3.18, 'corner_radius_mm': 0.5, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'L-P-900-318-T', 'relative_cost_index': 1.6, 'grade_code': 'H9660PMSH', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 9, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'K': 'PRIMARY'}, 'chipbreaker_code': 'HT-GUNDRL', 'application_class': 'FINISHING', 'edge_prep': 'HONED', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.04, 'fn_max_mm': 0.12, 'operating_zone_polygon': [], 'holders': [{'code': 'GDRL-TOHT09-D18-12D', 'category': 'INDEXABLE_DRILL', 'lead_angle_deg': 90.0, 'dc_mm': 18.0, 'z': 1, 'ld_ratio_max': 12.0, 'clamping': 'SCREW'}], 'recommendations': {'P1': {'vc': 110.0, 'vc_min': 75.0, 'vc_max': 145.0, 'feed': 0.08, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 75.0, 'vc_min': 50.0, 'vc_max': 100.0, 'feed': 0.06, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'S2': {'vc': 42.0, 'vc_min': 28.0, 'vc_max': 58.0, 'feed': 0.05, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'INDEXABLE_U_DRILL', 'point_angle_deg': 140.0, 'ld_ratio_max': 12.0, 'tolerance_hole': 'IT9'},
        {'id': 'ht-d06', 'iso_code': 'MOD-DRL-140-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-55', 'analog_note': 'Сменная твердосплавная коронка HARDTOOL Ø14 мм (140°, 5xD, H9760PMS)', 'operation_domain': 'DRILLING', 'shape_code': 'DRL', 'clearance_angle_deg': 11.0, 'ic_mm': 14.0, 'thickness_mm': 6.72, 'corner_radius_mm': 0.2, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'DRL-M-1400-672-B', 'relative_cost_index': 3.6, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'SECONDARY'}, 'chipbreaker_code': 'HT-MOD14', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.14, 'fn_max_mm': 0.34, 'operating_zone_polygon': [], 'holders': [{'code': 'MOD-BODY-D14-5D', 'category': 'MODULAR_DRILL', 'lead_angle_deg': 70.0, 'dc_mm': 14.0, 'z': 2, 'ld_ratio_max': 5.0, 'clamping': 'BAYONET'}], 'recommendations': {'P1': {'vc': 120.0, 'vc_min': 90.0, 'vc_max': 150.0, 'feed': 0.24, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 70.0, 'vc_min': 50.0, 'vc_max': 90.0, 'feed': 0.18, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'K1': {'vc': 135.0, 'vc_min': 100.0, 'vc_max': 170.0, 'feed': 0.3, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'MODULAR_TIP', 'point_angle_deg': 140.0, 'ld_ratio_max': 5.0, 'tolerance_hole': 'IT9'},
        {'id': 'ht-d07', 'iso_code': 'MOD-DRL-200-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-55', 'analog_note': 'Сменная твердосплавная коронка HARDTOOL Ø20 мм (140°, 8xD, H9760PMS)', 'operation_domain': 'DRILLING', 'shape_code': 'DRL', 'clearance_angle_deg': 11.0, 'ic_mm': 20.0, 'thickness_mm': 9.6, 'corner_radius_mm': 0.2, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'DRL-M-2000-960-B', 'relative_cost_index': 4.65, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'SECONDARY'}, 'chipbreaker_code': 'HT-MOD20', 'application_class': 'MEDIUM', 'edge_prep': 'HONED', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.16, 'fn_max_mm': 0.38, 'operating_zone_polygon': [], 'holders': [{'code': 'MOD-BODY-D20-8D', 'category': 'MODULAR_DRILL', 'lead_angle_deg': 70.0, 'dc_mm': 20.0, 'z': 2, 'ld_ratio_max': 8.0, 'clamping': 'BAYONET'}], 'recommendations': {'P1': {'vc': 115.0, 'vc_min': 85.0, 'vc_max': 145.0, 'feed': 0.26, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 65.0, 'vc_min': 45.0, 'vc_max': 85.0, 'feed': 0.19, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'K1': {'vc': 130.0, 'vc_min': 95.0, 'vc_max': 165.0, 'feed': 0.32, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'MODULAR_TIP', 'point_angle_deg': 140.0, 'ld_ratio_max': 8.0, 'tolerance_hole': 'IT9'},
        {'id': 'ht-d08', 'iso_code': 'SC-DRL-080-5D-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-56', 'analog_note': 'Монолитное ЦТ-сверло HARDTOOL Ø8 мм (5xD, внутр. СОЖ, H9760PMS)', 'operation_domain': 'DRILLING', 'shape_code': 'DRL', 'clearance_angle_deg': 11.0, 'ic_mm': 8.0, 'thickness_mm': 5.0, 'corner_radius_mm': 0.1, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'DRL-S-800-500-I', 'relative_cost_index': 4.0, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'SECONDARY'}, 'chipbreaker_code': 'HT-SC08', 'application_class': 'MEDIUM', 'edge_prep': 'CHAMFERED_HONED', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.1, 'fn_max_mm': 0.28, 'operating_zone_polygon': [], 'holders': [{'code': 'HYD-CHUCK-D08-5D', 'category': 'SOLID_CARBIDE_DRILL', 'lead_angle_deg': 70.0, 'dc_mm': 8.0, 'z': 2, 'ld_ratio_max': 5.0, 'clamping': 'INTEGRAL'}], 'recommendations': {'P1': {'vc': 115.0, 'vc_min': 85.0, 'vc_max': 145.0, 'feed': 0.2, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 65.0, 'vc_min': 45.0, 'vc_max': 85.0, 'feed': 0.15, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'K1': {'vc': 130.0, 'vc_min': 95.0, 'vc_max': 165.0, 'feed': 0.24, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'SOLID_CARBIDE', 'point_angle_deg': 140.0, 'ld_ratio_max': 5.0, 'tolerance_hole': 'IT8'},
        {'id': 'ht-d09', 'iso_code': 'SC-DRL-120-8D-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-56', 'analog_note': 'Монолитное ЦТ-сверло HARDTOOL Ø12 мм (8xD, внутр. СОЖ, H9960MSH)', 'operation_domain': 'DRILLING', 'shape_code': 'DRL', 'clearance_angle_deg': 11.0, 'ic_mm': 12.0, 'thickness_mm': 8.0, 'corner_radius_mm': 0.1, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'DRL-S-1200-800-I', 'relative_cost_index': 6.1, 'grade_code': 'H9960MSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'S': 'PRIMARY', 'H': 'SECONDARY'}, 'chipbreaker_code': 'HT-SC12', 'application_class': 'MEDIUM', 'edge_prep': 'CHAMFERED_HONED', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.12, 'fn_max_mm': 0.28, 'operating_zone_polygon': [], 'holders': [{'code': 'HYD-CHUCK-D12-8D', 'category': 'SOLID_CARBIDE_DRILL', 'lead_angle_deg': 70.0, 'dc_mm': 12.0, 'z': 2, 'ld_ratio_max': 8.0, 'clamping': 'INTEGRAL'}], 'recommendations': {'P1': {'vc': 105.0, 'vc_min': 80.0, 'vc_max': 130.0, 'feed': 0.22, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 60.0, 'vc_min': 45.0, 'vc_max': 80.0, 'feed': 0.16, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'S2': {'vc': 38.0, 'vc_min': 25.0, 'vc_max': 50.0, 'feed': 0.12, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'H1': {'vc': 32.0, 'vc_min': 20.0, 'vc_max': 45.0, 'feed': 0.09, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'SOLID_CARBIDE', 'point_angle_deg': 140.0, 'ld_ratio_max': 8.0, 'tolerance_hole': 'IT8'},
        {'id': 'ht-d10', 'iso_code': 'SC-DRL-100-AL-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-56', 'analog_note': 'Полированное ЦТ-сверло HARDTOOL Ø10 мм (5xD, H040N для алюминия)', 'operation_domain': 'DRILLING', 'shape_code': 'DRL', 'clearance_angle_deg': 11.0, 'ic_mm': 10.0, 'thickness_mm': 5.0, 'corner_radius_mm': 0.1, 'cutting_edges_count': 2, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'DRL-S-1000-500-I', 'relative_cost_index': 4.4, 'grade_code': 'H040N', 'coating_method': 'UNCOATED', 'coating_composition': 'Polished-Submicron-HARDTOOL', 'toughness_index': 7, 'wear_resistance_index': 7, 'suitability': {'N': 'PRIMARY'}, 'chipbreaker_code': 'HT-SC10-AL', 'application_class': 'ALUMINUM_SHARP', 'edge_prep': 'SHARP', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.12, 'fn_max_mm': 0.38, 'operating_zone_polygon': [], 'holders': [{'code': 'HYD-CHUCK-D10-5D', 'category': 'SOLID_CARBIDE_DRILL', 'lead_angle_deg': 65.0, 'dc_mm': 10.0, 'z': 2, 'ld_ratio_max': 5.0, 'clamping': 'INTEGRAL'}], 'recommendations': {'N1': {'vc': 260.0, 'vc_min': 180.0, 'vc_max': 360.0, 'feed': 0.26, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'N2': {'vc': 160.0, 'vc_min': 110.0, 'vc_max': 220.0, 'feed': 0.2, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'SOLID_CARBIDE', 'point_angle_deg': 130.0, 'ld_ratio_max': 5.0, 'tolerance_hole': 'IT8'},
        {'id': 'ht-d11', 'iso_code': 'TAP-M12-BL-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-57', 'analog_note': 'Спиральный машинный метчик HARDTOOL M12 (глухие отв., PVD H9760PMS)', 'operation_domain': 'DRILLING', 'shape_code': 'TAP', 'clearance_angle_deg': 11.0, 'ic_mm': 12.0, 'thickness_mm': 1.0, 'corner_radius_mm': 0.1, 'cutting_edges_count': 3, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'TAP-T-1200-100-I', 'relative_cost_index': 2.8, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 9, 'wear_resistance_index': 7, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-TAP-BL', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 1.75, 'fn_max_mm': 1.75, 'operating_zone_polygon': [], 'holders': [{'code': 'SYNCHRO-TAP-M12', 'category': 'TAP_HOLDER', 'lead_angle_deg': 90.0, 'dc_mm': 12.0, 'z': 3, 'ld_ratio_max': 2.5, 'clamping': 'INTEGRAL'}], 'recommendations': {'P1': {'vc': 16.0, 'vc_min': 10.0, 'vc_max': 22.0, 'feed': 1.75, 'ap': 0.0, 'coolant': 'FLOOD'}, 'M1': {'vc': 9.0, 'vc_min': 6.0, 'vc_max': 13.0, 'feed': 1.75, 'ap': 0.0, 'coolant': 'FLOOD'}, 'K1': {'vc': 18.0, 'vc_min': 12.0, 'vc_max': 25.0, 'feed': 1.75, 'ap': 0.0, 'coolant': 'FLOOD'}}, 'axial_subtype': 'TAP_THREAD_MILL', 'point_angle_deg': 140.0, 'ld_ratio_max': 2.5, 'tolerance_hole': '6H'},
        {'id': 'ht-d12', 'iso_code': 'FORM-M8-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-57', 'analog_note': 'Бесстружечный раскатник HARDTOOL M8 (полированный H040N)', 'operation_domain': 'DRILLING', 'shape_code': 'TAP', 'clearance_angle_deg': 11.0, 'ic_mm': 8.0, 'thickness_mm': 1.0, 'corner_radius_mm': 0.1, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'TAP-F-800-100-I', 'relative_cost_index': 2.65, 'grade_code': 'H040N', 'coating_method': 'UNCOATED', 'coating_composition': 'Polished-Submicron-HARDTOOL', 'toughness_index': 9, 'wear_resistance_index': 8, 'suitability': {'N': 'PRIMARY', 'P': 'SECONDARY', 'M': 'SECONDARY'}, 'chipbreaker_code': 'HT-FORM', 'application_class': 'FINISHING', 'edge_prep': 'HONED', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 1.25, 'fn_max_mm': 1.25, 'operating_zone_polygon': [], 'holders': [{'code': 'SYNCHRO-FORM-M8', 'category': 'TAP_HOLDER', 'lead_angle_deg': 90.0, 'dc_mm': 8.0, 'z': 4, 'ld_ratio_max': 3.0, 'clamping': 'INTEGRAL'}], 'recommendations': {'N1': {'vc': 42.0, 'vc_min': 25.0, 'vc_max': 60.0, 'feed': 1.25, 'ap': 0.0, 'coolant': 'FLOOD'}, 'P1': {'vc': 24.0, 'vc_min': 16.0, 'vc_max': 32.0, 'feed': 1.25, 'ap': 0.0, 'coolant': 'FLOOD'}}, 'axial_subtype': 'TAP_THREAD_MILL', 'point_angle_deg': 140.0, 'ld_ratio_max': 3.0, 'tolerance_hole': '6H'},
        {'id': 'ht-d13', 'iso_code': 'TM-M16-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-57', 'analog_note': 'ЦТ резьбофреза HARDTOOL M16 (PVD H9960MSH · для нержавейки, титана и HRC 55)', 'operation_domain': 'DRILLING', 'shape_code': 'TAP', 'clearance_angle_deg': 11.0, 'ic_mm': 16.0, 'thickness_mm': 1.0, 'corner_radius_mm': 0.1, 'cutting_edges_count': 4, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'TAP-T-1600-100-I', 'relative_cost_index': 5.5, 'grade_code': 'H9960MSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 9, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'S': 'PRIMARY', 'H': 'PRIMARY', 'K': 'SECONDARY'}, 'chipbreaker_code': 'HT-TM16', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.12, 'fn_max_mm': 0.3, 'operating_zone_polygon': [], 'holders': [{'code': 'HYD-TM-D12-M16', 'category': 'TAP_HOLDER', 'lead_angle_deg': 90.0, 'dc_mm': 16.0, 'z': 4, 'ld_ratio_max': 2.5, 'clamping': 'INTEGRAL'}], 'recommendations': {'P1': {'vc': 110.0, 'vc_min': 80.0, 'vc_max': 145.0, 'feed': 0.2, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 65.0, 'vc_min': 45.0, 'vc_max': 85.0, 'feed': 0.16, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'S1': {'vc': 32.0, 'vc_min': 22.0, 'vc_max': 45.0, 'feed': 0.12, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'H1': {'vc': 45.0, 'vc_min': 30.0, 'vc_max': 60.0, 'feed': 0.12, 'ap': 0.0, 'coolant': 'AIR_BLAST'}}, 'axial_subtype': 'TAP_THREAD_MILL', 'point_angle_deg': 140.0, 'ld_ratio_max': 2.5, 'tolerance_hole': '6H'},
        {'id': 'ht-d14', 'iso_code': 'REAM-H7-100-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-58', 'analog_note': 'ЦТ развёртка HARDTOOL Ø10 H7 (6 зубьев, PVD H9760PMS)', 'operation_domain': 'DRILLING', 'shape_code': 'RM', 'clearance_angle_deg': 11.0, 'ic_mm': 10.0, 'thickness_mm': 7.0, 'corner_radius_mm': 0.2, 'cutting_edges_count': 6, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'RM-R-1000-700-I', 'relative_cost_index': 4.2, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 9, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'N': 'SECONDARY'}, 'chipbreaker_code': 'HT-REAM10', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.18, 'fn_max_mm': 0.45, 'operating_zone_polygon': [], 'holders': [{'code': 'HYD-REAM-D10-H7', 'category': 'REAMER_CHUCK', 'lead_angle_deg': 90.0, 'dc_mm': 10.0, 'z': 6, 'ld_ratio_max': 5.0, 'clamping': 'INTEGRAL'}], 'recommendations': {'P1': {'vc': 95.0, 'vc_min': 65.0, 'vc_max': 130.0, 'feed': 0.36, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 55.0, 'vc_min': 35.0, 'vc_max': 75.0, 'feed': 0.24, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'K1': {'vc': 110.0, 'vc_min': 75.0, 'vc_max': 145.0, 'feed': 0.4, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'N1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 240.0, 'feed': 0.42, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'REAMER_FINE_BORE', 'point_angle_deg': 140.0, 'ld_ratio_max': 5.0, 'tolerance_hole': 'H7'},
        {'id': 'ht-d15', 'iso_code': 'REAM-H7-200-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-58', 'analog_note': 'ЦТ развёртка HARDTOOL Ø20 H7 (6 зубьев, PVD H9760PMS)', 'operation_domain': 'DRILLING', 'shape_code': 'RM', 'clearance_angle_deg': 11.0, 'ic_mm': 20.0, 'thickness_mm': 7.0, 'corner_radius_mm': 0.2, 'cutting_edges_count': 6, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'RM-R-2000-700-I', 'relative_cost_index': 5.9, 'grade_code': 'H9760PMS', 'coating_method': 'PVD', 'coating_composition': 'AlTiN-Silver-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 9, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'N': 'SECONDARY'}, 'chipbreaker_code': 'HT-REAM20', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.2, 'fn_max_mm': 0.5, 'operating_zone_polygon': [], 'holders': [{'code': 'HYD-REAM-D20-H7', 'category': 'REAMER_CHUCK', 'lead_angle_deg': 90.0, 'dc_mm': 20.0, 'z': 6, 'ld_ratio_max': 5.0, 'clamping': 'INTEGRAL'}], 'recommendations': {'P1': {'vc': 95.0, 'vc_min': 65.0, 'vc_max': 130.0, 'feed': 0.42, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 55.0, 'vc_min': 35.0, 'vc_max': 75.0, 'feed': 0.28, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'K1': {'vc': 110.0, 'vc_min': 75.0, 'vc_max': 145.0, 'feed': 0.48, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'N1': {'vc': 180.0, 'vc_min': 120.0, 'vc_max': 240.0, 'feed': 0.5, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'REAMER_FINE_BORE', 'point_angle_deg': 140.0, 'ld_ratio_max': 5.0, 'tolerance_hole': 'H7'},
        {'id': 'ht-d16', 'iso_code': 'FBORE-MIC-25-HT', 'brand': 'HARDTOOL', 'catalog_page': 'B-58', 'analog_note': 'Микрометрическая расточная головка HARDTOOL Ø25..42 (IT6, 0.002 мм/дел, H9960MSH)', 'operation_domain': 'DRILLING', 'shape_code': 'RM', 'clearance_angle_deg': 11.0, 'ic_mm': 25.0, 'thickness_mm': 7.0, 'corner_radius_mm': 0.4, 'cutting_edges_count': 1, 'is_double_sided': False, 'has_wiper_geometry': False, 'seat_pocket_signature': 'RM-B-2500-700-I', 'relative_cost_index': 4.95, 'grade_code': 'H9960MSH', 'coating_method': 'PVD', 'coating_composition': 'TiSiN-Bronze-HARDTOOL', 'toughness_index': 8, 'wear_resistance_index': 8, 'suitability': {'P': 'PRIMARY', 'M': 'PRIMARY', 'K': 'PRIMARY', 'N': 'SECONDARY', 'S': 'PRIMARY', 'H': 'SECONDARY'}, 'chipbreaker_code': 'HT-FBORE', 'application_class': 'FINISHING', 'edge_prep': 'SHARP', 'ap_min_mm': 0.0, 'ap_max_mm': 0.0, 'fn_min_mm': 0.05, 'fn_max_mm': 0.14, 'operating_zone_polygon': [], 'holders': [{'code': 'MIC-BORE-D25-42', 'category': 'FINE_BORING_HEAD', 'lead_angle_deg': 90.0, 'dc_mm': 25.0, 'z': 1, 'ld_ratio_max': 6.0, 'clamping': 'CARTRIDGE'}], 'recommendations': {'P1': {'vc': 210.0, 'vc_min': 150.0, 'vc_max': 270.0, 'feed': 0.1, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'M1': {'vc': 135.0, 'vc_min': 95.0, 'vc_max': 175.0, 'feed': 0.08, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}, 'K1': {'vc': 240.0, 'vc_min': 170.0, 'vc_max': 310.0, 'feed': 0.12, 'ap': 0.0, 'coolant': 'DRY'}, 'N1': {'vc': 450.0, 'vc_min': 300.0, 'vc_max': 650.0, 'feed': 0.1, 'ap': 0.0, 'coolant': 'FLOOD'}, 'S2': {'vc': 48.0, 'vc_min': 32.0, 'vc_max': 65.0, 'feed': 0.07, 'ap': 0.0, 'coolant': 'HIGH_PRESSURE_THROUGH'}}, 'axial_subtype': 'REAMER_FINE_BORE', 'point_angle_deg': 140.0, 'ld_ratio_max': 6.0, 'tolerance_hole': 'IT6'},
    ],
    "cross_references": [
        {'source_insert_id': 'ht-t01', 'target_insert_id': 'ht-t06', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.94, 'notes': 'WNMG 080408-CM (H9760PMS, стр. B-01) даёт 6 кромок вместо 4 при том же угле 80° (державка PWLNR)'},
        {'source_insert_id': 'ht-t06', 'target_insert_id': 'ht-t01', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.94, 'notes': 'CNMG 120408-CM (H9760PMS, стр. B-01) держит большую глубину резания ap'},
        {'source_insert_id': 'ht-t01', 'target_insert_id': 'ht-t02', 'match_type': 'HIGHER_TOUGHNESS', 'confidence_score': 0.91, 'notes': 'Та же державка PCLNR 12; бронзовый сплав H9960MSH и RE 0.4 для чистовой нерж./титана'},
        {'source_insert_id': 'ht-t01', 'target_insert_id': 'ht-t15', 'match_type': 'HIGHER_WEAR_RESISTANCE', 'confidence_score': 0.89, 'notes': 'Та же державка PCLNR 12; переход на CNGA 120408-HT (H9280PMSH) для закалённых сталей HRC 48–63'},
        {'source_insert_id': 'ht-t04', 'target_insert_id': 'ht-t05', 'match_type': 'HIGHER_TOUGHNESS', 'confidence_score': 0.95, 'notes': 'То же гнездо PWLNR 08; усиленный черновой стружколом -MR и радиус R1.2 для ударов'},
        {'source_insert_id': 'ht-t07', 'target_insert_id': 'ht-t09', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.86, 'notes': 'Переход с 55° (DNMG-CF) на сверхострый 35° (VNMG 160404-AU, стр. B-06) для поднутрений'},
        {'source_insert_id': 'ht-t12', 'target_insert_id': 'ht-t14', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.96, 'notes': 'Та же расточная S20R-SCLCR 09; полированная CCGT 09T304-AL (H040N) для алюминия'},
        {'source_insert_id': 'ht-m23', 'target_insert_id': 'ht-m09', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.93, 'notes': 'HARDTOOL WNMU 060610-SN (стр. A-20): 6 кромок вместо 2 у APMT1604 (корпус MFWN06)'},
        {'source_insert_id': 'ht-m23', 'target_insert_id': 'ht-m04', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.91, 'notes': 'HARDTOOL LNHX 11T408AFN (стр. A-10): 4 кромки, ap до 9 мм (корпус LDR)'},
        {'source_insert_id': 'ht-m20', 'target_insert_id': 'ht-m16', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.94, 'notes': 'HARDTOOL ONMU 0605ANSN (стр. A-49): 16 кромок вместо 4 у SEKT, Ra до 0.6 мкм'},
        {'source_insert_id': 'ht-m16', 'target_insert_id': 'ht-m17', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.9, 'notes': 'HARDTOOL JXHT 1905ZZTN-RA (стр. A-56): 12-кромочная Wiper-пластина для глянцевых плоскостей'},
        {'source_insert_id': 'ht-m03', 'target_insert_id': 'ht-m07', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.92, 'notes': 'Переход на High-Feed «генератор стружки» SDKT 093508-CM (fz до 1.5 мм/зуб, стр. A-17)'},
        {'source_insert_id': 'ht-g01', 'target_insert_id': 'ht-g02', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.93, 'notes': 'HARDTOOL CD200-300M (H7170P, стр. B-39) — универсальные наружные, торцовые и расточные канавки'},
        {'source_insert_id': 'ht-d01', 'target_insert_id': 'ht-d02', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.9, 'notes': 'SPMT 07T308-HT (H9760PMS, стр. B-53) даёт 4 кромки и вылет до 4xD'},
        {'source_insert_id': 'ht-d06', 'target_insert_id': 'ht-d09', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.88, 'notes': 'Переход со сменной коронки Ø14 на монолит ЦТ Ø12 8xD (H9960MSH) для точности IT8'},
        {'source_insert_id': 'ht-d11', 'target_insert_id': 'ht-d13', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.92, 'notes': 'ЦТ резьбофреза HARDTOOL TM-M16-HT исключает риск поломки метчика и берёт титан/HRC 55'},
        {'source_insert_id': 'ht-d15', 'target_insert_id': 'ht-d16', 'match_type': 'FUNCTIONAL_EQUIVALENT', 'confidence_score': 0.9, 'notes': 'Микрометрическая расточная головка HARDTOOL FBORE-MIC-25-HT (0.002 мм/дел, IT6)'},
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
        self._saved_orders: List[Dict[str, Any]] = []

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
    def list_orders(self) -> List[Dict[str, Any]]:
        return list(self._saved_orders)

    def create_order(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        rec = {"id": f"ord-{uuid4().hex[:8]}", **payload}
        self._saved_orders.insert(0, rec)
        return rec

    def delete_order(self, order_id: str) -> bool:
        before = len(self._saved_orders)
        self._saved_orders = [o for o in self._saved_orders if o.get("id") != order_id]
        return len(self._saved_orders) < before
