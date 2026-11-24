/**
 * SKM — ISO Tooling Selector Frontend Controller (v0.5)
 * Works seamlessly on GitHub Pages (Web Demo), locally (file://), and with FastAPI + PostgreSQL.
 */

const FALLBACK_DB = {"subgroups": [{"code": "P1", "iso_group": "P", "name_ru": "Нелегированные стали (Ст20, Ст45, S355)", "kc1_1_mpa": 1500.0, "mc_exponent": 0.25, "hb": "125–190 HB"}, {"code": "P2", "iso_group": "P", "name_ru": "Низколегированные стали (40Х, 30ХГСА, 42CrMo4)", "kc1_1_mpa": 1700.0, "mc_exponent": 0.25, "hb": "180–275 HB"}, {"code": "P3", "iso_group": "P", "name_ru": "Высоколегированные и инструм. стали (Х12МФ, H13)", "kc1_1_mpa": 1950.0, "mc_exponent": 0.25, "hb": "250–330 HB"}, {"code": "M1", "iso_group": "M", "name_ru": "Аустенитные нерж. (12Х18Н10Т, AISI 304/316L)", "kc1_1_mpa": 1800.0, "mc_exponent": 0.21, "hb": "150–220 HB"}, {"code": "M2", "iso_group": "M", "name_ru": "Дуплексные нерж. (SAF 2205, 08Х22Н6Т)", "kc1_1_mpa": 2000.0, "mc_exponent": 0.21, "hb": "220–290 HB"}, {"code": "K1", "iso_group": "K", "name_ru": "Серый чугун (СЧ20, СЧ25, GG25)", "kc1_1_mpa": 1150.0, "mc_exponent": 0.28, "hb": "160–240 HB"}, {"code": "K2", "iso_group": "K", "name_ru": "Высокопрочный чугун ВЧ (ВЧ50, GGG50)", "kc1_1_mpa": 1350.0, "mc_exponent": 0.28, "hb": "180–270 HB"}, {"code": "N1", "iso_group": "N", "name_ru": "Алюминиевые сплавы (Д16Т, АМг6, 6061-T6)", "kc1_1_mpa": 450.0, "mc_exponent": 0.25, "hb": "60–120 HB"}, {"code": "N2", "iso_group": "N", "name_ru": "Медь и латунь (ЛС59-1, БрАЖ9-4)", "kc1_1_mpa": 750.0, "mc_exponent": 0.24, "hb": "70–140 HB"}, {"code": "S1", "iso_group": "S", "name_ru": "Никелевые суперсплавы (Inconel 718, ХН77ТЮР)", "kc1_1_mpa": 2600.0, "mc_exponent": 0.24, "hb": "260–380 HB"}, {"code": "S2", "iso_group": "S", "name_ru": "Титановые сплавы (ВТ6, Ti-6Al-4V)", "kc1_1_mpa": 1450.0, "mc_exponent": 0.23, "hb": "280–350 HB"}, {"code": "H1", "iso_group": "H", "name_ru": "Закалённые стали 48–58 HRC (Х12МФ, ШХ15, D2)", "kc1_1_mpa": 3200.0, "mc_exponent": 0.3, "hb": "48–58 HRC"}], "machines": [{"id": "m1", "name": "Токарно-фрезерный центр (BMT55)", "machine_type": "TURN_MILL", "max_rpm": 4500, "spindle_power_kw": 18.5, "max_torque_nm": 320.0, "rigidity_class": "HIGH"}, {"id": "m2", "name": "Вертикальный фрезерный ОЦ (BT40)", "machine_type": "MILL_3AX", "max_rpm": 12000, "spindle_power_kw": 15.0, "max_torque_nm": 95.0, "rigidity_class": "MEDIUM"}, {"id": "m3", "name": "Универсальный токарный ЧПУ (лёгкий)", "machine_type": "LATHE", "max_rpm": 3000, "spindle_power_kw": 7.5, "max_torque_nm": 160.0, "rigidity_class": "LOW"}], "inserts": [{"insert_id": "ins-1", "iso_code": "CNMG 120408", "operation_domain": "TURNING", "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN", "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 6, "wear": 8, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.0, "seat_pocket_signature": "C-N-1270-476-G", "suitability": {"P": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.2, 4.0], [0.15, 2.2]], "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.3, "ap": 2.5, "coolant": "FLOOD"}, "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"}, "P3": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.24, "ap": 2.0, "coolant": "FLOOD"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"}}}, {"insert_id": "ins-2", "iso_code": "CNMG 120404", "operation_domain": "TURNING", "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 8, "wear": 6, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 1.15, "seat_pocket_signature": "C-N-1270-476-G", "suitability": {"M": "PRIMARY", "S": "PRIMARY", "P": "SECONDARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"M1": {"vc": 165.0, "vc_min": 120.0, "vc_max": 210.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"}, "M2": {"vc": 125.0, "vc_min": 90.0, "vc_max": 160.0, "feed": 0.14, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 55.0, "vc_min": 40.0, "vc_max": 75.0, "feed": 0.12, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"}, "P1": {"vc": 230.0, "vc_min": 180.0, "vc_max": 280.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"}}}, {"insert_id": "ins-3", "iso_code": "CCMT 09T304", "operation_domain": "TURNING", "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 8, "wear": 6, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 0.9, "seat_pocket_signature": "C-C-953-397-T", "suitability": {"M": "PRIMARY", "S": "PRIMARY", "P": "SECONDARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "S20R-SCLCR 09", "category": "BORING_BAR", "lead_angle_deg": 95.0, "clamping": "SCREW"}], "recs": {"M1": {"vc": 155.0, "vc_min": 110.0, "vc_max": 195.0, "feed": 0.14, "ap": 0.8, "coolant": "FLOOD"}, "P1": {"vc": 220.0, "vc_min": 160.0, "vc_max": 270.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"}, "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 68.0, "feed": 0.1, "ap": 0.6, "coolant": "HIGH_PRESSURE_THROUGH"}}}, {"insert_id": "ins-7", "iso_code": "WNMG 080408", "operation_domain": "TURNING", "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN", "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 6, "wear": 8, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.05, "seat_pocket_signature": "W-N-1270-476-G", "suitability": {"P": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.2, 4.0], [0.15, 2.2]], "holders": [{"code": "PWLNR 2525M 08", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.3, "ap": 2.5, "coolant": "FLOOD"}, "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"}, "P3": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.24, "ap": 2.0, "coolant": "FLOOD"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"}}}, {"insert_id": "ins-8", "iso_code": "WNMG 080412", "operation_domain": "TURNING", "grade_code": "GEN-P35-TOUGH", "coating_method": "CVD", "coating_composition": "MT-TiCN-Al2O3", "chipbreaker_code": "GEN-PR", "application_class": "ROUGHING", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 6, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 1.2, "relative_cost": 1.12, "seat_pocket_signature": "W-N-1270-476-G", "suitability": {"P": "PRIMARY", "M": "SECONDARY"}, "operating_zone_polygon": [[0.25, 1.8], [0.35, 1.5], [0.65, 2.0], [0.58, 6.5], [0.3, 6.0], [0.25, 3.5]], "holders": [{"code": "PWLNR 2525M 08", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 245.0, "vc_min": 180.0, "vc_max": 310.0, "feed": 0.42, "ap": 3.8, "coolant": "FLOOD"}, "P2": {"vc": 205.0, "vc_min": 150.0, "vc_max": 260.0, "feed": 0.38, "ap": 3.5, "coolant": "FLOOD"}, "M1": {"vc": 145.0, "vc_min": 110.0, "vc_max": 180.0, "feed": 0.32, "ap": 3.0, "coolant": "FLOOD"}}}, {"insert_id": "ins-9", "iso_code": "DNMG 150608", "operation_domain": "TURNING", "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN", "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 6, "wear": 8, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.25, "seat_pocket_signature": "D-N-1270-635-G", "suitability": {"P": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.2, 4.0], [0.15, 2.2]], "holders": [{"code": "PDJNR 2525M 15", "category": "TURNING_EXTERNAL", "lead_angle_deg": 93.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.3, "ap": 2.5, "coolant": "FLOOD"}, "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"}}}, {"insert_id": "ins-10", "iso_code": "VNMG 160404", "operation_domain": "TURNING", "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 7, "wear": 8, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 1.35, "seat_pocket_signature": "V-N-953-476-G", "suitability": {"S": "PRIMARY", "M": "PRIMARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "MVJNR 2525M 16", "category": "TURNING_EXTERNAL", "lead_angle_deg": 93.0, "clamping": "TOP_CLAMP"}], "recs": {"S1": {"vc": 40.0, "vc_min": 25.0, "vc_max": 55.0, "feed": 0.12, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.14, "ap": 1.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 175.0, "vc_min": 130.0, "vc_max": 220.0, "feed": 0.15, "ap": 1.0, "coolant": "FLOOD"}}}, {"insert_id": "ins-11", "iso_code": "SNMG 120412", "operation_domain": "TURNING", "grade_code": "GEN-K15-CVD", "coating_method": "CVD", "coating_composition": "Thick Al2O3-TiCN", "chipbreaker_code": "GEN-KR", "application_class": "ROUGHING", "edge_prep": "CHAMFERED", "toughness": 5, "wear": 9, "cutting_edges_count": 8, "has_wiper_geometry": false, "corner_radius_mm": 1.2, "relative_cost": 1.1, "seat_pocket_signature": "S-N-1270-476-G", "suitability": {"K": "PRIMARY", "P": "SECONDARY"}, "operating_zone_polygon": [[0.2, 1.0], [0.6, 1.2], [0.55, 6.0], [0.2, 5.5]], "holders": [{"code": "PSBNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 75.0, "clamping": "LEVER"}], "recs": {"K1": {"vc": 340.0, "vc_min": 260.0, "vc_max": 420.0, "feed": 0.35, "ap": 3.0, "coolant": "DRY"}, "K2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.32, "ap": 2.8, "coolant": "FLOOD"}, "P1": {"vc": 270.0, "vc_min": 210.0, "vc_max": 330.0, "feed": 0.34, "ap": 3.0, "coolant": "FLOOD"}}}, {"insert_id": "ins-12", "iso_code": "DCMT 11T304", "operation_domain": "TURNING", "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 7, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 0.95, "seat_pocket_signature": "D-C-953-397-T", "suitability": {"N": "PRIMARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "S16Q-SDUCR 11", "category": "BORING_BAR", "lead_angle_deg": 93.0, "clamping": "SCREW"}], "recs": {"N1": {"vc": 700.0, "vc_min": 450.0, "vc_max": 1000.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"}, "N2": {"vc": 320.0, "vc_min": 220.0, "vc_max": 450.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"}}}, {"insert_id": "ins-13", "iso_code": "CNGA 120408", "operation_domain": "TURNING", "grade_code": "GEN-H10-CBN", "coating_method": "PVD", "coating_composition": "TiAlN-CBN", "chipbreaker_code": "GEN-HCBN", "application_class": "FINISHING", "edge_prep": "CHAMFERED", "toughness": 3, "wear": 10, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 4.8, "seat_pocket_signature": "C-N-1270-476-A", "suitability": {"H": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.05, 0.1], [0.12, 0.08], [0.18, 0.15], [0.16, 0.8], [0.06, 0.65]], "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"H1": {"vc": 155.0, "vc_min": 110.0, "vc_max": 200.0, "feed": 0.1, "ap": 0.25, "coolant": "DRY"}, "K1": {"vc": 480.0, "vc_min": 350.0, "vc_max": 620.0, "feed": 0.14, "ap": 0.4, "coolant": "DRY"}}}, {"insert_id": "ins-4", "iso_code": "APKT 160408", "operation_domain": "MILLING", "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN", "chipbreaker_code": "GEN-GM", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": true, "corner_radius_mm": 0.8, "relative_cost": 1.2, "seat_pocket_signature": "A-P-953-476-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.08, 0.5], [0.22, 0.8], [0.18, 10.0], [0.08, 8.0]], "holders": [{"code": "SHM-AP16-D50-Z5", "category": "SHOULDER_MILL", "lead_angle_deg": 90.0, "dc_mm": 50.0, "z": 5, "clamping": "SCREW"}], "recs": {"P1": {"vc": 210.0, "vc_min": 160.0, "vc_max": 260.0, "feed": 0.15, "ap": 3.5, "ae_ratio": 0.5, "coolant": "AIR_BLAST"}, "P2": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.14, "ap": 3.0, "ae_ratio": 0.5, "coolant": "AIR_BLAST"}, "M1": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.12, "ap": 2.5, "ae_ratio": 0.4, "coolant": "FLOOD"}, "K1": {"vc": 220.0, "vc_min": 170.0, "vc_max": 270.0, "feed": 0.16, "ap": 4.0, "ae_ratio": 0.6, "coolant": "DRY"}}}, {"insert_id": "ins-5", "iso_code": "APKT 160408-AL", "operation_domain": "MILLING", "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron", "chipbreaker_code": "GEN-AL", "application_class": "ALUMINUM_SHARP", "edge_prep": "SHARP", "toughness": 7, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": true, "corner_radius_mm": 0.8, "relative_cost": 1.25, "seat_pocket_signature": "A-P-953-476-T", "suitability": {"N": "PRIMARY"}, "operating_zone_polygon": [[0.05, 0.5], [0.25, 1.0], [0.2, 12.0], [0.05, 10.0]], "holders": [{"code": "SHM-AP16-D50-Z5", "category": "SHOULDER_MILL", "lead_angle_deg": 90.0, "dc_mm": 50.0, "z": 5, "clamping": "SCREW"}], "recs": {"N1": {"vc": 650.0, "vc_min": 400.0, "vc_max": 900.0, "feed": 0.15, "ap": 4.0, "ae_ratio": 0.6, "coolant": "FLOOD"}, "N2": {"vc": 320.0, "vc_min": 220.0, "vc_max": 420.0, "feed": 0.14, "ap": 3.0, "ae_ratio": 0.55, "coolant": "FLOOD"}}}, {"insert_id": "ins-14", "iso_code": "SEKT 120408", "operation_domain": "MILLING", "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN", "chipbreaker_code": "GEN-FM45", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 4, "has_wiper_geometry": true, "corner_radius_mm": 0.8, "relative_cost": 1.3, "seat_pocket_signature": "S-E-1270-476-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.1, 0.5], [0.3, 0.8], [0.26, 5.5], [0.1, 5.0]], "holders": [{"code": "FM45-SE12-D80-Z6", "category": "FACE_MILL", "lead_angle_deg": 45.0, "dc_mm": 80.0, "z": 6, "clamping": "SCREW"}], "recs": {"P1": {"vc": 235.0, "vc_min": 180.0, "vc_max": 290.0, "feed": 0.22, "ap": 3.0, "ae_ratio": 0.65, "coolant": "AIR_BLAST"}, "P2": {"vc": 200.0, "vc_min": 155.0, "vc_max": 250.0, "feed": 0.19, "ap": 2.8, "ae_ratio": 0.65, "coolant": "AIR_BLAST"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.24, "ap": 3.5, "ae_ratio": 0.7, "coolant": "DRY"}, "M1": {"vc": 145.0, "vc_min": 110.0, "vc_max": 180.0, "feed": 0.16, "ap": 2.5, "ae_ratio": 0.55, "coolant": "FLOOD"}}}, {"insert_id": "ins-15", "iso_code": "RDMT 120400", "operation_domain": "MILLING", "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano", "chipbreaker_code": "GEN-RND", "application_class": "ROUGHING", "edge_prep": "HONED", "toughness": 7, "wear": 8, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 6.0, "relative_cost": 1.4, "seat_pocket_signature": "R-D-1200-476-T", "suitability": {"S": "PRIMARY", "M": "PRIMARY"}, "operating_zone_polygon": [[0.12, 0.5], [0.35, 0.8], [0.3, 5.0], [0.12, 4.5]], "holders": [{"code": "CM-RD12-D50-Z4", "category": "COPY_MILL", "lead_angle_deg": 45.0, "dc_mm": 50.0, "z": 4, "clamping": "SCREW"}], "recs": {"S1": {"vc": 38.0, "vc_min": 25.0, "vc_max": 52.0, "feed": 0.2, "ap": 1.5, "ae_ratio": 0.35, "coolant": "FLOOD"}, "S2": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.22, "ap": 2.0, "ae_ratio": 0.4, "coolant": "FLOOD"}, "M1": {"vc": 150.0, "vc_min": 110.0, "vc_max": 190.0, "feed": 0.24, "ap": 2.5, "ae_ratio": 0.5, "coolant": "FLOOD"}}}, {"insert_id": "ins-6", "iso_code": "WCMX 050308", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-CORE", "coating_method": "PVD", "coating_composition": "TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 9, "wear": 5, "cutting_edges_count": 3, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.1, "seat_pocket_signature": "W-C-794-318-X", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-WCMX05-D26-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 26.0, "z": 1, "clamping": "SCREW"}], "recs": {"P1": {"vc": 160.0, "vc_min": 120.0, "vc_max": 200.0, "feed": 0.11, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 110.0, "vc_min": 80.0, "vc_max": 140.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}}, {"insert_id": "ins-16", "iso_code": "SPMG 07T308", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.15, "seat_pocket_signature": "S-P-794-397-G", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-SPMG07-D22-4D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 22.0, "z": 1, "clamping": "SCREW"}], "recs": {"P1": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 155.0, "vc_min": 115.0, "vc_max": 195.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 200.0, "vc_min": 150.0, "vc_max": 250.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 65.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}}, {"insert_id": "ins-17", "iso_code": "SPMG 090408", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.3, "seat_pocket_signature": "S-P-953-476-G", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-SPMG09-D32-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 32.0, "z": 1, "clamping": "SCREW"}], "recs": {"P1": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 155.0, "vc_min": 115.0, "vc_max": 195.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 200.0, "vc_min": 150.0, "vc_max": 250.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 65.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}}], "cross_references": [{"source_insert_id": "ins-1", "target_insert_id": "ins-7", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.92, "notes": "WNMG 080408 даёт 6 кромок вместо 4 при том же угле 80° (державка PWLNR)"}, {"source_insert_id": "ins-7", "target_insert_id": "ins-1", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.92, "notes": "CNMG 120408 обеспечивает большую глубину резания ap при том же угле 80°"}, {"source_insert_id": "ins-1", "target_insert_id": "ins-2", "match_type": "HIGHER_TOUGHNESS", "confidence_score": 0.88, "notes": "Та же державка PCLNR 12; переход на острую PVD-кромку и радиус 0.4"}, {"source_insert_id": "ins-1", "target_insert_id": "ins-13", "match_type": "HIGHER_WEAR_RESISTANCE", "confidence_score": 0.85, "notes": "Та же державка PCLNR 12; переход на CBN для закалённых сталей >48 HRC"}, {"source_insert_id": "ins-7", "target_insert_id": "ins-8", "match_type": "HIGHER_TOUGHNESS", "confidence_score": 0.95, "notes": "То же гнездо PWLNR 08; усиленный черновой стружколом и сплав P35"}, {"source_insert_id": "ins-9", "target_insert_id": "ins-10", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.8, "notes": "Переход с 55° (DNMG) на 35° (VNMG) для сложного профилирования"}, {"source_insert_id": "ins-6", "target_insert_id": "ins-16", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.86, "notes": "SPMG 07T308 даёт 4 кромки вместо 3 у WCMX (корпус UDRL-SPMG07)"}]};

