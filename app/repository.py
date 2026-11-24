"""
Data Repository Layer (PostgreSQL via psycopg3 + In-Memory Seed Fallback).

Connects to PostgreSQL when DATABASE_URL is configured and queries
`v_insert_selector_catalog`, `material_subgroups`, `machine_profiles`,
`holder_insert_compatibility`, and `cutting_recommendations`.
Falls back to an in-memory mirror of db/seed.sql if DATABASE_URL is unset.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional
from uuid import UUID

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
                "S2": {"vc": 55.0, "vc_min": 40.0, "vc_max": 75.0, "feed": 0.12, "ap": 0.8, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P1": {"vc": 230.0, "vc_min": 180.0, "vc_max": 280.0, "feed": 0.18, "ap": 1.2, "coolant": "FLOOD"},
                "P2": {"vc": 195.0, "vc_min": 150.0, "vc_max": 240.0, "feed": 0.15, "ap": 1.0, "coolant": "FLOOD"},
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
            },
        },
        {
            "id": "ins-6", "iso_code": "WCMX 050308", "operation_domain": "DRILLING",
            "shape_code": "W", "clearance_angle_deg": 7.0, "ic_mm": 7.938, "thickness_mm": 3.18, "corner_radius_mm": 0.8,
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
                "P1": {"vc": 160.0, "vc_min": 120.0, "vc_max": 200.0, "feed": 0.11, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "P2": {"vc": 135.0, "vc_min": 100.0, "vc_max": 170.0, "feed": 0.09, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
                "M1": {"vc": 110.0, "vc_min": 80.0, "vc_max": 140.0, "feed": 0.08, "ap": 0.0, "coolant": "HIGH_PRESSURE_THROUGH"},
            },
        },
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

    def _connect(self):
        assert self.db_url is not None and psycopg is not None
        return psycopg.connect(self.db_url, row_factory=dict_row, connect_timeout=5)

    # -------------------------------------------------------------------------
    # Public API used by app/main.py
    # -------------------------------------------------------------------------

    def get_meta(self) -> Dict[str, Any]:
        if self.mode != "postgres":
            return {
                "storage_mode": self.mode,
                "iso_groups": SEED_DATA["iso_groups"],
                "material_subgroups": SEED_DATA["material_subgroups"],
                "machines": SEED_DATA["machines"],
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
            for m in SEED_DATA["machines"]:
                if m["id"] == machine_id:
                    return m
            return None

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
                # Graceful fallback for legacy UI aliases like "m1"
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
            # 1. Query v_insert_selector_catalog + coating_composition from carbide_grades
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

            # Aggregate rows per insert_id (each ISO 513 suitability row produces 1 row in view)
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

            # 2. Fetch compatible tool holders by seat_pocket_signature
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
                    th.effective_teeth_count
                FROM holder_insert_compatibility hic
                JOIN tool_holders th ON th.id = hic.holder_id
                WHERE hic.seat_pocket_signature = ANY(%s)
                ORDER BY th.code ASC, hic.seat_position ASC
                """,
                (list(pocket_signatures),),
            )
            holder_rows = cur.fetchall()

            # 3. Fetch cutting recommendations for matched grades
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

        # Attach compatible holders (respecting allowed corner radius window)
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
                        "clamping": hr["clamping"],
                        "seat_position": hr["seat_position"],
                        "inserts_required_qty": int(hr["inserts_required_qty"]),
                    }
                )
            ins["holders"] = matched_holders

            # Attach cutting recommendations (preferring exact grade + chipbreaker match)
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
