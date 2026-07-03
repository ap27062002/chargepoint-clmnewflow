import type {
  User, Ticket, Agreement, Version, Deviation, Message, Playbook,
  AuditEvent, AppNotification,
  PlaybookSuggestion, TemplateProject, AgreementTemplate, ProjectSource, TemplateSection, AgreementType, PlaybookSourceDefaults,
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
    { id: 'pv1', provision_name: 'Definition of Confidential Information', cross_cutting_category: 'confidentiality', tier: 'baseline',
      standard_position: 'Broad definition covering all non-public business, technical, and financial information disclosed in any form.',
      fallback_tiers: [], red_line: 'Narrowing to "marked confidential only" with no catch-all for obviously confidential information.',
      rationale: 'Baseline — universally accepted across the sample set; no fallbacks needed.', negotiated_pct: 0 },
    { id: 'pv2', provision_name: 'Marking / Identification', cross_cutting_category: 'confidentiality', tier: 'fallback',
      standard_position: 'No marking requirement; information is protected if a reasonable person would understand it to be confidential.',
      fallback_tiers: ['Marking required for written; oral confirmed confidential if summarized in writing within 30 days.', 'Marking required for all disclosures, written and oral.'],
      red_line: 'Protection contingent on marking with no grace period for oral disclosures.',
      rationale: 'Two fallback tiers approved. Negotiated in 27% of deals.', negotiated_pct: 27 },
    { id: 'pv3', provision_name: 'Protection Obligations / Standard of Care', cross_cutting_category: 'confidentiality', tier: 'fallback',
      standard_position: 'Same degree of care as own confidential information, but no less than a reasonable standard of care.',
      fallback_tiers: ['Reasonable standard of care only (drop "same degree as own").'],
      red_line: 'Best-efforts / strict-liability standard of care.',
      rationale: 'Baseline with accept range (§3.a–3.d).', negotiated_pct: 12 },
    { id: 'pv4', provision_name: 'Exclusions from Confidential Information', cross_cutting_category: 'confidentiality', tier: 'baseline',
      standard_position: 'Standard five exclusions: public domain, prior possession, independently developed, rightfully received, required by law.',
      fallback_tiers: [], red_line: 'Adding "residuals" exclusion permitting use of retained mental impressions.',
      rationale: 'Baseline — universally accepted (§1 exclusions).', negotiated_pct: 4 },
    { id: 'pv5', provision_name: 'Term & Termination', cross_cutting_category: 'term_and_termination', tier: 'fallback',
      standard_position: 'Agreement term 2 years; confidentiality obligations survive 5 years from disclosure; trade secrets protected indefinitely.',
      fallback_tiers: ['Term 3 years; CI survival 3 years.', 'Term 3 years; CI survival 2 years (trade secrets still indefinite).'],
      red_line: 'CI survival under 2 years, or termination of trade-secret protection on expiry.',
      rationale: 'Two fallback tiers approved. Negotiated in 41% of deals.', negotiated_pct: 41 },
    { id: 'pv6', provision_name: 'Injunctive Relief', cross_cutting_category: 'liability', tier: 'fallback',
      standard_position: 'Both parties acknowledge breach causes irreparable harm; injunctive relief available without posting bond.',
      fallback_tiers: ['Injunctive relief mutual; bond requirement left to the court ("as the court deems appropriate").'],
      red_line: 'Injunctive relief available to counterparty only, or mandatory bond posting by ChargePoint.',
      rationale: 'Baseline; one fallback for bond. Negotiated in 18% of deals.', negotiated_pct: 18 },
    { id: 'pv7', provision_name: 'Return / Destruction of Materials', cross_cutting_category: 'confidentiality', tier: 'fallback',
      standard_position: 'Return or destroy on request; certify destruction within 30 days.',
      fallback_tiers: ['Retain one archival copy for legal/compliance and bona fide backup copies subject to ongoing confidentiality.'],
      red_line: 'No destruction certification, or unrestricted retention rights.',
      rationale: 'Baseline with one approved fallback for legal-hold copies.', negotiated_pct: 22 },
    { id: 'pv8', provision_name: 'Governing Law & Venue', cross_cutting_category: 'term_and_termination', tier: 'fallback',
      standard_position: 'Delaware law; exclusive jurisdiction in the state and federal courts of Delaware.',
      fallback_tiers: ['Counterparty home-state law with venue in Delaware.', 'Neutral law (New York) with venue in New York.'],
      red_line: 'Foreign governing law or mandatory ICC arbitration seated outside the U.S.',
      rationale: 'Two fallback tiers. Negotiated in 33% of deals.', negotiated_pct: 33 },
    { id: 'pv9', provision_name: 'Residuals', cross_cutting_category: 'confidentiality', tier: 'deferred', deferred_to: 'Requesting business owner (InfoSec consulted)', counterparty_introduced: true,
      standard_position: 'No residuals clause. ChargePoint does not grant any right to use information "retained in unaided memory."',
      fallback_tiers: [], red_line: 'Any clause permitting use of residuals / information retained in the unaided memory of the recipient\'s personnel.',
      rationale: 'Strict red line — guts trade-secret protection. Introduced on the live Vishay deal (§1(f)); no executed ChargePoint agreement in the corpus contains it, so it has no accepted precedent. Promoted to a named red-line provision per the refinement loop. InfoSec concurrence required to ever vary.', negotiated_pct: 6 },
    { id: 'pv10', provision_name: 'Permitted Purpose & Scope of Use', cross_cutting_category: 'confidentiality', tier: 'deferred', deferred_to: 'Requesting business owner',
      standard_position: 'Scope the permitted purpose narrowly to the specific evaluation/transaction named by the deal team.',
      fallback_tiers: [], red_line: 'Open-ended "any business purpose" use, or purpose broad enough to cover competing products.',
      rationale: 'Deal-specific — there is no single baseline. The agent defers this clause to the requesting business owner for a written purpose statement rather than auto-proposing language, then validates it against the red line.', negotiated_pct: 0 },
  ],
}
// ============================================================================
// PLAYBOOK — ChargePoint MSA 2025 (complex contract — demonstrates NESTING)
// Eric §8: a parent concept (Indemnification) with many child sub-provisions.
// ============================================================================
export const msaPlaybook: Playbook = {
  id: 'pb_msa',
  agreement_type: 'MSA',
  name: 'ChargePoint Master Services Agreement 2025',
  version: 1,
  owner_id: 'u_eric',
  generated_from: 'CP MSA template + 8 negotiated MSAs (2024–2026)',
  created_date: '2026-06-20',
  provisions: [
    { id: 'pv_indem', provision_name: 'Indemnification', cross_cutting_category: 'indemnification', tier: 'red_line',
      standard_position: 'Mutual third-party IP-infringement indemnity, with defined exclusions, a notification procedure, and the indemnifying party controlling the defense.',
      fallback_tiers: [], red_line: 'All-claims indemnity, removal of exclusions, or stripping the indemnitee\'s right to participate in the defense.',
      rationale: 'A parent concept with many sub-provisions — nest the children so the playbook stays usable.', negotiated_pct: 64,
      children: [
        { id: 'pv_indem_scope', parent_id: 'pv_indem', provision_name: 'Scope of Indemnity', cross_cutting_category: 'indemnification', tier: 'baseline',
          standard_position: 'Third-party claims that the deliverables infringe IP; bodily injury / property damage from negligence.',
          fallback_tiers: ['Add third-party data-breach claims arising from the indemnitor\'s negligence.'],
          red_line: 'Indemnity for all claims including the counterparty\'s own breach of contract.', rationale: 'Negotiated in 58% of deals.', negotiated_pct: 58 },
        { id: 'pv_indem_excl', parent_id: 'pv_indem', provision_name: 'Exclusions', cross_cutting_category: 'indemnification', tier: 'baseline',
          standard_position: 'No indemnity for combinations not supplied by us, modifications by the customer, or use outside the docs.',
          fallback_tiers: [], red_line: 'Deletion of the standard exclusions.', rationale: 'Standard carve-outs; rarely negotiated.', negotiated_pct: 12 },
        { id: 'pv_indem_limit', parent_id: 'pv_indem', provision_name: 'Limitations on Indemnity', cross_cutting_category: 'indemnification', tier: 'fallback',
          standard_position: 'Indemnity subject to the agreement\'s overall liability cap.',
          fallback_tiers: ['Super-cap of 2× fees for IP indemnity only.'], red_line: 'Uncapped indemnity.', rationale: 'Negotiated in 47% of deals.', negotiated_pct: 47 },
        { id: 'pv_indem_notice', parent_id: 'pv_indem', provision_name: 'Notification Procedure', cross_cutting_category: 'indemnification', tier: 'baseline',
          standard_position: 'Prompt written notice of a claim; failure to notify excuses the indemnitor only to the extent prejudiced.',
          fallback_tiers: [], red_line: 'Notice as a strict condition precedent regardless of prejudice.', rationale: 'Market standard.', negotiated_pct: 8 },
        { id: 'pv_indem_defense', parent_id: 'pv_indem', provision_name: 'Control of Defense', cross_cutting_category: 'indemnification', tier: 'fallback',
          standard_position: 'Indemnitor controls the defense; no settlement admitting fault without consent; indemnitee may participate with its own counsel.',
          fallback_tiers: ['Joint control for claims seeking injunctive relief.'], red_line: 'Indemnitee loses the right to participate in its own defense.', rationale: 'Negotiated in 31% of deals.', negotiated_pct: 31 },
      ] },
    { id: 'pv_liab', provision_name: 'Limitation of Liability', cross_cutting_category: 'liability', tier: 'red_line',
      standard_position: 'Mutual cap at 12 months of fees; consequential/indirect damages waived; standard carve-outs (confidentiality, indemnity, IP).',
      fallback_tiers: ['Cap at the greater of 12 months\' fees or $1M.'], red_line: 'Asymmetric cap (counterparty uncapped, ChargePoint capped), or waiver of the consequential-damages exclusion.',
      rationale: 'Caps must be mutual. Negotiated in 71% of deals.', negotiated_pct: 71 },
    { id: 'pv_ip', provision_name: 'IP Ownership & License', cross_cutting_category: 'ip_ownership', tier: 'baseline',
      standard_position: 'Each party retains its background IP; ChargePoint grants a limited license to use deliverables for the stated purpose.',
      fallback_tiers: [], red_line: 'Assignment of ChargePoint background IP or a perpetual unrestricted license.',
      rationale: 'Baseline; rarely moved.', negotiated_pct: 9 },
    { id: 'pv_term_msa', provision_name: 'Term & Termination', cross_cutting_category: 'term_and_termination', tier: 'fallback',
      standard_position: 'Initial 2-year term, auto-renewing 1-year; termination for cause with 30-day cure; termination for convenience with 90 days\' notice.',
      fallback_tiers: ['Termination for convenience after the initial term only.'], red_line: 'Counterparty unilateral termination for convenience with no notice.',
      rationale: 'Negotiated in 38% of deals.', negotiated_pct: 38 },
  ],
}