const STORAGE_KEYS = {
  theme: "skm_theme_v1",
  machines: "skm_custom_machines_v1",
  assemblies: "skm_saved_assemblies_v1",
};

const state = {
  apiLive: false,
  apiBase: window.location.protocol.startsWith("http") ? "" : "http://localhost:8000",
  activeTab: "selector",
  units: "metric",
  theme: "dark",
  isoGroup: "P",
  op: "TURNING",
  stability: "STABLE",
  pocketFilter: null,
  candidates: [],
  selectedId: null,
  compareIds: [],
  customMachines: [],
  savedAssemblies: [],
  viewerCoatingOverride: null,
  chartBounds: { fMin: 0.05, fMax: 0.5, apMin: 0, apMax: 5 },
};

let viewer3d = null;
let toastTimer = null;

// ============================================================================
// ISO 1832 Parser & 2D Technical SVG Sketch
// ============================================================================
const SHAPES = {
  C: { name: "Ромб 80°", edges: 2, icF: 1.016 },
  D: { name: "Ромб 55°", edges: 2, icF: 0.819 },
  S: { name: "Квадрат 90°", edges: 4, icF: 1.0 },
  T: { name: "Треугольник 60°", edges: 3, icF: 0.577 },
  V: { name: "Ромб 35°", edges: 2, icF: 0.574 },
  W: { name: "Тригон 80°", edges: 3, icF: 1.464 },
  R: { name: "Круг", edges: 6, icF: 1.0 },
  A: { name: "Параллелограмм 85°", edges: 2, icF: 0.577 },
  P: { name: "Пятиугольник 108°", edges: 5, icF: 1.376 },
  H: { name: "Шестиугольник 120°", edges: 6, icF: 1.732 },
  O: { name: "Восьмиугольник 135°", edges: 8, icF: 2.414 },
  L: { name: "Прямоугольник 90°", edges: 2, icF: 0.6 },
};
const CLEAR = {
  N: [0, "Негативная 0°"], C: [7, "Позитивная 7°"], P: [11, "Позитивная 11°"],
  D: [15, "Позитивная 15°"], B: [5, "Позитивная 5°"], A: [3, "Позитивная 3°"],
  E: [20, "Позитивная 20°"], F: [25, "Позитивная 25°"], G: [30, "Позитивная 30°"],
};
const TOL = {
  M: "Прессованная (±0.05..0.15)", G: "Шлифованная (±0.025)",
  E: "Прецизионная", K: "Фрезерная шлиф.", U: "Черновая", H: "Высокоточная (±0.013)",
};
const FIX = {
  G: ["Цил. отв., 2-ст. стружк.", true], M: ["Цил. отв., 1-ст. стружк.", false],
  T: ["Зенковка (винт), 1-ст.", false], A: ["Цил. отв., без стружк. (CBN)", true],
  X: ["Спец. сверл./фрез.", false], W: ["Зенковка без стружк.", false],
  N: ["Без отв. (прихват)", true],
};
const THK = { "01": 1.59, T1: 1.98, "02": 2.38, "03": 3.18, T3: 3.97, "04": 4.76, "05": 5.56, "06": 6.35, "07": 7.94, "09": 9.52 };
const IC_STD = {
  C06: 6.35, C09: 9.525, C12: 12.7, C16: 15.875, C19: 19.05,
  D07: 6.35, D11: 9.525, D15: 12.7,
  S07: 7.938, S09: 9.525, S12: 12.7, S15: 15.875, S19: 19.05,
  T11: 6.35, T16: 9.525, T22: 12.7,
  V11: 6.35, V16: 9.525,
  W05: 7.938, W06: 9.525, W08: 12.7,
  A10: 6.35, A11: 6.35, A16: 9.525,
  R08: 8.0, R10: 10.0, R12: 12.0, R16: 16.0,
};

