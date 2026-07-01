import { useState } from 'react'
import { clsx } from 'clsx'
import { GitBranch, Timer, CheckSquare, Bell, Users, Plug, Check, Rocket, TrendingUp, Megaphone, GraduationCap } from 'lucide-react'
import { Card, Chip, Avatar, SectionLabel, Button } from '@/components/ui'
import { useStore } from '@/store'
import { ROUTING_LABEL, type RoutingStrategy } from '@/lib/routing'

const TABS = [
  { key: 'routing', label: 'Routing', icon: <GitBranch size={15} /> },
  { key: 'sla', label: 'SLAs', icon: <Timer size={15} /> },
  { key: 'approvals', label: 'Approvals', icon: <CheckSquare size={15} /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
  { key: 'users', label: 'Users & RBAC', icon: <Users size={15} /> },
  { key: 'adoption', label: 'Adoption', icon: <Rocket size={15} /> },
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

function AdoptionTab() {
  const setToast = useStore((s) => s.setToast)
  const [nudged, setNudged] = useState(false)
  const teams = [
    { team: 'Legal — Commercial', pct: 92 },
    { team: 'Legal — Privacy', pct: 78 },
    { team: 'Strategic Partnerships (biz)', pct: 61 },
    { team: 'Finance Business Partners', pct: 34 },
  ]
  const phases = [
    { name: 'Pilot — Commercial Legal', state: 'done' as const },
    { name: 'Rollout — full Legal team', state: 'active' as const },
    { name: 'Business-user self-serve intake', state: 'active' as const },
    { name: 'Org-wide (all deal teams)', state: 'todo' as const },
  ]
  return (
    <div className="grid max-w-3xl gap-4">
      <div className="grid grid-cols-3 gap-3">
        {[['Active users (30d)', '38 / 54', '70%'], ['NDAs via self-serve', '61%', '+18pts QoQ'], ['Avg. cycle time', '4.2 days', '−41% vs baseline']].map(([label, value, sub]) => (
          <Card key={label} className="p-3.5"><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-[19px] font-bold text-slate-800">{value}</div><div className="text-[11.5px] font-semibold text-brand-600">{sub}</div></Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="mb-2 flex items-center gap-1.5"><TrendingUp size={14} className="text-brand-600" /><SectionLabel>Adoption by team</SectionLabel></div>
        <div className="space-y-2.5">
          {teams.map((t) => (
            <div key={t.team} className="flex items-center gap-3">
              <span className="w-56 shrink-0 text-[12.5px] font-semibold text-slate-600">{t.team}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={clsx('h-full rounded-full', t.pct >= 70 ? 'bg-brand-500' : t.pct >= 45 ? 'bg-amber-400' : 'bg-red-400')} style={{ width: `${t.pct}%` }} /></div>
              <span className="w-9 shrink-0 text-right text-[12px] font-bold text-slate-700">{t.pct}%</span>
              {t.pct < 45 && <Button size="sm" variant="outline" icon={<Megaphone size={12} />} onClick={() => { setNudged(true); setToast(`Enablement nudge sent to ${t.team}.`) }} disabled={nudged}>{nudged ? 'Nudged' : 'Nudge'}</Button>}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2.5 flex items-center gap-1.5"><Rocket size={14} className="text-brand-600" /><SectionLabel>Rollout plan</SectionLabel></div>
        <div className="space-y-2">
          {phases.map((p) => (
            <div key={p.name} className="flex items-center gap-2.5">
              <span className={clsx('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold', p.state === 'done' ? 'bg-brand-500 text-white' : p.state === 'active' ? 'bg-ai-600 text-white' : 'bg-slate-200 text-slate-400')}>{p.state === 'done' ? <Check size={12} /> : ''}</span>
              <span className={clsx('text-[12.5px]', p.state === 'todo' ? 'text-slate-400' : 'font-semibold text-slate-700')}>{p.name}</span>
              {p.state === 'active' && <Chip className="bg-ai-50 text-ai-700 ring-ai-500/20">In progress</Chip>}
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2.5"><GraduationCap size={18} className="text-ai-600" /><div><div className="text-[13px] font-bold text-slate-700">Change management</div><div className="text-[11.5px] text-slate-400">Broadcast the in-app tour + office hours to teams under 70% adoption.</div></div></div>
        <Button size="sm" variant="ai" icon={<Megaphone size={13} />} onClick={() => setToast('Announcement + guided tour scheduled for low-adoption teams.')}>Announce rollout</Button>
      </Card>
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
        {tab === 'adoption' && <AdoptionTab />}
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
