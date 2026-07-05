import { create } from 'zustand'
import type {
  Ticket, Agreement, Version, Deviation, Message, Playbook,
  AuditEvent, AppNotification, ChatMessage, CanvasState, ViewKey,
  DispositionStatus, MessageTag, ThreadType, AuditEventType,
  ApprovalRequest, ApprovalType, Envelope, EnvelopeMode, AgreementType,
  AgreementStatus, BallInCourt, ContractStatus,
  IntakePayload, InferredField, CounterpartyProfile, ContractsFilterPreset,
  SummaryAudience, PlaybookSuggestion, SuggestionKind, SuggestionState, PlaybookDraft, Provision, ProvisionTier,
  TemplateProject, AgreementTemplate, TemplateIteration,
} from '@/types'
import { lookupCounterparty, inferDealContext } from '@/data/counterparties'
import {
  users, userById, tickets as seedTickets, agreements as seedAgreements,
  versions as seedVersions, deviations as seedDeviations, messages as seedMessages,
  playbooks as seedPlaybooks, auditSeed, notificationSeed, CURRENT_USER_ID, ndaPlaybook,
  playbookSuggestions as seedSuggestions, templateProjects as seedProjects,
  agreementTemplates as seedTemplates, defaultProjectSources, buildSectionsFor, DEFAULT_PLAYBOOK_SOURCES,
} from '@/data/seed'
import { GREETING, greetingFor } from '@/agent/greeting'
import { seedDocuments, buildCleanCopy, buildRedlineDoc, summarizeRedline, cleanCopyId, effectiveText, type DocModel, type DocClause } from '@/data/documents'
import { analyzePlaybook } from '@/lib/playbookAnalysis'
import { deriveProvisions, comparativeAnalysis, folderAgreements, composeBodyFromPrecedents } from '@/data/playbookDerive'
import { applyPlaybookInstruction } from '@/lib/playbookOps'
import { precedentAnswer } from '@/lib/precedent'
import { TEAM_FOLDERS } from '@/data/folders'
import { generateSectionBodies, bodyForSection } from '@/lib/templateGen'
import { can } from '@/lib/access'
import type { PublishedArtifact, TeamFolder, Role } from '@/types'
import { executedCorpus } from '@/data/executed'
import type { PlaybookSourceDefaults, SourceFolder, DocLock } from '@/types'
import { agreementIdForVersion } from '@/data/documents'
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
  entryChannel: 'slack' | 'teams' | 'landing' // R102 — which entry point the user came through
  setEntryChannel: (c: 'slack' | 'teams' | 'landing') => void
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
  createInquiry: (question: string) => Ticket   // R79 — a ticket with no agreement, just a question→response
  createTicketFull: (input: { title: string; kind: 'negotiation' | 'support'; counterparty?: string; files: string[]; attorneyId?: string }) => void // Dashboard §1 Open Ticket modal
  advanceInquiry: (ticketId: string) => void // support tickets: Open → In Progress → Resolved
  reassignVersion: (versionId: string, targetAgreementId: string, newNumber?: number) => void // intake §5 error correction
  ingestVersion: (agreementId: string, fileName: string, asNewDocument?: boolean) => void // intake §1 — in-deal upload
  decideDraftProvision: (draftId: string, provisionId: string, decision: 'accept' | 'reject' | 'fallback' | 'defer') => void // playbooks §2 step 3 — approve / reject / make-fallback / defer each new clause
  editDraftProvisionText: (draftId: string, provisionId: string, field: 'standard' | 'fallback' | 'red_line', idx: number, text: string) => void // edit content at CREATE time too
  editProvisionText: (playbookId: string, provisionId: string, field: 'standard' | 'fallback' | 'red_line', idx: number, text: string) => void // playbooks §5 manual inline edit
  addDocumentsToPlaybook: (playbookId: string) => void // playbooks §6 — feed more agreements post-creation
  // ---- Counter flow (Eric E3): tracked-change insertion + keep/discard ----
  pendingCounter: { deviationId: string; clauseId: string; versionId: string } | null
  proposeCounter: (deviationId: string) => void
  keepCounter: (deviationId: string, editedText?: string) => void
  discardCounter: (deviationId: string) => void
  showDocComments: boolean            // Show/Hide Comments toggle — persists across tabs
  setShowDocComments: (v: boolean) => void
  analysisFlags: { id: string; deviation_id: string; reason: string; status: 'open' | 'reviewed'; date: string }[]
  flagAnalysis: (deviationId: string, reason: string) => void // "Flag: incorrect analysis" 
  addIntakeAgreementType: (type: AgreementType) => void // R81 — add a parallel agreement to the intake
  intakeExtraTypes: AgreementType[]             // R81 — extra agreement types requested alongside the NDA

  // runtime versioning (G4/G5) + free-text edit (G2)
  receiveCounterpartyRedline: (agreementId: string) => void
  finalizeVersion: (agreementId: string, versionId: string) => void
  editClauseText: (versionId: string, clauseId: string, text: string) => void
  ingestFolderAgreements: (playbookId: string) => void

  // documents (editable, tracked changes)
  acceptChange: (versionId: string, cid: string) => void
  rejectChange: (versionId: string, cid: string) => void
  addTrackedChange: (versionId: string, clauseId: string, text: string, kind: 'ins' | 'del') => void

  // R18 — document integrity (real lock / per-clause claim, not a banner)
  docLocks: Record<string, DocLock>
  setCollabMode: (agreementId: string, mode: 'live' | 'locked') => void
  checkoutDoc: (agreementId: string) => boolean   // false if already held by someone else
  releaseDoc: (agreementId: string) => void
  claimClause: (agreementId: string, clauseId: string) => boolean
  releaseClause: (agreementId: string, clauseId: string) => void
  canEditDoc: (agreementId: string, clauseId?: string) => { allowed: boolean; holderId?: string; reason?: string }

  // lifecycle / routing / approvals / e-sign
  advanceAgreementStage: (agreementId: string) => void
  setRoutingStrategy: (s: RoutingStrategy) => void
  createApproval: (agreementId: string, type: ApprovalType) => ApprovalRequest | null
  decideApproval: (approvalId: string, approverId: string, grant: boolean) => void
  startEnvelope: (agreementId: string, receiver?: { name: string; email: string }, meta?: { envelope_group_id?: string; mode?: EnvelopeMode }) => Envelope
  advanceEnvelope: (envelopeId: string) => void
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
  decidePlaybookSuggestion: (id: string, decision: 'accept' | 'reject' | 'redline' | 'defer') => void
  startPlaybookDraft: (name: string, agreement_type: AgreementType, rawPrompt: string, opts?: { sourceTemplateId?: string; sourcePath?: string; exampleRefs?: string[] }) => string
  advancePlaybookDraft: (draftId: string) => void
  publishPlaybookDraft: (draftId: string) => void
  refinePlaybookDraft: (draftId: string, instruction: string) => string // returns the agent's confirmation
  restructurePlaybook: (playbookId: string, instruction: string) => string // R52/R57/R58/R60 — edit a PUBLISHED playbook by chat
  publishedArtifacts: PublishedArtifact[]                 // R85 — published playbooks/templates in team folders
  publishArtifact: (kind: 'playbook' | 'template', sourceId: string, name: string, purpose: string, folderPath: string) => void
  teamFolders: TeamFolder[]                               // R85 — user-creatable, access-scoped destinations
  createTeamFolder: (path: string, category: string, accessRoles: Role[]) => string | null // returns the canonical path (existing on dupe), null if invalid
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
  uploadTemplate: (fileName: string) => void // Templates §1 — drag-drop a form agreement

  // chat
  pushChat: (m: ChatMessage) => void
  setAgentThinking: (v: boolean) => void
}

