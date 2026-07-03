import { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, BookOpen, GitCompareArrows, FileEdit } from 'lucide-react'
import { Markdown } from '@/components/Markdown'
import { AiTag } from '@/components/ui'
import { sendToAgent } from '@/agent/engine'
import { precedentAnswer } from '@/lib/precedent'

interface Msg { role: 'user' | 'ai'; text: string }

// Consolidated to Playbook guidance + an ad-hoc Claude action + prior-deal comparison (Eric §6).
const CAPS = [
  { icon: <BookOpen size={13} />, label: 'Playbook guidance', prompt: 'What does the playbook say about this clause?' },
  { icon: <FileEdit size={13} />, label: 'Suggest revisions favorable to us', prompt: 'Suggest revisions favorable to ChargePoint for this clause' },
  { icon: <GitCompareArrows size={13} />, label: 'Precedent — prior executed deals', prompt: 'What is our precedent on residuals and indemnity?' },
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

// Pure ask-anything chat — the AI's clause analysis lives as margin comments in the document itself.
export function AIPanel({ agreementTitle, seed }: { agreementTitle: string; seed?: { text: string; nonce: number } | null }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [lastSel, setLastSel] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const ask = (text: string) => {
    if (!text.trim()) return
    const lc = text.toLowerCase()
    // Precedent questions are answered from the real executed-contract corpus (R44).
    const answer = isPrecedentQ(lc)
      ? precedentAnswer(text)
      : (ANSWERS.find((x) => x.match(lc))?.text ?? `**Clause analysis.** Checked against the NDA playbook, the identified deviations, and our prior deals — I don't see a red-line trigger in this text. Make sure the defined terms are used consistently ("Confidential Information", not "Proprietary") and that every obligation is **mutual**. Want me to compare it to the matching playbook provision or draft alternative language?`)
    setMsgs((m) => [...m, { role: 'user', text }, { role: 'ai', text: answer }])
    setInput('')
  }

  // "Ask AI" from a document selection seeds a question here.
  useEffect(() => {
    if (seed?.text) { setLastSel(seed.text); ask(`Explain this clause: "${seed.text}"`) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.nonce])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs.length])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[12px] font-bold text-ai-700"><Sparkles size={13} /> AI Assistant</div>
        <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-400">
          Context: <span className="rounded bg-slate-100 px-1.5 py-0.5">Full agreement</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5">Playbook</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5">9 deviations</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5">Comments</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5">Prior deals</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {msgs.length === 0 ? (
          <>
            <div className="text-[12px] text-slate-500">Ask anything about <span className="font-semibold">{agreementTitle}</span>, or pick a capability:</div>
            <div className="grid grid-cols-1 gap-1.5">
              {CAPS.map((c) => (
                <button key={c.label} onClick={() => ask(c.prompt)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-left text-[12.5px] font-medium text-slate-600 transition hover:border-ai-200 hover:bg-ai-50/50">
                  <span className="text-ai-500">{c.icon}</span>{c.label}
                </button>
              ))}
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
          <button onClick={() => sendToAgent(`Suggest to add to playbook as a fallback: "${lastSel.length > 200 ? lastSel.slice(0, 200) + '…' : lastSel}"`)}
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
    </div>
  )
}
