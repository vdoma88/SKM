-- =============================================================================
-- Vendor-Agnostic Indexable Insert & Tooling Selector Database Schema
-- Target DBMS: PostgreSQL 16+ (compatible with SQLite via JSON1/TEXT mapping)
-- Standards: ISO 13399 (Tool Data), ISO 1832 (Insert Codes), ISO 513 (Materials)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. ENUMS & DOMAIN TYPES
-- -----------------------------------------------------------------------------

CREATE TYPE iso_material_group_enum AS ENUM ('P', 'M', 'K', 'N', 'S', 'H');

CREATE TYPE operation_domain_enum AS ENUM (
    'TURNING',
    'MILLING',
    'DRILLING',
    'GROOVING_THREADING'
);

CREATE TYPE tool_category_enum AS ENUM (
    'TURNING_EXTERNAL',
    'TURNING_INTERNAL',
    'FACE_MILL',
    'SHOULDER_MILL',
    'COPY_MILL',
    'INDEXABLE_DRILL',
    'MODULAR_DRILL',
    'SOLID_CARBIDE_DRILL',
    'TAP_HOLDER',
    'REAMER_CHUCK',
    'FINE_BORING_HEAD',
    'BORING_BAR',
    'GROOVING_HOLDER'
);

CREATE TYPE application_class_enum AS ENUM (
    'FINISHING',
    'MEDIUM',
    'ROUGHING',
    'HEAVY_ROUGHING',
    'ALUMINUM_SHARP'
);

CREATE TYPE edge_prep_enum AS ENUM (
    'SHARP',
    'HONED',
    'CHAMFERED',
    'CHAMFERED_HONED'
);

CREATE TYPE suitability_rank_enum AS ENUM (
    'PRIMARY',
    'SECONDARY',
    'EMERGENCY'
);

CREATE TYPE clamping_system_enum AS ENUM (
    'SCREW',
    'LEVER',
    'TOP_CLAMP',
    'WEDGE',
    'CARTRIDGE',
    'BAYONET',
    'INTEGRAL'
);

CREATE TYPE coolant_mode_enum AS ENUM (
    'FLOOD',
    'HIGH_PRESSURE_THROUGH',
    'MIST',
    'AIR_BLAST',
    'DRY'
);

CREATE TYPE machine_type_enum AS ENUM (
    'LATHE',
    'MILL_3AX',
    'MILL_5AX',
    'TURN_MILL'
);

-- -----------------------------------------------------------------------------
-- 2. ISO 513 MATERIAL GROUPS & SUBGROUPS (with Kienzle cutting force constants)
-- -----------------------------------------------------------------------------

CREATE TABLE iso_material_groups (
    code                iso_material_group_enum PRIMARY KEY,
    name_ru             TEXT NOT NULL,
    name_en             TEXT NOT NULL,
    color_hex           CHAR(7) NOT NULL CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    description         TEXT
);

CREATE TABLE material_subgroups (
    code                VARCHAR(10) PRIMARY KEY,        -- e.g. 'P1', 'P2', 'M1', 'S2'
    iso_group           iso_material_group_enum NOT NULL REFERENCES iso_material_groups(code),
    name_ru             TEXT NOT NULL,
    name_en             TEXT NOT NULL,
    hardness_hb_min     INTEGER,
    hardness_hb_max     INTEGER,
    hardness_hrc_min    INTEGER,
    hardness_hrc_max    INTEGER,
    -- Kienzle model constants: kc = kc1_1 * h^(-mc)
    kc1_1_mpa           NUMERIC(7, 1) NOT NULL CHECK (kc1_1_mpa > 0),
    mc_exponent         NUMERIC(4, 3) NOT NULL CHECK (mc_exponent > 0 AND mc_exponent < 1),
    typical_alloys      TEXT[] NOT NULL DEFAULT '{}'    -- e.g. {'Ст45', '40Х', 'AISI 1045'}
);

CREATE INDEX idx_material_subgroups_group ON material_subgroups(iso_group);

-- -----------------------------------------------------------------------------
-- 3. OPTIONAL MANUFACTURERS TABLE (NULL = Vendor-Agnostic / Generic Archetype)
-- -----------------------------------------------------------------------------

