import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { Send, BookOpen, Highlighter, PenLine, Sparkles, Check, CornerUpLeft, X, MoreHorizontal, Flag, FileText } from 'lucide-react'
import { Markdown } from '@/components/Markdown'
import { AiTag, Chip } from '@/components/ui'
import { precedentAnswer } from '@/lib/precedent'
import { riskMeta, dispositionMeta } from '@/lib/labels'
import { can } from '@/lib/access'
import { useStore } from '@/store'
import type { Deviation } from '@/types'

interface Msg { role: 'user' | 'ai'; text: string }

// A good review comment: what they changed → why it matters → what to do. Strip the directive
// prefix ("RED LINE — reject.", "ACCEPT — …") — the chips and buttons already say that.
const cleanRec = (t: string): string => {
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

// AI analysis — moved here from the document margin so the doc itself stays a clean preview/
// read surface. Same data, same actions (setDisposition/flagAnalysis).
function DeviationAnalysisCard({ d, onViewInDoc }: { d: Deviation; onViewInDoc?: (deviationId: string) => void }) {
  const setDisposition = useStore((s) => s.setDisposition)
  const counterTextForDeviation = useStore((s) => s.counterTextForDeviation)
  const flagAnalysis = useStore((s) => s.flagAnalysis)
  const canDecide = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'disposition'))
  const [isOpen, setIsOpen] = useState(false)
  const [flagMenu, setFlagMenu] = useState(false)
  const [counterOpen, setCounterOpen] = useState(false)
  const decided = d.disposition_status !== 'open'
  const rm = riskMeta[d.risk_category]
  const rec = recommendedFor(d)
  return (
    <div className={clsx('rounded-lg border bg-white p-2.5 shadow-card', decided ? 'border-slate-200 opacity-75' : 'border-ai-200')}>
      <div className="flex items-center gap-1.5">
        <Sparkles size={11} className="shrink-0 text-ai-600" />
        <span className="truncate text-[11.5px] font-bold text-slate-700">{d.provision_name}</span>
        <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-400">{d.section_reference}</span>
        <span className="relative shrink-0">
          <button onClick={() => setFlagMenu((v) => !v)} title="Flag: incorrect analysis" className="rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500"><MoreHorizontal size={12} /></button>
          {flagMenu && (
            <span className="absolute right-0 top-5 z-20 block w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-pop">
              <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400"><Flag size={9} /> Flag: incorrect analysis</span>
              {['Should have been Redline', 'Should have been Fallback', 'False positive'].map((r) => (
                <button key={r} onClick={() => { flagAnalysis(d.id, r); setFlagMenu(false) }} className="block w-full rounded-md px-2 py-1 text-left text-[11px] text-slate-600 hover:bg-slate-50">{r}</button>
              ))}
            </span>
          )}
        </span>
      </div>
      {counterOpen && (
        <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50/50 p-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">AI-recommended counter — copy into your response</div>
          <textarea readOnly value={counterTextForDeviation(d.id)} onFocus={(e) => e.currentTarget.select()}
            className="h-20 w-full resize-none rounded-md border border-amber-200 bg-white p-1.5 text-[11.5px] leading-snug text-slate-700 outline-none" />
        </div>
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
              {onViewInDoc && <button onClick={() => onViewInDoc(d.id)} className="mt-1.5 flex items-center gap-1 text-[10.5px] font-semibold text-brand-600 hover:underline"><FileText size={11} /> Clause {d.section_reference} in the document</button>}
            </>
          )}
          <button onClick={() => setIsOpen((v) => !v)} className="mt-1 text-[10.5px] font-semibold text-slate-400 hover:text-slate-600">{isOpen ? 'See less' : 'See more'}</button>
          {canDecide && (
            <div className="mt-1.5 flex items-center gap-1">
              {([['accepted', 'Accept', Check, 'bg-brand-500 border-brand-500 text-white', 'hover:bg-brand-50 hover:text-brand-700'],
                 ['countered', 'Counter', CornerUpLeft, 'bg-amber-500 border-amber-500 text-white', 'hover:bg-amber-50 hover:text-amber-700'],
                 ['rejected', 'Reject', X, 'bg-red-500 border-red-500 text-white', 'hover:bg-red-50 hover:text-red-700']] as const).map(([st, label, Icon, filled, tone]) => (
                <button key={st} onClick={() => (st === 'countered' ? setCounterOpen((v) => !v) : setDisposition(d.id, st))} title={rec === st ? 'AI-recommended action' : undefined}
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
}

const CAPS = [
  { icon: <BookOpen size={13} />, label: 'Show playbook guidance for this clause', prompt: 'What does the playbook say about this clause?' },
]

// Precedent questions route to the REAL executed-contract corpus (R44) — no fabricated deals.
const isPrecedentQ = (t: string) => /precedent|previous deal|prior deal|have we done|how did we handle|on the mondelez|on the clever|executed|history/.test(t)

const ANSWERS: { match: (t: string) => boolean; text: string }[] = [
  { match: (t) => t.includes('favorable') || t.includes('suggest revision'), text: `**Suggested revisions favorable to ChargePoint.** For this provision, tighten to our standard position, cap our exposure, and keep obligations mutual. If it's a term/survival clause → 3yr/3yr with trade secrets indefinite; if liability → mutual cap at 12 months' fees with consequentials waived; if indemnity → scope to third-party IP only with our standard exclusions. Want me to draft the exact language?` },
  { match: (t) => t.includes('residual'), text: `**Playbook — Residuals (red line).** The NDA playbook lists residuals as a strict red line under §4 Exclusions: *"Any clause permitting use of information retained in unaided memory."* It erodes trade-secret protection. No executed ChargePoint agreement in the corpus contains a residuals clause, so there is no accepted precedent for it — Vishay §1(f) is the only (live) introduction. Recommend striking §1(f) entirely.` },
  { match: (t) => t.includes('injunctive') || t.includes('alternative language'), text: `**Alternative language — §9 Injunctive Relief (Fallback 1):**\n\n> "Each Party acknowledges that a breach may cause irreparable harm and that the non-breaching Party shall be entitled to seek injunctive relief, **without limiting other remedies and as the court deems appropriate with respect to any bond**."\n\nThis keeps relief mutual and avoids a mandatory bond on ChargePoint while giving the court discretion — within our approved fallback range.` },
  { match: (t) => t.includes('term') || t.includes('§8') || t.includes('revise'), text: `**§8 revised to Fallback 1:** Term **3 years**; confidentiality survival **3 years** from disclosure; trade secrets protected **indefinitely**. This accepts their 3-year term but restores CI survival from their proposed 2 years to our approved 3, and re-affirms the indefinite trade-secret carve-out.` },
  { match: (t) => t.includes('risk'), text: `**Top risks in the Vishay redline:**\n1. **Residuals (§1(f))** — red line; guts trade-secret protection.\n2. **Affiliate liability (§6)** — uncapped exposure for Affiliate breaches.\n3. **CI survival cut to 2yr (§8)** — below our 3yr floor.\n4. **Undefined "Restricted Information" (§14)** — unenforceable/ambiguous.\n\nItems 1 and 2 are the ones I'd hold firm on.` },
]

// Ask-anything chat + the AI's clause analysis, which now lives here instead of as margin
// comments in the document — the document stays a clean read/preview surface.
export function AIPanel({ agreementTitle, seed, agreementId, isDraft, onStartDrafting, onViewInDoc, showAnalysis = true }: { agreementTitle: string; seed?: { text: string; nonce: number } | null; agreementId?: string; isDraft?: boolean; onStartDrafting?: () => void; onViewInDoc?: (deviationId: string) => void; showAnalysis?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [lastSel, setLastSel] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const editDraftViaChat = useStore((s) => s.editDraftViaChat)
  const suggestToPlaybook = useStore((s) => s.suggestToPlaybook)
  const agreement = useStore((s) => s.agreements.find((a) => a.id === agreementId))
  const playbookName = useStore((s) => s.playbooks.find((p) => p.id === agreement?.playbook_id)?.name)
  const devs = useStore((s) => s.deviations).filter((d) => showAnalysis && d.agreement_id === agreementId)

  const ask = (text: string) => {
    if (!text.trim()) return
    const lc = text.toLowerCase()
    // Drafting-stage agreements: free text EDITS the document for real (deterministic patterns),
    // rather than returning a canned negotiation-style answer.
    const answer = isDraft && agreementId
      ? editDraftViaChat(agreementId, text)
      : isPrecedentQ(lc)
        ? precedentAnswer(text)
        : (ANSWERS.find((x) => x.match(lc))?.text ?? `**Clause analysis.** Checked against the NDA playbook, the identified deviations, and our prior deals — I don't see a red-line trigger in this text. Make sure the defined terms are used consistently ("Confidential Information", not "Proprietary") and that every obligation is **mutual**. Want me to compare it to the matching playbook provision or draft alternative language?`)
    setMsgs((m) => [...m, { role: 'user', text }, { role: 'ai', text: answer }])
    setInput('')
  }

  // Suggests the last-highlighted clause to the playbook — runs the store action directly (not
  // via the global agent chat) so the confirmation lands right here, in the panel you clicked
  // from, instead of silently posting to a different, invisible conversation.
  const suggestClauseToPlaybook = () => {
    if (!lastSel || !agreement) return
    const snippet = lastSel.length > 200 ? lastSel.slice(0, 200) + '…' : lastSel
    suggestToPlaybook({
      playbook_id: agreement.playbook_id ?? 'pb_nda', provision_name: 'Suggested clause', kind: 'fallback',
      proposed_text: snippet, source_agreement_id: agreement.id,
    })
    setMsgs((m) => [...m, { role: 'user', text: `Suggest to add to playbook as a fallback: "${snippet}"` },
      { role: 'ai', text: `Sent to the **playbook owner** for approval — proposed as a **fallback** for *${playbookName ?? 'the playbook'}*. It lands in Playbook → **Suggested additions**; once approved it's added and the agent flags it automatically from then on.` }])
  }

  // Ad hoc analysis of whatever the user last highlighted in the document (via the ✨ Ask AI
  // button on a selection) — re-runs the analysis on demand rather than only auto-firing once.
  const analyzeHighlight = () => {
    if (lastSel) ask(`Give me an ad hoc analysis of this highlighted clause: "${lastSel}"`)
    else setMsgs((m) => [...m, { role: 'ai', text: 'Highlight a clause in the document, then click **Ask AI** on the selection (or come back here) — I\'ll analyze it against the playbook and precedent right away.' }])
  }

  // "Ask AI" from a document selection seeds a question here.
  useEffect(() => {
    if (seed?.text) { setLastSel(seed.text); ask(`Explain this clause: "${seed.text}"`) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.nonce])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs.length])

  const [tab, setTab] = useState<'analysis' | 'chat'>(showAnalysis && devs.length > 0 ? 'analysis' : 'chat')
  const showTabs = showAnalysis // nothing to bifurcate when analysis is hidden — just chat, no tab bar
  const onChatTab = !showTabs || tab === 'chat'

  return (
    <div className="flex h-full flex-col">
      {/* Header lives one level up (the "Ask Unify" panel wrapper in AgreementReview) — no second header here. */}
      {showTabs && (
        <div className="flex shrink-0 gap-1 border-b border-slate-100 p-1.5">
          <button onClick={() => setTab('analysis')} className={clsx('flex-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition', tab === 'analysis' ? 'bg-ai-50 text-ai-700' : 'text-slate-400 hover:bg-slate-50')}>
            AI Analysis{devs.length > 0 ? ` (${devs.length})` : ''}
          </button>
          <button onClick={() => setTab('chat')} className={clsx('flex-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition', tab === 'chat' ? 'bg-ai-50 text-ai-700' : 'text-slate-400 hover:bg-slate-50')}>
            Chat
          </button>
        </div>
      )}

      {showTabs && tab === 'analysis' && (
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {devs.length > 0
            ? devs.map((d) => <DeviationAnalysisCard key={d.id} d={d} onViewInDoc={onViewInDoc} />)
            : <div className="py-8 text-center text-[12px] text-slate-400">No deviations flagged on this agreement.</div>}
        </div>
      )}

      {onChatTab && (
        <>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {msgs.length === 0 ? (
              <>
                <div className="text-[12px] text-slate-500">
                  {isDraft ? <>Drafting <span className="font-semibold">{agreementTitle}</span> — start the form below, or just tell me what to change.</> : <>Ask anything about <span className="font-semibold">{agreementTitle}</span>, or pick a capability:</>}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {isDraft ? (
                    <button onClick={onStartDrafting} className="flex items-center gap-2 rounded-lg border border-ai-200 bg-ai-50/40 px-2.5 py-2 text-left text-[12.5px] font-medium text-ai-700 transition hover:bg-ai-50">
                      <PenLine size={13} />Start drafting
                    </button>
                  ) : (
                    <>
                      {CAPS.map((c) => (
                        <button key={c.label} onClick={() => ask(c.prompt)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-left text-[12.5px] font-medium text-slate-600 transition hover:border-ai-200 hover:bg-ai-50/50">
                          <span className="text-ai-500">{c.icon}</span>{c.label}
                        </button>
                      ))}
                      <button onClick={analyzeHighlight} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-left text-[12.5px] font-medium text-slate-600 transition hover:border-ai-200 hover:bg-ai-50/50">
                        <span className="text-ai-500"><Highlighter size={13} /></span>Analyze a highlighted clause
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              msgs.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                  <div className={m.role === 'user' ? 'inline-block rounded-2xl bg-slate-800 px-3 py-2 text-[13px] text-white' : 'rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-card'}>
                    {m.role === 'user' ? m.text : <Markdown text={m.text} />}
                  </div>
                  {m.role === 'ai' && <div className="mt-1"><AiTag /></div>}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 p-2.5">
            {lastSel && (
              <button onClick={suggestClauseToPlaybook}
                className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ai-200 py-1.5 text-[11.5px] font-semibold text-ai-700 hover:bg-ai-50">
                <BookOpen size={12} /> Suggest this clause to the playbook
              </button>
            )}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus-within:border-ai-400">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask(input)}
                placeholder="Ask about this agreement…"
                className="flex-1 text-[12.5px] outline-none placeholder:text-slate-400"
              />
              <button onClick={() => ask(input)} className="text-ai-600 hover:text-ai-700"><Send size={15} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
