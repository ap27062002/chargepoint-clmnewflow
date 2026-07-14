// Reports & Analytics — standardized operational/compliance reporting over the matter lifecycle:
// who handled it (legal resource), intake-to-close cycle time, and step-level SLA dwell time from
// intake through execution. Built for legal leadership, business stakeholders (sales/finance), and
// auditors to monitor throughput, bottlenecks, SLA adherence, and risk patterns — not just attorneys.
import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { BarChart3, Clock, CheckCircle2, AlertTriangle, Users, TrendingUp, Download } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, SectionLabel, Avatar, StackBar } from '@/components/ui'
import { userById } from '@/data/seed'
import { fmtDate, slaStatus } from '@/lib/labels'
import { AS_OF, resourcePerformance, stageDwellMetrics, teamUserIds, type ResourcePerformance, type StageDwellRow } from '@/lib/analytics'
import { visibleTickets } from '@/lib/scope'
import type { Ticket } from '@/types'

type Scope = 'mine' | 'team' | 'all'

function dwellChip(row: StageDwellRow): string {
  if (row.withinTargetPct === null) return 'bg-slate-100 text-slate-400 ring-slate-300/30'
  if (row.withinTargetPct >= 80) return 'bg-brand-50 text-brand-700 ring-brand-500/20'
  if (row.withinTargetPct >= 50) return 'bg-amber-50 text-amber-700 ring-amber-500/20'
  return 'bg-red-50 text-red-700 ring-red-500/20'
}

