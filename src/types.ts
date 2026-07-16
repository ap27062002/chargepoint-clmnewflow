// ============================================================================
// ChargePoint CLM — domain types. Enums mirror the FORMAL SPEC exactly.
// ============================================================================

export type Role =
  | 'initiator'
  | 'attorney'
  | 'contributor'
  | 'playbook_owner'
  | 'administrator'

export interface User {
  id: string
  name: string
  initials: string
  email: string
  role: Role
  title: string
  expertise?: AgreementType[]
  color: string
  manager_id?: string // Reports & Analytics — lets a manager (e.g. a sales manager) scope to their team
}

// ----- Ticket ---------------------------------------------------------------
export type TicketType = 'inquiry' | 'single_agreement' | 'multi_agreement'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type InquiryStatus = 'Open' | 'In Progress' | 'Resolved'

// Derived contract-ticket status (display labels per spec)
export type ContractStatus =
  | 'Red Line Analysis'
  | 'Internal Review'
  | 'Draft'
  | 'Sent to Counterparty'
  | 'In Negotiation'
  | 'Ready to Sign'
  | 'Executed'

export interface Ticket {
  id: string
  title: string
  type: TicketType
  status: InquiryStatus | ContractStatus
  counterparty_name: string
  assigned_attorney_id: string | null
  additional_attorney_ids?: string[] // co-assigned lawyers, beyond the lead attorney above
  watcher_ids?: string[] // stakeholders with read visibility but no assignment (e.g. sales reps)
  initiator_id: string
  created_date: string
  sla_target_date: string
  priority: Priority
  closed_date?: string | null
  agreement_ids: string[]
  description?: string
}

// ----- Agreement ------------------------------------------------------------
export type AgreementType =
  | 'MNDA'
  | 'NDA'
  | 'MSA'
  | 'DPA'
  | 'SOW'
  | 'Reseller'
  | 'Roaming'
  | 'Other' // untyped uploads — displayed with a generic "Document" tag

export type AgreementStatus =
  | 'draft'
  | 'internal_review'
  | 'sent_to_counterparty'
  | 'redline_received'
  | 'negotiation'
  | 'pending_execution'
  | 'executed'

export type PaperOrigin = 'cp_paper' | 'counterparty_paper'
export type BallInCourt = 'cp_legal' | 'counterparty'

export interface Agreement {
  id: string
  ticket_id: string
  title: string
  agreement_type: AgreementType
  status: AgreementStatus
  current_version_id: string
  playbook_id: string | null
  paper_origin: PaperOrigin
  ball_in_court: BallInCourt
  red_line_count: number
  created_date: string
  executed_date?: string | null
  // Leadership-dashboard / contracts-list additive fields (all optional).
  contract_value?: number       // USD TCV; 0/undefined for NDAs → renders "—"
  last_activity_date?: string   // ISO; anchor for ball-in-court "days waiting"
  turn_count?: number           // # of ball-in-court handoffs (Ironclad "No. turns")
  // Drafting stage (Start Drafting form) — filled in once, then reflected into the doc body.
  drafting_purpose?: string
  drafting_term?: string
  drafting_jurisdiction?: string
  // Reports & Analytics — step-level SLA: when each lifecycle stage was entered, in order.
  // Optional/sparse for older seed data; every real stage transition appends to it going forward.
  stage_history?: AgreementStageEntry[]
}
export interface AgreementStageEntry {
  status: AgreementStatus
  entered_date: string
}

// ----- Version --------------------------------------------------------------
export type VersionSource =
  | 'cp_draft'
  | 'counterparty_draft'
  | 'cp_redline'
  | 'counterparty_response'

export interface Version {
  id: string
  agreement_id: string
  version_number: number
  label: string // e.g. "V1", "Draft 2", "V3"
  source: VersionSource
  document_ref: string
  created_by: string
  created_date: string
  parent_version_id: string | null
  change_summary: string
}

