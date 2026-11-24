-- =============================================================================
-- Vendor-Agnostic Seed Data (ISO 513, ISO 1832, ISO 13399)
-- =============================================================================

-- 1. ISO 513 Material Groups (Standard Industry Colors)
INSERT INTO iso_material_groups (code, name_ru, name_en, color_hex, description) VALUES
('P', 'Стали', 'Steel', '#0072CE', 'Углеродистые, легированные, инструментальные и ферритные нержавеющие стали'),
('M', 'Нержавеющие стали', 'Stainless Steel', '#F2C94C', 'Аустенитные, дуплексные и мартенситные коррозионностойкие стали'),
('K', 'Чугуны', 'Cast Iron', '#EB5757', 'Серый, высокопрочный с шаровидным графитом (ВЧ) и ковкий чугун'),
('N', 'Цветные металлы', 'Non-Ferrous', '#27AE60', 'Алюминиевые, медные, латунные сплавы и конструкционные пластики'),
('S', 'Жаропрочные и титан', 'Heat-Resistant & Ti', '#F2994A', 'Никелевые, кобальтовые суперсплавы (Inconel) и титановые сплавы'),
('H', 'Закалённые стали', 'Hardened Materials', '#828282', 'Закалённые стали 45–65 HRC и отбелённый чугун');

-- 2. Material Subgroups with Kienzle Constants (kc1.1 MPa, mc)
INSERT INTO material_subgroups (code, iso_group, name_ru, name_en, hardness_hb_min, hardness_hb_max, hardness_hrc_min, hardness_hrc_max, kc1_1_mpa, mc_exponent, typical_alloys) VALUES
('P1', 'P', 'Нелегированные конструкционные стали', 'Unalloyed Steel', 125, 190, NULL, NULL, 1500.0, 0.250, ARRAY['Ст20', 'Ст45', 'AISI 1045', 'S355']),
('P2', 'P', 'Низколегированные стали', 'Low-Alloy Steel', 180, 275, NULL, NULL, 1700.0, 0.250, ARRAY['40Х', '30ХГСА', '42CrMo4', 'AISI 4140']),
('M1', 'M', 'Аустенитные нержавеющие стали', 'Austenitic Stainless', 150, 220, NULL, NULL, 1800.0, 0.210, ARRAY['12Х18Н10Т', 'AISI 304', 'AISI 316L']),
('K1', 'K', 'Серый чугун', 'Grey Cast Iron', 160, 240, NULL, NULL, 1150.0, 0.280, ARRAY['СЧ20', 'СЧ25', 'GG25', 'EN-GJL-250']),
('N1', 'N', 'Деформируемые алюминиевые сплавы', 'Wrought Aluminum', 60, 120, NULL, NULL, 450.0, 0.250, ARRAY['Д16Т', 'АМг6', '6061-T6', '7075-T6']),
('S2', 'S', 'Титановые сплавы (α+β)', 'Titanium Alloys', 280, 350, 30, 38, 1450.0, 0.230, ARRAY['ВТ6', 'Ti-6Al-4V']),
('H1', 'H', 'Закалённые стали 48–58 HRC', 'Hardened Steel', NULL, NULL, 48, 58, 3200.0, 0.300, ARRAY['Х12МФ', '40Х (зак.)', 'AISI D2']);

-- 3. Generic Vendor-Agnostic Manufacturer Record
INSERT INTO manufacturers (id, code, name, is_generic) VALUES
('00000000-0000-0000-0000-000000000001', 'GENERIC', 'ISO Generic (Vendor-Agnostic)', TRUE);