function StageDwellTable({ rows }: { rows: StageDwellRow[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <SectionLabel>Step-level SLA — intake through execution</SectionLabel>
        <p className="mt-0.5 text-[11.5px] text-slate-400">Average time spent in each stage vs. target, across every matter that has passed through it.</p>
      </div>
      <table className="w-full text-left text-[12.5px]">
        <thead><tr className="border-b border-slate-100 text-[10.5px] uppercase tracking-wide text-slate-400">
          <th className="px-4 py-2 font-semibold">Stage</th>
          <th className="px-2 py-2 font-semibold">Avg. days</th>
          <th className="px-2 py-2 font-semibold">Target</th>
          <th className="px-2 py-2 font-semibold">Matters</th>
          <th className="px-2 py-2 font-semibold">Within target</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.status} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-2 font-semibold text-slate-700">{r.label}</td>
              <td className="px-2 py-2 text-slate-600">{r.avgDays ?? '—'}</td>
              <td className="px-2 py-2 text-slate-400">{r.targetDays}d</td>
              <td className="px-2 py-2 text-slate-500">{r.count}</td>
              <td className="px-2 py-2">{r.withinTargetPct === null ? <span className="text-slate-300">—</span> : <Chip className={clsx('ring-1 ring-inset', dwellChip(r))}>{r.withinTargetPct}%</Chip>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function ResourceTable({ rows, byReportee }: { rows: ResourcePerformance[]; byReportee?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <SectionLabel>{byReportee ? 'By team member — who opened the matter' : 'By legal resource — who handled the matter'}</SectionLabel>
        <p className="mt-0.5 text-[11.5px] text-slate-400">
          {byReportee ? 'Open/closed load, average cycle time on closed matters, and current SLA breaches per person on your team.' : 'Open/closed load, average cycle time on closed matters, and current SLA breaches per assigned attorney.'}
        </p>
      </div>
      <table className="w-full text-left text-[12.5px]">
        <thead><tr className="border-b border-slate-100 text-[10.5px] uppercase tracking-wide text-slate-400">
          <th className="px-4 py-2 font-semibold">{byReportee ? 'Team member' : 'Resource'}</th>
          <th className="px-2 py-2 font-semibold">Open</th>
          <th className="px-2 py-2 font-semibold">Closed</th>
          <th className="px-2 py-2 font-semibold">Avg. cycle (days)</th>
          <th className="px-2 py-2 font-semibold">SLA breaches</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No matters in this scope.</td></tr>}
          {rows.map((r) => (
            <tr key={r.userId} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-2"><div className="flex items-center gap-2 font-semibold text-slate-700"><Avatar userId={r.userId} size={20} />{r.name}</div></td>
              <td className="px-2 py-2 text-slate-600">{r.openCount}</td>
              <td className="px-2 py-2 text-slate-600">{r.closedCount}</td>
              <td className="px-2 py-2 text-slate-600">{r.avgCycleDays ?? '—'}</td>
              <td className="px-2 py-2">{r.slaBreaches > 0 ? <Chip className="bg-red-50 text-red-700 ring-1 ring-inset ring-red-500/20">{r.slaBreaches}</Chip> : <span className="text-slate-300">0</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

export function ReportsView() {
  const tickets = useStore((s) => s.tickets)
  const agreements = useStore((s) => s.agreements)
  const messages = useStore((s) => s.messages)
  const users = useStore((s) => s.users)
  const setToast = useStore((s) => s.setToast)
  const cu = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!)

  const isLeadership = cu.role === 'attorney' || cu.role === 'playbook_owner' || cu.role === 'administrator'
  const myTeam = users.filter((u) => u.manager_id === cu.id)
  const isManager = myTeam.length > 0
  const [scope, setScope] = useState<Scope>(isLeadership ? 'all' : isManager ? 'team' : 'mine')

  const scopedTickets: Ticket[] = useMemo(() => {
    if (scope === 'all') return tickets // leadership only — org-wide, unscoped
    if (scope === 'team' && isManager) {
      const ids = new Set(teamUserIds(users, cu.id))
      return tickets.filter((t) => ids.has(t.initiator_id))
    }
    // 'mine' — reuse the same RBAC scoping as the rest of the app, so it means the
    // role-appropriate thing (assigned to me / tagged on / initiated by me), not just initiator_id.
    return visibleTickets(tickets, messages, cu)
  }, [tickets, messages, cu, scope, isManager, users])

  const scopedTicketIds = new Set(scopedTickets.map((t) => t.id))
  const scopedAgreements = agreements.filter((a) => scopedTicketIds.has(a.ticket_id))

  const openTickets = scopedTickets.filter((t) => t.status !== 'Executed' && t.status !== 'Resolved')
  const closedTickets = scopedTickets.filter((t) => t.status === 'Executed' || t.status === 'Resolved')
  const cycles = closedTickets
    .map((t) => { const end = t.closed_date; return end ? Math.round((new Date(end).getTime() - new Date(t.created_date).getTime()) / 86400000) : null })
    .filter((x): x is number => x !== null)
  const avgCycle = cycles.length ? Math.round(cycles.reduce((s, x) => s + x, 0) / cycles.length) : null
  const breaches = openTickets.filter((t) => slaStatus(t.created_date, t.sla_target_date, AS_OF).state === 'breach').length

  // Under "My team", a sales manager cares who on their team opened the matter, not which
  // attorney it was routed to — group by initiator instead of assigned attorney.
  const byReportee = scope === 'team' && isManager
  const resourceRows = byReportee
    ? resourcePerformance(scopedTickets, scopedAgreements, users, AS_OF, (t) => t.initiator_id)
    : resourcePerformance(scopedTickets, scopedAgreements, users, AS_OF)
  const dwellRows = stageDwellMetrics(scopedAgreements, AS_OF)
  const scopeOptions: Scope[] = ['mine', ...(isManager ? (['team'] as const) : []), ...(isLeadership ? (['all'] as const) : [])]

  const exportCsv = () => {
    const header = 'ticket_id,title,counterparty,type,status,initiator,assigned_attorney,created_date,closed_date,sla_target_date'
    const rows = scopedTickets.map((t) => [
      t.id, t.title.replace(/"/g, "'"), t.counterparty_name, t.type, t.status,
      userById(t.initiator_id)?.name ?? t.initiator_id, t.assigned_attorney_id ? userById(t.assigned_attorney_id)?.name ?? t.assigned_attorney_id : '—',
      t.created_date, t.closed_date ?? '', t.sla_target_date,
    ].map((v) => `"${v}"`).join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `CLM_Report_${scope}_${AS_OF}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
    setToast('Report exported as CSV.')
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[18px] font-bold text-slate-800"><BarChart3 size={20} className="text-brand-500" /> Reports & Analytics</h1>
          <p className="mt-0.5 text-[12.5px] text-slate-500">Throughput, bottlenecks, SLA adherence, and risk patterns across the matter lifecycle — as of {fmtDate(AS_OF)}.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {scopeOptions.length > 1 && (
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {scopeOptions.map((s) => (
                <button key={s} onClick={() => setScope(s)} className={clsx('rounded-md px-2.5 py-1 text-[11.5px] font-semibold capitalize', scope === s ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100')}>
                  {s === 'mine' ? 'My matters' : s === 'team' ? `My team (${myTeam.length + 1})` : 'Everyone'}
                </button>
              ))}
            </div>
          )}
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <Card className="p-3.5"><SectionLabel className="flex items-center gap-1.5"><TrendingUp size={12} /> Open matters</SectionLabel><div className="mt-1 text-2xl font-bold text-slate-800">{openTickets.length}</div></Card>
        <Card className="p-3.5"><SectionLabel className="flex items-center gap-1.5"><CheckCircle2 size={12} /> Closed matters</SectionLabel><div className="mt-1 text-2xl font-bold text-slate-800">{closedTickets.length}</div></Card>
        <Card className="p-3.5"><SectionLabel className="flex items-center gap-1.5"><Clock size={12} /> Avg. cycle time</SectionLabel><div className="mt-1 text-2xl font-bold text-slate-800">{avgCycle ?? '—'}<span className="text-sm font-normal text-slate-400">{avgCycle !== null ? ' days' : ''}</span></div></Card>
        <Card className="p-3.5"><SectionLabel className="flex items-center gap-1.5"><AlertTriangle size={12} className={breaches > 0 ? 'text-red-500' : ''} /> SLA breaches</SectionLabel><div className={clsx('mt-1 text-2xl font-bold', breaches > 0 ? 'text-red-600' : 'text-slate-800')}>{breaches}</div></Card>
      </div>

      {/* Throughput funnel */}
      <Card className="mb-4 p-4">
        <SectionLabel className="mb-2 flex items-center gap-1.5"><Users size={12} /> Throughput by stage</SectionLabel>
        <StackBar segments={dwellRows.map((r, i) => ({ n: r.count, className: ['bg-slate-300', 'bg-indigo-300', 'bg-sky-300', 'bg-amber-300', 'bg-orange-300', 'bg-violet-300'][i % 6], label: r.label }))} />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
          {dwellRows.map((r) => <span key={r.status}>{r.label}: <b className="text-slate-600">{r.count}</b></span>)}
        </div>
      </Card>

      <div className="mb-4"><ResourceTable rows={resourceRows} byReportee={byReportee} /></div>
      <StageDwellTable rows={dwellRows} />
    </div>
  )
}
