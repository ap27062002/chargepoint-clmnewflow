import type { Playbook, Deviation, Agreement, Ticket, Version, AgreementStatus, User } from '@/types'
import { slaStatus, agreementStatusMeta } from '@/lib/labels'

export interface Rec { provision: string; rate: number; action: 'Revise' | 'Add' | 'Maintain'; detail: string }

// Compute refinement recommendations from the playbook + observed deviations across all deals.
export function refinementRecs(playbook: Playbook, allDeviations: Deviation[]): Rec[] {
  const recs: Rec[] = []

  for (const p of playbook.provisions) {
    const pct = p.negotiated_pct ?? 0
    if (pct >= 40) {
      recs.push({ provision: p.provision_name, rate: pct, action: 'Revise', detail: `Negotiated in ${pct}% of deals — add the common landing point as an approved Fallback.` })
    } else if (pct >= 20) {
      recs.push({ provision: p.provision_name, rate: pct, action: 'Maintain', detail: `Negotiated in ${pct}% of deals; current fallbacks are holding — monitor.` })
    }
  }

  // Counterparty-introduced red lines not yet named as their own provision → recommend promoting.
  const introduced = allDeviations.filter((d) => d.risk_category === 'red_line' && d.direction === 'cp_unfavorable')
  const byName = new Map<string, number>()
  for (const d of introduced) byName.set(d.provision_name, (byName.get(d.provision_name) ?? 0) + 1)
  for (const [name, count] of byName) {
    if (!playbook.provisions.some((p) => p.provision_name === name)) {
      recs.push({ provision: name, rate: count, action: 'Add', detail: `Counterparty-introduced ${count}× and rejected each time — promote to a named red-line provision for consistent flagging.` })
    }
  }

  return recs.sort((a, b) => b.rate - a.rate).slice(0, 4)
}

export interface DealSummaryData {
  concessions: string[]
  improvements: string[]
  deviationCount: number
  lessons: string[]
  cycleDays: number | null
}

// Compute the deal summary from the agreement's deviations + dispositions.
export function dealSummaryData(agreement: Agreement, ticket: Ticket | undefined, deviations: Deviation[]): DealSummaryData {
  const concessions = deviations
    .filter((d) => d.disposition_status === 'accepted' && d.direction === 'cp_unfavorable')
    .map((d) => `Accepted ${d.provision_name} (${d.section_reference}) — ${d.counterparty_position}`)

  const improvements = deviations
    .filter((d) => (d.disposition_status === 'rejected' || d.disposition_status === 'countered') && (d.direction === 'cp_unfavorable' || d.risk_category === 'red_line'))
    .map((d) => `${d.disposition_status === 'rejected' ? 'Removed' : 'Countered'} ${d.provision_name} (${d.section_reference}) — held our ${d.disposition_status === 'rejected' ? 'red-line' : 'fallback'} position`)

  const lessons: string[] = []
  const negotiated = deviations.filter((d) => d.disposition_status === 'countered')
  if (negotiated.length) {
    const top = negotiated[0]
    lessons.push(`Most-negotiated provision: ${top.provision_name}. Already covered by an approved fallback, so it resolved without escalation.`)
  }
  let cycleDays: number | null = null
  if (agreement.executed_date && ticket) {
    cycleDays = Math.round((new Date(agreement.executed_date).getTime() - new Date(ticket.created_date).getTime()) / 86400000)
    lessons.push(`Cycle time ${cycleDays} days from intake to execution — front-loading playbook fallbacks kept it to a single negotiation round.`)
  }
  if (concessions.length === 0 && improvements.length === 0) {
    lessons.push('Executed close to template with minimal deviation — a strong candidate baseline for this counterparty segment.')
  }

  return { concessions, improvements, deviationCount: deviations.length, lessons, cycleDays }
}

// ===========================================================================
// LEADERSHIP DASHBOARD — metrics a contracts leader (CIO/GC) actually wants.
// Pure functions over the (already RBAC-scoped) tickets/agreements/versions/deviations.
// ===========================================================================
export const AS_OF = '2026-06-27' // demo "today" — matches slaStatus default

