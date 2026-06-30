import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Table, Search, X, ArrowDown, ArrowUp } from 'lucide-react'
import { useStore } from '@/store'
import { Chip, Avatar, Empty } from '@/components/ui'
import { agreementStatusMeta, ticketTypeLabel, fmtDate } from '@/lib/labels'
import { fmtMoney } from '@/lib/analytics'
import { visibleTickets } from '@/lib/scope'
import { buildRows, type ContractRow } from '@/lib/contracts'
import { userById } from '@/data/seed'
import type { ContractsFilterPreset } from '@/types'

const PRESET_LABEL: Record<ContractsFilterPreset, string> = {
  all: 'All contracts', active: 'Active only', cp_turn: 'In our court', counterparty_turn: 'Waiting on counterparty', sla_risk: 'SLA at risk', executed: 'Executed',
}
const presetPred = (preset: ContractsFilterPreset) => (r: ContractRow): boolean => {
  switch (preset) {
    case 'active': return !r.executed
    case 'cp_turn': return !r.executed && r.ball === 'cp_legal'
    case 'counterparty_turn': return !r.executed && r.ball === 'counterparty'
    case 'sla_risk': return !r.executed && r.slaState !== 'ok'
    case 'executed': return r.executed
    default: return true
  }
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 outline-none focus:border-ai-400">
      {children}
    </select>
  )
}

type SortKey = 'days' | 'name' | 'date' | 'stage'

