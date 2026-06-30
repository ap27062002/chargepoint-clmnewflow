import { AlertTriangle, FileText, Clock, GitPullRequestArrow, ArrowRight, Table, Scale, DollarSign, Flame, UserX, ListChecks, ChevronRight } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Avatar, Button, SectionLabel, Kpi, StackBar, Stat } from '@/components/ui'
import { agreementStatusMeta, fmtDate } from '@/lib/labels'
import { sendToAgent } from '@/agent/engine'
import { visibleTickets } from '@/lib/scope'
import { ROLE_LABEL } from '@/lib/access'
import { userById } from '@/data/seed'
import { leadershipMetrics, fmtMoney, type BallItem, type LeaderAttention } from '@/lib/analytics'

const bandDot: Record<string, string> = { fresh: 'bg-brand-500', aging: 'bg-amber-500', stalled: 'bg-red-500' }
const daysColor = (d: number) => (d >= 9 ? 'text-red-600' : d >= 5 ? 'text-amber-600' : 'text-slate-400')
const ballChip = (b: string) => (b === 'cp_legal' ? 'bg-brand-50 text-brand-700 ring-brand-500/20' : b === 'counterparty' ? 'bg-slate-100 text-slate-600 ring-slate-300/30' : 'bg-amber-50 text-amber-700 ring-amber-500/20')
const attnIcon: Record<LeaderAttention['kind'], JSX.Element> = {
  sla: <AlertTriangle size={14} className="text-red-500" />, redline: <Flame size={14} className="text-red-500" />,
  stalled: <Clock size={14} className="text-amber-500" />, unassigned: <UserX size={14} className="text-slate-400" />,
}

