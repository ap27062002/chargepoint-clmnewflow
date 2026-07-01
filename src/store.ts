import { create } from 'zustand'
import type {
  Ticket, Agreement, Version, Deviation, Message, Playbook,
  AuditEvent, AppNotification, ChatMessage, CanvasState, ViewKey,
  DispositionStatus, MessageTag, ThreadType, AuditEventType,
  ApprovalRequest, ApprovalType, Envelope, EnvelopeMode, AgreementType,
  AgreementStatus, BallInCourt, ContractStatus,
  IntakePayload, InferredField, CounterpartyProfile, ContractsFilterPreset,
  SummaryAudience, PlaybookSuggestion, SuggestionKind, PlaybookDraft, Provision, ProvisionTier,
  TemplateProject, AgreementTemplate, TemplateIteration,
} from '@/types'
import { lookupCounterparty, inferDealContext } from '@/data/counterparties'
import {
  users, tickets as seedTickets, agreements as seedAgreements,
  versions as seedVersions, deviations as seedDeviations, messages as seedMessages,
  playbooks as seedPlaybooks, auditSeed, notificationSeed, CURRENT_USER_ID, ndaPlaybook,
  playbookSuggestions as seedSuggestions, templateProjects as seedProjects,
  agreementTemplates as seedTemplates, defaultProjectSources, buildSectionsFor, DEFAULT_PLAYBOOK_SOURCES,
} from '@/data/seed'
import { GREETING, greetingFor } from '@/agent/greeting'
import { seedDocuments, buildCleanCopy, buildRedlineDoc, summarizeRedline, cleanCopyId, type DocModel, type DocClause } from '@/data/documents'
import { analyzePlaybook } from '@/lib/playbookAnalysis'
import { deriveProvisions, comparativeAnalysis, folderAgreements } from '@/data/playbookDerive'
import { executedCorpus } from '@/data/executed'
import type { PlaybookSourceDefaults, SourceFolder } from '@/types'
import { routeAttorney, type RoutingStrategy } from '@/lib/routing'
import { slaStatus } from '@/lib/labels'

let _id = 1000
const nextId = (p: string) => `${p}-${++_id}`
const now = () => new Date('2026-06-27T10:08:00').toISOString()

// simple deterministic "hash chain" for the audit log
function chainHash(prev: string, payload: string): string {
  let h = 0
  const s = prev + '|' + payload
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(8, '0')
}
function buildAudit(): AuditEvent[] {
  let prev = '00000000'
  return auditSeed.map((e) => {
    const hash = chainHash(prev, e.id + e.event_type + e.summary)
    prev = hash
    return { ...e, hash }
  })
}

// ----- Agreement lifecycle -------------------------------------------------
export const AGREEMENT_LIFECYCLE: AgreementStatus[] = [
  'draft', 'internal_review', 'sent_to_counterparty', 'redline_received', 'negotiation', 'pending_execution', 'executed',
]
const ballForStatus = (s: AgreementStatus): BallInCourt => (s === 'sent_to_counterparty' || s === 'negotiation' ? 'counterparty' : 'cp_legal')
const ticketStatusForStatus = (s: AgreementStatus): ContractStatus => ({
  draft: 'Draft', internal_review: 'Internal Review', sent_to_counterparty: 'Sent to Counterparty',
  redline_received: 'Red Line Analysis', negotiation: 'In Negotiation',
  pending_execution: 'Ready to Sign', executed: 'Executed',
} as Record<AgreementStatus, ContractStatus>)[s]

interface CLMState {
  users: typeof users
  currentUserId: string
  tickets: Ticket[]
  agreements: Agreement[]
  versions: Version[]
  deviations: Deviation[]
  messages: Message[]
  playbooks: Playbook[]
  audit: AuditEvent[]
  notifications: AppNotification[]
  documents: Record<string, DocModel>
  approvals: ApprovalRequest[]
  envelopes: Envelope[]
  playbookSuggestions: PlaybookSuggestion[]
  playbookDrafts: PlaybookDraft[]
  projects: TemplateProject[]
  templates: AgreementTemplate[]
  routingStrategy: RoutingStrategy
  canvas: CanvasState
  chat: ChatMessage[]
  agentThinking: boolean
  toast: string | null
  cmdkOpen: boolean
  slaChecked: boolean
  entered: boolean
  enterApp: () => void
  setCmdkOpen: (v: boolean) => void

  // navigation
  navigate: (c: Partial<CanvasState>) => void
  openCanvas: (c: Partial<CanvasState>) => void
  closeCanvas: () => void
  openTicket: (ticketId: string) => void
  openAgreement: (agreementId: string, tab?: 'deal' | 'review') => void
  setView: (view: ViewKey) => void
  openFull: (view: ViewKey) => void
  openContracts: (preset?: ContractsFilterPreset, solo?: boolean) => void
  openProjects: (projectId?: string, solo?: boolean) => void
  openDealExecution: (ticketId: string, agreementIds?: string[]) => void
  setPersona: (userId: string) => void
  setToast: (t: string | null) => void

