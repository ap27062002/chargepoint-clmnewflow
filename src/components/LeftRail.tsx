import { clsx } from 'clsx'
import { Sparkles, LayoutDashboard, BookOpen, FolderTree, Lock, FileStack } from 'lucide-react'
import { useStore } from '@/store'
import { can } from '@/lib/access'
import type { Role } from '@/types'

type RailKey = 'agent' | 'dashboard' | 'repository' | 'playbook' | 'projects'
type RailItem = {
  key: RailKey
  label: string
  icon: JSX.Element
  locked?: boolean // restricted-access marker (Archive)
  show?: (role: Role) => boolean
}

const ITEMS: RailItem[] = [
  { key: 'agent', label: 'Agent', icon: <Sparkles size={18} /> },
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, show: (r) => can(r, 'pipeline') },
  { key: 'repository', label: 'Archive', icon: <FolderTree size={18} />, locked: true, show: (r) => can(r, 'review') || can(r, 'pipeline') },
  { key: 'playbook', label: 'Playbook', icon: <BookOpen size={18} />, show: (r) => can(r, 'playbook_view') },
  { key: 'projects', label: 'Templates', icon: <FileStack size={18} />, show: (r) => can(r, 'templates') },
]

export function LeftRail() {
  const open = useStore((s) => s.canvas.open)
  const view = useStore((s) => s.canvas.view)
  const openFull = useStore((s) => s.openFull)
  const closeCanvas = useStore((s) => s.closeCanvas)
  const navigate = useStore((s) => s.navigate)
  const role = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!.role)

  const visible = ITEMS.filter((i) => !i.show || i.show(role))

  const go = (k: RailKey) => {
    if (k === 'agent') closeCanvas()
    else {
      openFull(k) // full-width section; the agent collapses and is one click away
      // Nav lands on the all-playbooks LIBRARY (agent deep-links still open a specific playbook).
      if (k === 'playbook') navigate({ playbookMode: 'library', playbookId: undefined, playbookDraftId: undefined })
    }
  }

  const isActive = (k: RailKey) =>
    k === 'agent' ? !open : open && view === k

  return (
    <nav className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 border-r border-slate-200 bg-white py-3">
      {visible.map((i) => {
        const active = isActive(i.key)
        return (
          <button
            key={i.key}
            onClick={() => go(i.key)}
            title={i.label}
            className={clsx(
              'flex w-14 flex-col items-center gap-1 rounded-xl py-2 text-[10.5px] font-semibold transition',
              active ? 'bg-ai-50 text-ai-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600',
            )}
          >
            {i.icon}
            <span className="flex items-center gap-0.5">{i.label}{i.locked && <Lock size={8} className="opacity-60" />}</span>
          </button>
        )
      })}
    </nav>
  )
}
