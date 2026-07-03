// Dashboard §1 — "Open Ticket": create a ticket with or without agreements.
// Support tickets ("General Legal Support") carry no document but get a deal page
// with Deal Discussion + Open/In Progress/Resolved stage tracking.
import { useState } from 'react'
import { clsx } from 'clsx'
import { X, UploadCloud, FileText, Ticket as TicketIcon } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Chip } from '@/components/ui'

const KNOWN_CPS = ['Vishay Intertechnology', 'Airbus', 'Northwind Energy', 'Mondelez International', 'Clever Devices', 'Metro Transit Authority', 'Aptiv PLC', 'TE Connectivity', 'Rivian', 'Siemens', 'Panasonic Energy']

export function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const users = useStore((s) => s.users)
  const createTicketFull = useStore((s) => s.createTicketFull)
  const attorneys = users.filter((u) => u.role === 'attorney' || u.role === 'playbook_owner')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'negotiation' | 'support'>('negotiation')
  const [cp, setCp] = useState('')
  const [attorneyId, setAttorneyId] = useState(attorneys[0]?.id ?? '')
  const [files, setFiles] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)

  const submit = () => {
    if (!title.trim()) return
    createTicketFull({ title: title.trim(), kind, counterparty: cp.trim() || undefined, files, attorneyId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-pop">
        <div className="mb-3 flex items-center gap-2">
          <TicketIcon size={17} className="text-brand-600" />
          <h2 className="text-[15px] font-bold text-slate-800">Open a ticket</h2>
          <button onClick={onClose} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>

        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Ticket title</label>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rivian charging pilot — NDA + MSA"
          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] outline-none focus:border-brand-400" />

        <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Ticket type</div>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {([['negotiation', 'Agreement Negotiation', 'Documents attached — redlines, playbook review, e-sign'], ['support', 'General Legal Support', 'No agreement — questions, RFP reviews, guidance']] as const).map(([k, label, sub]) => (
            <button key={k} onClick={() => setKind(k)} className={clsx('rounded-xl border p-2.5 text-left transition', kind === k ? 'border-brand-400 bg-brand-50/60' : 'border-slate-200 hover:bg-slate-50')}>
              <div className={clsx('text-[12.5px] font-bold', kind === k ? 'text-brand-700' : 'text-slate-700')}>{label}</div>
              <div className="mt-0.5 text-[10.5px] leading-snug text-slate-400">{sub}</div>
            </button>
          ))}
        </div>

        <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Counterparty <span className="font-normal normal-case text-slate-300">· optional</span></label>
        <input list="ctm-cps" value={cp} onChange={(e) => setCp(e.target.value)} placeholder="Search or type a counterparty…"
          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] outline-none focus:border-brand-400" />
        <datalist id="ctm-cps">{KNOWN_CPS.map((c) => <option key={c} value={c} />)}</datalist>

        {kind === 'negotiation' && (
          <>
            <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Agreement files</div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const names = Array.from(e.dataTransfer.files ?? []).map((f) => f.name); setFiles((p) => [...p, ...(names.length ? names : ['Agreement.docx'])]) }}
              onClick={() => setFiles((p) => [...p, p.length === 0 ? 'Rivian_MSA_draft.docx' : 'Rivian_NDA.docx'])}
              className={clsx('mt-1 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition', dragOver ? 'border-brand-400 bg-brand-50/50' : 'border-slate-300 hover:border-brand-300')}
            >
              <UploadCloud size={20} className="mb-1 text-slate-400" />
              <div className="text-[12.5px] font-semibold text-slate-600">Drag & drop one or more agreements</div>
              <div className="text-[10.5px] text-slate-400">.docx or .pdf — or click to add a sample file</div>
            </div>
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <Chip key={i} className="bg-slate-100 text-slate-600 ring-slate-300/40">
                    <FileText size={10} /> {f}
                    <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="ml-0.5 text-slate-400 hover:text-slate-600"><X size={10} /></button>
                  </Chip>
                ))}
              </div>
            )}
          </>
        )}

        <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Assigned attorney</label>
        <select value={attorneyId} onChange={(e) => setAttorneyId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px] outline-none">
          {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.title}</option>)}
        </select>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!title.trim()}>Create ticket</Button>
        </div>
      </div>
    </div>
  )
}
