/**
 * SKM — ISO Tooling Selector Studio Frontend Controller (v2.1 Sales-First)
 * 100% standalone on GitHub Pages & offline PWA, plus live FastAPI + PostgreSQL sync.
 */

const FALLBACK_DB = {"subgroups": [{"code": "P1", "iso_group": "P", "name_ru": "Нелегированные стали (Ст20, Ст45, S355)", "kc1_1_mpa": 1500.0, "mc_exponent": 0.25, "hb": "125–190 HB"}, {"code": "P2", "iso_group": "P", "name_ru": "Низколегированные стали (40Х, 30ХГСА, 42CrMo4)", "kc1_1_mpa": 1700.0, "mc_exponent": 0.25, "hb": "180–275 HB"}, {"code": "P3", "iso_group": "P", "name_ru": "Высоколегированные и инструм. стали (Х12МФ, H13)", "kc1_1_mpa": 1950.0, "mc_exponent": 0.25, "hb": "250–330 HB"}, {"code": "M1", "iso_group": "M", "name_ru": "Аустенитные нерж. (12Х18Н10Т, AISI 304/316L)", "kc1_1_mpa": 1800.0, "mc_exponent": 0.21, "hb": "150–220 HB"}, {"code": "M2", "iso_group": "M", "name_ru": "Дуплексные нерж. (SAF 2205, 08Х22Н6Т)", "kc1_1_mpa": 2000.0, "mc_exponent": 0.21, "hb": "220–290 HB"}, {"code": "K1", "iso_group": "K", "name_ru": "Серый чугун (СЧ20, СЧ25, GG25)", "kc1_1_mpa": 1150.0, "mc_exponent": 0.28, "hb": "160–240 HB"}, {"code": "K2", "iso_group": "K", "name_ru": "Высокопрочный чугун ВЧ (ВЧ50, GGG50)", "kc1_1_mpa": 1350.0, "mc_exponent": 0.28, "hb": "180–270 HB"}, {"code": "N1", "iso_group": "N", "name_ru": "Алюминиевые сплавы (Д16Т, АМг6, 6061-T6)", "kc1_1_mpa": 450.0, "mc_exponent": 0.25, "hb": "60–120 HB"}, {"code": "N2", "iso_group": "N", "name_ru": "Медь и латунь (ЛС59-1, БрАЖ9-4)", "kc1_1_mpa": 750.0, "mc_exponent": 0.24, "hb": "70–140 HB"}, {"code": "S1", "iso_group": "S", "name_ru": "Никелевые суперсплавы (Inconel 718, ХН77ТЮР)", "kc1_1_mpa": 2600.0, "mc_exponent": 0.24, "hb": "260–380 HB"}, {"code": "S2", "iso_group": "S", "name_ru": "Титановые сплавы (ВТ6, Ti-6Al-4V)", "kc1_1_mpa": 1450.0, "mc_exponent": 0.23, "hb": "280–350 HB"}, {"code": "H1", "iso_group": "H", "name_ru": "Закалённые стали 48–58 HRC (Х12МФ, ШХ15, D2)", "kc1_1_mpa": 3200.0, "mc_exponent": 0.3, "hb": "48–58 HRC"}], "machines": [{"id": "m1", "name": "Токарно-фрезерный центр (BMT55)", "machine_type": "TURN_MILL", "max_rpm": 4500, "spindle_power_kw": 18.5, "max_torque_nm": 320.0, "base_rpm": 550, "coolant_pressure_bar": 20.0, "max_thrust_kn": 28.0, "rigidity_class": "HIGH"}, {"id": "m2", "name": "Вертикальный фрезерный ОЦ (BT40)", "machine_type": "MILL_3AX", "max_rpm": 12000, "spindle_power_kw": 15.0, "max_torque_nm": 95.0, "base_rpm": 1500, "coolant_pressure_bar": 25.0, "max_thrust_kn": 20.0, "rigidity_class": "MEDIUM"}, {"id": "m3", "name": "Универсальный токарный ЧПУ (лёгкий)", "machine_type": "LATHE", "max_rpm": 3000, "spindle_power_kw": 7.5, "max_torque_nm": 160.0, "base_rpm": 450, "coolant_pressure_bar": 10.0, "max_thrust_kn": 12.0, "rigidity_class": "LOW"}], "stock": [{"iso_code": "CNMG 120408", "grade_code": "GEN-P25-CVD", "qty": 40, "unit_price_rub": 620.0, "bin_location": "A-01-2", "supplier": "Склад-Основной"}, {"iso_code": "WNMG 080408", "grade_code": "GEN-P25-CVD", "qty": 60, "unit_price_rub": 690.0, "bin_location": "A-01-4", "supplier": "Склад-Основной"}, {"iso_code": "WNMG 080412", "grade_code": "GEN-P35-TOUGH", "qty": 20, "unit_price_rub": 740.0, "bin_location": "A-01-5", "supplier": "Склад-Основной"}, {"iso_code": "CNMG 120404", "grade_code": "GEN-M25-PVD", "qty": 30, "unit_price_rub": 710.0, "bin_location": "A-02-1", "supplier": "Склад-Основной"}, {"iso_code": "DNMG 150608", "grade_code": "GEN-P25-CVD", "qty": 25, "unit_price_rub": 820.0, "bin_location": "A-02-3", "supplier": "Склад-Основной"}, {"iso_code": "TNMG 160408", "grade_code": "GEN-P25-CVD", "qty": 50, "unit_price_rub": 540.0, "bin_location": "A-02-6", "supplier": "Склад-Основной"}, {"iso_code": "CCMT 09T304", "grade_code": "GEN-M25-PVD", "qty": 18, "unit_price_rub": 580.0, "bin_location": "B-01-1", "supplier": "Склад-Основной"}, {"iso_code": "CCGT 09T304-AL", "grade_code": "GEN-N10-UNC", "qty": 12, "unit_price_rub": 640.0, "bin_location": "B-01-2", "supplier": "Склад-Основной"}, {"iso_code": "APKT 160408", "grade_code": "GEN-PM30-MILL", "qty": 35, "unit_price_rub": 790.0, "bin_location": "C-01-1", "supplier": "Склад-Фрезы"}, {"iso_code": "SEKT 120408", "grade_code": "GEN-PM30-MILL", "qty": 24, "unit_price_rub": 850.0, "bin_location": "C-01-3", "supplier": "Склад-Фрезы"}, {"iso_code": "WCMX 050308", "grade_code": "GEN-DRL-CORE", "qty": 16, "unit_price_rub": 720.0, "bin_location": "D-01-1", "supplier": "Склад-Осевой"}, {"iso_code": "SPMG 090408", "grade_code": "GEN-DRL-UNIV", "qty": 22, "unit_price_rub": 840.0, "bin_location": "D-01-3", "supplier": "Склад-Осевой"}, {"iso_code": "MGMN 300", "grade_code": "GEN-M25-PVD", "qty": 30, "unit_price_rub": 610.0, "bin_location": "E-01-1", "supplier": "Склад-Канавки"}, {"iso_code": "16ER AG60", "grade_code": "GEN-M25-PVD", "qty": 15, "unit_price_rub": 760.0, "bin_location": "E-01-2", "supplier": "Склад-Резьба"}, {"iso_code": "SOMT 11T308", "grade_code": "GEN-DRL-UNIV", "qty": 20, "unit_price_rub": 920.0, "bin_location": "D-01-4", "supplier": "Склад-Осевой"}, {"iso_code": "WCMT 06T308", "grade_code": "GEN-DRL-CORE", "qty": 18, "unit_price_rub": 860.0, "bin_location": "D-01-5", "supplier": "Склад-Осевой"}, {"iso_code": "MOD-DRL-140", "grade_code": "GEN-DRL-UNIV", "qty": 6, "unit_price_rub": 2450.0, "bin_location": "D-02-1", "supplier": "Склад-Осевой"}, {"iso_code": "MOD-DRL-200", "grade_code": "GEN-DRL-UNIV", "qty": 4, "unit_price_rub": 3180.0, "bin_location": "D-02-2", "supplier": "Склад-Осевой"}, {"iso_code": "SC-DRL-080-5D", "grade_code": "GEN-PM30-MILL", "qty": 8, "unit_price_rub": 2750.0, "bin_location": "D-03-1", "supplier": "Склад-Осевой"}, {"iso_code": "SC-DRL-120-8D", "grade_code": "GEN-DRL-UNIV", "qty": 5, "unit_price_rub": 4150.0, "bin_location": "D-03-2", "supplier": "Склад-Осевой"}, {"iso_code": "TAP-M12-BL", "grade_code": "GEN-PM30-MILL", "qty": 10, "unit_price_rub": 1850.0, "bin_location": "F-01-1", "supplier": "Склад-Резьба"}, {"iso_code": "TAP-M10-TH", "grade_code": "GEN-PM30-MILL", "qty": 12, "unit_price_rub": 1520.0, "bin_location": "F-01-2", "supplier": "Склад-Резьба"}, {"iso_code": "FORM-M8", "grade_code": "GEN-N10-UNC", "qty": 8, "unit_price_rub": 1780.0, "bin_location": "F-01-3", "supplier": "Склад-Резьба"}, {"iso_code": "TM-M16", "grade_code": "GEN-S15-PVD", "qty": 4, "unit_price_rub": 3950.0, "bin_location": "F-02-1", "supplier": "Склад-Резьба"}, {"iso_code": "REAM-H7-100", "grade_code": "GEN-DRL-UNIV", "qty": 6, "unit_price_rub": 2890.0, "bin_location": "G-01-1", "supplier": "Склад-Точные"}, {"iso_code": "REAM-H7-200", "grade_code": "GEN-DRL-UNIV", "qty": 3, "unit_price_rub": 4200.0, "bin_location": "G-01-2", "supplier": "Склад-Точные"}, {"iso_code": "FBORE-MIC-25", "grade_code": "GEN-M25-PVD", "qty": 2, "unit_price_rub": 3450.0, "bin_location": "G-02-1", "supplier": "Склад-Точные"}], "threads": [{"code": "M3", "family": "M", "major_mm": 3.0, "pitch_mm": 0.5, "tpi": null, "cut_drill_mm": 2.5, "form_drill_mm": 2.75, "angle_deg": 60}, {"code": "M4", "family": "M", "major_mm": 4.0, "pitch_mm": 0.7, "tpi": null, "cut_drill_mm": 3.3, "form_drill_mm": 3.68, "angle_deg": 60}, {"code": "M5", "family": "M", "major_mm": 5.0, "pitch_mm": 0.8, "tpi": null, "cut_drill_mm": 4.2, "form_drill_mm": 4.62, "angle_deg": 60}, {"code": "M6", "family": "M", "major_mm": 6.0, "pitch_mm": 1.0, "tpi": null, "cut_drill_mm": 5.0, "form_drill_mm": 5.53, "angle_deg": 60}, {"code": "M8", "family": "M", "major_mm": 8.0, "pitch_mm": 1.25, "tpi": null, "cut_drill_mm": 6.8, "form_drill_mm": 7.42, "angle_deg": 60}, {"code": "M10", "family": "M", "major_mm": 10.0, "pitch_mm": 1.5, "tpi": null, "cut_drill_mm": 8.5, "form_drill_mm": 9.3, "angle_deg": 60}, {"code": "M12", "family": "M", "major_mm": 12.0, "pitch_mm": 1.75, "tpi": null, "cut_drill_mm": 10.2, "form_drill_mm": 11.18, "angle_deg": 60}, {"code": "M14", "family": "M", "major_mm": 14.0, "pitch_mm": 2.0, "tpi": null, "cut_drill_mm": 12.0, "form_drill_mm": 13.06, "angle_deg": 60}, {"code": "M16", "family": "M", "major_mm": 16.0, "pitch_mm": 2.0, "tpi": null, "cut_drill_mm": 14.0, "form_drill_mm": 15.06, "angle_deg": 60}, {"code": "M20", "family": "M", "major_mm": 20.0, "pitch_mm": 2.5, "tpi": null, "cut_drill_mm": 17.5, "form_drill_mm": 18.83, "angle_deg": 60}, {"code": "M24", "family": "M", "major_mm": 24.0, "pitch_mm": 3.0, "tpi": null, "cut_drill_mm": 21.0, "form_drill_mm": 22.6, "angle_deg": 60}, {"code": "M30", "family": "M", "major_mm": 30.0, "pitch_mm": 3.5, "tpi": null, "cut_drill_mm": 26.5, "form_drill_mm": 28.35, "angle_deg": 60}, {"code": "M8x1", "family": "MF", "major_mm": 8.0, "pitch_mm": 1.0, "tpi": null, "cut_drill_mm": 7.0, "form_drill_mm": 7.53, "angle_deg": 60}, {"code": "M10x1", "family": "MF", "major_mm": 10.0, "pitch_mm": 1.0, "tpi": null, "cut_drill_mm": 9.0, "form_drill_mm": 9.53, "angle_deg": 60}, {"code": "M10x1.25", "family": "MF", "major_mm": 10.0, "pitch_mm": 1.25, "tpi": null, "cut_drill_mm": 8.8, "form_drill_mm": 9.42, "angle_deg": 60}, {"code": "M12x1.25", "family": "MF", "major_mm": 12.0, "pitch_mm": 1.25, "tpi": null, "cut_drill_mm": 10.8, "form_drill_mm": 11.42, "angle_deg": 60}, {"code": "M12x1.5", "family": "MF", "major_mm": 12.0, "pitch_mm": 1.5, "tpi": null, "cut_drill_mm": 10.5, "form_drill_mm": 11.3, "angle_deg": 60}, {"code": "M16x1.5", "family": "MF", "major_mm": 16.0, "pitch_mm": 1.5, "tpi": null, "cut_drill_mm": 14.5, "form_drill_mm": 15.3, "angle_deg": 60}, {"code": "M20x1.5", "family": "MF", "major_mm": 20.0, "pitch_mm": 1.5, "tpi": null, "cut_drill_mm": 18.5, "form_drill_mm": 19.3, "angle_deg": 60}, {"code": "M24x1.5", "family": "MF", "major_mm": 24.0, "pitch_mm": 1.5, "tpi": null, "cut_drill_mm": 22.5, "form_drill_mm": 23.3, "angle_deg": 60}, {"code": "G1/8", "family": "G", "major_mm": 9.728, "pitch_mm": 0.907, "tpi": 28.0, "cut_drill_mm": 8.8, "form_drill_mm": 9.25, "angle_deg": 55}, {"code": "G1/4", "family": "G", "major_mm": 13.157, "pitch_mm": 1.337, "tpi": 19.0, "cut_drill_mm": 11.8, "form_drill_mm": 12.45, "angle_deg": 55}, {"code": "G3/8", "family": "G", "major_mm": 16.662, "pitch_mm": 1.337, "tpi": 19.0, "cut_drill_mm": 15.25, "form_drill_mm": 15.95, "angle_deg": 55}, {"code": "G1/2", "family": "G", "major_mm": 20.955, "pitch_mm": 1.814, "tpi": 14.0, "cut_drill_mm": 19.0, "form_drill_mm": 20.0, "angle_deg": 55}, {"code": "G3/4", "family": "G", "major_mm": 26.441, "pitch_mm": 1.814, "tpi": 14.0, "cut_drill_mm": 24.5, "form_drill_mm": 25.5, "angle_deg": 55}, {"code": "G1", "family": "G", "major_mm": 33.249, "pitch_mm": 2.309, "tpi": 11.0, "cut_drill_mm": 30.75, "form_drill_mm": 32.0, "angle_deg": 55}, {"code": "NPT 1/8", "family": "NPT", "major_mm": 10.287, "pitch_mm": 0.941, "tpi": 27.0, "cut_drill_mm": 8.5, "form_drill_mm": null, "angle_deg": 60}, {"code": "NPT 1/4", "family": "NPT", "major_mm": 13.716, "pitch_mm": 1.411, "tpi": 18.0, "cut_drill_mm": 11.1, "form_drill_mm": null, "angle_deg": 60}, {"code": "NPT 3/8", "family": "NPT", "major_mm": 17.145, "pitch_mm": 1.411, "tpi": 18.0, "cut_drill_mm": 14.5, "form_drill_mm": null, "angle_deg": 60}, {"code": "NPT 1/2", "family": "NPT", "major_mm": 21.336, "pitch_mm": 1.814, "tpi": 14.0, "cut_drill_mm": 17.8, "form_drill_mm": null, "angle_deg": 60}, {"code": "NPT 3/4", "family": "NPT", "major_mm": 26.67, "pitch_mm": 1.814, "tpi": 14.0, "cut_drill_mm": 23.0, "form_drill_mm": null, "angle_deg": 60}, {"code": "NPT 1", "family": "NPT", "major_mm": 33.401, "pitch_mm": 2.209, "tpi": 11.5, "cut_drill_mm": 29.0, "form_drill_mm": null, "angle_deg": 60}], "inserts": [{"insert_id": "ins-1", "iso_code": "CNMG 120408", "operation_domain": "TURNING", "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN", "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 6, "wear": 8, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.0, "seat_pocket_signature": "C-N-1270-476-G", "suitability": {"P": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.2, 4.0], [0.15, 2.2]], "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.3, "ap": 2.5, "coolant": "FLOOD"}, "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"}, "P3": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.24, "ap": 2.0, "coolant": "FLOOD"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-2", "iso_code": "CNMG 120404", "operation_domain": "TURNING", "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 8, "wear": 6, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 1.15, "seat_pocket_signature": "C-N-1270-476-G", "suitability": {"M": "PRIMARY", "S": "PRIMARY", "P": "SECONDARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"M1": {"vc": 165.0, "vc_min": 120.0, "vc_max": 210.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"}, "M2": {"vc": 125.0, "vc_min": 90.0, "vc_max": 160.0, "feed": 0.14, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 55.0, "vc_min": 40.0, "vc_max": 75.0, "feed": 0.12, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"}, "P1": {"vc": 230.0, "vc_min": 180.0, "vc_max": 280.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-3", "iso_code": "CCMT 09T304", "operation_domain": "TURNING", "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 8, "wear": 6, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 0.9, "seat_pocket_signature": "C-C-953-397-T", "suitability": {"M": "PRIMARY", "S": "PRIMARY", "P": "SECONDARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "S20R-SCLCR 09", "category": "BORING_BAR", "lead_angle_deg": 95.0, "clamping": "SCREW"}], "recs": {"M1": {"vc": 155.0, "vc_min": 110.0, "vc_max": 195.0, "feed": 0.14, "ap": 0.8, "coolant": "FLOOD"}, "P1": {"vc": 220.0, "vc_min": 160.0, "vc_max": 270.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"}, "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 68.0, "feed": 0.1, "ap": 0.6, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-7", "iso_code": "WNMG 080408", "operation_domain": "TURNING", "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN", "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 6, "wear": 8, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.05, "seat_pocket_signature": "W-N-1270-476-G", "suitability": {"P": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.2, 4.0], [0.15, 2.2]], "holders": [{"code": "PWLNR 2525M 08", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.3, "ap": 2.5, "coolant": "FLOOD"}, "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"}, "P3": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.24, "ap": 2.0, "coolant": "FLOOD"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-8", "iso_code": "WNMG 080412", "operation_domain": "TURNING", "grade_code": "GEN-P35-TOUGH", "coating_method": "CVD", "coating_composition": "MT-TiCN-Al2O3", "chipbreaker_code": "GEN-PR", "application_class": "ROUGHING", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 6, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 1.2, "relative_cost": 1.12, "seat_pocket_signature": "W-N-1270-476-G", "suitability": {"P": "PRIMARY", "M": "SECONDARY"}, "operating_zone_polygon": [[0.25, 1.8], [0.35, 1.5], [0.65, 2.0], [0.58, 6.5], [0.3, 6.0], [0.25, 3.5]], "holders": [{"code": "PWLNR 2525M 08", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 245.0, "vc_min": 180.0, "vc_max": 310.0, "feed": 0.42, "ap": 3.8, "coolant": "FLOOD"}, "P2": {"vc": 205.0, "vc_min": 150.0, "vc_max": 260.0, "feed": 0.38, "ap": 3.5, "coolant": "FLOOD"}, "M1": {"vc": 145.0, "vc_min": 110.0, "vc_max": 180.0, "feed": 0.32, "ap": 3.0, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-9", "iso_code": "DNMG 150608", "operation_domain": "TURNING", "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN", "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 6, "wear": 8, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.25, "seat_pocket_signature": "D-N-1270-635-G", "suitability": {"P": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.2, 4.0], [0.15, 2.2]], "holders": [{"code": "PDJNR 2525M 15", "category": "TURNING_EXTERNAL", "lead_angle_deg": 93.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.3, "ap": 2.5, "coolant": "FLOOD"}, "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-10", "iso_code": "VNMG 160404", "operation_domain": "TURNING", "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 7, "wear": 8, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 1.35, "seat_pocket_signature": "V-N-953-476-G", "suitability": {"S": "PRIMARY", "M": "PRIMARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "MVJNR 2525M 16", "category": "TURNING_EXTERNAL", "lead_angle_deg": 93.0, "clamping": "TOP_CLAMP"}], "recs": {"S1": {"vc": 40.0, "vc_min": 25.0, "vc_max": 55.0, "feed": 0.12, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.14, "ap": 1.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 175.0, "vc_min": 130.0, "vc_max": 220.0, "feed": 0.15, "ap": 1.0, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-11", "iso_code": "SNMG 120412", "operation_domain": "TURNING", "grade_code": "GEN-K15-CVD", "coating_method": "CVD", "coating_composition": "Thick Al2O3-TiCN", "chipbreaker_code": "GEN-KR", "application_class": "ROUGHING", "edge_prep": "CHAMFERED", "toughness": 5, "wear": 9, "cutting_edges_count": 8, "has_wiper_geometry": false, "corner_radius_mm": 1.2, "relative_cost": 1.1, "seat_pocket_signature": "S-N-1270-476-G", "suitability": {"K": "PRIMARY", "P": "SECONDARY"}, "operating_zone_polygon": [[0.2, 1.0], [0.6, 1.2], [0.55, 6.0], [0.2, 5.5]], "holders": [{"code": "PSBNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 75.0, "clamping": "LEVER"}], "recs": {"K1": {"vc": 340.0, "vc_min": 260.0, "vc_max": 420.0, "feed": 0.35, "ap": 3.0, "coolant": "DRY"}, "K2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.32, "ap": 2.8, "coolant": "FLOOD"}, "P1": {"vc": 270.0, "vc_min": 210.0, "vc_max": 330.0, "feed": 0.34, "ap": 3.0, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-12", "iso_code": "DCMT 11T304", "operation_domain": "TURNING", "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 7, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 0.95, "seat_pocket_signature": "D-C-953-397-T", "suitability": {"N": "PRIMARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "S16Q-SDUCR 11", "category": "BORING_BAR", "lead_angle_deg": 93.0, "clamping": "SCREW"}], "recs": {"N1": {"vc": 700.0, "vc_min": 450.0, "vc_max": 1000.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"}, "N2": {"vc": 320.0, "vc_min": 220.0, "vc_max": 450.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-13", "iso_code": "CNGA 120408", "operation_domain": "TURNING", "grade_code": "GEN-H10-CBN", "coating_method": "PVD", "coating_composition": "TiAlN-CBN", "chipbreaker_code": "GEN-HCBN", "application_class": "FINISHING", "edge_prep": "CHAMFERED", "toughness": 3, "wear": 10, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 4.8, "seat_pocket_signature": "C-N-1270-476-A", "suitability": {"H": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.05, 0.1], [0.12, 0.08], [0.18, 0.15], [0.16, 0.8], [0.06, 0.65]], "holders": [{"code": "PCLNR 2525M 12", "category": "TURNING_EXTERNAL", "lead_angle_deg": 95.0, "clamping": "LEVER"}], "recs": {"H1": {"vc": 155.0, "vc_min": 110.0, "vc_max": 200.0, "feed": 0.1, "ap": 0.25, "coolant": "DRY"}, "K1": {"vc": 480.0, "vc_min": 350.0, "vc_max": 620.0, "feed": 0.14, "ap": 0.4, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-4", "iso_code": "APKT 160408", "operation_domain": "MILLING", "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN", "chipbreaker_code": "GEN-GM", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": true, "corner_radius_mm": 0.8, "relative_cost": 1.2, "seat_pocket_signature": "A-P-953-476-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.08, 0.5], [0.22, 0.8], [0.18, 10.0], [0.08, 8.0]], "holders": [{"code": "SHM-AP16-D50-Z5", "category": "SHOULDER_MILL", "lead_angle_deg": 90.0, "dc_mm": 50.0, "z": 5, "clamping": "SCREW"}], "recs": {"P1": {"vc": 210.0, "vc_min": 160.0, "vc_max": 260.0, "feed": 0.15, "ap": 3.5, "ae_ratio": 0.5, "coolant": "AIR_BLAST"}, "P2": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.14, "ap": 3.0, "ae_ratio": 0.5, "coolant": "AIR_BLAST"}, "M1": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.12, "ap": 2.5, "ae_ratio": 0.4, "coolant": "FLOOD"}, "K1": {"vc": 220.0, "vc_min": 170.0, "vc_max": 270.0, "feed": 0.16, "ap": 4.0, "ae_ratio": 0.6, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-5", "iso_code": "APKT 160408-AL", "operation_domain": "MILLING", "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron", "chipbreaker_code": "GEN-AL", "application_class": "ALUMINUM_SHARP", "edge_prep": "SHARP", "toughness": 7, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": true, "corner_radius_mm": 0.8, "relative_cost": 1.25, "seat_pocket_signature": "A-P-953-476-T", "suitability": {"N": "PRIMARY"}, "operating_zone_polygon": [[0.05, 0.5], [0.25, 1.0], [0.2, 12.0], [0.05, 10.0]], "holders": [{"code": "SHM-AP16-D50-Z5", "category": "SHOULDER_MILL", "lead_angle_deg": 90.0, "dc_mm": 50.0, "z": 5, "clamping": "SCREW"}], "recs": {"N1": {"vc": 650.0, "vc_min": 400.0, "vc_max": 900.0, "feed": 0.15, "ap": 4.0, "ae_ratio": 0.6, "coolant": "FLOOD"}, "N2": {"vc": 320.0, "vc_min": 220.0, "vc_max": 420.0, "feed": 0.14, "ap": 3.0, "ae_ratio": 0.55, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-14", "iso_code": "SEKT 120408", "operation_domain": "MILLING", "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN", "chipbreaker_code": "GEN-FM45", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 4, "has_wiper_geometry": true, "corner_radius_mm": 0.8, "relative_cost": 1.3, "seat_pocket_signature": "S-E-1270-476-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.1, 0.5], [0.3, 0.8], [0.26, 5.5], [0.1, 5.0]], "holders": [{"code": "FM45-SE12-D80-Z6", "category": "FACE_MILL", "lead_angle_deg": 45.0, "dc_mm": 80.0, "z": 6, "clamping": "SCREW"}], "recs": {"P1": {"vc": 235.0, "vc_min": 180.0, "vc_max": 290.0, "feed": 0.22, "ap": 3.0, "ae_ratio": 0.65, "coolant": "AIR_BLAST"}, "P2": {"vc": 200.0, "vc_min": 155.0, "vc_max": 250.0, "feed": 0.19, "ap": 2.8, "ae_ratio": 0.65, "coolant": "AIR_BLAST"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.24, "ap": 3.5, "ae_ratio": 0.7, "coolant": "DRY"}, "M1": {"vc": 145.0, "vc_min": 110.0, "vc_max": 180.0, "feed": 0.16, "ap": 2.5, "ae_ratio": 0.55, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-15", "iso_code": "RDMT 120400", "operation_domain": "MILLING", "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano", "chipbreaker_code": "GEN-RND", "application_class": "ROUGHING", "edge_prep": "HONED", "toughness": 7, "wear": 8, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 6.0, "relative_cost": 1.4, "seat_pocket_signature": "R-D-1200-476-T", "suitability": {"S": "PRIMARY", "M": "PRIMARY"}, "operating_zone_polygon": [[0.12, 0.5], [0.35, 0.8], [0.3, 5.0], [0.12, 4.5]], "holders": [{"code": "CM-RD12-D50-Z4", "category": "COPY_MILL", "lead_angle_deg": 45.0, "dc_mm": 50.0, "z": 4, "clamping": "SCREW"}], "recs": {"S1": {"vc": 38.0, "vc_min": 25.0, "vc_max": 52.0, "feed": 0.2, "ap": 1.5, "ae_ratio": 0.35, "coolant": "FLOOD"}, "S2": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.22, "ap": 2.0, "ae_ratio": 0.4, "coolant": "FLOOD"}, "M1": {"vc": 150.0, "vc_min": 110.0, "vc_max": 190.0, "feed": 0.24, "ap": 2.5, "ae_ratio": 0.5, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-6", "iso_code": "WCMX 050308", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-CORE", "coating_method": "PVD", "coating_composition": "TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 9, "wear": 5, "cutting_edges_count": 3, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.1, "seat_pocket_signature": "W-C-794-318-X", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-WCMX05-D26-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 26.0, "z": 1, "ld_ratio_max": 3.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 160.0, "vc_min": 120.0, "vc_max": 200.0, "feed": 0.11, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 110.0, "vc_min": 80.0, "vc_max": 140.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 3.0, "tolerance_hole": "IT11"}, {"insert_id": "ins-16", "iso_code": "SPMG 07T308", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.15, "seat_pocket_signature": "S-P-794-397-G", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-SPMG07-D22-4D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 22.0, "z": 1, "ld_ratio_max": 4.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 155.0, "vc_min": 115.0, "vc_max": 195.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 200.0, "vc_min": 150.0, "vc_max": 250.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 65.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 4.0, "tolerance_hole": "IT11"}, {"insert_id": "ins-17", "iso_code": "SPMG 090408", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.3, "seat_pocket_signature": "S-P-953-476-G", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-SPMG09-D32-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 32.0, "z": 1, "ld_ratio_max": 3.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 155.0, "vc_min": 115.0, "vc_max": 195.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 200.0, "vc_min": 150.0, "vc_max": 250.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 50.0, "vc_min": 35.0, "vc_max": 65.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 3.0, "tolerance_hole": "IT11"}, {"insert_id": "ins-18", "iso_code": "TNMG 160408", "operation_domain": "TURNING", "grade_code": "GEN-P25-CVD", "coating_method": "CVD", "coating_composition": "TiCN-Al2O3-TiN", "chipbreaker_code": "GEN-PM", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 6, "wear": 8, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 0.88, "seat_pocket_signature": "T-N-953-476-G", "suitability": {"P": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.2, 4.0], [0.15, 2.2]], "holders": [{"code": "PTJNR 2525M 16", "category": "TURNING_EXTERNAL", "lead_angle_deg": 93.0, "clamping": "LEVER"}], "recs": {"P1": {"vc": 290.0, "vc_min": 220.0, "vc_max": 360.0, "feed": 0.3, "ap": 2.5, "coolant": "FLOOD"}, "P2": {"vc": 240.0, "vc_min": 180.0, "vc_max": 300.0, "feed": 0.28, "ap": 2.2, "coolant": "FLOOD"}, "P3": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.24, "ap": 2.0, "coolant": "FLOOD"}, "K1": {"vc": 260.0, "vc_min": 200.0, "vc_max": 320.0, "feed": 0.32, "ap": 2.5, "coolant": "DRY"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-19", "iso_code": "CCGT 09T304-AL", "operation_domain": "TURNING", "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron", "chipbreaker_code": "GEN-MF", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 7, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 1.02, "seat_pocket_signature": "C-C-953-397-T", "suitability": {"N": "PRIMARY"}, "operating_zone_polygon": [[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.1, 1.6]], "holders": [{"code": "S20R-SCLCR 09", "category": "BORING_BAR", "lead_angle_deg": 95.0, "clamping": "SCREW"}], "recs": {"N1": {"vc": 700.0, "vc_min": 450.0, "vc_max": 1000.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"}, "N2": {"vc": 320.0, "vc_min": 220.0, "vc_max": 450.0, "feed": 0.16, "ap": 1.0, "coolant": "FLOOD"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-20", "iso_code": "MGMN 300", "operation_domain": "GROOVING_THREADING", "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN", "chipbreaker_code": "GEN-GRV", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 6, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.2, "relative_cost": 0.98, "seat_pocket_signature": "L-N-300-476-N", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "S": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.05, 1.5], [0.22, 2.0], [0.2, 4.0], [0.05, 3.8]], "holders": [{"code": "MGEHR 2525-3", "category": "GROOVING_HOLDER", "lead_angle_deg": 90.0, "clamping": "TOP_CLAMP"}], "recs": {"P1": {"vc": 150.0, "vc_min": 110.0, "vc_max": 190.0, "feed": 0.1, "ap": 3.0, "coolant": "FLOOD"}, "P2": {"vc": 125.0, "vc_min": 90.0, "vc_max": 160.0, "feed": 0.09, "ap": 3.0, "coolant": "FLOOD"}, "M1": {"vc": 115.0, "vc_min": 80.0, "vc_max": 145.0, "feed": 0.08, "ap": 3.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 45.0, "vc_min": 30.0, "vc_max": 60.0, "feed": 0.07, "ap": 3.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-21", "iso_code": "16ER AG60", "operation_domain": "GROOVING_THREADING", "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN", "chipbreaker_code": "GEN-GRV", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 6, "cutting_edges_count": 3, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 1.22, "seat_pocket_signature": "T-N-953-397-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "S": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [[0.05, 0.5], [0.25, 0.8], [0.22, 3.0], [0.05, 2.8]], "holders": [{"code": "SER 2525M 16", "category": "GROOVING_HOLDER", "lead_angle_deg": 90.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 145.0, "vc_min": 100.0, "vc_max": 180.0, "feed": 0.12, "ap": 1.5, "coolant": "FLOOD"}, "P2": {"vc": 120.0, "vc_min": 85.0, "vc_max": 155.0, "feed": 0.1, "ap": 1.5, "coolant": "FLOOD"}, "M1": {"vc": 105.0, "vc_min": 75.0, "vc_max": 135.0, "feed": 0.1, "ap": 1.5, "coolant": "FLOOD"}, "S2": {"vc": 40.0, "vc_min": 28.0, "vc_max": 55.0, "feed": 0.08, "ap": 1.2, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": null, "point_angle_deg": null, "ld_ratio_max": null, "tolerance_hole": null}, {"insert_id": "ins-22", "iso_code": "SOMT 11T308", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 7, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.45, "seat_pocket_signature": "S-O-1100-397-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-SOMT11-D40-3D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 40.0, "z": 1, "ld_ratio_max": 3.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 185.0, "vc_min": 140.0, "vc_max": 230.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 155.0, "vc_min": 115.0, "vc_max": 195.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 200.0, "vc_min": 150.0, "vc_max": 250.0, "feed": 0.16, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 48.0, "vc_min": 35.0, "vc_max": 62.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 3.0, "tolerance_hole": "IT11"}, {"insert_id": "ins-23", "iso_code": "WCMT 06T308", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-CORE", "coating_method": "PVD", "coating_composition": "TiAlN", "chipbreaker_code": "GEN-DRL", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 9, "wear": 6, "cutting_edges_count": 3, "has_wiper_geometry": false, "corner_radius_mm": 0.8, "relative_cost": 1.35, "seat_pocket_signature": "W-C-953-397-T", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY", "N": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "UDRL-WCMT06-D30-5D", "category": "INDEXABLE_DRILL", "lead_angle_deg": 90.0, "dc_mm": 30.0, "z": 1, "ld_ratio_max": 5.0, "clamping": "SCREW"}], "recs": {"P1": {"vc": 165.0, "vc_min": 120.0, "vc_max": 205.0, "feed": 0.11, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 110.0, "vc_min": 80.0, "vc_max": 140.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 180.0, "vc_min": 135.0, "vc_max": 220.0, "feed": 0.13, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "N1": {"vc": 320.0, "vc_min": 220.0, "vc_max": 420.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "INDEXABLE_U_DRILL", "point_angle_deg": 180.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT11"}, {"insert_id": "ins-24", "iso_code": "MOD-DRL-140", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL-MOD", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 8, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.2, "relative_cost": 3.8, "seat_pocket_signature": "DRL-M-1400-672-B", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "MOD-BODY-D14-5D", "category": "MODULAR_DRILL", "lead_angle_deg": 70.0, "dc_mm": 14.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "BAYONET"}], "recs": {"P1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.24, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 100.0, "vc_min": 75.0, "vc_max": 130.0, "feed": 0.22, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 70.0, "vc_min": 50.0, "vc_max": 90.0, "feed": 0.18, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.3, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 38.0, "vc_min": 25.0, "vc_max": 50.0, "feed": 0.14, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "MODULAR_TIP", "point_angle_deg": 140.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT9"}, {"insert_id": "ins-25", "iso_code": "MOD-DRL-200", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL-MOD", "application_class": "MEDIUM", "edge_prep": "HONED", "toughness": 8, "wear": 8, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.2, "relative_cost": 4.9, "seat_pocket_signature": "DRL-M-2000-960-B", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "MOD-BODY-D20-8D", "category": "MODULAR_DRILL", "lead_angle_deg": 70.0, "dc_mm": 20.0, "z": 2, "ld_ratio_max": 8.0, "clamping": "BAYONET"}], "recs": {"P1": {"vc": 115.0, "vc_min": 85.0, "vc_max": 145.0, "feed": 0.26, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 95.0, "vc_min": 70.0, "vc_max": 125.0, "feed": 0.24, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.19, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 130.0, "vc_min": 95.0, "vc_max": 165.0, "feed": 0.32, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 36.0, "vc_min": 25.0, "vc_max": 48.0, "feed": 0.15, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "MODULAR_TIP", "point_angle_deg": 140.0, "ld_ratio_max": 8.0, "tolerance_hole": "IT9"}, {"insert_id": "ins-26", "iso_code": "SC-DRL-080-5D", "operation_domain": "DRILLING", "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN", "chipbreaker_code": "GEN-DRL-SC", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 8, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 4.2, "seat_pocket_signature": "DRL-S-800-500-I", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "HYD-CHUCK-D08-5D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 70.0, "dc_mm": 8.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "INTEGRAL"}], "recs": {"P1": {"vc": 115.0, "vc_min": 85.0, "vc_max": 145.0, "feed": 0.2, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 95.0, "vc_min": 70.0, "vc_max": 120.0, "feed": 0.18, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.15, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 130.0, "vc_min": 95.0, "vc_max": 165.0, "feed": 0.24, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 38.0, "vc_min": 25.0, "vc_max": 50.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 140.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT8"}, {"insert_id": "ins-27", "iso_code": "SC-DRL-120-8D", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-DRL-SC", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 8, "wear": 8, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 6.4, "seat_pocket_signature": "DRL-S-1200-800-I", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "S": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "HYD-CHUCK-D12-8D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 70.0, "dc_mm": 12.0, "z": 2, "ld_ratio_max": 8.0, "clamping": "INTEGRAL"}], "recs": {"P1": {"vc": 105.0, "vc_min": 80.0, "vc_max": 130.0, "feed": 0.22, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 88.0, "vc_min": 65.0, "vc_max": 110.0, "feed": 0.19, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 60.0, "vc_min": 45.0, "vc_max": 80.0, "feed": 0.16, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 120.0, "vc_min": 90.0, "vc_max": 150.0, "feed": 0.25, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 34.0, "vc_min": 24.0, "vc_max": 45.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 140.0, "ld_ratio_max": 8.0, "tolerance_hole": "IT8"}, {"insert_id": "ins-28", "iso_code": "SC-DRL-100-AL", "operation_domain": "DRILLING", "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron", "chipbreaker_code": "GEN-DRL-AL", "application_class": "ALUMINUM_SHARP", "edge_prep": "SHARP", "toughness": 7, "wear": 7, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 4.6, "seat_pocket_signature": "DRL-S-1000-500-I", "suitability": {"N": "PRIMARY"}, "operating_zone_polygon": [], "holders": [{"code": "HYD-CHUCK-D10-5D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 65.0, "dc_mm": 10.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "INTEGRAL"}], "recs": {"N1": {"vc": 260.0, "vc_min": 180.0, "vc_max": 360.0, "feed": 0.26, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "N2": {"vc": 160.0, "vc_min": 110.0, "vc_max": 220.0, "feed": 0.2, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 130.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT8"}, {"insert_id": "ins-29", "iso_code": "SC-DRL-060-H", "operation_domain": "DRILLING", "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano", "chipbreaker_code": "GEN-DRL-SC", "application_class": "MEDIUM", "edge_prep": "CHAMFERED_HONED", "toughness": 7, "wear": 9, "cutting_edges_count": 2, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 4.9, "seat_pocket_signature": "DRL-S-600-500-I", "suitability": {"H": "PRIMARY", "S": "PRIMARY", "M": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "SHRINK-FIT-D06-5D", "category": "SOLID_CARBIDE_DRILL", "lead_angle_deg": 70.0, "dc_mm": 6.0, "z": 2, "ld_ratio_max": 5.0, "clamping": "INTEGRAL"}], "recs": {"H1": {"vc": 32.0, "vc_min": 20.0, "vc_max": 45.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S1": {"vc": 22.0, "vc_min": 15.0, "vc_max": 32.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S2": {"vc": 42.0, "vc_min": 28.0, "vc_max": 58.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 62.0, "vc_min": 45.0, "vc_max": 82.0, "feed": 0.13, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "SOLID_CARBIDE", "point_angle_deg": 140.0, "ld_ratio_max": 5.0, "tolerance_hole": "IT8"}, {"insert_id": "ins-30", "iso_code": "TAP-M12-BL", "operation_domain": "DRILLING", "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN", "chipbreaker_code": "GEN-TAP-TM", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 9, "wear": 7, "cutting_edges_count": 3, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 2.9, "seat_pocket_signature": "TAP-T-1200-100-I", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "SYNCHRO-TAP-M12", "category": "TAP_HOLDER", "lead_angle_deg": 90.0, "dc_mm": 12.0, "z": 3, "ld_ratio_max": 2.5, "clamping": "INTEGRAL"}], "recs": {"P1": {"vc": 16.0, "vc_min": 10.0, "vc_max": 22.0, "feed": 1.75, "ap": 0.0, "coolant": "FLOOD"}, "P2": {"vc": 13.0, "vc_min": 8.0, "vc_max": 18.0, "feed": 1.75, "ap": 0.0, "coolant": "FLOOD"}, "M1": {"vc": 9.0, "vc_min": 6.0, "vc_max": 13.0, "feed": 1.75, "ap": 0.0, "coolant": "FLOOD"}, "K1": {"vc": 18.0, "vc_min": 12.0, "vc_max": 25.0, "feed": 1.75, "ap": 0.0, "coolant": "FLOOD"}}, "axial_subtype": "TAP_THREAD_MILL", "point_angle_deg": 140.0, "ld_ratio_max": 2.5, "tolerance_hole": "6H"}, {"insert_id": "ins-31", "iso_code": "TAP-M10-TH", "operation_domain": "DRILLING", "grade_code": "GEN-PM30-MILL", "coating_method": "PVD", "coating_composition": "TiAlSiN", "chipbreaker_code": "GEN-TAP-TM", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 9, "wear": 7, "cutting_edges_count": 3, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 2.4, "seat_pocket_signature": "TAP-T-1000-100-I", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "SYNCHRO-TAP-M10", "category": "TAP_HOLDER", "lead_angle_deg": 90.0, "dc_mm": 10.0, "z": 3, "ld_ratio_max": 3.0, "clamping": "INTEGRAL"}], "recs": {"P1": {"vc": 18.0, "vc_min": 12.0, "vc_max": 24.0, "feed": 1.5, "ap": 0.0, "coolant": "FLOOD"}, "P2": {"vc": 14.0, "vc_min": 9.0, "vc_max": 19.0, "feed": 1.5, "ap": 0.0, "coolant": "FLOOD"}, "M1": {"vc": 10.0, "vc_min": 6.0, "vc_max": 14.0, "feed": 1.5, "ap": 0.0, "coolant": "FLOOD"}, "K1": {"vc": 20.0, "vc_min": 14.0, "vc_max": 26.0, "feed": 1.5, "ap": 0.0, "coolant": "FLOOD"}}, "axial_subtype": "TAP_THREAD_MILL", "point_angle_deg": 140.0, "ld_ratio_max": 3.0, "tolerance_hole": "6H"}, {"insert_id": "ins-32", "iso_code": "FORM-M8", "operation_domain": "DRILLING", "grade_code": "GEN-N10-UNC", "coating_method": "UNCOATED", "coating_composition": "Polished Submicron", "chipbreaker_code": "GEN-TAP-TM", "application_class": "FINISHING", "edge_prep": "HONED", "toughness": 9, "wear": 8, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 2.75, "seat_pocket_signature": "TAP-F-800-100-I", "suitability": {"N": "PRIMARY", "P": "SECONDARY", "M": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "SYNCHRO-FORM-M8", "category": "TAP_HOLDER", "lead_angle_deg": 90.0, "dc_mm": 8.0, "z": 4, "ld_ratio_max": 3.0, "clamping": "INTEGRAL"}], "recs": {"N1": {"vc": 42.0, "vc_min": 25.0, "vc_max": 60.0, "feed": 1.25, "ap": 0.0, "coolant": "FLOOD"}, "P1": {"vc": 24.0, "vc_min": 16.0, "vc_max": 32.0, "feed": 1.25, "ap": 0.0, "coolant": "FLOOD"}, "M1": {"vc": 14.0, "vc_min": 9.0, "vc_max": 20.0, "feed": 1.25, "ap": 0.0, "coolant": "FLOOD"}}, "axial_subtype": "TAP_THREAD_MILL", "point_angle_deg": 140.0, "ld_ratio_max": 3.0, "tolerance_hole": "6H"}, {"insert_id": "ins-33", "iso_code": "TM-M16", "operation_domain": "DRILLING", "grade_code": "GEN-S15-PVD", "coating_method": "PVD", "coating_composition": "AlTiSiN-Nano", "chipbreaker_code": "GEN-TAP-TM", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 8, "wear": 9, "cutting_edges_count": 4, "has_wiper_geometry": false, "corner_radius_mm": 0.1, "relative_cost": 5.8, "seat_pocket_signature": "TAP-T-1600-100-I", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "S": "PRIMARY", "H": "PRIMARY", "K": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "HYD-TM-D12-M16", "category": "TAP_HOLDER", "lead_angle_deg": 90.0, "dc_mm": 16.0, "z": 4, "ld_ratio_max": 2.5, "clamping": "INTEGRAL"}], "recs": {"P1": {"vc": 110.0, "vc_min": 80.0, "vc_max": 145.0, "feed": 0.2, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 65.0, "vc_min": 45.0, "vc_max": 85.0, "feed": 0.16, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "S1": {"vc": 32.0, "vc_min": 22.0, "vc_max": 45.0, "feed": 0.12, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "H1": {"vc": 45.0, "vc_min": 30.0, "vc_max": 60.0, "feed": 0.12, "ap": 0.0, "coolant": "AIR_BLAST"}}, "axial_subtype": "TAP_THREAD_MILL", "point_angle_deg": 140.0, "ld_ratio_max": 2.5, "tolerance_hole": "6H"}, {"insert_id": "ins-34", "iso_code": "REAM-H7-100", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-REAM-H7", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 8, "wear": 9, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 0.2, "relative_cost": 4.4, "seat_pocket_signature": "RM-R-1000-700-I", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "N": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "HYD-REAM-D10-H7", "category": "REAMER_CHUCK", "lead_angle_deg": 90.0, "dc_mm": 10.0, "z": 6, "ld_ratio_max": 5.0, "clamping": "INTEGRAL"}], "recs": {"P1": {"vc": 95.0, "vc_min": 65.0, "vc_max": 130.0, "feed": 0.36, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 80.0, "vc_min": 55.0, "vc_max": 110.0, "feed": 0.3, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 55.0, "vc_min": 35.0, "vc_max": 75.0, "feed": 0.24, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 110.0, "vc_min": 75.0, "vc_max": 145.0, "feed": 0.4, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "N1": {"vc": 180.0, "vc_min": 120.0, "vc_max": 240.0, "feed": 0.42, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "REAMER_FINE_BORE", "point_angle_deg": 140.0, "ld_ratio_max": 5.0, "tolerance_hole": "H7"}, {"insert_id": "ins-35", "iso_code": "REAM-H7-200", "operation_domain": "DRILLING", "grade_code": "GEN-DRL-UNIV", "coating_method": "PVD", "coating_composition": "AlCrN-TiAlN", "chipbreaker_code": "GEN-REAM-H7", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 8, "wear": 9, "cutting_edges_count": 6, "has_wiper_geometry": false, "corner_radius_mm": 0.2, "relative_cost": 6.2, "seat_pocket_signature": "RM-R-2000-700-I", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "N": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "HYD-REAM-D20-H7", "category": "REAMER_CHUCK", "lead_angle_deg": 90.0, "dc_mm": 20.0, "z": 6, "ld_ratio_max": 5.0, "clamping": "INTEGRAL"}], "recs": {"P1": {"vc": 95.0, "vc_min": 65.0, "vc_max": 130.0, "feed": 0.42, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "P2": {"vc": 80.0, "vc_min": 55.0, "vc_max": 110.0, "feed": 0.36, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 55.0, "vc_min": 35.0, "vc_max": 75.0, "feed": 0.28, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 110.0, "vc_min": 75.0, "vc_max": 145.0, "feed": 0.48, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "N1": {"vc": 180.0, "vc_min": 120.0, "vc_max": 240.0, "feed": 0.5, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "REAMER_FINE_BORE", "point_angle_deg": 140.0, "ld_ratio_max": 5.0, "tolerance_hole": "H7"}, {"insert_id": "ins-36", "iso_code": "FBORE-MIC-25", "operation_domain": "DRILLING", "grade_code": "GEN-M25-PVD", "coating_method": "PVD", "coating_composition": "AlTiN", "chipbreaker_code": "GEN-REAM-H7", "application_class": "FINISHING", "edge_prep": "SHARP", "toughness": 8, "wear": 8, "cutting_edges_count": 1, "has_wiper_geometry": false, "corner_radius_mm": 0.4, "relative_cost": 5.1, "seat_pocket_signature": "RM-B-2500-700-I", "suitability": {"P": "PRIMARY", "M": "PRIMARY", "K": "PRIMARY", "N": "SECONDARY", "S": "PRIMARY", "H": "SECONDARY"}, "operating_zone_polygon": [], "holders": [{"code": "MIC-BORE-D25-42", "category": "FINE_BORING_HEAD", "lead_angle_deg": 90.0, "dc_mm": 25.0, "z": 1, "ld_ratio_max": 6.0, "clamping": "CARTRIDGE"}], "recs": {"P1": {"vc": 210.0, "vc_min": 150.0, "vc_max": 270.0, "feed": 0.1, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "M1": {"vc": 135.0, "vc_min": 95.0, "vc_max": 175.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}, "K1": {"vc": 240.0, "vc_min": 170.0, "vc_max": 310.0, "feed": 0.12, "ap": 0.0, "coolant": "DRY"}, "N1": {"vc": 450.0, "vc_min": 300.0, "vc_max": 650.0, "feed": 0.1, "ap": 0.0, "coolant": "FLOOD"}, "S2": {"vc": 48.0, "vc_min": 32.0, "vc_max": 65.0, "feed": 0.07, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"}}, "axial_subtype": "REAMER_FINE_BORE", "point_angle_deg": 140.0, "ld_ratio_max": 6.0, "tolerance_hole": "IT6"}], "cross_references": [{"source_insert_id": "ins-1", "target_insert_id": "ins-7", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.92, "notes": "WNMG 080408 даёт 6 кромок вместо 4 при том же угле 80° (державка PWLNR)"}, {"source_insert_id": "ins-7", "target_insert_id": "ins-1", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.92, "notes": "CNMG 120408 обеспечивает большую глубину резания ap при том же угле 80°"}, {"source_insert_id": "ins-1", "target_insert_id": "ins-2", "match_type": "HIGHER_TOUGHNESS", "confidence_score": 0.88, "notes": "Та же державка PCLNR 12; переход на острую PVD-кромку и радиус 0.4"}, {"source_insert_id": "ins-1", "target_insert_id": "ins-13", "match_type": "HIGHER_WEAR_RESISTANCE", "confidence_score": 0.85, "notes": "Та же державка PCLNR 12; переход на CBN для закалённых сталей >48 HRC"}, {"source_insert_id": "ins-7", "target_insert_id": "ins-8", "match_type": "HIGHER_TOUGHNESS", "confidence_score": 0.95, "notes": "То же гнездо PWLNR 08; усиленный черновой стружколом и сплав P35"}, {"source_insert_id": "ins-9", "target_insert_id": "ins-10", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.8, "notes": "Переход с 55° (DNMG) на 35° (VNMG) для сложного профилирования"}, {"source_insert_id": "ins-6", "target_insert_id": "ins-16", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.86, "notes": "SPMG 07T308 даёт 4 кромки вместо 3 у WCMX (корпус UDRL-SPMG07)"}, {"source_insert_id": "ins-1", "target_insert_id": "ins-18", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.84, "notes": "TNMG 160408: 6 кромок и минимальная цена за кромку для нежёстких валов"}, {"source_insert_id": "ins-3", "target_insert_id": "ins-19", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.96, "notes": "Та же оправка S20R-SCLCR 09; полированная шлифованная CCGT для алюминия"}, {"source_insert_id": "ins-17", "target_insert_id": "ins-22", "match_type": "HIGHER_TOUGHNESS", "confidence_score": 0.9, "notes": "SOMT 11T308 для мощных отверстий Ø40 мм с усиленной квадратной кромкой"}, {"source_insert_id": "ins-6", "target_insert_id": "ins-23", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.88, "notes": "WCMT 06T308 позволяет сверлить до 5xD вместо 3xD (корпус UDRL-WCMT06-D30-5D)"}, {"source_insert_id": "ins-24", "target_insert_id": "ins-27", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.86, "notes": "Переход со сменной коронки Ø14 на монолит Ø12 8xD для точности IT8 и глубоких отверстий"}, {"source_insert_id": "ins-25", "target_insert_id": "ins-16", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.82, "notes": "Альтернатива Ø20–22 мм: U-сверло SPMG 07T308 дешевле на кромку при глубине до 4xD"}, {"source_insert_id": "ins-30", "target_insert_id": "ins-33", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.9, "notes": "Резьбофреза TM-M16 исключает риск застревания метчика в дорогой детали и подходит под S/H"}, {"source_insert_id": "ins-35", "target_insert_id": "ins-36", "match_type": "FUNCTIONAL_EQUIVALENT", "confidence_score": 0.88, "notes": "Микрометрическая головка FBORE-MIC-25 исправляет биение оси и даёт квалитет IT6"}]};