export function ContractsList() {
  const allTickets = useStore((s) => s.tickets)
  const agreements = useStore((s) => s.agreements)
  const messages = useStore((s) => s.messages)
  const cu = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!)
  const presetFromCanvas = useStore((s) => s.canvas.contractsFilter)
  const openAgreement = useStore((s) => s.openAgreement)

  const [preset, setPreset] = useState<ContractsFilterPreset>(presetFromCanvas ?? 'all')
  const [q, setQ] = useState('')
  const [turn, setTurn] = useState<'all' | 'cp_legal' | 'counterparty'>('all')
  const [stage, setStage] = useState<string>('all')
  const [cp, setCp] = useState<string>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'days', dir: 'desc' })

  // Re-sync when a dashboard KPI deep-links with a different preset.
  useEffect(() => { if (presetFromCanvas) setPreset(presetFromCanvas) }, [presetFromCanvas])

  // RBAC scope, then build one row per visible agreement.
  const tickets = visibleTickets(allTickets, messages, cu)
  const ticketIds = new Set(tickets.map((t) => t.id))
  const scoped = agreements.filter((a) => ticketIds.has(a.ticket_id))
  const rows = buildRows(scoped, tickets)

  const counterparties = Array.from(new Set(rows.map((r) => r.counterparty))).sort()
  const ql = q.toLowerCase().trim()
  const filtered = rows
    .filter(presetPred(preset))
    .filter((r) => turn === 'all' || (!r.executed && r.ball === turn))
    .filter((r) => stage === 'all' || r.stage === stage)
    .filter((r) => cp === 'all' || r.counterparty === cp)
    .filter((r) => !ql || r.name.toLowerCase().includes(ql) || r.counterparty.toLowerCase().includes(ql))

  const sorted = [...filtered].sort((a, b) => {
    const d = sort.dir === 'asc' ? 1 : -1
    if (sort.key === 'name') return a.name.localeCompare(b.name) * d
    if (sort.key === 'date') return (new Date(a.agreementDate).getTime() - new Date(b.agreementDate).getTime()) * d
    if (sort.key === 'stage') return (a.stageIdx - b.stageIdx) * d
    return (a.daysWaiting - b.daysWaiting) * d
  })

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }))
  const SortHead = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={clsx('cursor-pointer select-none px-2 py-2 font-semibold hover:text-slate-600', className)} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">{children}{sort.key === k && (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}</span>
    </th>
  )
  const clearAll = () => { setPreset('all'); setQ(''); setTurn('all'); setStage('all'); setCp('all') }
  const presetActive = preset !== 'all'
  const filtersActive = presetActive || !!ql || turn !== 'all' || stage !== 'all' || cp !== 'all'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 pt-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-slate-800">All contracts</h1>
            <p className="text-[12.5px] text-slate-500">{sorted.length} of {rows.length} agreements · {cu.role === 'administrator' || cu.role === 'playbook_owner' ? 'full portfolio' : 'matters visible to you'}</p>
          </div>
        </div>
        {/* Toolbar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pb-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
            <Search size={13} className="text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or counterparty…" className="w-48 text-[12.5px] outline-none placeholder:text-slate-400" />
          </div>
          <Select value={preset} onChange={(v) => setPreset(v as ContractsFilterPreset)}>
            {(Object.keys(PRESET_LABEL) as ContractsFilterPreset[]).map((p) => <option key={p} value={p}>{PRESET_LABEL[p]}</option>)}
          </Select>
          <Select value={turn} onChange={(v) => setTurn(v as typeof turn)}>
            <option value="all">Any turn</option><option value="cp_legal">In our court</option><option value="counterparty">Counterparty</option>
          </Select>
          <Select value={stage} onChange={setStage}>
            <option value="all">Any stage</option>
            {(['draft', 'internal_review', 'sent_to_counterparty', 'redline_received', 'pending_execution', 'executed'] as const).map((s) => <option key={s} value={s}>{agreementStatusMeta[s].label}</option>)}
          </Select>
          <Select value={cp} onChange={setCp}>
            <option value="all">Any counterparty</option>
            {counterparties.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          {filtersActive && <button onClick={clearAll} className="flex items-center gap-1 text-[12px] font-semibold text-slate-400 hover:text-slate-600"><X size={12} /> Clear</button>}
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
        {sorted.length === 0 ? (
          <Empty icon={<Table size={28} className="text-slate-300" />} title="No contracts match" sub="Adjust the filters or clear them." />
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                <SortHead k="name" className="px-2">Contract</SortHead>
                <th className="px-2 py-2 font-semibold">Type</th>
                <SortHead k="stage">Stage</SortHead>
                <SortHead k="days">Turn</SortHead>
                <th className="px-2 py-2 font-semibold">CP owner</th>
                <th className="px-2 py-2 font-semibold">Value</th>
                <SortHead k="date">Date</SortHead>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.agreementId} onClick={() => openAgreement(r.agreementId, 'review')} className="cursor-pointer border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-2 py-2.5">
                    <div className="font-semibold text-slate-700">{r.name}</div>
                    <div className="text-[11px] text-slate-400">{r.counterparty}</div>
                  </td>
                  <td className="px-2 py-2.5"><span className="text-[12px] text-slate-500">{r.type}</span></td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-ai-500" style={{ width: `${((r.stageIdx + 1) / r.stageTotal) * 100}%` }} /></div>
                      <Chip className={agreementStatusMeta[r.stage].chip}>{agreementStatusMeta[r.stage].label}</Chip>
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    {r.executed ? <span className="text-[12px] text-slate-400">—</span> : (
                      <div className="flex items-center gap-1.5">
                        <Chip className={r.ball === 'cp_legal' ? 'bg-brand-50 text-brand-700 ring-brand-500/20' : 'bg-slate-100 text-slate-600 ring-slate-300/30'}>
                          {r.ball === 'cp_legal' ? 'In our court' : 'Counterparty'}
                        </Chip>
                        <span className={clsx('text-[11px] font-semibold', r.daysWaiting >= 12 ? 'text-red-600' : r.daysWaiting >= 7 ? 'text-amber-600' : 'text-slate-400')}>{r.daysWaiting}d</span>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    {r.attorneyId ? <div className="flex items-center gap-1.5"><Avatar userId={r.attorneyId} size={20} /><span className="text-[12px] text-slate-600">{userById(r.attorneyId)?.name.split(' ')[0]}</span></div> : <span className="text-[12px] text-slate-400">Unassigned</span>}
                  </td>
                  <td className="px-2 py-2.5"><span className="text-[12px] text-slate-500">{fmtMoney(r.value)}</span></td>
                  <td className="px-2 py-2.5"><span className="text-[12px] text-slate-500">{fmtDate(r.agreementDate)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
