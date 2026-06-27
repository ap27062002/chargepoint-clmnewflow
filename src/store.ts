import { create } from 'zustand'
import type {
  Ticket, Agreement, Version, Deviation, Message, Playbook,
  AuditEvent, AppNotification, ChatMessage, CanvasState, ViewKey,
  DispositionStatus, MessageTag, ThreadType, AuditEventType,
  ApprovalRequest, ApprovalType, Envelope, AgreementType,
  AgreementStatus, BallInCourt, ContractStatus,
} from '@/types'
import {
  users, tickets as seedTickets, agreements as seedAgreements,
  versions as seedVersions, deviations as seedDeviations, messages as seedMessages,
  playbooks as seedPlaybooks, auditSeed, notificationSeed, CURRENT_USER_ID,
} from '@/data/seed'
import { GREETING, greetingFor } from '@/agent/greeting'
import { seedDocuments, type DocModel } from '@/data/documents'
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
const ballForStatus = (s: AgreementStatus): BallInCourt => (s === 'sent_to_counterparty' ? 'counterparty' : 'cp_legal')
const ticketStatusForStatus = (s: AgreementStatus): ContractStatus => ({
  draft: 'Draft', internal_review: 'Internal Review', sent_to_counterparty: 'Sent to Counterparty',
  redline_received: 'Red Line Analysis', negotiation: 'Red Line Analysis',
  pending_execution: 'Pending Execution', executed: 'Executed',
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
  routingStrategy: RoutingStrategy
  canvas: CanvasState
  chat: ChatMessage[]
  agentThinking: boolean
  toast: string | null
  cmdkOpen: boolean
  slaChecked: boolean
  setCmdkOpen: (v: boolean) => void

  // navigation
  navigate: (c: Partial<CanvasState>) => void
  openCanvas: (c: Partial<CanvasState>) => void
  closeCanvas: () => void
  openTicket: (ticketId: string) => void
  openAgreement: (agreementId: string, tab?: 'deal' | 'review') => void
  setView: (view: ViewKey) => void
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
  runSlaCheck: () => void

  // chat
  pushChat: (m: ChatMessage) => void
  setAgentThinking: (v: boolean) => void
}

export const useStore = create<CLMState>((set, get) => ({
  users,
  currentUserId: CURRENT_USER_ID,
  tickets: seedTickets,
  agreements: seedAgreements,
  versions: seedVersions,
  deviations: seedDeviations,
  messages: seedMessages,
  playbooks: seedPlaybooks,
  audit: buildAudit(),
  notifications: notificationSeed,
  documents: seedDocuments(),
  approvals: [],
  envelopes: [],
  routingStrategy: 'hybrid',
  canvas: { view: 'dashboard', open: false },
  chat: [GREETING],
  agentThinking: false,
  toast: null,
  cmdkOpen: false,
  slaChecked: false,
  setCmdkOpen: (v) => set({ cmdkOpen: v }),

  navigate: (c) => set((s) => ({ canvas: { ...s.canvas, ...c } })),
  openCanvas: (c) => set((s) => ({ canvas: { ...s.canvas, open: true, ...c } })),
  closeCanvas: () => set((s) => ({ canvas: { ...s.canvas, open: false } })),
  openTicket: (ticketId) => {
    const t = get().tickets.find((x) => x.id === ticketId)
    if (!t) return
    if (t.type === 'inquiry' || t.agreement_ids.length === 0) {
      set({ canvas: { view: 'ticket', open: true, ticketId, agreementTab: 'deal' } })
    } else {
      set({ canvas: { view: 'ticket', open: true, ticketId, agreementId: t.agreement_ids[0], agreementTab: 'deal' } })
    }
  },
  openAgreement: (agreementId, tab = 'review') => {
    const a = get().agreements.find((x) => x.id === agreementId)
    if (!a) return
    set({ canvas: { view: 'ticket', open: true, ticketId: a.ticket_id, agreementId, agreementTab: tab, reviewMode: 'issues' } })
  },
  setView: (view) => set((s) => ({ canvas: { ...s.canvas, view, open: true } })),
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
      get().openCanvas({ view: 'execution', executionAgreementId: agreementId })
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
      set((s) => ({
        agreements: s.agreements.map((x) => (x.id === env.agreement_id ? { ...x, status: 'executed', executed_date: now() } : x)),
        tickets: s.tickets.map((t) => (t.id === env.ticket_id ? { ...t, status: 'Executed', closed_date: now() } : t)),
      }))
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

  pushChat: (m) => set((s) => ({ chat: [...s.chat, m] })),
  setAgentThinking: (v) => set({ agentThinking: v }),
}))

// selectors / helpers
export const useCurrentUser = () => useStore((s) => s.users.find((u) => u.id === s.currentUserId)!)
export const ticketAgreements = (s: CLMState, ticketId: string) =>
  s.agreements.filter((a) => a.ticket_id === ticketId)
export const agreementDeviations = (s: CLMState, agreementId: string) =>
  s.deviations.filter((d) => d.agreement_id === agreementId)
export const agreementVersions = (s: CLMState, agreementId: string) =>
  s.versions.filter((v) => v.agreement_id === agreementId).sort((a, b) => a.version_number - b.version_number)
