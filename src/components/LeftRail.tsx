import { clsx } from 'clsx'
import { LayoutDashboard, Inbox, BookOpen, Settings, ScrollText, Bell } from 'lucide-react'
import { useStore } from '@/store'
import type { ViewKey } from '@/types'

const items: { key: ViewKey; label: string; icon: JSX.Element }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'ticket', label: 'Tickets', icon: <Inbox size={18} /> },
  { key: 'playbook', label: 'Playbooks', icon: <BookOpen size={18} /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { key: 'audit', label: 'Audit', icon: <ScrollText size={18} /> },
  { key: 'admin', label: 'Admin', icon: <Settings size={18} /> },
]

export function LeftRail() {
  const view = useStore((s) => s.canvas.view)
  const setView = useStore((s) => s.setView)
  const openTicket = useStore((s) => s.openTicket)
  const tickets = useStore((s) => s.tickets)
  const role = useStore((s) => s.users.find((u) => u.id === s.currentUserId)?.role)

  const go = (k: ViewKey) => {
    if (k === 'ticket') { openTicket(tickets[0].id) } else setView(k)
  }

  const visible = items.filter((i) => (i.key === 'admin' ? role === 'administrator' || role === 'playbook_owner' : true))

  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-white py-3">
      {visible.map((i) => {
        const active = view === i.key || (i.key === 'ticket' && (view === 'ticket' || view === 'agreement'))
        return (
          <button
            key={i.key}
            onClick={() => go(i.key)}
            title={i.label}
            className={clsx(
              'flex w-12 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition',
              active ? 'bg-brand-50 text-brand-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600',
            )}
          >
            {i.icon}
            <span>{i.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
