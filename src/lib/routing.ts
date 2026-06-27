import type { User, Ticket, AgreementType } from '@/types'

export type RoutingStrategy = 'round_robin' | 'expertise' | 'workload' | 'manual' | 'hybrid'

export const ROUTING_LABEL: Record<RoutingStrategy, string> = {
  round_robin: 'Round robin', expertise: 'Expertise match', workload: 'Workload balance',
  manual: 'Manual override', hybrid: 'Hybrid (expertise + workload)',
}

const openLoad = (attorneyId: string, tickets: Ticket[]) =>
  tickets.filter((t) => t.assigned_attorney_id === attorneyId && t.status !== 'Executed' && t.status !== 'Resolved').length

let rrCursor = 0

// Actually compute the assigned attorney for a new agreement, given the active strategy.
export function routeAttorney(
  strategy: RoutingStrategy,
  agreementType: AgreementType,
  users: User[],
  tickets: Ticket[],
): { attorneyId: string; rationale: string } {
  const attorneys = users.filter((u) => u.role === 'attorney')
  const leastLoaded = (pool: User[]) =>
    [...pool].sort((a, b) => openLoad(a.id, tickets) - openLoad(b.id, tickets))[0]

  switch (strategy) {
    case 'expertise': {
      const experts = attorneys.filter((a) => a.expertise?.includes(agreementType))
      const pick = experts[0] ?? attorneys[0]
      return { attorneyId: pick.id, rationale: experts.length ? `expertise match: ${agreementType}` : 'no expertise match — default attorney' }
    }
    case 'workload': {
      const pick = leastLoaded(attorneys)
      return { attorneyId: pick.id, rationale: `lowest open load (${openLoad(pick.id, tickets)} active)` }
    }
    case 'round_robin': {
      const pick = attorneys[rrCursor % attorneys.length]
      rrCursor++
      return { attorneyId: pick.id, rationale: 'round robin' }
    }
    case 'manual':
      return { attorneyId: attorneys[0].id, rationale: 'manual override (default selected)' }
    case 'hybrid':
    default: {
      const experts = attorneys.filter((a) => a.expertise?.includes(agreementType))
      const pool = experts.length ? experts : attorneys
      const pick = leastLoaded(pool)
      return { attorneyId: pick.id, rationale: `hybrid: ${experts.length ? agreementType + ' expert' : 'any attorney'}, lowest load (${openLoad(pick.id, tickets)} active)` }
    }
  }
}
