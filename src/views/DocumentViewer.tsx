import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { Bold, Italic, Underline, List, Table, Pilcrow, Check, X, CornerUpLeft, Pencil, Plus, Sparkles, BookOpen, Users, Lock, MessageSquare, MessageSquareOff, Flag, MoreHorizontal } from 'lucide-react'
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
  if (run.linkTo) {
    return (
      <a
        className="cursor-pointer font-semibold text-brand-600 underline decoration-brand-300 underline-offset-2"
        title="Dynamic cross-reference — click to jump"
        onClick={(e) => { e.preventDefault(); const el = document.querySelector(`#clause-${run.linkTo}`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.classList.add('ring-2', 'ring-brand-400'); setTimeout(() => el?.classList.remove('ring-2', 'ring-brand-400'), 1500) }}
      >{run.text}</a>
    )
  }
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

export function DocumentViewer({ versionId, agreementId, focusClauseId, focusRef, onAskAi }: { versionId: string; agreementId: string; focusClauseId?: string; focusRef?: string; onAskAi?: (text: string) => void }) {
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

  // ---- Word-style margin comments: BOTH the AI analysis and the team's comments live next to
  // the document, anchored to their clauses, with a filter (All / AI / Team). ----
  const setDisposition = useStore((s) => s.setDisposition)
  const resolveMention = useStore((s) => s.resolveMention)
  const proposeCounter = useStore((s) => s.proposeCounter)
  const keepCounter = useStore((s) => s.keepCounter)
  const discardCounter = useStore((s) => s.discardCounter)
  const pendingCounter = useStore((s) => s.pendingCounter)
  const showComments = useStore((s) => s.showDocComments)
  const setShowComments = useStore((s) => s.setShowDocComments)
  const flagAnalysis = useStore((s) => s.flagAnalysis)
  const setToast = useStore((s) => s.setToast)
  const agreement = useStore((s) => s.agreements.find((x) => x.id === agreementId))
  const [flagMenu, setFlagMenu] = useState<string | null>(null)
  // Counter flow: when a counter is proposed, the cursor lands in the inserted text.
  useEffect(() => {
    if (pendingCounter && containerRef.current) {
      const ins = containerRef.current.querySelector(`#clause-${pendingCounter.clauseId} .tc-ins`) as HTMLElement | null
      if (ins) {
        ins.focus()
        const sel = window.getSelection(); const range = document.createRange()
        range.selectNodeContents(ins); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range)
        ins.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCounter?.deviationId])
  const isVisibleClause = (c: { runs: DocRun[] }) => !(c.runs.length === 0 || c.runs.every((r) => r.type === 'del' || !r.text.trim()))
  const clauseIdFor = (d: Deviation): string | undefined =>
    doc?.clauses.find((c) => (c.deviationId === d.id || c.id === d.source_clause_id) && isVisibleClause(c))?.id
  // Match a human comment's provision_reference ('§3(e)' or a heading) to its clause.
  const clauseForRef = (ref?: string): string | undefined => {
    if (!ref || !doc) return undefined
    const norm = ref.toLowerCase().replace(/[§.()\s]/g, '')
    if (!norm) return undefined
    return doc.clauses.find((c) => {
      if (!isVisibleClause(c)) return false
      const r = c.ref.toLowerCase().replace(/[§.()\s]/g, '')
      const h = c.heading.toLowerCase().replace(/[§.()\s]/g, '')
      return (!!r && (r === norm || norm.includes(r) || r.includes(norm))) || (!!h && (h.includes(norm) || norm.includes(h)))
    })?.id
  }
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const docDevs = devs.filter((d) => !!clauseIdFor(d))
  // AI analysis is always visible; team comments show/hide with the toolbar's Hide/Show comments CTA.
  const teamMsgs = showComments ? messages.filter((m) => m.thread_type === 'agreement_level' && m.agreement_id === agreementId && !!clauseForRef(m.provision_reference)) : []
  type MarginItem = { uid: string; clauseId: string; kind: 'ai'; dev: Deviation } | { uid: string; clauseId: string; kind: 'team'; msg: (typeof teamMsgs)[number] }
  const marginItems: MarginItem[] = [
    ...docDevs.map((d) => ({ uid: 'ai-' + d.id, clauseId: clauseIdFor(d)!, kind: 'ai' as const, dev: d })),
    ...teamMsgs.map((m) => ({ uid: 'tm-' + m.id, clauseId: clauseForRef(m.provision_reference)!, kind: 'team' as const, msg: m })),
  ]
  const colRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [tops, setTops] = useState<Record<string, number>>({})
  const [colH, setColH] = useState(0)
  const itemsKey = marginItems.map((it) => it.uid + (it.kind === 'ai' ? it.dev.disposition_status : it.msg.resolved ? 'r' : 'o') + (expanded[it.uid] ? 'x' : '')).join(',')
  // Anchor each card to its clause's vertical position (stacked so cards never overlap).
  useLayoutEffect(() => {
    const col = colRef.current, cont = containerRef.current
    if (!col || !cont || !doc) return
    const colTop = col.getBoundingClientRect().top
    const desired: { id: string; top: number }[] = []
    for (const it of marginItems) {
      const el = cont.querySelector(`#clause-${it.clauseId}`) as HTMLElement | null
      if (el) desired.push({ id: it.uid, top: Math.max(0, el.getBoundingClientRect().top - colTop) })
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
  }, [doc, itemsKey, edit, proseEdit])
  const flashClause = (cid?: string) => {
    if (!cid) return
    const el = containerRef.current?.querySelector(`#clause-${cid}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.classList.add('ring-2', 'ring-ai-400')
    setTimeout(() => el?.classList.remove('ring-2', 'ring-ai-400'), 1600)
  }
  // A good review comment: what they changed → why it matters → what to do. Strip the directive
  // prefix ("RED LINE — reject.", "ACCEPT — …") — the chips and buttons already say that.
  const cleanRec = (t: string): string => {
    // "RED LINE / QA — …", "Enhancement — …", "Counter to Fallback: …", "ACCEPT — …"
    let s = t.replace(/^\s*(red ?line|accept|counter(?: to fallback(?: \d)?)?|missing(?:\/inconsistent)?|enhancement)[^—:.]{0,12}[—:.]\s*/i, '').trim()
    if (s.length < 20) {
      const i = t.indexOf('. ')
      s = i > 0 && i < 60 && /red ?line|accept|counter|reject|missing|enhancement/i.test(t.slice(0, i)) ? t.slice(i + 2).trim() : t
    }
    if (s.length < 20) s = t
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  const recommendedFor = (d: Deviation): 'accepted' | 'countered' | 'rejected' =>
    d.risk_category === 'accept' ? 'accepted' : d.risk_category === 'red_line' ? 'rejected' : 'countered'

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

  // Jump-to-comment: a provision_reference from the queue/dashboard lands on the clause.
  useEffect(() => {
    if (focusRef) {
      const cid = clauseForRef(focusRef)
      if (cid) setTimeout(() => flashClause(cid), 250)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRef, doc?.versionId])

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
        <div className="flex rounded-lg border border-slate-200 p-0.5">
          <button onClick={() => setShowComments(false)} title="Hide team comments (AI analysis always stays visible)" className={clsx('flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold transition', !showComments ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100')}>
            <MessageSquareOff size={13} /> Hide comments
          </button>
          <button onClick={() => setShowComments(true)} title="Show comments on this document" className={clsx('flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold transition', showComments ? 'bg-ai-600 text-white' : 'text-slate-500 hover:bg-slate-100')}>
            <MessageSquare size={13} /> Show comments
          </button>
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
              {edit ? (proseEdit ? <><Pencil size={13} /> Editing text — type in the document</> : <><Pencil size={13} /> Reviewing changes — hover to accept/reject</>) : <><Pencil size={13} /> Edit</>}
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
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Demo variants</span>
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            <button onClick={() => setCollabMode(agreementId, 'live')} title="Variant A — Google-Docs-style presence" className={clsx('flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold', collabMode === 'live' ? 'bg-brand-500 text-white' : 'text-slate-500')}><Users size={12} /> A · Presence</button>
            <button onClick={() => setCollabMode(agreementId, 'locked')} title="Variant B — Word checkout model" className={clsx('flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold', collabMode === 'locked' ? 'bg-slate-800 text-white' : 'text-slate-500')}><Lock size={12} /> B · Checkout</button>
          </div>
        </div>
      </div>
      <div className={clsx('flex shrink-0 items-center gap-2 px-3 py-1 text-[11px]', collabMode === 'locked' ? 'bg-amber-50 text-amber-800' : 'bg-brand-50/60 text-brand-700')}>
        {collabMode === 'locked' ? (
          <>
            <Lock size={11} className="shrink-0" />
            <span>Checked out by <b>{userById(holderId ?? 'u_kirsten')?.name ?? 'Kirsten Sachs'}</b> (in Word) since 10:42 AM. {lockedByOther || !holderId ? 'You have read-only access.' : 'Others have read-only access.'}</span>
            <button onClick={() => { releaseDoc(agreementId); setToast('Formatting changes ingested'); setCollabMode(agreementId, 'live') }}
              className="ml-auto rounded-md bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-700">Check in</button>
          </>
        ) : (
          <span>Live presence — everyone can view and comment; colored cursors show who's where. Each clause is edit-locked to one editor at a time.</span>
        )}
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
          {/* Auto-generated Table of Contents (formatting-fidelity showcase) */}
          {doc.toc && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50/60 px-5 py-3 not-italic">
              <div className="mb-1 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">Table of Contents</div>
              {doc.toc.map((t, i) => (
                <button key={i} onClick={() => flashClause(t.clauseId)} className="flex w-full items-baseline gap-1 py-0.5 text-left text-[12px] text-slate-600 hover:text-brand-700">
                  <span className="whitespace-pre">{t.label}</span>
                  <span className="flex-1 border-b border-dotted border-slate-300" />
                  <span className="font-mono text-[10px] text-slate-400">{i + 2}</span>
                </button>
              ))}
            </div>
          )}
          {doc.clauses.map((c) => {
            const dev = c.deviationId ? devs.find((d) => d.id === c.deviationId) : undefined
            // A rejected counterparty-introduced clause resolves to nothing — drop it from the clean doc.
            if (c.runs.length === 0 || c.runs.every((r) => r.type === 'del' || !r.text.trim())) return null
            const decided = dev && dev.disposition_status !== 'open'
            const pending = pendingCounter?.clauseId === c.id && pendingCounter.versionId === versionId
            const lvl = c.level ?? 1
            return (
              <div key={c.id} id={`clause-${c.id}`} className={clsx('clause relative rounded-md px-2 py-1 transition', pending && 'bg-amber-50/40 ring-1 ring-amber-200')} style={{ marginLeft: (lvl - 1) * 18 }}>
                {c.heading && (
                  <div className="flex items-center gap-2">
                    <h2 className={clsx('!mb-1', lvl === 2 && '!text-[13px]', lvl >= 3 && '!text-[12.5px] !font-semibold')}>{c.heading}</h2>
                    {/* open issue → risk chip; decided → calm disposition chip */}
                    {dev && (decided
                      ? <Chip className={clsx('ring-1 ring-inset', dispositionMeta[dev.disposition_status].chip)}>{dev.disposition_status === 'accepted' ? '✓' : dev.disposition_status === 'countered' ? '↩' : '✕'} {dispositionMeta[dev.disposition_status].label}</Chip>
                      : <Chip className={clsx('ring-1 ring-inset', riskMeta[dev.risk_category].chip)}><span className={clsx('h-1.5 w-1.5 rounded-full', riskMeta[dev.risk_category].dot)} />{riskMeta[dev.risk_category].label}</Chip>)}
                  </div>
                )}
                {pending ? (
                  <>
                    {/* Counter flow: the AI counter language is IN the document as a tracked change,
                        immediately editable — the caret lands in the underlined insertion. */}
                    <p>
                      {c.runs.map((r, i) => r.type === 'ins'
                        ? <span key={i} className="tc-ins rounded-sm outline-none ring-amber-300 focus:ring-1" contentEditable suppressContentEditableWarning data-counter-ins>{r.text}</span>
                        : <span key={i} className={r.type === 'del' ? 'tc-del' : ''} contentEditable={false}>{r.text}</span>)}
                    </p>
                    <div className="absolute -top-3 right-2 z-10 flex items-center gap-1 rounded-full bg-slate-900 p-0.5 shadow-pop">
                      <button onClick={() => { const t = containerRef.current?.querySelector(`#clause-${c.id} [data-counter-ins]`)?.textContent ?? undefined; keepCounter(pendingCounter!.deviationId, t ?? undefined) }}
                        className="flex items-center gap-1 rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-600"><Check size={11} /> Keep counter</button>
                      <button onClick={() => discardCounter(pendingCounter!.deviationId)}
                        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10"><X size={11} /> Discard</button>
                    </div>
                  </>
                ) : canEdit && edit && proseEdit ? (
                  <p
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => { const t = e.currentTarget.textContent?.trim() ?? ''; if (t && t !== cleanText(c.runs).trim()) editClauseText(versionId, c.id, t) }}
                    className="cursor-text rounded ring-1 ring-dashed ring-ai-200 focus:outline-none focus:ring-ai-400"
                  >{cleanText(c.runs)}</p>
                ) : (
                  // Attorneys can click straight into the document and type their own counter —
                  // the body is contenteditable (mock-level) without touching any button.
                  <p contentEditable={canEdit && !edit} suppressContentEditableWarning className={clsx(canEdit && !edit && 'cursor-text focus:outline-none')}>
                    {c.runs.map((r, i) => <ChangeRun key={i} run={r} versionId={versionId} editable={canEdit && edit} />)}
                  </p>
                )}
                {canEdit && edit && !proseEdit && c.heading && <ClauseEditor versionId={versionId} clauseId={c.id} />}
                {/* Variant A — presence: a colleague's live cursor in the document */}
                {collabMode === 'live' && collaborators[0] && c.id === doc.clauses[Math.min(4, doc.clauses.length - 1)].id && (
                  <span className="pointer-events-none absolute -left-1 top-2 flex items-center not-italic">
                    <span className="h-4 w-0.5 animate-pulse rounded" style={{ background: userById(collaborators[0])?.color ?? '#0369a1' }} />
                    <span className="ml-0.5 rounded px-1 py-px text-[9px] font-bold text-white" style={{ background: userById(collaborators[0])?.color ?? '#0369a1' }}>{userById(collaborators[0])?.name.split(' ')[0]}</span>
                  </span>
                )}
              </div>
            )
          })}
          {/* Footnotes (formatting-fidelity showcase) */}
          {doc.footnotes && (
            <div className="mt-8 border-t border-slate-200 pt-3">
              {doc.footnotes.map((f, i) => <p key={i} className="!mb-1 text-[11px] not-italic text-slate-500">{f}</p>)}
            </div>
          )}
        </div>

        {/* Margin — AI analysis always shown; team comments show/hide with the toolbar CTA. */}
        {(docDevs.length > 0 || teamMsgs.length > 0) && (
          <div className="hidden w-[280px] shrink-0 lg:block">
            <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-card">
              <span className="block flex-1 rounded-md bg-ai-600 py-1 text-center text-[10.5px] font-semibold text-white">AI analysis ({docDevs.length})</span>
              {showComments && <span className="block flex-1 rounded-md bg-slate-700 py-1 text-center text-[10.5px] font-semibold text-white">Comments ({teamMsgs.length})</span>}
            </div>
            <div ref={colRef} className="relative" style={{ minHeight: colH }}>
              {marginItems.map((it) => {
                const common = { ref: (el: HTMLDivElement | null) => { cardRefs.current[it.uid] = el }, style: { position: 'absolute' as const, top: tops[it.uid] ?? 0, left: 0, right: 0 } }
                if (it.kind === 'team') {
                  const m = it.msg
                  const isOpen = !!expanded[it.uid]
                  return (
                    <div key={it.uid} {...common} onClick={() => flashClause(it.clauseId)}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 shadow-card transition hover:shadow-panel">
                      <div className="flex items-center gap-1.5">
                        <Avatar userId={m.author_id} size={18} />
                        <span className="truncate text-[11.5px] font-bold text-slate-700">{userById(m.author_id)?.name}</span>
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-400">{m.provision_reference}</span>
                      </div>
                      <div className="mt-1.5 text-[11px] leading-snug text-slate-600" style={isOpen ? undefined : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.body}</div>
                      <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {m.mentions && m.mentions.length > 0 && (m.resolved
                          ? <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20">✓ Sign-off received</Chip>
                          : <>
                              <Chip className="bg-amber-50 text-amber-700 ring-amber-500/20">@ {m.mentions.map((id) => userById(id)?.name.split(' ')[0]).join(', ')}</Chip>
                              <button onClick={() => resolveMention(m.id)} className="text-[10.5px] font-semibold text-brand-600 hover:underline">Mark responded</button>
                            </>)}
                        {m.body.length > 130 && <button onClick={() => setExpanded((p) => ({ ...p, [it.uid]: !isOpen }))} className="ml-auto text-[10.5px] font-semibold text-slate-400 hover:text-slate-600">{isOpen ? 'Less' : 'More'}</button>}
                      </div>
                    </div>
                  )
                }
                const d = it.dev
                const decided = d.disposition_status !== 'open'
                const rm = riskMeta[d.risk_category]
                const rec = recommendedFor(d)
                const isOpen = !!expanded[it.uid]
                return (
                  <div key={it.uid} {...common} onClick={() => flashClause(it.clauseId)}
                    className={clsx('cursor-pointer rounded-lg border bg-white p-2.5 shadow-card transition hover:shadow-panel', decided ? 'border-slate-200 opacity-75' : 'border-ai-200')}>
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={11} className="shrink-0 text-ai-600" />
                      <span className="truncate text-[11.5px] font-bold text-slate-700">{d.provision_name}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-400">{d.section_reference}</span>
                      <span className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setFlagMenu(flagMenu === d.id ? null : d.id)} title="Flag: incorrect analysis" className="rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500"><MoreHorizontal size={12} /></button>
                        {flagMenu === d.id && (
                          <span className="absolute right-0 top-5 z-20 block w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-pop">
                            <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400"><Flag size={9} /> Flag: incorrect analysis</span>
                            {['Should have been Redline', 'Should have been Fallback', 'False positive'].map((r) => (
                              <button key={r} onClick={() => { flagAnalysis(d.id, r); setFlagMenu(null) }} className="block w-full rounded-md px-2 py-1 text-left text-[11px] text-slate-600 hover:bg-slate-50">{r}</button>
                            ))}
                          </span>
                        )}
                      </span>
                    </div>
                    {pendingCounter?.deviationId === d.id && (
                      <div className="mt-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-[10.5px] font-semibold text-amber-700 ring-1 ring-amber-200">↩ Counter proposed — edit the underlined text in the document, then Keep or Discard.</div>
                    )}
                    {decided ? (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Chip className={clsx('ring-1 ring-inset', dispositionMeta[d.disposition_status].chip)}>
                          {d.disposition_status === 'accepted' ? '✓' : d.disposition_status === 'countered' ? '↩' : '✕'} {dispositionMeta[d.disposition_status].label}
                        </Chip>
                        <span className="text-[10.5px] text-slate-400">resolved in the document</span>
                      </div>
                    ) : (
                      <>
                        <div className="mt-1 flex items-center gap-1"><Chip className={clsx('ring-1 ring-inset', rm.chip)}><span className={clsx('h-1.5 w-1.5 rounded-full', rm.dot)} /> {rm.label}</Chip></div>
                        <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Their change</div>
                        <div className="text-[11px] leading-snug text-slate-600" style={isOpen ? undefined : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.counterparty_position}</div>
                        <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-ai-600">Why it matters</div>
                        <div className="text-[11px] leading-snug text-slate-600" style={isOpen ? undefined : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{cleanRec(d.recommended_response)}</div>
                        {isOpen && (
                          <>
                            <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">Our standard</div>
                            <div className="text-[11px] leading-snug text-slate-600">{d.template_position}</div>
                            <button onClick={(e) => { e.stopPropagation(); flashClause(it.clauseId) }} className="mt-1.5 flex items-center gap-1 text-[10.5px] font-semibold text-brand-600 hover:underline">→ Clause {d.section_reference} in the document</button>
                          </>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setExpanded((p) => ({ ...p, [it.uid]: !isOpen })) }} className="mt-1 text-[10.5px] font-semibold text-slate-400 hover:text-slate-600">{isOpen ? 'See less' : 'See more'}</button>
                        {roleCanEdit && !lockedByOther && (
                          <div className="mt-1.5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {([['accepted', 'Accept', Check, 'bg-brand-500 border-brand-500 text-white', 'hover:bg-brand-50 hover:text-brand-700'],
                               ['countered', 'Counter', CornerUpLeft, 'bg-amber-500 border-amber-500 text-white', 'hover:bg-amber-50 hover:text-amber-700'],
                               ['rejected', 'Reject', X, 'bg-red-500 border-red-500 text-white', 'hover:bg-red-50 hover:text-red-700']] as const).map(([st, label, Icon, filled, tone]) => (
                              <button key={st} onClick={() => (st === 'countered' ? proposeCounter(d.id) : setDisposition(d.id, st))} title={rec === st ? 'AI-recommended action' : undefined}
                                className={clsx('flex flex-1 items-center justify-center gap-1 rounded-md border py-1 text-[10.5px] font-semibold transition',
                                  rec === st ? filled : clsx('border-slate-200 text-slate-500', tone))}>
                                <Icon size={11} /> {label}{rec === st ? ' ✦' : ''}
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
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
