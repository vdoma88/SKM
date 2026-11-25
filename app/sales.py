"""
B2B Commercial Sales, Quick Catalog Search, Holder Upsell & Order Quote Engine (SKM v2.1).
Focused on sales managers, procurement specialists, and end-customers ordering carbide inserts
and axial tooling — without exposing complex cutting-physics sliders on the primary screen.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


HOLDER_UPSELL_PRICE_RUB: Dict[str, float] = {
    "TURNING_EXTERNAL": 4800.0,
    "TURNING_INTERNAL": 5900.0,
    "GROOVING_HOLDER": 4950.0,
    "BORING_BAR": 6900.0,
    "SHOULDER_MILL": 14500.0,
    "FACE_MILL": 17800.0,
    "COPY_MILL": 15200.0,
    "INDEXABLE_DRILL": 12900.0,
    "MODULAR_DRILL": 13400.0,
    "SOLID_CARBIDE_DRILL": 9800.0,
    "TAP_HOLDER": 8900.0,
    "REAMER_CHUCK": 9800.0,
    "FINE_BORING_HEAD": 24500.0,
}

ISO_GROUP_LABELS_RU: Dict[str, str] = {
    "P": "Сталь",
    "M": "Нержавейка",
    "K": "Чугун",
    "N": "Алюминий / цветмет",
    "S": "Титан / жаропрочка",
    "H": "Закалённая сталь",
}

OP_LABELS_RU: Dict[str, str] = {
    "TURNING": "Точение",
    "MILLING": "Фрезерование",
    "DRILLING": "Сверление / Осевой",
    "GROOVING_THREADING": "Канавки и резьба",
}

APP_LABELS_RU: Dict[str, str] = {
    "FINISHING": "Чистовая",
    "MEDIUM": "Получистовая / Универсальная",
    "ROUGHING": "Черновая / Удар",
    "HEAVY_ROUGHING": "Тяжёлая черновая",
    "ALUMINUM_SHARP": "Цветные металлы (острая)",
}

SEARCH_SYNONYMS: Dict[str, List[str]] = {
    "P": ["сталь", "стали", "ст45", "ст20", "40х", "30хгса", "s355", "steel"],
    "M": ["нерж", "нержавей", "нержавейка", "12х18", "304", "316", "stainless", "дуплекс"],
    "K": ["чугун", "сч20", "сч25", "вч50", "gg25", "cast"],
    "N": ["алюм", "алюминий", "д16т", "амг", "латунь", "медь", "бронз", "цветмет", "6061"],
    "S": ["титан", "вт6", "инконель", "inconel", "жаропроч", "суперсплав"],
    "H": ["закал", "кален", "калён", "тверд", "твёрд", "cbn", "кнб", "hrc", "х12мф", "шх15"],
}


class SalesCatalogItem(BaseModel):
    insert_id: str
    iso_code: str
    shape_code: str
    operation_domain: str
    operation_label_ru: str
    axial_subtype: Optional[str] = None
    grade_code: str
    coating_method: str
    chipbreaker_code: str
    application_class: str
    application_label_ru: str
    cutting_edges_count: int
    seat_pocket_signature: str
    primary_iso_groups: List[str]
    secondary_iso_groups: List[str]
    unit_price_rub: float
    pack_qty: int
    pack_price_rub: float
    price_per_edge_rub: float
    stock_qty: int
    in_stock: bool
    availability_label: str
    lead_time_label: str
    bin_location: str = ""
    supplier: str = ""
    holder_code: Optional[str] = None
    holder_category: Optional[str] = None
    holder_upsell_price_rub: Optional[float] = None
    sales_pitch: str
    analogs_count: int = 0
    analogs: List[Dict[str, Any]] = []


class QuoteLineInput(BaseModel):
    item_type: Literal["INSERT", "HOLDER"] = "INSERT"
    code: str
    description: str = ""
    qty: int = Field(10, ge=1)
    unit_price_rub: float = Field(..., ge=0)
    stock_qty: int = Field(0, ge=0)
    pack_qty: int = Field(10, ge=1)


class OrderQuoteRequest(BaseModel):
    customer_name: str = ""
    customer_inn: str = ""
    contact_info: str = ""
    comment: str = ""
    discount_pct: float = Field(0.0, ge=0.0, le=50.0)
    include_vat_20: bool = True
    lines: List[QuoteLineInput] = []


class QuoteLineComputed(BaseModel):
    item_type: str
    code: str
    description: str
    qty: int
    pack_qty: int
    unit_price_rub: float
    discounted_unit_price_rub: float
    line_total_rub: float
    in_stock_now: bool
    availability_note: str


class OrderQuoteResponse(BaseModel):
    quote_number: str
    created_utc: str
    customer_name: str
    customer_inn: str
    contact_info: str
    comment: str
    lines: List[QuoteLineComputed]
    total_positions: int
    total_units: int
    subtotal_rub: float
    discount_pct: float
    discount_rub: float
    total_rub: float
    vat_rub: float
    include_vat_20: bool
    in_stock_lines_count: int
    backorder_lines_count: int
    messenger_text: str


def _determine_pack_qty(ins: Dict[str, Any]) -> int:
    sub = ins.get("axial_subtype")
    if sub in ("SOLID_CARBIDE", "TAP_THREAD_MILL", "REAMER_FINE_BORE"):
        return 1
    if sub == "MODULAR_TIP":
        return 2
    return 10


def _build_sales_pitch(ins: Dict[str, Any], primary_groups: List[str]) -> str:
    op = ins.get("operation_domain", "TURNING")
    sub = ins.get("axial_subtype")
    edges = int(ins.get("cutting_edges_count", 2))
    g_names = ", ".join(ISO_GROUP_LABELS_RU.get(g, g) for g in primary_groups[:2]) or "Универсально"
    app_ru = APP_LABELS_RU.get(ins.get("application_class", "MEDIUM"), "Универсальная")

    if sub == "SOLID_CARBIDE":
        ld = ins.get("ld_ratio_max", 5)
        return f"Монолит ЦТ до {ld:g}xD (внутр. СОЖ, IT8) · {g_names}"
    if sub == "MODULAR_TIP":
        ld = ins.get("ld_ratio_max", 5)
        return f"Сменная коронка до {ld:g}xD (быстрая замена без снятия) · {g_names}"
    if sub == "TAP_THREAD_MILL":
        code = ins.get("iso_code", "")
        if code.startswith("TM-"):
            return f"ЦТ резьбофреза (без риска поломки метчика) · {g_names}"
        if code.startswith("FORM-"):
            return f"Бесстружечный раскатник (высокая прочность резьбы) · {g_names}"
        return f"Машинный метчик с покрытием ({'глух.' if 'BL' in code else 'сквозн.'}) · {g_names}"
    if sub == "REAMER_FINE_BORE":
        tol = ins.get("tolerance_hole", "H7")
        return f"Чистовая обработка отверстий {tol} · {g_names}"
    if op == "GROOVING_THREADING":
        return f"{'Отрезка и канавки' if 'MGMN' in ins.get('iso_code', '') else 'Наружная резьба 60°'} · {edges} кромки · {g_names}"
    if op == "MILLING":
        return f"Фрезерная пластина ({app_ru}) · {edges} кр. · {g_names}"
    if op == "DRILLING":
        return f"СМП для U-сверла · {edges} кр. · {g_names}"
    return f"{app_ru} · {edges} кр. ({'двуст.' if ins.get('is_double_sided') else 'одност.'}) · {g_names}"


def _matches_query(ins: Dict[str, Any], q: str, primary: List[str], secondary: List[str]) -> bool:
    if not q:
        return True
    ql = q.strip().lower()
    q_alnum = re.sub(r"[^a-z0-9а-яё]", "", ql)
    haystack = " ".join(
        [
            str(ins.get("iso_code", "")),
            str(ins.get("grade_code", "")),
            str(ins.get("chipbreaker_code", "")),
            str(ins.get("seat_pocket_signature", "")),
            str(ins.get("operation_domain", "")),
            OP_LABELS_RU.get(ins.get("operation_domain", ""), ""),
            APP_LABELS_RU.get(ins.get("application_class", ""), ""),
            " ".join(h.get("code", "") for h in ins.get("holders", [])),
            " ".join(ISO_GROUP_LABELS_RU.get(g, "") for g in (primary + secondary)),
        ]
    ).lower()
    hay_alnum = re.sub(r"[^a-z0-9а-яё]", "", haystack)

    if ql in haystack or (q_alnum and q_alnum in hay_alnum):
        return True

    # Check material keyword synonyms (e.g. "нержавейка", "40х", "д16т", "титан")
    suit_groups = set(primary + secondary)
    for grp, words in SEARCH_SYNONYMS.items():
        if grp in suit_groups and any(w in ql for w in words):
            return True

    # Operation keyword synonyms
    if any(w in ql for w in ("сверл", "u-сверл", "коронк", "монолит")) and ins.get("operation_domain") == "DRILLING":
        return True
    if any(w in ql for w in ("метчик", "раскат", "резьбофрез")) and ins.get("axial_subtype") == "TAP_THREAD_MILL":
        return True
    if any(w in ql for w in ("разверт", "развёрт", "расточ", "h7", "it6")) and ins.get("axial_subtype") == "REAMER_FINE_BORE":
        return True
    if any(w in ql for w in ("канав", "отрез", "резьб")) and ins.get("operation_domain") == "GROOVING_THREADING":
        return True
    return False


def build_sales_catalog(
    repo: Any,
    q: str = "",
    iso_group: Optional[str] = None,
    operation: Optional[str] = None,
    application_class: Optional[str] = None,
    only_in_stock: bool = False,
    pocket: Optional[str] = None,
    sort_by: Literal["relevance", "price_asc", "edge_price_asc", "stock_desc"] = "relevance",
) -> List[SalesCatalogItem]:
    inserts = repo.list_inserts()
    items: List[SalesCatalogItem] = []
    q_norm = re.sub(r"[^A-Za-z0-9]", "", (q or "")).upper()

    for ins in inserts:
        suit = ins.get("suitability", {})
        primary = [g for g, r in suit.items() if r == "PRIMARY"]
        secondary = [g for g, r in suit.items() if r == "SECONDARY"]

        if iso_group and iso_group != "ALL" and iso_group not in suit:
            continue
        if operation and operation != "ALL" and ins.get("operation_domain") != operation:
            continue
        if application_class and application_class != "ALL":
            app_val = ins.get("application_class", "MEDIUM")
            if application_class == "ROUGHING" and app_val not in ("ROUGHING", "HEAVY_ROUGHING"):
                continue
            elif application_class != "ROUGHING" and app_val != application_class:
                continue
        if pocket and ins.get("seat_pocket_signature") != pocket:
            continue
        if not _matches_query(ins, q, primary, secondary):
            continue

        st = repo.get_stock_match(ins["iso_code"], ins["grade_code"])
        stock_qty = int(st["qty"]) if st else 0
        if only_in_stock and stock_qty <= 0:
            continue

        unit_price = float(st["unit_price_rub"]) if st else round(float(ins.get("relative_cost_index", 1.0)) * 650.0, 0)
        pack_qty = _determine_pack_qty(ins)
        pack_price = round(unit_price * pack_qty, 0)
        edges = max(int(ins.get("cutting_edges_count", 1)), 1)
        price_per_edge = round(unit_price / edges, 1)

        h0 = ins["holders"][0] if ins.get("holders") else None
        h_code = h0["code"] if h0 else None
        h_cat = h0["category"] if h0 else None
        h_price = HOLDER_UPSELL_PRICE_RUB.get(h_cat or "", 5500.0) if h0 else None

        xrefs = repo.get_cross_references(ins["id"])

        items.append(
            SalesCatalogItem(
                insert_id=ins["id"],
                iso_code=ins["iso_code"],
                shape_code=ins.get("shape_code", "C"),
                operation_domain=ins["operation_domain"],
                operation_label_ru=OP_LABELS_RU.get(ins["operation_domain"], ins["operation_domain"]),
                axial_subtype=ins.get("axial_subtype"),
                grade_code=ins["grade_code"],
                coating_method=ins["coating_method"],
                chipbreaker_code=ins["chipbreaker_code"],
                application_class=ins["application_class"],
                application_label_ru=APP_LABELS_RU.get(ins["application_class"], ins["application_class"]),
                cutting_edges_count=edges,
                seat_pocket_signature=ins["seat_pocket_signature"],
                primary_iso_groups=primary,
                secondary_iso_groups=secondary,
                unit_price_rub=round(unit_price, 2),
                pack_qty=pack_qty,
                pack_price_rub=pack_price,
                price_per_edge_rub=price_per_edge,
                stock_qty=stock_qty,
                in_stock=stock_qty > 0,
                availability_label=f"В наличии: {stock_qty} шт" if stock_qty > 0 else "Под заказ",
                lead_time_label="Отгрузка сегодня" if stock_qty > 0 else "Срок поставки 3–5 дн.",
                bin_location=st["bin_location"] if st else "",
                supplier=st["supplier"] if st else "",
                holder_code=h_code,
                holder_category=h_cat,
                holder_upsell_price_rub=h_price,
                sales_pitch=_build_sales_pitch(ins, primary),
                analogs_count=len(xrefs),
                analogs=xrefs,
            )
        )

    if sort_by == "price_asc":
        items.sort(key=lambda x: (x.unit_price_rub, -x.stock_qty))
    elif sort_by == "edge_price_asc":
        items.sort(key=lambda x: (x.price_per_edge_rub, x.unit_price_rub))
    elif sort_by == "stock_desc":
        items.sort(key=lambda x: (-x.stock_qty, x.unit_price_rub))
    else:
        # Relevance: exact ISO match first, then primary material match, then in-stock, then price/edge
        def _rel_key(x: SalesCatalogItem):
            exact = 0 if (q_norm and re.sub(r"[^A-Za-z0-9]", "", x.iso_code).upper() == q_norm) else 1
            prim_match = 0 if (iso_group and iso_group in x.primary_iso_groups) else 1
            in_st = 0 if x.in_stock else 1
            return (exact, prim_match, in_st, x.price_per_edge_rub)

        items.sort(key=_rel_key)

    return items


def build_commercial_quote(req: OrderQuoteRequest) -> OrderQuoteResponse:
    now = datetime.now(timezone.utc)
    q_num = f"KP-{now.strftime('%Y%m%d-%H%M')}"
    disc_factor = 1.0 - (req.discount_pct / 100.0)

    computed: List[QuoteLineComputed] = []
    subtotal = 0.0
    total_units = 0
    in_stock_cnt = 0
    backorder_cnt = 0

    for ln in req.lines:
        raw_sum = ln.unit_price_rub * ln.qty
        subtotal += raw_sum
        disc_unit = round(ln.unit_price_rub * disc_factor, 2)
        line_total = round(disc_unit * ln.qty, 2)
        total_units += ln.qty

        if ln.item_type == "HOLDER":
            in_now = True
            avail_note = "Со склада (1–2 дн.)"
            in_stock_cnt += 1
        elif ln.stock_qty >= ln.qty:
            in_now = True
            avail_note = f"В наличии ({ln.stock_qty} шт)"
            in_stock_cnt += 1
        elif ln.stock_qty > 0:
            in_now = False
            avail_note = f"Частично: {ln.stock_qty} шт + {ln.qty - ln.stock_qty} под заказ"
            backorder_cnt += 1
        else:
            in_now = False
            avail_note = "Под заказ (3–5 дн.)"
            backorder_cnt += 1

        computed.append(
            QuoteLineComputed(
                item_type=ln.item_type,
                code=ln.code,
                description=ln.description,
                qty=ln.qty,
                pack_qty=ln.pack_qty,
                unit_price_rub=round(ln.unit_price_rub, 2),
                discounted_unit_price_rub=disc_unit,
                line_total_rub=line_total,
                in_stock_now=in_now,
                availability_note=avail_note,
            )
        )

    subtotal = round(subtotal, 2)
    total_rub = round(sum(c.line_total_rub for c in computed), 2)
    discount_rub = round(max(0.0, subtotal - total_rub), 2)
    vat_rub = round(total_rub * 20.0 / 120.0, 2) if req.include_vat_20 else 0.0

    # Format clean messenger quote (Telegram / WhatsApp)
    msg_lines = [f"📋 Коммерческое предложение {q_num}"]
    if req.customer_name:
        msg_lines.append(f"Клиент: {req.customer_name}" + (f" (ИНН {req.customer_inn})" if req.customer_inn else ""))
    msg_lines.append("")
    for idx, c in enumerate(computed, start=1):
        msg_lines.append(
            f"{idx}. {c.code} — {c.qty} шт × {c.discounted_unit_price_rub:,.0f} ₽ = {c.line_total_rub:,.0f} ₽ ({c.availability_note})"
        )
    msg_lines.append("")
    if req.discount_pct > 0:
        msg_lines.append(f"Скидка {req.discount_pct:g}%: −{discount_rub:,.0f} ₽")
    vat_lbl = f"в т.ч. НДС 20%: {vat_rub:,.0f} ₽" if req.include_vat_20 else "без НДС"
    msg_lines.append(f"💰 ИТОГО: {total_rub:,.0f} ₽ ({vat_lbl})")
    if req.comment:
        msg_lines.append(f"Комментарий: {req.comment}")

    messenger_text = "\n".join(msg_lines).replace(",", " ")

    return OrderQuoteResponse(
        quote_number=q_num,
        created_utc=now.isoformat(),
        customer_name=req.customer_name,
        customer_inn=req.customer_inn,
        contact_info=req.contact_info,
        comment=req.comment,
        lines=computed,
        total_positions=len(computed),
        total_units=total_units,
        subtotal_rub=subtotal,
        discount_pct=req.discount_pct,
        discount_rub=discount_rub,
        total_rub=total_rub,
        vat_rub=vat_rub,
        include_vat_20=req.include_vat_20,
        in_stock_lines_count=in_stock_cnt,
        backorder_lines_count=backorder_cnt,
        messenger_text=messenger_text,
    )
