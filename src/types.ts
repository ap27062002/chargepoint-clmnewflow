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
  | 'Pending Execution'
  | 'Executed'

export interface Ticket {
  id: string
  title: string
  type: TicketType
  status: InquiryStatus | ContractStatus
  counterparty_name: string
  assigned_attorney_id: string | null
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
}

export interface Playbook {
  id: string
  agreement_type: AgreementType
  name: string
  version: number
  owner_id: string
  generated_from: string
  provisions: Provision[]
  created_date: string
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
export interface Envelope {
  id: string // DocuSign-style envelope id
  agreement_id: string
  ticket_id: string
  state: EnvelopeState
  signers: Signer[]
  created_date: string
  completed_date?: string
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

export interface CanvasState {
  view: ViewKey
  open?: boolean
  ticketId?: string
  agreementId?: string
  agreementTab?: 'deal' | 'review'
  reviewMode?: 'issues' | 'document' | 'compare'
  dealSummaryId?: string
  intakeCp?: string
  executionAgreementId?: string
}
