import { useState } from 'react'
import { clsx } from 'clsx'
import { Send, Tag } from 'lucide-react'
import { useStore } from '@/store'
import { Avatar, Chip } from '@/components/ui'
import { fmtDateTime } from '@/lib/labels'
import { userById } from '@/data/seed'
import type { MessageTag } from '@/types'

const tagMeta: Record<MessageTag, string> = {
  timeline: 'bg-sky-100 text-sky-700', pricing: 'bg-violet-100 text-violet-700',
  decision: 'bg-brand-100 text-brand-700', question: 'bg-amber-100 text-amber-700',
}
const TAGS: MessageTag[] = ['timeline', 'pricing', 'decision', 'question']

export function DealDiscussion({ ticketId }: { ticketId: string }) {
  const messages = useStore((s) => s.messages).filter((m) => m.thread_type === 'deal_level' && m.ticket_id === ticketId)
  const postMessage = useStore((s) => s.postMessage)
  const [body, setBody] = useState('')
  const [tag, setTag] = useState<MessageTag | undefined>()

  const submit = () => {
    if (!body.trim()) return
    postMessage({ thread_type: 'deal_level', ticket_id: ticketId, agreement_id: null, body: body.trim(), tag })
    setBody(''); setTag(undefined)
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6 py-4">
      <div className="mb-2 text-[12px] text-slate-400">Strategic, deal-level discussion across all agreements in this ticket.</div>
      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.map((m) => {
          const u = userById(m.author_id)
          return (
            <div key={m.id} className="flex gap-2.5">
              <Avatar userId={m.author_id} size={30} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-700">{u?.name}</span>
                  <span className="text-[11px] capitalize text-slate-400">{u?.role.replace('_', ' ')}</span>
                  {m.tag && <Chip className={tagMeta[m.tag]}><Tag size={9} /> {m.tag}</Chip>}
                  <span className="text-[11px] text-slate-300">{fmtDateTime(m.created_date)}</span>
                </div>
                <div className="mt-1 rounded-xl rounded-tl-sm border border-slate-200 bg-white px-3 py-2 text-[13.5px] leading-relaxed text-slate-700 shadow-card">
                  {m.body}
                </div>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && <div className="py-10 text-center text-sm text-slate-400">No discussion yet.</div>}
      </div>

      <div className="rounded-xl border border-slate-300 bg-white p-2.5 shadow-card">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Add to the deal discussion…"
          className="w-full resize-none text-[13.5px] outline-none placeholder:text-slate-400"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-slate-400">Tag:</span>
            {TAGS.map((t) => (
              <button key={t} onClick={() => setTag(tag === t ? undefined : t)}
                className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize transition', tag === t ? tagMeta[t] : 'text-slate-400 hover:bg-slate-100')}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={submit} disabled={!body.trim()} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-brand-600 disabled:opacity-30">
            <Send size={13} /> Post
          </button>
        </div>
      </div>
    </div>
  )
}
