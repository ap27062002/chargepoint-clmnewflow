import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { Bold, Italic, Underline, List, Table, Pilcrow, Check, X, CornerUpLeft, Pencil, Eye, Plus, Sparkles, BookOpen, Users, Lock } from 'lucide-react'
import { useStore } from '@/store'
import { sendToAgent } from '@/agent/engine'
import { can } from '@/lib/access'
import { Chip, Avatar } from '@/components/ui'
import { riskMeta, dispositionMeta } from '@/lib/labels'
import { userById } from '@/data/seed'
import type { DocRun } from '@/data/documents'
import type { Deviation } from '@/types'

function ChangeRun({ run, versionId, editable }: { run: DocRun; versionId: string; editable: boolean }) {
  const acceptChange = useStore((s) => s.acceptChange)
  const rejectChange = useStore((s) => s.rejectChange)
  // normal text carries NO tracked-change styling — only real ins/del runs are marked
  const cls = run.type === 'ins'
    ? (run.party === 'counterparty' ? 'tc-ins-cp' : 'tc-ins')
    : run.type === 'del'
      ? (run.party === 'counterparty' ? 'tc-del-cp' : 'tc-del')
      : ''
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
  const roleCanEdit = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'disposition'))
  const canSuggest = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'playbook_suggest'))
  const currentUserId = useStore((s) => s.currentUserId)
  const messages = useStore((s) => s.messages)
  const editClauseText = useStore((s) => s.editClauseText)
  // R18 — real document lock (store-backed), not a banner.
  const lock = useStore((s) => s.docLocks[agreementId])
  const setCollabMode = useStore((s) => s.setCollabMode)
  const checkoutDoc = useStore((s) => s.checkoutDoc)
  const releaseDoc = useStore((s) => s.releaseDoc)
  const [edit, setEdit] = useState(false)
  const [proseEdit, setProseEdit] = useState(false) // Eric §2: type directly into the document
  const collabMode: 'live' | 'locked' = lock?.mode ?? 'live'
  const holderId = lock?.locked_by ?? undefined
  const lockedByOther = collabMode === 'locked' && !!holderId && holderId !== currentUserId
  const canEdit = roleCanEdit && !lockedByOther // effective: role AND the lock allows it
  const fmt = (cmd: string) => document.execCommand(cmd)
  const cleanText = (r: DocRun[]) => r.filter((x) => x.type !== 'del').map((x) => x.text).join('')
  // Contributors on this document (from the agreement's threads + tags) — mock presence.
  const collaborators = Array.from(new Set(
    messages.filter((m) => m.agreement_id === agreementId).flatMap((m) => [m.author_id, ...(m.mentions ?? [])]),
  )).filter((id) => id !== currentUserId).slice(0, 3)
  const containerRef = useRef<HTMLDivElement>(null)
  const [askBtn, setAskBtn] = useState<{ text: string; x: number; y: number } | null>(null)

  // ---- AI margin comments (Word-style): the analysis lives NEXT TO the document, anchored to
  // its clause — not in the agent. One card per issue, with dispositions right on the card. ----
  const setDisposition = useStore((s) => s.setDisposition)
  const clauseIdFor = (d: Deviation): string | undefined =>
    doc?.clauses.find((c) => (c.deviationId === d.id || c.id === d.source_clause_id) && !(c.runs.length === 0 || c.runs.every((r) => r.type === 'del' || !r.text.trim())))?.id
  const docDevs = devs.filter((d) => !!clauseIdFor(d))
  const colRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [tops, setTops] = useState<Record<string, number>>({})
  const [colH, setColH] = useState(0)
  const devKey = docDevs.map((d) => d.id + d.disposition_status).join(',')
  // Anchor each card to its clause's vertical position (stacked so cards never overlap).
  useLayoutEffect(() => {
    const col = colRef.current, cont = containerRef.current
    if (!col || !cont || !doc) return
    const colTop = col.getBoundingClientRect().top
    const desired: { id: string; top: number }[] = []
    for (const d of docDevs) {
      const cid = clauseIdFor(d)
      const el = cid ? (cont.querySelector(`#clause-${cid}`) as HTMLElement | null) : null
      if (el) desired.push({ id: d.id, top: Math.max(0, el.getBoundingClientRect().top - colTop) })
    }
    desired.sort((a, b) => a.top - b.top)
    const next: Record<string, number> = {}
    let cursor = 0
    for (const { id, top } of desired) {
      const h = cardRefs.current[id]?.offsetHeight ?? 110
      const t = Math.max(top, cursor)
      next[id] = t
      cursor = t + h + 10
    }
    setColH(cursor)
    setTops((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, devKey, edit, proseEdit])
  const flashClause = (cid?: string) => {
    if (!cid) return
    const el = containerRef.current?.querySelector(`#clause-${cid}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.classList.add('ring-2', 'ring-ai-400')
    setTimeout(() => el?.classList.remove('ring-2', 'ring-ai-400'), 1600)
  }

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
  const snippetOf = (t: string) => (t.length > 320 ? t.slice(0, 320) + '…' : t)
  const askAi = () => {
    if (!askBtn) return
    onAskAi?.(snippetOf(askBtn.text))
    setAskBtn(null)
    window.getSelection()?.removeAllRanges()
  }
  const suggestToPlaybook = () => {
    if (!askBtn) return
    sendToAgent(`Suggest to add to playbook as a fallback: "${snippetOf(askBtn.text)}"`)
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
        {([['bold', Bold], ['italic', Italic], ['underline', Underline]] as const).map(([cmd, Icon]) => (
          <button key={cmd} onMouseDown={(e) => { e.preventDefault(); fmt(cmd) }} disabled={!(edit && proseEdit)} title={cmd} className="rounded p-1.5 enabled:hover:bg-slate-100 disabled:opacity-40"><Icon size={14} /></button>
        ))}
        <div className="mx-1 h-4 w-px bg-slate-200" />
        {([['insertUnorderedList', List], ['insertParagraph', Pilcrow]] as const).map(([cmd, Icon]) => (
          <button key={cmd} onMouseDown={(e) => { e.preventDefault(); fmt(cmd) }} disabled={!(edit && proseEdit)} className="rounded p-1.5 enabled:hover:bg-slate-100 disabled:opacity-40"><Icon size={14} /></button>
        ))}
        <button disabled className="rounded p-1.5 opacity-40"><Table size={14} /></button>
        <div className="mx-1 h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2 pl-1 text-[11px]">
          <span className="tc-ins-cp font-semibold">insertion</span>
          <span className="tc-del-cp font-semibold">deletion</span>
          <span className="text-slate-400">· counterparty blue · CP green</span>
        </div>
        {canEdit && (
          <div className="ml-auto flex items-center gap-1.5">
            {edit && (
              <div className="flex rounded-lg border border-slate-200 p-0.5">
                <button onClick={() => setProseEdit(false)} className={clsx('rounded-md px-2 py-0.5 text-[11.5px] font-semibold', !proseEdit ? 'bg-ai-600 text-white' : 'text-slate-500')}>Track changes</button>
                <button onClick={() => setProseEdit(true)} className={clsx('rounded-md px-2 py-0.5 text-[11.5px] font-semibold', proseEdit ? 'bg-ai-600 text-white' : 'text-slate-500')}>Edit directly</button>
              </div>
            )}
            <button onClick={() => setEdit((v) => !v)} className={clsx('inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition', edit ? 'bg-ai-600 text-white' : 'text-ai-700 hover:bg-ai-50')}>
              {edit ? (proseEdit ? <><Pencil size={13} /> Editing text — type in the document</> : <><Pencil size={13} /> Reviewing changes — hover to accept/reject</>) : <><Eye size={13} /> Reviewing — enable editing</>}
            </button>
          </div>
        )}
      </div>

      {/* Multi-party collaboration presence + integrity mode (Eric §4) */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-3 py-1.5">
        <div className="flex items-center -space-x-1.5">
          <span title="You — editing" className="relative rounded-full ring-2 ring-brand-400"><Avatar userId={currentUserId} size={22} /></span>
          {collaborators.map((id) => <span key={id} title={`${userById(id)?.name} — viewing`} className="rounded-full ring-2 ring-white"><Avatar userId={id} size={22} /></span>)}
        </div>
        <span className="text-[11px] text-slate-400">{collaborators.length ? `${collaborators.length + 1} on this document` : 'You are the only one here'}</span>
        {collabMode === 'live' && collaborators[0] && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" /> {userById(collaborators[0])?.name.split(' ')[0]} is viewing</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {collabMode === 'locked' && (holderId === currentUserId
            ? <button onClick={() => releaseDoc(agreementId)} className="rounded-md border border-slate-200 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-50">Release lock</button>
            : holderId
              ? <button onClick={() => checkoutDoc(agreementId)} className="rounded-md border border-amber-200 px-2 py-0.5 text-[11.5px] font-semibold text-amber-700 hover:bg-amber-50">Take the pen</button>
              : <button onClick={() => checkoutDoc(agreementId)} className="rounded-md border border-slate-200 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-50">Check out</button>)}
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            <button onClick={() => setCollabMode(agreementId, 'live')} className={clsx('flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold', collabMode === 'live' ? 'bg-brand-500 text-white' : 'text-slate-500')}><Users size={12} /> Live co-editing</button>
            <button onClick={() => setCollabMode(agreementId, 'locked')} className={clsx('flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold', collabMode === 'locked' ? 'bg-slate-800 text-white' : 'text-slate-500')}><Lock size={12} /> Single-editor lock</button>
          </div>
        </div>
      </div>
      <div className={clsx('shrink-0 px-3 py-1 text-[11px]', lockedByOther ? 'bg-red-50 text-red-700' : collabMode === 'live' ? 'bg-brand-50/60 text-brand-700' : 'bg-amber-50 text-amber-700')}>
        {lockedByOther
          ? `🔒 Locked by ${userById(holderId!)?.name ?? 'another user'}${lock?.locked_at ? ` since ${lock.locked_at}` : ''} — this document is read-only for you until they release it. (Switch persona to ${userById(holderId!)?.name.split(' ')[0]} to edit, or "Take the pen".)`
          : collabMode === 'live'
            ? 'Live co-editing — everyone can view and comment; each clause is edit-locked to one editor at a time so two people never overwrite the same clause. No one is shut out.'
            : `Single-editor lock — you hold the pen; everyone else is read-only until you Release. Guarantees integrity by allowing only one editor at a time.`}
      </div>

      <div ref={containerRef} onMouseUp={onSelect} onScroll={() => setAskBtn(null)} className="flex-1 overflow-y-auto py-6">
        {askBtn && createPortal(
          <div
            style={{ position: 'fixed', left: askBtn.x, top: askBtn.y - 10, transform: 'translate(-50%, -100%)', zIndex: 60 }}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center gap-0.5 rounded-lg bg-slate-900 p-0.5 shadow-pop"
          >
            <button onClick={askAi} className="flex items-center gap-1.5 rounded-md bg-ai-600 px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-ai-700">
              <Sparkles size={13} /> Ask AI
            </button>
            {canSuggest && (
              <button onClick={suggestToPlaybook} title="Suggest this clause for the playbook" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10">
                <BookOpen size={13} /> Suggest to playbook
              </button>
            )}
          </div>,
          document.body,
        )}
        <div className="mx-auto flex max-w-[1120px] items-start gap-4 px-4">
        <div className="doc-prose min-w-0 max-w-2xl flex-1 rounded-lg bg-white p-10 font-serif text-[13.5px] text-slate-800 shadow-panel">
          <h1>{doc.title}</h1>
          <p className="mb-5 text-center text-[11px] not-italic text-slate-400">{doc.subtitle}</p>
          {doc.clauses.map((c) => {
            const dev = c.deviationId ? devs.find((d) => d.id === c.deviationId) : undefined
            // A rejected counterparty-introduced clause resolves to nothing — drop it from the clean doc.
            if (c.runs.length === 0 || c.runs.every((r) => r.type === 'del' || !r.text.trim())) return null
            const decided = dev && dev.disposition_status !== 'open'
            return (
              <div key={c.id} id={`clause-${c.id}`} className="clause rounded-md px-2 py-1 transition">
                {c.heading && (
                  <div className="flex items-center gap-2">
                    <h2 className="!mb-1">{c.heading}</h2>
                    {/* open issue → risk chip; decided → calm disposition chip (no lingering red) */}
                    {dev && (decided
                      ? <Chip className={clsx('ring-1 ring-inset', dispositionMeta[dev.disposition_status].chip)}>{dev.disposition_status === 'accepted' ? '✓' : dev.disposition_status === 'countered' ? '↩' : '✕'} {dispositionMeta[dev.disposition_status].label}</Chip>
                      : <Chip className={clsx('ring-1 ring-inset', riskMeta[dev.risk_category].chip)}><span className={clsx('h-1.5 w-1.5 rounded-full', riskMeta[dev.risk_category].dot)} />{riskMeta[dev.risk_category].label}</Chip>)}
                  </div>
                )}
                {canEdit && edit && proseEdit ? (
                  <p
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => { const t = e.currentTarget.textContent?.trim() ?? ''; if (t && t !== cleanText(c.runs).trim()) editClauseText(versionId, c.id, t) }}
                    className="cursor-text rounded ring-1 ring-dashed ring-ai-200 focus:outline-none focus:ring-ai-400"
                  >{cleanText(c.runs)}</p>
                ) : (
                  <p>{c.runs.map((r, i) => <ChangeRun key={i} run={r} versionId={versionId} editable={canEdit && edit} />)}</p>
                )}
                {canEdit && edit && !proseEdit && c.heading && <ClauseEditor versionId={versionId} clauseId={c.id} />}
              </div>
            )
          })}
        </div>

        {/* AI review as MARGIN COMMENTS — anchored to their clauses, Word-style. */}
        {docDevs.length > 0 && (
          <div ref={colRef} className="relative hidden w-[280px] shrink-0 lg:block" style={{ minHeight: colH }}>
            {docDevs.map((d) => {
              const decided = d.disposition_status !== 'open'
              const rm = riskMeta[d.risk_category]
              return (
                <div
                  key={d.id}
                  ref={(el) => { cardRefs.current[d.id] = el }}
                  onClick={() => flashClause(clauseIdFor(d))}
                  style={{ position: 'absolute', top: tops[d.id] ?? 0, left: 0, right: 0 }}
                  className={clsx('cursor-pointer rounded-lg border bg-white p-2.5 shadow-card transition hover:shadow-panel',
                    decided ? 'border-slate-200 opacity-75' : 'border-ai-200')}
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={11} className="shrink-0 text-ai-600" />
                    <span className="truncate text-[11.5px] font-bold text-slate-700">{d.provision_name}</span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-400">{d.section_reference}</span>
                  </div>
                  {decided ? (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Chip className={clsx('ring-1 ring-inset', dispositionMeta[d.disposition_status].chip)}>
                        {d.disposition_status === 'accepted' ? '✓' : d.disposition_status === 'countered' ? '↩' : '✕'} {dispositionMeta[d.disposition_status].label}
                      </Chip>
                      <span className="text-[10.5px] text-slate-400">resolved in the document</span>
                    </div>
                  ) : (
                    <>
                      <div className="mt-1"><Chip className={clsx('ring-1 ring-inset', rm.chip)}><span className={clsx('h-1.5 w-1.5 rounded-full', rm.dot)} /> {rm.label}</Chip></div>
                      <div className="mt-1.5 text-[11px] leading-snug text-slate-600" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.recommended_response}</div>
                      {roleCanEdit && !lockedByOther && (
                        <div className="mt-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {([['accepted', 'Accept', Check, 'hover:bg-brand-50 hover:text-brand-700'], ['countered', 'Counter', CornerUpLeft, 'hover:bg-amber-50 hover:text-amber-700'], ['rejected', 'Reject', X, 'hover:bg-red-50 hover:text-red-700']] as const).map(([st, label, Icon, tone]) => (
                            <button key={st} onClick={() => setDisposition(d.id, st)}
                              className={clsx('flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 py-1 text-[10.5px] font-semibold text-slate-500 transition', tone)}>
                              <Icon size={11} /> {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
