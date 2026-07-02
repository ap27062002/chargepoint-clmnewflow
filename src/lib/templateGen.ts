// R107 — generate a real, production-ready agreement/template with actual CLAUSE BODY TEXT
// (not just headings), let it be refined by NL instructions, and export it. Deterministic:
// clause bodies are composed from a concept library keyed off each section's heading.
import type { TemplateSection, AgreementTemplate } from '@/types'

// Concept → real clause body text. Keyed by heading keywords so any generated section gets a body.
const CLAUSE_BODIES: { test: RegExp; body: string }[] = [
  { test: /confidential information|definition/i, body: '"Confidential Information" means all non-public business, technical, or financial information disclosed by one Party to the other, in any form, that is designated as confidential or that a reasonable person would understand to be confidential, together with all notes and analyses derived therefrom. The standard five exclusions apply (public domain, prior possession, independent development, rightful third-party receipt, and disclosure required by law).' },
  { test: /marking|identification/i, body: 'No marking is required for information to be protected. Oral or visual disclosures will be treated as Confidential Information; the disclosing Party will confirm the confidential nature of such disclosures in writing within thirty (30) days.' },
  { test: /protection|standard of care/i, body: 'Each receiving Party shall protect the disclosing Party\'s Confidential Information using at least the same degree of care it uses to protect its own information of a similar nature, but in no event less than a reasonable degree of care, and shall use such information solely for the Purpose.' },
  { test: /return|destruction/i, body: 'Upon written request or expiration of this Agreement, the receiving Party shall return or destroy all Confidential Information and certify such destruction within thirty (30) days, provided that one (1) archival copy may be retained for legal and compliance purposes subject to continuing confidentiality obligations.' },
  { test: /injunctive|remedies/i, body: 'Each Party acknowledges that a breach of this Agreement may cause irreparable harm for which monetary damages would be inadequate, and that the non-breaching Party shall be entitled to seek injunctive relief, without the necessity of posting a bond, in addition to any other remedies available at law or in equity.' },
  { test: /term|termination/i, body: 'This Agreement shall remain in effect for three (3) years from the Effective Date. The confidentiality obligations shall survive for three (3) years following disclosure; provided that trade secrets shall remain protected for as long as they qualify as trade secrets under applicable law.' },
  { test: /governing law|venue|jurisdiction/i, body: 'This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict-of-laws principles, and the Parties consent to the exclusive jurisdiction of the state and federal courts located in Delaware.' },
  { test: /license grant|license/i, body: 'Subject to the terms of this Agreement, ChargePoint grants the Customer a limited, non-exclusive, non-transferable license to use the Deliverables solely for the Purpose. All rights not expressly granted are reserved.' },
  { test: /station data|telemetry/i, body: 'ChargePoint owns all right, title, and interest in and to Station Data and charging-network telemetry. Customer receives a license to aggregated, de-identified analytics only; Customer shall not attempt to re-identify or extract raw telemetry.' },
  { test: /firmware|updates/i, body: 'ChargePoint may deliver over-the-air firmware updates and security patches. ChargePoint will provide reasonable advance notice before deprecating materially relied-upon functionality.' },
  { test: /fees|payment/i, body: 'Customer shall pay the subscription fees set forth in the applicable Order Form. Fees are exclusive of taxes and are subject to annual true-up. Undisputed invoices are due net thirty (30) days.' },
  { test: /indemnif/i, body: 'Each Party shall defend and indemnify the other against third-party claims that the indemnifying Party\'s deliverables infringe intellectual-property rights, subject to the standard exclusions and the indemnitee\'s obligation to provide prompt notice and reasonable cooperation.' },
  { test: /limitation of liability|liability/i, body: 'EXCEPT FOR THE EXCLUDED CLAIMS, EACH PARTY\'S AGGREGATE LIABILITY SHALL NOT EXCEED THE FEES PAID IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, AND NEITHER PARTY SHALL BE LIABLE FOR CONSEQUENTIAL, INDIRECT, OR PUNITIVE DAMAGES.' },
  { test: /warrant|disclaimer/i, body: 'ChargePoint warrants that the Deliverables will materially conform to the applicable documentation. EXCEPT AS EXPRESSLY SET FORTH HEREIN, THE DELIVERABLES ARE PROVIDED "AS IS" AND ALL OTHER WARRANTIES ARE DISCLAIMED.' },
]

export function bodyForSection(sec: TemplateSection): string {
  const hit = CLAUSE_BODIES.find((c) => c.test.test(sec.heading + ' ' + sec.summary))
  return hit?.body ?? `${sec.summary} The Parties shall comply with the terms of this Section as further described in the applicable Order Form and the governing provisions of this Agreement.`
}

export function generateSectionBodies(sections: TemplateSection[]): TemplateSection[] {
  return sections.map((s) => ({ ...s, body: s.body ?? bodyForSection(s) }))
}

// A real, self-contained HTML export of the generated agreement (download-to-file).
export function exportTemplateHtml(tpl: AgreementTemplate): string {
  const body = tpl.sections.map((s, i) => `<h2>${s.heading}</h2><p>${s.body ?? s.summary}</p>`).join('\n')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${tpl.name}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#1e293b;line-height:1.5}h1{text-align:center}h2{font-size:15px;margin-top:22px}p{font-size:13px}</style></head>
<body><h1>${tpl.name.toUpperCase()}</h1><p style="text-align:center;font-size:11px;color:#64748b">${tpl.agreement_type} · generated by ChargePoint CLM · ${tpl.sections.length} sections</p>
${body}</body></html>`
}
