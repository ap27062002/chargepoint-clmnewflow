import { useState } from 'react'
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight, Check, X, CornerUpLeft, Sparkles, Crosshair, ShieldCheck, BookOpen } from 'lucide-react'
import { useStore } from '@/store'
import { Chip } from '@/components/ui'
import { can } from '@/lib/access'
import { riskMeta, dispositionMeta } from '@/lib/labels'
import type { Provision } from '@/types'

// Flatten a playbook's provisions (incl. nested children) for name-matching.
function flatten(ps: Provision[]): Provision[] {
  return ps.flatMap((p) => [p, ...(p.children ? flatten(p.children) : [])])
}
function matchProvision(all: Provision[], name: string): Provision | undefined {
  const key = name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3)[0] ?? name.toLowerCase()
  return all.find((p) => p.provision_name.toLowerCase().includes(key) || name.toLowerCase().includes(p.provision_name.toLowerCase().split(' ')[0]))
}

export function ReviewDirective({ agreementId, onFocus }: { agreementId: string; onFocus: (deviationId: string) => void }) {
  const deviations = useStore((s) => s.deviations)
  const agreements = useStore((s) => s.agreements)
  const playbooks = useStore((s) => s.playbooks)
  const setDisposition = useStore((s) => s.setDisposition)
  const openCanvas = useStore((s) => s.openCanvas)
  const canDispose = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'disposition'))
  const [step, setStep] = useState(0)

  const devs = [...deviations.filter((d) => d.agreement_id === agreementId)].sort((a, b) => riskMeta[a.risk_category].order - riskMeta[b.risk_category].order)
  const agreement = agreements.find((a) => a.id === agreementId)
  const pb = playbooks.find((p) => p.id === (agreement?.playbook_id ?? '')) ?? playbooks[0]
  const flat = flatten(pb.provisions)

  if (devs.length === 0) {
    return <div className="flex h-full items-center justify-center px-6 text-center text-[12.5px] text-slate-400">No playbook issues to walk through for this agreement.</div>
  }
  const i = Math.min(step, devs.length - 1)
  const d = devs[i]
  const prov = matchProvision(flat, d.provision_name)
  const rm = riskMeta[d.risk_category]
  const go = (next: number) => { const n = Math.max(0, Math.min(devs.length - 1, next)); setStep(n); onFocus(devs[n].id) }

  return (
    <div className="flex h-full flex-col">
      {/* directive header — the AI walking you through the document */}
      <div className="shrink-0 border-b border-slate-100 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-ai-700"><Sparkles size={13} /> Playbook review</div>
          <div className="flex items-center gap-1">
            <button onClick={() => go(i - 1)} disabled={i === 0} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={15} /></button>
            <span className="text-[11.5px] font-semibold text-slate-500">Issue {i + 1} / {devs.length}</span>
            <button onClick={() => go(i + 1)} disabled={i === devs.length - 1} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={15} /></button>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {devs.map((x, idx) => (
            <button key={x.id} onClick={() => go(idx)} title={x.provision_name}
              className={clsx('h-1.5 rounded-full transition', idx === i ? 'w-5' : 'w-1.5', riskMeta[x.risk_category].dot, idx === i ? '' : 'opacity-40')} />
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* current issue */}
        <div>
          <div className="flex items-center gap-2">
            <Chip className={clsx('ring-1 ring-inset', rm.chip)}><span className={clsx('h-1.5 w-1.5 rounded-full', rm.dot)} /> {rm.label}</Chip>
            <span className="text-[13.5px] font-bold text-slate-800">{d.provision_name}</span>
            <span className="font-mono text-[11px] text-slate-400">{d.section_reference}</span>
          </div>
          <button onClick={() => onFocus(d.id)} className="mt-1.5 flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:underline"><Crosshair size={12} /> Focus this clause in the document</button>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Counterparty's change</div>
          <div className="rounded-lg bg-red-50/50 px-2.5 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-red-100">{d.counterparty_position}</div>
        </div>

        {/* Playbook guidance — deviation + fallbacks + red line, one view (Eric §6) */}
        {prov && (
          <div className="rounded-lg border border-ai-100 bg-ai-50/40 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ai-700"><BookOpen size={11} /> Playbook — {prov.provision_name}</div>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex gap-1.5"><ShieldCheck size={12} className="mt-0.5 shrink-0 text-brand-500" /><span><b>Standard:</b> {prov.standard_position}</span></div>
              {prov.fallback_tiers.map((f, k) => (
                <div key={k} className="flex gap-1.5"><span className="mt-0.5 text-[10px] font-bold text-amber-600">F{k + 1}</span><span className="text-slate-600">{f}</span></div>
              ))}
              <div className="flex gap-1.5"><X size={12} className="mt-0.5 shrink-0 text-red-500" /><span className="text-slate-600"><b>Not acceptable:</b> {prov.red_line}</span></div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ai-600"><Sparkles size={11} /> Recommended</div>
          <div className="rounded-lg bg-white px-2.5 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-slate-200">{d.recommended_response}</div>
        </div>
      </div>

      {/* disposition bar */}
      <div className="shrink-0 border-t border-slate-100 p-2.5">
        {canDispose ? (
          <div className="flex items-center gap-1.5">
            {([['accepted', 'Accept', Check, 'brand'], ['countered', 'Counter', CornerUpLeft, 'amber'], ['rejected', 'Reject', X, 'red']] as const).map(([st, label, Icon, tone]) => (
              <button key={st} onClick={() => { setDisposition(d.id, st); if (i < devs.length - 1) go(i + 1) }}
                className={clsx('flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[12px] font-semibold transition',
                  d.disposition_status === st
                    ? tone === 'brand' ? 'border-brand-500 bg-brand-500 text-white' : tone === 'amber' ? 'border-amber-500 bg-amber-500 text-white' : 'border-red-500 bg-red-500 text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center text-[11px] text-slate-400">Read-only — dispositions are set by the Assigned Attorney.</div>
        )}
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
          <span>Current: <Chip className={clsx('ring-1 ring-inset', dispositionMeta[d.disposition_status].chip)}>{dispositionMeta[d.disposition_status].label}</Chip></span>
          <button onClick={() => openCanvas({ view: 'playbook', playbookId: pb.id, playbookMode: 'inventory' })} className="font-semibold text-ai-600 hover:underline">Open full playbook →</button>
        </div>
      </div>
    </div>
  )
}
