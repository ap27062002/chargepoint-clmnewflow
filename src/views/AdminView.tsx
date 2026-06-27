import { useState } from 'react'
import { clsx } from 'clsx'
import { GitBranch, Timer, CheckSquare, Bell, Users, Plug, Check } from 'lucide-react'
import { Card, Chip, Avatar, SectionLabel, Button } from '@/components/ui'
import { useStore } from '@/store'
import { ROUTING_LABEL, type RoutingStrategy } from '@/lib/routing'

const TABS = [
  { key: 'routing', label: 'Routing', icon: <GitBranch size={15} /> },
  { key: 'sla', label: 'SLAs', icon: <Timer size={15} /> },
  { key: 'approvals', label: 'Approvals', icon: <CheckSquare size={15} /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
  { key: 'users', label: 'Users & RBAC', icon: <Users size={15} /> },
  { key: 'integrations', label: 'Integrations', icon: <Plug size={15} /> },
] as const

type Tab = (typeof TABS)[number]['key']

function Toggle({ on, label, sub }: { on: boolean; label: string; sub?: string }) {
  const [v, setV] = useState(on)
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
      <div><div className="text-[13px] font-semibold text-slate-700">{label}</div>{sub && <div className="text-[11.5px] text-slate-400">{sub}</div>}</div>
      <button onClick={() => setV(!v)} className={clsx('relative h-5 w-9 rounded-full transition', v ? 'bg-brand-500' : 'bg-slate-300')}>
        <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white transition', v ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </div>
  )
}

const integrations = [
  { name: 'Microsoft Entra ID', cat: 'Identity', status: 'connected' },
  { name: 'DocuSign', cat: 'E-Signature', status: 'connected' },
  { name: 'SharePoint / OneDrive', cat: 'Documents', status: 'connected' },
  { name: 'Outlook', cat: 'Email', status: 'connected' },
  { name: 'Microsoft Teams', cat: 'Notifications', status: 'connected' },
  { name: 'Slack', cat: 'Notifications', status: 'available' },
  { name: 'Salesforce', cat: 'CRM', status: 'pending' },
  { name: 'Claude (Anthropic)', cat: 'LLM', status: 'connected' },
  { name: 'Azure OpenAI', cat: 'LLM', status: 'available' },
]