const STORAGE_KEYS = {
  theme: "skm_theme_v1",
  machines: "skm_custom_machines_v1",
  assemblies: "skm_saved_assemblies_v1",
  stock: "skm_warehouse_stock_v1",
  cart: "skm_order_cart_v1",
  orders: "skm_saved_orders_v1",
};

const state = {
  apiLive: false,
  apiBase: window.location.protocol.startsWith("http") ? "" : "http://localhost:8000",
  activeTab: "sales",
  salesMaterial: "ALL",
  salesOp: "ALL",
  salesPocket: null,
  salesOpenAnalogs: {},
  orderCart: [],
  savedOrders: [],
  units: "metric",
  theme: "dark",
  isoGroup: "P",
  op: "TURNING",
  axialSubtype: "ALL",
  chartMode: "tool",
  cncController: "FANUC",
  lastGCodeReq: null,
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
  visionConfigured: false,
};
window.state = state;

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
  TAP: { name: "Метчик / Резьбофреза", edges: 4, icF: 1.0 },
  RM:  { name: "Развёртка H7 / Чист. расточка", edges: 6, icF: 1.0 },
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


  // Cutting Tap / Form Tap / Thread Mill
  const mTap = coreNoDash.match(/^(TAP|FORM|TM)([MG])(\d{1,2})(BL|TH|P\d+)?$/);
  if (mTap) {
    const [, kind, fam, szStr, opt] = mTap;
    const szNum = parseInt(szStr, 10);
    const dc = (fam === "G" && szNum === 12) ? 20.95 : szNum;
    const kindRu = { TAP: "Режущий метчик", FORM: "Раскатник", TM: "ЦТ резьбофреза" }[kind];
    const pocket = `TAP-${kind[0]}-${Math.floor(dc * 100 + 0.5)}-100-I`;
    return {
      valid: true, raw_code: raw, normalized_code: coreNoDash, suffix: opt || kind,
      shape_code: "TAP", shape_name: `${kindRu} ${fam}${szStr}`,
      clearance_angle_code: "P", clearance_angle_deg: 11, tolerance_class: "G", fixing_type_code: "N",
      ic_mm: dc, cutting_edge_length_mm: +(dc * 2.2).toFixed(1), thickness_mm: +(dc * 1.8).toFixed(2), corner_radius_mm: 0.1,
      is_double_sided: false, cutting_edges_count: kind === "TM" ? 4 : 3, seat_pocket_signature: pocket,
      segments: [
        { label: "Инструмент", code: kind, meaning: kindRu, color: "#38BDF8" },
        { label: "Стандарт", code: fam, meaning: fam === "M" ? "Метрическая 60°" : "Трубная BSPP 55°", color: "#A78BFA" },
        { label: "Номинал", code: szStr, meaning: `Ø${dc} мм`, color: "#FB7185" },
        { label: "Исполнение", code: opt || "UNIV", meaning: opt === "BL" ? "Спираль 40° (глух.)" : (opt === "TH" ? "Винт. подточка (сквоз.)" : "Универсальное"), color: "#34D399" },
        { label: "Цикл ЧПУ", code: kind === "TM" ? "G03" : "G84", meaning: kind === "TM" ? "Винтовая интерп." : "Жёсткое нарезание", color: "#FBBF24" },
      ],
    };
  }

  // Carbide Reamer H7 & Micrometric Fine Boring Head
  const mRm = coreNoDash.match(/^(REAMH7|FBOREMIC)(\d{2,3})$/);
  if (mRm) {
    const [, kind, dStr] = mRm;
    const isReam = kind === "REAMH7";
    const dc = isReam ? +(parseInt(dStr, 10) / 10).toFixed(2) : parseInt(dStr, 10);
    const pocket = `RM-${isReam ? "R" : "B"}-${Math.floor(dc * 100 + 0.5)}-700-I`;
    return {
      valid: true, raw_code: raw, normalized_code: coreNoDash, suffix: isReam ? "H7" : "IT6",
      shape_code: "RM", shape_name: isReam ? `ЦТ развёртка Ø${dc} H7` : `Микрометр. расточная Ø${dc} IT6`,
      clearance_angle_code: "P", clearance_angle_deg: 11, tolerance_class: "H", fixing_type_code: "N",
      ic_mm: dc, cutting_edge_length_mm: +(dc * 2.5).toFixed(1), thickness_mm: +(dc * 1.5).toFixed(1), corner_radius_mm: isReam ? 0.2 : 0.4,
      is_double_sided: false, cutting_edges_count: isReam ? 6 : 1, seat_pocket_signature: pocket,
      segments: [
        { label: "Класс", code: isReam ? "REAM" : "FBORE", meaning: isReam ? "ЦТ развёртка (Z=6)" : "Чист. расточная головка", color: "#38BDF8" },
        { label: "Квалитет", code: isReam ? "H7" : "IT6", meaning: isReam ? "Точность H7" : "Нониус 0.002 мм (IT6)", color: "#A78BFA" },
        { label: "Диаметр (DC)", code: dStr, meaning: `Ø${dc} мм`, color: "#FB7185" },
        { label: "Патрон", code: isReam ? "HYD" : "MIC", meaning: isReam ? "Гидропатрон (<0.005)" : "Микрометр. картридж", color: "#FBBF24" },
        { label: "Цикл ЧПУ", code: isReam ? "G85" : "G76", meaning: isReam ? "Вход и выход на F" : "Ориентация M19 + Q", color: "#34D399" },
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
    TAP: `<path d="M40,96 L40,26 L48,16 L62,16 L70,26 L70,96 Z" fill="var(--surface-2)" stroke="#f472b6" stroke-width="3"/><path d="M38,34 L72,34 M38,46 L72,46 M38,58 L72,58 M38,70 L72,70" stroke="#f472b6" stroke-width="2"/>`,
    RM:  `<rect x="36" y="16" width="38" height="80" rx="5" fill="var(--surface-2)" stroke="#fbbf24" stroke-width="3"/><path d="M45,18 L45,94 M55,18 L55,94 M65,18 L65,94" stroke="#fbbf24" stroke-width="1.8" opacity="0.7"/>`,
  };
  const bore = ["L", "DRL", "TAP", "RM"].includes(shape) ? "" : `<circle cx="55" cy="55" r="11" fill="var(--bg)" stroke="var(--muted)" stroke-width="2"/>`;
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

function evaluateSpindleCurveClient(rpm, maxPowerKw, maxTorqueNm, maxRpm, baseRpmOverride) {
  const rpmSafe = Math.max(rpm || 1, 1);
  let nBase = baseRpmOverride || (9550 * maxPowerKw) / Math.max(maxTorqueNm, 1);
  nBase = Math.max(100, Math.min(nBase, maxRpm * 0.7));
  let availPower, availTorque;
  if (rpmSafe <= nBase) {
    availTorque = maxTorqueNm;
    availPower = (availTorque * rpmSafe) / 9550;
  } else {
    const derateStart = maxRpm * 0.85;
    if (rpmSafe > derateStart && maxRpm > derateStart) {
      const frac = Math.min(1, (rpmSafe - derateStart) / Math.max(maxRpm - derateStart, 1));
      availPower = maxPowerKw * (1 - 0.18 * frac);
    } else {
      availPower = maxPowerKw;
    }
    availTorque = (9550 * availPower) / rpmSafe;
  }
  return { available_power_kw: +availPower.toFixed(2), available_torque_nm: +availTorque.toFixed(1), spindle_base_rpm: Math.round(nBase) };
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
      vf = inp.feed_mm * rpm;
      mrr = ((Math.PI * inp.diameter_mm * inp.diameter_mm) / 4 * vf) / 1000;
      pNet = (inp.feed_mm * inp.diameter_mm * effVc * kc) / 240000;
    } else if (sub === "REAMER_FINE_BORE") {
      hm = Math.max(inp.feed_mm / Math.max(inp.teeth_count || 6, 2), 0.015);
      kc = inp.kc1_1_mpa * Math.pow(hm, -inp.mc_exponent);
      thrustRaw = 0.18 * kc * 0.15 * inp.feed_mm;
      vf = inp.feed_mm * rpm;
      mrr = (Math.PI * inp.diameter_mm * 0.15 * vf) / 1000;
      pNet = (0.15 * inp.feed_mm * effVc * kc) / 60000;
    } else if (sub === "TAP_THREAD_MILL") {
      hm = Math.max(inp.feed_mm * 0.12, 0.02);
      kc = inp.kc1_1_mpa * Math.pow(hm, -inp.mc_exponent);
      thrustRaw = 0.10 * kc * inp.feed_mm * inp.diameter_mm * 0.25;
      vf = inp.feed_mm * rpm;
      mrr = (Math.PI * inp.diameter_mm * 0.55 * inp.feed_mm * vf) / 1000;
      pNet = Math.max(0.08, (inp.kc1_1_mpa * inp.diameter_mm * Math.pow(inp.feed_mm, 1.6) * rpm) / 220000000 * 9.55);
    } else {
      hm = Math.max((inp.feed_mm / 2) * sinHalfPt, 0.01);
      kc = inp.kc1_1_mpa * Math.pow(hm, -inp.mc_exponent);
      thrustRaw = (sub === "MODULAR_TIP" ? 0.50 : 0.54) * kc * inp.feed_mm * inp.diameter_mm * sinHalfPt;
      vf = inp.feed_mm * rpm;
      mrr = ((Math.PI * inp.diameter_mm * inp.diameter_mm) / 4 * vf) / 1000;
      pNet = (inp.feed_mm * inp.diameter_mm * effVc * kc) / 240000;
    }
    inp._axial_thrust_n = +thrustRaw.toFixed(1);
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

    if (sub === "TAP_THREAD_MILL") {
      inp._cycle = "G84 (жёсткое M29) / G03 резьбофрез.";
      inp._pilot = false;
      inp._req_bar = 15;
    } else if (sub === "REAMER_FINE_BORE") {
      inp._cycle = "G85 (развёртка) / G76 (расточка M19)";
      inp._pilot = false;
      inp._req_bar = 15;
    } else if (sub === "INDEXABLE_U_DRILL") {
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

  let availPower = inp.machine_max_power_kw || null;
  let availTorque = inp.machine_max_torque_nm || null;
  let baseRpm = null;
  if (inp.machine_max_power_kw && inp.machine_max_torque_nm && inp.machine_max_rpm) {
    const sp = evaluateSpindleCurveClient(rpm, inp.machine_max_power_kw, inp.machine_max_torque_nm, inp.machine_max_rpm, inp.machine_base_rpm);
    availPower = sp.available_power_kw;
    availTorque = sp.available_torque_nm;
    baseRpm = sp.spindle_base_rpm;
  }
  if (availPower && pMot > availPower)
    warnings.push(`Мощность (${pMot.toFixed(2)} кВт) превышает доступную на ${rpm.toFixed(0)} об/мин (${availPower} кВт по кривой шпинделя).`);
  if (availTorque && trq > availTorque)
    warnings.push(`Крутящий момент (${trq.toFixed(1)} Н·м) превышает доступный на ${rpm.toFixed(0)} об/мин (${availTorque} Н·м).`);

  let inZone = null;
  if (inp.chipbreaker_polygon && inp.chipbreaker_polygon.length >= 3 && inp.operation_domain !== "DRILLING") {
    inZone = pointInPoly(inp.feed_mm, inp.ap_mm, inp.chipbreaker_polygon);
    if (!inZone) warnings.push(`Точка (f=${inp.feed_mm}, ap=${inp.ap_mm}) вне полигона стружколома — риск сливной стружки или скола.`);
  }
  return {
    rpm: +rpmRaw.toFixed(1), rpm_clamped: +rpm.toFixed(1), vf_mm_min: +vf.toFixed(1),
    hm_mm: +hm.toFixed(4), kc_mpa: +kc.toFixed(1), fc_n: +fc.toFixed(1),
    mrr_cm3_min: +mrr.toFixed(2), power_net_kw: +pNet.toFixed(2), power_motor_kw: +pMot.toFixed(2),
    torque_nm: +trq.toFixed(1), available_power_kw: availPower, available_torque_nm: availTorque, spindle_base_rpm: baseRpm, chip_thinning_factor: thin,
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
  renderSalesCatalog();
  renderOrderCart();
  if (typeof recomputeDrawingPlan === "function") recomputeDrawingPlan();
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
  renderSalesCatalog();
  renderOrderCart();
  if (typeof recomputeDrawingPlan === "function") recomputeDrawingPlan();
  runSelection();
  showToast("Восстановлен демо-склад (27 позиций).");
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
  renderSalesCatalog();
  renderOrderCart();
  if (typeof recomputeDrawingPlan === "function") recomputeDrawingPlan();
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
            <td class="mono" style="color:var(--accent);cursor:pointer;" onclick="quickSalesSearch('${s.iso_code}');switchTab('sales');">${s.iso_code}</td>
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
  else if (tabId === "threadlab") { runThreadLab(); runHoleFinishLab(); if (!state.lastGCodeReq) sendSelectedCandidateToGCode(); }
  else if (tabId === "sales") { renderSalesCatalog(); renderOrderCart(); }
  else if (tabId === "drawing") { if (typeof renderDrawingWorkspace === "function") renderDrawingWorkspace(); if (typeof renderDrw3DModel === "function") setTimeout(renderDrw3DModel, 40); }
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
  if (p.has("tab") && ["sales", "drawing", "selector", "threadlab", "studio3d", "compare", "setups", "stock"].includes(p.get("tab"))) {
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
  } else if (sub === "TAP_THREAD_MILL") {
    document.getElementById("diamSlider").value = 12;
    document.getElementById("feedSlider").value = 0.20;
  } else if (sub === "REAMER_FINE_BORE") {
    document.getElementById("diamSlider").value = 20;
    document.getElementById("feedSlider").value = 0.30;
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
      machine_base_rpm: m.base_rpm || null,
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
            ${c.axial_subtype ? renderAxialBadge(c.axial_subtype) : `<span class="tag">${c.chipbreaker_code}</span>`}
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
            <button class="mini-btn" onclick="openCandidateGCode('${c.insert_id}')">G-код</button>
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

  const maxPNow = p.available_power_kw || m.spindle_power_kw;
  const maxTNow = p.available_torque_nm || m.max_torque_nm;
  setBar("barPower", "lblPower", p.power_motor_kw, maxPNow, "кВт (крив.)");
  setBar("barTorque", "lblTorque", p.torque_nm, maxTNow, "Н·м (крив.)");
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

function setChartMode(mode) {
  state.chartMode = mode;
  document.getElementById("btnChartTool").classList.toggle("active", mode === "tool");
  document.getElementById("btnChartSpindle").classList.toggle("active", mode === "spindle");
  renderSelectedDetails();
}

function renderAxialBadge(sub) {
  const map = {
    INDEXABLE_U_DRILL: ["axial-ud", "U-сверло СМП"],
    MODULAR_TIP: ["axial-mod", "Коронка"],
    SOLID_CARBIDE: ["axial-sc", "Монолит ЦТ"],
    TAP_THREAD_MILL: ["axial-tap", "Метч./Резьб."],
    REAMER_FINE_BORE: ["axial-rm", "Разв./Раст. H7"],
  };
  const [cls, lbl] = map[sub] || ["axial-ud", sub];
  return `<span class="tag ${cls}">${lbl}</span>`;
}

function drawSpindleCurveChart(c, svg, statusEl) {
  const m = allMachines().find((x) => x.id === document.getElementById("machineSelect").value) || allMachines()[0];
  const p = c.physics;
  const maxRpm = m.max_rpm || 6000;
  const maxP = m.spindle_power_kw || 15;
  const maxT = m.max_torque_nm || 150;
  const spInfo = evaluateSpindleCurveClient(p.rpm_clamped, maxP, maxT, maxRpm, m.base_rpm);
  const nBase = spInfo.spindle_base_rpm;

  const padL = 44, padR = 44, padT = 18, padB = 30;
  const W = 420 - padL - padR, H = 245 - padT - padB;
  const sx = (r) => padL + (Math.min(r, maxRpm) / maxRpm) * W;
  const syP = (kw) => padT + H - (Math.min(kw, maxP * 1.1) / (maxP * 1.1)) * H;
  const syT = (nm) => padT + H - (Math.min(nm, maxT * 1.1) / (maxT * 1.1)) * H;

  const ptsP = [], ptsT = [];
  for (let i = 0; i <= 40; i++) {
    const r = Math.max(50, (maxRpm * i) / 40);
    const v = evaluateSpindleCurveClient(r, maxP, maxT, maxRpm, m.base_rpm);
    ptsP.push(`${sx(r).toFixed(1)},${syP(v.available_power_kw).toFixed(1)}`);
    ptsT.push(`${sx(r).toFixed(1)},${syT(v.available_torque_nm).toFixed(1)}`);
  }

  const cx = sx(p.rpm_clamped);
  const cyP = syP(p.power_motor_kw);
  const cyT = syT(p.torque_nm);
  const bx = sx(nBase);
  const pOk = p.power_motor_kw <= spInfo.available_power_kw;
  const tOk = p.torque_nm <= spInfo.available_torque_nm;

  document.getElementById("chartCardTitle").textContent = "Характеристика шпинделя P(n) / M(n)";
  document.getElementById("chartHintLeft").innerHTML = `<span style="color:#38bdf8;font-weight:700;">— Мощность P (кВт)</span> · <span style="color:#f59e0b;font-weight:700;">— Момент M (Н·м)</span>`;
  statusEl.innerHTML = (pOk && tOk)
    ? `<span style="color:var(--green);font-weight:700;">● В кривой (n_base=${nBase} об/м)</span>`
    : `<span style="color:var(--red);font-weight:700;">● Превышение кривой шпинделя!</span>`;

  svg.innerHTML = `
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + H}" stroke="#38bdf8" stroke-width="1.2"/>
    <line x1="${padL + W}" y1="${padT}" x2="${padL + W}" y2="${padT + H}" stroke="#f59e0b" stroke-width="1.2"/>
    <line x1="${padL}" y1="${padT + H}" x2="${padL + W}" y2="${padT + H}" stroke="var(--border-strong)"/>
    <line x1="${bx}" y1="${padT}" x2="${bx}" y2="${padT + H}" stroke="var(--muted)" stroke-dasharray="3,3"/>
    <text x="${bx + 4}" y="${padT + 10}" fill="var(--muted)" font-size="9.5">n_base=${nBase}</text>
    <polyline points="${ptsP.join(" ")}" fill="none" stroke="#38bdf8" stroke-width="2.4"/>
    <polyline points="${ptsT.join(" ")}" fill="none" stroke="#f59e0b" stroke-width="2.0" stroke-dasharray="5,3"/>
    <line x1="${cx}" y1="${padT}" x2="${cx}" y2="${padT + H}" stroke="var(--text)" stroke-dasharray="2,2" opacity="0.5"/>
    <circle cx="${cx}" cy="${cyP}" r="5.5" fill="${pOk ? '#38bdf8' : '#ef4444'}" stroke="#fff" stroke-width="1.8"/>
    <circle cx="${cx}" cy="${cyT}" r="5.0" fill="${tOk ? '#f59e0b' : '#ef4444'}" stroke="#fff" stroke-width="1.8"/>
    <text x="${padL - 4}" y="${padT + 8}" text-anchor="end" fill="#38bdf8" font-size="9.5">${maxP} кВт</text>
    <text x="${padL + W + 4}" y="${padT + 8}" text-anchor="start" fill="#f59e0b" font-size="9.5">${maxT} Н·м</text>
    <text x="${padL + W / 2}" y="241" text-anchor="middle" fill="var(--muted)" font-size="10">Обороты шпинделя n (0 .. ${maxRpm} об/мин) · факт ${p.rpm_clamped}</text>
  `;
}

function drawChipbreakerChart(c) {
  const svg = document.getElementById("cbChart");
  if (state.chartMode === "spindle") {
    drawSpindleCurveChart(c, svg, document.getElementById("cbStatus"));
    return;
  }
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
// MAIN SCREEN (v2.1): B2B Sales Catalog, Quick Search, Holder Upsell & Order/KP
// ============================================================================
const HOLDER_UPSELL_PRICES = {
  TURNING_EXTERNAL: 4800, TURNING_INTERNAL: 5900, GROOVING_HOLDER: 4950,
  BORING_BAR: 6900, SHOULDER_MILL: 14500, FACE_MILL: 17800, COPY_MILL: 15200,
  INDEXABLE_DRILL: 12900, MODULAR_DRILL: 13400, SOLID_CARBIDE_DRILL: 9800,
  TAP_HOLDER: 8900, REAMER_CHUCK: 9800, FINE_BORING_HEAD: 24500,
};
const ISO_RU = { P: "Сталь", M: "Нержавейка", K: "Чугун", N: "Алюминий", S: "Титан / Жар.", H: "Закалённая" };
const APP_RU = { FINISHING: "Чистовая", MEDIUM: "Универсальная", ROUGHING: "Черновая / Удар", HEAVY_ROUGHING: "Тяж. черновая", ALUMINUM_SHARP: "Цветмет (острая)" };
const SALES_SYNONYMS = {
  P: ["сталь", "стали", "ст45", "ст20", "40х", "30хгса", "s355", "steel"],
  M: ["нерж", "нержавей", "нержавейка", "12х18", "304", "316", "stainless", "дуплекс"],
  K: ["чугун", "сч20", "сч25", "вч50", "gg25", "cast"],
  N: ["алюм", "алюминий", "д16т", "амг", "латунь", "медь", "бронз", "цветмет", "6061"],
  S: ["титан", "вт6", "инконель", "inconel", "жаропроч", "суперсплав"],
  H: ["закал", "кален", "калён", "тверд", "твёрд", "cbn", "кнб", "hrc", "х12мф", "шх15"],
};

function getPackQty(ins) {
  if (["SOLID_CARBIDE", "TAP_THREAD_MILL", "REAMER_FINE_BORE"].includes(ins.axial_subtype)) return 1;
  if (ins.axial_subtype === "MODULAR_TIP") return 2;
  return 10;
}

function buildSalesPitchClient(ins, primary) {
  const gNames = primary.slice(0, 2).map((g) => ISO_RU[g] || g).join(", ") || "Универсально";
  const sub = ins.axial_subtype;
  if (sub === "SOLID_CARBIDE") return `Монолит ЦТ до ${ins.ld_ratio_max || 5}xD (внутр. СОЖ, IT8) · ${gNames}`;
  if (sub === "MODULAR_TIP") return `Сменная коронка до ${ins.ld_ratio_max || 5}xD (быстрая замена) · ${gNames}`;
  if (sub === "TAP_THREAD_MILL") {
    if (ins.iso_code.startsWith("TM-")) return `ЦТ резьбофреза (без риска поломки метчика) · ${gNames}`;
    if (ins.iso_code.startsWith("FORM-")) return `Бесстружечный раскатник (высокая прочность) · ${gNames}`;
    return `Машинный метчик (${ins.iso_code.includes("BL") ? "глухие отв." : "сквозные отв."}) · ${gNames}`;
  }
  if (sub === "REAMER_FINE_BORE") return `Чистовая обработка отверстий ${ins.tolerance_hole || "H7"} · ${gNames}`;
  if (ins.operation_domain === "GROOVING_THREADING") return `${ins.iso_code.includes("MGMN") ? "Отрезка и канавки" : "Наружная резьба 60°"} · ${ins.cutting_edges_count} кр. · ${gNames}`;
  if (ins.operation_domain === "MILLING") return `Фрезерная (${APP_RU[ins.application_class] || "Универсальная"}) · ${ins.cutting_edges_count} кр. · ${gNames}`;
  if (ins.operation_domain === "DRILLING") return `Пластина для U-сверла · ${ins.cutting_edges_count} кр. · ${gNames}`;
  return `${APP_RU[ins.application_class] || "Универсальная"} · ${ins.cutting_edges_count} кр. · ${gNames}`;
}

function buildSalesItemsClient() {
  const q = (document.getElementById("salesSearchInput")?.value || "").trim().toLowerCase();
  const qNorm = q.replace(/[^a-z0-9а-яё]/gi, "");
  const mat = state.salesMaterial;
  const op = state.salesOp;
  const appF = document.getElementById("salesAppFilter")?.value || "ALL";
  const onlyStock = !!document.getElementById("salesOnlyInStock")?.checked;
  const sortBy = document.getElementById("salesSortSelect")?.value || "relevance";

  const byId = Object.fromEntries(FALLBACK_DB.inserts.map((x) => [x.insert_id, x]));
  const out = [];

  for (const ins of FALLBACK_DB.inserts) {
    const suit = ins.suitability || {};
    const primary = Object.keys(suit).filter((g) => suit[g] === "PRIMARY");
    const secondary = Object.keys(suit).filter((g) => suit[g] === "SECONDARY");
    if (mat !== "ALL" && !suit[mat]) continue;
    if (op !== "ALL" && ins.operation_domain !== op) continue;
    if (appF !== "ALL") {
      if (appF === "ROUGHING" && !["ROUGHING", "HEAVY_ROUGHING"].includes(ins.application_class)) continue;
      if (appF !== "ROUGHING" && ins.application_class !== appF) continue;
    }
    if (state.salesPocket && ins.seat_pocket_signature !== state.salesPocket) continue;

    if (q) {
      const hCodes = (ins.holders || []).map((h) => h.code).join(" ");
      const hay = `${ins.iso_code} ${ins.grade_code} ${ins.chipbreaker_code} ${ins.seat_pocket_signature} ${hCodes} ${primary.map((g) => ISO_RU[g]).join(" ")} ${secondary.map((g) => ISO_RU[g]).join(" ")}`.toLowerCase();
      const hayNorm = hay.replace(/[^a-z0-9а-яё]/gi, "");
      let hit = hay.includes(q) || (qNorm && hayNorm.includes(qNorm));
      if (!hit) {
        for (const g of Object.keys(suit)) {
          if ((SALES_SYNONYMS[g] || []).some((w) => q.includes(w))) { hit = true; break; }
        }
      }
      if (!hit && ["сверл", "u-сверл", "коронк", "монолит"].some((w) => q.includes(w)) && ins.operation_domain === "DRILLING") hit = true;
      if (!hit && ["метчик", "раскат", "резьбофрез"].some((w) => q.includes(w)) && ins.axial_subtype === "TAP_THREAD_MILL") hit = true;
      if (!hit && ["разверт", "развёрт", "расточ", "h7", "it6"].some((w) => q.includes(w)) && ins.axial_subtype === "REAMER_FINE_BORE") hit = true;
      if (!hit && ["канав", "отрез", "резьб"].some((w) => q.includes(w)) && ins.operation_domain === "GROOVING_THREADING") hit = true;
      if (!hit) continue;
    }

    const st = getStockMatchClient(ins.iso_code, ins.grade_code);
    const stockQty = st ? (st.qty || 0) : 0;
    if (onlyStock && stockQty <= 0) continue;

    const unitPrice = st ? st.unit_price_rub : Math.round((ins.relative_cost || 1.0) * 650);
    const packQty = getPackQty(ins);
    const edges = Math.max(ins.cutting_edges_count || 1, 1);
    const h0 = (ins.holders && ins.holders[0]) || null;

    // Cross-references + same-pocket alternatives
    const analogs = [];
    const seenAn = new Set([ins.insert_id]);
    for (const xr of (FALLBACK_DB.cross_references || [])) {
      if (xr.source_insert_id === ins.insert_id && byId[xr.target_insert_id] && !seenAn.has(xr.target_insert_id)) {
        seenAn.add(xr.target_insert_id);
        const t = byId[xr.target_insert_id];
        const tSt = getStockMatchClient(t.iso_code, t.grade_code);
        analogs.push({
          insert_id: t.insert_id, iso_code: t.iso_code, grade_code: t.grade_code,
          qty: tSt ? tSt.qty : 0, price: tSt ? tSt.unit_price_rub : Math.round(t.relative_cost * 650),
          note: xr.notes,
        });
      }
    }
    for (const other of FALLBACK_DB.inserts) {
      if (!seenAn.has(other.insert_id) && other.seat_pocket_signature === ins.seat_pocket_signature) {
        seenAn.add(other.insert_id);
        const oSt = getStockMatchClient(other.iso_code, other.grade_code);
        analogs.push({
          insert_id: other.insert_id, iso_code: other.iso_code, grade_code: other.grade_code,
          qty: oSt ? oSt.qty : 0, price: oSt ? oSt.unit_price_rub : Math.round(other.relative_cost * 650),
          note: `То же посадочное гнездо (${other.seat_pocket_signature})`,
        });
      }
    }

    const parsedShape = parseIsoClient(ins.iso_code).shape_code || "C";
    out.push({
      ...ins,
      shape_code: parsedShape,
      primary, secondary,
      stock_qty: stockQty,
      in_stock: stockQty > 0,
      bin_location: st ? (st.bin_location || "") : "",
      unit_price_rub: unitPrice,
      pack_qty: packQty,
      pack_price_rub: Math.round(unitPrice * packQty),
      price_per_edge_rub: +(unitPrice / edges).toFixed(0),
      holder_code: h0 ? h0.code : null,
      holder_category: h0 ? h0.category : null,
      holder_price: h0 ? (HOLDER_UPSELL_PRICES[h0.category] || 5500) : null,
      sales_pitch: buildSalesPitchClient(ins, primary),
      analogs,
    });
  }

  if (sortBy === "price_asc") out.sort((a, b) => a.unit_price_rub - b.unit_price_rub || b.stock_qty - a.stock_qty);
  else if (sortBy === "edge_price_asc") out.sort((a, b) => a.price_per_edge_rub - b.price_per_edge_rub || a.unit_price_rub - b.unit_price_rub);
  else if (sortBy === "stock_desc") out.sort((a, b) => b.stock_qty - a.stock_qty || a.unit_price_rub - b.unit_price_rub);
  else {
    out.sort((a, b) => {
      const aEx = qNorm && normIsoKey(a.iso_code) === qNorm.toUpperCase() ? 0 : 1;
      const bEx = qNorm && normIsoKey(b.iso_code) === qNorm.toUpperCase() ? 0 : 1;
      if (aEx !== bEx) return aEx - bEx;
      const aPr = mat !== "ALL" && a.primary.includes(mat) ? 0 : 1;
      const bPr = mat !== "ALL" && b.primary.includes(mat) ? 0 : 1;
      if (aPr !== bPr) return aPr - bPr;
      if (a.in_stock !== b.in_stock) return a.in_stock ? -1 : 1;
      return a.price_per_edge_rub - b.price_per_edge_rub;
    });
  }
  return out;
}

function quickSalesSearch(term) {
  const inp = document.getElementById("salesSearchInput");
  if (inp) inp.value = term;
  state.salesPocket = null;
  renderSalesCatalog();
}

function setSalesMaterial(mat) {
  state.salesMaterial = mat;
  document.querySelectorAll("[data-smat]").forEach((b) => b.classList.toggle("active", b.dataset.smat === mat));
  renderSalesCatalog();
}

function setSalesOp(op) {
  state.salesOp = op;
  document.querySelectorAll("[data-sop]").forEach((b) => b.classList.toggle("active", b.dataset.sop === op));
  renderSalesCatalog();
}

function setSalesPocket(sig) {
  state.salesPocket = state.salesPocket === sig ? null : sig;
  renderSalesCatalog();
}

function resetSalesFilters() {
  const inp = document.getElementById("salesSearchInput");
  if (inp) inp.value = "";
  state.salesMaterial = "ALL";
  state.salesOp = "ALL";
  state.salesPocket = null;
  document.querySelectorAll("[data-smat]").forEach((b) => b.classList.toggle("active", b.dataset.smat === "ALL"));
  document.querySelectorAll("[data-sop]").forEach((b) => b.classList.toggle("active", b.dataset.sop === "ALL"));
  const appSel = document.getElementById("salesAppFilter");
  if (appSel) appSel.value = "ALL";
  const stChk = document.getElementById("salesOnlyInStock");
  if (stChk) stChk.checked = false;
  const sortSel = document.getElementById("salesSortSelect");
  if (sortSel) sortSel.value = "relevance";
  renderSalesCatalog();
}

function toggleAnalogsDrawer(insertId) {
  state.salesOpenAnalogs[insertId] = !state.salesOpenAnalogs[insertId];
  renderSalesCatalog();
}

function stepCardQty(insertId, delta) {
  const el = document.getElementById(`sqty_${insertId}`);
  if (!el) return;
  const cur = parseInt(el.value, 10) || 1;
  el.value = Math.max(1, cur + delta);
}

function renderSalesCatalog() {
  const grid = document.getElementById("salesCatalogGrid");
  if (!grid) return;
  const items = buildSalesItemsClient();
  const inStockCnt = items.filter((x) => x.in_stock).length;
  const sumEl = document.getElementById("salesSummaryStat");
  if (sumEl) sumEl.textContent = `Найдено: ${items.length} поз. (${inStockCnt} в наличии на складе)`;
  const badge = document.getElementById("salesCountBadge");
  if (badge) badge.textContent = items.length;

  const pocketWrap = document.getElementById("salesPocketPillWrap");
  if (pocketWrap) {
    if (state.salesPocket) {
      pocketWrap.style.display = "inline-flex";
      pocketWrap.innerHTML = `<button class="v-btn active" onclick="setSalesPocket('${state.salesPocket}')">Гнездо: ${state.salesPocket} ✕</button>`;
    } else {
      pocketWrap.style.display = "none";
      pocketWrap.innerHTML = "";
    }
  }

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Ничего не найдено по текущим фильтрам. <button class="v-btn accent" style="margin-left:8px;" onclick="resetSalesFilters()">Показать весь каталог</button></div>`;
    return;
  }

  grid.innerHTML = items.map((item) => {
    const cartMatch = state.orderCart.find((l) => l.item_type === "INSERT" && l.insert_id === item.insert_id);
    const isoBadges = [
      ...item.primary.map((g) => `<span class="iso-mini ${g}" title="Основной: ${ISO_RU[g]}">${g}</span>`),
      ...item.secondary.map((g) => `<span class="iso-mini ${g} sec" title="Дополнительно: ${ISO_RU[g]}">${g}</span>`),
    ].join("");
    const stockBadge = item.in_stock
      ? `<span class="stock-badge">🟢 В наличии: ${item.stock_qty} шт</span>`
      : `<span class="stock-badge out">🟡 Под заказ (3–5 дн.)</span>`;
    const analogsHtml = (state.salesOpenAnalogs[item.insert_id] && item.analogs.length)
      ? `<div class="analogs-drawer">
          <div style="font-weight:800;color:var(--muted);font-size:10.5px;text-transform:uppercase;">Аналоги и замены для клиента:</div>
          ${item.analogs.map((a) => `
            <div class="analog-row">
              <div>
                <b style="font-family:var(--mono);color:var(--accent);cursor:pointer;" onclick="quickSalesSearch('${a.iso_code}')">${a.iso_code}</b>
                <span style="color:var(--muted);">(${a.price} ₽ · ${a.qty > 0 ? `${a.qty} шт` : "под заказ"})</span>
                <div style="color:var(--muted);font-size:11px;">${a.note}</div>
              </div>
              <button class="upsell-btn" onclick="addInsertToCart('${a.insert_id}', true)">+ В заказ</button>
            </div>`).join("")}
        </div>`
      : "";

    return `
      <article class="prod-card ${cartMatch ? "in-cart" : ""}">
        <div class="prod-head">
          <div class="prod-thumb">${renderInsertSVG(item.shape_code)}</div>
          <div class="prod-title-wrap">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
              <div class="prod-iso">${item.iso_code}</div>
              ${stockBadge}
            </div>
            <div class="prod-pitch">${item.sales_pitch}</div>
          </div>
        </div>

        <div class="iso-mini-badges">
          ${isoBadges}
          <span class="tag">${item.grade_code}</span>
          ${item.bin_location ? `<span class="tag">Ячейка ${item.bin_location}</span>` : ""}
        </div>

        <div class="price-box">
          <div>
            <div class="price-main">${item.unit_price_rub.toLocaleString("ru-RU")} ₽ <span style="font-size:12px;font-weight:600;color:var(--muted);">/ шт</span></div>
            <div class="price-sub">${item.pack_qty > 1 ? `Упаковка ${item.pack_qty} шт: <b>${item.pack_price_rub.toLocaleString("ru-RU")} ₽</b>` : "Штучная поставка (1 шт)"}</div>
          </div>
          <div class="price-edge-pill">${item.price_per_edge_rub} ₽ / кромка</div>
        </div>

        ${item.holder_code ? `
          <div class="upsell-row">
            <span>Державка / корпус: <b>${item.holder_code}</b> (${item.holder_price.toLocaleString("ru-RU")} ₽)</span>
            <button class="upsell-btn" onclick="addHolderToCart('${item.insert_id}')">+ Корпус</button>
          </div>` : ""}

        ${analogsHtml}

        <div class="buy-row">
          <div class="qty-stepper">
            <button type="button" onclick="stepCardQty('${item.insert_id}', -${item.pack_qty})">−</button>
            <input type="number" id="sqty_${item.insert_id}" min="1" value="${item.pack_qty}" />
            <button type="button" onclick="stepCardQty('${item.insert_id}', ${item.pack_qty})">+</button>
          </div>
          <button class="buy-btn ${cartMatch ? "added" : ""}" onclick="addInsertToCart('${item.insert_id}')">
            ${cartMatch ? `✓ В заказе (${cartMatch.qty} шт) · + ещё` : "🛒 В заказ"}
          </button>
        </div>

        <div class="prod-foot-links">
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            ${item.analogs.length ? `<button class="link-subtle" onclick="toggleAnalogsDrawer('${item.insert_id}')">⇄ Аналоги (${item.analogs.length})</button>` : ""}
            <button class="link-subtle" onclick="setSalesPocket('${item.seat_pocket_signature}')">⊞ В это гнездо</button>
          </div>
          <button class="link-subtle" onclick="sendInsertToTechnologist('${item.insert_id}')">⚙ Расчёт технологу →</button>
        </div>
      </article>`;
  }).join("");
}

function addInsertToCart(insertId, usePackDefault = false) {
  const ins = FALLBACK_DB.inserts.find((x) => x.insert_id === insertId);
  if (!ins) return;
  const st = getStockMatchClient(ins.iso_code, ins.grade_code);
  const packQty = getPackQty(ins);
  const qtyEl = document.getElementById(`sqty_${insertId}`);
  const addQty = (!usePackDefault && qtyEl) ? Math.max(1, parseInt(qtyEl.value, 10) || packQty) : packQty;
  const unitPrice = st ? st.unit_price_rub : Math.round((ins.relative_cost || 1.0) * 650);
  const stockQty = st ? st.qty : 0;
  const primary = Object.keys(ins.suitability || {}).filter((g) => ins.suitability[g] === "PRIMARY");

  const existing = state.orderCart.find((l) => l.item_type === "INSERT" && l.insert_id === insertId);
  if (existing) {
    existing.qty += addQty;
    existing.unit_price_rub = unitPrice;
    existing.stock_qty = stockQty;
  } else {
    state.orderCart.push({
      line_id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      item_type: "INSERT",
      insert_id: insertId,
      code: ins.iso_code,
      description: `${ins.grade_code} · ${buildSalesPitchClient(ins, primary)}`,
      qty: addQty,
      pack_qty: packQty,
      unit_price_rub: unitPrice,
      stock_qty: stockQty,
    });
  }
  persistOrderCart();
  renderOrderCart();
  renderSalesCatalog();
  showToast(`Добавлено в заказ: ${ins.iso_code} (${addQty} шт)`);
}

function addHolderToCart(insertId) {
  const ins = FALLBACK_DB.inserts.find((x) => x.insert_id === insertId);
  const h0 = ins && ins.holders && ins.holders[0];
  if (!h0) return;
  const price = HOLDER_UPSELL_PRICES[h0.category] || 5500;
  const existing = state.orderCart.find((l) => l.item_type === "HOLDER" && l.code === h0.code);
  if (existing) existing.qty += 1;
  else {
    state.orderCart.push({
      line_id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      item_type: "HOLDER",
      insert_id: null,
      code: h0.code,
      description: `Державка / корпус (${h0.category}) под ${ins.iso_code}`,
      qty: 1,
      pack_qty: 1,
      unit_price_rub: price,
      stock_qty: 5,
    });
  }
  persistOrderCart();
  renderOrderCart();
  showToast(`Допродажа добавлена: корпус ${h0.code}`);
}

function updateCartLineQty(lineId, newQty) {
  const line = state.orderCart.find((l) => l.line_id === lineId);
  if (!line) return;
  const q = parseInt(newQty, 10);
  if (!q || q <= 0) { removeCartLine(lineId); return; }
  line.qty = q;
  persistOrderCart();
  renderOrderCart();
  renderSalesCatalog();
}

function removeCartLine(lineId) {
  state.orderCart = state.orderCart.filter((l) => l.line_id !== lineId);
  persistOrderCart();
  renderOrderCart();
  renderSalesCatalog();
}

function clearOrderCart() {
  state.orderCart = [];
  persistOrderCart();
  renderOrderCart();
  renderSalesCatalog();
  showToast("Корзина заказа очищена.");
}

function persistOrderCart() {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.orderCart));
}

function setOrderDiscount(pct) {
  const inp = document.getElementById("ordDiscountPct");
  if (inp) inp.value = pct;
  document.querySelectorAll("[data-disc]").forEach((b) => b.classList.toggle("active", Number(b.dataset.disc) === pct));
  renderOrderCart();
}

function onOrderDiscountInput() {
  const v = Math.max(0, Math.min(50, parseFloat(document.getElementById("ordDiscountPct").value) || 0));
  document.querySelectorAll("[data-disc]").forEach((b) => b.classList.toggle("active", Number(b.dataset.disc) === v));
  renderOrderCart();
}

function computeOrderQuoteClient() {
  const discPct = Math.max(0, Math.min(50, parseFloat(document.getElementById("ordDiscountPct")?.value) || 0));
  const includeVat = !!document.getElementById("ordIncludeVat")?.checked;
  const customerName = (document.getElementById("ordCustomerName")?.value || "").trim();
  const customerInn = (document.getElementById("ordCustomerInn")?.value || "").trim();
  const comment = (document.getElementById("ordComment")?.value || "").trim();
  const factor = 1 - discPct / 100;

  let subtotal = 0, total = 0, totalUnits = 0, inStockLines = 0, backorderLines = 0;
  const lines = state.orderCart.map((l) => {
    const rawSum = l.unit_price_rub * l.qty;
    subtotal += rawSum;
    const discUnit = Math.round(l.unit_price_rub * factor * 100) / 100;
    const lineTotal = Math.round(discUnit * l.qty);
    total += lineTotal;
    totalUnits += l.qty;
    let availNote = "";
    let okNow = false;
    if (l.item_type === "HOLDER") { okNow = true; availNote = "Со склада (1–2 дн.)"; inStockLines++; }
    else if (l.stock_qty >= l.qty) { okNow = true; availNote = `В наличии (${l.stock_qty} шт)`; inStockLines++; }
    else if (l.stock_qty > 0) { availNote = `${l.stock_qty} шт склад + ${l.qty - l.stock_qty} под заказ`; backorderLines++; }
    else { availNote = "Под заказ (3–5 дн.)"; backorderLines++; }
    return { ...l, discounted_unit: discUnit, line_total: lineTotal, okNow, availNote };
  });

  subtotal = Math.round(subtotal);
  total = Math.round(total);
  const discountRub = Math.max(0, subtotal - total);
  const vatRub = includeVat ? Math.round((total * 20) / 120) : 0;
  const now = new Date();
  const quoteNumber = `KP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  const msg = [`📋 Коммерческое предложение ${quoteNumber}`];
  if (customerName) msg.push(`Клиент: ${customerName}${customerInn ? ` (ИНН ${customerInn})` : ""}`);
  msg.push("");
  lines.forEach((l, i) => {
    msg.push(`${i + 1}. ${l.code} — ${l.qty} шт × ${Math.round(l.discounted_unit).toLocaleString("ru-RU")} ₽ = ${l.line_total.toLocaleString("ru-RU")} ₽ (${l.availNote})`);
  });
  msg.push("");
  if (discPct > 0) msg.push(`Скидка ${discPct}%: −${discountRub.toLocaleString("ru-RU")} ₽`);
  msg.push(`💰 ИТОГО: ${total.toLocaleString("ru-RU")} ₽ (${includeVat ? `в т.ч. НДС 20%: ${vatRub.toLocaleString("ru-RU")} ₽` : "без НДС"})`);
  if (comment) msg.push(`Условия: ${comment}`);

  return { quoteNumber, dateStr: now.toLocaleDateString("ru-RU"), customerName, customerInn, comment, discPct, includeVat, lines, totalUnits, subtotal, discountRub, total, vatRub, inStockLines, backorderLines, messengerText: msg.join("\n") };
}

function renderOrderCart() {
  const q = computeOrderQuoteClient();
  const topCnt = document.getElementById("topCartCount");
  const topSum = document.getElementById("topCartSum");
  if (topCnt) topCnt.textContent = q.lines.length;
  if (topSum) topSum.textContent = `${q.total.toLocaleString("ru-RU")} ₽`;

  const listEl = document.getElementById("orderCartList");
  const totEl = document.getElementById("orderTotalsBox");
  if (!listEl || !totEl) return;

  if (!q.lines.length) {
    listEl.innerHTML = `<div class="empty-state" style="padding:20px 12px;font-size:12.5px;">Корзина пуста.<br>Нажмите <b>«🛒 В заказ»</b> на нужных пластинах или добавьте совместимый корпус.</div>`;
  } else {
    listEl.innerHTML = q.lines.map((l) => `
      <div class="cart-line">
        <div class="cart-line-top">
          <div>
            <div class="cart-line-code">${l.item_type === "HOLDER" ? "🔧 " : ""}${l.code}</div>
            <div style="font-size:11px;color:${l.okNow ? "var(--green)" : "var(--amber)"};">${l.availNote}</div>
          </div>
          <button class="link-subtle" onclick="removeCartLine('${l.line_id}')">✕</button>
        </div>
        <div class="cart-line-bot">
          <div class="qty-stepper">
            <button type="button" onclick="updateCartLineQty('${l.line_id}', ${l.qty - l.pack_qty})">−</button>
            <input type="number" min="1" value="${l.qty}" onchange="updateCartLineQty('${l.line_id}', this.value)" />
            <button type="button" onclick="updateCartLineQty('${l.line_id}', ${l.qty + l.pack_qty})">+</button>
          </div>
          <span style="color:var(--muted);font-family:var(--mono);font-size:11.5px;">× ${Math.round(l.discounted_unit).toLocaleString("ru-RU")} ₽</span>
          <span class="cart-line-sum">${l.line_total.toLocaleString("ru-RU")} ₽</span>
        </div>
      </div>`).join("");
  }

  totEl.innerHTML = `
    <div class="totals-row"><span>Позиций / единиц</span><b>${q.lines.length} поз. · ${q.totalUnits} шт</b></div>
    <div class="totals-row"><span>Отгрузка со склада / под заказ</span><b>${q.inStockLines} / ${q.backorderLines}</b></div>
    ${q.discPct > 0 ? `<div class="totals-row"><span>Скидка (${q.discPct}%)</span><b style="color:var(--amber);">−${q.discountRub.toLocaleString("ru-RU")} ₽</b></div>` : ""}
    <div class="totals-row grand"><span>Итого к оплате</span><b>${q.total.toLocaleString("ru-RU")} ₽</b></div>
    <div class="totals-row" style="font-size:11.5px;"><span>${q.includeVat ? "В том числе НДС 20%" : "Налогообложение"}</span><span>${q.includeVat ? `${q.vatRub.toLocaleString("ru-RU")} ₽` : "Без НДС"}</span></div>
  `;
  renderSavedOrdersHistory();
}

function focusOrderCart() {
  if (state.activeTab !== "sales") switchTab("sales");
  document.getElementById("orderCartPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function copyOrderMessenger() {
  if (!state.orderCart.length) { showToast("Сначала добавьте позиции в заказ."); return; }
  const q = computeOrderQuoteClient();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(q.messengerText).then(() => showToast("Текст КП скопирован для Telegram / WhatsApp!"));
  } else {
    showToast("Готово к копированию в окне КП.");
  }
}

function exportOrderExcelCSV() {
  if (!state.orderCart.length) { showToast("Сначала добавьте позиции в заказ."); return; }
  const q = computeOrderQuoteClient();
  const head = ["№", "Тип", "Артикул / Код", "Описание", "Кол-во (шт)", "Цена прайс (₽)", "Цена со скидкой (₽)", "Сумма (₽)", "Наличие"];
  const rows = q.lines.map((l, i) => [
    i + 1, l.item_type === "HOLDER" ? "Корпус/Державка" : "Пластина/Инструмент",
    l.code, l.description, l.qty, l.unit_price_rub, Math.round(l.discounted_unit), l.line_total, l.availNote,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
  rows.push(`"";"";"";"ИТОГО (скидка ${q.discPct}%)";"${q.totalUnits}";"";"";"${q.total}";"${q.includeVat ? `в т.ч. НДС 20%: ${q.vatRub} ₽` : "Без НДС"}"`);
  downloadFile(`${q.quoteNumber}.csv`, "\uFEFF" + [head.join(";"), ...rows].join("\n") + "\n", "text/csv;charset=utf-8");
  showToast(`Спецификация ${q.quoteNumber}.csv скачана для Excel!`);
}

function openQuoteModal() {
  if (!state.orderCart.length) { showToast("Добавьте хотя бы одну позицию в корзину для формирования КП."); return; }
  const q = computeOrderQuoteClient();
  const sheet = document.getElementById("quoteSheetContent");
  sheet.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0072CE;padding-bottom:10px;margin-bottom:14px;">
      <div>
        <div style="font-size:19px;font-weight:900;color:#0f172a;">КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ № ${q.quoteNumber}</div>
        <div style="font-size:12px;color:#475569;">Дата: ${q.dateStr} · Действительно 5 рабочих дней</div>
      </div>
      <div style="text-align:right;font-size:12px;color:#334155;">
        <b>SKM Tooling Supply</b><br>Поставка режущего инструмента (ISO 1832 / 13399)
      </div>
    </div>
    ${q.customerName ? `<div style="margin-bottom:10px;"><b>Покупатель:</b> ${q.customerName}${q.customerInn ? ` · ИНН ${q.customerInn}` : ""}</div>` : ""}
    <table>
      <thead>
        <tr>
          <th style="width:36px;">№</th>
          <th>Код / Артикул</th>
          <th>Наименование и назначение</th>
          <th style="text-align:right;">Кол-во</th>
          <th style="text-align:right;">Цена, ₽</th>
          <th style="text-align:right;">Сумма, ₽</th>
          <th>Срок / Наличие</th>
        </tr>
      </thead>
      <tbody>
        ${q.lines.map((l, i) => `
          <tr>
            <td>${i + 1}</td>
            <td style="font-family:monospace;font-weight:700;">${l.code}</td>
            <td>${l.description}</td>
            <td style="text-align:right;font-family:monospace;">${l.qty} шт</td>
            <td style="text-align:right;font-family:monospace;">${Math.round(l.discounted_unit).toLocaleString("ru-RU")}</td>
            <td style="text-align:right;font-family:monospace;font-weight:700;">${l.line_total.toLocaleString("ru-RU")}</td>
            <td style="font-size:11.5px;">${l.availNote}</td>
          </tr>`).join("")}
      </tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-top:12px;">
      <div style="min-width:280px;font-size:13px;">
        ${q.discPct > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Сумма без скидки:</span><span>${q.subtotal.toLocaleString("ru-RU")} ₽</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#b45309;"><span>Скидка (${q.discPct}%):</span><span>−${q.discountRub.toLocaleString("ru-RU")} ₽</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:900;border-top:2px solid #0f172a;padding-top:6px;">
          <span>ИТОГО К ОПЛАТЕ:</span><span>${q.total.toLocaleString("ru-RU")} ₽</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#475569;margin-top:3px;">
          <span>${q.includeVat ? "В том числе НДС 20%:" : "НДС:"}</span><span>${q.includeVat ? `${q.vatRub.toLocaleString("ru-RU")} ₽` : "Без НДС"}</span>
        </div>
      </div>
    </div>
    ${q.comment ? `<div style="margin-top:14px;padding-top:8px;border-top:1px dashed #cbd5e1;font-size:12px;color:#334155;"><b>Условия поставки:</b> ${q.comment}</div>` : ""}
  `;
  document.getElementById("quoteModal").classList.add("open");
}

function closeQuoteModal() {
  document.getElementById("quoteModal").classList.remove("open");
  document.body.classList.remove("printing-quote");
}

function printQuoteSheet() {
  document.body.classList.add("printing-quote");
  window.print();
  setTimeout(() => document.body.classList.remove("printing-quote"), 400);
}

async function saveCurrentOrder() {
  if (!state.orderCart.length) { showToast("Корзина пуста — нечего сохранять."); return; }
  const q = computeOrderQuoteClient();
  let rec = {
    id: `ord-${Date.now()}`,
    quoteNumber: q.quoteNumber,
    dateStr: new Date().toLocaleString("ru-RU"),
    customerName: q.customerName || "Клиент без названия",
    total: q.total,
    linesCount: q.lines.length,
    discPct: q.discPct,
    lines: state.orderCart.map((l) => ({ ...l })),
  };
  if (state.apiLive) {
    try {
      const r = await fetch(`${state.apiBase}/api/sales/orders`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rec),
      });
      if (r.ok) rec = await r.json();
    } catch {}
  }
  state.savedOrders.unshift(rec);
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(state.savedOrders.slice(0, 20)));
  renderSavedOrdersHistory();
  showToast(`Заказ ${rec.quoteNumber} сохранён в историю!`);
}

function loadSavedOrder(orderId) {
  const o = state.savedOrders.find((x) => x.id === orderId);
  if (!o) return;
  state.orderCart = (o.lines || []).map((l) => ({ ...l }));
  const cInp = document.getElementById("ordCustomerName");
  if (cInp && o.customerName !== "Клиент без названия") cInp.value = o.customerName;
  setOrderDiscount(o.discPct || 0);
  persistOrderCart();
  renderOrderCart();
  renderSalesCatalog();
  showToast(`Загружен заказ ${o.quoteNumber}`);
}

function deleteSavedOrder(orderId) {
  state.savedOrders = state.savedOrders.filter((x) => x.id !== orderId);
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(state.savedOrders));
  if (state.apiLive) fetch(`${state.apiBase}/api/sales/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" }).catch(() => {});
  renderSavedOrdersHistory();
}

function renderSavedOrdersHistory() {
  const card = document.getElementById("savedOrdersCard");
  const list = document.getElementById("savedOrdersList");
  const cnt = document.getElementById("savedOrdersCount");
  if (!card || !list) return;
  if (!state.savedOrders.length) { card.style.display = "none"; return; }
  card.style.display = "block";
  if (cnt) cnt.textContent = `${state.savedOrders.length}`;
  list.innerHTML = state.savedOrders.slice(0, 6).map((o) => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;font-size:12px;">
      <div style="cursor:pointer;flex:1;" onclick="loadSavedOrder('${o.id}')" title="Загрузить в корзину">
        <b style="font-family:var(--mono);color:var(--accent);">${o.quoteNumber}</b> · ${o.customerName}
        <div style="font-size:11px;color:var(--muted);">${o.linesCount} поз. · <b>${Number(o.total).toLocaleString("ru-RU")} ₽</b> · ${o.dateStr}</div>
      </div>
      <button class="link-subtle" onclick="deleteSavedOrder('${o.id}')">✕</button>
    </div>`).join("");
}

function sendInsertToTechnologist(insertId) {
  const ins = FALLBACK_DB.inserts.find((x) => x.insert_id === insertId);
  if (!ins) return;
  const primary = Object.keys(ins.suitability || {}).find((g) => ins.suitability[g] === "PRIMARY") || Object.keys(ins.suitability || {})[0] || "P";
  state.pocketFilter = null;
  selectIsoGroup(primary);
  selectOp(ins.operation_domain, true);
  if (ins.operation_domain === "DRILLING") {
    state.axialSubtype = "ALL";
    document.querySelectorAll("[data-ax]").forEach((b) => b.classList.toggle("active", b.dataset.ax === "ALL"));
  }
  state.selectedId = ins.insert_id;
  setIso(ins.iso_code);
  switchTab("selector");
  runSelection().then(() => {
    state.selectedId = ins.insert_id;
    renderCandidates();
    renderSelectedDetails();
  });
  showToast(`Открыт инженерный расчёт для ${ins.iso_code}`);
}

// ============================================================================
// Tab 2 (v2.0): Threading (M/MF/G/NPT), Hole Finishing (H7/IT6) & G-Code Studio
// ============================================================================
const H7_BANDS = [[3,10],[6,12],[10,15],[18,18],[30,21],[50,25],[80,30],[120,35],[180,40],[250,46]];
const TAP_VC = {
  P: { CUT_TAP: 16, FORM_TAP: 24, THREAD_MILL: 110 },
  M: { CUT_TAP: 9,  FORM_TAP: 14, THREAD_MILL: 65 },
  K: { CUT_TAP: 20, FORM_TAP: 0,  THREAD_MILL: 125 },
  N: { CUT_TAP: 32, FORM_TAP: 45, THREAD_MILL: 240 },
  S: { CUT_TAP: 5,  FORM_TAP: 0,  THREAD_MILL: 35 },
  H: { CUT_TAP: 4,  FORM_TAP: 0,  THREAD_MILL: 45 },
};

function populateThreadCodes() {
  const fam = document.getElementById("thFamilySel").value;
  const sel = document.getElementById("thCodeSel");
  const list = (FALLBACK_DB.threads || []).filter((t) => t.family === fam);
  sel.innerHTML = list.map((t) => `<option value="${t.code}">${t.code} (Ø${t.major_mm} · P=${t.pitch_mm}${t.tpi ? ` / ${t.tpi} TPI` : ""})</option>`).join("");
  if (fam === "M" && list.some((t) => t.code === "M12")) sel.value = "M12";
  runThreadLab();
}

function calcThreadClient(inp) {
  const spec = (FALLBACK_DB.threads || []).find((t) => t.code === inp.thread_code) || FALLBACK_DB.threads[6];
  const major = spec.major_mm, pitch = spec.pitch_mm, warns = [];
  let preDrill = spec.cut_drill_mm;
  if (inp.method === "FORM_TAP") {
    if (["K", "H", "S"].includes(inp.iso_group)) warns.push(`Раскатник не применяется для хрупких/жаропрочных материалов группы ${inp.iso_group}.`);
    if (spec.form_drill_mm == null) warns.push(`Для конической резьбы ${spec.code} раскатники не применяются.`);
    preDrill = spec.form_drill_mm || spec.cut_drill_mm;
  }
  const vc = (TAP_VC[inp.iso_group] && TAP_VC[inp.iso_group][inp.method]) || 12;
  const minDepth = +(inp.thread_depth_mm + (inp.hole_type === "BLIND" && inp.method !== "THREAD_MILL" ? pitch * 3.5 : pitch * 1.5)).toFixed(1);
  if (inp.thread_depth_mm / major > 2.5 && inp.method !== "THREAD_MILL")
    warns.push(`Глубокая резьба (${(inp.thread_depth_mm / major).toFixed(1)}xD): риск поломки метчика — рассмотрите резьбофрезу.`);

  let rpm, vf, vfCenter = null, torque, toolRec, dcMill = null;
  if (inp.method === "CUT_TAP" || inp.method === "FORM_TAP") {
    rpm = Math.round((1000 * vc) / (Math.PI * major));
    vf = +(rpm * pitch).toFixed(1);
    torque = +((inp.kc1_1_mpa * major * Math.pow(pitch, 1.8)) / (inp.method === "FORM_TAP" ? 21000 : 28000)).toFixed(2);
    toolRec = inp.method === "FORM_TAP"
      ? `Раскатник ${spec.code} (бесстружечный, эмульсия ≥10% / масло)`
      : (inp.hole_type === "BLIND" ? `Спиральный метчик 40° ${spec.code} (стружка вверх)` : `Метчик с винтовой подточкой ${spec.code} (стружка вперёд)`);
    if (inp.method === "FORM_TAP") warns.push(`Критично для раскатника: диаметр отверстия строго Ø${preDrill.toFixed(2)} ±0.03 мм!`);
  } else {
    dcMill = Math.max(2.0, Math.min(+(Math.min(preDrill * 0.72, major - 2.2 * pitch)).toFixed(1), preDrill - 0.6));
    rpm = Math.round((1000 * vc) / (Math.PI * dcMill));
    const vfPeriph = 0.05 * 4 * rpm;
    vfCenter = +(vfPeriph * ((major - dcMill) / major)).toFixed(1);
    vf = +vfPeriph.toFixed(1);
    torque = +((inp.kc1_1_mpa * pitch * 0.05 * (dcMill / 2)) / (2500 * Math.max(inp.radial_passes, 1))).toFixed(2);
    toolRec = `ЦТ резьбофреза Ø${dcMill} мм (шаг ${pitch} мм, Z=4, проходов: ${inp.radial_passes})`;
    if (["H", "S"].includes(inp.iso_group) && inp.radial_passes < 2)
      warns.push(`Для группы ${inp.iso_group} рекомендуется минимум 2–3 радиальных прохода.`);
  }
  return { spec, major, pitch, preDrill, minDepth, vc, rpm, vf, vfCenter, torque, toolRec, dcMill, warns };
}

function runThreadLab() {
  const sg = FALLBACK_DB.subgroups.find((s) => s.code === document.getElementById("subgroupSelect").value) || FALLBACK_DB.subgroups[0];
  const r = calcThreadClient({
    thread_code: document.getElementById("thCodeSel").value || "M12",
    iso_group: sg.iso_group,
    kc1_1_mpa: sg.kc1_1_mpa,
    method: document.getElementById("thMethodSel").value,
    hole_type: document.getElementById("thHoleTypeSel").value,
    thread_depth_mm: parseFloat(document.getElementById("thDepthInp").value) || 20,
    radial_passes: parseInt(document.getElementById("thPassesInp").value, 10) || 1,
  });
  state._lastThread = r;
  document.getElementById("thBadge").textContent = `${r.spec.code} · P=${r.pitch} мм · ISO ${sg.iso_group}`;
  document.getElementById("thPreDrill").textContent = `Ø ${r.preDrill.toFixed(2)} мм`;
  document.getElementById("thMinDepth").textContent = `мин. глубина сверл.: ${r.minDepth} мм`;
  document.getElementById("thRpm").textContent = `${r.rpm} об/м`;
  document.getElementById("thVc").textContent = `Vc: ${r.vc} м/мин`;
  document.getElementById("thVf").textContent = `${r.vfCenter != null ? r.vfCenter : r.vf} мм/м`;
  document.getElementById("thVfCenter").textContent = r.vfCenter != null ? `перифер.: ${r.vf} (ось комп.)` : `шаг P = ${r.pitch} мм/об`;
  document.getElementById("thTorque").textContent = `${r.torque} Н·м`;
  document.getElementById("thAngle").textContent = `профиль ${r.spec.angle_deg}°${r.spec.tpi ? ` (${r.spec.tpi} TPI)` : ""}`;
  document.getElementById("thToolRec").innerHTML = `Инструмент: <b>${r.toolRec}</b>`;
  const wb = document.getElementById("thWarnBox");
  if (r.warns.length) { wb.className = "warnings-box"; wb.innerHTML = r.warns.map((w) => `⚠ ${w}`).join("<br>"); }
  else { wb.className = "warnings-box ok"; wb.textContent = "✓ Резьбонарезание и отверстие под резьбу в оптимальном окне."; }
}

function runHoleFinishLab() {
  const sg = FALLBACK_DB.subgroups.find((s) => s.code === document.getElementById("subgroupSelect").value) || FALLBACK_DB.subgroups[0];
  const d = parseFloat(document.getElementById("hfDiamInp").value) || 20;
  const grade = document.getElementById("hfGradeSel").value;
  const method = document.getElementById("hfMethodSel").value;
  const depth = parseFloat(document.getElementById("hfDepthInp").value) || 45;
  const band = H7_BANDS.find((b) => d <= b[0]) || [250, 52];
  const mult = { IT6: 0.65, H7: 1.0, H8: 1.55 }[grade] || 1.0;
  const esUm = +(band[1] * mult).toFixed(1);
  const ld = +(depth / d).toFixed(2);
  const warns = [];

  let allowD, vc, feedRev, ra, holder, toolCode;
  if (method === "REAMING") {
    allowD = d <= 6 ? 0.12 : (d <= 16 ? 0.20 : (d <= 32 ? 0.25 : 0.35));
    vc = { P: 95, M: 55, K: 110, N: 180, S: 28, H: 32 }[sg.iso_group] || 80;
    const z = d <= 16 ? 6 : 8;
    feedRev = +((["P", "K", "N"].includes(sg.iso_group) ? 0.06 : 0.04) * z).toFixed(2);
    ra = sg.iso_group === "M" ? 1.1 : 0.8;
    holder = "Гидропатрон / термопатрон (биение ≤ 0.005 мм) · цикл G85";
    toolCode = `REAM-H7-${String(Math.round(d * 10)).padStart(3, "0")}`;
    if (ld > 5) warns.push(`Высокий вылет L/D=${ld}xD для развёртки — требуется предв. растачивание для выравнивания оси.`);
  } else {
    allowD = d <= 30 ? 0.40 : 0.60;
    vc = { P: 210, M: 135, K: 240, N: 450, S: 48, H: 130 }[sg.iso_group] || 180;
    feedRev = grade === "IT6" ? 0.07 : 0.10;
    ra = +(((feedRev * feedRev) / (32 * 0.4)) * 1000).toFixed(2);
    holder = "Микрометрическая расточная головка (0.002 мм/дел) · цикл G76 (M19+Q)";
    toolCode = `FBORE-MIC-${String(Math.round(d)).padStart(2, "0")}`;
    if (ld > 6.5) warns.push(`L/D=${ld}xD > 6.5: требуется антивибрационная демпфированная оправка!`);
    else if (ld > 4.0) warns.push(`L/D=${ld}xD: используйте твёрдосплавную расточную оправку.`);
  }
  const preOpt = +(d - allowD).toFixed(2);
  const preMin = +(preOpt - (method === "REAMING" ? 0.05 : 0.10)).toFixed(2);
  const preMax = +(preOpt + (method === "REAMING" ? 0.05 : 0.10)).toFixed(2);
  const rpm = Math.round((1000 * vc) / (Math.PI * d));
  const vf = +(rpm * feedRev).toFixed(1);

  state._lastHoleFinish = { d, grade, method, depth, esUm, preOpt, vc, rpm, feedRev, vf, toolCode };
  document.getElementById("hfBadge").textContent = `Ø${d} ${grade} (+${esUm} / 0 мкм)`;
  document.getElementById("hfPreOpt").textContent = `Ø ${preOpt.toFixed(2)} мм`;
  document.getElementById("hfPreRange").textContent = `окно: ${preMin.toFixed(2)} .. ${preMax.toFixed(2)} мм`;
  document.getElementById("hfTol").textContent = `+${esUm} / 0 мкм`;
  document.getElementById("hfAllow").textContent = `на сторону: ${(allowD / 2).toFixed(3)} мм`;
  document.getElementById("hfRpm").textContent = `${rpm} об/м`;
  document.getElementById("hfVf").textContent = `Vf: ${vf} мм/м (f=${feedRev})`;
  document.getElementById("hfRa").textContent = `Ra ${ra} мкм`;
  document.getElementById("hfLd").textContent = `L/D = ${ld}xD`;
  document.getElementById("hfHolder").innerHTML = `Оснастка: <b>${holder}</b>`;
  const wb = document.getElementById("hfWarnBox");
  if (warns.length) { wb.className = "warnings-box"; wb.innerHTML = warns.map((w) => `⚠ ${w}`).join("<br>"); }
  else { wb.className = "warnings-box ok"; wb.textContent = "✓ Припуск, режимы и вылет оправки в оптимальном окне."; }
}

function generateGCodeClient(req) {
  const isSiem = req.controller === "SIEMENS";
  const cmt = (t) => (isSiem ? `; ${t}` : `(${t})`);
  const s = Math.round(req.rpm);
  const coolOn = req.coolant === "HIGH_PRESSURE_THROUGH" ? (isSiem ? "M08 ; THROUGH-TOOL COOLANT" : "M88 (THROUGH-TOOL COOLANT)") : (req.coolant !== "DRY" ? "M08" : cmt("DRY"));
  const coolOff = (req.coolant === "HIGH_PRESSURE_THROUGH" && !isSiem) ? "M89" : "M09";
  const lines = [
    cmt(`SKM v2.0 GENERATED | ${req.operation} | ${req.tool_label}`),
    cmt(`Vc=${req.vc_m_min} m/min | S=${s} RPM | f=${req.feed_mm} mm | Vf=${req.vf_mm_min} mm/min`),
    isSiem ? `T="${req.tool_label}" M6` : `T${String(req.tool_number || 1).padStart(2, "0")} M06`,
    isSiem ? "G54 G90 G17 D1" : "G54 G90 G17 G40 G80",
  ];

  if (req.operation === "TURNING") {
    lines.push(
      isSiem ? `G96 S${Math.round(req.vc_m_min)} LIMS=${s} M4` : `G50 S${s}\nG96 S${Math.round(req.vc_m_min)} M03`,
      coolOn,
      `G00 X${(req.diameter_mm + 4).toFixed(2)} Z2.0`,
      `G01 X${Math.max(req.diameter_mm - 2 * req.ap_mm, 2).toFixed(2)} F${req.feed_mm.toFixed(3)}`,
      `G01 Z-${req.depth_mm.toFixed(2)}`,
      `G00 X${(req.diameter_mm + 4).toFixed(2)} Z5.0`,
      coolOff, "M05"
    );
  } else if (req.operation === "GROOVING_THREADING") {
    lines.push(
      `G97 S${s} M03`, coolOn,
      `G00 X${(req.diameter_mm + 3).toFixed(2)} Z-${req.depth_mm.toFixed(2)}`,
      `G01 X${Math.max(req.diameter_mm - 2 * req.ap_mm, 2).toFixed(2)} F${req.feed_mm.toFixed(3)}`,
      isSiem ? "G04 F0.3" : "G04 P300",
      `G00 X${(req.diameter_mm + 4).toFixed(2)}`, coolOff, "M05"
    );
  } else if (req.operation === "MILLING") {
    lines.push(
      `S${s} M03`, "G00 X0.0 Y0.0", isSiem ? "G00 Z25.0" : "G43 Z25.0 H01", coolOn,
      "G00 Z2.0", `G01 Z-${req.ap_mm.toFixed(2)} F${Math.max(req.vf_mm_min * 0.35, 80).toFixed(0)}`,
      `G01 X${req.depth_mm.toFixed(2)} F${req.vf_mm_min.toFixed(0)}`, "G00 Z25.0", coolOff, "M05"
    );
  } else if (req.operation === "TAPPING") {
    if (isSiem) {
      lines.push(`S${s} M03`, "G00 X0.0 Y0.0 Z25.0", "M08", `CYCLE84(25, 0, 3, -${req.depth_mm.toFixed(2)}, , 0, 3, , ${req.pitch_mm.toFixed(3)}, 0, ${s}, ${s})`, "M09", "M05");
    } else {
      lines.push("G00 X0.0 Y0.0", "G43 Z25.0 H01", "M08", `M29 S${s}`, `G98 G84 Z-${req.depth_mm.toFixed(2)} R3.0 F${req.vf_mm_min.toFixed(1)}`, "G80", "G00 Z25.0", "M09", "M05");
    }
  } else if (req.operation === "THREAD_MILLING") {
    const dc = req.cutter_dc_mm || +(req.diameter_mm * 0.65).toFixed(2);
    const rPath = +((req.diameter_mm - dc) / 2).toFixed(3);
    const rLead = +(rPath / 2).toFixed(3);
    lines.push(
      `S${s} M03`, "G00 X0.0 Y0.0", isSiem ? "G00 Z25.0" : "G43 Z25.0 H01", "M08",
      `G00 Z-${req.depth_mm.toFixed(2)}`,
      cmt(`CLIMB HELICAL INTERPOLATION (BOTTOM-UP, R_path=${rPath} mm)`),
      `G91 G03 X${rPath.toFixed(3)} Y0.0 I${rLead.toFixed(3)} J0.0 Z${(req.pitch_mm / 4).toFixed(3)} F${req.vf_mm_min.toFixed(0)}`,
      `G03 X0.0 Y0.0 I-${rPath.toFixed(3)} J0.0 Z${req.pitch_mm.toFixed(3)}`,
      `G03 X-${rPath.toFixed(3)} Y0.0 I-${rLead.toFixed(3)} J0.0 Z${(req.pitch_mm / 4).toFixed(3)}`,
      "G90 G00 Z25.0", "M09", "M05"
    );
  } else if (req.operation === "REAMING") {
    if (isSiem) lines.push(`S${s} M03`, "G00 X0.0 Y0.0 Z25.0", "M08", `CYCLE85(25, 0, 2, -${req.depth_mm.toFixed(2)}, , 0, ${req.vf_mm_min.toFixed(0)}, ${req.vf_mm_min.toFixed(0)})`, "M09", "M05");
    else lines.push(`S${s} M03`, "G00 X0.0 Y0.0", "G43 Z25.0 H01", "M08", `G98 G85 Z-${req.depth_mm.toFixed(2)} R2.0 F${req.vf_mm_min.toFixed(0)}`, "G80", "G00 Z25.0", "M09", "M05");
  } else if (req.operation === "FINE_BORING") {
    if (isSiem) lines.push(`S${s} M03`, "G00 X0.0 Y0.0 Z25.0", "M08", `CYCLE86(25, 0, 2, -${req.depth_mm.toFixed(2)}, , 0, 3, 0.2, 0, 0, 0)`, "M09", "M05");
    else lines.push(`S${s} M03`, "G00 X0.0 Y0.0", "G43 Z25.0 H01", "M08", `G98 G76 Z-${req.depth_mm.toFixed(2)} R2.0 Q0.20 F${req.vf_mm_min.toFixed(0)}`, "G80", "G00 Z25.0", "M09", "M05");
  } else { // DRILLING
    if (req.pilot_required) {
      lines.push(
        cmt("ENTER PILOT HOLE AT LOW RPM BEFORE HIGH-PRESSURE COOLANT"),
        "S350 M03", "G00 X0.0 Y0.0", isSiem ? "G00 Z25.0" : "G43 Z25.0 H01",
        `G01 Z-${Math.min(req.diameter_mm * 1.5, req.depth_mm * 0.4).toFixed(1)} F300`,
        coolOn, `S${s} M03`, `G01 Z-${req.depth_mm.toFixed(2)} F${req.vf_mm_min.toFixed(0)}`,
        "G00 Z2.0", "S350 M03", "G00 Z25.0", coolOff, "M05"
      );
    } else if (isSiem) {
      lines.push(`S${s} M03`, "G00 X0.0 Y0.0 Z25.0", coolOn, `CYCLE81(25, 0, 2, -${req.depth_mm.toFixed(2)}, ) ; F=${req.vf_mm_min.toFixed(0)}`, coolOff, "M05");
    } else {
      const useG73 = (req.recommended_cycle || "").includes("G73");
      lines.push(
        `S${s} M03`, "G00 X0.0 Y0.0", "G43 Z25.0 H01", coolOn,
        useG73 ? `G98 G73 Z-${req.depth_mm.toFixed(2)} R2.0 Q${Math.max(req.diameter_mm * 0.75, 4).toFixed(1)} F${req.vf_mm_min.toFixed(0)}` : `G98 G81 Z-${req.depth_mm.toFixed(2)} R2.0 F${req.vf_mm_min.toFixed(0)}`,
        "G80", "G00 Z25.0", coolOff, "M05"
      );
    }
  }
  return lines.join("\n") + "\n";
}

function renderGCode(req) {
  state.lastGCodeReq = { ...req, controller: state.cncController };
  const pre = document.getElementById("gcodeOutput");
  if (pre) pre.textContent = generateGCodeClient(state.lastGCodeReq);
}

function setCncController(ctrl) {
  state.cncController = ctrl;
  document.getElementById("btnCncFanuc").classList.toggle("active", ctrl === "FANUC");
  document.getElementById("btnCncSiemens").classList.toggle("active", ctrl === "SIEMENS");
  if (state.lastGCodeReq) renderGCode(state.lastGCodeReq);
  else sendSelectedCandidateToGCode();
}

function sendSelectedCandidateToGCode() {
  const c = state.candidates.find((x) => x.insert_id === state.selectedId) || state.candidates[0];
  if (!c) return;
  let op = state.op;
  if (c.axial_subtype === "TAP_THREAD_MILL") op = c.iso_code.startsWith("TM-") ? "THREAD_MILLING" : "TAPPING";
  else if (c.axial_subtype === "REAMER_FINE_BORE") op = c.iso_code.startsWith("FBORE") ? "FINE_BORING" : "REAMING";
  renderGCode({
    operation: op,
    tool_number: 1,
    tool_label: c.iso_code,
    diameter_mm: parseFloat(document.getElementById("diamSlider").value) || 20,
    rpm: c.physics.rpm_clamped,
    vc_m_min: c.recommended_vc,
    feed_mm: parseFloat(document.getElementById("feedSlider").value) || 0.2,
    vf_mm_min: c.physics.vf_mm_min,
    depth_mm: state.op === "DRILLING" ? (parseFloat(document.getElementById("holeDepthSlider").value) || 40) : 40,
    ap_mm: parseFloat(document.getElementById("apSlider").value) || 2.0,
    pitch_mm: 1.75,
    coolant: c.recommended_coolant,
    pilot_required: !!c.physics.pilot_hole_required,
    recommended_cycle: c.physics.recommended_cycle,
  });
}

function openCandidateGCode(id) {
  selectCandidate(id);
  sendSelectedCandidateToGCode();
  switchTab("threadlab");
  showToast("G-код сгенерирован из выбранного инструмента!");
}

function sendThreadToGCode() {
  if (!state._lastThread) runThreadLab();
  const r = state._lastThread;
  const method = document.getElementById("thMethodSel").value;
  renderGCode({
    operation: method === "THREAD_MILL" ? "THREAD_MILLING" : "TAPPING",
    tool_number: 2,
    tool_label: `${method === "THREAD_MILL" ? "TM" : "TAP"}-${r.spec.code}`,
    diameter_mm: r.major,
    rpm: r.rpm,
    vc_m_min: r.vc,
    feed_mm: r.pitch,
    vf_mm_min: r.vfCenter != null ? r.vfCenter : r.vf,
    depth_mm: parseFloat(document.getElementById("thDepthInp").value) || 20,
    ap_mm: 0,
    pitch_mm: r.pitch,
    cutter_dc_mm: r.dcMill,
    coolant: "FLOOD",
  });
  showToast(`G-код для резьбы ${r.spec.code} обновлён!`);
}

function sendHoleFinishToGCode() {
  if (!state._lastHoleFinish) runHoleFinishLab();
  const h = state._lastHoleFinish;
  renderGCode({
    operation: h.method,
    tool_number: 3,
    tool_label: h.toolCode,
    diameter_mm: h.d,
    rpm: h.rpm,
    vc_m_min: h.vc,
    feed_mm: h.feedRev,
    vf_mm_min: h.vf,
    depth_mm: h.depth,
    ap_mm: 0,
    pitch_mm: 1.0,
    coolant: "HIGH_PRESSURE_THROUGH",
  });
  showToast(`G-код ${h.method === "REAMING" ? "G85" : "G76"} для Ø${h.d} ${h.grade} обновлён!`);
}

function copyGCode() {
  const txt = document.getElementById("gcodeOutput").textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(() => showToast("G-код скопирован в буфер обмена!"));
  }
}

function downloadGCodeNC() {
  const txt = document.getElementById("gcodeOutput").textContent;
  const lbl = (state.lastGCodeReq && state.lastGCodeReq.tool_label ? state.lastGCodeReq.tool_label : "skm_program").replace(/[^A-Za-z0-9_-]/g, "_");
  downloadFile(`${lbl}_${state.cncController.toLowerCase()}.nc`, txt, "text/plain;charset=utf-8");
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
  try { state.orderCart = JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || "[]"); } catch { state.orderCart = []; }
  try { state.savedOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.orders) || "[]"); } catch { state.savedOrders = []; }
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
    connText.textContent = "Web Demo · v2.3.5 3D CAD";
  } else {
    try {
      const r = await fetch(`${state.apiBase}/api/health`, { signal: AbortSignal.timeout(15000) });
      if (r.ok) {
        const hData = await r.json().catch(() => ({}));
        state.apiLive = true;
        state.visionConfigured = !!hData.vision_configured;
        badge.classList.add("live");
        const vTag = state.visionConfigured ? " · Vision AI" : "";
        const metaRes = await fetch(`${state.apiBase}/api/catalog/meta`);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          connText.textContent = (meta.storage_mode === "postgres" ? "FastAPI + PostgreSQL" : "FastAPI Live v2.3.5") + vTag;
          if (meta.machines?.length) { FALLBACK_DB.machines = meta.machines; renderMachineSelect(); }
          if (meta.material_subgroups?.length) { FALLBACK_DB.subgroups = meta.material_subgroups; populateSubgroups(); }
        } else {
          connText.textContent = "FastAPI Live v2.3.5" + vTag;
        }
      } else {
        badge.classList.add("demo");
        connText.textContent = "Web Demo · v2.3.5 3D CAD";
      }
    } catch {
      badge.classList.add("demo");
      connText.textContent = "Offline Engine (Client JS)";
    }
  }

  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  renderSalesCatalog();
  renderOrderCart();
  if (typeof initDrawingModule === "function") initDrawingModule();
  populateThreadCodes();
  runHoleFinishLab();
  await handleIsoInput();
  await runSelection();
  sendSelectedCandidateToGCode();
  if (state.activeTab !== "sales") switchTab(state.activeTab);
}

init();
