import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import {
  Search, Sparkles, LayoutDashboard, BookOpen, ScrollText, Settings, Bell,
  Inbox, GitPullRequestArrow, FileText, UserCog, CornerDownLeft,
} from 'lucide-react'
import { useStore } from '@/store'
import { sendToAgent } from '@/agent/engine'
import { can, type Capability } from '@/lib/access'

interface Cmd { id: string; label: string; hint?: string; icon: JSX.Element; group: string; run: () => void; cap?: Capability }

export function CommandMenu() {
  const open = useStore((s) => s.cmdkOpen)
  const setOpen = useStore((s) => s.setCmdkOpen)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const openCanvas = useStore((s) => s.openCanvas)
  const setPersona = useStore((s) => s.setPersona)
  const users = useStore((s) => s.users)
  const role = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!.role)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(!useStore.getState().cmdkOpen) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  useEffect(() => { if (open) setQ('') }, [open])

  const commands: Cmd[] = useMemo(() => {
    const close = () => setOpen(false)
    const ask = (p: string) => { close(); sendToAgent(p) }
    const go = (v: any) => { close(); openCanvas({ view: v }) }
    const base: Cmd[] = ([
      { id: 'a1', group: 'Ask the agent', label: 'Review the Vishay redline', icon: <GitPullRequestArrow size={15} />, cap: 'review', run: () => ask('review the Vishay redline') },
      { id: 'a2', group: 'Ask the agent', label: "What's on my plate?", icon: <Inbox size={15} />, cap: 'queue', run: () => ask("what's on my plate?") },
      { id: 'a3', group: 'Ask the agent', label: 'Draft a new NDA…', icon: <FileText size={15} />, cap: 'intake', run: () => ask('create a new NDA') },
      { id: 'a4', group: 'Ask the agent', label: 'Summarize the Mondelez deal', icon: <ScrollText size={15} />, cap: 'deal_summary', run: () => ask('summarize the Mondelez deal') },
      { id: 'n1', group: 'Go to', label: 'My Queue', icon: <Inbox size={15} />, cap: 'queue', run: () => go('queue') },
      { id: 'n2', group: 'Go to', label: 'NDA Playbook', icon: <BookOpen size={15} />, cap: 'playbook_view', run: () => go('playbook') },
      { id: 'n3', group: 'Go to', label: 'Pipeline overview', icon: <LayoutDashboard size={15} />, cap: 'pipeline', run: () => go('dashboard') },
      { id: 'n4', group: 'Go to', label: 'Audit center', icon: <ScrollText size={15} />, cap: 'audit', run: () => go('audit') },
      { id: 'n5', group: 'Go to', label: 'Notifications', icon: <Bell size={15} />, cap: 'notifications', run: () => go('notifications') },
      { id: 'n6', group: 'Go to', label: 'Admin console', icon: <Settings size={15} />, cap: 'admin', run: () => go('admin') },
    ] as Cmd[]).filter((c) => !c.cap || can(role, c.cap))
    const personas: Cmd[] = users.map((u) => ({
      id: 'p_' + u.id, group: 'Switch persona', label: u.name, hint: u.role.replace('_', ' '),
      icon: <UserCog size={15} />, run: () => { close(); setPersona(u.id) },
    }))
    return [...base, ...personas]
  }, [openCanvas, setPersona, users, role])

  const filtered = commands.filter((c) => (c.label + ' ' + (c.hint ?? '') + ' ' + c.group).toLowerCase().includes(q.toLowerCase()))
  useEffect(() => setActive(0), [q, open])

  if (!open) return null
  const groups = Array.from(new Set(filtered.map((c) => c.group)))

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/30 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
          <Search size={17} className="text-slate-400" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
              if (e.key === 'Enter') { e.preventDefault(); filtered[active]?.run() }
            }}
            placeholder="Search commands, ask the agent, jump anywhere…"
            className="flex-1 text-[14px] outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {filtered.length === 0 && <div className="px-3 py-6 text-center text-[13px] text-slate-400">No matches — press Enter to ask the agent.</div>}
          {groups.map((g) => (
            <div key={g} className="mb-1">
              <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{g}</div>
              {filtered.filter((c) => c.group === g).map((c) => {
                const idx = filtered.indexOf(c)
                return (
                  <button key={c.id} onMouseEnter={() => setActive(idx)} onClick={c.run}
                    className={clsx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left', idx === active ? 'bg-ai-50 text-ai-700' : 'text-slate-600 hover:bg-slate-50')}>
                    <span className={idx === active ? 'text-ai-500' : 'text-slate-400'}>{c.icon}</span>
                    <span className="text-[13.5px] font-medium">{c.label}</span>
                    {c.hint && <span className="text-[11.5px] capitalize text-slate-400">{c.hint}</span>}
                    {idx === active && <CornerDownLeft size={13} className="ml-auto text-ai-400" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
          <Sparkles size={12} className="text-ai-500" /> Tip: type anything and press Enter to send it to the CLM agent.
        </div>
      </div>
    </div>
  )
}