function BallColumn({ title, items, accent, onOpen }: { title: string; items: BallItem[]; accent: string; onOpen: (id: string) => void }) {
  const bands = { fresh: items.filter((i) => i.band === 'fresh').length, aging: items.filter((i) => i.band === 'aging').length, stalled: items.filter((i) => i.band === 'stalled').length }
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <SectionLabel>{title}</SectionLabel>
        <span className={`text-lg font-bold ${accent}`}>{items.length}</span>
      </div>
      <StackBar segments={[
        { n: bands.fresh, className: 'bg-brand-500', label: 'Fresh ≤3d' },
        { n: bands.aging, className: 'bg-amber-500', label: 'Aging 4–7d' },
        { n: bands.stalled, className: 'bg-red-500', label: 'Stalled >7d' },
      ]} />
      <div className="mt-2.5 space-y-1">
        {items.length === 0 && <div className="py-2 text-center text-[12px] text-slate-400">Nothing here.</div>}
        {items.map((it) => (
          <button key={it.agreementId} onClick={() => onOpen(it.agreementId)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${bandDot[it.band]}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold text-slate-700">{it.counterparty}</div>
              <div className="truncate text-[11px] text-slate-400">{agreementStatusMeta[it.stage].label}</div>
            </div>
            {it.attorneyId && <Avatar userId={it.attorneyId} size={18} />}
            <span className={`shrink-0 text-[11px] font-semibold ${daysColor(it.days)}`}>{it.days}d</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

export function Dashboard() {
  const allTickets = useStore((s) => s.tickets)
  const allAgreements = useStore((s) => s.agreements)
  const versions = useStore((s) => s.versions)
  const deviations = useStore((s) => s.deviations)
  const messages = useStore((s) => s.messages)
  const cu = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!)
  const openContracts = useStore((s) => s.openContracts)
  const openTicket = useStore((s) => s.openTicket)
  const openAgreement = useStore((s) => s.openAgreement)

  // RBAC row-scoping, then compute the leadership metrics over what's visible.
  const tickets = visibleTickets(allTickets, messages, cu)
  const ticketIds = new Set(tickets.map((t) => t.id))
  const agreements = allAgreements.filter((a) => ticketIds.has(a.ticket_id))
  const leader = cu.role === 'administrator' || cu.role === 'playbook_owner'
  const m = leadershipMetrics(tickets, agreements, versions, deviations)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Leadership Overview</h1>
          <p className="text-[13px] text-slate-500">{leader ? 'All active matters across the legal team' : `Matters visible to you as ${ROLE_LABEL[cu.role]}`} — as of Jun 27, 2026.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Table size={15} />} onClick={() => openContracts('all')}>View all contracts</Button>
          <Button variant="ai" icon={<GitPullRequestArrow size={15} />} onClick={() => sendToAgent('review the Vishay redline')}>Review Vishay redline</Button>
        </div>
      </div>

      {/* Headline KPIs — each deep-links to the filtered contracts list */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <Kpi label="Open agreements" value={m.openAgreements} sub={`${m.byCounterparty.length} counterparties`} icon={<FileText size={16} />} onClick={() => openContracts('active')} />
        <Kpi label="Ball in our court" value={`${m.ballCp.length}/${m.openAgreements}`} sub={`${m.ballCounterparty.length} waiting on counterparty`} icon={<Scale size={16} />} accent="text-brand-700" onClick={() => openContracts('cp_turn')} />
        <Kpi label="At SLA risk" value={m.slaAtRisk} sub={`${m.slaBreach} breached · ${m.slaWarning} warning`} icon={<AlertTriangle size={16} />} accent={m.slaAtRisk > 0 ? 'text-red-600' : 'text-slate-800'} onClick={() => openContracts('sla_risk')} />
        <Kpi label="Open value" value={fmtMoney(m.openExposure)} sub={`Avg cycle ${m.avgCycleDays != null ? m.avgCycleDays + 'd' : '—'}`} icon={<DollarSign size={16} />} onClick={() => openContracts('active')} />
      </div>

      {/* Needs your attention */}
      {m.attention.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50/30 p-4">
          <div className="mb-2 flex items-center gap-2"><AlertTriangle size={15} className="text-amber-600" /><SectionLabel className="text-amber-700">Needs your attention</SectionLabel></div>
          <div className="space-y-1.5">
            {m.attention.map((a, i) => (
              <button key={i} onClick={() => (a.agreementId ? openAgreement(a.agreementId, 'review') : a.ticketId ? openTicket(a.ticketId) : undefined)}
                className="flex w-full items-center gap-2.5 rounded-lg bg-white px-3 py-2 text-left ring-1 ring-amber-100 hover:bg-slate-50">
                {attnIcon[a.kind]}
                <span className="text-[12.5px] font-semibold text-slate-700">{a.label}</span>
                <span className="truncate text-[11.5px] text-slate-400">{a.detail}</span>
                <ChevronRight size={14} className="ml-auto shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Ball-in-court — who owns the next move */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <BallColumn title="In ChargePoint's court" items={m.ballCp} accent="text-brand-700" onOpen={(id) => openAgreement(id, 'review')} />
        <BallColumn title="Waiting on counterparty" items={m.ballCounterparty} accent="text-slate-600" onOpen={(id) => openAgreement(id, 'review')} />
      </div>

      {/* Efficiency stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Avg cycle (intake → signed)" value={m.avgCycleDays != null ? `${m.avgCycleDays} days` : '—'} />
        <Stat label="Avg redline rounds" value={m.avgRedlineRounds} />
        <Stat label="Executed (period)" value={m.executedCount} accent="text-brand-600" />
      </div>

      {/* Stage funnel */}
      <Card className="mb-4 p-4">
        <SectionLabel className="mb-3">Pipeline by stage</SectionLabel>
        <div className="flex items-stretch gap-2">
          {m.stageFunnel.map((c, i) => (
            <div key={c.stage} className="flex flex-1 items-center gap-2">
              <button onClick={() => openContracts('active')} className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-ai-200 hover:bg-ai-50/40">
                <div className="text-lg font-bold text-slate-800">{c.n}</div>
                <div className="text-[10.5px] font-medium leading-tight text-slate-500">{c.stage}</div>
              </button>
              {i < m.stageFunnel.length - 1 && <ArrowRight size={14} className="shrink-0 text-slate-300" />}
            </div>
          ))}
        </div>
      </Card>

      {/* By counterparty */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <SectionLabel>By counterparty</SectionLabel>
          <button onClick={() => openContracts('all')} className="flex items-center gap-1 text-[12px] font-semibold text-ai-600 hover:underline"><ListChecks size={13} /> All contracts</button>
        </div>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2 font-semibold">Counterparty</th>
              <th className="px-2 py-2 font-semibold">Open</th>
              <th className="px-2 py-2 font-semibold">Stages</th>
              <th className="px-2 py-2 font-semibold">Red lines</th>
              <th className="px-2 py-2 font-semibold">Turn</th>
              <th className="px-2 py-2 font-semibold">Oldest</th>
              <th className="px-2 py-2 font-semibold">Owner</th>
              <th className="px-2 py-2 font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {m.byCounterparty.map((r) => (
              <tr key={r.counterparty} onClick={() => openTicket(r.ticketId)} className="cursor-pointer border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-semibold text-slate-700">{r.counterparty}</td>
                <td className="px-2 py-2.5 text-slate-600">{r.openCount}</td>
                <td className="px-2 py-2.5">
                  <div className="flex flex-wrap gap-1">{r.stages.map((st, i) => <Chip key={i} className={agreementStatusMeta[st].chip}>{agreementStatusMeta[st].label}</Chip>)}</div>
                </td>
                <td className="px-2 py-2.5">{r.redLines > 0 ? <span className="font-semibold text-red-600">{r.redLines}</span> : <span className="text-slate-400">0</span>}</td>
                <td className="px-2 py-2.5"><Chip className={ballChip(r.ball)}>{r.ball === 'cp_legal' ? 'In our court' : r.ball === 'counterparty' ? 'Counterparty' : 'Mixed'}</Chip></td>
                <td className="px-2 py-2.5"><span className={`text-[12px] font-semibold ${daysColor(r.oldestDays)}`}>{r.oldestDays}d</span></td>
                <td className="px-2 py-2.5">{r.attorneyId ? <div className="flex items-center gap-1.5"><Avatar userId={r.attorneyId} size={20} /><span className="text-[12px] text-slate-600">{userById(r.attorneyId)?.name.split(' ')[0]}</span></div> : <span className="text-[12px] text-slate-400">—</span>}</td>
                <td className="px-2 py-2.5 text-slate-500">{fmtMoney(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-3 text-center text-[11px] text-slate-400">As of {fmtDate('2026-06-27T00:00:00')} · ChargePoint Legal · Enterprise CLM</div>
    </div>
  )
}