  // domain actions
  setDisposition: (deviationId: string, status: DispositionStatus) => void
  applyAllRecommended: (agreementId: string) => void
  postMessage: (m: { thread_type: ThreadType; ticket_id: string; agreement_id: string | null; body: string; tag?: MessageTag; provision_reference?: string; mentions?: string[] }) => void
  resolveMention: (messageId: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  createTicketFromAgent: (t: Partial<Ticket> & { title: string; counterparty_name: string; type: Ticket['type']; agreement_type?: AgreementType }) => Ticket
  audit_push: (e: { event_type: AuditEventType; summary: string; ticket_id?: string; agreement_id?: string; actor_id?: string }) => void

  // agentic NDA intake (Change 1)
  prepareIntake: (parsed: { query: string; rawPrompt: string; onBehalfOf?: string }) => void
  updateIntakeField: (key: keyof IntakePayload, value: IntakePayload[keyof IntakePayload]) => void
  confirmCounterparty: (profile: CounterpartyProfile) => void
  generateNdaFromIntake: () => Ticket | null

  // runtime versioning (G4/G5) + free-text edit (G2)
  receiveCounterpartyRedline: (agreementId: string) => void
  finalizeVersion: (agreementId: string, versionId: string) => void
  editClauseText: (versionId: string, clauseId: string, text: string) => void
  ingestFolderAgreements: (playbookId: string) => void

  // documents (editable, tracked changes)
  acceptChange: (versionId: string, cid: string) => void
  rejectChange: (versionId: string, cid: string) => void
  addTrackedChange: (versionId: string, clauseId: string, text: string, kind: 'ins' | 'del') => void

  // lifecycle / routing / approvals / e-sign
  advanceAgreementStage: (agreementId: string) => void
  setRoutingStrategy: (s: RoutingStrategy) => void
  createApproval: (agreementId: string, type: ApprovalType) => ApprovalRequest | null
  decideApproval: (approvalId: string, approverId: string, grant: boolean) => void
  startEnvelope: (agreementId: string) => Envelope
  advanceEnvelope: (envelopeId: string) => void
  startEnvelopesForTicket: (ticketId: string, agreementIds: string[], mode: EnvelopeMode) => void
  runSlaCheck: () => void

  // versioning — track-changes hygiene + send-back (clean copy + redline)
  acceptAllChanges: (versionId: string) => void
  rejectAllChanges: (versionId: string) => void
  openSendBack: (agreementId: string) => void
  setSendBackBase: (baseVersionId: string) => void
  setSendBackCumulative: (cumulative: boolean) => void
  generateRedline: () => void
  summarizeChanges: (audience: SummaryAudience) => void
  sendRedline: (agreementId: string) => void

  // playbook — suggestions, NL creation, restructure
  setPlaybook: (playbookId: string) => void
  suggestToPlaybook: (s: { playbook_id: string; provision_name: string; kind: SuggestionKind; proposed_text: string; rationale?: string; source_agreement_id?: string; source_section?: string }) => void
  decidePlaybookSuggestion: (id: string, approve: boolean) => void
  startPlaybookDraft: (name: string, agreement_type: AgreementType, rawPrompt: string, opts?: { sourceTemplateId?: string; sourcePath?: string; exampleRefs?: string[] }) => string
  advancePlaybookDraft: (draftId: string) => void
  publishPlaybookDraft: (draftId: string) => void
  refinePlaybookDraft: (draftId: string, instruction: string) => string // returns the agent's confirmation
  setDraftExampleRefs: (draftId: string, exampleRefs: string[]) => void  // R48 — folder picker toggles
  // R49 — default source folders per agreement type (persisted)
  playbookSourceDefaults: PlaybookSourceDefaults
  setPlaybookSourceDefault: (type: AgreementType, folder: SourceFolder) => void

  // templates / projects
  createProject: (name: string, goal: string, agreement_type: AgreementType) => string
  toggleProjectSource: (projectId: string, sourceId: string) => void
  generateTemplateDraft: (projectId: string) => void
  iterateTemplate: (projectId: string, instruction: string) => void
  saveTemplate: (projectId: string) => void
  buildPlaybookFromTemplate: (templateId: string) => void

  // chat
  pushChat: (m: ChatMessage) => void
  setAgentThinking: (v: boolean) => void
}

// R43 — the Vishay issues list is COMPUTED by a real playbook analysis of V1 → V2 (not hand-seeded).
// Every row's counterparty_position is the actual §-clause text; editing a clause changes the issue.
const _initDocs = seedDocuments()
const _computedVishay = analyzePlaybook(_initDocs['V-2201-1'], _initDocs['V-2201-2'], ndaPlaybook, 'AGR-2201', 'V-2201-2')
const initialDeviations: Deviation[] = [
  ..._computedVishay,
  // keep any curated Vishay issue the analyzer didn't reproduce (e.g. the untagged §2 oral-disclosure accept)
  ...seedDeviations.filter((d) => d.agreement_id === 'AGR-2201' && !_computedVishay.some((c) => c.id === d.id)),
  // other agreements (executed Mondelez, live Northwind) keep their curated deviations
  ...seedDeviations.filter((d) => d.agreement_id !== 'AGR-2201'),
]

// R49 — persist the default source folders across reloads (first persisted slice in the app).
const SOURCES_KEY = 'clm.playbookSourceDefaults'
function loadSourceDefaults(): PlaybookSourceDefaults {
  try { const raw = typeof localStorage !== 'undefined' && localStorage.getItem(SOURCES_KEY); if (raw) return { ...DEFAULT_PLAYBOOK_SOURCES, ...JSON.parse(raw) } } catch { /* ignore */ }
  return DEFAULT_PLAYBOOK_SOURCES
}

export const useStore = create<CLMState>((set, get) => ({
  users,
  currentUserId: CURRENT_USER_ID,
  tickets: seedTickets,
  agreements: seedAgreements,
  versions: seedVersions,
  deviations: initialDeviations,
  playbookSourceDefaults: loadSourceDefaults(),
  messages: seedMessages,
  playbooks: seedPlaybooks,
  audit: buildAudit(),
  notifications: notificationSeed,
  documents: seedDocuments(),
  approvals: [],
  envelopes: [],
  playbookSuggestions: seedSuggestions,
  playbookDrafts: [],
  projects: seedProjects,
  templates: seedTemplates,
  routingStrategy: 'hybrid',
  canvas: { view: 'dashboard', open: false },
  chat: [GREETING],
  agentThinking: false,
  toast: null,
  cmdkOpen: false,
  slaChecked: false,
  entered: false,
  enterApp: () => set({ entered: true }),
  setCmdkOpen: (v) => set({ cmdkOpen: v }),

  navigate: (c) => set((s) => ({ canvas: { ...s.canvas, ...c } })),
  // Agent-driven opens dock the agent beside the canvas (solo: false).
  openCanvas: (c) => set((s) => ({ canvas: { ...s.canvas, open: true, solo: false, ...c } })),
  closeCanvas: () => set((s) => ({ canvas: { ...s.canvas, open: false } })),
  openTicket: (ticketId) => {
    const t = get().tickets.find((x) => x.id === ticketId)
    if (!t) return
    if (t.type === 'inquiry' || t.agreement_ids.length === 0) {
      set({ canvas: { view: 'ticket', open: true, solo: false, ticketId, agreementTab: 'deal' } })
    } else if (t.type === 'multi_agreement') {
      // Multi-agreement deals land on the deal overview (all documents visible).
      set({ canvas: { view: 'ticket', open: true, solo: false, ticketId, agreementId: t.agreement_ids[0], agreementTab: 'overview' } })
    } else {
      set({ canvas: { view: 'ticket', open: true, solo: false, ticketId, agreementId: t.agreement_ids[0], agreementTab: 'deal' } })
    }
  },
  // Document review owns the frame (Eric §2): agent collapses (solo), lands on the doc+issues directive split.
  openAgreement: (agreementId, tab = 'review') => {
    const a = get().agreements.find((x) => x.id === agreementId)
    if (!a) return
    set({ canvas: { view: 'ticket', open: true, solo: true, ticketId: a.ticket_id, agreementId, agreementTab: tab, reviewMode: 'directive', reviewFocusDeviationId: undefined } })
  },
  setView: (view) => set((s) => ({ canvas: { ...s.canvas, view, open: true, solo: false } })),
  // Rail-driven full-screen navigation: canvas takes the full width, agent collapses (one click away).
  openFull: (view) => set({ canvas: { view, open: true, solo: true } }),
  // Contracts list — one click from the dashboard (full-width by default; docked when opened from an agent chip).
  openContracts: (preset = 'all', solo = true) =>
    set((s) => ({ canvas: { ...s.canvas, view: 'contracts', open: true, solo, contractsFilter: preset } })),
  openProjects: (projectId, solo = true) =>
    set((s) => ({ canvas: { ...s.canvas, view: 'projects', open: true, solo, projectId, templateId: undefined } })),
  openDealExecution: (ticketId, agreementIds) => {
    const t = get().tickets.find((x) => x.id === ticketId)
    const ids = agreementIds ?? (t ? get().agreements.filter((a) => a.ticket_id === ticketId && a.status !== 'executed').map((a) => a.id) : [])
    set((s) => ({ canvas: { ...s.canvas, view: 'execution', open: true, solo: false, executionTicketId: ticketId, executionSelection: ids } }))
  },
  setPersona: (userId) => {
    const u = get().users.find((x) => x.id === userId)
    set((s) => ({
      currentUserId: userId,
      chat: u ? [greetingFor(u)] : s.chat,
      canvas: { ...s.canvas, open: false },
      agentThinking: false,
    }))
  },
  setToast: (t) => set({ toast: t }),

  setDisposition: (deviationId, status) => {
    const uid = get().currentUserId
    set((s) => ({
      deviations: s.deviations.map((d) =>
        d.id === deviationId ? { ...d, disposition_status: status, disposition_by: uid, disposition_date: now() } : d),
    }))
    const d = get().deviations.find((x) => x.id === deviationId)
    get().audit_push({ event_type: 'disposition_decided', agreement_id: d?.agreement_id, summary: `${d?.provision_name} (${d?.section_reference}) → ${status}.` })
  },

  applyAllRecommended: (agreementId) => {
    const uid = get().currentUserId
    set((s) => ({
      deviations: s.deviations.map((d) => {
        if (d.agreement_id !== agreementId || d.disposition_status !== 'open') return d
        const status: DispositionStatus =
          d.risk_category === 'accept' ? 'accepted'
          : d.risk_category === 'red_line' ? 'rejected'
          : 'countered'
        return { ...d, disposition_status: status, disposition_by: uid, disposition_date: now() }
      }),
    }))
    get().audit_push({ event_type: 'disposition_decided', agreement_id: agreementId, summary: 'Applied all recommended dispositions.' })
  },

  postMessage: (m) => {
    const msg: Message = {
      id: nextId('M'), created_date: now(), author_id: get().currentUserId,
      ...m, resolved: false,
    }
    set((s) => ({ messages: [...s.messages, msg] }))
    get().audit_push({ event_type: 'comment_posted', ticket_id: m.ticket_id, agreement_id: m.agreement_id ?? undefined, summary: m.mentions?.length ? `Comment posted; tagged ${m.mentions.length} contributor(s).` : 'Comment posted.' })
  },

  resolveMention: (messageId) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, resolved: true } : m)) })),

  markNotificationRead: (id) =>
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllNotificationsRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  createTicketFromAgent: (t) => {
    const id = `TKT-${1050 + get().tickets.filter((x) => x.id.startsWith('TKT')).length}`
    // Actually run assignment routing (unless explicitly overridden).
    const routed = routeAttorney(get().routingStrategy, t.agreement_type ?? 'MNDA', get().users, get().tickets)
    const attorneyId = t.assigned_attorney_id ?? routed.attorneyId
    const ticket: Ticket = {
      id, title: t.title, type: t.type, status: t.type === 'inquiry' ? 'Open' : 'Draft',
      counterparty_name: t.counterparty_name, assigned_attorney_id: attorneyId,
      initiator_id: get().currentUserId, created_date: now(),
      sla_target_date: '2026-07-09', priority: t.priority ?? 'normal',
      agreement_ids: t.agreement_ids ?? [], description: t.description,
    }
    set((s) => ({ tickets: [ticket, ...s.tickets] }))
    get().audit_push({ event_type: 'ticket_created', ticket_id: id, actor_id: 'ai_engine', summary: `Ticket ${id} created (${t.title}).` })
    const aName = get().users.find((u) => u.id === attorneyId)?.name ?? 'attorney'
    get().audit_push({ event_type: 'ticket_assigned', ticket_id: id, actor_id: 'ai_engine', summary: `Routed to ${aName} (${t.assigned_attorney_id ? 'manual override' : routed.rationale}).` })
    return ticket
  },

  // ----- agentic NDA intake (Change 1) --------------------------------------
  prepareIntake: ({ query, rawPrompt, onBehalfOf }) => {
    const me = get().users.find((u) => u.id === get().currentUserId)!
    const impersonated = onBehalfOf ? get().users.find((u) => u.name.toLowerCase().includes(onBehalfOf.toLowerCase())) : undefined
    const requestorId = impersonated?.id ?? me.id
    const candidates = lookupCounterparty(query)
    const profile = candidates[0] ?? null
    const ctx = profile ? inferDealContext(profile) : null
    const routed = routeAttorney(get().routingStrategy, 'MNDA', get().users, get().tickets)
    const f = (value: string, source: InferredField['source'], confidence: InferredField['confidence'], note?: string): InferredField => ({ value, source, confidence, note })
    const payload: IntakePayload = {
      rawPrompt, counterpartyQuery: query, profile, candidates,
      confirmed: false, // always confirm the counterparty ("is this the company? → yes")
      requestorId, onBehalfOf,
      template: f('ChargePoint Mutual NDA 2025 (North America)', 'playbook', 'high', 'Matched to the active NDA playbook (v3).'),
      jurisdiction: f(ctx?.jurisdiction ?? 'North America', 'inference', profile ? 'high' : 'low', 'Inferred from counterparty HQ region.'),
      governingLaw: f(ctx?.governingLaw ?? 'Delaware', 'playbook', 'high', ctx?.foreignNote ?? 'Playbook standard.'),
      clausePosture: f(ctx?.clausePosture ?? 'Standard mutual NDA posture.', 'inference', 'medium'),
      purpose: f(ctx?.purpose ?? 'Evaluate a potential business relationship.', 'inference', 'medium'),
      sfOpportunity: profile?.sf_opportunity
        ? f(profile.sf_opportunity, 'crm', 'high', 'Auto-populated from Salesforce (connected).')
        : f('Not linked', 'crm', 'low', 'No matching Salesforce opportunity — optional.'),
      attorneyId: routed.attorneyId,
      signerName: '', signerEmail: '',
    }
    set((s) => ({ canvas: { ...s.canvas, intakePayload: payload, intakeCp: profile?.legal_name ?? query } }))
  },
  updateIntakeField: (key, value) =>
    set((s) => (s.canvas.intakePayload
      ? { canvas: { ...s.canvas, intakePayload: { ...s.canvas.intakePayload, [key]: value } } }
      : {})),
  confirmCounterparty: (profile) =>
    set((s) => (s.canvas.intakePayload
      ? { canvas: { ...s.canvas, intakePayload: { ...s.canvas.intakePayload, profile, confirmed: true, candidates: [profile] }, intakeCp: profile.legal_name } }
      : {})),
  generateNdaFromIntake: () => {
    const p = get().canvas.intakePayload
    if (!p || !p.profile || !p.confirmed) { get().setToast('Confirm the counterparty before generating.'); return null }
    const cp = p.profile.legal_name
    const t = get().createTicketFromAgent({
      title: `${cp} — Mutual NDA`, counterparty_name: cp, type: 'single_agreement',
      agreement_type: 'MNDA', assigned_attorney_id: p.attorneyId, priority: 'normal',
      description: `NDA generated from ${p.template.value} for ${cp} (${p.profile.hq_city}, ${p.profile.hq_country}). `
        + `Requestor: ${get().users.find((u) => u.id === p.requestorId)?.name ?? ''}${p.onBehalfOf ? ' (filed on their behalf)' : ''}. `
        + `Jurisdiction ${p.jurisdiction.value}; governing law ${p.governingLaw.value}. Purpose: ${p.purpose.value}. `
        + `Posture: ${p.clausePosture.value}. Signer: ${p.signerName} <${p.signerEmail}>. SF: ${p.sfOpportunity.value}.`,
    })
    get().audit_push({ event_type: 'agreement_added', ticket_id: t.id, actor_id: 'ai_engine', summary: `V1 generated from ${p.template.value}; counterparty resolved via ${p.profile.crm_account ? 'CRM' : 'web'} lookup.` })
    get().setToast(`Generated ${cp} NDA (V1) and routed to ${get().users.find((u) => u.id === p.attorneyId)?.name.split(' ')[0]}.`)
    return t
  },

  audit_push: (e) => {
    const prev = get().audit[get().audit.length - 1]?.hash ?? '00000000'
    const id = nextId('A')
    const hash = chainHash(prev, id + e.event_type + e.summary)
    const ev: AuditEvent = {
      id, event_type: e.event_type, actor_id: e.actor_id ?? get().currentUserId,
      ticket_id: e.ticket_id, agreement_id: e.agreement_id, summary: e.summary, timestamp: now(), hash,
    }
    set((s) => ({ audit: [...s.audit, ev] }))
  },

  // ----- documents: real accept/reject + edit (mutates the doc model) --------
  acceptChange: (versionId, cid) => {
    set((s) => {
      const doc = s.documents[versionId]
      if (!doc) return {}
      const clauses = doc.clauses.map((c) => ({
        ...c,
        // accept: insertions become normal text; deletions are removed entirely
        runs: c.runs.filter((r) => !(r.cid === cid && r.type === 'del')).map((r) => (r.cid === cid && r.type === 'ins' ? { text: r.text, type: 'normal' as const } : r)),
      }))
      return { documents: { ...s.documents, [versionId]: { ...doc, clauses } } }
    })
    get().audit_push({ event_type: 'version_created', summary: `Tracked change ${cid} accepted.` })
  },
  rejectChange: (versionId, cid) => {
    set((s) => {
      const doc = s.documents[versionId]
      if (!doc) return {}
      const clauses = doc.clauses.map((c) => ({
        ...c,
        // reject: insertions are removed; deletions are restored as normal text
        runs: c.runs.filter((r) => !(r.cid === cid && r.type === 'ins')).map((r) => (r.cid === cid && r.type === 'del' ? { text: r.text, type: 'normal' as const } : r)),
      }))
      return { documents: { ...s.documents, [versionId]: { ...doc, clauses } } }
    })
    get().audit_push({ event_type: 'version_created', summary: `Tracked change ${cid} rejected.` })
  },
  addTrackedChange: (versionId, clauseId, text, kind) => {
    const cid = nextId('ch').replace('ch-', 'ch-cp-')
    set((s) => {
      const doc = s.documents[versionId]
      if (!doc) return {}
      const clauses = doc.clauses.map((c) =>
        c.id === clauseId ? { ...c, runs: [...c.runs, { text: ` ${text}`, type: kind, party: 'cp' as const, cid }] } : c)
      return { documents: { ...s.documents, [versionId]: { ...doc, clauses } } }
    })
    get().audit_push({ event_type: 'version_created', summary: `ChargePoint ${kind === 'ins' ? 'insertion' : 'deletion'} added (${clauseId}).` })
  },

  // ----- runtime versioning (Eric §3 — counterparty returns further redlines) ----
  // Auto-detects the incoming draft, creates a new counterparty version + a CP working copy,
  // and moves the agreement back to Redline Received (the negotiation loop).
  receiveCounterpartyRedline: (agreementId) => {
    const a = get().agreements.find((x) => x.id === agreementId); if (!a) return
    const mine = get().versions.filter((v) => v.agreement_id === agreementId)
    const nextNum = Math.max(...mine.map((v) => v.version_number)) + 1
    const cpVer: Version = { id: `${agreementId}-${nextNum}`, agreement_id: agreementId, version_number: nextNum, label: `Draft ${nextNum}`, source: 'counterparty_response', document_ref: `${agreementId}_v${nextNum}_counterparty.docx`, created_by: 'ai_engine', created_date: now(), parent_version_id: a.current_version_id, change_summary: 'Counterparty returned further redlines — auto-ingested.' }
    const workVer: Version = { id: `${agreementId}-${nextNum + 1}`, agreement_id: agreementId, version_number: nextNum + 1, label: `V${nextNum + 1}`, source: 'cp_redline', document_ref: `${agreementId}_v${nextNum + 1}_cp.docx`, created_by: 'ai_engine', created_date: now(), parent_version_id: cpVer.id, change_summary: 'ChargePoint working copy — auto-created for your comments on the new draft.' }
    // R43 — run a REAL playbook analysis of the counterparty's new push and emit the issues from it.
    const priorDoc = get().documents[a.current_version_id] ?? get().documents['V-2201-3']
    // The counterparty's fresh redline this round (a genuine, detectable change the analysis will flag).
    const roundClause: DocClause = { id: `c-r${nextNum}`, ref: '§7', heading: '7. Publicity', runs: [{ text: 'Either Party may publicize the existence of this Agreement and reference the other Party by name in marketing materials and press releases.', type: 'ins', party: 'counterparty', cid: `ch-r${nextNum}` }] }
    const cpDoc: DocModel = { versionId: cpVer.id, title: priorDoc?.title ?? a.title, subtitle: `Counterparty Draft ${nextNum}`, clauses: [...(priorDoc?.clauses ?? []), roundClause] }
    const workDoc: DocModel = { ...cpDoc, versionId: workVer.id, subtitle: `ChargePoint working copy (V${nextNum + 1})` }
    const newDevs = analyzePlaybook(priorDoc, cpDoc, ndaPlaybook, agreementId, workVer.id)
    const redCount = newDevs.filter((d) => d.risk_category === 'red_line').length
    set((s) => ({
      versions: [...s.versions, cpVer, workVer],
      documents: { ...s.documents, [cpVer.id]: cpDoc, [workVer.id]: workDoc },
      deviations: [...s.deviations, ...newDevs],
      agreements: s.agreements.map((x) => (x.id === agreementId ? { ...x, status: 'redline_received', ball_in_court: 'cp_legal', current_version_id: workVer.id, red_line_count: redCount, turn_count: (x.turn_count ?? 0) + 1, last_activity_date: '2026-06-27' } : x)),
      tickets: s.tickets.map((t) => (t.id === a.ticket_id ? { ...t, status: 'Red Line Analysis' } : t)),
      notifications: [{ id: nextId('N'), event: 'Counterparty redline received', body: `${a.title}: counterparty returned Draft ${nextNum}. Auto-created V${nextNum + 1}; playbook analysis found ${newDevs.length} new issue${newDevs.length === 1 ? '' : 's'} in their changes.`, channels: ['in_app', 'email'], ticket_id: a.ticket_id, created_date: now(), read: false, severity: 'warning' }, ...s.notifications],
    }))
    get().audit_push({ event_type: 'version_created', agreement_id: agreementId, actor_id: 'ai_engine', summary: `Draft ${nextNum} ingested (counterparty); working copy V${nextNum + 1} auto-created.` })
    get().audit_push({ event_type: 'deviation_identified', agreement_id: agreementId, actor_id: 'ai_engine', summary: `Playbook analysis of Draft ${nextNum} identified ${newDevs.length} issue${newDevs.length === 1 ? '' : 's'} in the counterparty's changes.` })
    get().audit_push({ event_type: 'status_changed', agreement_id: agreementId, ticket_id: a.ticket_id, summary: `Back to Redline Received — further counterparty redlines.` })
    get().setToast(`Counterparty Draft ${nextNum} ingested → playbook analysis found ${newDevs.length} new issue${newDevs.length === 1 ? '' : 's'} (V${nextNum + 1} working copy).`)
  },
  // Finalize the version that goes to signature (Eric §3 — "finalize the version… latest by default").
  finalizeVersion: (agreementId, versionId) => {
    set((s) => ({ agreements: s.agreements.map((a) => (a.id === agreementId ? { ...a, current_version_id: versionId } : a)) }))
    const v = get().versions.find((x) => x.id === versionId)
    get().audit_push({ event_type: 'version_created', agreement_id: agreementId, summary: `${v?.label ?? versionId} finalized as the execution version.` })
  },
  // Free-text prose edit of a clause (Eric §2 — "edit the document"). Recorded as a CP tracked change.
  editClauseText: (versionId, clauseId, text) => {
    set((s) => {
      const doc = s.documents[versionId]; if (!doc) return {}
      const clauses = doc.clauses.map((c) => (c.id === clauseId ? { ...c, runs: [{ text, type: 'ins' as const, party: 'cp' as const, cid: nextId('ed') }] } : c))
      return { documents: { ...s.documents, [versionId]: { ...doc, clauses } } }
    })
    get().audit_push({ event_type: 'version_created', summary: `Clause ${clauseId} edited (ChargePoint).` })
  },
  // Agent proactively ingests newly-added folder agreements → suggests playbook changes (Eric §8).
  ingestFolderAgreements: (playbookId) => {
    const sug: PlaybookSuggestion = { id: nextId('PS'), playbook_id: playbookId, provision_name: 'Governing Law — neutral NY fallback', kind: 'fallback', proposed_text: 'Fallback: neutral New York law with venue in New York (trending up in recent deals).', rationale: 'Agent ingested 2 newly-added agreements in the folder; both landed on neutral-NY governing law.', source_agreement_id: 'folder', suggested_by: 'ai_engine', created_date: now(), state: 'pending' }
    const pbName = get().playbooks.find((p) => p.id === playbookId)?.name ?? 'the playbook'
    set((s) => ({
      playbookSuggestions: [sug, ...s.playbookSuggestions],
      notifications: [{ id: nextId('N'), event: 'Agent playbook suggestion', body: `I ingested 2 newly-added agreements in the folder and suggest 1 change to ${pbName} — review in Playbook → Suggested additions.`, channels: ['in_app'], created_date: now(), read: false, severity: 'info' }, ...s.notifications],
    }))
    get().audit_push({ event_type: 'playbook_suggested', actor_id: 'ai_engine', summary: 'Agent suggested a playbook change from newly-ingested folder agreements.' })
    get().setToast('Agent ingested 2 new agreements → 1 playbook suggestion added.')
  },

  // ----- lifecycle: advance an agreement to its next stage (with gates) -----
  advanceAgreementStage: (agreementId) => {
    const a = get().agreements.find((x) => x.id === agreementId)
    if (!a) return
    const idx = AGREEMENT_LIFECYCLE.indexOf(a.status)
    const next = AGREEMENT_LIFECYCLE[idx + 1]
    if (!next) { get().setToast('This agreement is already executed.'); return }

    // Gate 1 — external delivery requires an approval chain before "Sent to Counterparty".
    if (next === 'sent_to_counterparty') {
      const ap = get().approvals.find((x) => x.agreement_id === agreementId && x.type === 'external_delivery')
      if (!ap) { get().createApproval(agreementId, 'external_delivery'); get().setToast('Sending requires approval — routed to the approval chain. Grant it below to proceed.'); return }
      if (ap.state === 'denied') { get().setToast('Approval was denied — cannot send to counterparty.'); return }
      if (ap.state !== 'granted') { get().setToast('Waiting on the approval chain before sending to counterparty.'); return }
    }
    // Gate 2 — execution happens through the e-sign flow, not a direct status flip.
    if (next === 'executed') {
      get().openCanvas({ view: 'execution', executionAgreementId: agreementId, executionTicketId: undefined })
      get().setToast('Opening the execution & e-signature flow.')
      return
    }

    set((s) => ({
      agreements: s.agreements.map((x) => (x.id === agreementId ? { ...x, status: next, ball_in_court: ballForStatus(next) } : x)),
      tickets: s.tickets.map((t) => (t.id === a.ticket_id ? { ...t, status: ticketStatusForStatus(next) } : t)),
    }))
    get().audit_push({ event_type: 'status_changed', agreement_id: agreementId, ticket_id: a.ticket_id, summary: `Stage advanced: ${a.status.replace(/_/g, ' ')} → ${next.replace(/_/g, ' ')}.` })
    if (next === 'sent_to_counterparty') get().audit_push({ event_type: 'document_sent', agreement_id: agreementId, summary: 'Document sent to counterparty; ball in their court.' })
    get().setToast(`Advanced to ${ticketStatusForStatus(next)}.`)
  },

  // ----- routing / approvals / e-sign ---------------------------------------
  setRoutingStrategy: (strategy) => {
    set({ routingStrategy: strategy })
    get().setToast(`Assignment routing set to "${strategy.replace('_', ' ')}".`)
  },

  createApproval: (agreementId, type) => {
    const a = get().agreements.find((x) => x.id === agreementId)
    if (!a) return null
    // Approval chain (config-driven demo): red-line → Playbook Owner; external delivery → senior counsel + privacy (parallel).
    const owner = get().users.find((u) => u.role === 'playbook_owner')!
    const senior = get().users.find((u) => u.id === 'u_kirsten')!
    const privacy = get().users.find((u) => u.id === 'u_daniel')!
    const config = type === 'red_line'
      ? { mode: 'sequential' as const, approvers: [owner.id], reason: 'Accepted red-line deviation requires Playbook Owner sign-off.' }
      : { mode: 'parallel' as const, approvers: [senior.id, privacy.id], reason: 'External delivery requires senior counsel + privacy review.' }
    const req: ApprovalRequest = {
      id: nextId('AP'), agreement_id: agreementId, ticket_id: a.ticket_id, type, mode: config.mode,
      reason: config.reason, steps: config.approvers.map((id) => ({ approver_id: id, state: 'pending' })),
      state: 'pending', created_date: now(),
    }
    set((s) => ({ approvals: [req, ...s.approvals] }))
    get().audit_push({ event_type: 'status_changed', agreement_id: agreementId, summary: `Approval requested (${type.replace('_', ' ')}).` })
    return req
  },
  decideApproval: (approvalId, approverId, grant) => {
    set((s) => ({
      approvals: s.approvals.map((ap) => {
        if (ap.id !== approvalId) return ap
        const steps = ap.steps.map((st) => (st.approver_id === approverId ? { ...st, state: grant ? 'granted' as const : 'denied' as const } : st))
        const denied = steps.some((st) => st.state === 'denied')
        const allGranted = steps.every((st) => st.state === 'granted')
        return { ...ap, steps, state: denied ? 'denied' : allGranted ? 'granted' : 'pending' }
      }),
    }))
    const ap = get().approvals.find((x) => x.id === approvalId)
    get().audit_push({ event_type: grant ? 'approval_granted' : 'approval_denied', agreement_id: ap?.agreement_id, summary: `Approval ${grant ? 'granted' : 'denied'} by ${get().users.find((u) => u.id === approverId)?.name}.` })
  },

  startEnvelope: (agreementId) => {
    const a = get().agreements.find((x) => x.id === agreementId)!
    const env: Envelope = {
      id: 'env_' + Math.abs([...agreementId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(16),
      agreement_id: agreementId, ticket_id: a.ticket_id, state: 'pending_cp', created_date: now(),
      signers: [
        { role: 'cp_signer', name: 'Eric Batill (ChargePoint)', email: 'eric.batill@chargepoint.com', state: 'sent' },
        { role: 'counterparty_signer', name: `${a.title.split(' ')[0]} signatory`, email: 'legal@counterparty.com', state: 'waiting' },
      ],
    }
    set((s) => ({
      envelopes: [env, ...s.envelopes.filter((e) => e.agreement_id !== agreementId)],
      agreements: s.agreements.map((x) => (x.id === agreementId ? { ...x, status: 'pending_execution' } : x)),
    }))
    get().audit_push({ event_type: 'signature_requested', agreement_id: agreementId, summary: `DocuSign envelope ${env.id} created; routed to CP signer.` })
    return env
  },
  advanceEnvelope: (envelopeId) => {
    const env = get().envelopes.find((e) => e.id === envelopeId)
    if (!env) return
    set((s) => ({
      envelopes: s.envelopes.map((e) => {
        if (e.id !== envelopeId) return e
        if (e.state === 'pending_cp') {
          return { ...e, state: 'pending_counterparty', signers: e.signers.map((sg) => sg.role === 'cp_signer' ? { ...sg, state: 'signed', signed_date: now() } : sg.role === 'counterparty_signer' ? { ...sg, state: 'sent' } : sg) }
        }
        if (e.state === 'pending_counterparty') {
          return { ...e, state: 'completed', completed_date: now(), signers: e.signers.map((sg) => sg.role === 'counterparty_signer' ? { ...sg, state: 'signed', signed_date: now() } : sg) }
        }
        return e
      }),
    }))
    const after = get().envelopes.find((e) => e.id === envelopeId)!
    if (after.state === 'completed') {
      const openDevs = get().deviations.filter((d) => d.agreement_id === env.agreement_id && d.disposition_status === 'open')
      const uid = get().currentUserId
      set((s) => ({
        agreements: s.agreements.map((x) => (x.id === env.agreement_id ? { ...x, status: 'executed', executed_date: now() } : x)),
        tickets: s.tickets.map((t) => (t.id === env.ticket_id ? { ...t, status: 'Executed', closed_date: now() } : t)),
        // executed record must be clean — resolve any still-open deviations to their recommended disposition
        deviations: s.deviations.map((d) => {
          if (d.agreement_id !== env.agreement_id || d.disposition_status !== 'open') return d
          const status: DispositionStatus = d.risk_category === 'accept' ? 'accepted' : d.risk_category === 'red_line' ? 'rejected' : 'countered'
          return { ...d, disposition_status: status, disposition_by: uid, disposition_date: now() }
        }),
      }))
      if (openDevs.length) get().audit_push({ event_type: 'disposition_decided', agreement_id: env.agreement_id, summary: `${openDevs.length} open deviation(s) auto-resolved to recommended on execution.` })
      get().audit_push({ event_type: 'signature_completed', agreement_id: env.agreement_id, summary: 'All parties signed; agreement executed and archived.' })
      get().audit_push({ event_type: 'status_changed', ticket_id: env.ticket_id, summary: 'Ticket → Executed.' })
    } else {
      get().audit_push({ event_type: 'signature_requested', agreement_id: env.agreement_id, summary: 'CP signed; routed to counterparty signer.' })
    }
  },

  runSlaCheck: () => {
    if (get().slaChecked) return
    const fresh: AppNotification[] = []
    for (const t of get().tickets) {
      if (t.status === 'Executed' || t.status === 'Resolved') continue
      const sla = slaStatus(t.created_date, t.sla_target_date)
      if (sla.state === 'warning' || sla.state === 'breach') {
        const exists = get().notifications.some((n) => n.event.startsWith('SLA') && n.ticket_id === t.id)
        if (!exists) {
          fresh.push({
            id: nextId('N'), event: sla.state === 'breach' ? 'SLA breach' : 'SLA warning',
            body: `${t.id} (${t.counterparty_name}) is at ${sla.pct}% of its SLA window${sla.state === 'breach' ? ' — breached, escalated' : ''}. Target ${t.sla_target_date}.`,
            channels: sla.state === 'breach' ? ['in_app', 'email', 'teams'] : ['in_app', 'email'],
            ticket_id: t.id, created_date: now(), read: false, severity: sla.state === 'breach' ? 'critical' : 'warning',
          })
          get().audit_push({ event_type: 'sla_breached', ticket_id: t.id, actor_id: 'ai_engine', summary: `SLA ${sla.state} for ${t.id} (${sla.pct}%) — escalation triggered.` })
        }
      }
    }
    set((s) => ({ notifications: [...fresh, ...s.notifications], slaChecked: true }))
  },

  startEnvelopesForTicket: (ticketId, agreementIds, mode) => {
    const groupId = 'grp_' + Math.abs([...(ticketId + mode)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(16)
    for (const id of agreementIds) get().startEnvelope(id)
    set((s) => ({ envelopes: s.envelopes.map((e) => (agreementIds.includes(e.agreement_id) && !e.envelope_group_id ? { ...e, envelope_group_id: groupId, mode } : e)) }))
    get().audit_push({ event_type: 'signature_requested', ticket_id: ticketId, summary: `${agreementIds.length} document(s) routed for signature (${mode === 'combined' ? 'together' : 'individually'}).` })
  },

  // ----- versioning: track-changes hygiene + send-back (Eric §3) --------------
  acceptAllChanges: (versionId) => {
    set((s) => {
      const doc = s.documents[versionId]; if (!doc) return {}
      const clauses = doc.clauses.map((c) => ({ ...c, runs: c.runs.filter((r) => r.type !== 'del').map((r) => ({ text: r.text, type: 'normal' as const })) }))
      return { documents: { ...s.documents, [versionId]: { ...doc, clauses } } }
    })
    get().audit_push({ event_type: 'version_created', summary: 'All tracked changes accepted → clean copy.' })
    get().setToast('Accepted all changes — this is now a clean copy.')
  },
  rejectAllChanges: (versionId) => {
    set((s) => {
      const doc = s.documents[versionId]; if (!doc) return {}
      const clauses = doc.clauses.map((c) => ({ ...c, runs: c.runs.filter((r) => r.type !== 'ins').map((r) => ({ text: r.text, type: 'normal' as const })) }))
      return { documents: { ...s.documents, [versionId]: { ...doc, clauses } } }
    })
    get().audit_push({ event_type: 'version_created', summary: 'All tracked changes rejected.' })
  },
  openSendBack: (agreementId) => {
    const versions = get().versions.filter((v) => v.agreement_id === agreementId)
    const cpLast = [...versions].reverse().find((v) => v.source === 'counterparty_response' || v.source === 'counterparty_draft')
    const base = cpLast?.id ?? versions[0]?.id ?? ''
    set((s) => ({ canvas: { ...s.canvas, view: 'ticket', open: true, solo: true, ticketId: get().agreements.find((a) => a.id === agreementId)?.ticket_id, agreementId, agreementTab: 'review', reviewMode: 'sendback', sendBack: { agreementId, baseVersionId: base, cumulative: false, staged: false } } }))
  },
  setSendBackBase: (baseVersionId) => set((s) => (s.canvas.sendBack ? { canvas: { ...s.canvas, sendBack: { ...s.canvas.sendBack, baseVersionId, redline: undefined } } } : {})),
  setSendBackCumulative: (cumulative) => set((s) => (s.canvas.sendBack ? { canvas: { ...s.canvas, sendBack: { ...s.canvas.sendBack, cumulative, redline: undefined } } } : {})),
  generateRedline: () => {
    const sb = get().canvas.sendBack; if (!sb) return
    const docs = get().documents
    // Cumulative → diff against the ORIGINAL first draft (whole-negotiation delta);
    // non-cumulative → diff against the counterparty version they last sent (this-round delta only).
    const firstVer = get().versions.filter((v) => v.agreement_id === sb.agreementId).sort((a, b) => a.version_number - b.version_number).find((v) => docs[v.id])
    const baseId = sb.cumulative ? (firstVer?.id ?? sb.baseVersionId) : sb.baseVersionId
    const base = docs[baseId]
    const workingId = cleanCopyId(sb.agreementId) || get().agreements.find((a) => a.id === sb.agreementId)?.current_version_id || ''
    const working = docs[workingId]
    if (!base || !working) { get().setToast('No tracked-changes document available to redline for this agreement.'); return }
    const redline = buildRedlineDoc(base, buildCleanCopy(working), sb.cumulative)
    set((s) => (s.canvas.sendBack ? { canvas: { ...s.canvas, reviewMode: 'redline', sendBack: { ...s.canvas.sendBack, redline } } } : {}))
    get().audit_push({ event_type: 'version_created', agreement_id: sb.agreementId, summary: `Generated clean copy + redline (${redline.changeCount} changes) ${sb.cumulative ? `cumulatively vs ${baseId} (original)` : `vs ${baseId}`}.` })
  },
  summarizeChanges: (audience) => {
    const sb = get().canvas.sendBack
    if (!sb?.redline) { get().setToast('Generate the redline first.'); return }
    const devs = get().deviations.filter((d) => d.agreement_id === sb.agreementId)
    const summary = summarizeRedline(sb.redline, devs, audience)
    set((s) => (s.canvas.sendBack ? { canvas: { ...s.canvas, sendBack: { ...s.canvas.sendBack, summary } } } : {}))
  },
  sendRedline: (agreementId) => {
    const a = get().agreements.find((x) => x.id === agreementId); if (!a) return
    set((s) => ({
      agreements: s.agreements.map((x) => (x.id === agreementId ? { ...x, status: 'negotiation', ball_in_court: 'counterparty' } : x)),
      tickets: s.tickets.map((t) => (t.id === a.ticket_id ? { ...t, status: 'In Negotiation' } : t)),
      canvas: { ...s.canvas, sendBack: s.canvas.sendBack ? { ...s.canvas.sendBack, staged: true } : undefined },
    }))
    get().audit_push({ event_type: 'document_sent', agreement_id: agreementId, ticket_id: a.ticket_id, summary: 'Clean copy + redline sent to counterparty; ball in their court (In Negotiation).' })
    get().setToast('Clean copy + redline staged for the counterparty. Status → In Negotiation.')
  },

  // ----- playbook: suggestions, NL creation (Eric §7,§8) ----------------------
  setPlaybook: (playbookId) => set((s) => ({ canvas: { ...s.canvas, playbookId, playbookMode: 'inventory' } })),
  suggestToPlaybook: (sug) => {
    const suggestion: PlaybookSuggestion = {
      id: nextId('PS'), playbook_id: sug.playbook_id, provision_name: sug.provision_name, kind: sug.kind,
      proposed_text: sug.proposed_text, rationale: sug.rationale ?? '', source_agreement_id: sug.source_agreement_id, source_section: sug.source_section,
      suggested_by: get().currentUserId, created_date: now(), state: 'pending',
    }
    const who = get().users.find((u) => u.id === get().currentUserId)?.name ?? 'An attorney'
    const pbName = get().playbooks.find((p) => p.id === sug.playbook_id)?.name ?? 'the playbook'
    set((s) => ({
      playbookSuggestions: [suggestion, ...s.playbookSuggestions],
      // Notify the playbook owner / administrator (Eric §7 — "notify an administrator").
      notifications: [{ id: nextId('N'), event: 'Playbook suggestion', body: `${who} suggested a ${sug.kind.replace('_', ' ')} for ${pbName} — awaiting your approval in Playbook → Suggested additions.`, channels: ['in_app'], created_date: now(), read: false, severity: 'info' }, ...s.notifications],
    }))
    get().audit_push({ event_type: 'playbook_suggested', summary: `Suggested "${sug.provision_name}" (${sug.kind}) for the playbook.` })
    get().setToast('Sent to the playbook owner for approval.')
  },
  decidePlaybookSuggestion: (id, approve) => {
    const uid = get().currentUserId
    const sug = get().playbookSuggestions.find((x) => x.id === id)
    set((s) => ({ playbookSuggestions: s.playbookSuggestions.map((x) => (x.id === id ? { ...x, state: approve ? 'approved' : 'rejected', decided_by: uid, decided_date: now() } : x)) }))
    if (approve && sug) {
      set((s) => ({ playbooks: s.playbooks.map((pb) => {
        if (pb.id !== sug.playbook_id) return pb
        let changed = false
        const applyTo = (list: Provision[]): Provision[] => list.map((p) => {
          if (sug.target_provision_id && p.id === sug.target_provision_id) {
            changed = true
            if (sug.kind === 'fallback') return { ...p, fallback_tiers: [...p.fallback_tiers, sug.proposed_text] }
            if (sug.kind === 'red_line') return { ...p, red_line: sug.proposed_text }
            return { ...p, standard_position: sug.proposed_text }
          }
          return p.children ? { ...p, children: applyTo(p.children) } : p
        })
        let provisions = applyTo(pb.provisions)
        // No existing target (a runtime suggestion) → add it as a NEW named provision.
        if (!changed) {
          provisions = [...provisions, {
            id: 'pv_' + sug.id.toLowerCase(), provision_name: sug.provision_name,
            standard_position: sug.kind === 'default' ? sug.proposed_text : `Per the added ${sug.kind.replace('_', ' ')}.`,
            fallback_tiers: sug.kind === 'fallback' ? [sug.proposed_text] : [],
            red_line: sug.kind === 'red_line' ? sug.proposed_text : 'Deviations flagged for attorney review.',
            rationale: sug.rationale || 'Added from an attorney suggestion.',
            tier: sug.kind === 'red_line' ? 'red_line' : sug.kind === 'fallback' ? 'fallback' : 'baseline',
          }]
        }
        return { ...pb, provisions, version: pb.version + 1 }
      }) }))
      get().audit_push({ event_type: 'playbook_updated', summary: `Applied suggestion "${sug.provision_name}" to the playbook.` })
    }
    get().audit_push({ event_type: 'playbook_suggestion_decided', summary: `Suggestion ${approve ? 'approved & applied' : 'rejected'}.` })
    get().setToast(approve ? 'Approved — added to the playbook.' : 'Suggestion rejected.')
  },
  startPlaybookDraft: (name, agreement_type, rawPrompt, opts) => {
    const id = nextId('PD')
    // Resolve the default source folder for this type (R49) so examples are pre-populated from real data.
    const folder = get().playbookSourceDefaults[agreement_type]
    const exampleRefs = opts?.exampleRefs ?? folder?.exampleAgreementIds ?? Object.keys(executedCorpus())
    const sourceTemplateId = opts?.sourceTemplateId ?? folder?.templateId
    const sourcePath = opts?.sourcePath ?? folder?.path
    const draft: PlaybookDraft = { id, name, agreement_type, templateRef: 'ChargePoint template', sourceTemplateId, sourcePath, exampleRefs, stage: 'collecting', provisions: [], rawPrompt, created_date: now() }
    set((s) => ({ playbookDrafts: [draft, ...s.playbookDrafts], canvas: { ...s.canvas, view: 'playbook', open: true, playbookMode: 'create', playbookDraftId: id } }))
    return id
  },
  setDraftExampleRefs: (draftId, exampleRefs) => set((s) => ({ playbookDrafts: s.playbookDrafts.map((d) => (d.id === draftId ? { ...d, exampleRefs } : d)) })),
  setPlaybookSourceDefault: (type, folder) => {
    set((s) => {
      const next = { ...s.playbookSourceDefaults, [type]: folder }
      try { localStorage.setItem(SOURCES_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return { playbookSourceDefaults: next }
    })
    get().setToast(`Default ${type} source folder saved.`)
  },
  advancePlaybookDraft: (draftId) => {
    set((s) => ({ playbookDrafts: s.playbookDrafts.map((d) => {
      if (d.id !== draftId) return d
      if (d.stage === 'collecting') return { ...d, stage: 'analyzing' }
      if (d.stage === 'analyzing') {
        // R50/R62 — DERIVE provisions from the template sections + the selected example agreements.
        const tpl = s.templates.find((t) => t.id === d.sourceTemplateId)
        const sections = tpl?.sections ?? buildSectionsFor(d.agreement_type)
        return { ...d, stage: 'generated', provisions: deriveProvisions(sections, d.exampleRefs) }
      }
      return d
    }) }))
  },
  publishPlaybookDraft: (draftId) => {
    const d = get().playbookDrafts.find((x) => x.id === draftId)
    if (!d || d.stage !== 'generated') return
    const pbId = 'pb_new_' + d.id.replace(/[^0-9]/g, '')
    const pb: Playbook = { id: pbId, agreement_type: d.agreement_type, name: d.name, version: 1, owner_id: get().currentUserId, generated_from: d.rawPrompt || 'Generated from template + examples', provisions: d.provisions, created_date: now() }
    set((s) => ({
      playbooks: [...s.playbooks, pb],
      // Close the template→playbook loop when this draft came from a saved template.
      templates: d.sourceTemplateId ? s.templates.map((t) => (t.id === d.sourceTemplateId ? { ...t, playbook_id: pbId } : t)) : s.templates,
      canvas: { ...s.canvas, view: 'playbook', playbookId: pbId, playbookMode: 'inventory', playbookDraftId: undefined },
    }))
    get().audit_push({ event_type: 'playbook_updated', summary: `Published new playbook "${d.name}".` })
    get().setToast(`Published "${d.name}".`)
  },
  // Refine a draft playbook's CONTENT in natural language (Eric §8 — "build & refine by instruction").
  refinePlaybookDraft: (draftId, instruction) => {
    const t = instruction.toLowerCase().trim()
    if (!t) return ''
    let reply = 'I can add, remove, or re-tier provisions in plain language — e.g. "add a Publicity red line", "remove the Injunctive Relief provision", "make Governing Law a fallback".'
    set((s) => ({ playbookDrafts: s.playbookDrafts.map((d) => {
      if (d.id !== draftId) return d
      let provisions = d.provisions
      if (/\b(remove|delete|drop)\b/.test(t)) {
        const target = t.replace(/.*\b(remove|delete|drop)\b (?:the )?/, '').replace(/ ?(provision|clause).*/, '').trim()
        const before = provisions.length
        provisions = provisions.filter((p) => !(target && p.provision_name.toLowerCase().includes(target)))
        reply = before !== provisions.length ? `Removed the "${target}" provision. ${provisions.length} provisions remain.` : `I couldn't find a provision matching "${target}".`
      } else if (/\b(add|include)\b/.test(t)) {
        const m = t.match(/\b(?:add|include)\b (?:a |an |the )?(.+)/)
        const raw = (m?.[1] ?? 'New Provision').replace(/\b(as )?(a |an )?(red[ -]?line|fallback|default|baseline|provision|clause)\b/g, '').replace(/\s+/g, ' ').trim()
        const name = (raw || 'New Provision').replace(/\b\w/g, (c) => c.toUpperCase())
        const kind: ProvisionTier = /red ?line/.test(t) ? 'red_line' : /fallback/.test(t) ? 'fallback' : 'baseline'
        provisions = [...provisions, { id: 'pv_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), provision_name: name, standard_position: kind === 'baseline' ? `Standard ChargePoint position on ${name}.` : `See ${kind.replace('_', ' ')}.`, fallback_tiers: kind === 'fallback' ? [`Approved fallback for ${name}.`] : [], red_line: kind === 'red_line' ? `Do not accept adverse ${name} terms.` : 'Deviations flagged for attorney review.', rationale: 'Added via natural-language instruction.', tier: kind }]
        reply = `Added a ${kind.replace('_', ' ')} provision "${name}". ${provisions.length} provisions now.`
      } else if (/\b(re-?tier|make .* (a )?(fallback|red ?line|baseline)|change .* to)\b/.test(t)) {
        reply = 'Adjusted — name the provision and the tier and I\'ll re-classify it.'
      }
      return { ...d, provisions }
    }) }))
    return reply
  },

  // ----- templates / projects (Eric §9) ---------------------------------------
  createProject: (name, goal, agreement_type) => {
    const id = nextId('PRJ')
    const proj: TemplateProject = { id, name, goal, agreement_type, status: 'building', owner_id: get().currentUserId, created_date: now(), sources: defaultProjectSources(), iterations: [], draftTemplateId: null }
    set((s) => ({ projects: [proj, ...s.projects], canvas: { ...s.canvas, view: 'projects', open: true, projectId: id, templateId: undefined } }))
    return id
  },
  toggleProjectSource: (projectId, sourceId) => set((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, sources: p.sources.map((src) => (src.id === sourceId ? { ...src, selected: !src.selected } : src)) } : p)) })),
  generateTemplateDraft: (projectId) => {
    const proj = get().projects.find((p) => p.id === projectId); if (!proj) return
    const tplId = nextId('TPL')
    const selected = proj.sources.filter((sc) => sc.selected)
    // R105 — real comparative analysis across the SELECTED negotiated agreements.
    const ids = selected.flatMap((sc) => sc.agreementIds ?? [])
    const analysis = comparativeAnalysis(ids)
    const conceptSections = analysis.map((row, i) => ({ id: `cs${i}`, heading: `${i + 1}. ${row.label}`, summary: `Seen in ${row.seenIn.length}/${ids.length} sources; ${Math.round(row.divergence * 100)}% divergence across precedents.`, cpConcept: false }))
    const cpSections = buildSectionsFor(proj.agreement_type).filter((sec) => sec.cpConcept)
    // Sections are DERIVED from the analysis (fall back to the type template only when no sources are linked).
    const sections = conceptSections.length ? [...conceptSections, ...cpSections] : buildSectionsFor(proj.agreement_type)
    const tpl: AgreementTemplate = {
      id: tplId, name: proj.name, agreement_type: proj.agreement_type, origin: 'generated', status: 'draft', project_id: projectId,
      version: 1, owner_id: get().currentUserId, created_date: now(), sections,
      source_summary: `Generated from ${selected.length} sources; comparative analysis over ${ids.length} negotiated agreement(s) found ${analysis.length} recurring concepts.`, playbook_id: null,
    }
    const it: TemplateIteration = { id: nextId('it'), role: 'agent', text: `Ran a comparative analysis across ${ids.length} negotiated agreement(s) and ${selected.length} source group(s); found ${analysis.length} recurring concepts and generated a ${sections.length}-section ${proj.agreement_type} template. ChargePoint-specific sections flagged.`, ts: now(), changeNote: 'Comparative analysis + generation' }
    set((s) => ({ templates: [tpl, ...s.templates], projects: s.projects.map((p) => (p.id === projectId ? { ...p, status: 'iterating', draftTemplateId: tplId, iterations: [...p.iterations, it] } : p)), canvas: { ...s.canvas, templateId: tplId } }))
    get().setToast(`Comparative analysis over ${ids.length} agreements → ${sections.length}-section template.`)
  },
  iterateTemplate: (projectId, instruction) => {
    const uIt: TemplateIteration = { id: nextId('it'), role: 'user', text: instruction, ts: now() }
    const aIt: TemplateIteration = { id: nextId('it'), role: 'agent', text: `Applied: ${instruction}`, ts: now(), changeNote: instruction.length > 48 ? instruction.slice(0, 48) + '…' : instruction }
    set((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, iterations: [...p.iterations, uIt, aIt] } : p)) }))
  },
  saveTemplate: (projectId) => {
    const proj = get().projects.find((p) => p.id === projectId); if (!proj?.draftTemplateId) return
    set((s) => ({ templates: s.templates.map((t) => (t.id === proj.draftTemplateId ? { ...t, status: 'published' } : t)), projects: s.projects.map((p) => (p.id === projectId ? { ...p, status: 'template_ready' } : p)) }))
    get().audit_push({ event_type: 'playbook_updated', summary: `Template "${proj.name}" saved to the library.` })
    get().setToast('Template saved to the library.')
  },
  buildPlaybookFromTemplate: (templateId) => {
    const tpl = get().templates.find((t) => t.id === templateId); if (!tpl) return
    get().startPlaybookDraft(`${tpl.name} — Playbook`, tpl.agreement_type, `Build a playbook from the ${tpl.name} template`, { sourceTemplateId: templateId })
    get().setToast(`Building a playbook from "${tpl.name}"…`)
  },

  pushChat: (m) => set((s) => ({ chat: [...s.chat, m] })),
  setAgentThinking: (v) => set({ agentThinking: v }),
}))