// ----- Deviation ------------------------------------------------------------
export type RiskCategory =
  | 'accept'
  | 'negotiate'
  | 'red_line'
  | 'enhancement'
  | 'new'
  | 'missing'

export type Direction =
  | 'cp_favorable'
  | 'cp_unfavorable'
  | 'neutral'
  | 'bilateral'

export type ImpactArea =
  | 'financial'
  | 'operational'
  | 'ip'
  | 'data'
  | 'regulatory'
  | 'reputational'
  | 'relationship'

export type DispositionStatus = 'open' | 'countered' | 'accepted' | 'rejected'

export interface Deviation {
  id: string
  version_id: string
  agreement_id: string
  provision_name: string
  section_reference: string
  risk_category: RiskCategory
  direction: Direction
  impact_area: ImpactArea
  template_position: string
  counterparty_position: string
  recommended_response: string
  disposition_status: DispositionStatus
  disposition_by?: string | null
  disposition_date?: string | null
  source_clause_id?: string      // R43 — links a computed issue back to the exact clause
  matched_provision_id?: string  // R43 — which playbook provision it was classified against
}

// ----- Document integrity / lock (R18) --------------------------------------
// Two integrity modes Eric described: LIVE (everyone views/comments; each clause edit-locked
// to one editor) or LOCKED (single-writer checkout; everyone else read-only, genuinely locked out).
export interface DocLock {
  agreement_id: string
  mode: 'live' | 'locked'
  locked_by: string | null       // in 'locked' mode, the sole editor; null = available to check out
  locked_at: string | null
  claimed_clauses: Record<string, { user_id: string; at: string }> // 'live' mode: per-clause editor
}

// ----- Collaboration --------------------------------------------------------
export type ThreadType = 'deal_level' | 'agreement_level'
export type MessageTag = 'timeline' | 'pricing' | 'decision' | 'question'

export interface Message {
  id: string
  thread_type: ThreadType
  ticket_id: string
  agreement_id: string | null
  author_id: string
  body: string
  tag?: MessageTag
  provision_reference?: string
  created_date: string
  mentions?: string[] // user ids tagged for sign-off
  resolved?: boolean
  parent_id?: string // set on a reply — the root comment this is threaded under (Google-Docs-style)
}

// ----- Playbook -------------------------------------------------------------
export type CrossCuttingCategory =
  | 'liability'
  | 'indemnification'
  | 'confidentiality'
  | 'ip_ownership'
  | 'data_privacy'
  | 'term_and_termination'

export type ProvisionTier = 'baseline' | 'fallback' | 'red_line' | 'deferred'

export interface Provision {
  id: string
  provision_name: string
  standard_position: string
  fallback_tiers: string[] // ordered: fallback 1, fallback 2, ...
  red_line: string
  rationale: string
  cross_cutting_category?: CrossCuttingCategory
  negotiated_pct?: number // % of deals this was negotiated
  counterparty_introduced?: boolean
  tier?: ProvisionTier // playbook classification used for filtering
  deferred_to?: string // for tier 'deferred' — who the decision is escalated to
  children?: Provision[] // nested sub-provisions (e.g. Indemnification → scope/exclusions/limitations…)
  parent_id?: string
  sourceSection?: string      // R62 — the template section this provision was derived from
  modified_via_chat?: boolean // Playbooks §4 — provision content was edited through the agent
  review_state?: 'accepted' | 'deferred' // Playbooks §2 step-3 per-provision decision
  sourcePrecedents?: string[] // R50 — example agreement ids whose positions drove the tier/fallbacks
}

// ----- Playbook derivation / folder sources (R48/R49/R50/R62) ----------------
export interface FolderAgreement {
  id: string
  name: string
  agreement_type: AgreementType
  folderPath: string
  status: string
  hasBody: boolean // true when the executed clause text is available to derive from
}
export interface SourceFolder { path: string; templateId: string; exampleAgreementIds: string[] }
export type PlaybookSourceDefaults = Partial<Record<AgreementType, SourceFolder>>