CREATE TABLE manufacturers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(32) UNIQUE NOT NULL,    -- e.g. 'GENERIC', 'BRAND_A'
    name                TEXT NOT NULL,
    website_url         TEXT,
    is_generic          BOOLEAN NOT NULL DEFAULT FALSE
);

-- -----------------------------------------------------------------------------
-- 4. CARBIDE GRADES & ISO 513 SUITABILITY MATRIX
-- -----------------------------------------------------------------------------

CREATE TABLE carbide_grades (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer_id         UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
    code                    VARCHAR(64) NOT NULL,       -- e.g. 'GEN-P25-CVD'
    substrate_type          VARCHAR(32) NOT NULL,       -- WC_CO, CERMET, CERAMIC, CBN, PCD
    coating_method          VARCHAR(16) NOT NULL,       -- CVD, PVD, UNCOATED
    coating_composition     VARCHAR(64),                -- e.g. 'TiCN-Al2O3-TiN', 'AlTiN'
    toughness_index         SMALLINT NOT NULL CHECK (toughness_index BETWEEN 1 AND 10),
    wear_resistance_index   SMALLINT NOT NULL CHECK (wear_resistance_index BETWEEN 1 AND 10),
    max_temp_c              INTEGER,
    notes                   TEXT,
    UNIQUE (manufacturer_id, code)
);

CREATE TABLE grade_material_suitability (
    grade_id                UUID NOT NULL REFERENCES carbide_grades(id) ON DELETE CASCADE,
    iso_group               iso_material_group_enum NOT NULL REFERENCES iso_material_groups(code),
    iso_range_min           SMALLINT NOT NULL CHECK (iso_range_min BETWEEN 1 AND 50),
    iso_range_max           SMALLINT NOT NULL CHECK (iso_range_max BETWEEN 1 AND 50),
    suitability_rank        suitability_rank_enum NOT NULL DEFAULT 'PRIMARY',
    PRIMARY KEY (grade_id, iso_group),
    CHECK (iso_range_min <= iso_range_max)
);

CREATE INDEX idx_grade_suitability_lookup
    ON grade_material_suitability(iso_group, suitability_rank, iso_range_min, iso_range_max);

-- -----------------------------------------------------------------------------
-- 5. CHIPBREAKERS (with 2D Polygon for Interactive Chipbreaker Map)
-- -----------------------------------------------------------------------------

CREATE TABLE chipbreakers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer_id         UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
    code                    VARCHAR(64) NOT NULL,       -- e.g. 'PM-MED', 'PF-FIN', 'NM-ALU'
    operation_domain        operation_domain_enum NOT NULL,
    application_class       application_class_enum NOT NULL,
    edge_prep               edge_prep_enum NOT NULL DEFAULT 'HONED',
    rake_angle_deg          NUMERIC(5, 2),              -- Positive/negative effective rake
    ap_min_mm               NUMERIC(6, 3) NOT NULL CHECK (ap_min_mm >= 0),
    ap_max_mm               NUMERIC(6, 3) NOT NULL CHECK (ap_max_mm >= ap_min_mm),
    fn_min_mm               NUMERIC(6, 4) NOT NULL CHECK (fn_min_mm >= 0),
    fn_max_mm               NUMERIC(6, 4) NOT NULL CHECK (fn_max_mm >= fn_min_mm),
    -- Array of [fn, ap] vertices for interactive ECharts/SVG chip-control envelope
    operating_zone_polygon  JSONB NOT NULL DEFAULT '[]'::jsonb,
    description             TEXT,
    UNIQUE (manufacturer_id, code, operation_domain)
);

-- -----------------------------------------------------------------------------
-- 6. CUTTING INSERTS (ISO 13399 Cutting Item + ISO 1832 Parsed Attributes)
-- -----------------------------------------------------------------------------

