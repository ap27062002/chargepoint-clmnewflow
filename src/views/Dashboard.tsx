import { AlertTriangle, FileText, Clock, CheckCircle2, GitPullRequestArrow, ArrowRight } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Avatar, Button, SectionLabel } from '@/components/ui'
import { statusChip, priorityMeta, slaStatus, fmtDate, ticketTypeLabel } from '@/lib/labels'
import { sendToAgent } from '@/agent/engine'
import { visibleTickets } from '@/lib/scope'
import { ROLE_LABEL } from '@/lib/access'
import { userById } from '@/data/seed'
import type { Ticket } from '@/types'

const PIPELINE = ['Red Line Analysis', 'Internal Review', 'Draft', 'Sent to Counterparty', 'Pending Execution', 'Executed'] as const

function SlaBar({ t }: { t: Ticket }) {
  const sla = slaStatus(t.created_date, t.sla_target_date)
  const color = sla.state === 'breach' ? 'bg-red-500' : sla.state === 'warning' ? 'bg-amber-500' : 'bg-brand-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, sla.pct)}%` }} />
      </div>
      <span className={`text-[11px] font-semibold ${sla.state === 'breach' ? 'text-red-600' : sla.state === 'warning' ? 'text-amber-600' : 'text-slate-400'}`}>
        {sla.state === 'breach' ? 'Breached' : `${sla.daysLeft}d left`}
      </span>
    </div>
  )
}

export function Dashboard() {
  const allTickets = useStore((s) => s.tickets)
  const messages = useStore((s) => s.messages)
  const openTicket = useStore((s) => s.openTicket)
  const cu = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!)
  // Row-level scoping: each role sees only the matters they're entitled to.
  const tickets = visibleTickets(allTickets, messages, cu)
  const scoped = cu.role !== 'administrator' && cu.role !== 'playbook_owner'

  const active = tickets.filter((t) => t.status !== 'Executed' && t.status !== 'Resolved')
  const executed = tickets.filter((t) => t.status === 'Executed')
  const slaAlerts = active.filter((t) => slaStatus(t.created_date, t.sla_target_date).state !== 'ok')
  const redlineCount = useStore((s) => s.deviations.filter((d) => d.disposition_status === 'open').length)

  const counts = PIPELINE.map((p) => ({ stage: p, n: tickets.filter((t) => t.status === p).length }))

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pipeline Overview</h1>
          <p className="text-[13px] text-slate-500">{scoped ? `Matters visible to you as ${ROLE_LABEL[cu.role]}` : 'All active matters across the legal team'} — as of Jun 27, 2026.</p>
        </div>
        <Button variant="ai" icon={<GitPullRequestArrow size={15} />} onClick={() => sendToAgent('review the Vishay redline')}>
          Review Vishay redline
        </Button>
      </div>

      {/* KPI row */}
      <div className="mb-5 grid grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between"><SectionLabel>Active matters</SectionLabel><FileText size={16} className="text-slate-300" /></div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{active.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><SectionLabel>Open deviations</SectionLabel><GitPullRequestArrow size={16} className="text-slate-300" /></div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{redlineCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><SectionLabel>SLA alerts</SectionLabel><AlertTriangle size={16} className="text-slate-300" /></div>
          <div className="mt-1 text-2xl font-bold text-red-600">{slaAlerts.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><SectionLabel>Executed (30d)</SectionLabel><CheckCircle2 size={16} className="text-slate-300" /></div>
          <div className="mt-1 text-2xl font-bold text-brand-600">{executed.length}</div>
        </Card>
      </div>

      {/* Pipeline */}
      <Card className="mb-5 p-4">
        <SectionLabel className="mb-3">Deal Pipeline</SectionLabel>
        <div className="flex items-stretch gap-2">
          {counts.map((c, i) => (
            <div key={c.stage} className="flex flex-1 items-center gap-2">
              <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-lg font-bold text-slate-800">{c.n}</div>
                <div className="text-[10.5px] font-medium leading-tight text-slate-500">{c.stage}</div>
              </div>
              {i < counts.length - 1 && <ArrowRight size={14} className="shrink-0 text-slate-300" />}
            </div>
          ))}
        </div>
      </Card>

      {/* SLA alerts */}
      {slaAlerts.length > 0 && (
        <Card className="mb-5 border-amber-200 bg-amber-50/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600" />
            <SectionLabel className="text-amber-700">SLA escalations</SectionLabel>
          </div>
          <div className="space-y-1.5">
            {slaAlerts.map((t) => {
              const sla = slaStatus(t.created_date, t.sla_target_date)
              return (
                <div key={t.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-amber-100">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className={sla.state === 'breach' ? 'text-red-500' : 'text-amber-500'} />
                    <span className="text-[13px] font-semibold text-slate-700">{t.title}</span>
                    <span className="text-[11px] text-slate-400">{t.id}</span>
                  </div>
                  <button onClick={() => openTicket(t.id)} className="text-[12px] font-semibold text-amber-700 hover:underline">
                    {sla.state === 'breach' ? 'Breached — open' : `${sla.pct}% of SLA — open`}
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Active matters table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <SectionLabel>Active Matters</SectionLabel>
          <span className="text-[11px] text-slate-400">{active.length} open</span>
        </div>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2 font-semibold">Matter</th>
              <th className="px-2 py-2 font-semibold">Type</th>
              <th className="px-2 py-2 font-semibold">Status</th>
              <th className="px-2 py-2 font-semibold">Priority</th>
              <th className="px-2 py-2 font-semibold">Attorney</th>
              <th className="px-2 py-2 font-semibold">SLA</th>
            </tr>
          </thead>
          <tbody>
            {active.map((t) => (
              <tr key={t.id} onClick={() => openTicket(t.id)} className="cursor-pointer border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-slate-700">{t.title}</div>
                  <div className="text-[11px] text-slate-400">{t.id} · {t.counterparty_name}</div>
                </td>
                <td className="px-2 py-2.5"><span className="text-[12px] text-slate-500">{ticketTypeLabel[t.type]}</span></td>
                <td className="px-2 py-2.5"><Chip className={statusChip(t.status)}>{t.status}</Chip></td>
                <td className="px-2 py-2.5"><Chip className={priorityMeta[t.priority].chip}>{priorityMeta[t.priority].label}</Chip></td>
                <td className="px-2 py-2.5">
                  {t.assigned_attorney_id ? (
                    <div className="flex items-center gap-1.5"><Avatar userId={t.assigned_attorney_id} size={22} /><span className="text-[12px] text-slate-600">{userById(t.assigned_attorney_id)?.name.split(' ')[0]}</span></div>
                  ) : <span className="text-[12px] text-slate-400">Unassigned</span>}
                </td>
                <td className="px-2 py-2.5"><SlaBar t={t} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-3 text-center text-[11px] text-slate-400">Created {fmtDate('2026-06-27T00:00:00')} · ChargePoint Legal · Enterprise CLM</div>
    </div>
  )
}