export const playbooks = [ndaPlaybook, msaPlaybook]
// Reused by the "create playbook" generation mock (Eric §8 — generate a playbook from a template).
export const GENERATED_MSA_PROVISIONS = msaPlaybook.provisions
export const GENERATED_NDA_PROVISIONS = ndaPlaybook.provisions

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

  { id: 'TKT-1031', title: 'Northwind Energy — Charging-as-a-Service Partnership', type: 'multi_agreement', status: 'Red Line Analysis',
    counterparty_name: 'Northwind Energy', assigned_attorney_id: 'u_kirsten', initiator_id: 'u_marcus',
    created_date: '2026-06-05', sla_target_date: '2026-07-10', priority: 'high', agreement_ids: ['AGR-2180', 'AGR-2181', 'AGR-2182', 'AGR-2183'],
    description: 'Strategic CaaS deal: master services agreement + data processing addendum + initial SOW.' },

  { id: 'TKT-1048', title: 'Question — residual clause exposure in evaluation NDAs', type: 'inquiry', status: 'In Progress',
    counterparty_name: '—', assigned_attorney_id: 'u_kirsten', initiator_id: 'u_tomas',
    created_date: '2026-06-24', sla_target_date: '2026-06-28', priority: 'normal', agreement_ids: [],
    description: 'Finance asks whether we have standard guidance on "residuals" language counterparties keep introducing.' },

  { id: 'TKT-1049', title: 'RFP review — Metro Transit Authority charging RFP terms', type: 'inquiry', status: 'Open',
    counterparty_name: 'Metro Transit Authority', assigned_attorney_id: 'u_kirsten', initiator_id: 'u_marcus',
    created_date: '2026-06-23', sla_target_date: '2026-07-03', priority: 'normal', agreement_ids: [],
    description: 'Business team needs legal review of the liability and insurance sections of the Metro Transit RFP before we respond. No agreement yet — general legal support.' },
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
    ball_in_court: 'cp_legal', red_line_count: 4, created_date: '2026-06-18', last_activity_date: '2026-06-25', turn_count: 3, contract_value: 0 },

  { id: 'AGR-2198', ticket_id: 'TKT-1039', title: 'Airbus Mutual NDA', agreement_type: 'MNDA',
    status: 'redline_received', current_version_id: 'V-2198-2', playbook_id: 'pb_nda', paper_origin: 'cp_paper',
    ball_in_court: 'counterparty', red_line_count: 3, created_date: '2026-06-12', last_activity_date: '2026-06-20', turn_count: 4, contract_value: 0 },

  { id: 'AGR-2180', ticket_id: 'TKT-1031', title: 'Northwind Master Services Agreement', agreement_type: 'MSA',
    status: 'redline_received', current_version_id: 'V-2180-3', playbook_id: 'pb_msa', paper_origin: 'cp_paper',
    ball_in_court: 'cp_legal', red_line_count: 2, created_date: '2026-06-05', last_activity_date: '2026-06-24', turn_count: 2, contract_value: 2400000 },
  { id: 'AGR-2181', ticket_id: 'TKT-1031', title: 'Northwind Data Processing Addendum', agreement_type: 'DPA',
    status: 'sent_to_counterparty', current_version_id: 'V-2181-2', playbook_id: null, paper_origin: 'cp_paper',
    ball_in_court: 'counterparty', red_line_count: 0, created_date: '2026-06-05', last_activity_date: '2026-06-21', turn_count: 2, contract_value: 0 },
  { id: 'AGR-2182', ticket_id: 'TKT-1031', title: 'Northwind Initial SOW', agreement_type: 'SOW',
    status: 'pending_execution', current_version_id: 'V-2182-2', playbook_id: null, paper_origin: 'cp_paper',
    ball_in_court: 'cp_legal', red_line_count: 0, created_date: '2026-06-06', last_activity_date: '2026-06-23', turn_count: 1, contract_value: 850000 },

  { id: 'AGR-2183', ticket_id: 'TKT-1031', title: 'Northwind Site Assessment Letter', agreement_type: 'Other',
    status: 'draft', current_version_id: 'V-2183-1', playbook_id: null, paper_origin: 'cp_paper',
    ball_in_court: 'cp_legal', red_line_count: 0, created_date: '2026-06-20', last_activity_date: '2026-06-20', turn_count: 0 },
  { id: 'AGR-2150', ticket_id: 'TKT-1009', title: 'Mondelez Mutual NDA', agreement_type: 'MNDA',
    status: 'executed', current_version_id: 'V-2150-4', playbook_id: 'pb_nda', paper_origin: 'cp_paper',
    ball_in_court: 'cp_legal', red_line_count: 5, created_date: '2026-05-02', executed_date: '2026-05-19', last_activity_date: '2026-05-19', turn_count: 3, contract_value: 0 },
  { id: 'AGR-2152', ticket_id: 'TKT-1012', title: 'Clever Devices Mutual NDA', agreement_type: 'MNDA',
    status: 'executed', current_version_id: 'V-2152-3', playbook_id: 'pb_nda', paper_origin: 'counterparty_paper',
    ball_in_court: 'cp_legal', red_line_count: 6, created_date: '2026-05-08', executed_date: '2026-05-21', last_activity_date: '2026-05-21', turn_count: 4, contract_value: 0 },
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
    parent_version_id: 'V-2201-2', change_summary: 'ChargePoint working copy — auto-created on Draft 2 intake; dispositions applied, ready to assemble the clean copy + redline to send back.' },

  { id: 'V-2198-1', agreement_id: 'AGR-2198', version_number: 1, label: 'V1', source: 'cp_draft',
    document_ref: 'Airbus_MNDA_v1.docx', created_by: 'ai_engine', created_date: '2026-06-12', parent_version_id: null, change_summary: 'Initial CP draft.' },
  { id: 'V-2198-2', agreement_id: 'AGR-2198', version_number: 2, label: 'Draft 2', source: 'counterparty_response',
    document_ref: 'Airbus_MNDA_v2.docx', created_by: 'ai_engine', created_date: '2026-06-20', parent_version_id: 'V-2198-1', change_summary: 'Counterparty redline: 3yr term, subcontractor asymmetry, ICC arbitration.' },

  { id: 'V-2180-1', agreement_id: 'AGR-2180', version_number: 1, label: 'v1', source: 'cp_draft', document_ref: 'Northwind_MSA_v1.docx', created_by: 'ai_engine', created_date: '2026-06-12', parent_version_id: null, change_summary: 'Initial MSA draft from CP MSA template.' },
  { id: 'V-2180-2', agreement_id: 'AGR-2180', version_number: 2, label: 'v2', source: 'counterparty_response', document_ref: 'Northwind_MSA_v2.docx', created_by: 'ai_engine', created_date: '2026-06-19', parent_version_id: 'V-2180-1', change_summary: 'Counterparty redline: uncapped indemnity, expanded IP license. 2 red lines flagged vs MSA playbook.' },
  { id: 'V-2183-1', agreement_id: 'AGR-2183', version_number: 1, label: 'v1', source: 'cp_draft', document_ref: 'NWE_Site_Assessment_Letter.pdf', created_by: 'u_kirsten', created_date: '2026-06-20', parent_version_id: null, change_summary: 'Uploaded — no recognized agreement type; tagged generically as Document.' },
  { id: 'V-2180-3', agreement_id: 'AGR-2180', version_number: 3, label: 'v3', source: 'cp_redline', document_ref: 'Northwind_MSA_v3.docx', created_by: 'ai_engine', created_date: '2026-06-26', parent_version_id: 'V-2180-2', change_summary: 'CP working copy — dispositions pending attorney review.' },
  { id: 'V-2181-1', agreement_id: 'AGR-2181', version_number: 1, label: 'V1', source: 'cp_draft', document_ref: 'Northwind_DPA_v1.docx', created_by: 'ai_engine', created_date: '2026-06-05', parent_version_id: null, change_summary: 'Initial DPA draft.' },
  { id: 'V-2181-2', agreement_id: 'AGR-2181', version_number: 2, label: 'V2', source: 'cp_redline', document_ref: 'Northwind_DPA_v2.docx', created_by: 'u_daniel', created_date: '2026-06-21', parent_version_id: 'V-2181-1', change_summary: 'CP revisions sent to Northwind — awaiting their response.' },
  { id: 'V-2182-1', agreement_id: 'AGR-2182', version_number: 1, label: 'V1', source: 'cp_draft', document_ref: 'Northwind_SOW_v1.docx', created_by: 'ai_engine', created_date: '2026-06-06', parent_version_id: null, change_summary: 'Initial SOW draft.' },
  { id: 'V-2182-2', agreement_id: 'AGR-2182', version_number: 2, label: 'V2 (final)', source: 'cp_redline', document_ref: 'Northwind_SOW_v2.docx', created_by: 'u_kirsten', created_date: '2026-06-23', parent_version_id: 'V-2182-1', change_summary: 'Terms finalized — ready to sign.' },

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

  // Northwind MSA — live red lines (feed the deal cockpit + leadership dashboard)
  { id: 'DN-01', version_id: 'V-2180-2', agreement_id: 'AGR-2180', provision_name: 'Limitation of Liability', section_reference: '§12', risk_category: 'red_line', direction: 'cp_unfavorable', impact_area: 'financial',
    template_position: 'Mutual liability cap at 12 months of fees; consequential damages waived.',
    counterparty_position: 'Removed the cap entirely for Northwind; ChargePoint remains capped.',
    recommended_response: 'RED LINE — reject the asymmetric cap. Caps must be mutual; restore the 12-month cap on both sides (MSA playbook §12 red line).',
    disposition_status: 'open' },
  { id: 'DN-02', version_id: 'V-2180-2', agreement_id: 'AGR-2180', provision_name: 'Indemnification — Scope', section_reference: '§10', risk_category: 'red_line', direction: 'cp_unfavorable', impact_area: 'financial',
    template_position: 'Third-party IP indemnity only, with standard exclusions and a notification/control procedure.',
    counterparty_position: 'Expanded indemnity to cover all claims including breach of contract; struck the exclusions.',
    recommended_response: 'RED LINE — reject. Scope indemnity to third-party IP infringement; restore exclusions and the defense-control procedure (MSA playbook §10).',
    disposition_status: 'open' },
]

