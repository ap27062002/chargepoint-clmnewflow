import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { Bold, Italic, Underline, List, Table, Pilcrow, Check, X, Pencil, Eye, Plus, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import { can } from '@/lib/access'
import { Chip } from '@/components/ui'
import { riskMeta } from '@/lib/labels'
import type { DocRun } from '@/data/documents'

function ChangeRun({ run, versionId, editable }: { run: DocRun; versionId: string; editable: boolean }) {
  const acceptChange = useStore((s) => s.acceptChange)
  const rejectChange = useStore((s) => s.rejectChange)
  const cls = run.type === 'ins'
    ? (run.party === 'counterparty' ? 'tc-ins-cp' : 'tc-ins')
    : (run.party === 'counterparty' ? 'tc-del-cp' : 'tc-del')
  if (!run.cid || !editable) return <span className={cls}>{run.text}</span>
  return (
    <span className="group relative whitespace-normal">
      <span className={cls}>{run.text}</span>
      <span className="ml-0.5 inline-flex translate-y-[-1px] items-center gap-0.5 align-middle opacity-0 transition group-hover:opacity-100">
        <button onClick={() => acceptChange(versionId, run.cid!)} title="Accept change" className="inline-flex h-4 w-4 items-center justify-center rounded bg-brand-100 text-brand-700 hover:bg-brand-200"><Check size={10} /></button>
        <button onClick={() => rejectChange(versionId, run.cid!)} title="Reject change" className="inline-flex h-4 w-4 items-center justify-center rounded bg-red-100 text-red-700 hover:bg-red-200"><X size={10} /></button>
      </span>
    </span>
  )
}

function ClauseEditor({ versionId, clauseId }: { versionId: string; clauseId: string }) {
  const addTrackedChange = useStore((s) => s.addTrackedChange)
  const [text, setText] = useState('')
  const [kind, setKind] = useState<'ins' | 'del'>('ins')
  return (
    <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-ai-200 bg-ai-50/40 px-2 py-1.5">
      <select value={kind} onChange={(e) => setKind(e.target.value as 'ins' | 'del')} className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600">
        <option value="ins">Insert</option>
        <option value="del">Strike</option>
      </select>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add tracked change as ChargePoint…" className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-slate-400" />
      <button disabled={!text.trim()} onClick={() => { if (text.trim()) { addTrackedChange(versionId, clauseId, text.trim(), kind); setText('') } }}
        className="inline-flex items-center gap-1 rounded bg-ai-600 px-2 py-0.5 text-[11px] font-semibold text-white disabled:opacity-30"><Plus size={11} /> Track</button>
    </div>
  )
}

export function DocumentViewer({ versionId, agreementId, focusClauseId, onAskAi }: { versionId: string; agreementId: string; focusClauseId?: string; onAskAi?: (text: string) => void }) {
  const doc = useStore((s) => s.documents[versionId])
  const devs = useStore((s) => s.deviations).filter((d) => d.agreement_id === agreementId)
  const canEdit = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'disposition'))
  const [edit, setEdit] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [askBtn, setAskBtn] = useState<{ text: string; x: number; y: number } | null>(null)

  // Surface an "Ask AI" action whenever the reader highlights text in the document.
  const onSelect = () => {
    const sel = window.getSelection()
    const text = sel?.toString().trim() ?? ''
    if (!text || text.length < 3 || !containerRef.current || !sel?.anchorNode || !containerRef.current.contains(sel.anchorNode)) {
      setAskBtn(null)
      return
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    setAskBtn({ text, x: rect.left + rect.width / 2, y: rect.top })
  }
  const askAi = () => {
    if (!askBtn) return
    const snippet = askBtn.text.length > 320 ? askBtn.text.slice(0, 320) + '…' : askBtn.text
    onAskAi?.(snippet)
    setAskBtn(null)
    window.getSelection()?.removeAllRanges()
  }

  useEffect(() => {
    if (focusClauseId && containerRef.current) {
      const el = containerRef.current.querySelector(`#clause-${focusClauseId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.classList.add('ring-2', 'ring-brand-400')
      const t = setTimeout(() => el?.classList.remove('ring-2', 'ring-brand-400'), 1600)
      return () => clearTimeout(t)
    }
  }, [focusClauseId])

  if (!doc) return <div className="flex h-full items-center justify-center text-sm text-slate-400">No document preview available for this version.</div>

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3 py-1.5 text-slate-400">
        {[Bold, Italic, Underline].map((Icon, i) => <button key={i} className="rounded p-1.5 hover:bg-slate-100"><Icon size={14} /></button>)}
        <div className="mx-1 h-4 w-px bg-slate-200" />
        {[List, Table, Pilcrow].map((Icon, i) => <button key={i} className="rounded p-1.5 hover:bg-slate-100"><Icon size={14} /></button>)}
        <div className="mx-1 h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2 pl-1 text-[11px]">
          <span className="tc-ins-cp font-semibold">insertion</span>
          <span className="tc-del-cp font-semibold">deletion</span>
          <span className="text-slate-400">· counterparty blue · CP green</span>
        </div>
        {canEdit && (
          <button onClick={() => setEdit((v) => !v)} className={clsx('ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition', edit ? 'bg-ai-600 text-white' : 'text-ai-700 hover:bg-ai-50')}>
            {edit ? <><Pencil size={13} /> Editing — hover a change to accept/reject</> : <><Eye size={13} /> Reviewing — enable editing</>}
          </button>
        )}
      </div>

      <div ref={containerRef} onMouseUp={onSelect} onScroll={() => setAskBtn(null)} className="flex-1 overflow-y-auto py-6">
        {askBtn && createPortal(
          <button
            style={{ position: 'fixed', left: askBtn.x, top: askBtn.y - 10, transform: 'translate(-50%, -100%)', zIndex: 60 }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={askAi}
            className="flex items-center gap-1.5 rounded-lg bg-ai-600 px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-pop transition hover:bg-ai-700"
          >
            <Sparkles size={13} /> Ask AI
          </button>,
          document.body,
        )}
        <div className="doc-prose mx-auto max-w-2xl rounded-lg bg-white p-10 font-serif text-[13.5px] text-slate-800 shadow-panel">
          <h1>{doc.title}</h1>
          <p className="mb-5 text-center text-[11px] not-italic text-slate-400">{doc.subtitle}</p>
          {doc.clauses.map((c) => {
            const dev = c.deviationId ? devs.find((d) => d.id === c.deviationId) : undefined
            return (
              <div key={c.id} id={`clause-${c.id}`} className="clause rounded-md px-2 py-1 transition">
                {c.heading && (
                  <div className="flex items-center gap-2">
                    <h2 className="!mb-1">{c.heading}</h2>
                    {dev && <Chip className={clsx('ring-1 ring-inset', riskMeta[dev.risk_category].chip)}><span className={clsx('h-1.5 w-1.5 rounded-full', riskMeta[dev.risk_category].dot)} />{riskMeta[dev.risk_category].label}</Chip>}
                  </div>
                )}
                <p>{c.runs.map((r, i) => <ChangeRun key={i} run={r} versionId={versionId} editable={canEdit && edit} />)}</p>
                {canEdit && edit && c.heading && <ClauseEditor versionId={versionId} clauseId={c.id} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