// R43 — the Vishay issues list is COMPUTED by a real playbook analysis of V1 → V2 (not hand-seeded).
// Every row's counterparty_position is the actual §-clause text; editing a clause changes the issue.
const _initDocs = seedDocuments()
const _computedVishay = analyzePlaybook(_initDocs['V-2201-1'], _initDocs['V-2201-2'], ndaPlaybook, 'AGR-2201', 'V-2201-2')
// Deferred playbook provisions are excluded from AI review — no analysis card anywhere,
// including the curated seed fallback below (Eric, Playbooks §3).
const _deferredNames = seedPlaybooks.flatMap((pb) => {
  const flat: { provision_name: string; tier?: string }[] = []
  const walk = (ps: typeof pb.provisions) => ps.forEach((p) => { flat.push(p); if (p.children) walk(p.children) })
  walk(pb.provisions)
  return flat.filter((p) => p.tier === 'deferred').map((p) => p.provision_name.toLowerCase())
})
const _isDeferredIssue = (name: string) => _deferredNames.some((n) => name.toLowerCase().includes(n) || n.includes(name.toLowerCase()))

const initialDeviations: Deviation[] = [
  ..._computedVishay,
  // keep any curated Vishay issue the analyzer didn't reproduce (e.g. the untagged §2 oral-disclosure accept)
  ...seedDeviations.filter((d) => d.agreement_id === 'AGR-2201' && !_computedVishay.some((c) => c.id === d.id) && !_isDeferredIssue(d.provision_name)),
  // other agreements (executed Mondelez, live Northwind) keep their curated deviations
  ...seedDeviations.filter((d) => d.agreement_id !== 'AGR-2201'),
]

// Real-time doc cleaning: a disposition resolves the counterparty's tracked changes in the
// working document immediately — accepted → their changes become clean text; rejected → their
// changes are struck and the prior text restored; countered → their changes struck + the counter
// language added as a ChargePoint tracked insertion (your outgoing redline). Recomputed from an
// `orig` snapshot each time, so changing your mind about a disposition is idempotent.
// The counter language: the negotiated clean-copy clause when one exists, else the playbook
// standard position (the template text we want restored).
function counterTextFor(documents: Record<string, DocModel>, d: Deviation, clauseId: string): string {
  const cleanDoc = documents[cleanCopyId(d.agreement_id)]
  const counterClause = cleanDoc?.clauses.find((x) => x.id === clauseId)
  if (counterClause) return effectiveText(counterClause)
  return d.template_position ?? ''
}