// ============================================================================
// COLLABORATION — threads
// ============================================================================
export const messages: Message[] = [
  // Northwind MSA clause 8 — Daniel tagged 5 days ago, no response (admin tagged-aging demo)
  { id: 'M-08', thread_type: 'agreement_level', ticket_id: 'TKT-1031', agreement_id: 'AGR-2180', author_id: 'u_kirsten',
    body: '@Daniel Vohrer clause 8 term/auto-renewal interacts with the DPA retention schedule — confirm the survival window works for privacy before I counter.', tag: 'question',
    provision_reference: '§8', created_date: '2026-06-22T09:30:00', mentions: ['u_daniel'], resolved: false },
  // RFP support ticket thread (agreement-less legal support)
  { id: 'M-RFP1', thread_type: 'deal_level', ticket_id: 'TKT-1049', agreement_id: null, author_id: 'u_marcus',
    body: 'Metro Transit RFP response is due 10 Jul. Can legal review §4 (liability) and §7 (insurance minimums) of the RFP terms? PDF attached in email.', tag: 'question', created_date: '2026-06-23T10:05:00' },
  { id: 'M-RFP2', thread_type: 'deal_level', ticket_id: 'TKT-1049', agreement_id: null, author_id: 'u_kirsten',
    body: 'On it. First pass: their indemnity ask exceeds our standard cap — I will draft suggested exception language for the response. No agreement needed at this stage; keeping this as a support ticket.', tag: 'decision', created_date: '2026-06-24T14:10:00' },
  // R79 — the seeded inquiry (TKT-1048) opens to a real question→response thread, not an empty view.
  { id: 'M-INQ1', thread_type: 'deal_level', ticket_id: 'TKT-1048', agreement_id: null, author_id: 'u_marcus',
    body: 'Quick question — a counterparty keeps asking for a residuals clause in evaluation NDAs. What\'s our exposure and can we ever accept it?', tag: 'question', created_date: '2026-06-26T14:20:00' },
  { id: 'M-INQ2', thread_type: 'deal_level', ticket_id: 'TKT-1048', agreement_id: null, author_id: 'ai_engine',
    body: 'Residuals is a named playbook **red line** — it lets the other side use anything "retained in unaided memory," which guts trade-secret protection. No executed ChargePoint agreement in the corpus contains a residuals clause, so there is no accepted precedent for it. Recommend declining; InfoSec sign-off would be required to ever vary. This is an inquiry (no agreement attached) — tag an attorney if you want a formal sign-off.', tag: 'decision', created_date: '2026-06-26T14:22:00' },
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
  { id: 'M-06', thread_type: 'deal_level', ticket_id: 'TKT-1031', agreement_id: null, author_id: 'u_kirsten',
    body: 'Status across the deal: SOW is final and ready to sign, DPA is out with Northwind, MSA has two red lines (uncapped liability + over-broad indemnity) I am holding firm on. We can execute the SOW now or wait and sign all three together.', tag: 'decision', created_date: '2026-06-24T16:30:00' },
  { id: 'M-07', thread_type: 'agreement_level', ticket_id: 'TKT-1031', agreement_id: 'AGR-2180', author_id: 'u_kirsten',
    body: '@Priya Anand the MSA §12 cap was struck on their side only — that is a hard red line for us. Flagging the asymmetry before I send our redline back.', tag: 'question', provision_reference: '§12', created_date: '2026-06-24T16:35:00', mentions: ['u_priya'], resolved: false },
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
  { id: 'N-06', event: 'Playbook suggestions', body: '2 clauses suggested for the NDA playbook by attorneys — awaiting your approval.', channels: ['in_app'], ticket_id: 'TKT-1042', created_date: '2026-06-26T09:00:00', read: false, severity: 'info' },
]

