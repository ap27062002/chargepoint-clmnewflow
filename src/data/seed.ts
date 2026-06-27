import type {
  User, Ticket, Agreement, Version, Deviation, Message, Playbook,
  AuditEvent, AppNotification,
} from '@/types'

// ============================================================================
// USERS / PERSONAS  (grounded in the ChargePoint legal demo)
// ============================================================================
export const users: User[] = [
  { id: 'u_eric', name: 'Eric Batill', initials: 'EB', email: 'eric.batill@chargepoint.com', role: 'playbook_owner', title: 'Associate General Counsel', expertise: ['MNDA', 'NDA', 'MSA'], color: '#1f8c3f' },
  { id: 'u_kirsten', name: 'Kirsten Sachs', initials: 'KS', email: 'kirsten.sachs@chargepoint.com', role: 'attorney', title: 'Senior Counsel, Commercial', expertise: ['NDA', 'MNDA', 'MSA', 'SOW'], color: '#6442d4' },
  { id: 'u_daniel', name: 'Daniel Vohrer', initials: 'DV', email: 'daniel.vohrer@chargepoint.com', role: 'attorney', title: 'Counsel, Privacy & Data', expertise: ['DPA', 'NDA'], color: '#0369a1' },
  { id: 'u_marcus', name: 'Marcus Reed', initials: 'MR', email: 'marcus.reed@chargepoint.com', role: 'initiator', title: 'Director, Strategic Partnerships', color: '#b45309' },
  { id: 'u_dana', name: 'Dana Whitfield', initials: 'DW', email: 'dana.whitfield@chargepoint.com', role: 'administrator', title: 'Legal Operations Lead', color: '#be185d' },
  { id: 'u_priya', name: 'Priya Anand', initials: 'PA', email: 'priya.anand@chargepoint.com', role: 'contributor', title: 'Information Security', color: '#0f766e' },
  { id: 'u_tomas', name: 'Tomas Klein', initials: 'TK', email: 'tomas.klein@chargepoint.com', role: 'contributor', title: 'Finance Business Partner', color: '#7c3aed' },
]

export const CURRENT_USER_ID = 'u_kirsten' // default persona = Assigned Attorney
export const AI_ENGINE = { id: 'ai_engine', name: 'CLM Agent', initials: 'AI', color: '#7559e8' }

export const userById = (id: string) => users.find((u) => u.id === id)

