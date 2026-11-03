import { fmtDate, fmtDateTime } from './postOpApi';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Opens a print-friendly report. `record` should be the full record (with assessments).
export const printRecoveryReport = (record) => {
  const w = window.open('', '_blank', 'width=850,height=950');
  if (!w) return false;
  const p = record.patientInfo || {};
  const rows = [...(record.assessments || [])]
    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
    .map((a) => `<tr><td>${esc(fmtDateTime(a.recordedAt))}</td><td>${esc(a.painLevel)}/10</td><td>${esc(a.swelling)}</td><td>${esc(a.bleeding)}</td><td>${esc(a.symptoms)}</td><td>${esc(a.notes)}</td></tr>`)
    .join('');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Post-Op Recovery Report - ${esc(record.patientName)}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;font-size:13px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;border-bottom:1px solid #999;padding-bottom:3px;margin:22px 0 8px}
.meta{color:#555;margin-bottom:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px}
.k{color:#666;font-size:11px}.v{font-weight:bold}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #bbb;padding:5px;text-align:left;vertical-align:top}th{background:#eee}
pre{white-space:pre-wrap;font-family:inherit;margin:0}.foot{margin-top:28px;color:#777;font-size:11px}
@media print{body{margin:12mm}}
</style></head><body>
<h1>Post-Op Recovery Report</h1>
<div class="meta">Generated ${esc(fmtDateTime(new Date()))} &bull; CONFIDENTIAL patient information</div>
<h2>Patient</h2><div class="grid">
<div><div class="k">Name</div><div class="v">${esc(record.patientName)}</div></div>
<div><div class="k">Patient ID</div><div class="v">${esc(record.patientId)}</div></div>
<div><div class="k">Age / Gender</div><div class="v">${esc([p.age, p.gender].filter(Boolean).join(' / ') || '—')}</div></div>
<div><div class="k">Phone</div><div class="v">${esc(p.patientPhone || '—')}</div></div>
<div><div class="k">Email</div><div class="v">${esc(p.patientEmail || '—')}</div></div>
<div><div class="k">Allergies</div><div class="v">${esc(p.medicalHistory?.allergies?.join(', ') || '—')}</div></div></div>
<h2>Procedure</h2><div class="grid">
<div><div class="k">Procedure</div><div class="v">${esc(record.procedure)}</div></div>
<div><div class="k">Procedure date</div><div class="v">${esc(fmtDate(record.procedureDate))}</div></div>
<div><div class="k">Dentist</div><div class="v">${esc(record.dentistName)}</div></div>
<div><div class="k">Recovery start</div><div class="v">${esc(fmtDate(record.recoveryStartDate))}</div></div>
<div><div class="k">Status</div><div class="v">${esc(record.recoveryStatus)}</div></div>
<div><div class="k">Next follow-up</div><div class="v">${esc(record.followUpDate ? `${fmtDate(record.followUpDate)} (${record.followUpStatus})` : '—')}</div></div></div>
<h2>Current Assessment</h2><div class="grid">
<div><div class="k">Pain level</div><div class="v">${esc(record.painLevel)}/10</div></div>
<div><div class="k">Swelling</div><div class="v">${esc(record.swelling)}</div></div>
<div><div class="k">Bleeding</div><div class="v">${esc(record.bleeding)}</div></div></div>
<p><span class="k">Reported symptoms:</span> ${esc(record.symptoms || '—')}</p>
<p><span class="k">Notes:</span><br><pre>${esc(record.notes || '—')}</pre></p>
<h2>Care Instructions</h2><pre>${esc(record.careInstructions || '—')}</pre>
<h2>Assessment History</h2>
<table><thead><tr><th>Recorded</th><th>Pain</th><th>Swelling</th><th>Bleeding</th><th>Symptoms</th><th>Notes</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No assessments</td></tr>'}</tbody></table>
<div class="foot">Record created ${esc(fmtDateTime(record.createdAt))} by ${esc(record.createdBy || '—')} &bull; Last updated ${esc(fmtDateTime(record.updatedAt))} by ${esc(record.updatedBy || '—')}</div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
};