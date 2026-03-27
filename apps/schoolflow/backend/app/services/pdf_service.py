"""Bulletin scolaire PDF generation using ReportLab."""
from __future__ import annotations

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)


def generate_bulletin_pdf(bulletin_data: dict) -> bytes:
    """Generate a school report card (bulletin) PDF."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    # Header
    title_style = ParagraphStyle("Title", parent=styles["Heading1"],
                                 fontSize=20, textColor=colors.HexColor("#15803d"),
                                 alignment=1, spaceAfter=4)
    sub_style = ParagraphStyle("Sub", parent=styles["Normal"],
                               fontSize=11, alignment=1,
                               textColor=colors.HexColor("#374151"))

    story.append(Paragraph("SchoolFlow Africa", title_style))
    story.append(Paragraph("BULLETIN DE NOTES", sub_style))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#15803d")))
    story.append(Spacer(1, 0.5*cm))

    # Student info
    info_data = [
        ["Élève :", bulletin_data.get("student_name", ""), "Classe :", bulletin_data.get("class_name", "")],
        ["Trimestre :", bulletin_data.get("term_name", ""), "Année :", bulletin_data.get("academic_year", "")],
        ["N° Matricule :", bulletin_data.get("student_number", ""), "Date :", datetime.now().strftime("%d/%m/%Y")],
    ]
    info_table = Table(info_data, colWidths=["18%", "32%", "18%", "32%"])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#bbf7d0")),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.8*cm))

    # Grades table
    headers = ["Matière", "Prof.", "Coeff.", "Note /20", "Note pondérée", "Appréciation"]
    rows = [headers]
    total_coeff = 0.0
    total_weighted = 0.0

    for g in bulletin_data.get("grades", []):
        coeff = float(g.get("coefficient", 1.0))
        score = float(g.get("score", 0))
        weighted = round(score * coeff, 2)
        total_coeff += coeff
        total_weighted += weighted

        appreciation = _appreciation(score)
        rows.append([
            g.get("subject", ""),
            g.get("teacher", "—"),
            f"{coeff:.1f}",
            f"{score:.2f}",
            f"{weighted:.2f}",
            appreciation,
        ])

    average = round(total_weighted / total_coeff, 2) if total_coeff > 0 else 0
    rows.append(["", "", f"{total_coeff:.1f}", "", f"{total_weighted:.2f}", ""])

    grades_table = Table(rows, colWidths=["25%", "20%", "10%", "13%", "17%", "15%"])
    grades_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#15803d")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (2, 0), (-1, -1), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f0fdf4")]),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#dcfce7")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(grades_table)
    story.append(Spacer(1, 0.8*cm))

    # Average summary
    avg_color = "#15803d" if average >= 10 else "#dc2626"
    mention = _mention(average)
    summary_data = [
        [
            Paragraph(f"Moyenne Générale : <font color='{avg_color}'><b>{average:.2f}/20</b></font>", styles["Normal"]),
            Paragraph(f"Mention : <b>{mention}</b>", styles["Normal"]),
        ]
    ]
    summary_table = Table(summary_data, colWidths=["50%", "50%"])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#15803d")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(summary_table)

    # Footer
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    story.append(Paragraph(
        "SchoolFlow Africa — Système de gestion scolaire",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8,
                       textColor=colors.HexColor("#9ca3af"), alignment=1),
    ))

    doc.build(story)
    return buffer.getvalue()


def _appreciation(score: float) -> str:
    if score >= 18:
        return "Excellent"
    elif score >= 15:
        return "Très bien"
    elif score >= 12:
        return "Bien"
    elif score >= 10:
        return "Assez bien"
    elif score >= 8:
        return "Insuffisant"
    else:
        return "Très faible"


def _mention(average: float) -> str:
    if average >= 16:
        return "Très Bien"
    elif average >= 14:
        return "Bien"
    elif average >= 12:
        return "Assez Bien"
    elif average >= 10:
        return "Passable"
    else:
        return "Insuffisant"