// ============================================================================
// PLAYBOOK — ChargePoint Mutual NDA 2025 (North America)
// ============================================================================
export const ndaPlaybook: Playbook = {
  id: 'pb_nda',
  agreement_type: 'MNDA',
  name: 'ChargePoint Mutual NDA 2025 (North America)',
  version: 3,
  owner_id: 'u_eric',
  generated_from: '11 executed NDAs (Apr 2025 – Jan 2026) + Clever Devices + Mondelez',
  created_date: '2026-06-22',
  provisions: [
    { id: 'pv1', provision_name: 'Definition of Confidential Information', cross_cutting_category: 'confidentiality',
      standard_position: 'Broad definition covering all non-public business, technical, and financial information disclosed in any form.',
      fallback_tiers: [], red_line: 'Narrowing to "marked confidential only" with no catch-all for obviously confidential information.',
      rationale: 'Baseline — universally accepted across the sample set; no fallbacks needed.', negotiated_pct: 0 },
    { id: 'pv2', provision_name: 'Marking / Identification', cross_cutting_category: 'confidentiality',
      standard_position: 'No marking requirement; information is protected if a reasonable person would understand it to be confidential.',
      fallback_tiers: ['Marking required for written; oral confirmed confidential if summarized in writing within 30 days.', 'Marking required for all disclosures, written and oral.'],
      red_line: 'Protection contingent on marking with no grace period for oral disclosures.',
      rationale: 'Two fallback tiers approved. Negotiated in 27% of deals.', negotiated_pct: 27 },
    { id: 'pv3', provision_name: 'Protection Obligations / Standard of Care', cross_cutting_category: 'confidentiality',
      standard_position: 'Same degree of care as own confidential information, but no less than a reasonable standard of care.',
      fallback_tiers: ['Reasonable standard of care only (drop "same degree as own").'],
      red_line: 'Best-efforts / strict-liability standard of care.',
      rationale: 'Baseline with accept range (§3.a–3.d).', negotiated_pct: 12 },
    { id: 'pv4', provision_name: 'Exclusions from Confidential Information', cross_cutting_category: 'confidentiality',
      standard_position: 'Standard five exclusions: public domain, prior possession, independently developed, rightfully received, required by law.',
      fallback_tiers: [], red_line: 'Adding "residuals" exclusion permitting use of retained mental impressions.',
      rationale: 'Baseline — universally accepted (§1 exclusions).', negotiated_pct: 4 },
    { id: 'pv5', provision_name: 'Term & Termination', cross_cutting_category: 'term_and_termination',
      standard_position: 'Agreement term 2 years; confidentiality obligations survive 5 years from disclosure; trade secrets protected indefinitely.',
      fallback_tiers: ['Term 3 years; CI survival 3 years.', 'Term 3 years; CI survival 2 years (trade secrets still indefinite).'],
      red_line: 'CI survival under 2 years, or termination of trade-secret protection on expiry.',
      rationale: 'Two fallback tiers approved. Negotiated in 41% of deals.', negotiated_pct: 41 },
    { id: 'pv6', provision_name: 'Injunctive Relief', cross_cutting_category: 'liability',
      standard_position: 'Both parties acknowledge breach causes irreparable harm; injunctive relief available without posting bond.',
      fallback_tiers: ['Injunctive relief mutual; bond requirement left to the court ("as the court deems appropriate").'],
      red_line: 'Injunctive relief available to counterparty only, or mandatory bond posting by ChargePoint.',
      rationale: 'Baseline; one fallback for bond. Negotiated in 18% of deals.', negotiated_pct: 18 },
    { id: 'pv7', provision_name: 'Return / Destruction of Materials', cross_cutting_category: 'confidentiality',
      standard_position: 'Return or destroy on request; certify destruction within 30 days.',
      fallback_tiers: ['Retain one archival copy for legal/compliance and bona fide backup copies subject to ongoing confidentiality.'],
      red_line: 'No destruction certification, or unrestricted retention rights.',
      rationale: 'Baseline with one approved fallback for legal-hold copies.', negotiated_pct: 22 },
    { id: 'pv8', provision_name: 'Governing Law & Venue', cross_cutting_category: 'term_and_termination',
      standard_position: 'Delaware law; exclusive jurisdiction in the state and federal courts of Delaware.',
      fallback_tiers: ['Counterparty home-state law with venue in Delaware.', 'Neutral law (New York) with venue in New York.'],
      red_line: 'Foreign governing law or mandatory ICC arbitration seated outside the U.S.',
      rationale: 'Two fallback tiers. Negotiated in 33% of deals.', negotiated_pct: 33 },
  ],
}
export const playbooks = [ndaPlaybook]

