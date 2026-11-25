/**
 * SKM — ISO Tooling Selector Studio Frontend Controller (v1.1)
 * 100% standalone on GitHub Pages & offline PWA, plus live FastAPI + PostgreSQL sync.
 */

const FALLBACK_DB = {"subgroups": [{"code": "P1", "iso_group": "P", "name_ru": "Нелегированные стали (Ст20, Ст45, S355)", "kc1_1_mpa": 1500.0, "mc_exponent": 0.25, "hb": "125–190 HB"}, {"code": "P2", "iso_group": "P", "name_ru": "Низколегированные стали (40Х, 30ХГСА, 42CrMo4)", "kc1_1_mpa": 1700.0, "mc_exponent": 0.25, "hb": "180–275 HB"}, {"code": "P3", "iso_group": "P", "name_ru": "Высоколегированные и инструм. стали (Х12МФ, H13)", "kc1_1_mpa": 1950.0, "mc_exponent": 0.25, "hb": "250–330 HB"}, {"code": "M1", "iso_group": "M", "name_ru": "Аустенитные нерж. (12Х18Н10Т, AISI 304/316L)", "kc1_1_mpa": 1800.0, "mc_exponent": 0.21, "hb": "150–220 HB"}, {"code": "M2", "iso_group": "M", "name_ru": "Дуплексные нерж. (SAF 2205, 08Х22Н6Т)", "kc1_1_mpa": 2000.0, "mc_exponent": 0.21, "hb": "220–290 HB"}, {"code": "K1", "iso_group": "K", "name_ru": "Серый чугун (СЧ20, СЧ25, GG25)", "kc1_1_mpa": 1150.0, "mc_exponent": 0.28, "hb": "160–240 HB"}, {"code": "K2", "iso_group": "K", "name_ru": "Высокопрочный чугун ВЧ (ВЧ50, GGG50)", "kc1_1_mpa": 1350.0, "mc_exponent": 0.28, "hb": "180–270 HB"}, {"code": "N1", "iso_group": "N", "name_ru": "Алюминиевые сплавы (Д16Т, АМг6, 6061-T6)", "kc1_1_mpa": 450.0, "mc_exponent": 0.25, "hb": "60–120 HB"}, {"code": "N2", "iso_group": "N", "name_ru": "Медь и латунь (ЛС59-1, БрАЖ9-4)", "kc1_1_mpa": 750.0, "mc_exponent": 0.24, "hb": "70–140 HB"}, {"code": "S1", "iso_group": "S", "name_ru": "Никелевые суперсплавы (Inconel 718, ХН77ТЮР)", "kc1_1_mpa": 2600.0, "mc_exponent": 0.24, "hb": "260–380 HB"}, {"code": "S2", "iso_group": "S", "name_ru": "Титановые сплавы (ВТ6, Ti-6Al-4V)", "kc1_1_mpa": 1450.0, "mc_exponent": 0.23, "hb": "280–350 HB"}, {"code": "H1", "iso_group": "H", "name_ru": "Закалённые стали 48–58 HRC (Х12МФ, ШХ15, D2)", "kc1_1_mpa": 3200.0, "mc_exponent": 0.3, "hb": "48–58 HRC"}], "machines": [{"id": "m1", "name": "Токарно-фрезерный центр (BMT55)", "machine_type": "TURN_MILL", "max_rpm": 4500, "spindle_power_kw": 18.5, "max_torque_nm": 320.0, "coolant_pressure_bar": 20.0, "max_thrust_kn": 28.0, "rigidity_class": "HIGH"}, {"id": "m2", "name": "Вертикальный фрезерный ОЦ (BT40)", "machine_type": "MILL_3AX", "max_rpm": 12000, "spindle_power_kw": 15.0, "max_torque_nm": 95.0, "coolant_pressure_bar": 25.0, "max_thrust_kn": 20.0, "rigidity_class": "MEDIUM"}, {"id": "m3", "name": "Универсальный токарный ЧПУ (лёгкий)", "machine_type": "LATHE", "max_rpm": 3000, "spindle_power_kw": 7.5, "max_torque_nm": 160.0, "coolant_pressure_bar": 10.0, "max_thrust_kn": 12.0, "rigidity_class": "LOW"}], "stock": [{"iso_code": "CNMG 120408", "grade_code": "GEN-P25-CVD", "qty": 40, "unit_price_rub": 620.0, "bin_location": "A-01-2", "supplier": "Склад-Основной"}, {"iso_code": "WNMG 080408", "grade_code": "GEN-P25-CVD", "qty": 60, "unit_price_rub": 690.0, "bin_location": "A-01-4", "supplier": "Склад-Основной"}, {"iso_code": "WNMG 080412", "grade_code": "GEN-P35-TOUGH", "qty": 20, "unit_price_rub": 740.0, "bin_location": "A-01-5", "supplier": "Склад-Основной"}, {"iso_code": "CNMG 120404", "grade_code": "GEN-M25-PVD", "qty": 30, "unit_price_rub": 710.0, "bin_location": "A-02-1", "supplier": "Склад-Основной"}, {"iso_code": "DNMG 150608", "grade_code": "GEN-P25-CVD", "qty": 25, "unit_price_rub": 820.0, "bin_location": "A-02-3", "supplier": "Склад-Основной"}, {"iso_code": "TNMG 160408", "grade_code": "GEN-P25-CVD", "qty": 50, "unit_price_rub": 540.0, "bin_location": "A-02-6", "supplier": "Склад-Основной"}, {"iso_code": "CCMT 09T304", "grade_code": "GEN-M25-PVD", "qty": 18, "unit_price_rub": 580.0, "bin_location": "B-01-1", "supplier": "Склад-Основной"}, {"iso_code": "CCGT 09T304-AL", "grade_code": "GEN-N10-UNC", "qty": 12, "unit_price_rub": 640.0, "bin_location": "B-01-2", "supplier": "Склад-Основной"}, {"iso_code": "APKT 160408", "grade_code": "GEN-PM30-MILL", "qty": 35, "unit_price_rub": 790.0, "bin_location": "C-01-1", "supplier": "Склад-Фрезы"}, {"iso_code": "SEKT 120408", "grade_code": "GEN-PM30-MILL", "qty": 24, "unit_price_rub": 850.0, "bin_location": "C-01-3", "supplier": "Склад-Фрезы"}, {"iso_code": "WCMX 050308", "grade_code": "GEN-DRL-CORE", "qty": 16, "unit_price_rub": 720.0, "bin_location": "D-01-1", "supplier": "Склад-Осевой"}, {"iso_code": "SPMG 090408", "grade_code": "GEN-DRL-UNIV", "qty": 22, "unit_price_rub": 840.0, "bin_location": "D-01-3", "supplier": "Склад-Осевой"}, {"iso_code": "MGMN 300", "grade_code": "GEN-M25-PVD", "qty": 30, "unit_price_rub": 610.0, "bin_location": "E-01-1", "supplier": "Склад-Канавки"}, {"iso_code": "16ER AG60", "grade_code": "GEN-M25-PVD", "qty": 15, "unit_price_rub": 760.0, "bin_location": "E-01-2", "supplier": "Склад-Резьба"}, {"iso_code": "SOMT 11T308", "grade_code": "GEN-DRL-UNIV", "qty": 20, "unit_price_rub": 920.0, "bin_location": "D-01-4", "supplier": "Склад-Осевой"}, {"iso_code": "WCMT 06T308", "grade_code": "GEN-DRL-CORE", "qty": 18, "unit_price_rub": 860.0, "bin_location": "D-01-5", "supplier": "Склад-Осевой"}, {"iso_code": "MOD-DRL-140", "grade_code": "GEN-DRL-UNIV", "qty": 6, "unit_price_rub": 2450.0, "bin_location": "D-02-1", "supplier": "Склад-Осевой"}, {"iso_code": "MOD-DRL-200", "grade_code": "GEN-DRL-UNIV", "qty": 4, "unit_price_rub": 3180.0, "bin_location": "D-02-2", "supplier": "Склад-Осевой"}, {"iso_code": "SC-DRL-080-5D", "grade_code": "GEN-PM30-MILL", "qty": 8, "unit_price_rub": 2750.0, "bin_location": "D-03-1", "supplier": "Склад-Осевой"}, {"iso_code": "SC-DRL-120-8D", "grade_code": "GEN-DRL-UNIV", "qty": 5, "unit_price_rub": 4150.0, "bin_location": "D-03-2", "supplier": "Склад-Осевой"}], "inserts": [{"insert_id": "ins-1", "iso_code": "CNMG 120408", "operation_domain": "TURNING", "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN", "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 6, "wear": 8, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.0, "seat_pocket_signature": "C-N-1270-476-G", "suitability": {"P": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.2, 4.0], [0.15, 2.2]], "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.3, "ap": 2.5, "coolant": "FLOOD"}, "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"}, "P3": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.24, "ap": 2.0, "coolant": "FLOOD"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-2", "iso_code": "CNMG 120404", "operation_domain": "TURNING", "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 8, "wear": 6, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 1.15, "seat_pocket_signature": "C-N-1270-476-G", "suitability": {"M": "PRIMARY", "S": "PRIMARY", "P": "SECONDARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"M1": {"vc": 165.0, "vc_min": 120.0, "vc_max": 210.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"}, "M2": {"vc": 125.0, "vc_min": 90.0, "vc_max": 160.0, "feed": 0.14, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 55.0, "vc_min": 40.0, "vc_max": 75.0, "feed": 0.12, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"}, "P1": {"vc": 230.0, "vc_min": 180.0, "vc_max": 280.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-3", "iso_code": "CCMT 09T304", "operation_domain": "TURNING", "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 8, "wear": 6, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 0.9, "seat_pocket_signature": "C-C-953-397-T", "suitability": {"M": "PRIMARY", "S": "PRIMARY", "P": "SECONDARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "S20R-SCLCR 09", "category": "BORING_BAR", "lead_angle_deg": 95.0, "clamping": "SCREW"}], "recs": {"M1": {"vc": 155.0, "vc_min": 110.0, "vc_max": 195.0, "feed": 0.14, "ap": 0.8, "coolant": "FLOOD"}, "P1": {"vc": 220.0, "vc_min": 160.0, "vc_max": 270.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"}, "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 68.0, "feed": 0.1, "ap": 0.6, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-7", "iso_code": "WNMG 080408", "operation_domain": "TURNING", "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN", "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 6, "wear": 8, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.05, "seat_pocket_signature": "W-N-1270-476-G", "suitability": {"P": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.2, 4.0], [0.15, 2.2]], "holders": [{"code": "PWLNR 2525M 08", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.3, "ap": 2.5, "coolant": "FLOOD"}, "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"}, "P3": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.24, "ap": 2.0, "coolant": "FLOOD"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-8", "iso_code": "WNMG 080412", "operation_domain": "TURNING", "grade_code": "GEN-P35-TOUGH", "coating_method": "CVD", "coating_composition": "MT-TiCN-Al2O3", "chipbreaker_code": "GEN-PR", "application_class": "ROUGHING", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 6, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 1.2, "relative_cost": 1.12, "seat_pocket_signature": "W-N-1270-476-G", "suitability": {"P": "PRIMARY", "M": "SECONDARY"}, "operating_zone_polygon": [[0.25, 1.8], [0.35, 1.5], [0.65, 2.0], [0.58, 6.5], [0.3, 6.0], [0.25, 3.5]], "holders": [{"code": "PWLNR 2525M 08", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 245.0, "vc_min": 180.0, "vc_max": 310.0, "feed": 0.42, "ap": 3.8, "coolant": "FLOOD"}, "P2": {"vc": 205.0, "vc_min": 150.0, "vc_max": 260.0, "feed": 0.38, "ap": 3.5, "coolant": "FLOOD"}, "M1": {"vc": 145.0, "vc_min": 110.0, "vc_max": 180.0, "feed": 0.32, "ap": 3.0, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-9", "iso_code": "DNMG 150608", "operation_domain": "TURNING", "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN", "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 6, "wear": 8, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.25, "seat_pocket_signature": "D-N-1270-635-G", "suitability": {"P": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.2, 4.0], [0.15, 2.2]], "holders": [{"code": "PDJNR 2525M 15", "category": "TURNING_EXTERNAL", "lead_angle_deg": 93.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.3, "ap": 2.5, "coolant": "FLOOD"}, "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-10", "iso_code": "VNMG 160404", "operation_domain": "TURNING", "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 7, "wear": 8, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 1.35, "seat_pocket_signature": "V-N-953-476-G", "suitability": {"S": "PRIMARY", "M": "PRIMARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "MVJNR 2525M 16", "category": "TURNING_EXTERNAL", "lead_angle_deg": 93.0, "clamping": "TOP_CLAMP"}], "recs": {"S1": {"vc": 40.0, "vc_min": 25.0, "vc_max": 55.0, "feed": 0.12, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.14, "ap": 1.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 175.0, "vc_min": 130.0, "vc_max": 220.0, "feed": 0.15, "ap": 1.0, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-11", "iso_code": "SNMG 120412", "operation_domain": "TURNING", "grade_code": "GEN-K15-CVD", "coating_method": "CVD", "coating_composition": "Thick Al2O3-TiCN", "chipbreaker_code": "GEN-KR", "application_class": "ROUGHING", "edge_prep": "CHAMFERED", "toughness": 5, "wear": 9, "cutting_edges_count": 8, "has_wiper_geometry": false, "corner_radius_mm": 1.2, "relative_cost": 1.1, "seat_pocket_signature": "S-N-1270-476-G", "suitability": {"K": "PRIMARY", "P": "SECONDARY"}, "operating_zone_polygon": [[0.2, 1.0], [0.6, 1.2], [0.55, 6.0], [0.2, 5.5]], "holders": [{"code": "PSBNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 75.0, "clamping": "LEVER"}], "recs": {"K1": {"vc": 340.0, "vc_min": 260.0, "vc_max": 420.0, "feed": 0.35, "ap": 3.0, "coolant": "DRY"}, "K2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.32, "ap": 2.8, "coolant": "FLOOD"}, "P1": {"vc": 270.0, "vc_min": 210.0, "vc_max": 330.0, "feed": 0.34, "ap": 3.0, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-12", "iso_code": "DCMT 11T304", "operation_domain": "TURNING", "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 7, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 0.95, "seat_pocket_signature": "D-C-953-397-T", "suitability": {"N": "PRIMARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "S16Q-SDUCR 11", "category": "BORING_BAR", "lead_angle_deg": 93.0, "clamping": "SCREW"}], "recs": {"N1": {"vc": 700.0, "vc_min": 450.0, "vc_max": 1000.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"}, "N2": {"vc": 320.0, "vc_min": 220.0, "vc_max": 450.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-13", "iso_code": "CNGA 120408", "operation_domain": "TURNING", "grade_code": "GEN-H10-CBN", "coating_method": "PVD", "coating_composition": "TiAlN-CBN", "chipbreaker_code": "GEN-HCBN", "application_class": "FINISHING", "edge_prep": "CHAMFERED", "toughness": 3, "wear": 10, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 4.8, "seat_pocket_signature": "C-N-1270-476-A", "suitability": {"H": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.05, 0.1], [0.12, 0.08], [0.18, 0.15], [0.16, 0.8], [0.06, 0.65]], "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"H1": {"vc": 155.0, "vc_min": 110.0, "vc_max": 200.0, "feed": 0.1, "ap": 0.25, "coolant": "DRY"}, "K1": {"vc": 480.0, "vc_min": 350.0, "vc_max": 620.0, "feed": 0.14, "ap": 0.4, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-4", "iso_code": "APKT 160408", "operation_domain": "MILLING", "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN", "chipbreaker_code": "GEN-GM", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": true, "corner_radius_mm": 0.8, "relative_cost": 1.2, "seat_pocket_signature": "A-P-953-476-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.08, 0.5], [0.22, 0.8], [0.18, 10.0], [0.08, 8.0]], "holders": [{"code": "SHM-AP16-D50-Z5", "category": "SHOULDER_MILL", "lead_angle_deg": 90.0, "dc_mm": 50.0, "z": 5, "clamping": "SCREW"}], "recs": {"P1": {"vc": 210.0, "vc_min": 160.0, "vc_max": 260.0, "feed": 0.15, "ap": 3.5, "ae_ratio": 0.5, "coolant": "AIR_BLAST"}, "P2": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.14, "ap": 3.0, "ae_ratio": 0.5, "coolant": "AIR_BLAST"}, "M1": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.12, "ap": 2.5, "ae_ratio": 0.4, "coolant": "FLOOD"}, "K1": {"vc": 220.0, "vc_min": 170.0, "vc_max": 270.0, "feed": 0.16, "ap": 4.0, "ae_ratio": 0.6, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-5", "iso_code": "APKT 160408-AL", "operation_domain": "MILLING", "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron", "chipbreaker_code": "GEN-AL", "application_class": "ALUMINUM_SHARP", "edge_prep": "SHARP", "toughness": 7, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": true, "corner_radius_mm": 0.8, "relative_cost": 1.25, "seat_pocket_signature": "A-P-953-476-T", "suitability": {"N": "PRIMARY"}, "operating_zone_polygon": [[0.05, 0.5], [0.25, 1.0], [0.2, 12.0], [0.05, 10.0]], "holders": [{"code": "SHM-AP16-D50-Z5", "category": "SHOULDER_MILL", "lead_angle_deg": 90.0, "dc_mm": 50.0, "z": 5, "clamping": "SCREW"}], "recs": {"N1": {"vc": 650.0, "vc_min": 400.0, "vc_max": 900.0, "feed": 0.15, "ap": 4.0, "ae_ratio": 0.6, "coolant": "FLOOD"}, "N2": {"vc": 320.0, "vc_min": 220.0, "vc_max": 420.0, "feed": 0.14, "ap": 3.0, "ae_ratio": 0.55, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-14", "iso_code": "SEKT 120408", "operation_domain": "MILLING", "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN", "chipbreaker_code": "GEN-FM45", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 4, "has_wiper_geometry": true, "corner_radius_mm": 0.8, "relative_cost": 1.3, "seat_pocket_signature": "S-E-1270-476-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.1, 0.5], [0.3, 0.8], [0.26, 5.5], [0.1, 5.0]], "holders": [{"code": "FM45-SE12-D80-Z6", "category": "FACE_MILL", "lead_angle_deg": 45.0, "dc_mm": 80.0, "z": 6, "clamping": "SCREW"}], "recs": {"P1": {"vc": 235.0, "vc_min": 180.0, "vc_max": 290.0, "feed": 0.22, "ap": 3.0, "ae_ratio": 0.65, "coolant": "AIR_BLAST"}, "P2": {"vc": 200.0, "vc_min": 155.0, "vc_max": 250.0, "feed": 0.19, "ap": 2.8, "ae_ratio": 0.65, "coolant": "AIR_BLAST"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.24, "ap": 3.5, "ae_ratio": 0.7, "coolant": "DRY"}, "M1": {"vc": 145.0, "vc_min": 110.0, "vc_max": 180.0, "feed": 0.16, "ap": 2.5, "ae_ratio": 0.55, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-15", "iso_code": "RDMT 120400", "operation_domain": "MILLING", "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano", "chipbreaker_code": "GEN-RND", "application_class": "ROUGHING", "edge_prep": "HONED", "toughness": 7, "wear": 8, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 6.0, "relative_cost": 1.4, "seat_pocket_signature": "R-D-1200-476-T", "suitability": {"S": "PRIMARY", "M": "PRIMARY"}, "operating_zone_polygon": [[0.12, 0.5], [0.35, 0.8], [0.3, 5.0], [0.12, 4.5]], "holders": [{"code": "CM-RD12-D50-Z4", "category": "COPY_MILL", "lead_angle_deg": 45.0, "dc_mm": 50.0, "z": 4, "clamping": "SCREW"}], "recs": {"S1": {"vc": 38.0, "vc_min": 25.0, "vc_max": 52.0, "feed": 0.2, "ap": 1.5, "ae_ratio": 0.35, "coolant": "FLOOD"}, "S2": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.22, "ap": 2.0, "ae_ratio": 0.4, "coolant": "FLOOD"}, "M1": {"vc": 150.0, "vc_min": 110.0, "vc_max": 190.0, "feed": 0.24, "ap": 2.5, "ae_ratio": 0.5, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-6", "iso_code": "WCMX 050308", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-CORE", "coating_method": "PVD", "coating_composition": "TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 9, "wear": 5, "cutting_edges_count": 3, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.1, "seat_pocket_signature": "W-C-794-318-X", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-WCMX05-D26-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 26.0, "z": 1, "ld_ratio_max": 3.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 160.0, "vc_min": 120.0, "vc_max": 200.0, "feed": 0.11, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 110.0, "vc_min": 80.0, "vc_max": 140.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 3.0, "tolerance_hole": "IT11"}, {"insert_id": "ins-16", "iso_code": "SPMG 07T308", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.15, "seat_pocket_signature": "S-P-794-397-G", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-SPMG07-D22-4D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 22.0, "z": 1, "ld_ratio_max": 4.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 155.0, "vc_min": 115.0, "vc_max": 195.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 200.0, "vc_min": 150.0, "vc_max": 250.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 65.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 4.0, "tolerance_hole": "IT11"}, {"insert_id": "ins-17", "iso_code": "SPMG 090408", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.3, "seat_pocket_signature": "S-P-953-476-G", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-SPMG09-D32-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 32.0, "z": 1, "ld_ratio_max": 3.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 155.0, "vc_min": 115.0, "vc_max": 195.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 200.0, "vc_min": 150.0, "vc_max": 250.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 65.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 3.0, "tolerance_hole": "IT11"}, {"insert_id": "ins-18", "iso_code": "TNMG 160408", "operation_domain": "TURNING", "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN", "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 6, "wear": 8, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 0.88, "seat_pocket_signature": "T-N-953-476-G", "suitability": {"P": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.2, 4.0], [0.15, 2.2]], "holders": [{"code": "PTJNR 2525M 16", "category": "TURNING_EXTERNAL", "lead_angle_deg": 93.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.3, "ap": 2.5, "coolant": "FLOOD"}, "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"}, "P3": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.24, "ap": 2.0, "coolant": "FLOOD"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-19", "iso_code": "CCGT 09T304-AL", "operation_domain": "TURNING", "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 7, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 1.02, "seat_pocket_signature": "C-C-953-397-T", "suitability": {"N": "PRIMARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "S20R-SCLCR 09", "category": "BORING_BAR", "lead_angle_deg": 95.0, "clamping": "SCREW"}], "recs": {"N1": {"vc": 700.0, "vc_min": 450.0, "vc_max": 1000.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"}, "N2": {"vc": 320.0, "vc_min": 220.0, "vc_max": 450.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-20", "iso_code": "MGMN 300", "operation_domain": "GROOVING_THREADING", "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN", "chipbreaker_code": "GEN-GRV", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 6, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.2, "relative_cost": 0.98, "seat_pocket_signature": "L-N-300-476-N", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "S": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.05, 1.5], [0.22, 2.0], [0.2, 4.0], [0.05, 3.8]], "holders": [{"code": "MGEHR 2525-3", "category": "GROOVING_HOLDER", "lead_angle_deg": 90.0, "clamping": "TOP_CLAMP"}], "recs": {"P1": {"vc": 150.0, "vc_min": 110.0, "vc_max": 190.0, "feed": 0.1, "ap": 3.0, "coolant": "FLOOD"}, "P2": {"vc": 125.0, "vc_min": 90.0, "vc_max": 160.0, "feed": 0.09, "ap": 3.0, "coolant": "FLOOD"}, "M1": {"vc": 115.0, "vc_min": 80.0, "vc_max": 145.0, "feed": 0.08, "ap": 3.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 45.0, "vc_min": 30.0, "vc_max": 60.0, "feed": 0.07, "ap": 3.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-21", "iso_code": "16ER AG60", "operation_domain": "GROOVING_THREADING", "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN", "chipbreaker_code": "GEN-GRV", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 6, "cutting_edges_count": 3, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 1.22, "seat_pocket_signature": "T-N-953-397-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "S": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.05, 0.5], [0.25, 0.8], [0.22, 3.0], [0.05, 2.8]], "holders": [{"code": "SER 2525M 16", "category": "GROOVING_HOLDER", "lead_angle_deg": 90.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 145.0, "vc_min": 100.0, "vc_max": 180.0, "feed": 0.12, "ap": 1.5, "coolant": "FLOOD"}, "P2": {"vc": 120.0, "vc_min": 85.0, "vc_max": 155.0, "feed": 0.1, "ap": 1.5, "coolant": "FLOOD"}, "M1": {"vc": 105.0, "vc_min": 75.0, "vc_max": 135.0, "feed": 0.1, "ap": 1.5, "coolant": "FLOOD"}, "S2": {"vc": 40.0, "vc_min": 28.0, "vc_max": 55.0, "feed": 0.08, "ap": 1.2, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-22", "iso_code": "SOMT 11T308", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.45, "seat_pocket_signature": "S-O-1100-397-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-SOMT11-D40-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 40.0, "z": 1, "ld_ratio_max": 3.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 155.0, "vc_min": 115.0, "vc_max": 195.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 200.0, "vc_min": 150.0, "vc_max": 250.0, "feed": 0.16, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 48.0, "vc_min": 35.0, "vc_max": 62.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 3.0, "tolerance_hole": "IT11"}, {"insert_id": "ins-23", "iso_code": "WCMT 06T308", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-CORE", "coating_method": "PVD", "coating_composition": "TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 9, "wear": 6, "cutting_edges_count": 3, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.35, "seat_pocket_signature": "W-C-953-397-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY", "N": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-WCMT06-D30-5D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 30.0, "z": 1, "ld_ratio_max": 5.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 165.0, "vc_min": 120.0, "vc_max": 205.0, "feed": 0.11, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 110.0, "vc_min": 80.0, "vc_max": 140.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 180.0, "vc_min": 135.0, "vc_max": 220.0, "feed": 0.13, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "N1": {"vc": 320.0, "vc_min": 220.0, "vc_max": 420.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT11"}, {"insert_id": "ins-24", "iso_code": "MOD-DRL-140", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL-MOD", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 8, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.2, "relative_cost": 3.8, "seat_pocket_signature": "DRL-M-1400-672-B", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "MOD-BODY-D14-5D", "category": "MODULAR_DRILL", "lead_angle_deg": 70.0, "dc_mm": 14.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "BAYONET"}], "recs": {"P1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.24, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 100.0, "vc_min": 75.0, "vc_max": 130.0, "feed": 0.22, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 70.0, "vc_min": 50.0, "vc_max": 90.0, "feed": 0.18, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.3, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 38.0, "vc_min": 25.0, "vc_max": 50.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "MODULAR_TIP", "point_angle_deg": 140.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT9"}, {"insert_id": "ins-25", "iso_code": "MOD-DRL-200", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL-MOD", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 8, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.2, "relative_cost": 4.9, "seat_pocket_signature": "DRL-M-2000-960-B", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "MOD-BODY-D20-8D", "category": "MODULAR_DRILL", "lead_angle_deg": 70.0, "dc_mm": 20.0, "z": 2, "ld_ratio_max": 8.0, "clamping": "BAYONET"}], "recs": {"P1": {"vc": 115.0, "vc_min": 85.0, "vc_max": 145.0, "feed": 0.26, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 95.0, "vc_min": 70.0, "vc_max": 125.0, "feed": 0.24, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.19, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 130.0, "vc_min": 95.0, "vc_max": 165.0, "feed": 0.32, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 36.0, "vc_min": 25.0, "vc_max": 48.0, "feed": 0.15, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "MODULAR_TIP", "point_angle_deg": 140.0, "ld_ratio_max": 8.0, "tolerance_hole": "IT9"}, {"insert_id": "ins-26", "iso_code": "SC-DRL-080-5D", "operation_domain": "DRILLING", "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN", "chipbreaker_code": "GEN-DRL-SC", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 8, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 4.2, "seat_pocket_signature": "DRL-S-800-500-I", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "HYD-CHUCK-D08-5D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 70.0, "dc_mm": 8.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "INTEGRAL"}], "recs": {"P1": {"vc": 115.0, "vc_min": 85.0, "vc_max": 145.0, "feed": 0.2, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 95.0, "vc_min": 70.0, "vc_max": 120.0, "feed": 0.18, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.15, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 130.0, "vc_min": 95.0, "vc_max": 165.0, "feed": 0.24, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 38.0, "vc_min": 25.0, "vc_max": 50.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 140.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT8"}, {"insert_id": "ins-27", "iso_code": "SC-DRL-120-8D", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL-SC", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 8, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 6.4, "seat_pocket_signature": "DRL-S-1200-800-I", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "HYD-CHUCK-D12-8D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 70.0, "dc_mm": 12.0, "z": 2, "ld_ratio_max": 8.0, "clamping": "INTEGRAL"}], "recs": {"P1": {"vc": 105.0, "vc_min": 80.0, "vc_max": 130.0, "feed": 0.22, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 88.0, "vc_min": 65.0, "vc_max": 110.0, "feed": 0.19, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 60.0, "vc_min": 45.0, "vc_max": 80.0, "feed": 0.16, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.25, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 34.0, "vc_min": 24.0, "vc_max": 45.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 140.0, "ld_ratio_max": 8.0, "tolerance_hole": "IT8"}, {"insert_id": "ins-28", "iso_code": "SC-DRL-100-AL", "operation_domain": "DRILLING", "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron", "chipbreaker_code": "GEN-DRL-AL", "application_class": "ALUMINUM_SHARP", "edge_prep": "SHARP", "toughness": 7, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 4.6, "seat_pocket_signature": "DRL-S-1000-500-I", "suitability": {"N": "PRIMARY"}, "operating_zone_polygon": [], "holders": [{"code": "HYD-CHUCK-D10-5D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 65.0, "dc_mm": 10.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "INTEGRAL"}], "recs": {"N1": {"vc": 260.0, "vc_min": 180.0, "vc_max": 360.0, "feed": 0.26, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "N2": {"vc": 160.0, "vc_min": 110.0, "vc_max": 220.0, "feed": 0.2, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 130.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT8"}, {"insert_id": "ins-29", "iso_code": "SC-DRL-060-H", "operation_domain": "DRILLING", "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano", "chipbreaker_code": "GEN-DRL-SC", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 7, "wear": 9, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 4.9, "seat_pocket_signature": "DRL-S-600-500-I", "suitability": {"H": "PRIMARY", "S": "PRIMARY", "M": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "SHRINK-FIT-D06-5D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 70.0, "dc_mm": 6.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "INTEGRAL"}], "recs": {"H1": {"vc": 32.0, "vc_min": 20.0, "vc_max": 45.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S1": {"vc": 22.0, "vc_min": 15.0, "vc_max": 32.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 42.0, "vc_min": 28.0, "vc_max": 58.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 62.0, "vc_min": 45.0, "vc_max": 82.0, "feed": 0.13, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 140.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT8"}], "cross_references": [{"source_insert_id": "ins-1", "target_insert_id": "ins-7", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.92, "notes": "WNMG 080408 даёт 6 кромок вместо 4 при том же угле 80° (державка PWLNR)"}, {"source_insert_id": "ins-7", "target_insert_id": "ins-1", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.92, "notes": "CNMG 120408 обеспечивает большую глубину резания ap при том же угле 80°"}, {"source_insert_id": "ins-1", "target_insert_id": "ins-2", "match_type": "HIGHER_TOUGHNESS", "confidence_score": 0.88, "notes": "Та же державка PCLNR 12; переход на острую PVD-кромку и радиус 0.4"}, {"source_insert_id": "ins-1", "target_insert_id": "ins-13", "match_type": "HIGHER_WEAR_RESISTANCE", "confidence_score": 0.85, "notes": "Та же державка PCLNR 12; переход на CBN для закалённых сталей >48 HRC"}, {"source_insert_id": "ins-7", "target_insert_id": "ins-8", "match_type": "HIGHER_TOUGHNESS", "confidence_score": 0.95, "notes": "То же гнездо PWLNR 08; усиленный черновой стружколом и сплав P35"}, {"source_insert_id": "ins-9", "target_insert_id": "ins-10", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.8, "notes": "Переход с 55° (DNMG) на 35° (VNMG) для сложного профилирования"}, {"source_insert_id": "ins-6", "target_insert_id": "ins-16", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.86, "notes": "SPMG 07T308 даёт 4 кромки вместо 3 у WCMX (корпус UDRL-SPMG07)"}, {"source_insert_id": "ins-1", "target_insert_id": "ins-18", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.84, "notes": "TNMG 160408: 6 кромок и минимальная цена за кромку для нежёстких валов"}, {"source_insert_id": "ins-3", "target_insert_id": "ins-19", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.96, "notes": "Та же оправка S20R-SCLCR 09; полированная шлифованная CCGT для алюминия"}, {"source_insert_id": "ins-17", "target_insert_id": "ins-22", "match_type": "HIGHER_TOUGHNESS", "confidence_score": 0.9, "notes": "SOMT 11T308 для мощных отверстий Ø40 мм с усиленной квадратной кромкой"}, {"source_insert_id": "ins-6", "target_insert_id": "ins-23", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.88, "notes": "WCMT 06T308 позволяет сверлить до 5xD вместо 3xD (корпус UDRL-WCMT06-D30-5D)"}, {"source_insert_id": "ins-24", "target_insert_id": "ins-27", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.86, "notes": "Переход со сменной коронки Ø14 на монолит Ø12 8xD для точности IT8 и глубоких отверстий"}, {"source_insert_id": "ins-25", "target_insert_id": "ins-16", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.82, "notes": "Альтернатива Ø20–22 мм: U-сверло SPMG 07T308 дешевле на кромку при глубине до 4xD"}]};

const STORAGE_KEYS = {
  theme: "skm_theme_v1",
  machines: "skm_custom_machines_v1",
  assemblies: "skm_saved_assemblies_v1",
  stock: "skm_warehouse_stock_v1",
};

const state = {
  apiLive: false,
  apiBase: window.location.protocol.startsWith("http") ? "" : "http://localhost:8000",
  activeTab: "selector",
  units: "metric",
  theme: "dark",
  isoGroup: "P",
  op: "TURNING",
  axialSubtype: "ALL",
  stability: "STABLE",
  pocketFilter: null,
  candidates: [],
  selectedId: null,
  compareIds: [],
  customMachines: [],
  savedAssemblies: [],
  stockItems: [],
  viewerCoatingOverride: null,
  chartBounds: { fMin: 0.05, fMax: 0.5, apMin: 0, apMax: 5 },
};

let viewer3d = null;
let toastTimer = null;

function normIsoKey(s) { return (s || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase(); }

// ============================================================================
// ISO 1832 + Grooving (MGMN) + Threading (16ER/IR) Parser & 2D SVG
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
  DRL: { name: "Осевое сверло (2-зубое)", edges: 2, icF: 1.0 },
};
const CLEAR = {
  N: [0, "Негативная 0°"], C: [7, "Позитивная 7°"], P: [11, "Позитивная 11°"],
  D: [15, "Позитивная 15°"], B: [5, "Позитивная 5°"], A: [3, "Позитивная 3°"],
  E: [20, "Позитивная 20°"], F: [25, "Позитивная 25°"], G: [30, "Позитивная 30°"], O: [11, "Спец. позитивный (сверл.)"],
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
  S07: 7.938, S09: 9.525, S11: 11.0, S12: 12.7, S15: 15.875, S19: 19.05,
  T11: 6.35, T16: 9.525, T22: 12.7,
  V11: 6.35, V16: 9.525,
  W05: 7.938, W06: 9.525, W08: 12.7,
  A10: 6.35, A11: 6.35, A16: 9.525,
  R08: 8.0, R10: 10.0, R12: 12.0, R16: 16.0,
};

function parseIsoClient(raw) {
  const cleaned = (raw || "").replace(/[^A-Za-z0-9\-]/g, "").toUpperCase();
  const core = cleaned.split("-")[0];

  const coreNoDash = (raw || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  // Modular Drill Crown: MOD-DRL-140, MOD-DRL-200
  const mMod = coreNoDash.match(/^MODDRL(\d{3})$/);
  if (mMod) {
    const dc = +(parseInt(mMod[1], 10) / 10).toFixed(2);
    const thk = +(dc * 0.48).toFixed(2);
    const pocket = `DRL-M-${Math.floor(dc * 100 + 0.5)}-${Math.floor(thk * 100 + 0.5)}-B`;
    return {
      valid: true, raw_code: raw, normalized_code: coreNoDash,
      shape_code: "DRL", shape_name: `Сменная коронка Ø${dc} мм (140°)`,
      clearance_angle_code: "P", clearance_angle_deg: 11, tolerance_class: "G", fixing_type_code: "X",
      ic_mm: dc, cutting_edge_length_mm: +(dc * 0.52).toFixed(2), thickness_mm: thk, corner_radius_mm: 0.2,
      is_double_sided: false, cutting_edges_count: 2, seat_pocket_signature: pocket,
      segments: [
        { label: "Тип", code: "MOD", meaning: "Сменная коронка (модульное сверло)", color: "#38BDF8" },
        { label: "Группа", code: "DRL", meaning: "Осевое сверление (IT9–IT10)", color: "#A78BFA" },
        { label: "Диаметр (DC)", code: mMod[1], meaning: `Ø${dc} мм`, color: "#FB7185" },
        { label: "Угол при верш.", code: "140°", meaning: "Самоцентрирующая подточка", color: "#34D399" },
        { label: "Крепление", code: "BAY", meaning: "Байонетный замок", color: "#FBBF24" },
        { label: "Кромок / СОЖ", code: "2 / IC", meaning: "2 кромки, внутренний СОЖ", color: "#2DD4BF" },
      ],
    };
  }

  // Solid Carbide Internal-Coolant Drill: SC-DRL-080-5D, SC-DRL-120-8D, SC-DRL-100-AL, SC-DRL-060-H
  const mSc = coreNoDash.match(/^SCDRL(\d{3})(3D|5D|8D|AL|H)?$/);
  if (mSc) {
    const dc = +(parseInt(mSc[1], 10) / 10).toFixed(2);
    const tag = mSc[2] || "5D";
    const ldVal = tag === "8D" ? 8 : (tag === "3D" ? 3 : 5);
    const ptDeg = tag === "AL" ? 130 : 140;
    const flLen = +(dc * (ldVal + 1.2)).toFixed(1);
    const pocket = `DRL-S-${Math.floor(dc * 100 + 0.5)}-${ldVal * 100}-I`;
    return {
      valid: true, raw_code: raw, normalized_code: coreNoDash, suffix: tag,
      shape_code: "DRL", shape_name: `Монолит ЦТ Ø${dc} мм (${ldVal}xD, ${ptDeg}°)`,
      clearance_angle_code: "P", clearance_angle_deg: 11, tolerance_class: "H", fixing_type_code: "N",
      ic_mm: dc, cutting_edge_length_mm: flLen, thickness_mm: +(dc * 1.4).toFixed(2), corner_radius_mm: 0.1,
      is_double_sided: false, cutting_edges_count: 2, seat_pocket_signature: pocket,
      segments: [
        { label: "Исполнение", code: "SC", meaning: "Цельнотвердосплавное (IT8)", color: "#38BDF8" },
        { label: "Назначение", code: "DRL", meaning: "Сверление с внутр. СОЖ", color: "#A78BFA" },
        { label: "Диаметр (DC)", code: mSc[1], meaning: `Ø${dc} мм (допуск m7)`, color: "#FB7185" },
        { label: "Глубина / Серия", code: tag, meaning: `До ${ldVal}xD (Lраб≈${flLen} мм)`, color: "#FBBF24" },
        { label: "Угол при верш.", code: `${ptDeg}°`, meaning: tag === "AL" ? "Полир. под алюминий" : "S-перемычка", color: "#34D399" },
        { label: "Хвостовик", code: "DIN6535", meaning: "Под гидро/термопатрон", color: "#2DD4BF" },
      ],
    };
  }

  // Grooving MGMN 200 / 300 / 400
  const mGrv = core.match(/^MGMN(\d{3})/);
  if (mGrv) {
    const wCode = mGrv[1];
    const wMm = +(parseInt(wCode, 10) / 100).toFixed(2);
    const pocket = `L-N-${Math.floor(wMm * 100 + 0.5)}-476-N`;
    return {
      valid: true, raw_code: raw, normalized_code: core,
      shape_code: "L", shape_name: `Отрезная / канавочная (w=${wMm} мм)`,
      clearance_angle_code: "N", clearance_angle_deg: 0,
      tolerance_class: "M", fixing_type_code: "N",
      ic_mm: wMm, cutting_edge_length_mm: 21.0, thickness_mm: 4.76, corner_radius_mm: 0.2,
      is_double_sided: true, cutting_edges_count: 2, seat_pocket_signature: pocket,
      segments: [
        { label: "Серия", code: "MG", meaning: "Канавочная / отрезная (2 кромки)", color: "#38BDF8" },
        { label: "Угол в плане", code: "M", meaning: "Нейтральная (0°)", color: "#A78BFA" },
        { label: "Тип", code: "N", meaning: "Без отв. (верхний прижим)", color: "#FBBF24" },
        { label: "Ширина (W)", code: wCode, meaning: `${wMm} мм`, color: "#FB7185" },
        { label: "Длина (L)", code: "21", meaning: "21.0 мм", color: "#F97316" },
        { label: "Радиус (RE)", code: "02", meaning: "0.2 мм", color: "#2DD4BF" },
      ],
    };
  }

  // Threading 11/16/22 ER/IR AG60
  const mThr = core.match(/^(11|16|22)(E|I)(R|L)([A-Z0-9\.]+)?$/);
  if (mThr) {
    const [, sz, ei, hand, pitch] = mThr;
    const ic = { "11": 6.35, "16": 9.525, "22": 12.7 }[sz];
    const thk = { "11": 3.18, "16": 3.97, "22": 4.76 }[sz];
    const pLbl = pitch || "AG60";
    const pocket = `T-N-${Math.floor(ic * 100 + 0.5)}-${Math.floor(thk * 100 + 0.5)}-T`;
    return {
      valid: true, raw_code: raw, normalized_code: core,
      shape_code: "T", shape_name: `Резьбовая 60° (${ei === "E" ? "наруж." : "внутр."})`,
      clearance_angle_code: "N", clearance_angle_deg: 0,
      tolerance_class: "M", fixing_type_code: "T",
      ic_mm: ic, cutting_edge_length_mm: parseFloat(sz), thickness_mm: thk, corner_radius_mm: 0.1,
      is_double_sided: false, cutting_edges_count: 3, seat_pocket_signature: pocket,
      segments: [
        { label: "Размер (IC)", code: sz, meaning: `L=${sz} мм, IC=${ic} мм`, color: "#38BDF8" },
        { label: "Резьба", code: ei, meaning: ei === "E" ? "Наружная" : "Внутренняя", color: "#A78BFA" },
        { label: "Направление", code: hand, meaning: hand === "R" ? "Правая" : "Левая", color: "#34D399" },
        { label: "Профиль", code: pLbl, meaning: "60° неполный (0.5–3.0 мм)", color: "#FBBF24" },
        { label: "Толщина (S)", code: sz === "16" ? "T3" : "04", meaning: `${thk} мм`, color: "#F97316" },
        { label: "Кромок", code: "3", meaning: "3 режущие вершины", color: "#2DD4BF" },
      ],
    };
  }

  if (core.length < 10) return { valid: false, error: "Введите код ISO 1832 (CNMG 120408), MGMN 300 или 16ER AG60" };
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
    L: `<rect x="38" y="14" width="34" height="82" rx="4" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="3"/>`,
    R: `<circle cx="55" cy="55" r="36" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="3"/>`,
    DRL: `<path d="M36,96 L36,34 L55,14 L74,34 L74,96 Z" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/><path d="M36,46 L74,60 M36,68 L74,82" stroke="var(--accent)" stroke-width="2" opacity="0.65"/>`,
  };
  const bore = (shape === "L" || shape === "DRL") ? "" : `<circle cx="55" cy="55" r="11" fill="var(--bg)" stroke="var(--muted)" stroke-width="2"/>`;
  return `<svg viewBox="0 0 110 110" width="90" height="90">
    <line x1="55" y1="4" x2="55" y2="106" stroke="var(--border)" stroke-dasharray="3,3" stroke-width="1"/>
    <line x1="4" y1="55" x2="106" y2="55" stroke="var(--border)" stroke-dasharray="3,3" stroke-width="1"/>
    ${shapesSvg[shape] || shapesSvg.C}
    ${bore}
  </svg>`;
}

// ============================================================================
// Kienzle Physics + Taylor Tool-Life Economics Engine
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
  if (inp.operation_domain === "TURNING" || inp.operation_domain === "GROOVING_THREADING") {
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
    const sub = inp.axial_tool_subtype || "INDEXABLE_U_DRILL";
    const sinHalfPt = Math.max(Math.sin(((inp.point_angle_deg || 140) * Math.PI) / 360), 0.5);
    let thrustRaw;
    if (sub === "INDEXABLE_U_DRILL") {
      hm = Math.max(inp.feed_mm * 0.5 * sinK, 0.01);
      kc = inp.kc1_1_mpa * Math.pow(hm, -inp.mc_exponent);
      thrustRaw = 0.42 * kc * inp.feed_mm * inp.diameter_mm;
    } else {
      hm = Math.max((inp.feed_mm / 2) * sinHalfPt, 0.01);
      kc = inp.kc1_1_mpa * Math.pow(hm, -inp.mc_exponent);
      thrustRaw = (sub === "MODULAR_TIP" ? 0.50 : 0.54) * kc * inp.feed_mm * inp.diameter_mm * sinHalfPt;
    }
    inp._axial_thrust_n = +thrustRaw.toFixed(1);
    vf = inp.feed_mm * rpm;
    mrr = ((Math.PI * inp.diameter_mm * inp.diameter_mm) / 4 * vf) / 1000;
    pNet = (inp.feed_mm * inp.diameter_mm * effVc * kc) / 240000;
    fc = (pNet * 60000) / Math.max(effVc, 0.1);

    const depth = inp.hole_depth_mm || inp.diameter_mm * 3;
    const ld = +(depth / inp.diameter_mm).toFixed(2);
    inp._drill_ld = ld;
    inp._hole_sec = +(((depth + 3) / Math.max(vf, 1)) * 60).toFixed(1);

    let reqBar = sub === "INDEXABLE_U_DRILL"
      ? (ld <= 3 ? 15 : (ld <= 4 ? 22 : 30))
      : (sub === "MODULAR_TIP" ? (ld <= 3.5 ? 15 : (ld <= 5.5 ? 25 : 38)) : (ld <= 3.5 ? 15 : (ld <= 5.5 ? 25 : 40)));
    if (inp.diameter_mm <= 8) reqBar += 5;
    inp._req_bar = reqBar;

    const entryType = inp.hole_entry_type || "FLAT";
    const eFac = { FLAT: 1.0, ANGLED_OR_CURVED: 0.6, CROSS_HOLE: 0.6, STACKED: 0.7 }[entryType] || 1.0;
    inp._entry_feed = +(inp.feed_mm * eFac).toFixed(3);
    inp._pilot = ld > 5.0 || (sub === "INDEXABLE_U_DRILL" && entryType === "ANGLED_OR_CURVED");

    if (sub === "INDEXABLE_U_DRILL") {
      inp._cycle = entryType !== "FLAT" ? "G81 (сниж. f на входе, БЕЗ G83!)" : "G81 (непрерывный, БЕЗ G83)";
    } else if (inp._pilot) {
      inp._cycle = "Пилот 2xD + G81 (вход 300 об/м)";
    } else if (entryType === "ANGLED_OR_CURVED" || entryType === "CROSS_HOLE") {
      inp._cycle = "G81 (сниж. f на входе) / G73";
    } else if (inp.kc1_1_mpa <= 800 && ld >= 4) {
      inp._cycle = "G73 (короткая ломка стружки)";
    } else {
      inp._cycle = "G81 (непрерывный с внутр. СОЖ)";
    }

    if (inp.drill_ld_max && ld > inp.drill_ld_max)
      warnings.push(`Глубина сверления L/D=${ld}xD превышает вылет корпуса (${inp.drill_ld_max}xD) — выберите более длинное сверло.`);
    if (inp.coolant_pressure_bar != null && inp.coolant_pressure_bar < reqBar)
      warnings.push(`Давление СОЖ (${inp.coolant_pressure_bar} бар) ниже требуемого (${reqBar} бар) для ${ld}xD — риск пакетирования стружки.`);
    if (inp.machine_max_thrust_kn && (thrustRaw / 1000) > inp.machine_max_thrust_kn)
      warnings.push(`Осевое усилие подачи (${(thrustRaw / 1000).toFixed(1)} кН) превышает лимит оси Z станка (${inp.machine_max_thrust_kn} кН).`);
    if (inp._pilot)
      warnings.push(`Для L/D=${ld}xD требуется пилотное отверстие 1.5–2xD (вход на 300–500 об/мин до включения СОЖ).`);
    if (entryType === "ANGLED_OR_CURVED")
      warnings.push(`Наклонный/криволинейный вход: снизьте подачу врезания до f=${inp._entry_feed} мм/об${sub === "INDEXABLE_U_DRILL" ? " (для U-сверла подфрезеруйте площадку)." : "."}`);
    else if (entryType === "CROSS_HOLE")
      warnings.push(`Пересечение отверстий: снизьте подачу до f=${inp._entry_feed} мм/об в зоне пересечения.`);
    else if (entryType === "STACKED")
      warnings.push(`Пакет листов: снизьте подачу до f=${inp._entry_feed} мм/об и исключите зазор между листами.`);
  }

  const pMot = pNet / 0.80;
  const trq = (9550 * pMot) / Math.max(rpm, 1);

  let raUm = null;
  if (inp.operation_domain === "TURNING" && inp.corner_radius_mm && inp.corner_radius_mm > 0) {
    raUm = ((inp.feed_mm * inp.feed_mm) / (32 * inp.corner_radius_mm)) * 1000 * (inp.has_wiper_geometry ? 0.5 : 1.0);
    raUm = +raUm.toFixed(2);
  }
  let ldRatio = null, deflMm = null;
  if (inp.operation_domain !== "DRILLING" && inp.overhang_mm && inp.shank_diameter_mm) {
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
    ra_um: raUm, ld_ratio: inp.operation_domain === "DRILLING" ? (inp._drill_ld ?? null) : ldRatio, deflection_mm: deflMm,
    axial_thrust_n: inp._axial_thrust_n ?? null,
    drill_ld_ratio: inp._drill_ld ?? null,
    required_coolant_bar: inp._req_bar ?? null,
    recommended_cycle: inp._cycle ?? null,
    entry_feed_mm: inp._entry_feed ?? null,
    pilot_hole_required: !!inp._pilot,
    hole_cycle_time_sec: inp._hole_sec ?? null,
    in_chipbreaker_zone: inZone, warnings,
  };
}

function calcEconomicsClient(inp) {
  const nMap = { CBN: 0.30, CVD: 0.25, PVD: 0.22, UNCOATED: 0.18 };
  const tRefMap = { P: 15, M: 15, K: 18, N: 30, S: 10, H: 12 };
  const stabMap = { STABLE: 1.0, INTERRUPTED: 0.65, UNSTABLE: 0.78 };
  const nExp = (inp.grade_code || "").includes("CBN") ? 0.30 : (nMap[inp.coating_method] || 0.24);
  const tRef = tRefMap[inp.iso_group] || 15;
  const stab = stabMap[inp.stability] || 1.0;
  const vcRatio = Math.max(0.35, Math.min(2.5, inp.vc_opt / Math.max(inp.vc_actual, 1)));
  const lifeMin = Math.max(2, Math.min(180, tRef * Math.pow(vcRatio, 1 / nExp) * stab));
  const cutTime = inp.volume_cm3 / Math.max(inp.mrr, 0.1);
  const partsPerEdge = lifeMin / Math.max(cutTime, 0.001);
  const edgesPerPart = 1 / Math.max(partsPerEdge, 0.001);
  const costPerEdge = inp.price_rub / Math.max(inp.edges, 1);
  const toolCost = costPerEdge * edgesPerPart;
  const changeMin = 1.5 * edgesPerPart;
  const machineCost = ((cutTime + changeMin) / 60) * inp.rate_rub_hr;
  return {
    tool_life_edge_min: +lifeMin.toFixed(1),
    cutting_time_part_min: +cutTime.toFixed(2),
    parts_per_edge: +partsPerEdge.toFixed(1),
    cost_per_edge_rub: +costPerEdge.toFixed(1),
    tool_cost_part_rub: +toolCost.toFixed(1),
    machine_cost_part_rub: +machineCost.toFixed(1),
    total_cost_part_rub: +(toolCost + machineCost).toFixed(1),
  };
}

// ============================================================================
// Warehouse Stock Lookup & CSV Import/Export
// ============================================================================
function getStockMatchClient(isoCode, gradeCode) {
  const key = normIsoKey(isoCode);
  let fallback = null;
  for (const item of state.stockItems) {
    if (normIsoKey(item.iso_code) !== key) continue;
    if (gradeCode && item.grade_code === gradeCode) return item;
    if (!fallback) fallback = item;
  }
  return fallback;
}

function parseStockCsvClient(text) {
  const cleaned = (text || "").replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headLine = lines[0];
  const delim = headLine.includes("\t") ? "\t" : (headLine.split(";").length >= headLine.split(",").length ? ";" : ",");
  const headers = headLine.split(delim).map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
  const pickIdx = (aliases) => headers.findIndex((h) => aliases.includes(h));
  const iCode = pickIdx(["iso_code", "iso", "code", "код", "пластина", "обозначение"]);
  if (iCode < 0) return [];
  const iGrade = pickIdx(["grade_code", "grade", "сплав", "марка"]);
  const iQty = pickIdx(["qty", "quantity", "stock", "остаток", "количество", "шт"]);
  const iPrice = pickIdx(["unit_price_rub", "price", "цена", "стоимость", "price_rub"]);
  const iBin = pickIdx(["bin_location", "bin", "cell", "ячейка", "полка"]);
  const iSup = pickIdx(["supplier", "поставщик", "склад"]);

  const out = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r].split(delim).map((c) => c.replace(/^"|"$/g, "").trim());
    const iso = (cols[iCode] || "").toUpperCase();
    if (!iso) continue;
    const qty = iQty >= 0 ? Math.max(0, parseInt((cols[iQty] || "0").replace(",", "."), 10) || 0) : 0;
    const price = iPrice >= 0 ? Math.max(0, parseFloat((cols[iPrice] || "650").replace(",", ".")) || 650) : 650;
    out.push({
      iso_code: iso,
      grade_code: iGrade >= 0 ? (cols[iGrade] || "") : "",
      qty,
      unit_price_rub: +price.toFixed(2),
      bin_location: iBin >= 0 ? (cols[iBin] || "") : "",
      supplier: iSup >= 0 ? (cols[iSup] || "") : "",
    });
  }
  return out;
}

async function handleStockCsvUpload(evt) {
  const file = evt.target.files && evt.target.files[0];
  evt.target.value = "";
  if (!file) return;
  const text = await file.text();
  const parsed = parseStockCsvClient(text);
  if (!parsed.length) {
    showToast("Ошибка CSV: нужна колонка iso_code (или Код/Пластина).");
    return;
  }
  state.stockItems = parsed;
  localStorage.setItem(STORAGE_KEYS.stock, JSON.stringify(state.stockItems));
  if (state.apiLive) {
    try {
      await fetch(`${state.apiBase}/api/stock/upload-csv`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv_text: text }),
      });
    } catch {}
  }
  updateBadges();
  renderStockTab();
  runSelection();
  showToast(`Импортировано позиций на склад: ${parsed.length}`);
}

function exportStockCSV() {
  const header = "iso_code;grade_code;qty;unit_price_rub;bin_location;supplier";
  const rows = state.stockItems.map((s) => `${s.iso_code};${s.grade_code || ""};${s.qty};${s.unit_price_rub};${s.bin_location || ""};${s.supplier || ""}`);
  downloadFile("skm_warehouse_stock.csv", "\uFEFF" + [header, ...rows].join("\n") + "\n", "text/csv;charset=utf-8");
}

function resetStockDefaults() {
  state.stockItems = FALLBACK_DB.stock.map((s) => ({ ...s }));
  localStorage.setItem(STORAGE_KEYS.stock, JSON.stringify(state.stockItems));
  updateBadges();
  renderStockTab();
  runSelection();
  showToast("Восстановлен демо-склад (14 позиций).");
}

function updateStockInline(idx, field, val) {
  if (!state.stockItems[idx]) return;
  if (field === "qty") state.stockItems[idx].qty = Math.max(0, parseInt(val, 10) || 0);
  if (field === "unit_price_rub") state.stockItems[idx].unit_price_rub = Math.max(0, parseFloat(val) || 0);
  localStorage.setItem(STORAGE_KEYS.stock, JSON.stringify(state.stockItems));
  if (state.apiLive) {
    fetch(`${state.apiBase}/api/stock`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state.stockItems),
    }).catch(() => {});
  }
  renderStockSummary();
  runSelection();
}

function renderStockSummary() {
  const totalPositions = state.stockItems.length;
  const totalPcs = state.stockItems.reduce((acc, s) => acc + (s.qty || 0), 0);
  const totalValue = state.stockItems.reduce((acc, s) => acc + (s.qty || 0) * (s.unit_price_rub || 0), 0);
  const inStockCount = state.stockItems.filter((s) => (s.qty || 0) > 0).length;
  const el = document.getElementById("stockSummary");
  if (!el) return;
  el.innerHTML = `
    <div class="kpi"><div class="k-label">Позиций на складе</div><div class="k-val">${inStockCount} / ${totalPositions}</div><div class="k-sub">активных номенклатур</div></div>
    <div class="kpi"><div class="k-label">Всего пластин</div><div class="k-val">${totalPcs} шт</div><div class="k-sub">суммарный остаток</div></div>
    <div class="kpi"><div class="k-label">Оценка склада</div><div class="k-val">${Math.round(totalValue).toLocaleString("ru-RU")} ₽</div><div class="k-sub">по учётным ценам</div></div>
  `;
}

function renderStockTab() {
  renderStockSummary();
  const wrap = document.getElementById("stockTableWrap");
  if (!state.stockItems.length) {
    wrap.innerHTML = `<div class="empty-state">Склад пуст. Загрузите CSV-файл остатков или восстановите демо-склад.</div>`;
    return;
  }
  wrap.innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th>Обозначение ISO</th>
          <th>Сплав</th>
          <th>Остаток (шт)</th>
          <th>Цена (₽/шт)</th>
          <th>Ячейка</th>
          <th>Склад / Поставщик</th>
        </tr>
      </thead>
      <tbody>
        ${state.stockItems.map((s, idx) => `
          <tr>
            <td class="mono" style="color:var(--accent);cursor:pointer;" onclick="setIso('${s.iso_code}');switchTab('selector');">${s.iso_code}</td>
            <td class="mono">${s.grade_code || "—"}</td>
            <td><input class="stock-input-inline" type="number" min="0" value="${s.qty}" onchange="updateStockInline(${idx}, 'qty', this.value)" /></td>
            <td><input class="stock-input-inline" type="number" min="0" step="10" value="${s.unit_price_rub}" onchange="updateStockInline(${idx}, 'unit_price_rub', this.value)" /></td>
            <td class="mono">${s.bin_location || "—"}</td>
            <td style="color:var(--muted);">${s.supplier || "—"}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
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
  if (tabId === "studio3d") ensureViewer3D().then(() => sync3dWithSelectedCandidate());
  else if (tabId === "compare") renderCompareTable();
  else if (tabId === "setups") renderSavedAssemblies();
  else if (tabId === "stock") renderStockTab();
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

function updateBadges() {
  document.getElementById("compareBadge").textContent = state.compareIds.length;
  document.getElementById("setupsBadge").textContent = state.savedAssemblies.length;
  document.getElementById("stockBadge").textContent = state.stockItems.filter((s) => (s.qty || 0) > 0).length;
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
  if (p.has("op") && ["TURNING", "MILLING", "DRILLING", "GROOVING_THREADING"].includes(p.get("op"))) {
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
  if (p.has("tab") && ["selector", "studio3d", "compare", "setups", "stock"].includes(p.get("tab"))) {
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
  if (viewer3d && !viewer3d.isCadFileLoaded) sync3dWithSelectedCandidate(code, parsed);
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

async function saveCustomMachine(e) {
  e.preventDefault();
  const name = document.getElementById("cmName").value.trim() || "Станок цеха";
  const power = parseFloat(document.getElementById("cmPower").value) || 15;
  const rpm = parseInt(document.getElementById("cmRpm").value, 10) || 6000;
  const torque = parseFloat(document.getElementById("cmTorque").value) || 150;
  let newM = { id: `custom-${Date.now()}`, name, machine_type: "TURN_MILL", max_rpm: rpm, spindle_power_kw: power, max_torque_nm: torque, rigidity_class: "MEDIUM" };
  if (state.apiLive) {
    try {
      const r = await fetch(`${state.apiBase}/api/machines`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newM),
      });
      if (r.ok) newM = await r.json();
    } catch {}
  }
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
  } else if (op === "GROOVING_THREADING") {
    apF.style.display = "block"; aeF.style.display = "none";
    feedLbl.innerHTML = "Подача врезания f<sub>n</sub>"; diamLbl.textContent = "Диаметр обработки D";
    feedSl.min = 0.04; feedSl.max = 0.25; feedSl.value = 0.10;
    apSl.min = 0.5; apSl.max = 4.5; apSl.value = 3.0;
  } else {
    apF.style.display = "none"; aeF.style.display = "none";
    feedLbl.innerHTML = "Подача сверления f<sub>n</sub>"; diamLbl.textContent = "Диаметр отверстия D<sub>c</sub>";
    feedSl.min = 0.04; feedSl.max = 0.36; feedSl.value = 0.14;
    const dSl = document.getElementById("diamSlider");
    dSl.min = 4; dSl.max = 60; dSl.step = 1; dSl.value = 20;
  }
  const isDrl = op === "DRILLING";
  const dSl = document.getElementById("diamSlider");
  if (!isDrl) { dSl.min = 16; dSl.max = 200; dSl.step = 2; if (parseFloat(dSl.value) < 16) dSl.value = 50; }
  document.getElementById("axialControls").style.display = isDrl ? "block" : "none";
  document.getElementById("overhangControls").style.display = isDrl ? "none" : "block";
  document.getElementById("thrustBarWrap").style.display = isDrl ? "block" : "none";
  updateSliderLabels();
  if (!silent) runSelection();
}

function selectAxialSubtype(sub) {
  state.axialSubtype = sub;
  document.querySelectorAll("[data-ax]").forEach((b) => b.classList.toggle("active", b.dataset.ax === sub));
  if (sub === "SOLID_CARBIDE") {
    document.getElementById("diamSlider").value = 10;
    document.getElementById("feedSlider").value = 0.20;
  } else if (sub === "MODULAR_TIP") {
    document.getElementById("diamSlider").value = 16;
    document.getElementById("feedSlider").value = 0.24;
  } else if (sub === "INDEXABLE_U_DRILL") {
    document.getElementById("diamSlider").value = 30;
    document.getElementById("feedSlider").value = 0.12;
  }
  updateSliderLabels();
  runSelection();
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
  document.getElementById("volVal").textContent = `${document.getElementById("volSlider").value} см³`;
  document.getElementById("rateVal").textContent = `${document.getElementById("rateSlider").value} ₽/ч`;
  const hDepth = parseFloat(document.getElementById("holeDepthSlider").value);
  const dVal = parseFloat(document.getElementById("diamSlider").value) || 20;
  document.getElementById("holeDepthVal").textContent = fmtLen(hDepth);
  document.getElementById("coolantBarVal").textContent = `${document.getElementById("coolantBarSlider").value} бар`;
  document.getElementById("axialLdLive").textContent = `${(hDepth / dVal).toFixed(1)}xD`;
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
    only_in_stock: document.getElementById("onlyInStockChk").checked,
    volume_to_remove_cm3: parseFloat(document.getElementById("volSlider").value),
    machine_rate_rub_hr: parseFloat(document.getElementById("rateSlider").value),
    axial_subtype_filter: state.axialSubtype,
    hole_depth_mm: parseFloat(document.getElementById("holeDepthSlider").value),
    hole_entry_type: document.getElementById("holeEntrySelect").value,
    coolant_pressure_bar: parseFloat(document.getElementById("coolantBarSlider").value),
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
    const subType = ins.axial_subtype || (req.operation_domain === "DRILLING" ? "INDEXABLE_U_DRILL" : null);
    if (req.operation_domain === "DRILLING" && req.axial_subtype_filter && req.axial_subtype_filter !== "ALL" && subType !== req.axial_subtype_filter) continue;

    const stMatch = getStockMatchClient(ins.iso_code, ins.grade_code);
    const stockQty = stMatch ? stMatch.qty : 0;
    if (req.only_in_stock && stockQty <= 0) continue;
    const unitPrice = stMatch ? stMatch.unit_price_rub : +(ins.relative_cost * 650).toFixed(0);
    const binLoc = stMatch ? (stMatch.bin_location || "") : "";

    const rec = ins.recs[req.material_subgroup] || Object.values(ins.recs)[0];
    const vcOpt = rec.vc;
    const vc = +(vcOpt * vcFactor).toFixed(1);
    const h0 = ins.holders[0] || {};
    const physics = calcKienzleClient({
      operation_domain: req.operation_domain,
      kc1_1_mpa: sg.kc1_1_mpa, mc_exponent: sg.mc_exponent,
      vc_m_min: vc, feed_mm: req.feed_mm, ap_mm: req.ap_mm, ae_mm: req.ae_mm,
      diameter_mm: (req.operation_domain === "MILLING") ? (h0.dc_mm || req.diameter_mm) : req.diameter_mm,
      teeth_count: h0.z || 1, lead_angle_deg: h0.lead_angle_deg || 90,
      corner_radius_mm: ins.corner_radius_mm || parseIsoClient(ins.iso_code).corner_radius_mm || 0.8,
      has_wiper_geometry: !!ins.has_wiper_geometry,
      overhang_mm: req.overhang_mm, shank_diameter_mm: req.shank_diameter_mm, shank_material: req.shank_material,
      hole_depth_mm: req.hole_depth_mm,
      axial_tool_subtype: subType,
      point_angle_deg: ins.point_angle_deg || (subType === "INDEXABLE_U_DRILL" ? 180 : 140),
      drill_ld_max: ins.ld_ratio_max || h0.ld_ratio_max || null,
      hole_entry_type: req.hole_entry_type,
      coolant_pressure_bar: req.coolant_pressure_bar,
      machine_max_rpm: m.max_rpm, machine_max_power_kw: m.spindle_power_kw, machine_max_torque_nm: m.max_torque_nm,
      machine_max_thrust_kn: m.max_thrust_kn || 20,
      chipbreaker_polygon: ins.operating_zone_polygon,
    });
    const economics = calcEconomicsClient({
      iso_group: sg.iso_group, coating_method: ins.coating_method, grade_code: ins.grade_code,
      stability: req.stability, vc_actual: vc, vc_opt: vcOpt, mrr: physics.mrr_cm3_min,
      volume_cm3: req.volume_to_remove_cm3, price_rub: unitPrice, edges: ins.cutting_edges_count,
      rate_rub_hr: req.machine_rate_rub_hr,
    });
    let score = rank === "PRIMARY" ? 60 : 40;
    if (physics.in_chipbreaker_zone === true || req.operation_domain === "DRILLING") score += 20;
    score += req.stability === "INTERRUPTED"
      ? ins.toughness * 2
      : req.stability === "UNSTABLE"
        ? (ins.edge_prep === "SHARP" ? 12 : 4)
        : ins.wear * 2;
    if (req.operation_domain === "DRILLING") {
      const diamDiff = Math.abs((h0.dc_mm || req.diameter_mm) - req.diameter_mm);
      if (diamDiff <= 2) score += 12;
      else if (diamDiff <= 6) score += 6;
      else if (diamDiff > 14) score -= 10;
      const ldMax = ins.ld_ratio_max || h0.ld_ratio_max;
      if (ldMax && physics.drill_ld_ratio && physics.drill_ld_ratio <= ldMax) score += 6;
    }
    if (stockQty > 0) score += 4;
    if (physics.warnings.length) score -= Math.min(physics.warnings.length * 8, 24);
    score = Math.max(10, Math.min(100, score));
    out.push({
      ...ins,
      suitability_rank: rank,
      score,
      cost_per_edge: +(ins.relative_cost / ins.cutting_edges_count).toFixed(3),
      recommended_vc: vc,
      recommended_coolant: rec.coolant,
      stock_qty: stockQty,
      unit_price_rub: unitPrice,
      bin_location: binLoc,
      physics,
      economics,
    });
  }
  out.sort((a, b) => b.score - a.score || a.economics.total_cost_part_rub - b.economics.total_cost_part_rub);
  return out;
}

// ============================================================================
// Candidates, Analytics, Cross-Ref & Interactive SVG Chipbreaker Map
// ============================================================================
function renderCandidates() {
  const grid = document.getElementById("candidatesGrid");
  document.getElementById("candCount").textContent = `${state.candidates.length} вариантов`;
  if (!state.candidates.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Нет пластин под выбранную комбинацию. Попробуйте снять фильтр «Только в наличии», сбросить фильтр гнезда или выбрать другую операцию.</div>`;
    return;
  }
  grid.innerHTML = state.candidates
    .map((c) => {
      const h = c.holders[0];
      const inCmp = state.compareIds.includes(c.insert_id);
      const stockPill = c.stock_qty > 0
        ? `<span class="stock-badge">📦 ${c.stock_qty} шт${c.bin_location ? ` · ${c.bin_location}` : ""}</span>`
        : `<span class="stock-badge out">Под заказ</span>`;
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
            ${c.axial_subtype ? `<span class="tag ${c.axial_subtype === 'MODULAR_TIP' ? 'axial-mod' : (c.axial_subtype === 'SOLID_CARBIDE' ? 'axial-sc' : 'axial-ud')}">${c.axial_subtype === 'MODULAR_TIP' ? 'Коронка' : (c.axial_subtype === 'SOLID_CARBIDE' ? 'Монолит ЦТ' : 'U-сверло СМП')}</span>` : `<span class="tag">${c.chipbreaker_code}</span>`}
            ${c.ld_ratio_max ? `<span class="tag">до ${c.ld_ratio_max}xD</span>` : `<span class="tag">${c.cutting_edges_count} кр.</span>`}
            ${c.tolerance_hole ? `<span class="tag">${c.tolerance_hole}</span>` : ""}
            ${stockPill}
          </div>
          <div class="cand-meta">
            <span>V<sub>c</sub> старт: <b>${fmtVc(c.recommended_vc)}</b></span>
            <span>Мощность: <b>${c.physics.power_motor_kw} кВт</b></span>
            <span>Стойкость: <b>${c.economics.tool_life_edge_min} мин</b></span>
            <span>Себест./дет.: <b style="color:var(--green)">${c.economics.total_cost_part_rub} ₽</b></span>
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

function inspectCandidateIn3D(id) { selectCandidate(id); switchTab("studio3d"); }

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
  const e = c.economics;
  document.getElementById("cbTitle").textContent = `${c.iso_code} · ${c.chipbreaker_code}`;
  document.getElementById("vcTitle").textContent = `Vc: ${fmtVc(c.recommended_vc)}`;
  document.getElementById("kRpm").textContent = `${p.rpm_clamped} об/м`;
  document.getElementById("kVf").textContent = `Vf: ${p.vf_mm_min} мм/мин`;
  document.getElementById("kFc").textContent = `${p.fc_n} Н`;
  document.getElementById("kKc").textContent = `kc: ${p.kc_mpa} МПа`;
  document.getElementById("kMrr").textContent = p.mrr_cm3_min;
  document.getElementById("kHm").textContent = `${p.hm_mm} мм`;
  document.getElementById("kThin").textContent = p.chip_thinning_factor > 1 ? `утонение: ${p.chip_thinning_factor}x!` : "утонение: 1.0x";
  if (state.op === "DRILLING") {
    document.getElementById("chartCardTitle").textContent = "Схема осевого сверления и цикл ЧПУ (G-код)";
    document.getElementById("chartHintLeft").innerHTML = p.recommended_cycle ? `<span class="cycle-pill">${p.recommended_cycle}</span>` : "Осевое сверление";
    const thrustKn = p.axial_thrust_n != null ? +(p.axial_thrust_n / 1000).toFixed(2) : 0;
    const maxThrust = m.max_thrust_kn || 20;
    document.getElementById("kRaLabel").innerHTML = "Осевое усилие F<sub>f</sub>";
    document.getElementById("kRa").textContent = p.axial_thrust_n != null ? `${thrustKn} кН` : "—";
    document.getElementById("kRaSub").textContent = p.required_coolant_bar ? `СОЖ ≥ ${p.required_coolant_bar} бар · fвх=${p.entry_feed_mm}` : "усилие оси Z";
    document.getElementById("kDeflLabel").innerHTML = "Время / отверстие";
    document.getElementById("kDefl").textContent = p.hole_cycle_time_sec != null ? `${p.hole_cycle_time_sec} сек` : "—";
    document.getElementById("kLd").textContent = p.drill_ld_ratio ? `L/D = ${p.drill_ld_ratio}xD${c.ld_ratio_max ? ` / макс ${c.ld_ratio_max}xD` : ""}` : "L/D: —";
    setBar("barThrust", "lblThrust", thrustKn, maxThrust, "кН");
  } else {
    document.getElementById("chartCardTitle").innerHTML = "Карта стружколома (a<sub>p</sub> / f)";
    document.getElementById("chartHintLeft").innerHTML = "Кликните по графику для настройки (f, a<sub>p</sub>)";
    document.getElementById("kRaLabel").innerHTML = "Шероховатость R<sub>a</sub>";
    document.getElementById("kRa").textContent = p.ra_um != null ? `${p.ra_um} мкм` : "—";
    document.getElementById("kRaSub").textContent = p.ra_um != null ? (c.has_wiper_geometry ? "Wiper (×0.5)" : "f² / (32·RE)") : "только точение";
    document.getElementById("kDeflLabel").innerHTML = "Прогиб оправки δ";
    document.getElementById("kDefl").textContent = p.deflection_mm != null ? `${p.deflection_mm.toFixed(3)} мм` : "—";
    document.getElementById("kLd").textContent = p.ld_ratio ? `L/D = ${p.ld_ratio}` : "L/D: —";
  }

  document.getElementById("eLife").textContent = `${e.tool_life_edge_min} мин`;
  document.getElementById("eTime").textContent = `${e.cutting_time_part_min} мин`;
  document.getElementById("eParts").textContent = `${e.parts_per_edge} шт`;
  document.getElementById("eTotal").textContent = `${e.total_cost_part_rub} ₽`;

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
  if (state.op === "DRILLING") {
    drawAxialDrillingDiagram(c, svg, statusEl);
    return;
  }
  if (!poly.length) {
    svg.innerHTML = `<text x="210" y="122" text-anchor="middle" fill="var(--muted)" font-size="13">Нет полигона стружколома для данной пластины.</text>`;
    statusEl.textContent = "—";
    return;
  }
  const fCur = parseFloat(document.getElementById("feedSlider").value);
  const apCur = parseFloat(document.getElementById("apSlider").value);
  const fMax = Math.max(0.3, ...poly.map((pt) => pt[0])) * 1.15;
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

function drawAxialDrillingDiagram(c, svg, statusEl) {
  const p = c.physics;
  const sub = c.axial_subtype || "INDEXABLE_U_DRILL";
  const dc = parseFloat(document.getElementById("diamSlider").value) || 20;
  const depth = parseFloat(document.getElementById("holeDepthSlider").value) || 60;
  const ld = p.drill_ld_ratio || +(depth / dc).toFixed(1);
  const ldMax = c.ld_ratio_max || 5.0;
  const reqBar = p.required_coolant_bar || 20;
  const actBar = parseFloat(document.getElementById("coolantBarSlider").value) || 20;
  const barOk = actBar >= reqBar;
  const ldOk = ld <= ldMax;
  const thrustKn = p.axial_thrust_n != null ? (p.axial_thrust_n / 1000).toFixed(2) : "—";
  const entryType = document.getElementById("holeEntrySelect").value;
  const isU = sub === "INDEXABLE_U_DRILL";

  // Geometry in SVG (420x245)
  const cx = 128;
  const holeW = Math.max(24, Math.min(64, dc * 1.45));
  const holeTop = 74;
  const holeH = Math.max(46, Math.min(138, ld * 18));
  const holeBot = holeTop + holeH;
  const tipH = isU ? 5 : Math.min(20, holeW * 0.22);

  // Entry surface profile (flat, angled, cross-hole, stacked)
  let topSurface = `<rect x="34" y="${holeTop}" width="188" height="154" rx="4" fill="var(--surface-2)" stroke="var(--border-strong)" stroke-width="1.5"/>`;
  if (entryType === "ANGLED_OR_CURVED") {
    topSurface = `<polygon points="34,${holeTop + 14} 222,${holeTop - 12} 222,228 34,228" fill="var(--surface-2)" stroke="var(--border-strong)" stroke-width="1.5"/>`;
  } else if (entryType === "STACKED") {
    topSurface += `<line x1="34" y1="${holeTop + 42}" x2="222" y2="${holeTop + 42}" stroke="var(--amber)" stroke-width="1.5" stroke-dasharray="4,2"/>` +
                  `<line x1="34" y1="${holeTop + 86}" x2="222" y2="${holeTop + 86}" stroke="var(--amber)" stroke-width="1.5" stroke-dasharray="4,2"/>`;
  }

  const crossHole = entryType === "CROSS_HOLE"
    ? `<rect x="34" y="${holeTop + Math.min(holeH * 0.45, 58)}" width="188" height="22" fill="var(--bg)" stroke="var(--amber)" stroke-dasharray="3,2"/>`
    : "";

  const holeCutout = `<path d="M${cx - holeW/2},${holeTop - 12} L${cx - holeW/2},${holeBot - tipH} L${cx},${holeBot} L${cx + holeW/2},${holeBot - tipH} L${cx + holeW/2},${holeTop - 12} Z" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="3,2"/>`;

  // Drill body inside hole
  const dw = holeW * 0.86;
  const drillBody = isU
    ? `<rect x="${cx - dw/2}" y="20" width="${dw}" height="${holeBot - 24}" rx="2" fill="#334155" stroke="#94a3b8" stroke-width="1.5"/>
       <rect x="${cx - dw/2 + 2}" y="${holeBot - 15}" width="${dw * 0.42}" height="10" fill="#d9ad45" stroke="#fff" stroke-width="0.8"/>
       <rect x="${cx + 2}" y="${holeBot - 13}" width="${dw * 0.42}" height="10" fill="#d9ad45" stroke="#fff" stroke-width="0.8"/>`
    : `<path d="M${cx - dw/2},20 L${cx + dw/2},20 L${cx + dw/2},${holeBot - tipH - 2} L${cx},${holeBot - 2} L${cx - dw/2},${holeBot - tipH - 2} Z" fill="${sub === 'MODULAR_TIP' ? '#475569' : '#524c66'}" stroke="#cbd5e1" stroke-width="1.4"/>
       <path d="M${cx - dw/2},${holeTop + 4} L${cx + dw/2},${holeTop + 26} M${cx - dw/2},${holeTop + 34} L${cx + dw/2},${holeTop + 56}" stroke="#38bdf8" stroke-width="1.6" opacity="0.7"/>`;

  // Internal coolant jets
  const jets = `<line x1="${cx - dw*0.18}" y1="22" x2="${cx - dw*0.18}" y2="${holeBot - 8}" stroke="${barOk ? '#38bdf8' : '#ef4444'}" stroke-width="1.6" stroke-dasharray="4,3"/>
                <line x1="${cx + dw*0.18}" y1="22" x2="${cx + dw*0.18}" y2="${holeBot - 8}" stroke="${barOk ? '#38bdf8' : '#ef4444'}" stroke-width="1.6" stroke-dasharray="4,3"/>`;

  // Thrust force arrow
  const thrustArrow = `<line x1="${cx}" y1="4" x2="${cx}" y2="26" stroke="#f59e0b" stroke-width="2.5"/>
                       <polygon points="${cx},32 ${cx-5},22 ${cx+5},22" fill="#f59e0b"/>
                       <text x="${cx + dw/2 + 8}" y="20" fill="#f59e0b" font-size="10.5" font-weight="700">Ff = ${thrustKn} кН</text>`;

  // Depth dimension line
  const dimX = 24;
  const dimLine = `<line x1="${dimX}" y1="${holeTop}" x2="${dimX}" y2="${holeBot}" stroke="${ldOk ? '#38bdf8' : '#ef4444'}" stroke-width="1.4"/>
                   <text x="${dimX - 4}" y="${(holeTop + holeBot)/2}" text-anchor="middle" fill="${ldOk ? '#38bdf8' : '#ef4444'}" font-size="10" font-weight="700" transform="rotate(-90 ${dimX - 4} ${(holeTop + holeBot)/2})">L=${depth} мм (${ld}xD)</text>`;

  // Right-side engineering summary box
  const subLabel = isU ? "U-сверло (СМП)" : (sub === "MODULAR_TIP" ? "Сменная коронка" : "Монолит ЦТ (вн. СОЖ)");
  const rightCard = `
    <rect x="236" y="16" width="174" height="214" rx="8" fill="var(--surface-2)" stroke="var(--border)"/>
    <text x="248" y="36" fill="var(--accent)" font-size="11" font-weight="800">${subLabel}</text>
    <text x="248" y="56" fill="var(--muted)" font-size="10.5">Диаметр / Точность:</text>
    <text x="248" y="71" fill="var(--text)" font-size="12" font-weight="700">Ø${dc} мм · ${c.tolerance_hole || "IT10"}</text>
    <text x="248" y="92" fill="var(--muted)" font-size="10.5">Вылет сверла / Факт:</text>
    <text x="248" y="107" fill="${ldOk ? '#22c55e' : '#ef4444'}" font-size="12" font-weight="700">${ld}xD / макс ${ldMax}xD</text>
    <text x="248" y="128" fill="var(--muted)" font-size="10.5">Давление СОЖ (факт / мин):</text>
    <text x="248" y="143" fill="${barOk ? '#22c55e' : '#ef4444'}" font-size="12" font-weight="700">${actBar} / ≥ ${reqBar} бар</text>
    <text x="248" y="164" fill="var(--muted)" font-size="10.5">Подача врезания fвх:</text>
    <text x="248" y="179" fill="var(--text)" font-size="12" font-weight="700">${p.entry_feed_mm} мм/об</text>
    <rect x="246" y="192" width="154" height="26" rx="6" fill="${p.pilot_hole_required ? 'rgba(245,158,11,0.18)' : 'rgba(34,197,94,0.16)'}" stroke="${p.pilot_hole_required ? '#f59e0b' : '#22c55e'}"/>
    <text x="323" y="209" text-anchor="middle" fill="${p.pilot_hole_required ? '#fbbf24' : '#4ade80'}" font-size="10.5" font-weight="800">${p.pilot_hole_required ? '⚠ НУЖЕН ПИЛОТ 2xD' : '✓ БЕЗ ПИЛОТА'}</text>
  `;

  svg.innerHTML = `${topSurface}${crossHole}${holeCutout}${drillBody}${jets}${thrustArrow}${dimLine}${rightCard}`;
  statusEl.innerHTML = (ldOk && barOk)
    ? `<span style="color:var(--green);font-weight:700;">● СОЖ и глубина в норме</span>`
    : `<span style="color:var(--amber);font-weight:700;">● Проверьте СОЖ / L/D</span>`;
}

// ============================================================================
// Tab 2: 3D Studio & STEP/IGES/STL Viewer
// ============================================================================
async function ensureViewer3D() {
  if (viewer3d) return viewer3d;
  if (typeof SKMViewer3D !== "function") return null;
  viewer3d = new SKMViewer3D({ mountId: "viewer3dMount", infoId: "viewer3dInfo", statusId: "viewer3dStatus" });
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
    <div class="spec-row"><span>Впис. окружность / W</span><b>${parsed.ic_mm} мм</b></div>
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
function toggle3dWireframe() { if (viewer3d) document.getElementById("btnWire3d").classList.toggle("active", viewer3d.toggleWireframe()); }
function toggle3dAxes() { if (viewer3d) document.getElementById("btnAxes3d").classList.toggle("active", viewer3d.toggleAxes()); }
function download3dSTL() { if (viewer3d) viewer3d.downloadCurrentSTL(document.getElementById("isoInput").value || "insert", state.apiLive, state.apiBase); }
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
function handleCadFileSelect(evt) { const f = evt.target.files && evt.target.files[0]; if (f) handleCadFile(f); evt.target.value = ""; }

function setup3dDragDrop() {
  const stage = document.getElementById("viewer3dStage");
  if (!stage) return;
  ["dragenter", "dragover"].forEach((ev) => stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach((ev) => stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.remove("dragover"); }));
  stage.addEventListener("drop", (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleCadFile(f); });
}

// ============================================================================
// Tab 3: Side-by-Side Comparison (with Taylor Economics & Stock)
// ============================================================================
function toggleCompare(id) {
  const idx = state.compareIds.indexOf(id);
  if (idx >= 0) state.compareIds.splice(idx, 1);
  else {
    if (state.compareIds.length >= 3) { showToast("Максимум 3 пластины в сравнении (удалите одну)."); return; }
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
function clearCompare() { state.compareIds = []; updateBadges(); renderCandidates(); renderCompareTable(); }

function renderCompareTable() {
  const wrap = document.getElementById("compareContent");
  const items = state.compareIds.map((id) => state.candidates.find((c) => c.insert_id === id)).filter(Boolean);
  if (!items.length) {
    wrap.innerHTML = `<div class="empty-state">Добавьте 2–3 пластины кнопкой <b>«+ Сравнить»</b> или нажмите <b>«Заполнить топ-3 автоматически»</b>.</div>`;
    return;
  }
  const bestScore = Math.max(...items.map((x) => x.score));
  const bestPartCost = Math.min(...items.map((x) => x.economics.total_cost_part_rub));
  const bestLife = Math.max(...items.map((x) => x.economics.tool_life_edge_min));
  const bestMrr = Math.max(...items.map((x) => x.physics.mrr_cm3_min));
  const minPower = Math.min(...items.map((x) => x.physics.power_motor_kw));
  const raVals = items.map((x) => x.physics.ra_um).filter((v) => v != null);
  const bestRa = raVals.length ? Math.min(...raVals) : null;

  const rows = [
    ["Оценка подбора", (c) => `${c.score} / 100`, (c) => c.score === bestScore],
    ["Наличие на складе", (c) => (c.stock_qty > 0 ? `${c.stock_qty} шт (${c.unit_price_rub} ₽)` : `Под заказ (${c.unit_price_rub} ₽)`), (c) => c.stock_qty > 0],
    ["Сплав и покрытие", (c) => `${c.grade_code} (${c.coating_method})`, () => false],
    ["Стружколом / кромка", (c) => `${c.chipbreaker_code} · ${c.edge_prep}`, () => false],
    ["Стойкость кромки (Тейлор)", (c) => `${c.economics.tool_life_edge_min} мин (${c.economics.parts_per_edge} дет.)`, (c) => c.economics.tool_life_edge_min === bestLife],
    ["Себестоимость детали", (c) => `${c.economics.total_cost_part_rub} ₽ (инстр. ${c.economics.tool_cost_part_rub} ₽)`, (c) => c.economics.total_cost_part_rub === bestPartCost],
    ["Стартовая скорость Vc", (c) => fmtVc(c.recommended_vc), () => false],
    ["Обороты / Подача Vf", (c) => `${c.physics.rpm_clamped} об/м · ${c.physics.vf_mm_min} мм/м`, () => false],
    ["Съём металла (MRR)", (c) => `${c.physics.mrr_cm3_min} см³/мин`, (c) => c.physics.mrr_cm3_min === bestMrr],
    ["Мощность шпинделя Pc", (c) => `${c.physics.power_motor_kw} кВт`, (c) => c.physics.power_motor_kw === minPower],
    ["Шероховатость Ra / Ось Z", (c) => (c.physics.axial_thrust_n != null ? `${(c.physics.axial_thrust_n / 1000).toFixed(2)} кН (${c.physics.recommended_cycle || "G81"})` : (c.physics.ra_um != null ? `${c.physics.ra_um} мкм` : "—")), (c) => bestRa != null && c.physics.ra_um === bestRa],
    ["Совместимый корпус", (c) => (c.holders[0] ? `${c.holders[0].code} (${c.holders[0].category})` : "—"), () => false],
  ];

  wrap.innerHTML = `
    <div class="table-scroll">
      <table class="compare-table">
        <thead>
          <tr>
            <th style="width:220px;">Параметр</th>
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
// Tab 4: Saved Tool Assemblies & CAM Exports (GTC ISO 13399 / Fusion 360 / FreeCAD / CSV / JSON)
// ============================================================================
async function saveAssemblyFromCandidate(id) {
  const c = state.candidates.find((x) => x.insert_id === id);
  if (!c) return;
  const sg = FALLBACK_DB.subgroups.find((s) => s.code === document.getElementById("subgroupSelect").value);
  const m = allMachines().find((x) => x.id === document.getElementById("machineSelect").value) || allMachines()[0];
  const h = c.holders[0] || { code: "GENERIC-HOLDER", category: state.op, z: 1 };
  let setup = {
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
    teeth_count: h.z || 1,
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
      tool_life_min: c.economics.tool_life_edge_min,
      part_cost_rub: c.economics.total_cost_part_rub,
      coolant: c.recommended_coolant,
    },
  };
  if (state.apiLive) {
    try {
      const r = await fetch(`${state.apiBase}/api/assemblies`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(setup),
      });
      if (r.ok) setup = await r.json();
    } catch {}
  }
  state.savedAssemblies.unshift(setup);
  localStorage.setItem(STORAGE_KEYS.assemblies, JSON.stringify(state.savedAssemblies));
  updateBadges();
  showToast(`Наладка «${c.iso_code}» сохранена`);
  if (state.activeTab === "setups") renderSavedAssemblies();
}

function deleteAssembly(id) {
  state.savedAssemblies = state.savedAssemblies.filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEYS.assemblies, JSON.stringify(state.savedAssemblies));
  if (state.apiLive) fetch(`${state.apiBase}/api/assemblies/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
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

function exportSetupsGTC() {
  if (!state.savedAssemblies.length) { showToast("Сначала сохраните хотя бы одну наладку."); return; }
  const gtc = {
    gtc_package_information: {
      gtc_version: "2.0",
      standard: "ISO 13399",
      generator: "SKM ISO Tooling Selector v1.0",
      created_utc: new Date().toISOString(),
      unit_system: "METRIC",
      item_count: state.savedAssemblies.length,
    },
    products: state.savedAssemblies.map((a, idx) => {
      const parsed = parseIsoClient(a.iso_code);
      return {
        product_id: `SKM-ASM-${String(idx + 1).padStart(3, "0")}`,
        designation: a.name,
        gtc_class: a.operation === "MILLING" ? "INDEXABLE_MILLING_CUTTER" : (a.operation === "DRILLING" ? "INDEXABLE_DRILL" : "TURNING_ASSEMBLY"),
        cutting_item: {
          ISO1832: a.iso_code, GRADE: a.grade_code, CHIPBREAKER: a.chipbreaker_code,
          POCKET_SIGNATURE: a.seat_pocket_signature,
          IC: parsed.ic_mm, S: parsed.thickness_mm, RE: parsed.corner_radius_mm, L: parsed.cutting_edge_length_mm, AN: parsed.clearance_angle_deg, NOE: parsed.cutting_edges_count,
        },
        tool_item: { DESIGNATION: a.holder_code, DC: a.params.diameter_mm, ZEP: a.teeth_count || 1 },
        cutting_data: { VC: a.params.vc_m_min, N: a.params.rpm, F: a.params.feed_mm, VF: a.params.vf_mm_min, AP: a.params.ap_mm, AE: a.params.ae_mm, COOLANT: a.params.coolant },
      };
    }),
  };
  downloadFile("skm_gtc_iso13399.json", JSON.stringify(gtc, null, 2), "application/json");
  showToast("Экспортирован пакет GTC ISO 13399 (JSON)");
}

function exportSetupsFusion360() {
  if (!state.savedAssemblies.length) { showToast("Сначала сохраните хотя бы одну наладку."); return; }
  const lib = {
    version: 23,
    data: state.savedAssemblies.map((a, idx) => {
      const parsed = parseIsoClient(a.iso_code);
      const fType = a.operation === "MILLING" ? "face mill" : (a.operation === "DRILLING" ? "drill" : (a.operation === "GROOVING_THREADING" ? "turning grooving" : "turning general"));
      return {
        guid: `skm-tool-${String(idx + 1).padStart(4, "0")}`,
        description: `${a.holder_code} / ${a.iso_code} (${a.grade_code})`,
        vendor: "ISO Generic (SKM)",
        "product-id": a.iso_code,
        type: fType,
        unit: "millimeters",
        geometry: { DC: a.params.diameter_mm, NOF: a.teeth_count || 1, RE: parsed.corner_radius_mm || 0.8, IC: parsed.ic_mm || 12.7, S: parsed.thickness_mm || 4.76, CSP: a.params.coolant !== "DRY" },
        "start-values": {
          presets: [{
            name: "SKM Recommended",
            v_c: a.params.vc_m_min, n: a.params.rpm, f_n: a.params.feed_mm, v_f: a.params.vf_mm_min,
            stepdown: a.params.ap_mm, stepover: a.params.ae_mm || +(a.params.diameter_mm * 0.5).toFixed(2),
            "tool-coolant": a.params.coolant !== "DRY" ? "flood" : "disabled",
          }],
        },
      };
    }),
  };
  downloadFile("skm_fusion360_library.tools", JSON.stringify(lib, null, 2), "application/json");
  showToast("Экспортирована библиотека Autodesk Fusion 360 (.tools)");
}

function exportSetupsCSV() {
  if (!state.savedAssemblies.length) { showToast("Сначала сохраните хотя бы одну наладку."); return; }
  const header = ["Название", "Операция", "Материал", "Станок", "Пластина ISO", "Сплав", "Стружколом", "Корпус", "Vc (м/мин)", "RPM", "Подача (мм)", "ap (мм)", "Мощность (кВт)", "Ra (мкм)", "Стойкость (мин)", "Себест. (₽/дет)", "СОЖ"];
  const lines = [header.join(";")];
  for (const a of state.savedAssemblies) {
    const p = a.params;
    lines.push([
      a.name, a.operation, a.material_code, a.machine_name, a.iso_code, a.grade_code,
      a.chipbreaker_code, a.holder_code, p.vc_m_min, p.rpm, p.feed_mm, p.ap_mm,
      p.power_kw, p.ra_um ?? "", p.tool_life_min ?? "", p.part_cost_rub ?? "", p.coolant,
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
      iso_code: a.iso_code, holder_code: a.holder_code, seat_pocket_signature: a.seat_pocket_signature,
      vc_m_min: a.params.vc_m_min, rpm: a.params.rpm, feed_mm: a.params.feed_mm,
    },
  };
  downloadFile(`${a.iso_code.replace(/\s+/g, "_")}.fctb`, JSON.stringify(fctb, null, 2), "application/json");
  showToast("Экспортирован файл FreeCAD .fctb");
}

function renderSavedAssemblies() {
  const grid = document.getElementById("setupsGrid");
  if (!state.savedAssemblies.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Нет сохранённых наладок. Нажмите <b>«★ Сохранить»</b> на любой карточке пластины, чтобы выгрузить её в <b>GTC ISO 13399</b>, <b>Fusion 360 (.tools)</b>, <b>FreeCAD (.fctb)</b>, Excel или PDF.</div>`;
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
          <span>Стойкость: <b>${a.params.tool_life_min ?? "—"} мин</b></span>
          <span>Себест./дет.: <b style="color:var(--green)">${a.params.part_cost_rub ?? "—"} ₽</b></span>
        </div>
        <div class="cand-actions no-print">
          <button class="mini-btn" onclick="exportFreeCadToolBit('${a.id}')">⬇ FreeCAD .fctb</button>
          <button class="mini-btn" onclick="window.print()">🖨 Карта наладки</button>
        </div>
      </div>`)
    .join("");
}

// ============================================================================
// Bootstrap & PWA Service Worker Registration
// ============================================================================
async function init() {
  setTheme(localStorage.getItem(STORAGE_KEYS.theme) === "light" ? "light" : "dark");
  try { state.customMachines = JSON.parse(localStorage.getItem(STORAGE_KEYS.machines) || "[]"); } catch { state.customMachines = []; }
  try { state.savedAssemblies = JSON.parse(localStorage.getItem(STORAGE_KEYS.assemblies) || "[]"); } catch { state.savedAssemblies = []; }
  try {
    const savedStock = JSON.parse(localStorage.getItem(STORAGE_KEYS.stock) || "null");
    state.stockItems = Array.isArray(savedStock) && savedStock.length ? savedStock : FALLBACK_DB.stock.map((s) => ({ ...s }));
  } catch {
    state.stockItems = FALLBACK_DB.stock.map((s) => ({ ...s }));
  }

  renderMachineSelect();
  populateSubgroups();
  applyUrlParams();
  updateSliderLabels();
  updateBadges();

  document.getElementById("cbChart").addEventListener("click", (e) => {
    if (state.op === "DRILLING") return;
    const svg = e.currentTarget, rect = svg.getBoundingClientRect();
    const xSvg = ((e.clientX - rect.left) / rect.width) * 420;
    const ySvg = ((e.clientY - rect.top) / rect.height) * 245;
    const padL = 44, padR = 16, padT = 14, padB = 30;
    const W = 420 - padL - padR, H = 245 - padT - padB;
    const f = Math.max(0.04, Math.min(state.chartBounds.fMax, ((xSvg - padL) / W) * state.chartBounds.fMax));
    const ap = Math.max(0.1, Math.min(state.chartBounds.apMax, ((padT + H - ySvg) / H) * state.chartBounds.apMax));
    document.getElementById("feedSlider").value = f.toFixed(2);
    document.getElementById("apSlider").value = ap.toFixed(1);
    onSliderChange();
  });

  const isStaticHost = window.location.protocol === "file:" || window.location.hostname.endsWith("github.io");
  const badge = document.getElementById("connBadge");
  const connText = document.getElementById("connText");

  if (isStaticHost) {
    state.apiLive = false;
    badge.classList.add("demo");
    connText.textContent = "Web Demo · v1.1 Axial";
  } else {
    try {
      const r = await fetch(`${state.apiBase}/api/health`, { signal: AbortSignal.timeout(1200) });
      if (r.ok) {
        state.apiLive = true;
        badge.classList.add("live");
        const metaRes = await fetch(`${state.apiBase}/api/catalog/meta`);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          connText.textContent = meta.storage_mode === "postgres" ? "FastAPI + PostgreSQL" : "FastAPI Live v1.1";
          if (meta.machines?.length) { FALLBACK_DB.machines = meta.machines; renderMachineSelect(); }
          if (meta.material_subgroups?.length) { FALLBACK_DB.subgroups = meta.material_subgroups; populateSubgroups(); }
        } else {
          connText.textContent = "FastAPI Live v1.1";
        }
      } else {
        badge.classList.add("demo");
        connText.textContent = "Web Demo · v1.1 Axial";
      }
    } catch {
      badge.classList.add("demo");
      connText.textContent = "Offline Engine (Client JS)";
    }
  }

  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  await handleIsoInput();
  await runSelection();
  if (state.activeTab !== "selector") switchTab(state.activeTab);
}

init();
