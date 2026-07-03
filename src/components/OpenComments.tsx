// Comments §1 — the Open Comments report: NOT inert Word comments. Every open comment
// on a document, with who's tagged, age, status, a Send-reminder action and an export.
import { X, Download, BellRing, AtSign } from 'lucide-react'
import { useStore } from '@/store'
import { Chip, Button, Avatar } from '@/components/ui'
import { userById } from '@/data/seed'
import { AS_OF } from '@/lib/analytics'

const age = (created: string) => Math.max(0, Math.round((new Date(AS_OF).getTime() - new Date(created.slice(0, 10)).getTime()) / 86400000))
const ageChip = (d: number) => (d > 10 ? 'bg-red-50 text-red-700 ring-red-500/20' : d > 5 ? 'bg-amber-50 text-amber-700 ring-amber-500/20' : 'bg-slate-100 text-slate-500 ring-slate-300/30')

export function OpenCommentsModal({ agreementId, ticketId, title, onClose }: { agreementId?: string; ticketId: string; title: string; onClose: () => void }) {
  const messages = useStore((s) => s.messages)
  const setToast = useStore((s) => s.setToast)
  const rows = messages
    .filter((m) => (agreementId ? m.agreement_id === agreementId : m.ticket_id === ticketId && m.thread_type === 'agreement_level'))
    .filter((m) => !m.resolved)
    .map((m) => ({ m, days: age(m.created_date) }))
    .sort((a, b) => b.days - a.days)

  const exportReport = () => {
    const csv = ['comment,clause,tagged,age_days,status', ...rows.map(({ m, days }) => `"${m.body.slice(0, 60).replace(/"/g, "'")}",${m.provision_reference ?? ''},"${(m.mentions ?? []).map((id) => userById(id)?.name).join('; ')}",${days},open`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `Open_Comments_${title.replace(/\s+/g, '_')}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
    setToast('Open-comments report exported.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-pop">
        <div className="mb-1 flex items-center gap-2">
          <AtSign size={15} className="text-amber-500" />
          <h3 className="text-[14px] font-bold text-slate-800">Open comments — {title}</h3>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">{rows.length}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="outline" icon={<Download size={12} />} onClick={exportReport}>Export report</Button>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={15} /></button>
          </div>
        </div>
        <p className="mb-3 text-[11.5px] text-slate-400">Every unresolved comment on this document — with who's tagged and how long it has waited.</p>
        <div className="space-y-1.5">
          {rows.length === 0 && <div className="py-6 text-center text-[12.5px] text-slate-400">No open comments. 🎉</div>}
          {rows.map(({ m, days }) => (
            <div key={m.id} className="flex items-start gap-2.5 rounded-lg border border-slate-100 px-3 py-2">
              <Avatar userId={m.author_id} size={20} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] text-slate-700">{m.body}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                  {m.provision_reference && <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">{m.provision_reference}</Chip>}
                  {m.mentions?.length ? <span className="font-semibold text-amber-600">@ {m.mentions.map((id) => userById(id)?.name.split(' ')[0]).join(', ')}</span> : <span>no one tagged</span>}
                  <Chip className={ageChip(days)}>{days}d open</Chip>
                  <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">open</Chip>
                </div>
              </div>
              {m.mentions?.length ? (
                <Button size="sm" variant="outline" icon={<BellRing size={11} />} onClick={() => setToast(`Reminder sent to ${m.mentions!.map((id) => userById(id)?.name.split(' ')[0]).join(', ')}.`)}>Send reminder</Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
