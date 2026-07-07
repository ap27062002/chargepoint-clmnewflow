// Dashboard §1 — "Open Ticket". Two shapes:
// - Agreement Negotiation: single/multiple checkbox, template multi-select (or upload your
//   own), counterparty. Routes through the SAME wizard pipeline as the chat flow
//   (negotiationWizard → confirmNegotiationWizard), so drafts materialize identically.
//   Attorney assignment is automatic (routing engine) — no manual dropdown.
// - General Legal Support: one question — your query. Creates an inquiry ticket with an
//   agent-drafted first response (createInquiry).
import { useState } from 'react'
import { clsx } from 'clsx'
import { X, UploadCloud, Ticket as TicketIcon, Check, ChevronDown } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Chip } from '@/components/ui'

const KNOWN_CPS = ['Vishay Intertechnology', 'Airbus', 'Northwind Energy', 'Mondelez International', 'Clever Devices', 'Metro Transit Authority', 'Aptiv PLC', 'TE Connectivity', 'Rivian', 'Siemens', 'Panasonic Energy']

export function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const templates = useStore((s) => s.templates)
  const createInquiry = useStore((s) => s.createInquiry)
  const startNegotiationWizard = useStore((s) => s.startNegotiationWizard)
  const setWizardScope = useStore((s) => s.setWizardScope)
  const setWizardSource = useStore((s) => s.setWizardSource)
  const setWizardCounterparty = useStore((s) => s.setWizardCounterparty)
  const confirmNegotiationWizard = useStore((s) => s.confirmNegotiationWizard)

  const [kind, setKind] = useState<'negotiation' | 'support'>('negotiation')
  const [title, setTitle] = useState('')
  const [multiple, setMultiple] = useState(false)
  const [sourceMode, setSourceMode] = useState<'template' | 'upload'>('template')
  const [templateIds, setTemplateIds] = useState<string[]>([])
  const [ddOpen, setDdOpen] = useState(false)
  const [files, setFiles] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [cp, setCp] = useState('')
  const [query, setQuery] = useState('')

  const toggleTemplate = (id: string) => {
    if (!multiple) { setTemplateIds([id]); setDdOpen(false) }
    else setTemplateIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }
  const setScope = (multi: boolean) => {
    setMultiple(multi)
    if (!multi) { setTemplateIds((s) => s.slice(0, 1)); setFiles((f) => f.slice(0, 1)) }
  }
  const addFile = (names?: string[]) => {
    const incoming = names?.length ? names : [`Uploaded_draft_${files.length + 1}.docx`]
    setFiles((f) => (multiple ? [...f, ...incoming] : incoming.slice(0, 1)))
  }

  const canCreate = kind === 'support'
    ? !!query.trim()
    : !!cp.trim() && (sourceMode === 'template' ? templateIds.length > 0 : files.length > 0)

  const submit = () => {
    if (!canCreate) return
    if (kind === 'support') {
      createInquiry(query.trim())
    } else {
      // Same pipeline as the chat wizard — drafts materialize with real clause bodies.
      startNegotiationWizard()
      setWizardScope(multiple ? 'multiple' : 'single')
      setWizardSource(sourceMode === 'template' ? { sourceMode: 'template', templateIds } : { sourceMode: 'upload', uploadedFiles: files })
      setWizardCounterparty(cp.trim())
      confirmNegotiationWizard(title.trim() || undefined)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-pop">
        <div className="mb-3 flex items-center gap-2">
          <TicketIcon size={17} className="text-brand-600" />
          <h2 className="text-[15px] font-bold text-slate-800">Open a ticket</h2>
          <button onClick={onClose} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>

        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Ticket type</div>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {([['negotiation', 'Agreement Negotiation', 'Draft from a template or your own document'], ['support', 'General Legal Support', 'No agreement — questions, RFP reviews, guidance']] as const).map(([k, label, sub]) => (
            <button key={k} onClick={() => setKind(k)} className={clsx('rounded-xl border p-2.5 text-left transition', kind === k ? 'border-brand-400 bg-brand-50/60' : 'border-slate-200 hover:bg-slate-50')}>
              <div className={clsx('text-[12.5px] font-bold', kind === k ? 'text-brand-700' : 'text-slate-700')}>{label}</div>
              <div className="mt-0.5 text-[10.5px] leading-snug text-slate-400">{sub}</div>
            </button>
          ))}
        </div>

        {kind === 'support' ? (
          <>
            {/* One question — the agent drafts a first response and opens the ticket. */}
            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Enter your query</label>
            <textarea autoFocus value={query} onChange={(e) => setQuery(e.target.value)} rows={3}
              placeholder="e.g. Can we sign Aptiv's mutual NDA on their paper? What's our exposure on the indemnity clause?"
              className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] outline-none focus:border-brand-400" />
            <div className="mt-1 text-[11px] text-slate-400">The agent drafts a first response from the playbook + executed precedent; an attorney is routed automatically.</div>
          </>
        ) : (
          <>
            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Ticket title <span className="font-normal normal-case text-slate-300">· optional</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rivian charging pilot — NDA + MSA"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] outline-none focus:border-brand-400" />

            {/* Single vs multiple agreements */}
            <label className="mt-3 flex cursor-pointer items-center gap-2" onClick={() => setScope(!multiple)}>
              <span className={clsx('flex h-4 w-4 shrink-0 items-center justify-center rounded border transition', multiple ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white')}>{multiple && <Check size={11} />}</span>
              <span className="text-[12.5px] font-semibold text-slate-700">Multiple agreements</span>
              <span className="text-[11px] text-slate-400">— this deal has more than one document</span>
            </label>

            {/* Template to use — or upload your own */}
            <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Template to use</div>
            <div className="mt-1 flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button onClick={() => setSourceMode('template')} className={clsx('flex-1 rounded-md py-1 text-[11.5px] font-semibold transition', sourceMode === 'template' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500')}>Use a template</button>
              <button onClick={() => setSourceMode('upload')} className={clsx('flex-1 rounded-md py-1 text-[11.5px] font-semibold transition', sourceMode === 'upload' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500')}>Upload my own</button>
            </div>
            {sourceMode === 'template' ? (
              <div className="relative mt-2">
                <button onClick={() => setDdOpen((v) => !v)} className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-left text-[13px] text-slate-700">
                  <span className="truncate">{templateIds.length === 0 ? `Select template${multiple ? '(s)' : ''}…` : templates.filter((t) => templateIds.includes(t.id)).map((t) => t.name).join(', ')}</span>
                  <ChevronDown size={14} className={clsx('shrink-0 text-slate-400 transition', ddOpen && 'rotate-180')} />
                </button>
                {ddOpen && (
                  <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-pop">
                    {templates.map((t) => {
                      const on = templateIds.includes(t.id)
                      return (
                        <button key={t.id} onClick={() => toggleTemplate(t.id)} className={clsx('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition', on ? 'bg-brand-50 text-slate-700' : 'text-slate-600 hover:bg-slate-50')}>
                          <span className={clsx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300')}>{on && <Check size={11} />}</span>
                          <span className="truncate font-medium">{t.name}</span>
                          <Chip className="ml-auto shrink-0 bg-slate-100 text-slate-400 ring-slate-200">{t.agreement_type}</Chip>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const names = Array.from(e.dataTransfer.files ?? []).map((f) => f.name); addFile(names) }}
                  onClick={() => addFile()}
                  className={clsx('mt-2 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition', dragOver ? 'border-brand-400 bg-brand-50/50' : 'border-slate-300 hover:border-brand-300')}
                >
                  <UploadCloud size={20} className="mb-1 text-slate-400" />
                  <div className="text-[12.5px] font-semibold text-slate-600">Drag & drop {multiple ? 'one or more documents' : 'your document'}</div>
                  <div className="text-[10.5px] text-slate-400">.docx or .pdf — or click to add a sample file</div>
                </div>
                {files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {files.map((f, i) => (
                      <Chip key={i} className="bg-slate-100 text-slate-600 ring-slate-300/40">
                        {f}
                        <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="ml-0.5 text-slate-400 hover:text-slate-600"><X size={10} /></button>
                      </Chip>
                    ))}
                  </div>
                )}
              </>
            )}

            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Counterparty name</label>
            <input list="ctm-cps" value={cp} onChange={(e) => setCp(e.target.value)} placeholder="Search or type a counterparty…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] outline-none focus:border-brand-400" />
            <datalist id="ctm-cps">{KNOWN_CPS.map((c) => <option key={c} value={c} />)}</datalist>
            <div className="mt-1 text-[11px] text-slate-400">The attorney is assigned automatically by the routing engine.</div>
          </>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!canCreate}>Create ticket</Button>
        </div>
      </div>
    </div>
  )
}
