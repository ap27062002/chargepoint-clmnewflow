import type {
  RiskCategory, DispositionStatus, AgreementStatus, Priority, ImpactArea,
  Direction, TicketType, AuditEventType, NotificationChannel, VersionSource,
} from '@/types'

// Tailwind class tuples: [text/bg chip classes]
export const riskMeta: Record<RiskCategory, { label: string; chip: string; dot: string; order: number }> = {
  red_line:    { label: 'Red Line',    chip: 'bg-red-50 text-red-700 ring-red-600/20',        dot: 'bg-red-500',     order: 0 },
  negotiate:   { label: 'Negotiate',   chip: 'bg-amber-50 text-amber-700 ring-amber-600/20',  dot: 'bg-amber-500',   order: 1 },
  missing:     { label: 'Missing',     chip: 'bg-slate-100 text-slate-700 ring-slate-500/20', dot: 'bg-slate-500',   order: 2 },
  new:         { label: 'New',         chip: 'bg-violet-50 text-violet-700 ring-violet-600/20',dot: 'bg-violet-500',  order: 3 },
  enhancement: { label: 'Enhancement', chip: 'bg-blue-50 text-blue-700 ring-blue-600/20',      dot: 'bg-blue-500',    order: 4 },
  accept:      { label: 'Accept',      chip: 'bg-brand-50 text-brand-700 ring-brand-600/20',   dot: 'bg-brand-500',   order: 5 },
}

export const dispositionMeta: Record<DispositionStatus, { label: string; chip: string }> = {
  open:     { label: 'Open',     chip: 'bg-slate-100 text-slate-600 ring-slate-400/20' },
  countered:{ label: 'Countered',chip: 'bg-amber-100 text-amber-800 ring-amber-500/20' },
  accepted: { label: 'Accepted', chip: 'bg-brand-100 text-brand-800 ring-brand-500/20' },
  rejected: { label: 'Rejected', chip: 'bg-red-100 text-red-800 ring-red-500/20' },
}

export const agreementStatusMeta: Record<AgreementStatus, { label: string; chip: string }> = {
  draft:               { label: 'Draft',                chip: 'bg-slate-100 text-slate-700' },
  internal_review:     { label: 'Internal Review',      chip: 'bg-indigo-100 text-indigo-700' },
  sent_to_counterparty:{ label: 'Sent to Counterparty', chip: 'bg-sky-100 text-sky-700' },
  redline_received:    { label: 'Redline Received',     chip: 'bg-amber-100 text-amber-800' },
  negotiation:         { label: 'In Negotiation',       chip: 'bg-orange-100 text-orange-700' },
  pending_execution:   { label: 'Ready to Sign',        chip: 'bg-violet-100 text-violet-700' },
  executed:            { label: 'Executed',             chip: 'bg-brand-100 text-brand-800' },
}

export const statusChip = (status: string): string => {
  const map: Record<string, string> = {
    'Red Line Analysis': 'bg-amber-100 text-amber-800',
    'Internal Review': 'bg-indigo-100 text-indigo-700',
    'Draft': 'bg-slate-100 text-slate-700',
    'Sent to Counterparty': 'bg-sky-100 text-sky-700',
    'In Negotiation': 'bg-orange-100 text-orange-700',
    'Ready to Sign': 'bg-violet-100 text-violet-700',
    'Executed': 'bg-brand-100 text-brand-800',
    'Open': 'bg-slate-100 text-slate-700',
    'In Progress': 'bg-indigo-100 text-indigo-700',
    'Resolved': 'bg-brand-100 text-brand-800',
  }
  return map[status] ?? 'bg-slate-100 text-slate-700'
}

export const priorityMeta: Record<Priority, { label: string; chip: string }> = {
  low:    { label: 'Low',    chip: 'bg-slate-100 text-slate-600' },
  normal: { label: 'Normal', chip: 'bg-sky-100 text-sky-700' },
  high:   { label: 'High',   chip: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', chip: 'bg-red-100 text-red-700' },
}

export const impactLabel: Record<ImpactArea, string> = {
  financial: 'Financial', operational: 'Operational', ip: 'IP', data: 'Data',
  regulatory: 'Regulatory', reputational: 'Reputational', relationship: 'Relationship',
}

export const directionLabel: Record<Direction, string> = {
  cp_favorable: 'CP-favorable', cp_unfavorable: 'CP-unfavorable', neutral: 'Neutral', bilateral: 'Bilateral',
}

export const ticketTypeLabel: Record<TicketType, string> = {
  inquiry: 'Inquiry', single_agreement: 'Single Agreement', multi_agreement: 'Multi-Agreement',
}

export const sourceLabel: Record<VersionSource, string> = {
  cp_draft: 'CP Draft', counterparty_draft: 'Counterparty Draft', cp_redline: 'CP Redline', counterparty_response: 'Counterparty Response',
}

export const auditLabel: Record<AuditEventType, string> = {
  ticket_created: 'Ticket Created', ticket_assigned: 'Ticket Assigned', agreement_added: 'Agreement Added',
  version_created: 'Version Created', deviation_identified: 'Deviation Identified', disposition_decided: 'Disposition Decided',
  status_changed: 'Status Changed', document_sent: 'Document Sent', signature_requested: 'Signature Requested',
  signature_completed: 'Signature Completed', comment_posted: 'Comment Posted', playbook_updated: 'Playbook Updated',
  approval_granted: 'Approval Granted', approval_denied: 'Approval Denied', sla_breached: 'SLA Breached',
  playbook_suggested: 'Playbook Suggested', playbook_suggestion_decided: 'Playbook Suggestion Decided',
  document_locked: 'Document Locked', document_released: 'Document Released', edit_blocked: 'Edit Blocked',
}

export const redlineKindMeta: Record<'added' | 'removed' | 'modified' | 'unchanged', { label: string; chip: string }> = {
  added:     { label: 'Added',     chip: 'bg-brand-50 text-brand-700 ring-brand-600/20' },
  removed:   { label: 'Removed',   chip: 'bg-red-50 text-red-700 ring-red-600/20' },
  modified:  { label: 'Revised',   chip: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  unchanged: { label: 'Unchanged', chip: 'bg-slate-100 text-slate-500 ring-slate-400/20' },
}

export const channelLabel: Record<NotificationChannel, string> = {
  in_app: 'In-app', email: 'Email', teams: 'Teams', slack: 'Slack',
}

// SLA helper — returns pct elapsed of the window and a state
export function slaStatus(created: string, target: string, asOf = '2026-06-27'): { pct: number; state: 'ok' | 'warning' | 'breach'; daysLeft: number } {
  const c = new Date(created).getTime()
  const t = new Date(target).getTime()
  const a = new Date(asOf).getTime()
  const pct = Math.max(0, Math.min(120, Math.round(((a - c) / (t - c)) * 100)))
  const daysLeft = Math.round((t - a) / 86400000)
  const state = pct >= 100 ? 'breach' : pct >= 80 ? 'warning' : 'ok'
  return { pct, state, daysLeft }
}

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}
export function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return iso }
}