// ============================================================================
// TICKETS
// ============================================================================
export const tickets: Ticket[] = [
  { id: 'TKT-1042', title: 'Vishay Intertechnology — Mutual NDA', type: 'single_agreement', status: 'Red Line Analysis',
    counterparty_name: 'Vishay Intertechnology', assigned_attorney_id: 'u_kirsten', initiator_id: 'u_marcus',
    created_date: '2026-06-18', sla_target_date: '2026-06-30', priority: 'high', agreement_ids: ['AGR-2201'],
    description: 'NDA to support battery-supply technical evaluation. CP paper. Counterparty returned redline 2026-06-22.' },

  { id: 'TKT-1039', title: 'Airbus — Mutual NDA (subcontractor program)', type: 'single_agreement', status: 'Red Line Analysis',
    counterparty_name: 'Airbus', assigned_attorney_id: 'u_kirsten', initiator_id: 'u_marcus',
    created_date: '2026-06-12', sla_target_date: '2026-06-30', priority: 'urgent', agreement_ids: ['AGR-2198'],
    description: 'eVTOL ground-charging exploration. 3 open red lines pending review (6-month→3yr term, subcontractor asymmetry, ICC arbitration).' },

  { id: 'TKT-1031', title: 'Northwind Energy — Charging-as-a-Service Partnership', type: 'multi_agreement', status: 'Internal Review',
    counterparty_name: 'Northwind Energy', assigned_attorney_id: 'u_kirsten', initiator_id: 'u_marcus',
    created_date: '2026-06-05', sla_target_date: '2026-07-10', priority: 'high', agreement_ids: ['AGR-2180', 'AGR-2181', 'AGR-2182'],
    description: 'Strategic CaaS deal: master services agreement + data processing addendum + initial SOW.' },

  { id: 'TKT-1048', title: 'Question — residual clause exposure in evaluation NDAs', type: 'inquiry', status: 'In Progress',
    counterparty_name: '—', assigned_attorney_id: 'u_kirsten', initiator_id: 'u_tomas',
    created_date: '2026-06-24', sla_target_date: '2026-06-28', priority: 'normal', agreement_ids: [],
    description: 'Finance asks whether we have standard guidance on "residuals" language counterparties keep introducing.' },

  { id: 'TKT-1009', title: 'Mondelez — Mutual NDA', type: 'single_agreement', status: 'Executed',
    counterparty_name: 'Mondelez International', assigned_attorney_id: 'u_eric', initiator_id: 'u_marcus',
    created_date: '2026-05-02', sla_target_date: '2026-05-16', priority: 'normal', closed_date: '2026-05-19', agreement_ids: ['AGR-2150'],
    description: 'Fleet-electrification pilot NDA. Executed via DocuSign.' },

  { id: 'TKT-1012', title: 'Clever Devices — Mutual NDA', type: 'single_agreement', status: 'Executed',
    counterparty_name: 'Clever Devices', assigned_attorney_id: 'u_eric', initiator_id: 'u_marcus',
    created_date: '2026-05-08', sla_target_date: '2026-05-22', priority: 'low', closed_date: '2026-05-21', agreement_ids: ['AGR-2152'],
    description: 'Transit-tech integration NDA. Executed.' },
]

// ============================================================================
// AGREEMENTS
// ============================================================================
export const agreements: Agreement[] = [
  { id: 'AGR-2201', ticket_id: 'TKT-1042', title: 'Vishay Intertechnology Mutual NDA', agreement_type: 'MNDA',
    status: 'redline_received', current_version_id: 'V-2201-3', playbook_id: 'pb_nda', paper_origin: 'cp_paper',
    ball_in_court: 'cp_legal', red_line_count: 4, created_date: '2026-06-18' },

  { id: 'AGR-2198', ticket_id: 'TKT-1039', title: 'Airbus Mutual NDA', agreement_type: 'MNDA',
    status: 'negotiation', current_version_id: 'V-2198-2', playbook_id: 'pb_nda', paper_origin: 'cp_paper',
    ball_in_court: 'cp_legal', red_line_count: 3, created_date: '2026-06-12' },

  { id: 'AGR-2180', ticket_id: 'TKT-1031', title: 'Northwind Master Services Agreement', agreement_type: 'MSA',
    status: 'internal_review', current_version_id: 'V-2180-1', playbook_id: null, paper_origin: 'cp_paper',
    ball_in_court: 'cp_legal', red_line_count: 0, created_date: '2026-06-05' },
  { id: 'AGR-2181', ticket_id: 'TKT-1031', title: 'Northwind Data Processing Addendum', agreement_type: 'DPA',
    status: 'draft', current_version_id: 'V-2181-1', playbook_id: null, paper_origin: 'cp_paper',
    ball_in_court: 'cp_legal', red_line_count: 0, created_date: '2026-06-05' },
  { id: 'AGR-2182', ticket_id: 'TKT-1031', title: 'Northwind Initial SOW', agreement_type: 'SOW',
    status: 'draft', current_version_id: 'V-2182-1', playbook_id: null, paper_origin: 'cp_paper',
    ball_in_court: 'cp_legal', red_line_count: 0, created_date: '2026-06-06' },

  { id: 'AGR-2150', ticket_id: 'TKT-1009', title: 'Mondelez Mutual NDA', agreement_type: 'MNDA',
    status: 'executed', current_version_id: 'V-2150-4', playbook_id: 'pb_nda', paper_origin: 'cp_paper',
    ball_in_court: 'cp_legal', red_line_count: 5, created_date: '2026-05-02', executed_date: '2026-05-19' },
  { id: 'AGR-2152', ticket_id: 'TKT-1012', title: 'Clever Devices Mutual NDA', agreement_type: 'MNDA',
    status: 'executed', current_version_id: 'V-2152-3', playbook_id: 'pb_nda', paper_origin: 'counterparty_paper',
    ball_in_court: 'cp_legal', red_line_count: 6, created_date: '2026-05-08', executed_date: '2026-05-21' },
]