-- 4. Carbide Grade Archetypes
INSERT INTO carbide_grades (id, manufacturer_id, code, substrate_type, coating_method, coating_composition, toughness_index, wear_resistance_index, max_temp_c, notes) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'GEN-P25-CVD', 'WC_CO', 'CVD', 'TiCN-Al2O3-TiN', 6, 8, 1000, 'Универсальный токарный сплав для сталей (непрерывное и слабопрерывистое резание)'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'GEN-M25-PVD', 'WC_CO', 'PVD', 'AlTiN', 8, 6, 850, 'Вязкий PVD-сплав с острой кромкой для нержавейки и титана'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'GEN-N10-UNC', 'WC_CO', 'UNCOATED', 'Polished Submicron', 7, 7, 650, 'Полированный сплав без покрытия против налипания алюминия'),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'GEN-PM30-MILL', 'WC_CO', 'PVD', 'TiAlSiN', 8, 7, 900, 'Термостойкий фрезерный PVD-сплав, стойкий к термоудару'),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'GEN-DRL-CORE', 'WC_CO', 'PVD', 'TiAlN', 9, 5, 800, 'Высоковязкий сплав для центральной зоны корпусных свёрел (низкая Vc)');

-- 5. Grade-to-ISO-513 Suitability Matrix
INSERT INTO grade_material_suitability (grade_id, iso_group, iso_range_min, iso_range_max, suitability_rank) VALUES
('10000000-0000-0000-0000-000000000001', 'P', 15, 35, 'PRIMARY'),
('10000000-0000-0000-0000-000000000001', 'K', 15, 30, 'SECONDARY'),
('10000000-0000-0000-0000-000000000002', 'M', 15, 35, 'PRIMARY'),
('10000000-0000-0000-0000-000000000002', 'S', 15, 30, 'PRIMARY'),
('10000000-0000-0000-0000-000000000002', 'P', 20, 40, 'SECONDARY'),
('10000000-0000-0000-0000-000000000003', 'N', 5, 25, 'PRIMARY'),
('10000000-0000-0000-0000-000000000004', 'P', 20, 40, 'PRIMARY'),
('10000000-0000-0000-0000-000000000004', 'M', 20, 35, 'PRIMARY'),
('10000000-0000-0000-0000-000000000004', 'K', 20, 35, 'SECONDARY'),
('10000000-0000-0000-0000-000000000005', 'P', 25, 45, 'PRIMARY'),
('10000000-0000-0000-0000-000000000005', 'M', 25, 40, 'PRIMARY');

-- 6. Chipbreakers with 2D Operating Zone Polygons ([fn, ap])
INSERT INTO chipbreakers (id, manufacturer_id, code, operation_domain, application_class, edge_prep, rake_angle_deg, ap_min_mm, ap_max_mm, fn_min_mm, fn_max_mm, operating_zone_polygon, description) VALUES
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'GEN-PM', 'TURNING', 'MEDIUM', 'HONED', 12.0, 0.80, 4.50, 0.15, 0.45,
 '[[0.15, 1.0], [0.22, 0.8], [0.45, 1.2], [0.42, 4.5], [0.20, 4.0], [0.15, 2.2]]'::jsonb,
 'Универсальный получистовой стружколом для сталей'),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'GEN-MF', 'TURNING', 'FINISHING', 'SHARP', 18.0, 0.25, 2.00, 0.08, 0.25,
 '[[0.08, 0.3], [0.15, 0.25], [0.25, 0.4], [0.22, 2.0], [0.10, 1.6]]'::jsonb,
 'Острый чистовой стружколом для нержавейки и нежёстких валов'),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'GEN-AL', 'MILLING', 'ALUMINUM_SHARP', 'SHARP', 22.0, 0.50, 12.00, 0.05, 0.25,
 '[[0.05, 0.5], [0.25, 1.0], [0.20, 12.0], [0.05, 10.0]]'::jsonb,
 'Полированная острокромочная геометрия для фрезерования алюминия'),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'GEN-GM', 'MILLING', 'MEDIUM', 'CHAMFERED_HONED', 10.0, 0.50, 10.00, 0.08, 0.22,
 '[[0.08, 0.5], [0.22, 0.8], [0.18, 10.0], [0.08, 8.0]]'::jsonb,
 'Универсальная геометрия для уступного фрезерования сталей и нерж.'),
('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'GEN-DRL', 'DRILLING', 'MEDIUM', 'HONED', 8.0, 0.00, 0.00, 0.06, 0.16,
 '[[0.06, 0.0], [0.16, 0.0]]'::jsonb,
 'Стружколом для уверенного дробления стружки при корпусном сверлении');