function parseIsoClient(raw) {
  const cleaned = (raw || "").replace(/[^A-Za-z0-9\-]/g, "").toUpperCase();
  const core = cleaned.split("-")[0];
  if (core.length < 10) return { valid: false, error: "Минимум 10 символов (например, CNMG 120408)" };
  const [s1, s2, s3, s4] = [core[0], core[1], core[2], core[3]];
  const [s5, s6, s7] = [core.slice(4, 6), core.slice(6, 8), core.slice(8, 10)];
  if (!SHAPES[s1] || !CLEAR[s2] || !TOL[s3] || !FIX[s4] || !THK[s6]) {
    return { valid: false, error: "Нераспознанный сегмент ISO 1832" };
  }
  const len = parseFloat(s5) || 12;
  const ic = IC_STD[s1 + s5] || +(len * SHAPES[s1].icF).toFixed(3);
  const thk = THK[s6];
  const rad = (s1 === "R" && (s7 === "00" || s7 === "M0")) ? +(ic / 2).toFixed(2) : +(parseInt(s7, 10) / 10).toFixed(2);
  const dbl = s2 === "N" && FIX[s4][1];
  const edges = SHAPES[s1].edges * (dbl ? 2 : 1);
  const pocket = `${s1}-${s2}-${Math.floor(ic * 100 + 0.5)}-${Math.floor(thk * 100 + 0.5)}-${s4}`;
  return {
    valid: true, raw_code: raw, normalized_code: core,
    shape_code: s1, shape_name: SHAPES[s1].name,
    clearance_angle_code: s2, clearance_angle_deg: CLEAR[s2][0],
    tolerance_class: s3, fixing_type_code: s4,
    ic_mm: ic, cutting_edge_length_mm: len, thickness_mm: thk, corner_radius_mm: rad,
    is_double_sided: dbl, cutting_edges_count: edges, seat_pocket_signature: pocket,
    segments: [
      { label: "Форма", code: s1, meaning: SHAPES[s1].name, color: "#38BDF8" },
      { label: "Задний угол", code: s2, meaning: CLEAR[s2][1], color: "#A78BFA" },
      { label: "Допуск", code: s3, meaning: TOL[s3], color: "#34D399" },
      { label: "Крепление", code: s4, meaning: FIX[s4][0], color: "#FBBF24" },
      { label: "Размер (IC)", code: s5, meaning: `L≈${len} мм, IC=${ic} мм`, color: "#FB7185" },
      { label: "Толщина (S)", code: s6, meaning: `${thk} мм`, color: "#F97316" },
      { label: "Радиус (RE)", code: s7, meaning: `${rad} мм`, color: "#2DD4BF" },
    ],
  };
}

function renderInsertSVG(shape) {
  const shapesSvg = {
    C: `<polygon points="55,12 92,55 55,98 18,55" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>`,
    D: `<polygon points="55,8 84,55 55,102 26,55" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>`,
    V: `<polygon points="55,6 76,55 55,104 34,55" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>`,
    S: `<rect x="20" y="20" width="70" height="70" rx="6" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="3"/>`,
    T: `<polygon points="55,14 96,88 14,88" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>`,
    W: `<polygon points="55,14 90,34 86,78 55,96 24,78 20,34" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>`,
    A: `<polygon points="34,14 84,18 76,96 26,92" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>`,
    R: `<circle cx="55" cy="55" r="36" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="3"/>`,
  };
  return `<svg viewBox="0 0 110 110" width="90" height="90">
    <line x1="55" y1="4" x2="55" y2="106" stroke="var(--border)" stroke-dasharray="3,3" stroke-width="1"/>
    <line x1="4" y1="55" x2="106" y2="55" stroke="var(--border)" stroke-dasharray="3,3" stroke-width="1"/>
    ${shapesSvg[shape] || shapesSvg.C}
    <circle cx="55" cy="55" r="11" fill="var(--bg)" stroke="var(--muted)" stroke-width="2"/>
  </svg>`;
}

