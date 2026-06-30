import type { Agreement, Ticket, AgreementType, AgreementStatus, BallInCourt } from '@/types'
import { slaStatus } from '@/lib/labels'
import { daysWaiting, AS_OF } from '@/lib/analytics'

// Lifecycle order for the stage progress bar (mirror of store.AGREEMENT_LIFECYCLE; 'negotiation' folds into redline_received).
const LIFECYCLE: AgreementStatus[] = ['draft', 'internal_review', 'sent_to_counterparty', 'redline_received', 'pending_execution', 'executed']
const stageIndex = (s: AgreementStatus) => {
  const i = LIFECYCLE.indexOf(s)
  return i >= 0 ? i : LIFECYCLE.indexOf('redline_received') // 'negotiation' fallback
}

export interface ContractRow {
  agreementId: string
  ticketId: string
  name: string
  type: AgreementType
  counterparty: string
  stage: AgreementStatus
  stageIdx: number
  stageTotal: number
  ball: BallInCourt
  daysWaiting: number
  turns: number
  attorneyId: string | null
  agreementDate: string
  executed: boolean
  value: number
  slaState: 'ok' | 'warning' | 'breach'
}

// One row per agreement, joined to its ticket for counterparty/owner/SLA. Days-waiting uses the
// same anchor as the dashboard (analytics.daysWaiting → last_activity_date ?? created_date) so the
// two views never disagree.
export function buildRows(agreements: Agreement[], tickets: Ticket[], asOf = AS_OF): ContractRow[] {
  const ticketById = new Map(tickets.map((t) => [t.id, t]))
  return agreements.map((a) => {
    const t = ticketById.get(a.ticket_id)
    const days = daysWaiting(a, asOf)
    const sla = t ? slaStatus(t.created_date, t.sla_target_date, asOf).state : 'ok'
    return {
      agreementId: a.id,
      ticketId: a.ticket_id,
      name: a.title,
      type: a.agreement_type,
      counterparty: t?.counterparty_name ?? '—',
      stage: a.status,
      stageIdx: stageIndex(a.status),
      stageTotal: LIFECYCLE.length,
      ball: a.ball_in_court,
      daysWaiting: a.status === 'executed' ? 0 : days,
      turns: a.turn_count ?? 0,
      attorneyId: t?.assigned_attorney_id ?? null,
      agreementDate: a.created_date,
      executed: a.status === 'executed',
      value: a.contract_value ?? 0,
      slaState: a.status === 'executed' ? 'ok' : sla,
    }
  })
}
