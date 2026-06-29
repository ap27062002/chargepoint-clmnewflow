import { clsx } from 'clsx'
import { Hash, ChevronDown, Search, Bell, Sparkles, ArrowRight, Lock } from 'lucide-react'
import { useStore } from '@/store'

const channels = ['legal-clm', 'contracts', 'deal-desk', 'general']
const dms = [
  { name: 'ChargePoint CLM', app: true, active: true, unread: 3 },
  { name: 'Eric Batill', app: false, active: false, unread: 0 },
  { name: 'Marcus Reed', app: false, active: false, unread: 0 },
]

export function SlackLanding() {
  const user = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!)
  const enterApp = useStore((s) => s.enterApp)
  const first = user.name.split(' ')[0]

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-slate-800">
      {/* Workspace rail */}
      <div className="flex w-[68px] shrink-0 flex-col items-center gap-4 bg-[#3a0d3c] py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[15px] font-black text-[#3a0d3c]">CP</div>
        <div className="h-px w-7 bg-white/15" />
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/70"><Bell size={17} /></div>
        <div className="mt-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#6442d4] text-[12px] font-bold text-white">{user.initials}</div>
      </div>

      {/* Channels sidebar */}
      <aside className="flex w-[260px] shrink-0 flex-col bg-[#4a154b] text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
          <div className="flex items-center gap-1 text-[15px] font-black">ChargePoint <ChevronDown size={15} /></div>
        </div>
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1.5 text-[12.5px] text-white/60"><Search size={13} /> Search ChargePoint</div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 text-[14px]">
          <div className="mt-1 px-2 text-[12px] font-semibold text-white/50">Channels</div>
          {channels.map((c) => (
            <div key={c} className="flex items-center gap-2 rounded-md px-2 py-1 text-white/75 hover:bg-white/10">
              <Hash size={14} className="text-white/45" />{c}
            </div>
          ))}
          <div className="mt-3 px-2 text-[12px] font-semibold text-white/50">Direct messages</div>
          {dms.map((d) => (
            <div key={d.name} className={clsx('flex items-center gap-2 rounded-md px-2 py-1', d.active ? 'bg-[#1164a3] font-bold text-white' : 'text-white/75 hover:bg-white/10')}>
              <span className={clsx('h-2 w-2 rounded-sm', d.app ? 'bg-emerald-400' : 'bg-white/40')} />
              <span className="flex-1 truncate">{d.name}{d.app && <span className="ml-1 rounded bg-white/20 px-1 py-px text-[9px] font-bold uppercase tracking-wide">App</span>}</span>
              {d.unread > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10.5px] font-bold text-white">{d.unread}</span>}
            </div>
          ))}
        </div>
      </aside>

      {/* Main conversation */}
      <main className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-ai-500 to-ai-700 text-white"><Sparkles size={13} /></span>
          <span className="text-[15px] font-bold text-slate-800">ChargePoint CLM</span>
          <span className="rounded bg-slate-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-slate-500">App</span>
          <span className="ml-2 flex items-center gap-1 text-[12px] text-slate-400"><Lock size={11} /> Private notifications from your CLM agent</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 text-center text-[11px] font-semibold text-slate-400">Today</div>

          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ai-500 to-ai-700 text-white shadow-sm"><Sparkles size={18} /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-slate-800">ChargePoint CLM</span>
                <span className="rounded bg-slate-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-slate-500">App</span>
                <span className="text-[11.5px] text-slate-400">8:07 AM</span>
              </div>
              <p className="mt-1 text-[14px] leading-relaxed text-slate-700">
                Good morning, {first} 👋 &nbsp;You have <b>3 items on your plate today</b>. I've triaged your queue overnight — here's what needs you:
              </p>

              {/* Slack attachment card */}
              <div className="mt-2.5 max-w-xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
                <div className="flex">
                  <div className="w-1 shrink-0 bg-ai-500" />
                  <div className="flex-1 p-3.5">
                    <div className="text-[13.5px] font-bold text-slate-800">3 actionable items · ChargePoint Legal CLM</div>
                    <ul className="mt-2 space-y-1.5 text-[13px] text-slate-600">
                      <li className="flex gap-2"><span className="text-red-500">●</span> <span><b>Vishay NDA</b> — redline analyzed; 2 red lines + 4 negotiables awaiting your dispositions.</span></li>
                      <li className="flex gap-2"><span className="text-amber-500">●</span> <span><b>Airbus NDA</b> — at 80% of SLA, 3 open red lines.</span></li>
                      <li className="flex gap-2"><span className="text-slate-400">●</span> <span><b>Daniel Vohrer</b> hasn't responded on the §3(e) data-controller tag.</span></li>
                    </ul>
                    <button
                      onClick={enterApp}
                      className="mt-3.5 inline-flex items-center gap-1.5 rounded-md bg-[#007a5a] px-3.5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#148567]"
                    >
                      <Sparkles size={14} /> Open ChargePoint CLM <ArrowRight size={14} />
                    </button>
                    <div className="mt-2 text-[11px] text-slate-400">Opens your CLM agent — assists only; you stay the decision-maker.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slack composer (decorative) */}
        <div className="px-6 pb-5">
          <div className="rounded-lg border border-slate-300 px-3 py-2.5 text-[13px] text-slate-400">Message ChargePoint CLM</div>
          <button onClick={enterApp} className="mt-2 text-[12px] font-semibold text-ai-600 hover:underline">or click the notification above to jump into the CLM agent →</button>
        </div>
      </main>
    </div>
  )
}