// ============================================================================
// Kienzle Cutting Physics, Ra Roughness & Beam Deflection Engine
// ============================================================================
function pointInPoly(x, y, poly) {
  if (!poly || poly.length < 3) return true;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function calcKienzleClient(inp) {
  const warnings = [];
  const sinK = Math.max(Math.sin((Math.min(inp.lead_angle_deg, 90) * Math.PI) / 180), 0.15);
  const rpmRaw = (1000 * inp.vc_m_min) / (Math.PI * inp.diameter_mm);
  let rpm = rpmRaw, effVc = inp.vc_m_min;
  if (inp.machine_max_rpm && rpmRaw > inp.machine_max_rpm) {
    rpm = inp.machine_max_rpm;
    effVc = (Math.PI * inp.diameter_mm * rpm) / 1000;
    warnings.push(`Обороты (${rpmRaw.toFixed(0)}) выше лимита станка (${inp.machine_max_rpm}). Фактическая Vc = ${effVc.toFixed(1)} м/мин.`);
  }
  let hm, kc, vf, mrr, pNet, fc, thin = 1.0;
  if (inp.operation_domain === "TURNING") {
    hm = Math.max(inp.feed_mm * sinK, 0.01);
    kc = inp.kc1_1_mpa * Math.pow(hm, -inp.mc_exponent);
    vf = inp.feed_mm * rpm;
    mrr = inp.ap_mm * inp.feed_mm * effVc;
    fc = inp.ap_mm * inp.feed_mm * kc;
    pNet = (fc * effVc) / 60000;
  } else if (inp.operation_domain === "MILLING") {
    const ae = Math.min(inp.ae_mm || inp.diameter_mm * 0.5, inp.diameter_mm);
    const ratio = ae / inp.diameter_mm;
    if (ratio < 0.5) {
      hm = Math.max(inp.feed_mm * sinK * Math.sqrt(ratio), 0.01);
      thin = +(1 / Math.sqrt(ratio)).toFixed(2);
    } else {
      hm = Math.max(inp.feed_mm * sinK, 0.01);
    }
    kc = inp.kc1_1_mpa * Math.pow(hm, -inp.mc_exponent);
    vf = inp.feed_mm * inp.teeth_count * rpm;
    mrr = (inp.ap_mm * ae * vf) / 1000;
    pNet = (inp.ap_mm * ae * vf * kc) / 60000000;
    fc = (pNet * 60000) / Math.max(effVc, 0.1);
  } else {
    hm = Math.max(inp.feed_mm * 0.5 * sinK, 0.01);
    kc = inp.kc1_1_mpa * Math.pow(hm, -inp.mc_exponent);
    vf = inp.feed_mm * rpm;
    mrr = ((Math.PI * inp.diameter_mm * inp.diameter_mm) / 4 * vf) / 1000;
    pNet = (inp.feed_mm * inp.diameter_mm * effVc * kc) / 240000;
    fc = (pNet * 60000) / Math.max(effVc, 0.1);
  }

  const pMot = pNet / 0.80;
  const trq = (9550 * pMot) / Math.max(rpm, 1);

  let raUm = null;
  if (inp.operation_domain === "TURNING" && inp.corner_radius_mm && inp.corner_radius_mm > 0) {
    raUm = ((inp.feed_mm * inp.feed_mm) / (32 * inp.corner_radius_mm)) * 1000 * (inp.has_wiper_geometry ? 0.5 : 1.0);
    raUm = +raUm.toFixed(2);
  }
  let ldRatio = null, deflMm = null;
  if (inp.overhang_mm && inp.shank_diameter_mm) {
    ldRatio = +(inp.overhang_mm / inp.shank_diameter_mm).toFixed(2);
    const eMap = { STEEL: 210000, CARBIDE: 580000, DAMPED: 210000 };
    const ldMap = { STEEL: 4.0, CARBIDE: 6.5, DAMPED: 10.0 };
    const mat = inp.shank_material || "STEEL";
    const I = (Math.PI * Math.pow(inp.shank_diameter_mm, 4)) / 64;
    const fRad = fc * (inp.operation_domain === "DRILLING" ? 0.15 : 0.35);
    deflMm = +((fRad * Math.pow(inp.overhang_mm, 3)) / (3 * eMap[mat] * I)).toFixed(4);
    if (ldRatio > ldMap[mat]) warnings.push(`Высокий вылет L/D=${ldRatio} для оправки ${mat} (рекомендовано ≤ ${ldMap[mat]}) — риск вибраций.`);
    if (deflMm > 0.05) warnings.push(`Расчётный прогиб оправки δ=${deflMm.toFixed(3)} мм > 0.05 мм — уменьшите вылет или смените оправку.`);
  }

  if (inp.machine_max_power_kw && pMot > inp.machine_max_power_kw)
    warnings.push(`Мощность (${pMot.toFixed(2)} кВт) превышает лимит станка (${inp.machine_max_power_kw} кВт).`);
  if (inp.machine_max_torque_nm && trq > inp.machine_max_torque_nm)
    warnings.push(`Крутящий момент (${trq.toFixed(1)} Н·м) превышает лимит станка (${inp.machine_max_torque_nm} Н·м).`);

  let inZone = null;
  if (inp.chipbreaker_polygon && inp.chipbreaker_polygon.length >= 3 && inp.operation_domain !== "DRILLING") {
    inZone = pointInPoly(inp.feed_mm, inp.ap_mm, inp.chipbreaker_polygon);
    if (!inZone) warnings.push(`Точка (f=${inp.feed_mm}, ap=${inp.ap_mm}) вне полигона стружколома — риск сливной стружки или скола.`);
  }
  return {
    rpm: +rpmRaw.toFixed(1), rpm_clamped: +rpm.toFixed(1), vf_mm_min: +vf.toFixed(1),
    hm_mm: +hm.toFixed(4), kc_mpa: +kc.toFixed(1), fc_n: +fc.toFixed(1),
    mrr_cm3_min: +mrr.toFixed(2), power_net_kw: +pNet.toFixed(2), power_motor_kw: +pMot.toFixed(2),
    torque_nm: +trq.toFixed(1), chip_thinning_factor: thin,
    ra_um: raUm, ld_ratio: ldRatio, deflection_mm: deflMm,
    in_chipbreaker_zone: inZone, warnings,
  };
}

// ============================================================================
// Formatting, Theme, Toast & Tabs
// ============================================================================
function fmtLen(mm) { return state.units === "metric" ? `${mm.toFixed(2)} мм` : `${(mm / 25.4).toFixed(4)} in`; }
function fmtVc(vc) { return state.units === "metric" ? `${vc.toFixed(0)} м/мин` : `${(vc * 3.28084).toFixed(0)} SFM`; }
function allMachines() { return [...FALLBACK_DB.machines, ...state.customMachines]; }

function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
  const btn = document.getElementById("btnTheme");
  if (btn) btn.textContent = theme === "dark" ? "☀ Светлая" : "☾ Тёмная";
}

function toggleTheme() { setTheme(state.theme === "dark" ? "light" : "dark"); }

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll(".nav-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${tabId}`));
  if (tabId === "studio3d") {
    ensureViewer3D().then(() => sync3dWithSelectedCandidate());
  } else if (tabId === "compare") {
    renderCompareTable();
  } else if (tabId === "setups") {
    renderSavedAssemblies();
  }
}

function setUnits(u) {
  state.units = u;
  document.getElementById("btnMetric").classList.toggle("active", u === "metric");
  document.getElementById("btnImperial").classList.toggle("active", u === "imperial");
  updateSliderLabels();
  renderCandidates();
  renderSelectedDetails();
  if (state.activeTab === "compare") renderCompareTable();
}

// ============================================================================
// URL State Sharing
// ============================================================================
function shareScenarioLink() {
  const params = new URLSearchParams({
    op: state.op,
    mat: document.getElementById("subgroupSelect").value,
    st: state.stability,
    iso: document.getElementById("isoInput").value.trim(),
    ap: document.getElementById("apSlider").value,
    f: document.getElementById("feedSlider").value,
    d: document.getElementById("diamSlider").value,
    tab: state.activeTab,
  });
  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", `?${params.toString()}`);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => showToast("Ссылка на расчёт скопирована — можно отправлять коллегам!"));
  } else {
    showToast("URL обновлён в адресной строке браузера.");
  }
}

function applyUrlParams() {
  const p = new URLSearchParams(window.location.search);
  if (p.has("mat")) {
    const sg = FALLBACK_DB.subgroups.find((s) => s.code === p.get("mat"));
    if (sg) {
      state.isoGroup = sg.iso_group;
      document.querySelectorAll(".iso-btn").forEach((b) => b.classList.toggle("active", b.dataset.g === sg.iso_group));
      populateSubgroups();
      document.getElementById("subgroupSelect").value = sg.code;
    }
  }
  if (p.has("op") && ["TURNING", "MILLING", "DRILLING"].includes(p.get("op"))) {
    selectOp(p.get("op"), true);
  }
  if (p.has("st") && ["STABLE", "INTERRUPTED", "UNSTABLE"].includes(p.get("st"))) {
    state.stability = p.get("st");
    document.querySelectorAll("[data-st]").forEach((b) => b.classList.toggle("active", b.dataset.st === state.stability));
  }
  if (p.has("ap")) document.getElementById("apSlider").value = p.get("ap");
  if (p.has("f")) document.getElementById("feedSlider").value = p.get("f");
  if (p.has("d")) document.getElementById("diamSlider").value = p.get("d");
  if (p.has("iso")) document.getElementById("isoInput").value = p.get("iso");
  if (p.has("tab") && ["selector", "studio3d", "compare", "setups"].includes(p.get("tab"))) {
    state.activeTab = p.get("tab");
  }
}

// ============================================================================
// ISO Decoder Handlers
// ============================================================================
async function handleIsoInput() {
  const code = document.getElementById("isoInput").value;
  let parsed;
  if (state.apiLive) {
    try {
      const r = await fetch(`${state.apiBase}/api/iso1832/parse?code=${encodeURIComponent(code)}`);
      parsed = r.ok ? await r.json() : parseIsoClient(code);
    } catch { parsed = parseIsoClient(code); }
  } else {
    parsed = parseIsoClient(code);
  }

  const grid = document.getElementById("segmentsGrid");
  const pBar = document.getElementById("pocketBar");
  const prev = document.getElementById("insertPreview");

  if (!parsed.valid) {
    grid.innerHTML = `<div style="color:var(--amber);font-size:13px;grid-column:1/-1;">${parsed.error}</div>`;
    pBar.innerHTML = "";
    prev.innerHTML = renderInsertSVG("C");
    return;
  }

  prev.innerHTML = renderInsertSVG(parsed.shape_code);
  grid.innerHTML = parsed.segments
    .map((s) => `
      <div class="seg-card" style="border-top-color:${s.color}">
        <div class="seg-label">${s.label}</div>
        <div class="seg-code" style="color:${s.color}">${s.code}</div>
        <div class="seg-meaning">${s.meaning}</div>
      </div>`)
    .join("");

  const isFiltered = state.pocketFilter === parsed.seat_pocket_signature;
  pBar.innerHTML = `
    <span>Ключ гнезда (ISO 13399): <span class="pocket-sig">${parsed.seat_pocket_signature}</span></span>
    <span>Режущих кромок: <b style="color:var(--text)">${parsed.cutting_edges_count}</b></span>
    <button class="v-btn ${isFiltered ? "active" : ""}" onclick="togglePocketFilter('${parsed.seat_pocket_signature}')">
      ${isFiltered ? "✓ Фильтр по гнезду активен (сбросить)" : "Подобрать пластины в это гнездо"}
    </button>
    <button class="v-btn accent" onclick="switchTab('studio3d')">Открыть в 3D →</button>
  `;
  update3dSpecPanel(parsed);
  if (viewer3d && !viewer3d.isCadFileLoaded) {
    sync3dWithSelectedCandidate(code, parsed);
  }
}

function setIso(code) {
  document.getElementById("isoInput").value = code;
  state.viewerCoatingOverride = null;
  handleIsoInput();
}

function togglePocketFilter(sig) {
  state.pocketFilter = state.pocketFilter === sig ? null : sig;
  handleIsoInput();
  runSelection();
}

// ============================================================================
// Task Wizard, Machine Profiles & Selection Engine
// ============================================================================
function renderMachineSelect(selectedId) {
  const sel = document.getElementById("machineSelect");
  const list = allMachines();
  sel.innerHTML = list
    .map((m) => `<option value="${m.id}">${m.name} (${m.spindle_power_kw} кВт · ${m.max_rpm} об/мин)</option>`)
    .join("");
  if (selectedId && list.some((m) => m.id === selectedId)) sel.value = selectedId;
}

