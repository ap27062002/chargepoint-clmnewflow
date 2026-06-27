import { Bell, ChevronDown, Zap, Search } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '@/store'
import { Avatar } from '@/components/ui'

export function TopBar() {
  const users = useStore((s) => s.users)
  const currentUserId = useStore((s) => s.currentUserId)
  const setPersona = useStore((s) => s.setPersona)
  const setView = useStore((s) => s.setView)
  const closeCanvas = useStore((s) => s.closeCanvas)
  const setCmdkOpen = useStore((s) => s.setCmdkOpen)
  const notifications = useStore((s) => s.notifications)
  const unread = notifications.filter((n) => !n.read).length
  const [open, setOpen] = useState(false)
  const cu = users.find((u) => u.id === currentUserId)!

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 text-white">
      <button onClick={closeCanvas} className="flex items-center gap-2.5" title="Back to agent">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
          <Zap size={18} className="text-white" fill="white" />
        </div>
        <div className="leading-tight text-left">
          <div className="text-[14px] font-bold tracking-tight">ChargePoint <span className="font-normal text-slate-400">· Legal CLM</span></div>
        </div>
        <span className="ml-2 hidden rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 sm:inline">UAT · built by Unify</span>
      </button>

      <button onClick={() => setCmdkOpen(true)}
        className="group hidden min-w-[300px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-slate-400 transition hover:border-slate-600 md:flex">
        <Search size={14} />
        <span className="text-[12.5px]">Search or ask the agent…</span>
        <kbd className="ml-auto rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">⌘K</kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <button onClick={() => setView('notifications')} className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800">
          <Bell size={18} />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold">{unread}</span>}
        </button>
        <div className="relative">
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-800">
            <Avatar userId={cu.id} size={28} />
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-[12.5px] font-semibold">{cu.name}</div>
              <div className="text-[10px] capitalize text-slate-400">{cu.role.replace('_', ' ')}</div>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-pop">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Switch persona (RBAC demo)</div>
                {users.map((u) => (
                  <button key={u.id} onClick={() => { setPersona(u.id); setOpen(false) }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
                    <Avatar userId={u.id} size={26} />
                    <div className="leading-tight">
                      <div className="text-[12.5px] font-semibold">{u.name}</div>
                      <div className="text-[10.5px] capitalize text-slate-400">{u.role.replace('_', ' ')} · {u.title}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