CREATE TABLE cutting_inserts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer_id         UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
    grade_id                UUID NOT NULL REFERENCES carbide_grades(id),
    chipbreaker_id          UUID REFERENCES chipbreakers(id),

    iso_code                VARCHAR(64) NOT NULL,       -- e.g. 'CNMG 120408'
    normalized_code         VARCHAR(64) GENERATED ALWAYS AS (
                                UPPER(REGEXP_REPLACE(iso_code, '[^A-Za-z0-9]', '', 'g'))
                            ) STORED,
    operation_domain        operation_domain_enum NOT NULL,

    -- Structured ISO 1832 / ISO 13399 geometric fields
    shape_code              VARCHAR(4) NOT NULL,        -- C, D, S, T, V, W, R, A, P...
    clearance_angle_code    CHAR(1) NOT NULL,           -- N, C, P, B, A, E...
    clearance_angle_deg     NUMERIC(5, 2) NOT NULL,     -- 0, 7, 11, 5, 3, 20...
    tolerance_class         CHAR(1) NOT NULL,           -- M, G, E, U, K...
    fixing_type_code        CHAR(1) NOT NULL,           -- G, M, T, W, A, N...
    ic_mm                   NUMERIC(7, 3) NOT NULL CHECK (ic_mm > 0),      -- ISO 13399: IC
    cutting_edge_length_mm  NUMERIC(7, 3) NOT NULL CHECK (cutting_edge_length_mm > 0), -- L
    thickness_mm            NUMERIC(6, 3) NOT NULL CHECK (thickness_mm > 0),           -- S
    corner_radius_mm        NUMERIC(6, 3) NOT NULL CHECK (corner_radius_mm >= 0),      -- RE
    cutting_edges_count     SMALLINT NOT NULL CHECK (cutting_edges_count >= 1),
    is_double_sided         BOOLEAN NOT NULL DEFAULT FALSE,
    has_wiper_geometry      BOOLEAN NOT NULL DEFAULT FALSE,
    hand                    CHAR(1) NOT NULL DEFAULT 'N' CHECK (hand IN ('R', 'L', 'N')),

    -- Canonical pocket signature for fast geometric compatibility matching
    -- Format: SHAPE-CLEARANCE-IC(x100)-THICKNESS(x100)-FIXING
    seat_pocket_signature   VARCHAR(64) GENERATED ALWAYS AS (
                                shape_code || '-' ||
                                clearance_angle_code || '-' ||
                                ROUND(ic_mm * 100)::TEXT || '-' ||
                                ROUND(thickness_mm * 100)::TEXT || '-' ||
                                fixing_type_code
                            ) STORED,

    -- Flexible ISO 13399 extended properties (W1, BS, EPSR, KAPR, D1 mounting hole, etc.)
    iso13399_attrs          JSONB NOT NULL DEFAULT '{}'::jsonb,
    cad_model_uri           TEXT,
    relative_cost_index     NUMERIC(5, 2) DEFAULT 1.00, -- Normalized price index for cost/edge calc
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inserts_norm_code_trgm ON cutting_inserts USING GIN (normalized_code gin_trgm_ops);
CREATE INDEX idx_inserts_pocket_sig     ON cutting_inserts (seat_pocket_signature);
CREATE INDEX idx_inserts_domain_shape   ON cutting_inserts (operation_domain, shape_code, ic_mm, corner_radius_mm);
CREATE INDEX idx_inserts_iso13399_gin   ON cutting_inserts USING GIN (iso13399_attrs);

-- -----------------------------------------------------------------------------
-- 7. TOOL HOLDERS & BODIES (ISO 13399 Tool Item)
-- -----------------------------------------------------------------------------

