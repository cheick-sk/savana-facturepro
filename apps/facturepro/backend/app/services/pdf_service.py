"""PDF generation service using ReportLab."""
from __future__ import annotations

import io
import logging
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

logger = logging.getLogger(__name__)


def generate_invoice_pdf(invoice_data: dict) -> bytes:
    """Generate a professional invoice PDF and return bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ─── Header ───
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontSize=28,
        textColor=colors.HexColor("#1a56db"),
        spaceAfter=0,
    )
    subtitle_style = ParagraphStyle(
        "InvoiceSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#6b7280"),
    )
    normal = styles["Normal"]

    header_data = [
        [
            Paragraph("FacturePro Africa", title_style),
            Paragraph(
                f"<b>FACTURE</b><br/>{invoice_data['invoice_number']}",
                ParagraphStyle("Num", parent=styles["Normal"], fontSize=16, alignment=2,
                               textColor=colors.HexColor("#1a56db")),
            ),
        ]
    ]
    header_table = Table(header_data, colWidths=["55%", "45%"])
    header_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1a56db")))
    story.append(Spacer(1, 0.5 * cm))

    # ─── Bill To + Dates ───
    status_color = {
        "PAID": "#16a34a", "SENT": "#1a56db",
        "OVERDUE": "#dc2626", "DRAFT": "#6b7280",
    }.get(invoice_data.get("status", "DRAFT"), "#6b7280")

    info_data = [
        [
            Paragraph(
                f"<b>Facturé à :</b><br/>{invoice_data['customer_name']}<br/>"
                f"{invoice_data.get('customer_email', '')}<br/>"
                f"{invoice_data.get('customer_phone', '')}<br/>"
                f"{invoice_data.get('customer_address', '')}",
                normal,
            ),
            Paragraph(
                f"<b>Date d'émission :</b> {_fmt_date(invoice_data['issue_date'])}<br/>"
                f"<b>Date d'échéance :</b> {_fmt_date(invoice_data.get('due_date'))}<br/>"
                f"<b>Statut :</b> <font color='{status_color}'><b>{invoice_data.get('status', 'DRAFT')}</b></font><br/>"
                f"<b>Devise :</b> {invoice_data.get('currency', 'XOF')}",
                normal,
            ),
        ]
    ]
    info_table = Table(info_data, colWidths=["55%", "45%"])
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.8 * cm))

    # ─── Items Table ───
    col_headers = ["Description", "Qté", "Prix Unit.", "TVA %", "Total"]
    rows = [col_headers]
    for item in invoice_data.get("items", []):
        rows.append([
            item["description"],
            f"{float(item['quantity']):.2f}",
            f"{float(item['unit_price']):,.2f} {invoice_data.get('currency', 'XOF')}",
            f"{float(item['tax_rate']):.1f}%",
            f"{float(item['line_total']):,.2f} {invoice_data.get('currency', 'XOF')}",
        ])

    item_table = Table(rows, colWidths=["40%", "10%", "18%", "10%", "22%"])
    item_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a56db")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(item_table)
    story.append(Spacer(1, 0.5 * cm))

    # ─── Totals ───
    currency = invoice_data.get("currency", "XOF")
    totals_data = [
        ["", "Sous-total :", f"{float(invoice_data['subtotal']):,.2f} {currency}"],
        ["", "TVA :", f"{float(invoice_data['tax_amount']):,.2f} {currency}"],
        ["", "TOTAL :", f"{float(invoice_data['total_amount']):,.2f} {currency}"],
    ]
    totals_table = Table(totals_data, colWidths=["55%", "25%", "20%"])
    totals_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (1, 2), (-1, 2), "Helvetica-Bold"),
        ("FONTSIZE", (1, 2), (-1, 2), 12),
        ("TEXTCOLOR", (1, 2), (-1, 2), colors.HexColor("#1a56db")),
        ("BACKGROUND", (1, 2), (-1, 2), colors.HexColor("#eff6ff")),
        ("LINEABOVE", (1, 2), (-1, 2), 1, colors.HexColor("#1a56db")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(totals_table)

    # ─── Notes ───
    if invoice_data.get("notes"):
        story.append(Spacer(1, 0.8 * cm))
        story.append(Paragraph("<b>Notes :</b>", normal))
        story.append(Paragraph(invoice_data["notes"], normal))

    # ─── Footer ───
    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    story.append(Paragraph(
        "Merci pour votre confiance. — FacturePro Africa | contact@facturepro.africa",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8,
                       textColor=colors.HexColor("#9ca3af"), alignment=1),
    ))

    doc.build(story)
    return buffer.getvalue()


def _fmt_date(dt) -> str:
    if dt is None:
        return "—"
    if isinstance(dt, str):
        return dt[:10]
    if isinstance(dt, datetime):
        return dt.strftime("%d/%m/%Y")
    return str(dt)[:10]
