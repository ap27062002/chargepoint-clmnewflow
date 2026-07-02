// R102 — multiple entry points into the CLM agent (Slack nudge, Microsoft Teams nudge, OR a
// standalone landing page / app), not one fixed channel. All three are reachable and each opens
// the agent. A switcher lets you demo any entry path.
import { clsx } from 'clsx'
import { MessageSquare, Users, Globe, Sparkles, ArrowRight, Bell } from 'lucide-react'
import { useStore } from '@/store'
import { SlackLanding } from '@/components/SlackLanding'

const CHANNELS = [
  { key: 'slack', label: 'Slack', icon: <MessageSquare size={13} /> },
  { key: 'teams', label: 'Microsoft Teams', icon: <Users size={13} /> },
  { key: 'landing', label: 'Web app', icon: <Globe size={13} /> },
] as const

function ChannelSwitch() {
  const channel = useStore((s) => s.entryChannel)
  const setChannel = useStore((s) => s.setEntryChannel)
  return (
    <div className="flex items-center justify-center gap-2 border-b border-slate-200 bg-white/80 py-2 text-[12px] backdrop-blur">
      <span className="text-slate-400">Reach the CLM agent via:</span>
      {CHANNELS.map((c) => (
        <button key={c.key} onClick={() => setChannel(c.key)}
          className={clsx('flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition', channel === c.key ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100')}>
          {c.icon} {c.label}
        </button>
      ))}
    </div>
  )
}

function TeamsLanding() {
  const user = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!)
  const enterApp = useStore((s) => s.enterApp)
  const first = user.name.split(' ')[0]
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f0f0f8] p-8">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-panel ring-1 ring-slate-200">
        <div className="flex items-center gap-2 bg-[#4b53bc] px-4 py-2.5 text-white">
          <Users size={16} /> <span className="text-[13px] font-semibold">Microsoft Teams · Activity</span>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4b53bc] text-white"><Sparkles size={18} /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[13px]"><span className="font-bold text-slate-800">ChargePoint CLM</span><span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">BOT</span><span className="text-[11px] text-slate-400">8:07 AM</span></div>
              <p className="mt-1 text-[13px] text-slate-700">Good morning, <b>{first}</b> 👋 You have <b>3 items on your plate today</b>. I triaged your queue overnight — a Vishay redline (2 red lines), an Airbus NDA at 80% of SLA, and a §3(e) sign-off waiting on Daniel.</p>
              <button onClick={enterApp} className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#4b53bc] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:brightness-110"><Bell size={13} /> Open ChargePoint CLM <ArrowRight size={13} /></button>
              <div className="mt-2 text-[11px] text-slate-400">Opens your CLM agent — assists only; you stay the decision-maker.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WebLanding() {
  const user = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!)
  const enterApp = useStore((s) => s.enterApp)
  const first = user.name.split(' ')[0]
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-8 text-white">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500"><Sparkles size={28} /></div>
        <h1 className="text-2xl font-bold">ChargePoint Legal CLM</h1>
        <p className="mt-2 text-[14px] text-slate-300">Welcome back, {first}. Your agent has triaged the queue — <b>3 items</b> need you today. Sign in to pick up where you left off.</p>
        <button onClick={enterApp} className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-600">Sign in with Microsoft Entra ID <ArrowRight size={15} /></button>
        <div className="mt-3 text-[11.5px] text-slate-400">Standalone web app · same agent, no Slack/Teams required.</div>
      </div>
    </div>
  )
}

export function EntryLanding() {
  const channel = useStore((s) => s.entryChannel)
  return (
    <div className="flex h-full flex-col">
      <ChannelSwitch />
      {channel === 'slack' ? <div className="min-h-0 flex-1"><SlackLanding /></div>
        : channel === 'teams' ? <TeamsLanding />
        : <WebLanding />}
    </div>
  )
}
