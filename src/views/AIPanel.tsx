import { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, BookOpen, Shield, GitCompareArrows, FileEdit, Scale, History } from 'lucide-react'
import { Markdown } from '@/components/Markdown'
import { AiTag } from '@/components/ui'

interface Msg { role: 'user' | 'ai'; text: string }

const CAPS = [
  { icon: <Scale size={13} />, label: 'Clause analysis', prompt: 'Analyze the term & termination clause' },
  { icon: <Shield size={13} />, label: 'Risk analysis', prompt: 'What are the top risks in this redline?' },
  { icon: <BookOpen size={13} />, label: 'Playbook guidance', prompt: 'What does the playbook say about residuals?' },
  { icon: <FileEdit size={13} />, label: 'Alternative language', prompt: 'Draft alternative language for the injunctive relief clause' },
  { icon: <GitCompareArrows size={13} />, label: 'Previous deal comparison', prompt: 'How did we handle this with Subaru?' },
  { icon: <History size={13} />, label: 'Draft revisions', prompt: 'Revise §8 to our Fallback 1 position' },
]

const ANSWERS: { match: (t: string) => boolean; text: string }[] = [
  { match: (t) => t.includes('residual'), text: `**Playbook — Residuals (red line).** The NDA playbook lists residuals as a strict red line under §4 Exclusions: *"Any clause permitting use of information retained in unaided memory."* It erodes trade-secret protection and was rejected in 100% of sampled deals (Subaru, Microchip). Recommend striking §1(f) entirely.` },
  { match: (t) => t.includes('injunctive') || t.includes('alternative language'), text: `**Alternative language — §9 Injunctive Relief (Fallback 1):**\n\n> "Each Party acknowledges that a breach may cause irreparable harm and that the non-breaching Party shall be entitled to seek injunctive relief, **without limiting other remedies and as the court deems appropriate with respect to any bond**."\n\nThis keeps relief mutual and avoids a mandatory bond on ChargePoint while giving the court discretion — within our approved fallback range.` },
  { match: (t) => t.includes('subaru') || t.includes('previous') || t.includes('compare'), text: `**Previous deal — Subaru MNDA (executed Feb 2026).** Subaru also introduced residuals and a 3-year term. Outcome: residuals **rejected**; term settled at **3yr / 3yr CI survival** (our Fallback 1). Same counter we're recommending here — Subaru accepted within one round.` },
  { match: (t) => t.includes('term') || t.includes('§8') || t.includes('revise'), text: `**§8 revised to Fallback 1:** Term **3 years**; confidentiality survival **3 years** from disclosure; trade secrets protected **indefinitely**. This accepts their 3-year term but restores CI survival from their proposed 2 years to our approved 3, and re-affirms the indefinite trade-secret carve-out.` },
  { match: (t) => t.includes('risk'), text: `**Top risks in the Vishay redline:**\n1. **Residuals (§1(f))** — red line; guts trade-secret protection.\n2. **Affiliate liability (§6)** — uncapped exposure for Affiliate breaches.\n3. **CI survival cut to 2yr (§8)** — below our 3yr floor.\n4. **Undefined "Restricted Information" (§14)** — unenforceable/ambiguous.\n\nItems 1 and 2 are the ones I'd hold firm on.` },
]

export function AIPanel({ agreementTitle, seed }: { agreementTitle: string; seed?: { text: string; nonce: number } | null }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const ask = (text: string) => {
    if (!text.trim()) return
    const a = ANSWERS.find((x) => x.match(text.toLowerCase()))
    setMsgs((m) => [...m, { role: 'user', text }, { role: 'ai', text: a?.text ?? `**Clause analysis.** Checked against the NDA playbook, the identified deviations, and our prior deals — I don't see a red-line trigger in this text. Make sure the defined terms are used consistently ("Confidential Information", not "Proprietary") and that every obligation is **mutual**. Want me to compare it to the matching playbook provision or draft alternative language?` }])
    setInput('')
  }

  // "Ask AI" from a document selection seeds a question here.
  useEffect(() => {
    if (seed?.text) ask(`Explain this clause: "${seed.text}"`)
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