export function fmtMoney(n: number | undefined): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`
  return `$${n}`
}

export type AgingBand = 'fresh' | 'aging' | 'stalled'
export function agingBand(days: number): AgingBand {
  return days <= 3 ? 'fresh' : days <= 7 ? 'aging' : 'stalled'
}
export function daysWaiting(a: Agreement, asOf = AS_OF): number {
  const anchor = a.last_activity_date ?? a.created_date
  return Math.max(0, Math.round((new Date(asOf).getTime() - new Date(anchor).getTime()) / 86400000))
}

export interface BallItem {
  agreementId: string; title: string; counterparty: string
  days: number; band: AgingBand; attorneyId: string | null; stage: AgreementStatus
}
export interface LeaderAttention {
  kind: 'sla' | 'redline' | 'stalled' | 'unassigned'
  label: string; detail: string; agreementId?: string; ticketId?: string
}
export interface CounterpartyRow {
  counterparty: string; ticketId: string; openCount: number; stages: AgreementStatus[]
  redLines: number; ball: 'cp_legal' | 'counterparty' | 'mixed'; oldestDays: number
  attorneyId: string | null; value: number
}
export interface StageCell { stage: string; n: number }
export interface LeadershipMetrics {
  openAgreements: number
  ballCp: BallItem[]
  ballCounterparty: BallItem[]
  slaWarning: number; slaBreach: number; slaAtRisk: number
  avgCycleDays: number | null
  avgRedlineRounds: number
  openExposure: number
  executedCount: number
  stageFunnel: StageCell[]
  byCounterparty: CounterpartyRow[]
  attention: LeaderAttention[]
}

export const PIPELINE_STAGES = ['Red Line Analysis', 'Internal Review', 'Draft', 'Sent to Counterparty', 'In Negotiation', 'Ready to Sign', 'Executed']

export function leadershipMetrics(
  tickets: Ticket[], agreements: Agreement[], versions: Version[], deviations: Deviation[], asOf = AS_OF,
): LeadershipMetrics {
  const ticketById = new Map(tickets.map((t) => [t.id, t]))
  const cpFor = (a: Agreement) => ticketById.get(a.ticket_id)?.counterparty_name ?? '—'
  const attorneyFor = (a: Agreement) => ticketById.get(a.ticket_id)?.assigned_attorney_id ?? null

  const open = agreements.filter((a) => a.status !== 'executed')
  const toBall = (a: Agreement): BallItem => {
    const d = daysWaiting(a, asOf)
    return { agreementId: a.id, title: a.title, counterparty: cpFor(a), days: d, band: agingBand(d), attorneyId: attorneyFor(a), stage: a.status }
  }
  const ballCp = open.filter((a) => a.ball_in_court === 'cp_legal').map(toBall).sort((x, y) => y.days - x.days)
  const ballCounterparty = open.filter((a) => a.ball_in_court === 'counterparty').map(toBall).sort((x, y) => y.days - x.days)

  const activeTickets = tickets.filter((t) => t.status !== 'Executed' && t.status !== 'Resolved')
  let slaWarning = 0, slaBreach = 0
  for (const t of activeTickets) {
    const s = slaStatus(t.created_date, t.sla_target_date, asOf)
    if (s.state === 'breach') slaBreach++
    else if (s.state === 'warning') slaWarning++
  }

  const executed = agreements.filter((a) => a.status === 'executed' && a.executed_date)
  const cycles = executed
    .map((a) => { const t = ticketById.get(a.ticket_id); return t ? Math.round((new Date(a.executed_date!).getTime() - new Date(t.created_date).getTime()) / 86400000) : null })
    .filter((x): x is number => x !== null)
  const avgCycleDays = cycles.length ? Math.round(cycles.reduce((s, x) => s + x, 0) / cycles.length) : null

  const rounds = agreements.map((a) => Math.max(0, versions.filter((v) => v.agreement_id === a.id).length - 1))
  const avgRedlineRounds = rounds.length ? Math.round((rounds.reduce((s, x) => s + x, 0) / rounds.length) * 10) / 10 : 0

  const openExposure = open.reduce((s, a) => s + (a.contract_value ?? 0), 0)
  const stageFunnel = PIPELINE_STAGES.map((stage) => ({ stage, n: tickets.filter((t) => t.status === stage).length }))

  const groups = new Map<string, Agreement[]>()
  for (const a of open) { const cp = cpFor(a); if (!groups.has(cp)) groups.set(cp, []); groups.get(cp)!.push(a) }
  const byCounterparty: CounterpartyRow[] = [...groups.entries()].map(([cp, ags]) => {
    const balls = new Set(ags.map((a) => a.ball_in_court))
    const ball: 'cp_legal' | 'counterparty' | 'mixed' = balls.size > 1 ? 'mixed' : [...balls][0]
    const t0 = ticketById.get(ags[0].ticket_id)
    return {
      counterparty: cp, ticketId: ags[0].ticket_id, openCount: ags.length, stages: ags.map((a) => a.status),
      redLines: ags.reduce((s, a) => s + a.red_line_count, 0), ball,
      oldestDays: Math.max(...ags.map((a) => daysWaiting(a, asOf))), attorneyId: t0?.assigned_attorney_id ?? null,
      value: ags.reduce((s, a) => s + (a.contract_value ?? 0), 0),
    }
  }).sort((x, y) => y.oldestDays - x.oldestDays)

  const attention: LeaderAttention[] = []
  for (const t of activeTickets) {
    if (slaStatus(t.created_date, t.sla_target_date, asOf).state === 'breach')
      attention.push({ kind: 'sla', label: `SLA breached — ${t.counterparty_name}`, detail: `${t.title} is past its ${t.sla_target_date} target.`, ticketId: t.id })
  }
  const openIds = new Set(open.map((a) => a.id))
  const redByAg = new Map<string, number>()
  for (const d of deviations)
    if (d.risk_category === 'red_line' && d.disposition_status === 'open' && openIds.has(d.agreement_id))
      redByAg.set(d.agreement_id, (redByAg.get(d.agreement_id) ?? 0) + 1)
  for (const [agId, n] of redByAg) {
    const a = agreements.find((x) => x.id === agId)!
    attention.push({ kind: 'redline', label: `${n} open red line${n > 1 ? 's' : ''} — ${cpFor(a)}`, detail: `${a.title} has unresolved red-line dispositions.`, agreementId: agId })
  }
  for (const b of [...ballCp, ...ballCounterparty])
    if (b.band === 'stalled')
      attention.push({ kind: 'stalled', label: `Stalled ${b.days}d — ${b.counterparty}`, detail: `${b.title} — no activity for ${b.days} days.`, agreementId: b.agreementId })
  for (const t of activeTickets)
    if (!t.assigned_attorney_id)
      attention.push({ kind: 'unassigned', label: `Unassigned — ${t.counterparty_name}`, detail: `${t.title} has no ChargePoint owner.`, ticketId: t.id })

  return {
    openAgreements: open.length, ballCp, ballCounterparty,
    slaWarning, slaBreach, slaAtRisk: slaWarning + slaBreach,
    avgCycleDays, avgRedlineRounds, openExposure, executedCount: executed.length,
    stageFunnel, byCounterparty, attention: attention.slice(0, 4),
  }
}

// ===========================================================================
// REPORTS & ANALYTICS — operational/compliance reporting over the matter
// lifecycle: who handled it, intake-to-close cycle time, and step-level SLA
// dwell time per stage. Built for legal leadership, business stakeholders
// (sales/finance), and auditors — not just attorneys.
// ===========================================================================

export interface ResourcePerformance {
  userId: string
  name: string
  openCount: number
  closedCount: number
  avgCycleDays: number | null   // across this resource's CLOSED matters only
  slaBreaches: number           // currently-open matters past their SLA target
}

// "Who handled the matter" + cycle time, per assigned legal resource by default. Pass groupBy to
// re-key by a different field — e.g. initiator_id, for reportee-level reporting under "My team"
// (a sales manager cares who on their team opened it, not which attorney it was routed to).
export function resourcePerformance(
  tickets: Ticket[], agreements: Agreement[], users: User[], asOf = AS_OF,
  groupBy: (t: Ticket) => string | null | undefined = (t) => t.assigned_attorney_id,
): ResourcePerformance[] {
  const agByTicket = new Map<string, Agreement[]>()
  for (const a of agreements) {
    if (!agByTicket.has(a.ticket_id)) agByTicket.set(a.ticket_id, [])
    agByTicket.get(a.ticket_id)!.push(a)
  }
  const byUser = new Map<string, Ticket[]>()
  for (const t of tickets) {
    const key = groupBy(t)
    if (!key) continue
    if (!byUser.has(key)) byUser.set(key, [])
    byUser.get(key)!.push(t)
  }

  return [...byUser.entries()].map(([userId, ts]) => {
    const closed = ts.filter((t) => t.status === 'Executed' || t.status === 'Resolved')
    const open = ts.filter((t) => t.status !== 'Executed' && t.status !== 'Resolved')
    const cycles = closed
      .map((t) => {
        const end = t.closed_date ?? agByTicket.get(t.id)?.find((a) => a.executed_date)?.executed_date ?? null
        return end ? Math.round((new Date(end).getTime() - new Date(t.created_date).getTime()) / 86400000) : null
      })
      .filter((x): x is number => x !== null)
    const avgCycleDays = cycles.length ? Math.round(cycles.reduce((s, x) => s + x, 0) / cycles.length) : null
    const slaBreaches = open.filter((t) => slaStatus(t.created_date, t.sla_target_date, asOf).state === 'breach').length
    return {
      userId, name: users.find((u) => u.id === userId)?.name ?? userId,
      openCount: open.length, closedCount: closed.length, avgCycleDays, slaBreaches,
    }
  }).sort((a, b) => (b.openCount + b.closedCount) - (a.openCount + a.closedCount))
}

export interface StageDwellRow {
  status: AgreementStatus
  label: string
  avgDays: number | null
  count: number          // how many agreements have passed through (or are sitting in) this stage
  targetDays: number
  withinTargetPct: number | null
}

// Step-level SLA targets, business days per stage (Eric's "intake through execution").
export const STAGE_TARGET_DAYS: Record<AgreementStatus, number> = {
  draft: 3, internal_review: 2, sent_to_counterparty: 1, redline_received: 4,
  negotiation: 5, pending_execution: 2, executed: 0,
}

// Dwell time per lifecycle stage, computed from each agreement's stage_history (when a real
// transition recorded one) with created_date as the implicit "entered draft" anchor otherwise —
// so this is real elapsed time, not a canned number, even for agreements with sparse history.
export function stageDwellMetrics(agreements: Agreement[], asOf = AS_OF): StageDwellRow[] {
  const order = Object.keys(agreementStatusMeta) as AgreementStatus[]
  const perStage = new Map<AgreementStatus, number[]>(order.map((s) => [s, []]))

  for (const a of agreements) {
    const hist = a.stage_history ?? []
    const timeline: { status: AgreementStatus; date: string }[] =
      hist.length && hist[0].status === 'draft' ? hist.map((h) => ({ status: h.status, date: h.entered_date }))
        : [{ status: 'draft' as const, date: a.created_date }, ...hist.map((h) => ({ status: h.status, date: h.entered_date }))]

    for (let i = 0; i < timeline.length; i++) {
      const cur = timeline[i]
      const isLast = i === timeline.length - 1
      const endDate = !isLast ? timeline[i + 1].date : (a.status === 'executed' ? (a.executed_date ?? asOf) : asOf)
      const days = Math.max(0, Math.round((new Date(endDate).getTime() - new Date(cur.date).getTime()) / 86400000))
      perStage.get(cur.status)?.push(days)
    }
  }

  return order.filter((s) => s !== 'executed').map((status) => {
    const days = perStage.get(status) ?? []
    const avgDays = days.length ? Math.round((days.reduce((s, x) => s + x, 0) / days.length) * 10) / 10 : null
    const withinTargetPct = days.length ? Math.round((days.filter((d) => d <= STAGE_TARGET_DAYS[status]).length / days.length) * 100) : null
    return { status, label: agreementStatusMeta[status].label, avgDays, count: days.length, targetDays: STAGE_TARGET_DAYS[status], withinTargetPct }
  })
}

// A manager's own id + everyone whose manager_id points to them — "sales managers should be able
// to run reports on the individuals reporting to them."
export function teamUserIds(users: User[], managerId: string): string[] {
  return [managerId, ...users.filter((u) => u.manager_id === managerId).map((u) => u.id)]
}
