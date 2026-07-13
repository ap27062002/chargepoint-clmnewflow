import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { AlertTriangle, FileText, Plus, Scale, DollarSign, Flame, UserX, Clock, ChevronRight, AtSign, Bot, BellRing } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Avatar, Button, SectionLabel, Kpi, SortHeader, SearchBox, toggleSort } from '@/components/ui'
import { agreementStatusMeta, fmtDate } from '@/lib/labels'
import { visibleTickets } from '@/lib/scope'
import { ROLE_LABEL } from '@/lib/access'
import { userById } from '@/data/seed'
import { leadershipMetrics, fmtMoney, AS_OF, type LeaderAttention } from '@/lib/analytics'
import { CreateTicketModal } from '@/components/CreateTicketModal'
import type { Ticket } from '@/types'

const daysColor = (d: number) => (d > 10 ? 'text-red-600' : d > 5 ? 'text-amber-600' : 'text-slate-400')
const daysChip = (d: number) => (d > 10 ? 'bg-red-50 text-red-700 ring-red-500/20' : d > 5 ? 'bg-amber-50 text-amber-700 ring-amber-500/20' : 'bg-slate-100 text-slate-500 ring-slate-300/30')
const ballChip = (b: string) => (b === 'cp_legal' ? 'bg-brand-50 text-brand-700 ring-brand-500/20' : b === 'counterparty' ? 'bg-slate-100 text-slate-600 ring-slate-300/30' : 'bg-amber-50 text-amber-700 ring-amber-500/20')
const attnIcon: Record<LeaderAttention['kind'], JSX.Element> = {
  sla: <AlertTriangle size={14} className="text-red-500" />, redline: <Flame size={14} className="text-red-500" />,
  stalled: <Clock size={14} className="text-amber-500" />, unassigned: <UserX size={14} className="text-slate-400" />,
}
const daysOpen = (created: string) => Math.max(0, Math.round((new Date(AS_OF).getTime() - new Date(created).getTime()) / 86400000))
const kindLabel = (t: Ticket) => (t.type === 'inquiry' ? 'General Legal Support' : 'Agreement Negotiation')

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
  const openCanvas = useStore((s) => s.openCanvas)
  const navigate = useStore((s) => s.navigate)
  const setToast = useStore((s) => s.setToast)
  const [modalOpen, setModalOpen] = useState(false)
  const [q, setQ] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('All')
  type QueueSortKey = 'name' | 'counterparty' | 'attorney' | 'stage' | 'days' | 'comments'
  const [qSort, setQSort] = useState<{ key: QueueSortKey; dir: 'asc' | 'desc' }>({ key: 'days', dir: 'desc' })
  type CpSortKey = 'counterparty' | 'open' | 'stage' | 'value'
  const [cpQ, setCpQ] = useState('')
  const [cpSort, setCpSort] = useState<{ key: CpSortKey; dir: 'asc' | 'desc' }>({ key: 'counterparty', dir: 'asc' })

  // RBAC row-scoping, then compute metrics over what's visible.
  const tickets = visibleTickets(allTickets, messages, cu)
  const ticketIds = new Set(tickets.map((t) => t.id))
  const agreements = allAgreements.filter((a) => ticketIds.has(a.ticket_id))
  const leader = cu.role === 'administrator' || cu.role === 'playbook_owner'
  const m = leadershipMetrics(tickets, agreements, versions, deviations)
  const cpQl = cpQ.toLowerCase().trim()
  const cpRows = m.byCounterparty
    .filter((r) => !cpQl || r.counterparty.toLowerCase().includes(cpQl))
    .sort((a, b) => {
      const d = cpSort.dir === 'asc' ? 1 : -1
      if (cpSort.key === 'open') return (a.openCount - b.openCount) * d
      if (cpSort.key === 'stage') return String(a.stages[a.stages.length - 1] ?? '').localeCompare(String(b.stages[b.stages.length - 1] ?? '')) * d
      if (cpSort.key === 'value') return (a.value - b.value) * d
      return a.counterparty.localeCompare(b.counterparty) * d
    })
  const onCpSort = (key: CpSortKey) => setCpSort((s) => toggleSort(key, s, (k) => k === 'counterparty'))

  // ---- My Open Tickets (primary work queue) — Eric: users have 100+ tickets and won't scroll ----
  const contributorsFor = (t: Ticket) => Array.from(new Set(messages.filter((mm) => mm.ticket_id === t.id).flatMap((mm) => [mm.author_id, ...(mm.mentions ?? [])]))).filter((id) => id !== t.assigned_attorney_id).slice(0, 3)
  const openCommentsFor = (t: Ticket) => messages.filter((mm) => mm.ticket_id === t.id && mm.mentions?.length && !mm.resolved).length
  const openTickets = useMemo(() => tickets.filter((t) => t.status !== 'Executed' && t.status !== 'Resolved'), [tickets])
  const stages = useMemo(() => ['All', ...Array.from(new Set(openTickets.map((t) => String(t.status))))], [openTickets])
  const ql = q.toLowerCase().trim()
  const queue = useMemo(() => openTickets
    .filter((t) => stageFilter === 'All' || String(t.status) === stageFilter)
    .filter((t) => {
      if (!ql) return true
      const attorney = userById(t.assigned_attorney_id ?? '')?.name.toLowerCase() ?? ''
      const contribs = contributorsFor(t).map((id) => userById(id)?.name.toLowerCase() ?? '').join(' ')
      return t.title.toLowerCase().includes(ql) || t.id.toLowerCase().includes(ql) || attorney.includes(ql) || contribs.includes(ql)
    })
    .sort((a, b) => {
      const d = qSort.dir === 'asc' ? 1 : -1
      if (qSort.key === 'name') return a.title.localeCompare(b.title) * d
      if (qSort.key === 'counterparty') return (a.counterparty_name ?? '').localeCompare(b.counterparty_name ?? '') * d
      if (qSort.key === 'attorney') return (userById(a.assigned_attorney_id ?? '')?.name ?? '').localeCompare(userById(b.assigned_attorney_id ?? '')?.name ?? '') * d
      if (qSort.key === 'stage') return String(a.status).localeCompare(String(b.status)) * d
      if (qSort.key === 'comments') return (openCommentsFor(a) - openCommentsFor(b)) * d
      return (daysOpen(a.created_date) - daysOpen(b.created_date)) * d
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openTickets, stageFilter, ql, qSort])
  const onQueueSort = (key: QueueSortKey) => setQSort((s) => toggleSort(key, s, (k) => k === 'name' || k === 'counterparty' || k === 'attorney'))

  // ---- Where I'm Tagged — my open comments/tags, with age + jump link ----
  const myTags = messages.filter((mm) => mm.mentions?.includes(cu.id) && !mm.resolved)
    .map((mm) => ({ msg: mm, ag: allAgreements.find((a) => a.id === mm.agreement_id), tk: allTickets.find((t) => t.id === mm.ticket_id), age: daysOpen(mm.created_date.slice(0, 10)) }))
    .sort((a, b) => b.age - a.age)

  // ---- Admin analytics: tagged-item aging across the team ----
  const allOpenTags = messages.filter((mm) => mm.mentions?.length && !mm.resolved)
    .flatMap((mm) => (mm.mentions ?? []).map((uid) => ({ msg: mm, uid, ag: allAgreements.find((a) => a.id === mm.agreement_id), age: daysOpen(mm.created_date.slice(0, 10)) })))
    .sort((a, b) => b.age - a.age)

  return (
    <div className="h-full overflow-y-auto p-6">
      {modalOpen && <CreateTicketModal onClose={() => setModalOpen(false)} />}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-[13px] text-slate-500">{leader ? 'All active matters across the legal team' : `Matters visible to you as ${ROLE_LABEL[cu.role]}`} — as of Jun 27, 2026.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Open Ticket</Button>
        </div>
      </div>

      {/* ============ PRIMARY: My Open Tickets work queue ============ */}
      <Card className="mb-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <SectionLabel>My Open Tickets · {queue.length}</SectionLabel>
          <SearchBox value={q} onChange={setQ} placeholder="Search name, #, attorney, contributor…" className="ml-auto w-64" />
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2">
          {stages.map((st) => (
            <button key={st} onClick={() => setStageFilter(st)} className={clsx('rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold transition', stageFilter === st ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>{st}</button>
          ))}
        </div>
        <table className="w-full text-left text-[12.5px]">
          <thead><tr className="border-b border-slate-100 text-[10.5px] uppercase tracking-wide text-slate-400">
            <th className="px-4 py-2 font-semibold">Ticket #</th>
            <SortHeader sortKey="name" active={qSort.key === 'name'} dir={qSort.dir} onSort={onQueueSort}>Ticket name</SortHeader>
            <SortHeader sortKey="counterparty" active={qSort.key === 'counterparty'} dir={qSort.dir} onSort={onQueueSort}>Counterparty</SortHeader>
            <th className="px-2 py-2 font-semibold">Type</th>
            <SortHeader sortKey="attorney" active={qSort.key === 'attorney'} dir={qSort.dir} onSort={onQueueSort}>Attorney</SortHeader>
            <th className="px-2 py-2 font-semibold">Contributors</th>
            <SortHeader sortKey="stage" active={qSort.key === 'stage'} dir={qSort.dir} onSort={onQueueSort}>Stage</SortHeader>
            <SortHeader sortKey="days" active={qSort.key === 'days'} dir={qSort.dir} onSort={onQueueSort}>Days open</SortHeader>
            <SortHeader sortKey="comments" active={qSort.key === 'comments'} dir={qSort.dir} onSort={onQueueSort}>Open comments</SortHeader>
          </tr></thead>
          <tbody>
            {queue.map((t) => {
              const d = daysOpen(t.created_date)
              const oc = openCommentsFor(t)
              return (
                <tr key={t.id} onClick={() => openTicket(t.id)} className="cursor-pointer border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-[11px] text-slate-400">{t.id}</td>
                  <td className="max-w-[220px] truncate px-2 py-2 font-semibold text-slate-700">{t.title}</td>
                  <td className="px-2 py-2">{t.counterparty_name && t.counterparty_name !== '—' ? <span className="text-slate-600">{t.counterparty_name}</span> : <Chip className="bg-violet-50 text-violet-700 ring-violet-500/20">General Inquiry</Chip>}</td>
                  <td className="px-2 py-2"><Chip className={t.type === 'inquiry' ? 'bg-violet-50 text-violet-700 ring-violet-500/20' : 'bg-sky-50 text-sky-700 ring-sky-500/20'}>{kindLabel(t)}</Chip></td>
                  <td className="px-2 py-2">{t.assigned_attorney_id ? <span className="flex items-center gap-1.5"><Avatar userId={t.assigned_attorney_id} size={18} />{userById(t.assigned_attorney_id)?.name.split(' ')[0]}</span> : <span className="text-slate-400">—</span>}</td>
                  <td className="px-2 py-2"><span className="flex -space-x-1.5">{contributorsFor(t).map((id) => <span key={id} className="rounded-full ring-2 ring-white"><Avatar userId={id} size={18} /></span>)}</span></td>
                  <td className="px-2 py-2"><Chip className="bg-slate-100 text-slate-600 ring-slate-300/30">{String(t.status)}</Chip></td>
                  <td className="px-2 py-2"><Chip className={clsx('ring-1 ring-inset', daysChip(d))}>{d}d</Chip></td>
                  <td className="px-2 py-2">{oc > 0 ? <span className="flex items-center gap-1 font-semibold text-amber-600"><AtSign size={11} /> {oc}</span> : <span className="text-slate-300">0</span>}</td>
                </tr>
              )
            })}
            {queue.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-[12.5px] text-slate-400">No open tickets match.</td></tr>}
          </tbody>
        </table>
      </Card>

      {/* ============ By counterparty (directly below the queue) ============ */}
      <Card className="mb-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <SectionLabel>By counterparty · {cpRows.length}</SectionLabel>
          <SearchBox value={cpQ} onChange={setCpQ} placeholder="Search counterparty…" className="w-64" />
        </div>
        <table className="w-full text-left text-[12.5px]">
          <thead><tr className="border-b border-slate-100 text-[10.5px] uppercase tracking-wide text-slate-400">
            <SortHeader sortKey="counterparty" active={cpSort.key === 'counterparty'} dir={cpSort.dir} onSort={onCpSort} className="px-4">Counterparty</SortHeader>
            <SortHeader sortKey="open" active={cpSort.key === 'open'} dir={cpSort.dir} onSort={onCpSort}>Open items</SortHeader>
            <SortHeader sortKey="stage" active={cpSort.key === 'stage'} dir={cpSort.dir} onSort={onCpSort}>Latest stage</SortHeader>
            <th className="px-2 py-2 font-semibold">Turn</th><th className="px-2 py-2 font-semibold">Owner</th>
            <SortHeader sortKey="value" active={cpSort.key === 'value'} dir={cpSort.dir} onSort={onCpSort}>Value</SortHeader>
            <th className="px-2 py-2" />
          </tr></thead>
          <tbody>
            {cpRows.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-[12.5px] text-slate-400">No counterparties match.</td></tr>}
            {cpRows.map((r) => (
              <tr key={r.counterparty} onClick={() => openTicket(r.ticketId)} className="cursor-pointer border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2 font-semibold text-slate-700">{r.counterparty}</td>
                <td className="px-2 py-2 text-slate-600">{r.openCount}</td>
                <td className="px-2 py-2"><Chip className={agreementStatusMeta[r.stages[r.stages.length - 1]]?.chip ?? 'bg-slate-100 text-slate-500'}>{agreementStatusMeta[r.stages[r.stages.length - 1]]?.label ?? '—'}</Chip></td>
                <td className="px-2 py-2"><Chip className={ballChip(r.ball)}>{r.ball === 'cp_legal' ? 'In our court' : r.ball === 'counterparty' ? 'Counterparty' : 'Mixed'}</Chip></td>
                <td className="px-2 py-2">{r.attorneyId ? <Avatar userId={r.attorneyId} size={18} /> : <span className="text-slate-400">—</span>}</td>
                <td className="px-2 py-2 text-slate-500">{fmtMoney(r.value)}</td>
                <td className="px-2 py-2 text-right"><ChevronRight size={14} className="inline text-slate-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className={clsx('mb-4 grid gap-3', (cu.role === 'initiator' || cu.role === 'contributor') ? 'grid-cols-1' : 'grid-cols-2')}>
        {/* ============ Where I'm Tagged ============ */}
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <SectionLabel className="flex items-center gap-1.5"><AtSign size={13} className="text-amber-500" /> Where I'm tagged · {myTags.length}</SectionLabel>
            <button onClick={() => openCanvas({ view: 'queue' })} className="text-[11.5px] font-semibold text-ai-600 hover:underline">View all →</button>
          </div>
          <div className="space-y-1.5">
            {myTags.length === 0 && <div className="py-3 text-center text-[12px] text-slate-400">Nothing is waiting on you. 🎉</div>}
            {myTags.slice(0, 4).map(({ msg, ag, tk, age }) => (
              <button key={msg.id} onClick={() => { if (ag) { openAgreement(ag.id, 'review'); navigate({ reviewFocusRef: msg.provision_reference }) } else if (tk) openTicket(tk.id) }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
                <Avatar userId={msg.author_id} size={18} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold text-slate-700">{ag?.title ?? tk?.title ?? 'Ticket'}{msg.provision_reference ? ` · ${msg.provision_reference}` : ''}</div>
                  <div className="truncate text-[11px] text-slate-400">{msg.body}</div>
                </div>
                <Chip className={clsx('ring-1 ring-inset', daysChip(age))}>{age}d</Chip>
                <ChevronRight size={13} className="shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        </Card>

        {/* ============ Needs attention (kept, compact) — not for initiators or contributors:
            it's a triage/decision surface (red lines, deviations), not tracking/reading a deal. */}
        {cu.role !== 'initiator' && cu.role !== 'contributor' && (
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-600" /><SectionLabel className="text-amber-700">Needs attention</SectionLabel></div>
            <div className="space-y-1.5">
              {m.attention.slice(0, 4).map((a, i) => (
                <button key={i} onClick={() => (a.agreementId ? openAgreement(a.agreementId, 'review') : a.ticketId ? openTicket(a.ticketId) : undefined)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ring-1 ring-transparent hover:bg-slate-50">
                  {attnIcon[a.kind]}
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-slate-700">{a.label}</span>
                  <ChevronRight size={13} className="shrink-0 text-slate-300" />
                </button>
              ))}
              {m.attention.length === 0 && <div className="py-3 text-center text-[12px] text-slate-400">All clear.</div>}
            </div>
          </Card>
        )}
      </div>

      {/* ============ Admin analytics: tagged-item aging ============ */}
      {cu.role === 'administrator' && (
        <Card className="mb-4 p-4">
          <div className="mb-2 flex items-center gap-2"><BellRing size={14} className="text-violet-600" /><SectionLabel className="text-violet-700">Tagged-item aging — team oversight</SectionLabel></div>
          <div className="space-y-1.5">
            {allOpenTags.slice(0, 5).map(({ msg, uid, ag, age }, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <Avatar userId={uid} size={18} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-700">
                  <b>{userById(uid)?.name.split(' ')[0]}</b> — {ag?.title ?? 'Ticket'} {msg.provision_reference ? `clause ${msg.provision_reference.replace('§', '')}` : ''} — tagged <b className={daysColor(age)}>{age} days</b> — no response
                </span>
                <Button size="sm" variant="outline" onClick={() => setToast(`Reminder sent to ${userById(uid)?.name.split(' ')[0]}.`)}>Nudge</Button>
              </div>
            ))}
          </div>
          {/* future-task framing — the agent builds tasks around unresolved comments */}
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-ai-200 bg-ai-50/40 px-3 py-2 text-[12px] text-ai-800">
            <Bot size={13} className="shrink-0 text-ai-600" /> Agent scheduled: nudge Daniel tomorrow 9 AM if still unresolved.
          </div>
        </Card>
      )}

      {/* ============ Secondary KPIs ============ */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <Kpi label="Open agreements" value={m.openAgreements} sub={`${m.byCounterparty.length} counterparties`} icon={<FileText size={16} />} onClick={() => openContracts('active')} />
        <Kpi label="Ball in our court" value={`${m.ballCp.length}/${m.openAgreements}`} sub={`${m.ballCounterparty.length} waiting on counterparty`} icon={<Scale size={16} />} accent="text-brand-700" onClick={() => openContracts('cp_turn')} />
        <Kpi label="At SLA risk" value={m.slaAtRisk} sub={`${m.slaBreach} breached · ${m.slaWarning} warning`} icon={<AlertTriangle size={16} />} accent={m.slaAtRisk > 0 ? 'text-red-600' : 'text-slate-800'} onClick={() => openContracts('sla_risk')} />
        <Kpi label="Open value" value={fmtMoney(m.openExposure)} sub={`Avg cycle ${m.avgCycleDays != null ? m.avgCycleDays + 'd' : '—'}`} icon={<DollarSign size={16} />} onClick={() => openContracts('active')} />
      </div>

      <div className="mt-3 text-center text-[11px] text-slate-400">As of {fmtDate('2026-06-27T00:00:00')} · ChargePoint Legal · Enterprise CLM</div>
    </div>
  )
}
