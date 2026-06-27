import { clsx } from 'clsx'
import { Bell, Mail, MessageSquare, Hash, Check, AlertTriangle, Info, CircleAlert } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Button } from '@/components/ui'
import { channelLabel, fmtDateTime } from '@/lib/labels'
import type { NotificationChannel } from '@/types'

const chIcon: Record<NotificationChannel, JSX.Element> = {
  in_app: <Bell size={11} />, email: <Mail size={11} />, teams: <MessageSquare size={11} />, slack: <Hash size={11} />,
}
const sevMeta = {
  info: { icon: <Info size={16} className="text-sky-500" />, ring: 'border-slate-200' },
  warning: { icon: <CircleAlert size={16} className="text-amber-500" />, ring: 'border-amber-200' },
  critical: { icon: <AlertTriangle size={16} className="text-red-500" />, ring: 'border-red-200' },
}

export function NotificationsView() {
  const notifications = useStore((s) => s.notifications)
  const markRead = useStore((s) => s.markNotificationRead)
  const markAll = useStore((s) => s.markAllNotificationsRead)
  const openTicket = useStore((s) => s.openTicket)
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <div className="flex items-center gap-2"><Bell size={20} className="text-slate-700" /><h1 className="text-xl font-bold text-slate-800">Notification Center</h1>{unread > 0 && <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20">{unread} unread</Chip>}</div>
          <p className="text-[13px] text-slate-500">Delivered in-app and to email, Teams, and Slack per your routing rules.</p>
        </div>
        <Button variant="outline" size="sm" icon={<Check size={14} />} onClick={markAll}>Mark all read</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-2.5">
          {notifications.map((n) => {
            const sv = sevMeta[n.severity]
            return (
              <Card key={n.id} className={clsx('flex items-start gap-3 p-3.5', sv.ring, !n.read && 'bg-white ring-1 ring-brand-100')}>
                <div className="mt-0.5">{sv.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-bold text-slate-800">{n.event}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                    <span className="ml-auto text-[11px] text-slate-400">{fmtDateTime(n.created_date)}</span>
                  </div>
                  <div className="mt-0.5 text-[13px] text-slate-600">{n.body}</div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {n.channels.map((c) => (
                      <Chip key={c} className="bg-slate-100 text-slate-500 ring-slate-300/30">{chIcon[c]} {channelLabel[c]}</Chip>
                    ))}
                    {n.ticket_id && <button onClick={() => openTicket(n.ticket_id!)} className="ml-auto text-[12px] font-semibold text-brand-600 hover:underline">Open {n.ticket_id}</button>}
                    {!n.read && <button onClick={() => markRead(n.id)} className="text-[12px] font-semibold text-slate-400 hover:text-slate-600">Mark read</button>}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