// ============================================================================
// VERSIONS  (V1 always preserved, immutable lineage)
// ============================================================================
export const versions: Version[] = [
  { id: 'V-2201-1', agreement_id: 'AGR-2201', version_number: 1, label: 'V1', source: 'cp_draft',
    document_ref: 'Vishay_MNDA_v1.docx', created_by: 'ai_engine', created_date: '2026-06-18',
    parent_version_id: null, change_summary: 'Initial draft generated from CP Mutual NDA 2025 template, populated for Vishay Intertechnology.' },
  { id: 'V-2201-2', agreement_id: 'AGR-2201', version_number: 2, label: 'Draft 2', source: 'counterparty_response',
    document_ref: 'Vishay_MNDA_v2_counterparty.docx', created_by: 'ai_engine', created_date: '2026-06-22',
    parent_version_id: 'V-2201-1', change_summary: 'Counterparty redline received: term extended, residuals clause added, injunctive bond, defined-term changes.' },
  { id: 'V-2201-3', agreement_id: 'AGR-2201', version_number: 3, label: 'V3', source: 'cp_redline',
    document_ref: 'Vishay_MNDA_v3_cp_response.docx', created_by: 'ai_engine', created_date: '2026-06-25',
    parent_version_id: 'V-2201-2', change_summary: 'CP response in progress — deviations analyzed against playbook, dispositions pending attorney review.' },

  { id: 'V-2198-1', agreement_id: 'AGR-2198', version_number: 1, label: 'V1', source: 'cp_draft',
    document_ref: 'Airbus_MNDA_v1.docx', created_by: 'ai_engine', created_date: '2026-06-12', parent_version_id: null, change_summary: 'Initial CP draft.' },
  { id: 'V-2198-2', agreement_id: 'AGR-2198', version_number: 2, label: 'Draft 2', source: 'counterparty_response',
    document_ref: 'Airbus_MNDA_v2.docx', created_by: 'ai_engine', created_date: '2026-06-20', parent_version_id: 'V-2198-1', change_summary: 'Counterparty redline: 3yr term, subcontractor asymmetry, ICC arbitration.' },

  { id: 'V-2180-1', agreement_id: 'AGR-2180', version_number: 1, label: 'V1', source: 'cp_draft', document_ref: 'Northwind_MSA_v1.docx', created_by: 'ai_engine', created_date: '2026-06-05', parent_version_id: null, change_summary: 'Initial MSA draft (no playbook — flagged for manual review).' },
  { id: 'V-2181-1', agreement_id: 'AGR-2181', version_number: 1, label: 'V1', source: 'cp_draft', document_ref: 'Northwind_DPA_v1.docx', created_by: 'ai_engine', created_date: '2026-06-05', parent_version_id: null, change_summary: 'Initial DPA draft.' },
  { id: 'V-2182-1', agreement_id: 'AGR-2182', version_number: 1, label: 'V1', source: 'cp_draft', document_ref: 'Northwind_SOW_v1.docx', created_by: 'ai_engine', created_date: '2026-06-06', parent_version_id: null, change_summary: 'Initial SOW draft.' },

  { id: 'V-2150-4', agreement_id: 'AGR-2150', version_number: 4, label: 'V4 (Executed)', source: 'cp_redline', document_ref: 'Mondelez_MNDA_executed.pdf', created_by: 'u_eric', created_date: '2026-05-19', parent_version_id: null, change_summary: 'Executed version.' },
  { id: 'V-2152-3', agreement_id: 'AGR-2152', version_number: 3, label: 'V3 (Executed)', source: 'cp_redline', document_ref: 'CleverDevices_MNDA_executed.pdf', created_by: 'u_eric', created_date: '2026-05-21', parent_version_id: null, change_summary: 'Executed version.' },
]