CREATE TABLE tool_holders (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer_id         UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
    code                    VARCHAR(80) NOT NULL,       -- e.g. 'PCLNR 2525M 12', 'U-DRILL-D25-3D'
    tool_category           tool_category_enum NOT NULL,
    clamping_system         clamping_system_enum NOT NULL,

    lead_angle_deg          NUMERIC(5, 2),              -- KAPR (e.g. 95, 90, 45)
    cutting_diameter_mm     NUMERIC(7, 3),              -- DC (for mills & indexable drills)
    effective_teeth_count   SMALLINT CHECK (effective_teeth_count IS NULL OR effective_teeth_count >= 1),
    min_bore_diameter_mm    NUMERIC(7, 3),              -- DMIN (for boring bars)
    max_overhang_mm         NUMERIC(7, 2),              -- LU / usable length
    ld_ratio_max            NUMERIC(4, 1),              -- e.g. 3.0, 5.0 for drills/boring bars
    coolant_through         BOOLEAN NOT NULL DEFAULT FALSE,
    hand                    CHAR(1) NOT NULL DEFAULT 'R' CHECK (hand IN ('R', 'L', 'N')),

    -- Shank / interface details: {"type": "SQUARE", "h": 25, "b": 25} or {"type": "BT40"}
    shank_spec              JSONB NOT NULL DEFAULT '{}'::jsonb,
    iso13399_attrs          JSONB NOT NULL DEFAULT '{}'::jsonb,
    cad_model_uri           TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holders_category ON tool_holders (tool_category, cutting_diameter_mm);
CREATE INDEX idx_holders_shank_gin ON tool_holders USING GIN (shank_spec);

-- Compatibility matrix: supports multi-pocket tools (e.g., U-drills with center + peripheral inserts)
CREATE TABLE holder_insert_compatibility (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holder_id               UUID NOT NULL REFERENCES tool_holders(id) ON DELETE CASCADE,
    seat_pocket_signature   VARCHAR(64) NOT NULL,
    seat_position           VARCHAR(24) NOT NULL DEFAULT 'MAIN'
                            CHECK (seat_position IN ('MAIN', 'CENTER', 'PERIPHERAL', 'WIPER')),
    inserts_required_qty    SMALLINT NOT NULL DEFAULT 1 CHECK (inserts_required_qty >= 1),
    allowed_radius_min_mm   NUMERIC(6, 3) DEFAULT 0.0,
    allowed_radius_max_mm   NUMERIC(6, 3) DEFAULT 99.0,
    spare_screw_code        VARCHAR(40),
    UNIQUE (holder_id, seat_pocket_signature, seat_position)
);

CREATE INDEX idx_compat_pocket ON holder_insert_compatibility (seat_pocket_signature);

-- -----------------------------------------------------------------------------
-- 8. CUTTING DATA RECOMMENDATIONS (Starting & Operating Windows)
-- -----------------------------------------------------------------------------

CREATE TABLE cutting_recommendations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id                UUID NOT NULL REFERENCES carbide_grades(id) ON DELETE CASCADE,
    chipbreaker_id          UUID REFERENCES chipbreakers(id) ON DELETE SET NULL,
    material_subgroup_code  VARCHAR(10) NOT NULL REFERENCES material_subgroups(code),
    operation_domain        operation_domain_enum NOT NULL,

    -- Cutting speed Vc (m/min)
    vc_min_m_min            NUMERIC(7, 2) NOT NULL CHECK (vc_min_m_min > 0),
    vc_opt_m_min            NUMERIC(7, 2) NOT NULL,
    vc_max_m_min            NUMERIC(7, 2) NOT NULL,

    -- Feed: fn (mm/rev) for turning/drilling, fz (mm/tooth) for milling
    feed_min_mm             NUMERIC(6, 4) NOT NULL CHECK (feed_min_mm > 0),
    feed_opt_mm             NUMERIC(6, 4) NOT NULL,
    feed_max_mm             NUMERIC(6, 4) NOT NULL,

    -- Axial depth of cut ap (mm)
    ap_min_mm               NUMERIC(6, 3) NOT NULL CHECK (ap_min_mm >= 0),
    ap_opt_mm               NUMERIC(6, 3) NOT NULL,
    ap_max_mm               NUMERIC(6, 3) NOT NULL,

    -- Radial engagement ratio ae/Dc (for milling only)
    ae_ratio_opt            NUMERIC(4, 3) CHECK (ae_ratio_opt IS NULL OR (ae_ratio_opt > 0 AND ae_ratio_opt <= 1)),

    coolant_mode            coolant_mode_enum NOT NULL DEFAULT 'FLOOD',
    stability_notes         TEXT,

    CHECK (vc_min_m_min <= vc_opt_m_min AND vc_opt_m_min <= vc_max_m_min),
    CHECK (feed_min_mm <= feed_opt_mm AND feed_opt_mm <= feed_max_mm),
    CHECK (ap_min_mm <= ap_opt_mm AND ap_opt_mm <= ap_max_mm)
);

CREATE INDEX idx_cut_rec_lookup
    ON cutting_recommendations (material_subgroup_code, operation_domain, grade_id, chipbreaker_id);

-- -----------------------------------------------------------------------------
-- 9. CROSS-REFERENCE ENGINE (Functional Equivalents)
-- -----------------------------------------------------------------------------