function openMachineModal() { document.getElementById("machineModal").classList.add("open"); }
function closeMachineModal() { document.getElementById("machineModal").classList.remove("open"); }

function saveCustomMachine(e) {
  e.preventDefault();
  const name = document.getElementById("cmName").value.trim() || "Станок цеха";
  const power = parseFloat(document.getElementById("cmPower").value) || 15;
  const rpm = parseInt(document.getElementById("cmRpm").value, 10) || 6000;
  const torque = parseFloat(document.getElementById("cmTorque").value) || 150;
  const newM = { id: `custom-${Date.now()}`, name, machine_type: "TURN_MILL", max_rpm: rpm, spindle_power_kw: power, max_torque_nm: torque, rigidity_class: "MEDIUM" };
  state.customMachines.push(newM);
  localStorage.setItem(STORAGE_KEYS.machines, JSON.stringify(state.customMachines));
  renderMachineSelect(newM.id);
  closeMachineModal();
  showToast(`Станок «${name}» добавлен`);
  runSelection();
}

function populateSubgroups() {
  const sel = document.getElementById("subgroupSelect");
  const list = FALLBACK_DB.subgroups.filter((s) => s.iso_group === state.isoGroup);
  sel.innerHTML = list.map((s) => `<option value="${s.code}">${s.code} — ${s.name_ru}</option>`).join("");
  updateKienzleBadge();
}

function updateKienzleBadge() {
  const sg = FALLBACK_DB.subgroups.find((s) => s.code === document.getElementById("subgroupSelect").value);
  if (sg) document.getElementById("kienzleBadge").textContent = `kc1.1=${sg.kc1_1_mpa} МПа · mc=${sg.mc_exponent}`;
}

function selectIsoGroup(g) {
  state.isoGroup = g;
  document.querySelectorAll(".iso-btn").forEach((b) => b.classList.toggle("active", b.dataset.g === g));
  populateSubgroups();
  if (g === "H" && state.op === "TURNING") {
    document.getElementById("apSlider").value = 0.3;
    document.getElementById("feedSlider").value = 0.10;
    updateSliderLabels();
  }
  runSelection();
}

function selectOp(op, silent = false) {
  state.op = op;
  document.querySelectorAll("[data-op]").forEach((b) => b.classList.toggle("active", b.dataset.op === op));
  const apF = document.getElementById("apField"), aeF = document.getElementById("aeField");
  const feedLbl = document.getElementById("feedLabel"), feedSl = document.getElementById("feedSlider");
  const apSl = document.getElementById("apSlider"), diamLbl = document.getElementById("diamLabel");

  if (op === "TURNING") {
    apF.style.display = "block"; aeF.style.display = "none";
    feedLbl.innerHTML = "Подача на оборот f<sub>n</sub>"; diamLbl.textContent = "Диаметр заготовки D";
    feedSl.min = 0.05; feedSl.max = 0.60; feedSl.value = 0.25;
    apSl.min = 0.1; apSl.max = 6.5; apSl.value = 2.0;
  } else if (op === "MILLING") {
    apF.style.display = "block"; aeF.style.display = "block";
    feedLbl.innerHTML = "Подача на зуб f<sub>z</sub>"; diamLbl.textContent = "Диаметр фрезы D<sub>c</sub>";
    feedSl.min = 0.04; feedSl.max = 0.35; feedSl.value = 0.15;
    apSl.min = 0.5; apSl.max = 12.0; apSl.value = 3.0;
  } else {
    apF.style.display = "none"; aeF.style.display = "none";
    feedLbl.innerHTML = "Подача сверления f<sub>n</sub>"; diamLbl.textContent = "Диаметр сверла D<sub>c</sub>";
    feedSl.min = 0.04; feedSl.max = 0.20; feedSl.value = 0.11;
    document.getElementById("diamSlider").value = 26;
  }
  updateSliderLabels();
  if (!silent) runSelection();
}

function selectStability(st) {
  state.stability = st;
  document.querySelectorAll("[data-st]").forEach((b) => b.classList.toggle("active", b.dataset.st === st));
  runSelection();
}

function updateSliderLabels() {
  document.getElementById("apVal").textContent = fmtLen(parseFloat(document.getElementById("apSlider").value));
  document.getElementById("feedVal").textContent = fmtLen(parseFloat(document.getElementById("feedSlider").value));
  document.getElementById("aeVal").textContent = fmtLen(parseFloat(document.getElementById("aeSlider").value));
  document.getElementById("diamVal").textContent = fmtLen(parseFloat(document.getElementById("diamSlider").value));
  document.getElementById("overhangVal").textContent = fmtLen(parseFloat(document.getElementById("overhangSlider").value));
  document.getElementById("shankVal").textContent = fmtLen(parseFloat(document.getElementById("shankSlider").value));
}

function onSliderChange() { updateSliderLabels(); runSelection(); }