// ============================================================================
// DEVIATIONS  (Vishay — the live redline, grounded in the demo)
// ============================================================================
export const deviations: Deviation[] = [
  { id: 'D-01', version_id: 'V-2201-2', agreement_id: 'AGR-2201', provision_name: 'Term & Termination', section_reference: '§8',
    risk_category: 'negotiate', direction: 'cp_unfavorable', impact_area: 'operational',
    template_position: 'Term 2 years; CI survival 5 years; trade secrets indefinite.',
    counterparty_position: 'Term extended from 6 months to 3 years; CI survival reduced to 2 years.',
    recommended_response: 'Counter to Fallback 1 (3yr term / 3yr CI survival). Accept 3yr term; push CI survival back to 3 years. Trade-secret protection must remain indefinite — confirm §8 retains that carve-out.',
    disposition_status: 'open' },

  { id: 'D-02', version_id: 'V-2201-2', agreement_id: 'AGR-2201', provision_name: 'Residuals Exclusion', section_reference: '§1(f)',
    risk_category: 'red_line', direction: 'cp_unfavorable', impact_area: 'ip',
    template_position: 'No residuals exclusion. Five standard exclusions only.',
    counterparty_position: 'New §1(f) added: permits use of "residuals" — information retained in unaided memory of personnel.',
    recommended_response: 'RED LINE — reject. Residuals clauses gut trade-secret protection and are an explicit playbook red line. Remove §1(f) in full.',
    disposition_status: 'open' },

  { id: 'D-03', version_id: 'V-2201-2', agreement_id: 'AGR-2201', provision_name: 'Injunctive Relief', section_reference: '§9',
    risk_category: 'negotiate', direction: 'cp_unfavorable', impact_area: 'regulatory',
    template_position: 'Mutual injunctive relief; no bond required.',
    counterparty_position: 'Bond posting required ("commercially reasonable bond"); relief framed as available to disclosing party.',
    recommended_response: 'Counter to Fallback 1: keep relief mutual, soften bond to "as the court deems appropriate." Do not accept a mandatory bond on ChargePoint.',
    disposition_status: 'open' },

  { id: 'D-04', version_id: 'V-2201-2', agreement_id: 'AGR-2201', provision_name: 'Defined Term — "Proprietary Information"', section_reference: '§2',
    risk_category: 'red_line', direction: 'neutral', impact_area: 'operational',
    template_position: 'Single defined term "Confidential Information" used consistently.',
    counterparty_position: 'Introduces undefined term "Proprietary Information" in §2 and §11 where "Confidential Information" is the defined term.',
    recommended_response: 'QA flag — internal consistency. Replace "Proprietary Information" with the defined "Confidential Information" throughout, or the protections do not attach. Auto-corrected in CP response.',
    disposition_status: 'countered', disposition_by: 'u_kirsten', disposition_date: '2026-06-25' },

  { id: 'D-05', version_id: 'V-2201-2', agreement_id: 'AGR-2201', provision_name: 'Affiliate Liability', section_reference: '§6', risk_category: 'negotiate', direction: 'cp_unfavorable', impact_area: 'financial',
    template_position: 'Each party liable for its own and its representatives\' breaches.',
    counterparty_position: 'Full liability for Affiliate breaches — broader than CP template; uncapped.',
    recommended_response: 'Negotiate: accept responsibility for Affiliates we direct, but qualify to Affiliates that receive Confidential Information under this Agreement. Avoid uncapped exposure.',
    disposition_status: 'open' },

  { id: 'D-06', version_id: 'V-2201-2', agreement_id: 'AGR-2201', provision_name: 'Return / Destruction — Legal Copy', section_reference: '§5', risk_category: 'accept', direction: 'bilateral', impact_area: 'operational',
    template_position: 'Return or destroy; certify within 30 days.',
    counterparty_position: 'Retain one archival copy for legal/compliance, subject to ongoing confidentiality.',
    recommended_response: 'ACCEPT — matches approved Fallback. Retaining one legal-hold copy is standard and reciprocal.',
    disposition_status: 'accepted', disposition_by: 'u_kirsten', disposition_date: '2026-06-25' },

  { id: 'D-07', version_id: 'V-2201-2', agreement_id: 'AGR-2201', provision_name: 'Oral Disclosure Confirmation', section_reference: '§2', risk_category: 'accept', direction: 'neutral', impact_area: 'operational',
    template_position: 'Oral disclosures protected; written confirmation within 30 days.',
    counterparty_position: 'Written confirmation window of 30 days retained (matches CP fallback range).',
    recommended_response: 'ACCEPT — within CP fallback range. No action needed.',
    disposition_status: 'accepted', disposition_by: 'u_kirsten', disposition_date: '2026-06-25' },

  { id: 'D-08', version_id: 'V-2201-2', agreement_id: 'AGR-2201', provision_name: 'Data Privacy — Controller Designation', section_reference: '§3(e)', risk_category: 'enhancement', direction: 'cp_favorable', impact_area: 'data',
    template_position: 'Silent on data-protection roles (NDA, no PII expected).',
    counterparty_position: 'Adds "data controller" designation for both parties.',
    recommended_response: 'Enhancement — flag to Privacy (Daniel Vohrer). The "controller" designation may not be accurate in all scenarios; recommend a no-PII-expected recital instead. Tag for sign-off.',
    disposition_status: 'open' },

  { id: 'D-09', version_id: 'V-2201-2', agreement_id: 'AGR-2201', provision_name: 'Export Compliance', section_reference: '§14', risk_category: 'missing', direction: 'neutral', impact_area: 'regulatory',
    template_position: 'Standard ITAR/EAR export-compliance representation.',
    counterparty_position: 'References "Restricted Information" defined term and a pre-clearance obligation that is never defined.',
    recommended_response: 'MISSING/inconsistent — the term "Restricted Information" is referenced but undefined, and the pre-clearance obligation has no scope. Either define it or strike. Flagged for QA.',
    disposition_status: 'open' },

  // Executed Mondelez deal — deviations with final dispositions (drive the computed deal summary)
  { id: 'DM-01', version_id: 'V-2150-4', agreement_id: 'AGR-2150', provision_name: 'Marking / Identification', section_reference: '§2', risk_category: 'negotiate', direction: 'cp_unfavorable', impact_area: 'operational',
    template_position: 'No marking requirement; reasonable-person standard.', counterparty_position: 'Marking required for written; 30-day window to confirm oral disclosures.',
    recommended_response: 'Accept — matches approved Fallback 1.', disposition_status: 'accepted', disposition_by: 'u_eric', disposition_date: '2026-05-15' },
  { id: 'DM-02', version_id: 'V-2150-4', agreement_id: 'AGR-2150', provision_name: 'Indemnification', section_reference: '§10', risk_category: 'red_line', direction: 'cp_unfavorable', impact_area: 'financial',
    template_position: 'No indemnity in a mutual NDA.', counterparty_position: 'Added a unilateral indemnity running only to Mondelez.',
    recommended_response: 'RED LINE — reject. Indemnity is out of scope for an NDA and one-sided.', disposition_status: 'rejected', disposition_by: 'u_eric', disposition_date: '2026-05-15' },
  { id: 'DM-03', version_id: 'V-2150-4', agreement_id: 'AGR-2150', provision_name: 'Injunctive Relief', section_reference: '§9', risk_category: 'negotiate', direction: 'cp_unfavorable', impact_area: 'regulatory',
    template_position: 'Mutual injunctive relief; no bond.', counterparty_position: 'Relief framed as available to Mondelez only.',
    recommended_response: 'Counter — restore mutuality.', disposition_status: 'countered', disposition_by: 'u_eric', disposition_date: '2026-05-16' },
  { id: 'DM-04', version_id: 'V-2150-4', agreement_id: 'AGR-2150', provision_name: 'Return / Destruction — Legal Copy', section_reference: '§5', risk_category: 'accept', direction: 'bilateral', impact_area: 'operational',
    template_position: 'Return or destroy; certify in 30 days.', counterparty_position: 'Retain one archival copy for compliance.',
    recommended_response: 'Accept — approved fallback, reciprocal.', disposition_status: 'accepted', disposition_by: 'u_eric', disposition_date: '2026-05-16' },
]