function RoutingTab() {
  const strategy = useStore((s) => s.routingStrategy)
  const setStrategy = useStore((s) => s.setRoutingStrategy)
  const subs: Record<RoutingStrategy, string> = {
    expertise: 'Match by agreement-type expertise', workload: 'Assign to the attorney with the lowest open load',
    hybrid: 'Expertise match, then lowest load among experts', round_robin: 'Rotate evenly across attorneys',
    manual: 'Always require a manual choice',
  }
  return (
    <div className="grid max-w-2xl gap-3">
      <SectionLabel>Assignment routing strategy — active for new tickets</SectionLabel>
      {(Object.keys(ROUTING_LABEL) as RoutingStrategy[]).map((r) => (
        <button key={r} onClick={() => setStrategy(r)}
          className={clsx('flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition', strategy === r ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
          <div>
            <div className={clsx('text-[13px] font-semibold', strategy === r ? 'text-brand-700' : 'text-slate-700')}>{ROUTING_LABEL[r]}</div>
            <div className="text-[11.5px] text-slate-400">{subs[r]}</div>
          </div>
          <span className={clsx('flex h-4 w-4 items-center justify-center rounded-full border-2', strategy === r ? 'border-brand-500' : 'border-slate-300')}>
            {strategy === r && <span className="h-2 w-2 rounded-full bg-brand-500" />}
          </span>
        </button>
      ))}
      <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
        New agreements created via intake are routed using this strategy — try it: switch to <b>Workload balance</b>, then ask the agent to draft an NDA and watch who it's assigned to in the audit log.
      </div>
    </div>
  )
}

export function AdminView() {
  const [tab, setTab] = useState<Tab>('routing')
  const users = useStore((s) => s.users)
  const setToast = useStore((s) => s.setToast)
  const [connected, setConnected] = useState<string[]>([])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-6 pt-4">
        <h1 className="text-xl font-bold text-slate-800">Admin Console</h1>
        <p className="text-[13px] text-slate-500">Configure routing, SLAs, approvals, notifications, users, and integrations.</p>
        <div className="mt-3 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={clsx('flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-semibold transition', tab === t.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-400 hover:text-slate-600')}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'routing' && <RoutingTab />}
        {tab === 'sla' && (
          <div className="grid max-w-2xl gap-3">
            <SectionLabel>SLA cycle-time targets (business days)</SectionLabel>
            {[['NDA / MNDA', 7], ['MSA', 14], ['DPA', 10], ['SOW', 5]].map(([k, v]) => (
              <div key={k as string} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                <span className="text-[13px] font-semibold text-slate-700">{k}</span>
                <span className="rounded-md bg-slate-100 px-3 py-1 text-[13px] font-bold text-slate-700">{v} days</span>
              </div>
            ))}
            <Toggle on label="Escalate at 80% of SLA window" sub="Warning notification + manager escalation on breach" />
          </div>
        )}
        {tab === 'approvals' && (
          <div className="grid max-w-2xl gap-3">
            <SectionLabel>Approval rules</SectionLabel>
            <Toggle on label="Deal-value approval" sub="Deals > $1M require VP Legal sign-off" />
            <Toggle on label="Agreement-type approval" sub="DPAs require Privacy counsel approval" />
            <Toggle on label="Red-line approval" sub="Any accepted red-line deviation escalates to Playbook Owner" />
            <div className="mt-2 flex gap-2">
              <Chip className="bg-slate-100 text-slate-600 ring-slate-300/40">Sequential</Chip>
              <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20">Parallel (active)</Chip>
            </div>
          </div>
        )}
        {tab === 'notifications' && (
          <div className="grid max-w-2xl gap-3">
            <SectionLabel>Notification channels by event</SectionLabel>
            {['Ticket created', 'Contributor tagged', 'Redline received', 'Approval request', 'SLA warning', 'Signature completed', 'AI analysis complete'].map((e) => (
              <div key={e} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                <span className="text-[13px] font-semibold text-slate-700">{e}</span>
                <div className="flex gap-1.5">
                  {['In-app', 'Email', 'Teams', 'Slack'].map((c, i) => (
                    <Chip key={c} className={i < 2 || e.includes('SLA') ? 'bg-brand-50 text-brand-700 ring-brand-500/20' : 'bg-slate-100 text-slate-400 ring-slate-300/30'}>{c}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'users' && (
          <Card className="max-w-3xl overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead><tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-semibold">User</th><th className="px-2 py-2 font-semibold">Role (Entra-synced)</th><th className="px-2 py-2 font-semibold">Title</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50">
                    <td className="px-4 py-2.5"><div className="flex items-center gap-2"><Avatar userId={u.id} size={24} /><span className="font-semibold text-slate-700">{u.name}</span></div></td>
                    <td className="px-2 py-2.5"><Chip className="bg-indigo-50 text-indigo-600 ring-indigo-500/20 capitalize">{u.role.replace('_', ' ')}</Chip></td>
                    <td className="px-2 py-2.5 text-slate-500">{u.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        {tab === 'integrations' && (
          <div className="grid max-w-3xl grid-cols-2 gap-3">
            {integrations.map((it) => (
              <Card key={it.name} className="flex items-center justify-between p-3.5">
                <div><div className="text-[13px] font-bold text-slate-700">{it.name}</div><div className="text-[11.5px] text-slate-400">{it.cat}</div></div>
                {it.status === 'connected' || connected.includes(it.name)
                  ? <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20"><Check size={11} /> Connected</Chip>
                  : it.status === 'pending'
                    ? <Chip className="bg-amber-50 text-amber-700 ring-amber-500/20">Pending</Chip>
                    : <Button size="sm" variant="outline" onClick={() => { setConnected((c) => [...c, it.name]); setToast(`${it.name} connected.`) }}>Connect</Button>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