// Deal rollup for many-to-one tickets (pure helper — call in component body, never in a selector).
export const dealRollup = (s: CLMState, ticketId: string) => {
  const ags = s.agreements.filter((a) => a.ticket_id === ticketId)
  const open = ags.filter((a) => a.status !== 'executed')
  return {
    agreements: ags, total: ags.length, open: open.length,
    executed: ags.filter((a) => a.status === 'executed').length,
    cpCourt: open.filter((a) => a.ball_in_court === 'cp_legal').length,
    counterpartyCourt: open.filter((a) => a.ball_in_court === 'counterparty').length,
    readyToSign: ags.filter((a) => a.status === 'pending_execution').length,
    redLines: ags.reduce((n, a) => n + a.red_line_count, 0),
    value: ags.reduce((n, a) => n + (a.contract_value ?? 0), 0),
  }
}

// selectors / helpers
export const useCurrentUser = () => useStore((s) => s.users.find((u) => u.id === s.currentUserId)!)
export const ticketAgreements = (s: CLMState, ticketId: string) =>
  s.agreements.filter((a) => a.ticket_id === ticketId)
export const agreementDeviations = (s: CLMState, agreementId: string) =>
  s.deviations.filter((d) => d.agreement_id === agreementId)
export const agreementVersions = (s: CLMState, agreementId: string) =>
  s.versions.filter((v) => v.agreement_id === agreementId).sort((a, b) => a.version_number - b.version_number)
