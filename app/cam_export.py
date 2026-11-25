"""
CAM & Standard Tooling Exporters:
- ISO 13399 GTC (Generic Tool Catalog) Package JSON
- Autodesk Fusion 360 Tool Library (.tools JSON)
- FreeCAD CAM ToolBit (.fctb JSON)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.iso1832 import parse_iso1832


class AssemblyExportItem(BaseModel):
    name: str
    operation: str = "TURNING"
    iso_code: str
    grade_code: str = "GEN-P25-CVD"
    chipbreaker_code: str = "GEN-PM"
    holder_code: str = "GENERIC-HOLDER"
    seat_pocket_signature: str = ""
    diameter_mm: float = Field(50.0, gt=0)
    teeth_count: int = Field(1, ge=1)
    vc_m_min: float = Field(220.0, gt=0)
    rpm: float = Field(1400.0, gt=0)
    feed_mm: float = Field(0.25, gt=0)
    vf_mm_min: float = Field(350.0, ge=0)
    ap_mm: float = Field(2.0, ge=0)
    ae_mm: Optional[float] = None
    coolant: str = "FLOOD"


def build_gtc_iso13399_package(items: List[AssemblyExportItem]) -> Dict[str, Any]:
    """Generates a vendor-agnostic ISO 13399 GTC-aligned JSON package."""
    products: List[Dict[str, Any]] = []
    for idx, item in enumerate(items, start=1):
        parsed = parse_iso1832(item.iso_code)
        products.append(
            {
                "product_id": f"SKM-ASM-{idx:03d}",
                "designation": item.name,
                "gtc_class": {
                    "TURNING": "TURNING_ASSEMBLY",
                    "MILLING": "INDEXABLE_MILLING_CUTTER",
                    "DRILLING": "INDEXABLE_DRILL",
                    "GROOVING_THREADING": "GROOVING_THREADING_ASSEMBLY",
                }.get(item.operation, "GENERIC_TOOL_ASSEMBLY"),
                "cutting_item": {
                    "ISO1832": item.iso_code,
                    "GRADE": item.grade_code,
                    "CHIPBREAKER": item.chipbreaker_code,
                    "POCKET_SIGNATURE": item.seat_pocket_signature or parsed.seat_pocket_signature,
                    "IC": parsed.ic_mm,
                    "S": parsed.thickness_mm,
                    "RE": parsed.corner_radius_mm,
                    "L": parsed.cutting_edge_length_mm,
                    "AN": parsed.clearance_angle_deg,
                    "NOE": parsed.cutting_edges_count,
                },
                "tool_item": {
                    "DESIGNATION": item.holder_code,
                    "DC": item.diameter_mm,
                    "ZEP": item.teeth_count,
                },
                "cutting_data": {
                    "VC": item.vc_m_min,
                    "N": item.rpm,
                    "F": item.feed_mm,
                    "VF": item.vf_mm_min,
                    "AP": item.ap_mm,
                    "AE": item.ae_mm,
                    "COOLANT": item.coolant,
                },
            }
        )

    return {
        "gtc_package_information": {
            "gtc_version": "2.0",
            "standard": "ISO 13399",
            "generator": "SKM ISO Tooling Selector v1.0",
            "created_utc": datetime.now(timezone.utc).isoformat(),
            "unit_system": "METRIC",
            "item_count": len(products),
        },
        "products": products,
    }


def build_fusion360_library(items: List[AssemblyExportItem]) -> Dict[str, Any]:
    """Generates an Autodesk Fusion 360 compatible .tools JSON library."""
    tools: List[Dict[str, Any]] = []
    for idx, item in enumerate(items, start=1):
        parsed = parse_iso1832(item.iso_code)
        if item.operation == "MILLING":
            f_type = "face mill"
        elif item.operation == "DRILLING":
            f_type = "drill"
        elif item.operation == "GROOVING_THREADING":
            f_type = "turning grooving"
        else:
            f_type = "turning general"

        tools.append(
            {
                "guid": f"skm-tool-{idx:04d}",
                "description": f"{item.holder_code} / {item.iso_code} ({item.grade_code})",
                "vendor": "ISO Generic (SKM)",
                "product-id": item.iso_code,
                "type": f_type,
                "unit": "millimeters",
                "geometry": {
                    "DC": item.diameter_mm,
                    "NOF": item.teeth_count,
                    "RE": parsed.corner_radius_mm or 0.8,
                    "IC": parsed.ic_mm or 12.7,
                    "S": parsed.thickness_mm or 4.76,
                    "CSP": item.coolant in ("HIGH_PRESSURE_THROUGH", "FLOOD"),
                },
                "start-values": {
                    "presets": [
                        {
                            "name": "SKM Recommended",
                            "v_c": item.vc_m_min,
                            "n": item.rpm,
                            "f_n": item.feed_mm,
                            "v_f": item.vf_mm_min,
                            "stepdown": item.ap_mm,
                            "stepover": item.ae_mm or round(item.diameter_mm * 0.5, 2),
                            "tool-coolant": "flood" if item.coolant != "DRY" else "disabled",
                        }
                    ]
                },
            }
        )
    return {"data": tools, "version": 23}


def build_freecad_toolbit(item: AssemblyExportItem) -> Dict[str, Any]:
    """Generates a FreeCAD CAM ToolBit (.fctb) JSON object."""
    parsed = parse_iso1832(item.iso_code)
    shape_map = {
        "DRILLING": "drill.fcstd",
        "MILLING": "endmill.fcstd",
        "TURNING": "turning.fcstd",
        "GROOVING_THREADING": "grooving.fcstd",
    }
    return {
        "version": 2,
        "name": f"{item.holder_code} ({item.iso_code})",
        "shape": shape_map.get(item.operation, "endmill.fcstd"),
        "parameter": {
            "Diameter": f"{item.diameter_mm} mm",
            "CuttingEdgeHeight": f"{parsed.cutting_edge_length_mm or 12.0} mm",
            "CornerRadius": f"{parsed.corner_radius_mm or 0.8} mm",
            "Material": item.grade_code,
        },
        "attribute": {
            "iso_code": item.iso_code,
            "holder_code": item.holder_code,
            "seat_pocket_signature": item.seat_pocket_signature or parsed.seat_pocket_signature,
            "vc_m_min": item.vc_m_min,
            "rpm": item.rpm,
            "feed_mm": item.feed_mm,
            "ap_mm": item.ap_mm,
        },
    }