// ----- Publish to a team folder / category (R85) ----------------------------
export interface TeamFolder { path: string; category: string; access_roles: Role[] }
export interface PublishedArtifact {
  id: string
  kind: 'playbook' | 'template'
  source_id: string
  name: string
  purpose: string
  folder_path: string
  category: string
  access_roles: Role[]
  published_by: string
  date: string
}

export interface Playbook {
  id: string
  agreement_type: AgreementType
  name: string
  version: number
  edited_date?: string // Playbooks §7 — "v2, edited 4 Jul 2026" note after post-publish edits
  owner_id: string
  generated_from: string
  provisions: Provision[]
  created_date: string
  group_mode?: 'sections' | 'category'          // R60 — persisted render layout (chat-driven restructuring)
  render_purpose?: 'standard' | 'external' | 'training' // R57/R60 — persisted audience rendering
  accent?: string                                // R54 — admin-controlled visual look & feel (accent color)
}

// ----- Audit ----------------------------------------------------------------
export type AuditEventType =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'agreement_added'
  | 'version_created'
  | 'deviation_identified'
  | 'disposition_decided'
  | 'status_changed'
  | 'document_sent'
  | 'signature_requested'
  | 'signature_completed'
  | 'comment_posted'
  | 'playbook_updated'
  | 'approval_granted'
  | 'approval_denied'
  | 'sla_breached'
  | 'playbook_suggested'
  | 'playbook_suggestion_decided'
  | 'document_locked'
  | 'document_released'
  | 'edit_blocked'

export interface AuditEvent {
  id: string
  event_type: AuditEventType
  actor_id: string // user id, or 'ai_engine'
  ticket_id?: string
  agreement_id?: string
  summary: string
  timestamp: string
  hash: string // simulated hash-chain link
}

// ----- Notifications --------------------------------------------------------
export type NotificationChannel = 'in_app' | 'email' | 'teams' | 'slack'

export interface AppNotification {
  id: string
  event: string
  body: string
  channels: NotificationChannel[]
  ticket_id?: string
  created_date: string
  read: boolean
  severity: 'info' | 'warning' | 'critical'
}

// ----- Chat / Agent ---------------------------------------------------------
export type ChatRole = 'user' | 'agent'

export type ArtifactKind =
  | 'dashboard'
  | 'playbook'
  | 'redline_review'
  | 'agreement'
  | 'document'
  | 'ticket'
  | 'ticket_created'
  | 'deal_summary'
  | 'tagged_items'
  | 'intake_form'
  | 'execution'
  | 'admin'
  | 'audit'
  | 'repository'
  | 'contracts'
  | 'redline_doc'
  | 'send_back'
  | 'deal_execution'
  | 'projects'
  | 'template'
  | 'reports'
  | 'playbook_create'
  | 'playbook_suggestions'
  | 'none'

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  ts: string
  pending?: boolean
  artifact?: { kind: ArtifactKind; refId?: string; title?: string }
  actions?: ChatAction[]
  aiGenerated?: boolean
  widget?: { kind: 'ticket_source' } // chat-embedded interactive step (template multi-select / upload)
}

export interface ChatAction {
  label: string
  prompt: string
  variant?: 'primary' | 'ghost'
}

// ----- Approvals ------------------------------------------------------------
export type ApprovalType = 'external_delivery' | 'red_line' | 'deal_value'
export type ApprovalMode = 'sequential' | 'parallel'
export type ApprovalState = 'pending' | 'granted' | 'denied'

export interface ApprovalStep {
  approver_id: string
  state: ApprovalState
}
export interface ApprovalRequest {
  id: string
  agreement_id: string
  ticket_id: string
  type: ApprovalType
  mode: ApprovalMode
  reason: string
  steps: ApprovalStep[]
  state: ApprovalState
  created_date: string
}

// ----- E-signature ----------------------------------------------------------
export type SignerRole = 'cp_signer' | 'counterparty_signer'
export type SignerState = 'waiting' | 'sent' | 'signed'
export type EnvelopeState = 'draft' | 'pending_cp' | 'pending_counterparty' | 'completed'