// ============================================================================
// PLAYBOOK SUGGESTIONS (Eric §7 — attorneys suggest additions; admin/owner approves)
// ============================================================================
export const playbookSuggestions: PlaybookSuggestion[] = [
  { id: 'PS-01', playbook_id: 'pb_nda', provision_name: 'Residuals', target_provision_id: 'pv9', kind: 'red_line',
    proposed_text: 'No residuals clause permitted in any form, including use of information retained in unaided memory.',
    rationale: 'Counterparties keep reintroducing residuals (Vishay — live). Make the red line explicit so the agent always flags it.',
    source_agreement_id: 'AGR-2201', source_section: '§1(f)', suggested_by: 'u_kirsten', created_date: '2026-06-26T08:40:00', state: 'pending' },
  { id: 'PS-02', playbook_id: 'pb_nda', provision_name: 'Term & Termination', target_provision_id: 'pv5', kind: 'fallback',
    proposed_text: 'Fallback: 3-year term with 3-year confidentiality survival (trade secrets indefinite).',
    rationale: 'We land here in ~40% of deals — promote 3yr/3yr to a named approved fallback so attorneys don\'t have to re-derive it.',
    source_agreement_id: 'AGR-2201', source_section: '§8', suggested_by: 'u_daniel', created_date: '2026-06-26T08:55:00', state: 'pending' },
  { id: 'PS-03', playbook_id: 'pb_msa', provision_name: 'Limitation of Liability', target_provision_id: 'pv_liab', kind: 'fallback',
    proposed_text: 'Fallback: cap at the greater of 12 months\' fees or $1M.',
    rationale: 'Approved on the Mondelez MSA; codifying so it\'s reusable.',
    source_agreement_id: 'AGR-2180', source_section: '§12', suggested_by: 'u_kirsten', created_date: '2026-06-19T10:00:00',
    state: 'approved', decided_by: 'u_eric', decided_date: '2026-06-20T09:00:00' },
]