async function runSelection() {
  updateKienzleBadge();
  const payload = {
    operation_domain: state.op,
    material_subgroup: document.getElementById("subgroupSelect").value,
    stability: state.stability,
    ap_mm: state.op === "DRILLING" ? 0 : parseFloat(document.getElementById("apSlider").value),
    feed_mm: parseFloat(document.getElementById("feedSlider").value),
    ae_mm: parseFloat(document.getElementById("aeSlider").value),
    diameter_mm: parseFloat(document.getElementById("diamSlider").value),
    machine_id: document.getElementById("machineSelect").value,
    pocket_filter: state.pocketFilter,
    overhang_mm: parseFloat(document.getElementById("overhangSlider").value),
    shank_diameter_mm: parseFloat(document.getElementById("shankSlider").value),
    shank_material: document.getElementById("shankMatSelect").value,
  };

  let results = [];
  const isCustomMachine = payload.machine_id && payload.machine_id.startsWith("custom-");
  if (state.apiLive && !isCustomMachine) {
    try {
      const r = await fetch(`${state.apiBase}/api/select`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (r.ok) results = await r.json();
      else results = runSelectionClient(payload);
    } catch { results = runSelectionClient(payload); }
  } else {
    results = runSelectionClient(payload);
  }

  state.candidates = results;
  if (!results.find((c) => c.insert_id === state.selectedId)) {
    state.selectedId = results.length ? results[0].insert_id : null;
  }
  renderCandidates();
  await renderSelectedDetails();
  if (state.activeTab === "compare") renderCompareTable();
}

function runSelectionClient(req) {
  const sg = FALLBACK_DB.subgroups.find((s) => s.code === req.material_subgroup);
  const m = allMachines().find((x) => x.id === req.machine_id) || allMachines()[0];
  const vcFactor = { STABLE: 1.0, INTERRUPTED: 0.80, UNSTABLE: 0.85 }[req.stability];

  const out = [];
  for (const ins of FALLBACK_DB.inserts) {
    if (ins.operation_domain !== req.operation_domain) continue;
    const rank = ins.suitability[sg.iso_group];
    if (!rank) continue;
    if (req.pocket_filter && ins.seat_pocket_signature !== req.pocket_filter) continue;
    const rec = ins.recs[req.material_subgroup] || Object.values(ins.recs)[0];
    const vc = +(rec.vc * vcFactor).toFixed(1);
    const h0 = ins.holders[0] || {};
    const physics = calcKienzleClient({
      operation_domain: req.operation_domain,
      kc1_1_mpa: sg.kc1_1_mpa, mc_exponent: sg.mc_exponent,
      vc_m_min: vc, feed_mm: req.feed_mm, ap_mm: req.ap_mm, ae_mm: req.ae_mm,
      diameter_mm: req.operation_domain === "TURNING" ? req.diameter_mm : (h0.dc_mm || req.diameter_mm),
      teeth_count: h0.z || 1, lead_angle_deg: h0.lead_angle_deg || 90,
      corner_radius_mm: ins.corner_radius_mm || parseIsoClient(ins.iso_code).corner_radius_mm || 0.8,
      has_wiper_geometry: !!ins.has_wiper_geometry,
      overhang_mm: req.overhang_mm, shank_diameter_mm: req.shank_diameter_mm, shank_material: req.shank_material,
      machine_max_rpm: m.max_rpm, machine_max_power_kw: m.spindle_power_kw, machine_max_torque_nm: m.max_torque_nm,
      chipbreaker_polygon: ins.operating_zone_polygon,
    });
    let score = rank === "PRIMARY" ? 60 : 40;
    if (physics.in_chipbreaker_zone === true || req.operation_domain === "DRILLING") score += 20;
    score += req.stability === "INTERRUPTED"
      ? ins.toughness * 2
      : req.stability === "UNSTABLE"
        ? (ins.edge_prep === "SHARP" ? 12 : 4)
        : ins.wear * 2;
    if (physics.warnings.length) score -= Math.min(physics.warnings.length * 8, 24);
    score = Math.max(10, Math.min(100, score));
    out.push({
      ...ins,
      suitability_rank: rank,
      score,
      cost_per_edge: +(ins.relative_cost / ins.cutting_edges_count).toFixed(3),
      recommended_vc: vc,
      recommended_coolant: rec.coolant,
      physics,
    });
  }
  out.sort((a, b) => b.score - a.score || a.cost_per_edge - b.cost_per_edge);
  return out;
}

// ============================================================================
// Candidates, Analytics, Cross-Ref & Interactive SVG Chipbreaker Map
// ============================================================================
function renderCandidates() {
  const grid = document.getElementById("candidatesGrid");
  document.getElementById("candCount").textContent = `${state.candidates.length} вариантов`;
  if (!state.candidates.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Нет пластин под выбранную комбинацию. Попробуйте сбросить фильтр гнезда или выбрать другую операцию/материал.</div>`;
    return;
  }
  grid.innerHTML = state.candidates
    .map((c) => {
      const h = c.holders[0];
      const inCmp = state.compareIds.includes(c.insert_id);
      return `
        <div class="cand-card ${c.insert_id === state.selectedId ? "selected" : ""}" onclick="selectCandidate('${c.insert_id}')">
          <div class="cand-head">
            <div>
              <div class="cand-iso">${c.iso_code}</div>
              <div style="font-size:12px;color:var(--muted)">Сплав: <b style="color:var(--text)">${c.grade_code}</b> (${c.coating_method})</div>
            </div>
            <div class="score-pill ${c.score < 70 ? "mid" : ""}">${c.score}/100</div>
          </div>
          <div class="cand-tags">
            <span class="tag ${c.suitability_rank === "PRIMARY" ? "primary" : ""}">${c.suitability_rank}</span>
            <span class="tag">Стружколом: ${c.chipbreaker_code}</span>
            <span class="tag">${c.cutting_edges_count} кромок</span>
            ${c.has_wiper_geometry ? '<span class="tag primary">Wiper</span>' : ""}
          </div>
          <div class="cand-meta">
            <span>V<sub>c</sub> старт: <b>${fmtVc(c.recommended_vc)}</b></span>
            <span>Мощность: <b>${c.physics.power_motor_kw} кВт</b></span>
            <span>Цена/кромка: <b>${c.cost_per_edge}</b></span>
            <span>MRR: <b>${c.physics.mrr_cm3_min}</b> см³/м</span>
          </div>
          ${h ? `<div class="holder-pill">Корпус: <b>${h.code}</b> · ${h.category}</div>` : ""}
          <div class="cand-actions" onclick="event.stopPropagation()">
            <button class="mini-btn ${inCmp ? "active" : ""}" onclick="toggleCompare('${c.insert_id}')">${inCmp ? "✓ В сравнении" : "+ Сравнить"}</button>
            <button class="mini-btn" onclick="saveAssemblyFromCandidate('${c.insert_id}')">★ Сохранить</button>
            <button class="mini-btn" onclick="inspectCandidateIn3D('${c.insert_id}')">3D</button>
          </div>
        </div>`;
    })
    .join("");
}

function selectCandidate(id) {
  state.selectedId = id;
  state.viewerCoatingOverride = null;
  const c = state.candidates.find((x) => x.insert_id === id);
  if (c) setIso(c.iso_code);
  renderCandidates();
  renderSelectedDetails();
}

function inspectCandidateIn3D(id) {
  selectCandidate(id);
  switchTab("studio3d");
}

async function renderCrossReferences(insertId) {
  const box = document.getElementById("xrefContainer");
  let refs = [];
  if (state.apiLive) {
    try {
      const r = await fetch(`${state.apiBase}/api/inserts/${encodeURIComponent(insertId)}/equivalents`);
      if (r.ok) refs = await r.json();
    } catch {}
  } else {
    const byId = Object.fromEntries(FALLBACK_DB.inserts.map((i) => [i.insert_id, i]));
    refs = (FALLBACK_DB.cross_references || [])
      .filter((x) => x.source_insert_id === insertId && byId[x.target_insert_id])
      .map((x) => ({
        target_insert_id: x.target_insert_id,
        target_iso_code: byId[x.target_insert_id].iso_code,
        target_grade_code: byId[x.target_insert_id].grade_code,
        match_type: x.match_type,
        confidence_score: x.confidence_score,
        notes: x.notes,
      }));
  }
  if (!refs.length) { box.style.display = "none"; return; }
  box.style.display = "block";
  box.innerHTML = `<div style="font-weight:800;color:var(--muted);margin-bottom:6px;text-transform:uppercase;font-size:10.5px;letter-spacing:0.5px;">Функциональные аналоги (Cross-Reference)</div>` +
    refs.map((r) => `
      <div class="xref-item" onclick="setIso('${r.target_iso_code}')" title="Кликните, чтобы разобрать код аналога">
        <div>
          <b style="font-family:var(--mono);color:var(--accent)">${r.target_iso_code}</b>
          <span style="color:var(--muted)">(${r.target_grade_code})</span>
          <div style="color:var(--muted);font-size:11.5px;margin-top:2px;">${r.notes}</div>
        </div>
        <span class="tag primary">${Math.round(r.confidence_score * 100)}%</span>
      </div>`).join("");
}

async function renderSelectedDetails() {
  const c = state.candidates.find((x) => x.insert_id === state.selectedId);
  const m = allMachines().find((x) => x.id === document.getElementById("machineSelect").value) || allMachines()[0];
  if (!c) {
    document.getElementById("cbChart").innerHTML = `<text x="210" y="125" text-anchor="middle" fill="#64748b" font-size="13">Выберите пластину для отображения карты</text>`;
    document.getElementById("xrefContainer").style.display = "none";
    return;
  }
  const p = c.physics;
  document.getElementById("cbTitle").textContent = `${c.iso_code} · ${c.chipbreaker_code}`;
  document.getElementById("vcTitle").textContent = `Vc: ${fmtVc(c.recommended_vc)}`;
  document.getElementById("kRpm").textContent = `${p.rpm_clamped} об/м`;
  document.getElementById("kVf").textContent = `Vf: ${p.vf_mm_min} мм/мин`;
  document.getElementById("kFc").textContent = `${p.fc_n} Н`;
  document.getElementById("kKc").textContent = `kc: ${p.kc_mpa} МПа`;
  document.getElementById("kMrr").textContent = p.mrr_cm3_min;
  document.getElementById("kHm").textContent = `${p.hm_mm} мм`;
  document.getElementById("kThin").textContent = p.chip_thinning_factor > 1 ? `утонение: ${p.chip_thinning_factor}x!` : "утонение: 1.0x";
  document.getElementById("kRa").textContent = p.ra_um != null ? `${p.ra_um} мкм` : "—";
  document.getElementById("kRaSub").textContent = p.ra_um != null ? (c.has_wiper_geometry ? "Wiper (×0.5)" : "f² / (32·RE)") : "только точение";
  document.getElementById("kDefl").textContent = p.deflection_mm != null ? `${p.deflection_mm.toFixed(3)} мм` : "—";
  document.getElementById("kLd").textContent = p.ld_ratio ? `L/D = ${p.ld_ratio}` : "L/D: —";

  setBar("barPower", "lblPower", p.power_motor_kw, m.spindle_power_kw, "кВт");
  setBar("barTorque", "lblTorque", p.torque_nm, m.max_torque_nm, "Н·м");
  setBar("barRpm", "lblRpm", p.rpm_clamped, m.max_rpm, "об/мин");

  const wb = document.getElementById("warningsBox");
  if (p.warnings.length) {
    wb.className = "warnings-box";
    wb.innerHTML = p.warnings.map((w) => `⚠ ${w}`).join("<br>");
  } else {
    wb.className = "warnings-box ok";
    wb.textContent = "✓ Режимы в оптимальном окне стружколома, в пределах жёсткости оправки и лимитов станка.";
  }
  drawChipbreakerChart(c);
  await renderCrossReferences(c.insert_id);
}

function setBar(barId, lblId, val, maxVal, unit) {
  const pct = Math.min(100, (val / maxVal) * 100);
  const el = document.getElementById(barId);
  el.style.width = `${pct}%`;
  el.className = "bar-fill" + (pct > 95 ? " danger" : pct > 78 ? " warn" : "");
  document.getElementById(lblId).textContent = `${val} / ${maxVal} ${unit} (${pct.toFixed(0)}%)`;
}

function drawChipbreakerChart(c) {
  const svg = document.getElementById("cbChart");
  const poly = c.operating_zone_polygon || [];
  const statusEl = document.getElementById("cbStatus");
  if (!poly.length || state.op === "DRILLING") {
    svg.innerHTML = `<text x="210" y="122" text-anchor="middle" fill="var(--muted)" font-size="13">Для осевого сверления диаграмма ap/fn не применяется (контроль по fn).</text>`;
    statusEl.textContent = "Осевое сверление";
    return;
  }
  const fCur = parseFloat(document.getElementById("feedSlider").value);
  const apCur = parseFloat(document.getElementById("apSlider").value);
  const fMax = Math.max(0.5, ...poly.map((pt) => pt[0])) * 1.15;
  const apMax = Math.max(1.2, ...poly.map((pt) => pt[1])) * 1.15;
  state.chartBounds = { fMin: 0, fMax, apMin: 0, apMax };

  const padL = 44, padR = 16, padT = 14, padB = 30;
  const W = 420 - padL - padR, H = 245 - padT - padB;
  const sx = (f) => padL + (f / fMax) * W;
  const sy = (ap) => padT + H - (ap / apMax) * H;

  let gridSvg = "";
  for (let i = 0; i <= 4; i++) {
    const gv = (apMax / 4) * i, y = sy(gv);
    gridSvg += `<line x1="${padL}" y1="${y}" x2="${padL + W}" y2="${y}" stroke="var(--border)" stroke-dasharray="3,3"/>
                <text x="${padL - 6}" y="${y + 4}" text-anchor="end" fill="var(--muted)" font-size="10">${gv.toFixed(1)}</text>`;
  }
  for (let i = 0; i <= 5; i++) {
    const fv = (fMax / 5) * i, x = sx(fv);
    gridSvg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + H}" stroke="var(--border)" stroke-dasharray="3,3"/>
                <text x="${x}" y="${padT + H + 15}" text-anchor="middle" fill="var(--muted)" font-size="10">${fv.toFixed(2)}</text>`;
  }

  const pts = poly.map((pt) => `${sx(pt[0]).toFixed(1)},${sy(pt[1]).toFixed(1)}`).join(" ");
  const cx = sx(Math.min(fCur, fMax)), cy = sy(Math.min(apCur, apMax));
  const inZ = c.physics.in_chipbreaker_zone;
  const dotColor = inZ ? "#22c55e" : "#ef4444";

  statusEl.innerHTML = inZ
    ? `<span style="color:var(--green);font-weight:700;">● В зоне стружкодробления</span>`
    : `<span style="color:var(--red);font-weight:700;">● Вне зоны стружколома</span>`;

  svg.innerHTML = `
    ${gridSvg}
    <line x1="${padL}" y1="${padT + H}" x2="${padL + W}" y2="${padT + H}" stroke="var(--border-strong)"/>
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + H}" stroke="var(--border-strong)"/>
    <polygon points="${pts}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <line x1="${cx}" y1="${padT + H}" x2="${cx}" y2="${cy}" stroke="${dotColor}" stroke-dasharray="2,2" opacity="0.7"/>
    <line x1="${padL}" y1="${cy}" x2="${cx}" y2="${cy}" stroke="${dotColor}" stroke-dasharray="2,2" opacity="0.7"/>
    <circle cx="${cx}" cy="${cy}" r="6.5" fill="${dotColor}" stroke="#fff" stroke-width="2"/>
    <text x="${padL + W / 2}" y="241" text-anchor="middle" fill="var(--muted)" font-size="10">Подача f (мм)</text>
    <text x="12" y="${padT + H / 2}" text-anchor="middle" fill="var(--muted)" font-size="10" transform="rotate(-90 12 ${padT + H / 2})">Глубина ap (мм)</text>
  `;
}

// ============================================================================
// Tab 2: 3D Studio & STEP/IGES/STL Viewer
// ============================================================================
async function ensureViewer3D() {
  if (viewer3d) return viewer3d;
  if (typeof SKMViewer3D !== "function") return null;
  viewer3d = new SKMViewer3D({
    mountId: "viewer3dMount",
    infoId: "viewer3dInfo",
    statusId: "viewer3dStatus",
  });
  await viewer3d.init();
  setup3dDragDrop();
  return viewer3d;
}

function update3dSpecPanel(parsed) {
  const el = document.getElementById("spec3dList");
  if (!el || !parsed || !parsed.valid) return;
  el.innerHTML = `
    <div class="spec-row"><span>Код ISO 1832</span><b>${parsed.normalized_code}</b></div>
    <div class="spec-row"><span>Форма</span><b>${parsed.shape_name} (${parsed.shape_code})</b></div>
    <div class="spec-row"><span>Впис. окружность IC</span><b>${parsed.ic_mm} мм</b></div>
    <div class="spec-row"><span>Толщина S</span><b>${parsed.thickness_mm} мм</b></div>
    <div class="spec-row"><span>Радиус вершины RE</span><b>${parsed.corner_radius_mm} мм</b></div>
    <div class="spec-row"><span>Задний угол α</span><b>${parsed.clearance_angle_deg}°</b></div>
    <div class="spec-row"><span>Режущих кромок</span><b>${parsed.cutting_edges_count}</b></div>
    <div class="spec-row"><span>Ключ гнезда</span><b>${parsed.seat_pocket_signature}</b></div>
  `;
}

function sync3dWithSelectedCandidate(forceCode, forceParsed) {
  if (!viewer3d || viewer3d.isCadFileLoaded) return;
  const c = state.candidates.find((x) => x.insert_id === state.selectedId);
  const code = forceCode || document.getElementById("isoInput").value || (c ? c.iso_code : "CNMG 120408");
  const parsed = forceParsed || parseIsoClient(code);
  update3dSpecPanel(parsed);
  const coating = state.viewerCoatingOverride || {
    method: c ? c.coating_method : "CVD",
    comp: c ? c.coating_composition : "TiCN-Al2O3-TiN",
  };
  viewer3d.loadIso1832(code, parsed, coating.method, coating.comp, state.apiLive, state.apiBase);
}

function set3dCoating(method, comp, btn) {
  state.viewerCoatingOverride = { method, comp };
  document.querySelectorAll(".swatch-btn").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  if (viewer3d && !viewer3d.isCadFileLoaded) sync3dWithSelectedCandidate();
}

function toggle3dWireframe() {
  if (!viewer3d) return;
  document.getElementById("btnWire3d").classList.toggle("active", viewer3d.toggleWireframe());
}
function toggle3dAxes() {
  if (!viewer3d) return;
  document.getElementById("btnAxes3d").classList.toggle("active", viewer3d.toggleAxes());
}
function download3dSTL() {
  if (!viewer3d) return;
  viewer3d.downloadCurrentSTL(document.getElementById("isoInput").value || "insert", state.apiLive, state.apiBase);
}
function reset3dToIso() {
  if (!viewer3d) return;
  viewer3d.isCadFileLoaded = false;
  document.getElementById("btnResetIso3d").style.display = "none";
  document.getElementById("viewer3dError").style.display = "none";
  sync3dWithSelectedCandidate();
}

async function handleCadFile(file) {
  await ensureViewer3D();
  if (!viewer3d || !file) return;
  const errBox = document.getElementById("viewer3dError");
  errBox.style.display = "none";
  try {
    await viewer3d.loadCadFile(file);
    document.getElementById("btnResetIso3d").style.display = "inline-block";
    showToast(`3D-модель ${file.name} загружена`);
  } catch (err) {
    errBox.textContent = `Ошибка загрузки CAD-файла: ${err.message || err}`;
    errBox.style.display = "block";
    document.getElementById("viewer3dStatus").textContent = "Ошибка CAD";
  }
}

function handleCadFileSelect(evt) {
  const file = evt.target.files && evt.target.files[0];
  if (file) handleCadFile(file);
  evt.target.value = "";
}

function setup3dDragDrop() {
  const stage = document.getElementById("viewer3dStage");
  if (!stage) return;
  ["dragenter", "dragover"].forEach((ev) => {
    stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add("dragover"); });
  });
  ["dragleave", "drop"].forEach((ev) => {
    stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.remove("dragover"); });
  });
  stage.addEventListener("drop", (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleCadFile(file);
  });
}