// ============================================================================
// COLLABORATION — threads
// ============================================================================
export const messages: Message[] = [
  { id: 'M-01', thread_type: 'deal_level', ticket_id: 'TKT-1042', agreement_id: null, author_id: 'u_marcus',
    body: 'Vishay wants to move quickly — technical eval kicks off next week. Can we turn the redline around by Friday?', tag: 'timeline', created_date: '2026-06-23T09:12:00' },
  { id: 'M-02', thread_type: 'deal_level', ticket_id: 'TKT-1042', agreement_id: null, author_id: 'u_kirsten',
    body: 'Working it now. One red line (residuals) we will not accept; the rest are fallbacks. Should land by Thu EOD.', tag: 'decision', created_date: '2026-06-23T10:02:00' },
  { id: 'M-03', thread_type: 'agreement_level', ticket_id: 'TKT-1042', agreement_id: 'AGR-2201', author_id: 'u_kirsten',
    body: '@Daniel Vohrer the counterparty added a "data controller" designation in §3(e). Can you confirm we are comfortable, or should we swap for a no-PII recital? Need your sign-off before we respond.',
    tag: 'question', provision_reference: '§3(e)', created_date: '2026-06-25T11:40:00', mentions: ['u_daniel'], resolved: false },
  { id: 'M-04', thread_type: 'agreement_level', ticket_id: 'TKT-1042', agreement_id: 'AGR-2201', author_id: 'u_priya',
    body: 'From InfoSec: residuals clause is a hard no for us too — it would let their engineers reuse our battery-eval data from memory. Strongly support the red line.',
    tag: 'decision', provision_reference: '§1(f)', created_date: '2026-06-24T15:20:00' },
  { id: 'M-05', thread_type: 'deal_level', ticket_id: 'TKT-1031', agreement_id: null, author_id: 'u_marcus',
    body: 'Northwind is our biggest CaaS opportunity this year. Pricing in the SOW is still moving — hold the DPA until commercial terms settle.', tag: 'pricing', created_date: '2026-06-20T14:00:00' },
]