CREATE TABLE insert_cross_references (
    source_insert_id        UUID NOT NULL REFERENCES cutting_inserts(id) ON DELETE CASCADE,
    target_insert_id        UUID NOT NULL REFERENCES cutting_inserts(id) ON DELETE CASCADE,
    match_type              VARCHAR(32) NOT NULL CHECK (match_type IN (
                                'EXACT_ISO',
                                'FUNCTIONAL_EQUIVALENT',
                                'HIGHER_TOUGHNESS',
                                'HIGHER_WEAR_RESISTANCE'
                            )),
    confidence_score        NUMERIC(3, 2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    notes                   TEXT,
    PRIMARY KEY (source_insert_id, target_insert_id),
    CHECK (source_insert_id <> target_insert_id)
);

-- -----------------------------------------------------------------------------
-- 10. SHOP FLOOR CONTEXT: MACHINE PROFILES & SAVED ASSEMBLIES
-- -----------------------------------------------------------------------------

CREATE TABLE machine_profiles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    TEXT NOT NULL,
    machine_type            machine_type_enum NOT NULL,
    max_rpm                 INTEGER NOT NULL CHECK (max_rpm > 0),
    spindle_power_kw        NUMERIC(6, 2) NOT NULL CHECK (spindle_power_kw > 0),
    max_torque_nm           NUMERIC(8, 2) NOT NULL CHECK (max_torque_nm > 0),
    spindle_interface       VARCHAR(32) NOT NULL,       -- e.g. 'BT40', 'HSK-A63', 'VDI40'
    coolant_pressure_bar    NUMERIC(5, 1) DEFAULT 10.0,
    rigidity_class          VARCHAR(16) NOT NULL DEFAULT 'MEDIUM'
                            CHECK (rigidity_class IN ('HIGH', 'MEDIUM', 'LOW')),
    -- Optional torque/power curve: [{"rpm": 500, "kw": 7.5, "nm": 143}, ...]
    power_torque_curve      JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_tool_assemblies (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assembly_name           TEXT NOT NULL,
    machine_id              UUID REFERENCES machine_profiles(id) ON DELETE SET NULL,
    holder_id               UUID NOT NULL REFERENCES tool_holders(id),
    primary_insert_id       UUID NOT NULL REFERENCES cutting_inserts(id),
    secondary_insert_id     UUID REFERENCES cutting_inserts(id), -- e.g. center insert on U-drill
    overhang_mm             NUMERIC(7, 2),
    saved_cutting_params    JSONB NOT NULL DEFAULT '{}'::jsonb,  -- snapshot of Vc, RPM, f, ap, ae, Pc
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. HELPER VIEW FOR FAST INSERT SELECTION & SCORING
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_insert_selector_catalog AS
SELECT
    ci.id AS insert_id,
    ci.iso_code,
    ci.normalized_code,
    ci.operation_domain,
    ci.shape_code,
    ci.clearance_angle_deg,
    ci.ic_mm,
    ci.thickness_mm,
    ci.corner_radius_mm,
    ci.cutting_edges_count,
    ci.is_double_sided,
    ci.has_wiper_geometry,
    ci.seat_pocket_signature,
    ci.relative_cost_index,
    ROUND(ci.relative_cost_index / NULLIF(ci.cutting_edges_count, 0), 3) AS cost_per_edge_index,
    cg.id AS grade_id,
    cg.code AS grade_code,
    cg.substrate_type,
    cg.coating_method,
    cg.toughness_index,
    cg.wear_resistance_index,
    cb.id AS chipbreaker_id,
    cb.code AS chipbreaker_code,
    cb.application_class,
    cb.edge_prep,
    cb.ap_min_mm,
    cb.ap_max_mm,
    cb.fn_min_mm,
    cb.fn_max_mm,
    cb.operating_zone_polygon,
    gms.iso_group,
    gms.iso_range_min,
    gms.iso_range_max,
    gms.suitability_rank
FROM cutting_inserts ci
JOIN carbide_grades cg ON cg.id = ci.grade_id
LEFT JOIN chipbreakers cb ON cb.id = ci.chipbreaker_id
JOIN grade_material_suitability gms ON gms.grade_id = cg.id;