// ============================================================================
// Tab 3: Side-by-Side Comparison (up to 3 inserts)
// ============================================================================
function updateBadges() {
  document.getElementById("compareBadge").textContent = state.compareIds.length;
  document.getElementById("setupsBadge").textContent = state.savedAssemblies.length;
}

function toggleCompare(id) {
  const idx = state.compareIds.indexOf(id);
  if (idx >= 0) {
    state.compareIds.splice(idx, 1);
  } else {
    if (state.compareIds.length >= 3) {
      showToast("Максимум 3 пластины в сравнении (удалите одну).");
      return;
    }
    state.compareIds.push(id);
  }
  updateBadges();
  renderCandidates();
  if (state.activeTab === "compare") renderCompareTable();
}

function autoFillCompareTop3() {
  state.compareIds = state.candidates.slice(0, 3).map((c) => c.insert_id);
  updateBadges();
  renderCandidates();
  renderCompareTable();
  showToast(`В сравнение добавлено: ${state.compareIds.length} пластины`);
}

function clearCompare() {
  state.compareIds = [];
  updateBadges();
  renderCandidates();
  renderCompareTable();
}

function renderCompareTable() {
  const wrap = document.getElementById("compareContent");
  const items = state.compareIds
    .map((id) => state.candidates.find((c) => c.insert_id === id))
    .filter(Boolean);

  if (!items.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        Добавьте 2–3 пластины кнопкой <b>«+ Сравнить»</b> на вкладке подбора или нажмите <b>«Заполнить топ-3 автоматически»</b>.
      </div>`;
    return;
  }

  const bestScore = Math.max(...items.map((x) => x.score));
  const bestCost = Math.min(...items.map((x) => x.cost_per_edge));
  const bestMrr = Math.max(...items.map((x) => x.physics.mrr_cm3_min));
  const minPower = Math.min(...items.map((x) => x.physics.power_motor_kw));
  const raVals = items.map((x) => x.physics.ra_um).filter((v) => v != null);
  const bestRa = raVals.length ? Math.min(...raVals) : null;

  const rows = [
    ["Оценка подбора", (c) => `${c.score} / 100`, (c) => c.score === bestScore],
    ["Сплав и покрытие", (c) => `${c.grade_code} (${c.coating_method})`, () => false],
    ["Стружколом / кромка", (c) => `${c.chipbreaker_code} · ${c.edge_prep}`, () => false],
    ["Режущих кромок", (c) => `${c.cutting_edges_count}`, () => false],
    ["Индекс цены / кромка", (c) => `${c.cost_per_edge}`, (c) => c.cost_per_edge === bestCost],
    ["Стартовая скорость Vc", (c) => fmtVc(c.recommended_vc), () => false],
    ["Обороты / Подача Vf", (c) => `${c.physics.rpm_clamped} об/м · ${c.physics.vf_mm_min} мм/м`, () => false],
    ["Съём металла (MRR)", (c) => `${c.physics.mrr_cm3_min} см³/мин`, (c) => c.physics.mrr_cm3_min === bestMrr],
    ["Мощность шпинделя Pc", (c) => `${c.physics.power_motor_kw} кВт`, (c) => c.physics.power_motor_kw === minPower],
    ["Сила резания Fc", (c) => `${c.physics.fc_n} Н`, () => false],
    ["Шероховатость Ra", (c) => (c.physics.ra_um != null ? `${c.physics.ra_um} мкм` : "—"), (c) => bestRa != null && c.physics.ra_um === bestRa],
    ["Зона стружколома", (c) => (c.physics.in_chipbreaker_zone === false ? "⚠ Вне зоны" : "✓ В норме"), () => false],
    ["Совместимый корпус", (c) => (c.holders[0] ? `${c.holders[0].code} (${c.holders[0].category})` : "—"), () => false],
  ];

  wrap.innerHTML = `
    <div class="table-scroll">
      <table class="compare-table">
        <thead>
          <tr>
            <th style="width:210px;">Параметр</th>
            ${items.map((c) => `
              <th>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                  <span style="font-family:var(--mono);font-size:14px;color:var(--text);">${c.iso_code}</span>
                  <button class="v-btn" style="padding:2px 7px;font-size:11px;" onclick="toggleCompare('${c.insert_id}')">✕</button>
                </div>
              </th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map(([label, getter, isBest]) => `
            <tr>
              <td style="color:var(--muted);font-weight:600;">${label}</td>
              ${items.map((c) => `<td class="mono ${isBest(c) ? "best-cell" : ""}">${getter(c)}</td>`).join("")}
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

// ============================================================================
// Tab 4: Saved Tool Assemblies & CAM Exports (JSON / CSV / FreeCAD .fctb)
// ============================================================================
function saveAssemblyFromCandidate(id) {
  const c = state.candidates.find((x) => x.insert_id === id);
  if (!c) return;
  const sg = FALLBACK_DB.subgroups.find((s) => s.code === document.getElementById("subgroupSelect").value);
  const m = allMachines().find((x) => x.id === document.getElementById("machineSelect").value) || allMachines()[0];
  const h = c.holders[0] || { code: "GENERIC-HOLDER", category: state.op };
  const setup = {
    id: `asm-${Date.now()}`,
    created_at: new Date().toLocaleString("ru-RU"),
    name: `${c.iso_code} · ${sg ? sg.code : ""} (${state.op})`,
    operation: state.op,
    material_code: sg ? sg.code : "",
    material_name: sg ? sg.name_ru : "",
    machine_name: m.name,
    iso_code: c.iso_code,
    grade_code: c.grade_code,
    chipbreaker_code: c.chipbreaker_code,
    holder_code: h.code,
    seat_pocket_signature: c.seat_pocket_signature,
    params: {
      vc_m_min: c.recommended_vc,
      rpm: c.physics.rpm_clamped,
      feed_mm: parseFloat(document.getElementById("feedSlider").value),
      vf_mm_min: c.physics.vf_mm_min,
      ap_mm: state.op === "DRILLING" ? 0 : parseFloat(document.getElementById("apSlider").value),
      ae_mm: state.op === "MILLING" ? parseFloat(document.getElementById("aeSlider").value) : null,
      diameter_mm: parseFloat(document.getElementById("diamSlider").value),
      power_kw: c.physics.power_motor_kw,
      torque_nm: c.physics.torque_nm,
      ra_um: c.physics.ra_um,
      ld_ratio: c.physics.ld_ratio,
      coolant: c.recommended_coolant,
    },
  };
  state.savedAssemblies.unshift(setup);
  localStorage.setItem(STORAGE_KEYS.assemblies, JSON.stringify(state.savedAssemblies));
  updateBadges();
  showToast(`Наладка «${c.iso_code}» сохранена`);
  if (state.activeTab === "setups") renderSavedAssemblies();
}

function deleteAssembly(id) {
  state.savedAssemblies = state.savedAssemblies.filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEYS.assemblies, JSON.stringify(state.savedAssemblies));
  updateBadges();
  renderSavedAssemblies();
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSetupsJSON() {
  if (!state.savedAssemblies.length) { showToast("Сначала сохраните хотя бы одну наладку."); return; }
  downloadFile("skm_tool_assemblies.json", JSON.stringify(state.savedAssemblies, null, 2), "application/json");
}

function exportSetupsCSV() {
  if (!state.savedAssemblies.length) { showToast("Сначала сохраните хотя бы одну наладку."); return; }
  const header = ["Название", "Операция", "Материал", "Станок", "Пластина ISO", "Сплав", "Стружколом", "Корпус", "Vc (м/мин)", "RPM", "Подача (мм)", "ap (мм)", "Мощность (кВт)", "Ra (мкм)", "СОЖ"];
  const lines = [header.join(";")];
  for (const a of state.savedAssemblies) {
    const p = a.params;
    lines.push([
      a.name, a.operation, a.material_code, a.machine_name, a.iso_code, a.grade_code,
      a.chipbreaker_code, a.holder_code, p.vc_m_min, p.rpm, p.feed_mm, p.ap_mm,
      p.power_kw, p.ra_um ?? "", p.coolant,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
  }
  downloadFile("skm_tool_assemblies.csv", "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8");
}

function exportFreeCadToolBit(id) {
  const a = state.savedAssemblies.find((x) => x.id === id);
  if (!a) return;
  const parsed = parseIsoClient(a.iso_code);
  const fctb = {
    version: 2,
    name: `${a.holder_code} (${a.iso_code})`,
    shape: a.operation === "DRILLING" ? "drill.fcstd" : "endmill.fcstd",
    parameter: {
      Diameter: `${a.params.diameter_mm} mm`,
      CuttingEdgeHeight: `${parsed.cutting_edge_length_mm || 12} mm`,
      CornerRadius: `${parsed.corner_radius_mm || 0.8} mm`,
      Material: a.grade_code,
    },
    attribute: {
      iso_code: a.iso_code,
      holder_code: a.holder_code,
      seat_pocket_signature: a.seat_pocket_signature,
      vc_m_min: a.params.vc_m_min,
      rpm: a.params.rpm,
      feed_mm: a.params.feed_mm,
    },
  };
  downloadFile(`${a.iso_code.replace(/\s+/g, "_")}.fctb`, JSON.stringify(fctb, null, 2), "application/json");
  showToast("Экспортирован файл FreeCAD .fctb");
}

function renderSavedAssemblies() {
  const grid = document.getElementById("setupsGrid");
  if (!state.savedAssemblies.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Нет сохранённых наладок. Нажмите <b>«★ Сохранить»</b> на любой карточке пластины, чтобы собрать карту наладки и выгрузить её в Excel (CSV), JSON, FreeCAD (.fctb) или PDF.</div>`;
    return;
  }
  grid.innerHTML = state.savedAssemblies
    .map((a) => `
      <div class="setup-card">
        <div class="setup-card-head">
          <div>
            <div class="setup-name">${a.name}</div>
            <div style="font-size:11.5px;color:var(--muted);">${a.machine_name} · ${a.created_at}</div>
          </div>
          <button class="v-btn no-print" style="padding:3px 7px;" onclick="deleteAssembly('${a.id}')">✕</button>
        </div>
        <div class="holder-pill">Корпус: <b>${a.holder_code}</b> · Сплав: <b>${a.grade_code}</b> (${a.chipbreaker_code})</div>
        <div class="setup-meta">
          <span>V<sub>c</sub>: <b>${a.params.vc_m_min} м/мин</b></span>
          <span>Обороты: <b>${a.params.rpm} об/мин</b></span>
          <span>Подача f: <b>${a.params.feed_mm} мм</b></span>
          <span>Глубина a<sub>p</sub>: <b>${a.params.ap_mm} мм</b></span>
          <span>Мощность: <b>${a.params.power_kw} кВт</b></span>
          <span>R<sub>a</sub> / L/D: <b>${a.params.ra_um ?? "—"} / ${a.params.ld_ratio ?? "—"}</b></span>
        </div>
        <div class="cand-actions no-print">
          <button class="mini-btn" onclick="exportFreeCadToolBit('${a.id}')">⬇ FreeCAD .fctb</button>
          <button class="mini-btn" onclick="window.print()">🖨 Карта наладки</button>
        </div>
      </div>`)
    .join("");
}

// ============================================================================
// Bootstrap
// ============================================================================
async function init() {
  // Restore persisted theme, custom machines, saved assemblies
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  setTheme(savedTheme === "light" ? "light" : "dark");

  try { state.customMachines = JSON.parse(localStorage.getItem(STORAGE_KEYS.machines) || "[]"); } catch { state.customMachines = []; }
  try { state.savedAssemblies = JSON.parse(localStorage.getItem(STORAGE_KEYS.assemblies) || "[]"); } catch { state.savedAssemblies = []; }

  renderMachineSelect();
  populateSubgroups();
  applyUrlParams();
  updateSliderLabels();
  updateBadges();

  // Interactive click on chipbreaker chart
  document.getElementById("cbChart").addEventListener("click", (e) => {
    if (state.op === "DRILLING") return;
    const svg = e.currentTarget, rect = svg.getBoundingClientRect();
    const xSvg = ((e.clientX - rect.left) / rect.width) * 420;
    const ySvg = ((e.clientY - rect.top) / rect.height) * 245;
    const padL = 44, padR = 16, padT = 14, padB = 30;
    const W = 420 - padL - padR, H = 245 - padT - padB;
    const f = Math.max(0.05, Math.min(state.chartBounds.fMax, ((xSvg - padL) / W) * state.chartBounds.fMax));
    const ap = Math.max(0.1, Math.min(state.chartBounds.apMax, ((padT + H - ySvg) / H) * state.chartBounds.apMax));
    document.getElementById("feedSlider").value = f.toFixed(2);
    document.getElementById("apSlider").value = ap.toFixed(1);
    onSliderChange();
  });

  // Detect GitHub Pages or local file:// immediately (zero 404 errors in console!)
  const isStaticHost = window.location.protocol === "file:" || window.location.hostname.endsWith("github.io");
  const badge = document.getElementById("connBadge");
  const connText = document.getElementById("connText");

  if (isStaticHost) {
    state.apiLive = false;
    badge.classList.add("demo");
    connText.textContent = "Web Demo · Client Engine";
  } else {
    try {
      const r = await fetch(`${state.apiBase}/api/health`, { signal: AbortSignal.timeout(1200) });
      if (r.ok) {
        state.apiLive = true;
        badge.classList.add("live");
        const metaRes = await fetch(`${state.apiBase}/api/catalog/meta`);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          connText.textContent = meta.storage_mode === "postgres" ? "FastAPI + PostgreSQL" : "FastAPI Live";
          if (meta.machines?.length) {
            FALLBACK_DB.machines = meta.machines;
            renderMachineSelect();
          }
          if (meta.material_subgroups?.length) {
            FALLBACK_DB.subgroups = meta.material_subgroups;
            populateSubgroups();
          }
        } else {
          connText.textContent = "FastAPI Live";
        }
      } else {
        state.apiLive = false;
        badge.classList.add("demo");
        connText.textContent = "Web Demo · Client Engine";
      }
    } catch {
      state.apiLive = false;
      badge.classList.add("demo");
      connText.textContent = "Offline Engine (Client JS)";
    }
  }

  await handleIsoInput();
  await runSelection();
  if (state.activeTab !== "selector") switchTab(state.activeTab);
}

init();
