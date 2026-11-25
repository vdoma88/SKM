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
    {"iso_code": "CNMG 120408", "grade_code": "GEN-P25-CVD", "qty": 40, "unit_price_rub": 620.0, "bin_location": "A-01-2", "supplier": "Склад-Основной"},
    {"iso_code": "WNMG 080408", "grade_code": "GEN-P25-CVD", "qty": 60, "unit_price_rub": 690.0, "bin_location": "A-01-4", "supplier": "Склад-Основной"},
    {"iso_code": "WNMG 080412", "grade_code": "GEN-P35-TOUGH", "qty": 20, "unit_price_rub": 740.0, "bin_location": "A-01-5", "supplier": "Склад-Основной"},
    {"iso_code": "CNMG 120404", "grade_code": "GEN-M25-PVD", "qty": 30, "unit_price_rub": 710.0, "bin_location": "A-02-1", "supplier": "Склад-Основной"},
    {"iso_code": "DNMG 150608", "grade_code": "GEN-P25-CVD", "qty": 25, "unit_price_rub": 820.0, "bin_location": "A-02-3", "supplier": "Склад-Основной"},
    {"iso_code": "TNMG 160408", "grade_code": "GEN-P25-CVD", "qty": 50, "unit_price_rub": 540.0, "bin_location": "A-02-6", "supplier": "Склад-Основной"},
    {"iso_code": "CCMT 09T304", "grade_code": "GEN-M25-PVD", "qty": 18, "unit_price_rub": 580.0, "bin_location": "B-01-1", "supplier": "Склад-Основной"},
    {"iso_code": "CCGT 09T304-AL", "grade_code": "GEN-N10-UNC", "qty": 12, "unit_price_rub": 640.0, "bin_location": "B-01-2", "supplier": "Склад-Основной"},
    {"iso_code": "APKT 160408", "grade_code": "GEN-PM30-MILL", "qty": 35, "unit_price_rub": 790.0, "bin_location": "C-01-1", "supplier": "Склад-Фрезы"},
    {"iso_code": "SEKT 120408", "grade_code": "GEN-PM30-MILL", "qty": 24, "unit_price_rub": 850.0, "bin_location": "C-01-3", "supplier": "Склад-Фрезы"},
    {"iso_code": "WCMX 050308", "grade_code": "GEN-DRL-CORE", "qty": 16, "unit_price_rub": 720.0, "bin_location": "D-01-1", "supplier": "Склад-Осевой"},
    {"iso_code": "SPMG 090408", "grade_code": "GEN-DRL-UNIV", "qty": 22, "unit_price_rub": 840.0, "bin_location": "D-01-3", "supplier": "Склад-Осевой"},
    {"iso_code": "MGMN 300", "grade_code": "GEN-M25-PVD", "qty": 30, "unit_price_rub": 610.0, "bin_location": "E-01-1", "supplier": "Склад-Канавки"},
    {"iso_code": "16ER AG60", "grade_code": "GEN-M25-PVD", "qty": 15, "unit_price_rub": 760.0, "bin_location": "E-01-2", "supplier": "Склад-Резьба"},
    {"iso_code": "SOMT 11T308", "grade_code": "GEN-DRL-UNIV", "qty": 20, "unit_price_rub": 920.0, "bin_location": "D-01-4", "supplier": "Склад-Осевой"},
    {"iso_code": "WCMT 06T308", "grade_code": "GEN-DRL-CORE", "qty": 18, "unit_price_rub": 860.0, "bin_location": "D-01-5", "supplier": "Склад-Осевой"},
    {"iso_code": "MOD-DRL-140", "grade_code": "GEN-DRL-UNIV", "qty": 6, "unit_price_rub": 2450.0, "bin_location": "D-02-1", "supplier": "Склад-Осевой"},
    {"iso_code": "MOD-DRL-200", "grade_code": "GEN-DRL-UNIV", "qty": 4, "unit_price_rub": 3180.0, "bin_location": "D-02-2", "supplier": "Склад-Осевой"},
    {"iso_code": "SC-DRL-080-5D", "grade_code": "GEN-PM30-MILL", "qty": 8, "unit_price_rub": 2750.0, "bin_location": "D-03-1", "supplier": "Склад-Осевой"},
    {"iso_code": "SC-DRL-120-8D", "grade_code": "GEN-DRL-UNIV", "qty": 5, "unit_price_rub": 4150.0, "bin_location": "D-03-2", "supplier": "Склад-Осевой"},
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