export interface Signer {
  role: SignerRole
  name: string
  email: string
  state: SignerState
  signed_date?: string
}
export type EnvelopeMode = 'combined' | 'individual'
export interface Envelope {
  id: string // DocuSign-style envelope id
  agreement_id: string
  ticket_id: string
  state: EnvelopeState
  signers: Signer[]
  created_date: string
  completed_date?: string
  envelope_group_id?: string // groups envelopes sent together for one ticket/deal
  mode?: EnvelopeMode
}

// ----- View routing ---------------------------------------------------------
export type ViewKey =
  | 'dashboard'
  | 'ticket'
  | 'agreement'
  | 'playbook'
  | 'admin'
  | 'audit'
  | 'notifications'
  | 'queue'
  | 'deal_summary'
  | 'intake'
  | 'execution'
  | 'repository'
  | 'contracts'
  | 'projects'
  | 'reports'

export interface CanvasState {
  view: ViewKey
  open?: boolean // whenever a view is open the agent collapses to full-page — see App.tsx
  ticketId?: string
  agreementId?: string
  agreementTab?: 'overview' | 'deal' | 'review'
  reviewMode?: 'issues' | 'document' | 'compare' | 'directive' | 'sendback' | 'redline'
  reviewFocusDeviationId?: string        // directive cursor — which issue the walkthrough is on
  reviewFocusRef?: string                // jump-to-comment: provision_reference to flash in the document
  dealSummaryId?: string
  intakeCp?: string
  executionAgreementId?: string
  executionTicketId?: string             // deal-level (many-to-one) execution
  executionSelection?: string[]          // which agreements are selected for signing
  intakePayload?: IntakePayload          // Change 1 — agentic NDA intake
  contractsFilter?: ContractsFilterPreset // Change 3 — contracts list preset
  sendBack?: SendBackState               // versioning — clean copy + redline send-back
  playbookId?: string                    // active playbook (multi-playbook)
  playbookMode?: 'library' | 'audit' | 'inventory' | 'create' | 'suggestions' // 'library' = the all-playbooks landing
  playbookDraftId?: string
  projectId?: string                     // templates / projects
  templateId?: string
  startDraftingAgreementId?: string       // opens the Start Drafting form for this agreement
  simpleSendAgreementId?: string          // opens the simplified (no-cleaning) send-to-counterparty screen
  wordOpenFor?: string                    // agreementId the user has clicked "Open in Word" for — gates the preview screen
}

// ----- Ticketing §New — sequential chat wizard for creating a negotiation ticket ------------
export type WizardStep = 'scope' | 'source' | 'counterparty' | 'confirm'
export interface NegotiationWizardState {
  step: WizardStep
  scope?: 'single' | 'multiple'
  sourceMode?: 'template' | 'upload'
  templateIds?: string[]
  uploadedFiles?: string[]
  counterparty?: string
}

// ----- Intake (agentic NDA drafting, Change 1) ------------------------------
export type InferredSource = 'logged_in' | 'crm' | 'web' | 'playbook' | 'inference' | 'manual'
export interface InferredField {
  value: string
  source: InferredSource
  confidence: 'high' | 'medium' | 'low'
  note?: string
  edited?: boolean
}
export interface CounterpartyProfile {
  legal_name: string
  website: string
  hq_city: string
  hq_country: string
  address: string
  industry: string
  region: 'North America' | 'EMEA' | 'APAC' | 'India'
  crm_account?: string
  sf_opportunity?: string
  logoSeed: string
}
export interface IntakePayload {
  rawPrompt: string
  counterpartyQuery: string
  profile: CounterpartyProfile | null
  candidates?: CounterpartyProfile[]
  confirmed: boolean
  requestorId: string
  onBehalfOf?: string
  template: InferredField
  jurisdiction: InferredField
  governingLaw: InferredField
  clausePosture: InferredField
  purpose: InferredField
  sfOpportunity: InferredField
  attorneyId: string
  signerName: string
  signerEmail: string
}

