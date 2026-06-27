import { useState } from 'react'
import { clsx } from 'clsx'
import { ShieldCheck, Link2, Bot } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Avatar, SectionLabel } from '@/components/ui'
import { auditLabel, fmtDateTime } from '@/lib/labels'
import type { AuditEventType } from '@/types'

const eventTone: Partial<Record<AuditEventType, string>> = {
  sla_breached: 'bg-red-50 text-red-700 ring-red-500/20',
  approval_denied: 'bg-red-50 text-red-700 ring-red-500/20',
  signature_completed: 'bg-brand-50 text-brand-700 ring-brand-500/20',
  document_sent: 'bg-sky-50 text-sky-700 ring-sky-500/20',
  deviation_identified: 'bg-amber-50 text-amber-700 ring-amber-500/20',
  playbook_updated: 'bg-indigo-50 text-indigo-700 ring-indigo-500/20',
}

export function AuditView() {
  const audit = useStore((s) => s.audit)
  const [filter, setFilter] = useState<'all' | AuditEventType>('all')
  const rows = [...audit].reverse().filter((e) => filter === 'all' || e.event_type === filter)
  const types = Array.from(new Set(audit.map((e) => e.event_type)))

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-6 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-brand-600" />
          <h1 className="text-xl font-bold text-slate-800">Audit Center</h1>
          <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20"><Link2 size={11} /> Immutable · hash-chained</Chip>
        </div>
        <p className="text-[13px] text-slate-500">Every action creates a tamper-evident audit event. Retention: 7 years · Regional residency enforced.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button onClick={() => setFilter('all')} className={clsx('rounded-full px-2.5 py-1 text-[11.5px] font-semibold', filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500')}>All ({audit.length})</button>
          {types.map((t) => (
            <button key={t} onClick={() => setFilter(t)} className={clsx('rounded-full px-2.5 py-1 text-[11.5px] font-semibold', filter === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500')}>{auditLabel[t]}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Card className="overflow-hidden">
          <table className="w-full text-left text-[12.5px]">
            <thead><tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2 font-semibold">Event</th><th className="px-2 py-2 font-semibold">Actor</th>
              <th className="px-2 py-2 font-semibold">Detail</th><th className="px-2 py-2 font-semibold">Timestamp</th><th className="px-2 py-2 font-semibold">Hash</th>
            </tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2.5"><Chip className={clsx('ring-1 ring-inset', eventTone[e.event_type] ?? 'bg-slate-100 text-slate-600 ring-slate-300/40')}>{auditLabel[e.event_type]}</Chip></td>
                  <td className="px-2 py-2.5">
                    {e.actor_id === 'ai_engine'
                      ? <span className="flex items-center gap-1.5 text-ai-600"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-ai-100"><Bot size={12} /></span> CLM Agent</span>
                      : <span className="flex items-center gap-1.5 text-slate-600"><Avatar userId={e.actor_id} size={20} /> {useStore.getState().users.find((u) => u.id === e.actor_id)?.name.split(' ')[0]}</span>}
                  </td>
                  <td className="px-2 py-2.5 text-slate-600">{e.summary}{(e.ticket_id || e.agreement_id) && <span className="ml-1 font-mono text-[11px] text-slate-300">{e.ticket_id ?? e.agreement_id}</span>}</td>
                  <td className="px-2 py-2.5 whitespace-nowrap text-slate-400">{fmtDateTime(e.timestamp)}</td>
                  <td className="px-2 py-2.5"><span className="font-mono text-[11px] text-slate-400">{e.hash}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="mt-3 text-center text-[11px] text-slate-400">Each hash chains the previous event — any tampering breaks the chain.</div>
      </div>
    </div>
  )
}
