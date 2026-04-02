from weasyprint import HTML
from models.schemas import ClinicalReport
from datetime import datetime

def build_pdf(report: ClinicalReport) -> bytes:
    differentials_html = "".join([f'''
    <div class="diagnosis">
      <strong>#{d.rank} {d.name}</strong>
      <span class="confidence">{int(d.confidence * 100)}% confidence</span>
      {f'<span class="tag">ORPHA:{d.orpha_code}</span>' if d.orpha_code else ""}
      {f'<span class="tag">ICD-11: {d.icd11_code}</span>' if d.icd11_code else ""}
      <p>{d.reasoning}</p>
      {f'<p class="meta">Regional: {d.regional_prevalence}</p>' if d.regional_prevalence else ""}
    </div>
    ''' for d in report.differentials])

    evidence_html = "".join([f'''
    <div class="evidence">
      <strong>{e.title}</strong><br>
      <span class="meta">{e.authors} · {e.journal} · {e.year}</span><br>
      <a href="{e.url}">{e.url}</a><br>
      <em>{e.relevance_note}</em>
    </div>
    ''' for e in report.evidence])

    tests_html = "".join([f"<li>{t}</li>" for t in report.action_plan.tests_to_order])
    specialists_html = "".join([f"<li>{s}</li>" for s in report.action_plan.specialists_to_consult])
    hypotheses_html = "".join([f"<li>{h}</li>" for h in report.action_plan.hypotheses_to_rule_out])
    who_html = f"<h2>WHO Regional Context</h2><p>{report.who_context}</p>" if report.who_context else ""

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ font-family: Arial, sans-serif; margin: 40px; color: #1a1a2e; }}
  h1 {{ color: #6c63ff; border-bottom: 3px solid #6c63ff; padding-bottom: 10px; }}
  h2 {{ color: #4a4580; margin-top: 30px; }}
  .disclaimer {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 8px; font-size: 13px; }}
  .diagnosis {{ background: #f8f7ff; border-radius: 12px; padding: 16px; margin: 12px 0; border: 2px solid #e0ddff; }}
  .confidence {{ display: inline-block; background: #6c63ff; color: white; padding: 3px 10px; border-radius: 20px; font-size: 12px; margin-left: 8px; }}
  .evidence {{ font-size: 13px; margin: 12px 0; padding: 10px; background: #f5f5ff; border-radius: 8px; }}
  .tag {{ display: inline-block; background: #e8f5e9; border: 1px solid #81c784; color: #2e7d32; padding: 3px 8px; border-radius: 12px; font-size: 12px; margin: 3px; }}
  .meta {{ color: #888; font-size: 12px; }}
</style>
</head>
<body>
<h1>MedSyn Investigator — Clinical Brief</h1>
<p class="meta">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} | Language: {report.detected_language}</p>
<div class="disclaimer">⚠️ {report.disclaimer}</div>
<h2>Patient Summary</h2>
<p>{report.patient_summary}</p>
<h2>Ranked Differential Diagnoses</h2>
{differentials_html}
<h2>Supporting Evidence (PubMed)</h2>
{evidence_html}
<h2>Action Plan</h2>
<h3>Tests to Order</h3>
<ul>{tests_html}</ul>
<h3>Specialists to Consult</h3>
<ul>{specialists_html}</ul>
<h3>Hypotheses to Rule Out</h3>
<ul>{hypotheses_html}</ul>
{who_html}
</body>
</html>"""
    return HTML(string=html).write_pdf()
