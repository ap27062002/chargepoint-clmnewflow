import { clsx } from 'clsx'
import { Tag, AtSign, CheckCircle2 } from 'lucide-react'
import { useStore } from '@/store'
import { Avatar, Chip } from '@/components/ui'
import { MentionComposer } from '@/components/MentionComposer'
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
  const resolveMention = useStore((s) => s.resolveMention)
  const users = useStore((s) => s.users)
  const currentUserId = useStore((s) => s.currentUserId)
  const taggable = users.filter((u) => u.id !== currentUserId)

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6 py-4">
      <div className="mb-2 text-[12px] text-slate-400">Strategic, deal-level discussion across all agreements in this ticket. Type <b>@</b> to loop in a colleague for sign-off.</div>
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
                {m.mentions && m.mentions.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <AtSign size={12} className="text-amber-500" />
                    <span className="text-[11.5px] text-slate-500">Sign-off requested: {m.mentions.map((id) => userById(id)?.name.split(' ')[0]).join(', ')}</span>
                    {m.resolved
                      ? <Chip className="bg-brand-100 text-brand-700 ring-brand-500/20"><CheckCircle2 size={10} /> Resolved</Chip>
                      : <button onClick={() => resolveMention(m.id)} className="text-[11.5px] font-semibold text-brand-600 hover:underline">Mark responded</button>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {messages.length === 0 && <div className="py-10 text-center text-sm text-slate-400">No discussion yet.</div>}
      </div>

      <div className="rounded-xl border border-slate-300 bg-white p-2.5 shadow-card">
        <MentionComposer
          people={taggable}
          tags={TAGS}
          tagClass={(t, active) => clsx(active ? tagMeta[t as MessageTag] : 'text-slate-400 hover:bg-slate-100')}
          placeholder="Add to the deal discussion… type @ to loop in a colleague"
          cta="Post"
          onPost={({ body, mentions, tag }) =>
            postMessage({ thread_type: 'deal_level', ticket_id: ticketId, agreement_id: null, body: body || `Looping in ${mentions.length} colleague(s).`, tag: tag as MessageTag | undefined, mentions })}
        />
      </div>
    </div>
  )
}
