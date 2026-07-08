import { useState } from 'react'
import { CornerDownRight, Send } from 'lucide-react'
import { useStore } from '@/store'
import { Avatar } from '@/components/ui'
import { fmtDateTime } from '@/lib/labels'
import { userById } from '@/data/seed'

// Google-Docs-style reply thread for a single root comment: renders existing replies
// and a "Reply" affordance that expands into a small composer. Drop this beneath any
// rendered Message body — works for margin comments, Deal Discussion, and Comments tabs alike.
export function CommentReplies({ parentId, compact }: { parentId: string; compact?: boolean }) {
  const replies = useStore((s) => s.messages).filter((m) => m.parent_id === parentId)
  const replyToMessage = useStore((s) => s.replyToMessage)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const submit = () => {
    if (!text.trim()) return
    replyToMessage(parentId, text)
    setText('')
    setOpen(false)
  }

  return (
    <div className="mt-1.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {replies.map((r) => (
        <div key={r.id} className="flex items-start gap-1.5 border-l-2 border-slate-100 pl-2.5">
          <Avatar userId={r.author_id} size={compact ? 16 : 18} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={compact ? 'text-[10.5px] font-semibold text-slate-700' : 'text-[11.5px] font-semibold text-slate-700'}>{userById(r.author_id)?.name}</span>
              <span className="text-[10px] text-slate-300">{fmtDateTime(r.created_date)}</span>
            </div>
            <div className={compact ? 'text-[10.5px] leading-snug text-slate-600' : 'text-[12px] leading-snug text-slate-600'}>{r.body}</div>
          </div>
        </div>
      ))}
      {open ? (
        <div className="flex items-center gap-1.5 pl-2.5">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
            placeholder="Reply…"
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-[11.5px] outline-none focus:border-ai-400"
          />
          <button onClick={submit} className="flex items-center gap-1 text-[11.5px] font-semibold text-ai-600 hover:underline"><Send size={11} /> Post</button>
          <button onClick={() => setOpen(false)} className="text-[11.5px] text-slate-400 hover:text-slate-600">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 pl-2.5 text-[10.5px] font-semibold text-slate-400 hover:text-slate-600">
          <CornerDownRight size={11} /> Reply{replies.length > 0 ? ` (${replies.length})` : ''}
        </button>
      )}
    </div>
  )
}
