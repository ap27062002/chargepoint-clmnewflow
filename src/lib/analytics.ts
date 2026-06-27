import type { Playbook, Deviation, Agreement, Ticket } from '@/types'

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