// ============================================================================
// TEMPLATES & PROJECTS (Eric §9 — Claude-Projects-as-Enterprise)
// ============================================================================
export function defaultProjectSources(): ProjectSource[] {
  // R105 — sources carry real agreementIds into the corpus, so comparative analysis is computed from actual clause text.
  return [
    { id: 'src-1', kind: 'precedent', name: 'ChargePoint executed NDAs (Vishay, Mondelez, Clever)', detail: 'Archived, negotiated CP paper — extract our standard concepts.', selected: true, agreementIds: ['AGR-2201', 'AGR-2150', 'AGR-2152'] },
    { id: 'src-2', kind: 'third_party_standard', name: 'Aptiv & TE Connectivity precedents', detail: 'Third-party reference agreements to model structure & norms.', selected: true, agreementIds: ['AGR-2140', 'AGR-2145'] },
    { id: 'src-3', kind: 'precedent', name: 'Mondelez MSA (negotiated fallbacks)', detail: 'Recently negotiated — capture accepted fallbacks.', selected: false, agreementIds: ['AGR-2150'] },
    { id: 'src-4', kind: 'concept_note', name: 'ChargePoint-specific concepts', detail: 'Charging-network data rights, firmware updates, uptime SLAs.', selected: true },
  ]
}
export function buildSectionsFor(type: AgreementType): TemplateSection[] {
  // NDA sections align with the executed-NDA example corpus so derivation has real signal (R50/R62).
  if (type === 'MNDA' || type === 'NDA') return [
    { id: 'n1', heading: '1. Confidential Information', summary: 'Definition of Confidential Information and the standard five exclusions.', cpConcept: false },
    { id: 'n2', heading: '2. Marking / Identification', summary: 'Whether marking is required; oral-disclosure confirmation window.' },
    { id: 'n3', heading: '3. Protection Obligations', summary: 'Standard of care; use limited to the Purpose.' },
    { id: 'n4', heading: '4. Return / Destruction', summary: 'Return or destroy on request; certify; legal archival copy.' },
    { id: 'n5', heading: '5. Injunctive Relief', summary: 'Equitable relief for breach; bond posture.' },
    { id: 'n6', heading: '6. Term & Termination', summary: 'Term length; confidentiality survival; trade-secret carve-out.' },
    { id: 'n7', heading: '7. Governing Law & Venue', summary: 'Choice of law and exclusive jurisdiction.' },
  ]
  const base: TemplateSection[] = [
    { id: 's1', heading: '1. Definitions', summary: 'Defined terms, incl. ChargePoint-specific (Charging Network, Station Data, Firmware).', cpConcept: true },
    { id: 's2', heading: '2. License Grant', summary: 'Scope, restrictions, reservation of rights.' },
    { id: 's3', heading: '3. Station Data & Telemetry', summary: 'Ownership of charging-network data; permitted analytics use.', cpConcept: true },
    { id: 's4', heading: '4. Firmware & Updates', summary: 'OTA update rights, security patches, deprecation notice.', cpConcept: true },
    { id: 's5', heading: '5. Fees & Payment', summary: 'Subscription fees, true-up, taxes.' },
    { id: 's6', heading: '6. Warranties & Disclaimers', summary: 'Limited warranty; AS-IS disclaimer for beta features.' },
    { id: 's7', heading: '7. Indemnification', summary: 'Third-party IP indemnity (modeled on the MSA playbook).' },
    { id: 's8', heading: '8. Limitation of Liability', summary: 'Mutual cap; consequential damages waiver.' },
    { id: 's9', heading: '9. Term & Termination', summary: 'Initial term, renewal, termination rights.' },
    { id: 's10', heading: '10. Governing Law', summary: 'Delaware; exclusive jurisdiction.' },
  ]
  return base
}
// R49 — default source folder per agreement type ("create the playbook" needs no path argument).
export const DEFAULT_PLAYBOOK_SOURCES: PlaybookSourceDefaults = {
  MNDA: { path: 'Legal › CLM › Templates › NDA', templateId: 'TPL-9001', exampleAgreementIds: ['AGR-2201', 'AGR-2150', 'AGR-2152', 'AGR-2140', 'AGR-2145'] },
  MSA: { path: 'Legal › CLM › Templates › MSA', templateId: 'TPL-9002', exampleAgreementIds: ['AGR-2180', 'AGR-2185'] },
}