-- 7. Cutting Inserts (Turning, Milling, Axial Drilling)
INSERT INTO cutting_inserts (
    id, manufacturer_id, grade_id, chipbreaker_id, iso_code, operation_domain,
    shape_code, clearance_angle_code, clearance_angle_deg, tolerance_class, fixing_type_code,
    ic_mm, cutting_edge_length_mm, thickness_mm, corner_radius_mm,
    cutting_edges_count, is_double_sided, has_wiper_geometry, hand, iso13399_attrs, relative_cost_index
) VALUES
-- Turning CNMG 120408 (P-medium)
('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
 'CNMG 120408', 'TURNING', 'C', 'N', 0, 'M', 'G',
 12.700, 12.900, 4.760, 0.800, 4, TRUE, FALSE, 'N',
 '{"EPSR": 80, "D1": 5.16}'::jsonb, 1.00),

-- Turning CNMG 120404 (M-finishing)
('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
 'CNMG 120404', 'TURNING', 'C', 'N', 0, 'M', 'G',
 12.700, 12.900, 4.760, 0.400, 4, TRUE, FALSE, 'N',
 '{"EPSR": 80, "D1": 5.16}'::jsonb, 1.15),

-- Turning CCMT 09T304 (Internal boring, positive 7 deg)
('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
 'CCMT 09T304', 'TURNING', 'C', 'C', 7, 'M', 'T',
 9.525, 9.670, 3.970, 0.400, 2, FALSE, FALSE, 'N',
 '{"EPSR": 80, "D1": 4.40}'::jsonb, 0.90),

-- Shoulder Milling APKT 160408 (Steel / Stainless)
('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004',
 'APKT 160408', 'MILLING', 'A', 'P', 11, 'K', 'T',
 9.525, 16.500, 4.760, 0.800, 2, FALSE, TRUE, 'R',
 '{"W1": 9.25, "BS": 1.2, "APMX": 14.0}'::jsonb, 1.20),

-- Shoulder Milling APKT 160408-AL (Aluminum sharp)
('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003',
 'APKT 160408-AL', 'MILLING', 'A', 'P', 11, 'K', 'T',
 9.525, 16.500, 4.760, 0.800, 2, FALSE, TRUE, 'R',
 '{"W1": 9.25, "BS": 1.2, "APMX": 14.0, "surface": "polished"}'::jsonb, 1.25),

-- Axial Indexable Drill Insert WCMX 050308 (Center & Peripheral)
('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005',
 'WCMX 050308', 'DRILLING', 'W', 'C', 7, 'M', 'X',
 7.938, 5.400, 3.180, 0.800, 3, FALSE, FALSE, 'N',
 '{"D1": 3.40, "drill_zone": "CENTER_AND_PERIPHERY"}'::jsonb, 1.10);

-- 8. Tool Holders & Bodies
INSERT INTO tool_holders (
    id, manufacturer_id, code, tool_category, clamping_system,
    lead_angle_deg, cutting_diameter_mm, effective_teeth_count, min_bore_diameter_mm,
    max_overhang_mm, ld_ratio_max, coolant_through, hand, shank_spec
) VALUES
('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 'PCLNR 2525M 12', 'TURNING_EXTERNAL', 'LEVER', 95.0, NULL, 1, NULL, 32.0, NULL, FALSE, 'R',
 '{"type": "SQUARE", "h_mm": 25, "b_mm": 25}'::jsonb),

('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
 'S20R-SCLCR 09', 'BORING_BAR', 'SCREW', 95.0, NULL, 1, 25.0, 80.0, 4.0, TRUE, 'R',
 '{"type": "CYLINDRICAL", "d_mm": 20}'::jsonb),

('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
 'SHM-AP16-D50-Z5', 'SHOULDER_MILL', 'SCREW', 90.0, 50.0, 5, NULL, 40.0, NULL, TRUE, 'R',
 '{"type": "ARBOR", "bore_mm": 22}'::jsonb),

