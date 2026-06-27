import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import {
  ArrowUp, Sparkles, ArrowUpRight, FileText, LayoutDashboard, BookOpen,
  GitPullRequestArrow, ScrollText, Inbox, Paperclip, X, PanelRightOpen,
} from 'lucide-react'
import { useStore } from '@/store'
import { sendToAgent, openArtifact } from '@/agent/engine'
import { Avatar } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { startersFor } from '@/lib/access'
import type { ChatMessage, ArtifactKind } from '@/types'

const artifactIcon: Record<ArtifactKind, JSX.Element> = {
  dashboard: <LayoutDashboard size={13} />, playbook: <BookOpen size={13} />,
  redline_review: <GitPullRequestArrow size={13} />, agreement: <FileText size={13} />,
  ticket_created: <Inbox size={13} />, deal_summary: <ScrollText size={13} />,
  tagged_items: <Inbox size={13} />, intake_form: <FileText size={13} />, none: <FileText size={13} />,
}

function ArtifactChip({ m }: { m: ChatMessage }) {
  if (!m.artifact || m.artifact.kind === 'none' || !m.artifact.title) return null
  return (
    <button
      onClick={() => openArtifact(m.artifact!)}
      className="group mt-2.5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 shadow-sm transition hover:border-ai-300 hover:bg-ai-50/40 hover:text-ai-700"
    >
      <span className="text-ai-500">{artifactIcon[m.artifact.kind]}</span>
      {m.artifact.title}
      <PanelRightOpen size={13} className="text-slate-300 transition group-hover:text-ai-500" />
    </button>
  )
}

function MessageRow({ m, compact }: { m: ChatMessage; compact: boolean }) {
  const isUser = m.role === 'user'
  const currentUserId = useStore((s) => s.currentUserId)
  return (
    <div className={clsx('flex gap-3 animate-fade-in', isUser && 'flex-row-reverse')}>
      {isUser ? <Avatar userId={currentUserId} size={28} /> : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ai-500 to-ai-700 text-white shadow-sm">
          <Sparkles size={14} />
        </div>
      )}
      <div className={clsx('min-w-0', compact ? 'max-w-[88%]' : 'max-w-[80%]', isUser && 'text-right')}>
        <div
          className={clsx(
            'inline-block rounded-2xl px-4 py-2.5 text-left',
            isUser ? 'rounded-tr-md bg-slate-800 text-white' : 'rounded-tl-md border border-slate-200 bg-white shadow-card',
          )}
        >
          {isUser ? <div className="text-[14px] leading-relaxed">{m.text}</div> : <Markdown text={m.text} />}
          {!isUser && <ArtifactChip m={m} />}
        </div>
        {!isUser && m.actions && m.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.actions.map((a, i) => (
              <button
                key={i}
                onClick={() => sendToAgent(a.prompt)}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition',
                  a.variant === 'primary'
                    ? 'bg-ai-600 text-white shadow-sm hover:bg-ai-700'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
        {!isUser && m.aiGenerated && (
          <div className="mt-1.5 flex items-center gap-1 text-[10.5px] font-medium text-slate-400">
            <Sparkles size={10} /> AI-generated · verify before acting
          </div>
        )}
      </div>
    </div>
  )
}

function Thinking() {
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-ai-500 to-ai-700 text-white">
        <Sparkles size={14} />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-card">
        <span className="text-[12px] font-medium text-slate-400">Working</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-ai-400 animate-pulse-dot" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  )
}

function Composer({ compact }: { compact: boolean }) {
  const [input, setInput] = useState('')
  const submit = () => {
    const t = input.trim()
    if (!t) return
    setInput('')
    sendToAgent(t)
  }
  return (
    <div className={clsx('rounded-2xl border border-slate-300 bg-white shadow-card transition focus-within:border-ai-400 focus-within:shadow-panel', compact ? 'p-2' : 'p-2.5')}>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        rows={compact ? 1 : 2}
        placeholder="Message the CLM agent…  e.g. “review the Vishay redline”"
        className="w-full resize-none bg-transparent px-2 py-1 text-[14px] leading-relaxed outline-none placeholder:text-slate-400"
      />
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <button className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" title="Attach a counterparty document">
            <Paperclip size={15} />
          </button>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">claude-opus-4-6</span>
        </div>
        <button onClick={submit} disabled={!input.trim()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-ai-600 text-white shadow-sm transition hover:bg-ai-700 disabled:opacity-30">
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  )
}

export function ChatPanel({ variant }: { variant: 'hero' | 'docked' }) {
  const chat = useStore((s) => s.chat)
  const thinking = useStore((s) => s.agentThinking)
  const cu = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!)
  const closeCanvas = useStore((s) => s.closeCanvas)
  const scrollRef = useRef<HTMLDivElement>(null)
  const compact = variant === 'docked'
  const fresh = chat.length <= 1 && !thinking

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat.length, thinking])

  if (compact) {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-ai-500 to-ai-700 text-white"><Sparkles size={14} /></div>
            <div className="leading-tight">
              <div className="text-[13px] font-bold text-slate-800">CLM Agent</div>
              <div className="text-[10.5px] text-slate-400">Driving the workspace →</div>
            </div>
          </div>
          <button onClick={closeCanvas} title="Collapse workspace" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={15} /></button>
        </div>
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-3.5 py-4">
          {chat.map((m) => <MessageRow key={m.id} m={m} compact />)}
          {thinking && <Thinking />}
        </div>
        <div className="border-t border-slate-100 p-3">
          <Composer compact />
          <div className="mt-1.5 px-1 text-[10px] text-slate-400">Assists only — never approves, sends, or signs. You decide.</div>
        </div>
      </div>
    )
  }

  // hero variant
  return (
    <div className="flex h-full w-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 pb-6 pt-10">
          {fresh && (
            <div className="mb-8 text-center animate-fade-in">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-ai-500 to-ai-700 text-white shadow-pop">
                <Sparkles size={26} />
              </div>
              <h1 className="text-[26px] font-bold tracking-tight text-slate-800">Good morning, {cu.name.split(' ')[0]}.</h1>
              <p className="mt-1 text-[15px] text-slate-500">I'm your CLM agent. Tell me what to do — I'll run the contract workflow and open whatever you need.</p>
            </div>
          )}
          <div className="space-y-5">
            {chat.map((m) => <MessageRow key={m.id} m={m} compact={false} />)}
            {thinking && <Thinking />}
          </div>
          {fresh && (
            <div className="mt-7 grid grid-cols-2 gap-2.5">
              {startersFor(cu.role).map((s) => (
                <button key={s.label} onClick={() => sendToAgent(s.prompt)}
                  className="group rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-card transition hover:border-ai-300 hover:shadow-panel">
                  <div className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-700 group-hover:text-ai-700">
                    {s.label}<ArrowUpRight size={14} className="text-slate-300 transition group-hover:text-ai-500" />
                  </div>
                  <div className="mt-0.5 text-[12px] text-slate-400">{s.sub}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-slate-200/80 bg-gradient-to-t from-slate-50 to-transparent">
        <div className="mx-auto w-full max-w-3xl px-6 py-4">
          <Composer compact={false} />
          <div className="mt-2 text-center text-[11px] text-slate-400">
            The agent assists only — it never approves terms, sends externally, or signs. Attorneys remain the decision-makers.
          </div>
        </div>
      </div>
    </div>
  )
}
