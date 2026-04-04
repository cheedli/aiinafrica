from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.enums import TA_LEFT
from models.schemas import ClinicalReport

LAVENDER = colors.HexColor("#6c63ff")
LIGHT_BG = colors.HexColor("#f8f7ff")
MINT = colors.HexColor("#B8F0D8")
PEACH = colors.HexColor("#FFD4B8")
SKY = colors.HexColor("#B8E8FF")

def build_pdf(report: ClinicalReport) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )
    styles = getSampleStyleSheet()

    def style(name, **kwargs):
        return ParagraphStyle(name, parent=styles["Normal"], **kwargs)

    title_style = style("Title", fontSize=20, textColor=LAVENDER, spaceAfter=4, fontName="Helvetica-Bold")
    meta_style = style("Meta", fontSize=9, textColor=colors.grey, spaceAfter=12)
    h2_style = style("H2", fontSize=13, textColor=LAVENDER, fontName="Helvetica-Bold", spaceBefore=16, spaceAfter=6)
    h3_style = style("H3", fontSize=11, fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4)
    body_style = style("Body", fontSize=10, spaceAfter=6, leading=14)
    warn_style = style("Warn", fontSize=9, textColor=colors.HexColor("#856404"), spaceAfter=10)
    link_style = style("Link", fontSize=9, textColor=colors.blue, spaceAfter=4)
    small_style = style("Small", fontSize=9, textColor=colors.grey, spaceAfter=2)

    story = []

    # Header
    story.append(Paragraph("MedSyn Investigator — Clinical Brief", title_style))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} &nbsp;|&nbsp; Language: {report.detected_language}",
        meta_style
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=LAVENDER, spaceAfter=10))

    # Disclaimer
    disclaimer_data = [[Paragraph(f"⚠️ {report.disclaimer}", warn_style)]]
    disclaimer_table = Table(disclaimer_data, colWidths=["100%"])
    disclaimer_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fff3cd")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#ffc107")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(disclaimer_table)
    story.append(Spacer(1, 10))

    # Patient Summary
    story.append(Paragraph("Patient Summary", h2_style))
    story.append(Paragraph(report.patient_summary, body_style))

    # Differentials
    if report.differentials:
        story.append(Paragraph("Ranked Differential Diagnoses", h2_style))
        rank_colors = [colors.HexColor("#e8e0ff"), MINT, SKY, PEACH, colors.HexColor("#FFF4B8")]
        for d in report.differentials:
            bg = rank_colors[min(d.rank - 1, len(rank_colors) - 1)]
            tags = f"ORPHA:{d.orpha_code}" if d.orpha_code else ""
            if d.icd11_code:
                tags += f"  ICD-11:{d.icd11_code}" if tags else f"ICD-11:{d.icd11_code}"
            rows = [
                [Paragraph(f"<b>#{d.rank} {d.name}</b>  —  {int(d.confidence*100)}% confidence", body_style)],
                [Paragraph(d.reasoning, small_style)],
            ]
            if tags:
                rows.append([Paragraph(tags, small_style)])
            if d.regional_prevalence:
                rows.append([Paragraph(f"🌍 {d.regional_prevalence}", small_style)])
            t = Table(rows, colWidths=["100%"])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), bg),
                ("BOX", (0, 0), (-1, -1), 1.5, colors.black),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(t)
            story.append(Spacer(1, 6))

    # Evidence
    if report.evidence:
        story.append(Paragraph("Supporting Evidence (PubMed)", h2_style))
        for e in report.evidence:
            story.append(Paragraph(f"<b>{e.title}</b>", body_style))
            story.append(Paragraph(f"{e.authors} · {e.journal} · {e.year}", small_style))
            if e.relevance_note:
                story.append(Paragraph(f"<i>{e.relevance_note}</i>", small_style))
            story.append(Paragraph(e.url, link_style))
            story.append(Spacer(1, 4))

    # Action Plan
    story.append(Paragraph("Action Plan", h2_style))
    if report.action_plan.tests_to_order:
        story.append(Paragraph("Tests to Order", h3_style))
        for i, t in enumerate(report.action_plan.tests_to_order, 1):
            story.append(Paragraph(f"{i:02d}. {t}", body_style))
    if report.action_plan.specialists_to_consult:
        story.append(Paragraph("Specialists to Consult", h3_style))
        for i, s in enumerate(report.action_plan.specialists_to_consult, 1):
            story.append(Paragraph(f"{i:02d}. {s}", body_style))
    if report.action_plan.hypotheses_to_rule_out:
        story.append(Paragraph("Hypotheses to Rule Out", h3_style))
        for i, h in enumerate(report.action_plan.hypotheses_to_rule_out, 1):
            story.append(Paragraph(f"{i:02d}. {h}", body_style))

    # WHO Context
    if report.who_context:
        story.append(Paragraph("WHO Regional Context", h2_style))
        story.append(Paragraph(report.who_context, body_style))

    doc.build(story)
    return buffer.getvalue()