// ============================================================================
// AUDIT EVENTS (immutable, hash-chained — simulated)
// ============================================================================
export const auditSeed: Omit<AuditEvent, 'hash'>[] = [
  { id: 'A-001', event_type: 'ticket_created', actor_id: 'u_marcus', ticket_id: 'TKT-1042', summary: 'Ticket TKT-1042 created (Vishay Intertechnology — Mutual NDA).', timestamp: '2026-06-18T08:30:00' },
  { id: 'A-002', event_type: 'ticket_assigned', actor_id: 'ai_engine', ticket_id: 'TKT-1042', summary: 'Routed to Kirsten Sachs (expertise match: NDA/MNDA).', timestamp: '2026-06-18T08:30:05' },
  { id: 'A-003', event_type: 'agreement_added', actor_id: 'ai_engine', ticket_id: 'TKT-1042', agreement_id: 'AGR-2201', summary: 'Agreement AGR-2201 generated from CP Mutual NDA 2025 template.', timestamp: '2026-06-18T08:31:00' },
  { id: 'A-004', event_type: 'version_created', actor_id: 'ai_engine', agreement_id: 'AGR-2201', summary: 'V1 created (cp_draft).', timestamp: '2026-06-18T08:31:02' },
  { id: 'A-005', event_type: 'document_sent', actor_id: 'u_kirsten', agreement_id: 'AGR-2201', summary: 'V1 sent to Vishay Intertechnology.', timestamp: '2026-06-19T16:05:00' },
  { id: 'A-006', event_type: 'version_created', actor_id: 'ai_engine', agreement_id: 'AGR-2201', summary: 'Draft 2 ingested (counterparty_response).', timestamp: '2026-06-22T09:14:00' },
  { id: 'A-007', event_type: 'deviation_identified', actor_id: 'ai_engine', agreement_id: 'AGR-2201', summary: '9 deviations identified vs playbook (2 red line, 4 negotiate, 2 accept, 1 enhancement).', timestamp: '2026-06-22T09:15:30' },
  { id: 'A-008', event_type: 'comment_posted', actor_id: 'u_kirsten', ticket_id: 'TKT-1042', agreement_id: 'AGR-2201', summary: 'Tagged Daniel Vohrer on §3(e) data-controller designation.', timestamp: '2026-06-25T11:40:00' },
  { id: 'A-009', event_type: 'disposition_decided', actor_id: 'u_kirsten', agreement_id: 'AGR-2201', summary: 'D-06 (Return/Destruction legal copy) accepted.', timestamp: '2026-06-25T11:45:00' },
  { id: 'A-011', event_type: 'signature_completed', actor_id: 'u_eric', agreement_id: 'AGR-2150', summary: 'Mondelez NDA executed via DocuSign; archived.', timestamp: '2026-05-19T13:22:00' },
  { id: 'A-012', event_type: 'playbook_updated', actor_id: 'u_eric', summary: 'NDA playbook v3 published (added Return/Destruction legal-copy fallback).', timestamp: '2026-06-22T18:00:00' },
]