// ----- Contracts list (Change 3) -------------------------------------------
export type ContractsFilterPreset =
  | 'all' | 'active' | 'cp_turn' | 'counterparty_turn' | 'sla_risk' | 'executed'

// ----- Send-back: clean copy + redline (build-12, Eric §3) ------------------
export type RedlineRunKind = 'normal' | 'ins' | 'del'
export interface RedlineRun { text: string; kind: RedlineRunKind }
export interface RedlineClause {
  ref: string
  heading: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  runs: RedlineRun[]
}
export interface RedlineDoc {
  baseVersionId: string
  workingVersionId: string
  title: string
  subtitle: string
  clauses: RedlineClause[]
  cumulative: boolean
  changeCount: number
}
export type SummaryAudience = 'internal' | 'external'
export interface ChangeSummary {
  audience: SummaryAudience
  headline: string
  bullets: string[]
  generatedAt: string
}
export interface SendBackState {
  agreementId: string
  baseVersionId: string
  cumulative: boolean
  redline?: RedlineDoc
  summary?: ChangeSummary
  staged: boolean
}

// ----- Playbook suggestions + NL creation (build-12, Eric §7,§8) ------------
export type SuggestionKind = 'default' | 'fallback' | 'red_line'
export type SuggestionState = 'pending' | 'approved' | 'rejected' | 'deferred'
export interface PlaybookSuggestion {
  id: string
  playbook_id: string
  provision_name: string
  target_provision_id?: string
  kind: SuggestionKind
  proposed_text: string
  rationale: string
  source_agreement_id?: string
  source_section?: string
  suggested_by: string
  created_date: string
  state: SuggestionState
  decided_by?: string
  decided_date?: string
}
export type PlaybookDraftStage = 'collecting' | 'analyzing' | 'generated'
export interface PlaybookDraft {
  id: string
  name: string
  agreement_type: AgreementType
  templateRef: string
  sourceTemplateId?: string // when built from a saved template — link back on publish
  sourcePath?: string       // R48/R49 — the source folder path the examples came from
  exampleRefs: string[]     // R48 — the real example agreement ids the derivation reads
  stage: PlaybookDraftStage
  provisions: Provision[]
  rawPrompt: string
  created_date: string
}

// ----- Templates / Projects (build-12, Eric §9) -----------------------------
export type TemplateOrigin = 'generated' | 'uploaded' | 'precedent'
export type TemplateStatus = 'draft' | 'in_review' | 'published'
export type ProjectSourceKind = 'precedent' | 'third_party_standard' | 'concept_note'
export interface ProjectSource { id: string; kind: ProjectSourceKind; name: string; detail: string; selected: boolean; agreementIds?: string[] }
export interface TemplateIteration { id: string; role: 'user' | 'agent'; text: string; ts: string; changeNote?: string }
export interface TemplateSection { id: string; heading: string; summary: string; parentId?: string; cpConcept?: boolean; body?: string }
export interface TemplateVersionEntry {
  version: number
  fileName: string
  note: string          // what changed, entered by the uploader
  uploaded_by: string
  uploaded_date: string
}
export interface AgreementTemplate {
  id: string
  name: string
  agreement_type: AgreementType
  origin: TemplateOrigin
  status: TemplateStatus
  project_id: string | null
  version: number
  owner_id: string
  created_date: string
  sections: TemplateSection[]
  source_summary: string
  playbook_id?: string | null
  versionHistory?: TemplateVersionEntry[]   // populated once a new version is uploaded
}
export type ProjectStatus = 'building' | 'iterating' | 'template_ready' | 'archived'
export interface TemplateProject {
  id: string
  name: string
  goal: string
  agreement_type: AgreementType
  status: ProjectStatus
  owner_id: string
  created_date: string
  sources: ProjectSource[]
  iterations: TemplateIteration[]
  draftTemplateId: string | null
}
