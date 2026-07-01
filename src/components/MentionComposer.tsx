import { useState, useRef } from 'react'
import { clsx } from 'clsx'
import { AtSign, Send, X, Hash } from 'lucide-react'
import { Avatar, Button } from '@/components/ui'
import type { User } from '@/types'

// Real @-mention composer (Eric §4/§7 — "tag a contributor for sign-off, reference the provision").
// Type "@" to tag a colleague; the tagged people flow into postMessage.mentions so the thread can
// actually request + track sign-off. An optional provision reference anchors the comment to a clause.
export function MentionComposer({
  people,
  provisionOptions = [],
  tags = [],
  tagClass,
  placeholder = 'Comment on a provision… type @ to tag a colleague for sign-off',
  cta = 'Post comment',
  onPost,
}: {
  people: User[]
  provisionOptions?: string[]
  tags?: readonly string[]
  tagClass?: (t: string, active: boolean) => string
  placeholder?: string
  cta?: string
  onPost: (m: { body: string; mentions: string[]; provision_reference?: string; tag?: string }) => void
}) {
  const [body, setBody] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  const [provision, setProvision] = useState('')
  const [tag, setTag] = useState<string | undefined>()
  const [query, setQuery] = useState<string | null>(null) // non-null = @-menu open
  const taRef = useRef<HTMLTextAreaElement>(null)

  const onChange = (val: string) => {
    setBody(val)
    const m = val.match(/@(\w*)$/) // active @token at the caret
    setQuery(m ? m[1].toLowerCase() : null)
  }

  const pick = (u: User) => {
    setBody((b) => b.replace(/@(\w*)$/, `@${u.name.split(' ')[0]} `))
    setMentions((prev) => (prev.includes(u.id) ? prev : [...prev, u.id]))
    setQuery(null)
    taRef.current?.focus()
  }

  const post = () => {
    if (!body.trim() && mentions.length === 0) return
    onPost({ body: body.trim(), mentions, provision_reference: provision || undefined, tag })
    setBody(''); setMentions([]); setProvision(''); setTag(undefined); setQuery(null)
  }

  const q = query ?? ''
  const matches = people.filter((u) => u.name.toLowerCase().includes(q) || u.title.toLowerCase().includes(q))

  return (
    <div className="space-y-2">
      {/* tagged people */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <AtSign size={12} className="text-amber-500" />
          <span className="text-[11px] font-semibold text-slate-500">Sign-off requested:</span>
          {mentions.map((id) => {
            const u = people.find((p) => p.id === id)
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-amber-50 py-0.5 pl-1 pr-1.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-500/20">
                <Avatar userId={id} size={16} /> {u?.name.split(' ')[0]}
                <button onClick={() => setMentions((prev) => prev.filter((x) => x !== id))} className="text-amber-500 hover:text-amber-700"><X size={11} /></button>
              </span>
            )
          })}
        </div>
      )}

      <div className="relative">
        {/* @-mention menu */}
        {query !== null && matches.length > 0 && (
          <div className="absolute bottom-full left-0 z-20 mb-1 max-h-56 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Tag for sign-off</div>
            {matches.map((u) => (
              <button key={u.id} onClick={() => pick(u)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
                <Avatar userId={u.id} size={24} />
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-semibold text-slate-700">{u.name}</div>
                  <div className="truncate text-[10.5px] text-slate-400">{u.title}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={taRef}
          value={body}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className="w-full resize-none rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand-400"
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] font-medium text-slate-400">Tag:</span>
          {tags.map((t) => {
            const active = tag === t
            return (
              <button key={t} onClick={() => setTag(active ? undefined : t)}
                className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize transition', tagClass ? tagClass(t, active) : active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-100')}>
                {t}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        {provisionOptions.length > 0 && (
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 pl-1.5 pr-1">
            <Hash size={12} className="text-slate-400" />
            <select value={provision} onChange={(e) => setProvision(e.target.value)} className="max-w-[150px] truncate bg-transparent py-1 text-[11.5px] font-semibold text-slate-600 outline-none">
              <option value="">No clause ref</option>
              {provisionOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        <button
          onClick={() => { onChange(body.endsWith('@') || body.endsWith(' ') || body === '' ? body + '@' : body + ' @') ; taRef.current?.focus() }}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11.5px] font-semibold text-slate-500 hover:bg-slate-50"
          title="Tag a colleague"
        ><AtSign size={12} /> Tag</button>
        <Button size="sm" icon={<Send size={12} />} className={clsx('ml-auto')} onClick={post}>{cta}</Button>
      </div>
    </div>
  )
}