// ============================================================================
// NOTIFICATIONS
// ============================================================================
export const notificationSeed: AppNotification[] = [
  { id: 'N-01', event: 'AI analysis complete', body: 'Redline analysis ready for Vishay Intertechnology NDA — 9 deviations, 2 red lines.', channels: ['in_app', 'email'], ticket_id: 'TKT-1042', created_date: '2026-06-22T09:16:00', read: false, severity: 'info' },
  { id: 'N-02', event: 'Contributor tagged', body: 'You were tagged by Kirsten Sachs on §3(e) (data-controller designation) — sign-off requested.', channels: ['in_app', 'teams'], ticket_id: 'TKT-1042', created_date: '2026-06-25T11:40:00', read: false, severity: 'warning' },
  { id: 'N-04', event: 'Redline received', body: 'Counterparty redline received for Vishay Intertechnology NDA (Draft 2).', channels: ['in_app', 'email'], ticket_id: 'TKT-1042', created_date: '2026-06-22T09:14:00', read: true, severity: 'info' },
  { id: 'N-05', event: 'Signature completed', body: 'Mondelez Mutual NDA fully executed via DocuSign.', channels: ['in_app', 'email', 'slack'], ticket_id: 'TKT-1009', created_date: '2026-05-19T13:22:00', read: true, severity: 'info' },
]