function resolveDispositionInDocs(documents: Record<string, DocModel>, agreements: Agreement[], d: Deviation, status: DispositionStatus): Record<string, DocModel> {
  if (status === 'open') return documents
  const a = agreements.find((x) => x.id === d.agreement_id)
  const candidateIds = [a?.current_version_id, 'V-2201-3'].filter((x): x is string => !!x)
  const docId = candidateIds.find((id) => documents[id]?.clauses.some((c) => c.deviationId === d.id || c.id === d.source_clause_id))
  if (!docId) return documents
  const doc = documents[docId]
  const clauses = doc.clauses.map((c) => {
    if (!(c.deviationId === d.id || c.id === d.source_clause_id)) return c
    const base = c.orig ?? c.runs
    let runs
    if (status === 'accepted') {
      // accept their changes: insertions become normal text, deletions disappear → clean
      runs = base.filter((r) => !(r.party === 'counterparty' && r.type === 'del'))
        .map((r) => (r.party === 'counterparty' && r.type === 'ins' ? { text: r.text, type: 'normal' as const } : r))
    } else if (status === 'countered') {
      // counter (Eric): the AI-suggested counter language is inserted INTO the document as a
      // visible tracked change — the current text struck through, our language underlined.
      // The counter text is REAL negotiated language (clean copy) — never guidance prose.
      const counterText = counterTextFor(documents, d, c.id)
      const oldText = base.filter((r) => r.type !== 'del').map((r) => r.text).join('').trim()
      runs = counterText
        ? [
            { text: oldText + ' ', type: 'del' as const, party: 'cp' as const, cid: `pc-del-${d.id}` },
            { text: counterText, type: 'ins' as const, party: 'cp' as const, cid: `pc-ins-${d.id}` },
          ]
        : base.filter((r) => !(r.party === 'counterparty' && r.type === 'ins'))
            .map((r) => (r.party === 'counterparty' && r.type === 'del' ? { text: r.text, type: 'normal' as const } : r))
    } else {
      // reject their changes: insertions disappear, deletions are restored → clean original
      runs = base.filter((r) => !(r.party === 'counterparty' && r.type === 'ins'))
        .map((r) => (r.party === 'counterparty' && r.type === 'del' ? { text: r.text, type: 'normal' as const } : r))
    }
    return { ...c, orig: base, runs }
  })
  return { ...documents, [docId]: { ...doc, clauses } }
}

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
  docLocks: { 'AGR-2201': { agreement_id: 'AGR-2201', mode: 'live', locked_by: null, locked_at: null, claimed_clauses: {} } },
  publishedArtifacts: [],
  teamFolders: TEAM_FOLDERS,
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
  pendingCounter: null,
  showDocComments: true,
  analysisFlags: [],
  canvas: { view: 'dashboard', open: false },
  chat: [GREETING],
  agentThinking: false,
  toast: null,
  cmdkOpen: false,
  slaChecked: false,
  entered: false,
  enterApp: () => set({ entered: true }),
  entryChannel: 'slack',
  setEntryChannel: (c) => set({ entryChannel: c }),
  intakeExtraTypes: [],
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
      // Deal navigation §1 — land on the Deal Overview first, not on a document.
      set({ canvas: { view: 'ticket', open: true, solo: false, ticketId, agreementId: t.agreement_ids[0], agreementTab: 'overview' } })
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
    set((s) => {
      const d = s.deviations.find((x) => x.id === deviationId)
      return {
        deviations: s.deviations.map((x) =>
          x.id === deviationId ? { ...x, disposition_status: status, disposition_by: uid, disposition_date: now() } : x),
        // Real-time cleaning: the disposition resolves the tracked changes in the working doc immediately.
        documents: d ? resolveDispositionInDocs(s.documents, s.agreements, d, status) : s.documents,
      }
    })
    const d = get().deviations.find((x) => x.id === deviationId)
    get().audit_push({ event_type: 'disposition_decided', agreement_id: d?.agreement_id, summary: `${d?.provision_name} (${d?.section_reference}) → ${status}.` })
  },

  applyAllRecommended: (agreementId) => {
    const uid = get().currentUserId
    set((s) => {
      let documents = s.documents
      const deviations = s.deviations.map((d) => {
        if (d.agreement_id !== agreementId || d.disposition_status !== 'open') return d
        const status: DispositionStatus =
          d.risk_category === 'accept' ? 'accepted'
          : d.risk_category === 'red_line' ? 'rejected'
          : 'countered'
        documents = resolveDispositionInDocs(documents, s.agreements, d, status) // real-time cleaning
        return { ...d, disposition_status: status, disposition_by: uid, disposition_date: now() }
      })
      return { deviations, documents }
    })
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
    // R81 — the NDA plus any parallel agreements requested (e.g. NDA + MSA for the same counterparty).
    const types: AgreementType[] = ['MNDA', ...get().intakeExtraTypes]
    const multi = types.length > 1
    const t = get().createTicketFromAgent({
      title: multi ? `${cp} — ${types.join(' + ')}` : `${cp} — Mutual NDA`, counterparty_name: cp,
      type: multi ? 'multi_agreement' : 'single_agreement',
      agreement_type: 'MNDA', assigned_attorney_id: p.attorneyId, priority: 'normal',
      description: `${types.join(' + ')} generated from ${p.template.value} for ${cp} (${p.profile.hq_city}, ${p.profile.hq_country}). `
        + `Requestor: ${get().users.find((u) => u.id === p.requestorId)?.name ?? ''}${p.onBehalfOf ? ' (filed on their behalf)' : ''}. `
        + `Jurisdiction ${p.jurisdiction.value}; governing law ${p.governingLaw.value}. Purpose: ${p.purpose.value}. `
        + `Posture: ${p.clausePosture.value}. Signer: ${p.signerName} <${p.signerEmail}>. SF: ${p.sfOpportunity.value}.`,
    })
    // Materialize a real Agreement + V1 per requested type so they can be reviewed in parallel.
    const baseNum = 9000 + get().agreements.length
    const newAgreements: Agreement[] = []
    const newVersions: Version[] = []
    types.forEach((type, i) => {
      const aid = `AGR-${baseNum + i}`
      const vid = `${aid}-1`
      newAgreements.push({ id: aid, ticket_id: t.id, title: `${cp} ${type}`, agreement_type: type, status: 'draft', current_version_id: vid, playbook_id: type === 'MNDA' || type === 'NDA' ? 'pb_nda' : type === 'MSA' ? 'pb_msa' : null, paper_origin: 'cp_paper', ball_in_court: 'cp_legal', red_line_count: 0, created_date: now(), last_activity_date: '2026-06-27', turn_count: 0 })
      newVersions.push({ id: vid, agreement_id: aid, version_number: 1, label: 'V1', source: 'cp_draft', document_ref: `${aid}_v1.docx`, created_by: 'ai_engine', created_date: now(), parent_version_id: null, change_summary: `${type} V1 generated from the ChargePoint template.` })
    })
    set((s) => ({
      agreements: [...newAgreements, ...s.agreements],
      versions: [...s.versions, ...newVersions],
      tickets: s.tickets.map((x) => (x.id === t.id ? { ...x, agreement_ids: newAgreements.map((a) => a.id) } : x)),
      intakeExtraTypes: [],
    }))
    newAgreements.forEach((a) => get().audit_push({ event_type: 'agreement_added', ticket_id: t.id, agreement_id: a.id, actor_id: 'ai_engine', summary: `${a.agreement_type} V1 generated from the template.` }))
    get().setToast(multi ? `Generated ${types.length} agreements (${types.join(' + ')}) for ${cp} — reviewing in parallel.` : `Generated ${cp} NDA (V1) and routed to ${get().users.find((u) => u.id === p.attorneyId)?.name.split(' ')[0]}.`)
    return { ...t, agreement_ids: newAgreements.map((a) => a.id) }
  },
  // ---- Counter flow: insert AI counter language into the doc as a visible tracked change.
  proposeCounter: (deviationId) => {
    const s0 = get()
    const d = s0.deviations.find((x) => x.id === deviationId)
    if (!d) return
    const a = s0.agreements.find((x) => x.id === d.agreement_id)
    const candidateIds = [a?.current_version_id, 'V-2201-3'].filter((x): x is string => !!x)
    const docId = candidateIds.find((id) => s0.documents[id]?.clauses.some((c) => c.deviationId === d.id || c.id === d.source_clause_id))
    if (!docId) return
    const doc = s0.documents[docId]
    const clause = doc.clauses.find((c) => c.deviationId === d.id || c.id === d.source_clause_id)!
    const base = clause.orig ?? clause.runs
    const counterText = counterTextFor(s0.documents, d, clause.id) || d.template_position
    const oldText = base.filter((r) => r.type !== 'del').map((r) => r.text).join('').trim()
    const runs = [
      { text: oldText + ' ', type: 'del' as const, party: 'cp' as const, cid: `pc-del-${d.id}` },
      { text: counterText, type: 'ins' as const, party: 'cp' as const, cid: `pc-ins-${d.id}` },
    ]
    set((s) => ({
      documents: { ...s.documents, [docId]: { ...doc, clauses: doc.clauses.map((c) => (c.id === clause.id ? { ...c, orig: base, runs } : c)) } },
      pendingCounter: { deviationId, clauseId: clause.id, versionId: docId },
    }))
  },
  keepCounter: (deviationId, editedText) => {
    const pc = get().pendingCounter
    if (!pc || pc.deviationId !== deviationId) return
    const doc = get().documents[pc.versionId]
    if (doc && editedText?.trim()) {
      set((s) => ({ documents: { ...s.documents, [pc.versionId]: { ...doc, clauses: doc.clauses.map((c) => (c.id === pc.clauseId ? { ...c, runs: c.runs.map((r) => (r.cid === `pc-ins-${deviationId}` ? { ...r, text: editedText.trim() } : r)) } : c)) } } }))
    }
    // set the disposition WITHOUT re-resolving the doc (the tracked counter stays visible)
    set((s) => ({ deviations: s.deviations.map((d) => (d.id === deviationId ? { ...d, disposition_status: 'countered', disposition_by: s.currentUserId, disposition_date: now() } : d)), pendingCounter: null }))
    const d = get().deviations.find((x) => x.id === deviationId)
    get().audit_push({ event_type: 'disposition_decided', agreement_id: d?.agreement_id, summary: `${d?.provision_name} — countered (tracked change kept in document).` })
  },
  discardCounter: (deviationId) => {
    const pc = get().pendingCounter
    if (!pc || pc.deviationId !== deviationId) return
    const doc = get().documents[pc.versionId]
    if (doc) {
      set((s) => ({ documents: { ...s.documents, [pc.versionId]: { ...doc, clauses: doc.clauses.map((c) => (c.id === pc.clauseId && c.orig ? { ...c, runs: c.orig } : c)) } } }))
    }
    set({ pendingCounter: null })
  },
  setShowDocComments: (v) => set({ showDocComments: v }),
  flagAnalysis: (deviationId, reason) => {
    set((s) => ({ analysisFlags: [...s.analysisFlags, { id: nextId('FLAG'), deviation_id: deviationId, reason, status: 'open' as const, date: now() }] }))
    get().audit_push({ event_type: 'playbook_updated', summary: `AI analysis flagged for playbook audit (${reason}).` })
    get().setToast('Flagged for playbook audit.')
  },

  // Playbooks §2 step 3 — per-provision Accept | Reject | Defer on a generated draft.
  decideDraftProvision: (draftId, provisionId, decision) => {
    set((s) => ({
      playbookDrafts: s.playbookDrafts.map((d) => {
        if (d.id !== draftId) return d
        if (decision === 'reject') return { ...d, provisions: d.provisions.filter((p) => p.id !== provisionId) }
        return { ...d, provisions: d.provisions.map((p) => p.id === provisionId
          ? (decision === 'defer'
              ? { ...p, tier: 'deferred' as const, deferred_to: p.deferred_to ?? 'Deal team decision', review_state: 'deferred' as const }
              : decision === 'fallback'
                // approved, but as a FALLBACK position (not baseline): the drafted text
                // becomes the first fallback tier
                ? { ...p, tier: 'fallback' as const, fallback_tiers: p.fallback_tiers.length ? p.fallback_tiers : [p.standard_position], review_state: 'accepted' as const }
                : { ...p, review_state: 'accepted' as const })
          : p) }
      }),
    }))
  },
  // Content is editable at CREATE time too — same click-to-edit, on the draft.
  editDraftProvisionText: (draftId, provisionId, field, idx, text) => {
    const patch = (p: Provision): Provision => {
      if (p.id === provisionId) {
        if (field === 'standard') return { ...p, standard_position: text }
        if (field === 'red_line') return { ...p, red_line: text }
        return { ...p, fallback_tiers: p.fallback_tiers.map((f, i) => (i === idx ? text : f)) }
      }
      return p.children ? { ...p, children: p.children.map(patch) } : p
    }
    set((s) => ({ playbookDrafts: s.playbookDrafts.map((d) => (d.id === draftId ? { ...d, provisions: d.provisions.map(patch) } : d)) }))
    get().setToast('Draft provision updated.')
  },

  // Playbooks §5 — click-to-edit provision text, coexisting with chat editing ("both").
  editProvisionText: (playbookId, provisionId, field, idx, text) => {
    const patch = (p: Provision): Provision => {
      if (p.id === provisionId) {
        if (field === 'standard') return { ...p, standard_position: text }
        if (field === 'red_line') return { ...p, red_line: text }
        return { ...p, fallback_tiers: p.fallback_tiers.map((f, i) => (i === idx ? text : f)) }
      }
      return p.children ? { ...p, children: p.children.map(patch) } : p
    }
    set((s) => ({ playbooks: s.playbooks.map((pb) => (pb.id === playbookId ? { ...pb, provisions: pb.provisions.map(patch), version: pb.version, edited_date: '2026-07-04' } : pb)) }))
    get().audit_push({ event_type: 'playbook_updated', summary: `Provision text edited manually (${field}).` })
    get().setToast('Provision updated.')
  },
  // Playbooks §6 — feed additional documents to refine an existing playbook.
  addDocumentsToPlaybook: (playbookId) => {
    set((s) => ({ playbooks: s.playbooks.map((pb) => (pb.id === playbookId ? { ...pb, edited_date: '2026-07-04' } : pb)) }))
    get().audit_push({ event_type: 'playbook_updated', summary: '2 additional executed agreements analyzed — 2 provisions refined.' })
    get().setToast('Playbook updated: 2 provisions refined.')
  },

  // Intake §1/§2 — file a returned counterparty version onto an agreement (creates the next
  // major version; the working doc is cloned so review opens immediately).
  ingestVersion: (agreementId, fileName, asNewDocument) => {
    const s0 = get()
    if (asNewDocument || !agreementId) {
      get().setToast(`"${fileName}" staged as a new document — classify it from the deal overview.`)
      return
    }
    const a = s0.agreements.find((x) => x.id === agreementId)
    if (!a) return
    const nextNum = s0.versions.filter((v) => v.agreement_id === agreementId).length + 1
    const vid = `${agreementId}-v${nextNum}-${Date.now() % 10000}`
    const newVer: Version = { id: vid, agreement_id: agreementId, version_number: nextNum, label: `v${nextNum}`, source: 'counterparty_response', document_ref: fileName, created_by: 'ai_engine', created_date: '2026-07-04', parent_version_id: a.current_version_id, change_summary: `Counterparty return ingested from "${fileName}" (auto-detected).` }
    const baseDoc = s0.documents[a.current_version_id]
    set((s) => ({
      versions: [...s.versions, newVer],
      agreements: s.agreements.map((x) => (x.id === agreementId ? { ...x, current_version_id: vid, status: 'redline_received' as const, ball_in_court: 'cp_legal' as const } : x)),
      documents: baseDoc ? { ...s.documents, [vid]: { ...baseDoc, versionId: vid, subtitle: `${a.title} — v${nextNum} (Counterparty Response, 4 Jul 2026)` } } : s.documents,
    }))
    get().audit_push({ event_type: 'version_created', agreement_id: agreementId, summary: `Filed as ${a.agreement_type} v${nextNum} (Counterparty Response, 4 Jul 2026) from "${fileName}".` })
    get().setToast(`Filed as ${a.agreement_type === 'Other' ? 'Document' : a.agreement_type} v${nextNum} (Counterparty Response, 4 Jul 2026).`)
  },

  reassignVersion: (versionId, targetAgreementId, newNumber) => {
    set((s) => ({ versions: s.versions.map((v) => (v.id === versionId ? { ...v, agreement_id: targetAgreementId, version_number: newNumber ?? v.version_number, label: newNumber ? `v${newNumber}` : v.label } : v)) }))
    const a = get().agreements.find((x) => x.id === targetAgreementId)
    get().audit_push({ event_type: 'version_created', agreement_id: targetAgreementId, summary: `Version ${versionId} reassigned to ${a?.title ?? targetAgreementId}${newNumber ? ` as v${newNumber}` : ''} (manual correction).` })
    get().setToast(`Version reassigned to ${a?.title ?? targetAgreementId}.`)
  },

  advanceInquiry: (ticketId) => {
    set((s) => ({ tickets: s.tickets.map((t) => (t.id === ticketId ? { ...t, status: t.status === 'Open' ? 'In Progress' : 'Resolved' } : t)) }))
    const t = get().tickets.find((x) => x.id === ticketId)
    get().audit_push({ event_type: 'status_changed', ticket_id: ticketId, summary: `Support ticket → ${t?.status}.` })
  },

  // Dashboard §1 — Open Ticket modal. Tickets exist independently of agreements; support
  // tickets carry no document but still get a deal page + Deal Discussion + stage tracking.
  createTicketFull: ({ title, kind, counterparty, files, attorneyId }) => {
    const guessType = (f: string): AgreementType => /msa|master/i.test(f) ? 'MSA' : /dpa|data/i.test(f) ? 'DPA' : /sow|statement/i.test(f) ? 'SOW' : /nda|disclosure/i.test(f) ? 'MNDA' : 'Other'
    const t = get().createTicketFromAgent({
      title, counterparty_name: counterparty ?? '—',
      type: kind === 'support' ? 'inquiry' : files.length > 1 ? 'multi_agreement' : 'single_agreement',
      agreement_type: kind === 'support' ? undefined : guessType(files[0] ?? ''),
      assigned_attorney_id: attorneyId, priority: 'normal',
      description: kind === 'support' ? 'General legal support — no agreement attached.' : `Created from the dashboard with ${files.length} file(s).`,
    })
    if (kind === 'negotiation' && files.length > 0) {
      const baseNum = 9500 + get().agreements.length
      const newAgs: Agreement[] = []
      const newVers: Version[] = []
      files.forEach((f, i) => {
        const aid = `AGR-${baseNum + i}`
        const type = guessType(f)
        newAgs.push({ id: aid, ticket_id: t.id, title: f.replace(/\.(docx|pdf)$/i, '').replace(/[_-]+/g, ' '), agreement_type: type, status: 'draft', current_version_id: `${aid}-1`, playbook_id: type === 'MNDA' ? 'pb_nda' : type === 'MSA' ? 'pb_msa' : null, paper_origin: 'counterparty_paper', ball_in_court: 'cp_legal', red_line_count: 0, created_date: now(), last_activity_date: '2026-06-27', turn_count: 0 })
        newVers.push({ id: `${aid}-1`, agreement_id: aid, version_number: 1, label: 'v1', source: 'counterparty_draft', document_ref: f, created_by: get().currentUserId, created_date: now(), parent_version_id: null, change_summary: `Uploaded at ticket creation (${f}).` })
      })
      set((s) => ({
        agreements: [...newAgs, ...s.agreements],
        versions: [...s.versions, ...newVers],
        tickets: s.tickets.map((x) => (x.id === t.id ? { ...x, agreement_ids: newAgs.map((a) => a.id) } : x)),
      }))
    }
    get().setToast(`Ticket ${t.id} created${files.length ? ` with ${files.length} document(s)` : ''}.`)
    get().openTicket(t.id)
  },
  addIntakeAgreementType: (type) => set((s) => ({ intakeExtraTypes: s.intakeExtraTypes.includes(type) ? s.intakeExtraTypes.filter((x) => x !== type) : [...s.intakeExtraTypes, type] })),
  // R79 — a ticket that is a pure inquiry (no agreement), with an agent-drafted response.
  createInquiry: (question) => {
    const t = get().createTicketFromAgent({ title: `Inquiry — ${question.length > 56 ? question.slice(0, 56) + '…' : question}`, counterparty_name: '—', type: 'inquiry', priority: 'normal', description: question })
    const answer = precedentAnswer(question)
    set((s) => ({ messages: [...s.messages,
      { id: nextId('M'), thread_type: 'deal_level', ticket_id: t.id, agreement_id: null, author_id: get().currentUserId, body: question, created_date: now() },
      { id: nextId('M'), thread_type: 'deal_level', ticket_id: t.id, agreement_id: null, author_id: 'ai_engine', body: `${answer}\n\n_This is an inquiry (no agreement attached) — I've drafted a response above from the playbook + executed precedent. Edit it, or tag an attorney for sign-off._`, created_date: now() },
    ] }))
    get().audit_push({ event_type: 'ticket_created', ticket_id: t.id, actor_id: 'ai_engine', summary: `Inquiry logged (no agreement); agent drafted a response.` })
    get().openTicket(t.id)
    get().setToast('Inquiry logged — agent drafted a response for your review.')
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
  // R18 — every mutator hard-refuses when the doc is locked by another user (defense in depth).
  acceptChange: (versionId, cid) => {
    if (!get().canEditDoc(agreementIdForVersion(versionId)).allowed) { get().setToast('Document is locked by another user — read-only.'); return }
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
    if (!get().canEditDoc(agreementIdForVersion(versionId)).allowed) { get().setToast('Document is locked by another user — read-only.'); return }
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
    if (!get().canEditDoc(agreementIdForVersion(versionId), clauseId).allowed) { get().setToast('That clause is locked by another user right now.'); return }
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

  // ----- R18: document integrity — real lock / per-clause claim -----------------
  canEditDoc: (agreementId, clauseId) => {
    const lock = get().docLocks[agreementId]
    const uid = get().currentUserId
    if (!lock) return { allowed: true }
    if (lock.mode === 'locked') {
      if (lock.locked_by && lock.locked_by !== uid) return { allowed: false, holderId: lock.locked_by, reason: 'locked' }
      return { allowed: true, holderId: lock.locked_by ?? undefined }
    }
    // live mode: everyone may edit, but not a clause another user is actively editing
    if (clauseId) { const c = lock.claimed_clauses[clauseId]; if (c && c.user_id !== uid) return { allowed: false, holderId: c.user_id, reason: 'clause_claimed' } }
    return { allowed: true }
  },
  setCollabMode: (agreementId, mode) => {
    set((s) => {
      const prev = s.docLocks[agreementId] ?? { agreement_id: agreementId, mode: 'live', locked_by: null, locked_at: null, claimed_clauses: {} }
      // switching to 'locked' with no holder auto-checks-out to the current user
      const locked_by = mode === 'locked' ? (prev.locked_by ?? s.currentUserId) : null
      return { docLocks: { ...s.docLocks, [agreementId]: { ...prev, mode, locked_by, locked_at: locked_by ? now() : null, claimed_clauses: {} } } }
    })
    if (mode === 'locked') get().audit_push({ event_type: 'document_locked', agreement_id: agreementId, summary: 'Document checked out (single-editor lock) — others are read-only.' })
    else get().audit_push({ event_type: 'document_released', agreement_id: agreementId, summary: 'Live co-editing enabled — all contributors may view and comment.' })
  },
  checkoutDoc: (agreementId) => {
    const lock = get().docLocks[agreementId]
    if (lock?.locked_by && lock.locked_by !== get().currentUserId) { get().setToast(`Locked by ${userById(lock.locked_by)?.name ?? 'another user'} — can't check out.`); return false }
    set((s) => ({ docLocks: { ...s.docLocks, [agreementId]: { ...(s.docLocks[agreementId] ?? { agreement_id: agreementId, mode: 'locked', claimed_clauses: {} }), mode: 'locked', locked_by: s.currentUserId, locked_at: now() } as DocLock } }))
    get().audit_push({ event_type: 'document_locked', agreement_id: agreementId, summary: 'Document checked out.' })
    return true
  },
  releaseDoc: (agreementId) => {
    set((s) => ({ docLocks: { ...s.docLocks, [agreementId]: { ...(s.docLocks[agreementId]!), locked_by: null, locked_at: null } } }))
    get().audit_push({ event_type: 'document_released', agreement_id: agreementId, summary: 'Document released — available to others.' })
  },
  claimClause: (agreementId, clauseId) => {
    const chk = get().canEditDoc(agreementId, clauseId)
    if (!chk.allowed) { get().audit_push({ event_type: 'edit_blocked', agreement_id: agreementId, summary: `Edit blocked — ${clauseId} is being edited by ${userById(chk.holderId!)?.name ?? 'another user'}.` }); return false }
    set((s) => { const l = s.docLocks[agreementId]; if (!l) return {}; return { docLocks: { ...s.docLocks, [agreementId]: { ...l, claimed_clauses: { ...l.claimed_clauses, [clauseId]: { user_id: s.currentUserId, at: now() } } } } } })
    return true
  },
  releaseClause: (agreementId, clauseId) => set((s) => { const l = s.docLocks[agreementId]; if (!l) return {}; const cc = { ...l.claimed_clauses }; delete cc[clauseId]; return { docLocks: { ...s.docLocks, [agreementId]: { ...l, claimed_clauses: cc } } } }),

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
    if (!get().canEditDoc(agreementIdForVersion(versionId), clauseId).allowed) { get().setToast('That clause is locked by another user right now.'); return }
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

  startEnvelope: (agreementId, receiver, meta) => {
    const a = get().agreements.find((x) => x.id === agreementId)!
    const env: Envelope = {
      id: 'env_' + Math.abs([...agreementId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(16),
      agreement_id: agreementId, ticket_id: a.ticket_id, state: 'pending_cp', created_date: now(),
      envelope_group_id: meta?.envelope_group_id, mode: meta?.mode,
      signers: [
        { role: 'cp_signer', name: 'Eric Batill (ChargePoint)', email: 'eric.batill@chargepoint.com', state: 'sent' },
        { role: 'counterparty_signer', name: receiver?.name.trim() || `${a.title.split(' ')[0]} signatory`, email: receiver?.email.trim() || 'legal@counterparty.com', state: 'waiting' },
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
    // Stay on the send-back screen — the redline is announced there ("Ready — N changes · Review it →");
    // navigating away automatically was the confusing part of the old UX.
    set((s) => (s.canvas.sendBack ? { canvas: { ...s.canvas, sendBack: { ...s.canvas.sendBack, redline } } } : {}))
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
  decidePlaybookSuggestion: (id, decision) => {
    const uid = get().currentUserId
    const sug = get().playbookSuggestions.find((x) => x.id === id)
    const stateFor: Record<typeof decision, SuggestionState> = {
      accept: 'approved', redline: 'approved', reject: 'rejected', defer: 'deferred',
    }
    set((s) => ({ playbookSuggestions: s.playbookSuggestions.map((x) => (x.id === id ? { ...x, state: stateFor[decision], decided_by: uid, decided_date: now() } : x)) }))
    const approve = decision === 'accept' || decision === 'redline'
    // "Redline" overrides the suggestion's classification to a strict red line, regardless of how it was originally proposed.
    const kind: SuggestionKind = decision === 'redline' ? 'red_line' : sug?.kind ?? 'default'
    if (approve && sug) {
      set((s) => ({ playbooks: s.playbooks.map((pb) => {
        if (pb.id !== sug.playbook_id) return pb
        let changed = false
        const applyTo = (list: Provision[]): Provision[] => list.map((p) => {
          if (sug.target_provision_id && p.id === sug.target_provision_id) {
            changed = true
            if (kind === 'fallback') return { ...p, fallback_tiers: [...p.fallback_tiers, sug.proposed_text] }
            if (kind === 'red_line') return { ...p, red_line: sug.proposed_text }
            return { ...p, standard_position: sug.proposed_text }
          }
          return p.children ? { ...p, children: applyTo(p.children) } : p
        })
        let provisions = applyTo(pb.provisions)
        // No existing target (a runtime suggestion) → add it as a NEW named provision.
        if (!changed) {
          provisions = [...provisions, {
            id: 'pv_' + sug.id.toLowerCase(), provision_name: sug.provision_name,
            standard_position: kind === 'default' ? sug.proposed_text : `Per the added ${kind.replace('_', ' ')}.`,
            fallback_tiers: kind === 'fallback' ? [sug.proposed_text] : [],
            red_line: kind === 'red_line' ? sug.proposed_text : 'Deviations flagged for attorney review.',
            rationale: sug.rationale || 'Added from an attorney suggestion.',
            tier: kind === 'red_line' ? 'red_line' : kind === 'fallback' ? 'fallback' : 'baseline',
          }]
        }
        return { ...pb, provisions, version: pb.version + 1 }
      }) }))
      get().audit_push({ event_type: 'playbook_updated', summary: `Applied suggestion "${sug.provision_name}" to the playbook${decision === 'redline' ? ' as a red line' : ''}.` })
    }
    const labels: Record<typeof decision, string> = { accept: 'approved & applied', redline: 'approved as a red line & applied', reject: 'rejected', defer: 'deferred' }
    get().audit_push({ event_type: 'playbook_suggestion_decided', summary: `Suggestion ${labels[decision]}.` })
    get().setToast(decision === 'defer' ? 'Deferred — parked for later.' : decision === 'reject' ? 'Suggestion rejected.' : 'Approved — added to the playbook.')
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

  // R52/R57/R58/R60 — perform a REAL edit/restructure on a PUBLISHED playbook from chat.
  restructurePlaybook: (playbookId, instruction) => {
    const pb = get().playbooks.find((p) => p.id === playbookId)
    if (!pb) return 'No playbook is open to restructure.'
    const role = get().users.find((u) => u.id === get().currentUserId)!.role
    const canPresentation = can(role, 'playbook_presentation')
    const result = applyPlaybookInstruction(pb, instruction, canPresentation)
    if (!result.ok || !result.playbook) return result.message
    const bumped = { ...result.playbook, version: pb.version + 1, edited_date: '2026-07-04' }
    set((s) => ({ playbooks: s.playbooks.map((p) => (p.id === playbookId ? bumped : p)) }))
    get().audit_push({ event_type: 'playbook_updated', summary: `${pb.name}: ${result.message.replace(/\*\*/g, '')} (v${bumped.version}).` })
    return result.message
  },

  // R85 — publish a playbook/template into a real, access-scoped team folder/category.
  // Folders are stateful and user-creatable (not a fixed preset).
  createTeamFolder: (path, category, accessRoles) => {
    const clean = path.trim()
    if (!clean) return null
    // On a duplicate (case-insensitive), return the EXISTING canonical path so the caller selects it
    // instead of silently falling back to the first folder (re-audit defect fix).
    const existing = get().teamFolders.find((f) => f.path.toLowerCase() === clean.toLowerCase())
    if (existing) { get().setToast('That folder already exists — selected it.'); return existing.path }
    set((s) => ({ teamFolders: [...s.teamFolders, { path: clean, category: category.trim() || 'General', access_roles: accessRoles.length ? accessRoles : ['attorney', 'playbook_owner', 'administrator'] }] }))
    get().audit_push({ event_type: 'playbook_updated', summary: `Team folder "${clean}" created (${category || 'General'}).` })
    get().setToast(`Folder "${clean}" created.`)
    return clean
  },
  publishArtifact: (kind, sourceId, name, purpose, folderPath) => {
    const folders = get().teamFolders
    const folder = folders.find((f) => f.path === folderPath) ?? folders[0]
    const art: PublishedArtifact = { id: nextId('PUB'), kind, source_id: sourceId, name, purpose, folder_path: folder.path, category: folder.category, access_roles: folder.access_roles, published_by: get().currentUserId, date: now() }
    set((s) => ({
      publishedArtifacts: [art, ...s.publishedArtifacts],
      notifications: [{ id: nextId('N'), event: 'Published to library', body: `${name} published as "${purpose}" to ${folder.path} — now accessible to ${folder.access_roles.length} roles.`, channels: ['in_app'], created_date: now(), read: false, severity: 'info' }, ...s.notifications],
    }))
    get().audit_push({ event_type: 'playbook_updated', summary: `Published "${name}" (${purpose}) to ${folder.path} [${folder.category}].` })
    get().setToast(`Published "${name}" → ${folder.path}.`)
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
    // R105 — real comparative analysis across the SELECTED negotiated agreements (deduped).
    const ids = [...new Set(selected.flatMap((sc) => sc.agreementIds ?? []))]
    const analysis = comparativeAnalysis(ids)
    // R107 — each concept section's body is COMPOSED from the selected precedents' actual clause text.
    const conceptSections = analysis.map((row, i) => ({ id: `cs${i}`, heading: `${i + 1}. ${row.label}`, summary: `Seen in ${row.seenIn.length}/${ids.length} sources; ${Math.round(row.divergence * 100)}% divergence across precedents.`, cpConcept: false, body: composeBodyFromPrecedents(row) }))
    const cpSections = buildSectionsFor(proj.agreement_type).filter((sec) => sec.cpConcept)
    // Sections are DERIVED from the analysis (fall back to the type template only when no sources are linked).
    const rawSections = (conceptSections.length ? [...conceptSections, ...cpSections] : buildSectionsFor(proj.agreement_type))
      // renumber sequentially so appended CP-concept sections don't collide with concept numbering
      .map((sec, i) => ({ ...sec, heading: `${i + 1}. ${sec.heading.replace(/^\d+\.\s*/, '')}` }))
    const sections = generateSectionBodies(rawSections) // R107 — real clause body text, not just headings
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
    // R107 — actually EDIT the draft template from the instruction (add / remove / rewrite a section), not just echo.
    const proj = get().projects.find((p) => p.id === projectId)
    const tplId = proj?.draftTemplateId
    const t = instruction.toLowerCase().trim()
    let note = ''
    if (tplId) {
      set((s) => ({ templates: s.templates.map((tpl) => {
        if (tpl.id !== tplId) return tpl
        let sections = tpl.sections
        if (/\b(add|include)\b/.test(t)) {
          const name = (t.match(/\b(?:add|include)\b (?:a |an |the )?(?:section (?:on |for )?)?(.+?)( section| clause)?$/)?.[1] ?? 'New Section').replace(/\b\w/g, (c) => c.toUpperCase())
          const sec = { id: 'sx' + sections.length, heading: `${sections.length + 1}. ${name}`, summary: `${name} terms.`, body: '' }
          sections = [...sections, { ...sec, body: bodyForSection(sec) }]
          note = `Added a "${name}" section (with drafted clause text).`
        } else if (/\b(remove|delete|drop|strike)\b/.test(t)) {
          const target = t.replace(/.*\b(remove|delete|drop|strike)\b (?:the )?/, '').replace(/ ?section.*/, '').trim()
          const before = sections.length
          sections = sections.filter((sec) => !(target && sec.heading.toLowerCase().includes(target)))
          note = before !== sections.length ? `Removed the "${target}" section.` : `No section matched "${target}".`
        } else {
          // R107 — real rewrite transforms on the best-matching section's actual body text.
          const target = sections.find((sec) => t.split(' ').some((w) => w.length > 3 && sec.heading.toLowerCase().includes(w)))
          if (target) {
            const body = target.body ?? bodyForSection(target)
            let next: string
            if (/\b(tighten|shorten|simplif|strict)\b/.test(t)) {
              next = `${body.split(/(?<=\.)\s/)[0]} No exceptions apply except as expressly stated in this Section.`
              note = `Tightened "${target.heading}" — trimmed to the operative sentence with a strict no-exceptions rider.`
            } else if (/\b(expand|broaden|more detail|elaborate)\b/.test(t)) {
              next = `${body} The Parties shall document any agreed variations in a written amendment, and this Section shall be interpreted to give the fullest effect to its stated purpose.`
              note = `Expanded "${target.heading}" with an amendments/interpretation rider.`
            } else if (/\b(mutual|both parties|reciprocal)\b/.test(t)) {
              next = `${body} For the avoidance of doubt, the obligations in this Section apply mutually and reciprocally to both Parties.`
              note = `Made "${target.heading}" expressly mutual.`
            } else {
              // Integrate the instruction as drafted clause language (a real rider, not a bracket tag).
              const rider = instruction.trim().replace(/[.?!]?$/, '.')
              next = `${body} Notwithstanding the foregoing, ${rider.charAt(0).toLowerCase()}${rider.slice(1)}`
              note = `Drafted your instruction into "${target.heading}" as a Notwithstanding rider.`
            }
            sections = sections.map((sec) => (sec.id === target.id ? { ...sec, body: next } : sec))
          }
          else note = 'Tell me which section to change (e.g. "tighten the Governing Law section" or "add an Insurance section").'
        }
        return { ...tpl, sections }
      }) }))
    }
    const uIt: TemplateIteration = { id: nextId('it'), role: 'user', text: instruction, ts: now() }
    const aIt: TemplateIteration = { id: nextId('it'), role: 'agent', text: note || `Applied: ${instruction}`, ts: now(), changeNote: note.slice(0, 48) }
    set((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, iterations: [...p.iterations, uIt, aIt] } : p)) }))
  },
  saveTemplate: (projectId) => {
    const proj = get().projects.find((p) => p.id === projectId); if (!proj?.draftTemplateId) return
    set((s) => ({ templates: s.templates.map((t) => (t.id === proj.draftTemplateId ? { ...t, status: 'published' } : t)), projects: s.projects.map((p) => (p.id === projectId ? { ...p, status: 'template_ready' } : p)) }))
    get().audit_push({ event_type: 'playbook_updated', summary: `Template "${proj.name}" saved to the library.` })
    get().setToast('Template saved to the library.')
  },
  uploadTemplate: (fileName) => {
    const tplId = nextId('TPL')
    const name = fileName.replace(/\.(docx|pdf)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Uploaded template'
    const type: AgreementType = /msa|master/i.test(fileName) ? 'MSA' : /dpa/i.test(fileName) ? 'DPA' : 'MNDA'
    const tpl: AgreementTemplate = {
      id: tplId, name, agreement_type: type, origin: 'uploaded', status: 'published', project_id: null,
      version: 1, owner_id: get().currentUserId, created_date: now(),
      sections: generateSectionBodies(buildSectionsFor(type)),
      source_summary: `Uploaded form agreement (${fileName}).`, playbook_id: null,
    }
    set((s) => ({ templates: [tpl, ...s.templates], canvas: { ...s.canvas, view: 'projects', open: true, templateId: tplId, projectId: undefined } }))
    get().audit_push({ event_type: 'playbook_updated', summary: `Template "${name}" uploaded to the library.` })
    get().setToast(`Template "${name}" added to the library.`)
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
