import type { Ticket, Message, User, Agreement } from '@/types'

// Co-assigned as a second lawyer, or added as a stakeholder (e.g. a sales rep) for visibility only.
const isWatching = (t: Ticket, userId: string): boolean =>
  !!t.additional_attorney_ids?.includes(userId) || !!t.watcher_ids?.includes(userId)

// Row-level visibility (RBAC data scoping), per the spec's role restrictions:
// - Administrator / Playbook Owner: oversight → all matters
// - Assigned Attorney: tickets assigned to them, co-assigned, or where they're a visibility watcher
// - Initiator: only tickets they created (or are a watcher on)
// - Contributor: only tickets where they are tagged, have participated, or are a watcher
export function visibleTickets(tickets: Ticket[], messages: Message[], user: User): Ticket[] {
  switch (user.role) {
    case 'administrator':
    case 'playbook_owner':
      return tickets
    case 'attorney':
      return tickets.filter((t) => t.assigned_attorney_id === user.id || isWatching(t, user.id))
    case 'initiator':
      return tickets.filter((t) => t.initiator_id === user.id || isWatching(t, user.id))
    case 'contributor': {
      const touched = new Set(
        messages.filter((m) => m.author_id === user.id || m.mentions?.includes(user.id)).map((m) => m.ticket_id),
      )
      return tickets.filter((t) => touched.has(t.id) || isWatching(t, user.id))
    }
    default:
      return []
  }
}

export function canSeeTicket(tickets: Ticket[], messages: Message[], user: User, ticketId: string): boolean {
  return visibleTickets(tickets, messages, user).some((t) => t.id === ticketId)
}

export function visibleAgreementIds(tickets: Ticket[], messages: Message[], user: User, agreements: Agreement[]): Set<string> {
  const ids = new Set(visibleTickets(tickets, messages, user).map((t) => t.id))
  return new Set(agreements.filter((a) => ids.has(a.ticket_id)).map((a) => a.id))
}