export const agreementTemplates: AgreementTemplate[] = [
  { id: 'TPL-9001', name: 'Standard NDA', agreement_type: 'MNDA', origin: 'precedent', status: 'published',
    project_id: null, version: 3, owner_id: 'u_eric', created_date: '2026-05-01', source_summary: 'Standardized from 11 executed NDAs.',
    sections: buildSectionsFor('MNDA'), playbook_id: 'pb_nda' },
  { id: 'TPL-9002', name: 'Standard MSA', agreement_type: 'MSA', origin: 'precedent', status: 'in_review',
    project_id: null, version: 1, owner_id: 'u_eric', created_date: '2026-06-18', source_summary: 'Built from 8 negotiated MSAs.',
    sections: buildSectionsFor('MSA'), playbook_id: 'pb_msa' },
  { id: 'TPL-9003', name: 'DPA Baseline', agreement_type: 'DPA', origin: 'uploaded', status: 'published',
    project_id: null, version: 2, owner_id: 'u_daniel', created_date: '2026-05-20', source_summary: 'Uploaded form DPA, aligned to SCC 2021 + CCPA addendum.',
    sections: buildSectionsFor('DPA'), playbook_id: null },
]
export const templateProjects: TemplateProject[] = [
  { id: 'PRJ-9001', name: 'Technology License Agreement (new form)', goal: 'Build a new CP licensing template modeled on market standards + ChargePoint-specific concepts (network data, firmware, uptime).',
    agreement_type: 'MSA', status: 'iterating', owner_id: 'u_eric', created_date: '2026-06-28',
    sources: defaultProjectSources(),
    iterations: [
      { id: 'it-1', role: 'user', text: 'Build a new license agreement modeled on the market standards, incorporating our charging-network data rights and firmware-update concepts.', ts: '2026-06-28T10:00:00' },
      { id: 'it-2', role: 'agent', text: 'Analyzed 7 CP precedents + 5 market-standard licenses. Generated a 10-section draft template; flagged 3 ChargePoint-specific sections (Station Data, Firmware, Definitions).', ts: '2026-06-28T10:01:00', changeNote: 'Initial generation' },
      { id: 'it-3', role: 'user', text: 'Tighten the Station Data section — we own all telemetry; they get aggregated analytics only.', ts: '2026-06-28T10:06:00' },
      { id: 'it-4', role: 'agent', text: 'Revised §3 Station Data: ChargePoint owns all raw telemetry; customer receives a license to aggregated, de-identified analytics only.', ts: '2026-06-28T10:06:30', changeNote: 'Revised §3 Station Data' },
    ],
    draftTemplateId: null },
]
