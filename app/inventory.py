"""
Shop-Floor Warehouse Stock & Real Price Inventory Module.
Parses CSV/TSV warehouse exports (Excel UTF-8 / semicolon / comma delimited)
and matches inserts against the ISO 1832 catalog.
"""

from __future__ import annotations

import csv
import io
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class StockItem(BaseModel):
    iso_code: str
    normalized_code: str = ""
    grade_code: Optional[str] = None
    qty: int = Field(0, ge=0)
    unit_price_rub: float = Field(650.0, ge=0)
    bin_location: str = ""
    supplier: str = ""


DEFAULT_STOCK_ITEMS: List[Dict[str, Any]] = [
    {'iso_code': 'CNMG 120408-CM', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 650.0, 'bin_location': 'HT-T01', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'CNMG 120404-CF', 'grade_code': 'H9960MSH', 'qty': 40, 'unit_price_rub': 730.0, 'bin_location': 'HT-T02', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'CNMG 120412-GH', 'grade_code': 'H7270PK', 'qty': 40, 'unit_price_rub': 690.0, 'bin_location': 'HT-T03', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'WNMG 080408-CTM', 'grade_code': 'H7270PK', 'qty': 40, 'unit_price_rub': 680.0, 'bin_location': 'HT-T04', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'WNMG 080412-MR', 'grade_code': 'H7270PK', 'qty': 40, 'unit_price_rub': 720.0, 'bin_location': 'HT-T05', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'WNMG 080408-CM', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 710.0, 'bin_location': 'HT-T06', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'DNMG 150604-CF', 'grade_code': 'H9960MSH', 'qty': 40, 'unit_price_rub': 790.0, 'bin_location': 'HT-T07', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'DNMG 150608-CM', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 760.0, 'bin_location': 'HT-T08', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'VNMG 160404-AU', 'grade_code': 'H9960MSH', 'qty': 40, 'unit_price_rub': 860.0, 'bin_location': 'HT-T09', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SNMG 120412-GH', 'grade_code': 'H7820K', 'qty': 40, 'unit_price_rub': 710.0, 'bin_location': 'HT-T10', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'TNMG 160408-R-TC', 'grade_code': 'H7270P', 'qty': 40, 'unit_price_rub': 580.0, 'bin_location': 'HT-T11', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'CCMT 09T304-XM1', 'grade_code': 'H9760PM', 'qty': 40, 'unit_price_rub': 590.0, 'bin_location': 'HT-T12', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'DCMT 11T304-AL', 'grade_code': 'H040N', 'qty': 40, 'unit_price_rub': 640.0, 'bin_location': 'HT-T13', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'CCGT 09T304-AL', 'grade_code': 'H040N', 'qty': 40, 'unit_price_rub': 650.0, 'bin_location': 'HT-T14', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'CNGA 120408-HT', 'grade_code': 'H9280PMSH', 'qty': 40, 'unit_price_rub': 2490.0, 'bin_location': 'HT-T15', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'XPGT 110304-CF', 'grade_code': 'H9960MSH', 'qty': 40, 'unit_price_rub': 740.0, 'bin_location': 'HT-T16', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'EDHT 0402ER-CM', 'grade_code': 'H9660PMSH', 'qty': 40, 'unit_price_rub': 620.0, 'bin_location': 'HT-M17', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'EPMT 060308-CM', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 680.0, 'bin_location': 'HT-M18', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'LNMU 0303ZER-CM', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 740.0, 'bin_location': 'HT-M19', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'LNHX 11T408AFN', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 770.0, 'bin_location': 'HT-M20', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'LOHT 080408FN', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 760.0, 'bin_location': 'HT-M21', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'LOHT 120510FN', 'grade_code': 'H9780PMS', 'qty': 40, 'unit_price_rub': 890.0, 'bin_location': 'HT-M22', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SDKT 093508-CM', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 830.0, 'bin_location': 'HT-M23', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SDHT 120520-FN', 'grade_code': 'H9960MSH', 'qty': 40, 'unit_price_rub': 940.0, 'bin_location': 'HT-M24', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'WNMU 060610-SN', 'grade_code': 'H9760PM', 'qty': 40, 'unit_price_rub': 810.0, 'bin_location': 'HT-M25', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'XNMX 080608TR-CM', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 870.0, 'bin_location': 'HT-M26', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SNMJ 10T308-SN', 'grade_code': 'H9780PM', 'qty': 40, 'unit_price_rub': 750.0, 'bin_location': 'HT-M27', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SNHT 13T6ANER-CM', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 840.0, 'bin_location': 'HT-M28', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'PNHU 0905GNER-X', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 920.0, 'bin_location': 'HT-M29', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'HNGX 0906ANSN', 'grade_code': 'H9760PM', 'qty': 40, 'unit_price_rub': 980.0, 'bin_location': 'HT-M30', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'XNMU 0805ANTN', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 1020.0, 'bin_location': 'HT-M31', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'ONMU 0605ANSN', 'grade_code': 'H9280PMSH', 'qty': 40, 'unit_price_rub': 1080.0, 'bin_location': 'HT-M32', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'JXHT 1905ZZTN-RA', 'grade_code': 'H9280PMSH', 'qty': 40, 'unit_price_rub': 1150.0, 'bin_location': 'HT-M33', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SDMT 09T308-CM', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 780.0, 'bin_location': 'HT-M34', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'P3204-D16', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 960.0, 'bin_location': 'HT-M35', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SEKT 1204AFEN-11', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 820.0, 'bin_location': 'HT-M36', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SEHT 1204AFFN', 'grade_code': 'H040N', 'qty': 40, 'unit_price_rub': 820.0, 'bin_location': 'HT-M37', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'RDMT 1204MO-ST14', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 890.0, 'bin_location': 'HT-M38', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'APMT 1604PDER-M2', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 730.0, 'bin_location': 'HT-M39', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'APMT 1604PDER-AL', 'grade_code': 'H040N', 'qty': 40, 'unit_price_rub': 780.0, 'bin_location': 'HT-M40', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'HAA-100X3X22-Z24', 'grade_code': 'KM10T', 'qty': 8, 'unit_price_rub': 4450.0, 'bin_location': 'HT-M41', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'MGMN 300-M', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 620.0, 'bin_location': 'HT-G42', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'CD200-300M', 'grade_code': 'H7170P', 'qty': 40, 'unit_price_rub': 680.0, 'bin_location': 'HT-G43', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'CMTPR 100FN', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 750.0, 'bin_location': 'HT-G44', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': '16ER AG60-HT', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 760.0, 'bin_location': 'HT-G45', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'CBGR-060', 'grade_code': 'H9760PM', 'qty': 8, 'unit_price_rub': 2350.0, 'bin_location': 'HT-G46', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'CBFR-080', 'grade_code': 'H9760PM', 'qty': 8, 'unit_price_rub': 2250.0, 'bin_location': 'HT-G47', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'WCMX 050308-HT', 'grade_code': 'H9960MSH', 'qty': 40, 'unit_price_rub': 730.0, 'bin_location': 'HT-D48', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SPMT 07T308-HT', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 750.0, 'bin_location': 'HT-D49', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SPMT 090408-HT', 'grade_code': 'H9760PMS', 'qty': 40, 'unit_price_rub': 810.0, 'bin_location': 'HT-D50', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SPGT 11T308-HT', 'grade_code': 'H9660PMSH', 'qty': 40, 'unit_price_rub': 920.0, 'bin_location': 'HT-D51', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'TOHT 090305-GP', 'grade_code': 'H9660PMSH', 'qty': 40, 'unit_price_rub': 1050.0, 'bin_location': 'HT-D52', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'MOD-DRL-140-HT', 'grade_code': 'H9760PMS', 'qty': 8, 'unit_price_rub': 2380.0, 'bin_location': 'HT-D53', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'MOD-DRL-200-HT', 'grade_code': 'H9760PMS', 'qty': 8, 'unit_price_rub': 3090.0, 'bin_location': 'HT-D54', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SC-DRL-080-5D-HT', 'grade_code': 'H9760PMS', 'qty': 8, 'unit_price_rub': 2690.0, 'bin_location': 'HT-D55', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SC-DRL-120-8D-HT', 'grade_code': 'H9960MSH', 'qty': 8, 'unit_price_rub': 4050.0, 'bin_location': 'HT-D56', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'SC-DRL-100-AL-HT', 'grade_code': 'H040N', 'qty': 8, 'unit_price_rub': 2890.0, 'bin_location': 'HT-D57', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'TAP-M12-BL-HT', 'grade_code': 'H9760PMS', 'qty': 8, 'unit_price_rub': 1820.0, 'bin_location': 'HT-D58', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'FORM-M8-HT', 'grade_code': 'H040N', 'qty': 8, 'unit_price_rub': 1750.0, 'bin_location': 'HT-D59', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'TM-M16-HT', 'grade_code': 'H9960MSH', 'qty': 8, 'unit_price_rub': 3850.0, 'bin_location': 'HT-D60', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'REAM-H7-100-HT', 'grade_code': 'H9760PMS', 'qty': 8, 'unit_price_rub': 2790.0, 'bin_location': 'HT-D61', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'REAM-H7-200-HT', 'grade_code': 'H9760PMS', 'qty': 8, 'unit_price_rub': 4090.0, 'bin_location': 'HT-D62', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
    {'iso_code': 'FBORE-MIC-25-HT', 'grade_code': 'H9960MSH', 'qty': 8, 'unit_price_rub': 3390.0, 'bin_location': 'HT-D63', 'supplier': 'HARDTOOL 2025 · ООО «ТехноИнструмент»'},
]


def normalize_iso_key(code: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", (code or "")).upper()


def parse_stock_csv(csv_text: str) -> List[StockItem]:
    """Parses semicolon-, comma-, or tab-delimited warehouse CSV text."""
    cleaned = (csv_text or "").lstrip("\ufeff").strip()
    if not cleaned:
        return []

    first_line = cleaned.splitlines()[0]
    delimiter = ";" if first_line.count(";") >= first_line.count(",") else ","
    if "\t" in first_line and first_line.count("\t") > max(first_line.count(";"), first_line.count(",")):
        delimiter = "\t"

    reader = csv.DictReader(io.StringIO(cleaned), delimiter=delimiter)
    if not reader.fieldnames:
        return []

    def _pick(row: Dict[str, Any], aliases: List[str], default: str = "") -> str:
        lower_map = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        for alias in aliases:
            if alias in lower_map and lower_map[alias] != "":
                return lower_map[alias]
        return default

    items: List[StockItem] = []
    for row in reader:
        iso_raw = _pick(row, ["iso_code", "iso", "code", "код", "пластина", "обозначение"])
        if not iso_raw:
            continue
        qty_str = _pick(row, ["qty", "quantity", "stock", "остаток", "количество", "шт"], "0")
        price_str = _pick(row, ["unit_price_rub", "price", "цена", "стоимость", "price_rub"], "650")
        grade = _pick(row, ["grade_code", "grade", "сплав", "марка"], "") or None
        cell = _pick(row, ["bin_location", "bin", "cell", "ячейка", "полка"], "")
        sup = _pick(row, ["supplier", "поставщик", "склад"], "")

        try:
            qty = max(0, int(float(qty_str.replace(",", ".").replace(" ", ""))))
        except ValueError:
            qty = 0
        try:
            price = max(0.0, float(price_str.replace(",", ".").replace(" ", "")))
        except ValueError:
            price = 650.0

        items.append(
            StockItem(
                iso_code=iso_raw.upper(),
                normalized_code=normalize_iso_key(iso_raw),
                grade_code=grade,
                qty=qty,
                unit_price_rub=round(price, 2),
                bin_location=cell,
                supplier=sup,
            )
        )
    return items


def generate_sample_stock_csv() -> str:
    lines = ["iso_code;grade_code;qty;unit_price_rub;bin_location;supplier"]
    for item in DEFAULT_STOCK_ITEMS:
        lines.append(
            f"{item['iso_code']};{item['grade_code']};{item['qty']};{item['unit_price_rub']};{item['bin_location']};{item['supplier']}"
        )
    return "\ufeff" + "\n".join(lines) + "\n"