('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
 'UDRL-WCMX05-D26-3D', 'INDEXABLE_DRILL', 'SCREW', NULL, 26.0, 1, NULL, 78.0, 3.0, TRUE, 'R',
 '{"type": "WELDON", "d_mm": 25}'::jsonb);

-- 9. Holder-to-Insert Pocket Compatibility
INSERT INTO holder_insert_compatibility (holder_id, seat_pocket_signature, seat_position, inserts_required_qty, allowed_radius_min_mm, allowed_radius_max_mm, spare_screw_code) VALUES
('40000000-0000-0000-0000-000000000001', 'C-N-1270-476-G', 'MAIN', 1, 0.4, 1.6, 'LEVER-LN12'),
('40000000-0000-0000-0000-000000000002', 'C-C-953-397-T',  'MAIN', 1, 0.2, 0.8, 'M3.5x10-T15'),
('40000000-0000-0000-0000-000000000003', 'A-P-953-476-T',  'MAIN', 5, 0.4, 3.2, 'M4x10-T15'),
('40000000-0000-0000-0000-000000000004', 'W-C-794-318-X',  'CENTER', 1, 0.4, 0.8, 'M2.5x6-T8'),
('40000000-0000-0000-0000-000000000004', 'W-C-794-318-X',  'PERIPHERAL', 1, 0.4, 0.8, 'M2.5x6-T8');

-- 10. Cutting Data Recommendations
INSERT INTO cutting_recommendations (
    grade_id, chipbreaker_id, material_subgroup_code, operation_domain,
    vc_min_m_min, vc_opt_m_min, vc_max_m_min,
    feed_min_mm, feed_opt_mm, feed_max_mm,
    ap_min_mm, ap_opt_mm, ap_max_mm,
    ae_ratio_opt, coolant_mode, stability_notes
) VALUES
-- Turning Steel P1 with GEN-P25-CVD / GEN-PM
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'P1', 'TURNING',
 220, 290, 360, 0.15, 0.30, 0.45, 0.8, 2.5, 4.5, NULL, 'FLOOD', 'При прерывистом резании снизить Vc на 20%'),

-- Turning Stainless M1 with GEN-M25-PVD / GEN-MF
('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'M1', 'TURNING',
 120, 165, 210, 0.08, 0.16, 0.25, 0.25, 1.0, 2.0, NULL, 'FLOOD', 'Обильная СОЖ для исключения наклёпа'),

-- Shoulder Milling Steel P2 with GEN-PM30-MILL / GEN-GM
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'P2', 'MILLING',
 140, 185, 230, 0.08, 0.14, 0.20, 0.5, 3.0, 8.0, 0.50, 'AIR_BLAST', 'Предпочтительно сухое резание или обдув воздухом (термоудар)'),

-- Shoulder Milling Aluminum N1 with GEN-N10-UNC / GEN-AL
('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'N1', 'MILLING',
 400, 650, 900, 0.08, 0.15, 0.22, 0.5, 4.0, 10.0, 0.60, 'FLOOD', 'Высокие обороты, обязательное вымывание стружки'),

-- Indexable Drilling Steel P1 with GEN-DRL-CORE / GEN-DRL
('10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'P1', 'DRILLING',
 120, 160, 200, 0.06, 0.11, 0.15, 0.0, 0.0, 0.0, NULL, 'HIGH_PRESSURE_THROUGH', 'Обязателен внутренний подвод СОЖ >= 15 бар');

-- 11. Sample Shop-Floor Machine Profiles
INSERT INTO machine_profiles (name, machine_type, max_rpm, spindle_power_kw, max_torque_nm, spindle_interface, coolant_pressure_bar, rigidity_class) VALUES
('Токарно-фрезерный центр (типовой)', 'TURN_MILL', 4500, 18.5, 320.0, 'BMT55', 20.0, 'HIGH'),
('Вертикальный фрезерный ОЦ (BT40)', 'MILL_3AX', 12000, 15.0, 95.0, 'BT40', 25.0, 'MEDIUM');
