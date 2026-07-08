// Shared logic behind the consolidated Open Comments report, used by both the modal
// (components/OpenComments.tsx) and the agent's chat-driven show/download actions
// (agent/engine.ts) — one source of truth for what counts as an "open comment" and
// how the CSV is shaped.
import { userById } from '@/data/seed'
import type { Message, Ticket, Agreement } from '@/types'

export const commentAge = (created: string, asOf: string) =>
  Math.max(0, Math.round((new Date(asOf).getTime() - new Date(created.slice(0, 10)).getTime()) / 86400000))

export interface OpenCommentRow {
  m: Message
  days: number
  label: string
  ticket?: Ticket
  agreement?: Agreement
}

export function consolidatedOpenCommentsRows(
  messages: Message[], tickets: Ticket[], agreements: Agreement[], scopedTicketIds: Set<string>, asOf: string,
): OpenCommentRow[] {
  return messages
    .filter((m) => !m.resolved && !m.parent_id && (m.thread_type === 'agreement_level' || m.thread_type === 'deal_level') && scopedTicketIds.has(m.ticket_id))
    .map((m) => {
      const ticket = tickets.find((t) => t.id === m.ticket_id)
      const agreement = m.agreement_id ? agreements.find((a) => a.id === m.agreement_id) : undefined
      return { m, days: commentAge(m.created_date, asOf), label: agreement?.title ?? ticket?.title ?? m.ticket_id, ticket, agreement }
    })
    .sort((a, b) => b.days - a.days)
}

export function consolidatedOpenCommentsCsv(rows: OpenCommentRow[]): string {
  return [
    'deal,comment,clause,tagged,age_days,status',
    ...rows.map(({ m, days, label }) =>
      `"${label.replace(/"/g, "'")}","${m.body.slice(0, 60).replace(/"/g, "'")}",${m.provision_reference ?? ''},"${(m.mentions ?? []).map((id) => userById(id)?.name).join('; ')}",${days},open`),
  ].join('\n')
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
