import { clsx } from 'clsx'
import { Check, X, CornerUpLeft, Sparkles, FileText, ChevronRight, Lock, BookOpen } from 'lucide-react'
import { useStore } from '@/store'
import { Chip, Avatar } from '@/components/ui'
import { can } from '@/lib/access'
import { riskMeta, dispositionMeta, impactLabel, directionLabel } from '@/lib/labels'
import type { Deviation } from '@/types'

function DispoButton({ active, onClick, icon, label, tone }: { active: boolean; onClick: () => void; icon: JSX.Element; label: string; tone: 'accept' | 'counter' | 'reject' }) {
  const tones = {
    accept: active ? 'bg-brand-500 text-white' : 'text-brand-700 hover:bg-brand-50',
    counter: active ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50',
    reject: active ? 'bg-red-500 text-white' : 'text-red-700 hover:bg-red-50',
  }
  return (
    <button onClick={onClick} className={clsx('flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold transition', tones[tone])}>
      {icon}{label}
    </button>
  )
}

function DeviationCard({ d, onViewInDoc, onOpenPlaybook }: { d: Deviation; onViewInDoc: () => void; onOpenPlaybook: () => void }) {
  const setDisposition = useStore((s) => s.setDisposition)
  const canDispose = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'disposition'))
  const rm = riskMeta[d.risk_category]
  const hasClause = useStore((s) => s.documents['V-2201-2'])?.clauses.some((c) => c.deviationId === d.id) ?? false
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Chip className={clsx('ring-1 ring-inset', rm.chip)}><span className={clsx('h-1.5 w-1.5 rounded-full', rm.dot)} /> {rm.label}</Chip>
            <span className="truncate text-[14px] font-bold text-slate-800">{d.provision_name}</span>
            <span className="font-mono text-[11px] text-slate-400">{d.section_reference}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Chip className="bg-slate-100 text-slate-600 ring-slate-300/40">{impactLabel[d.impact_area]}</Chip>
            <Chip className="bg-slate-100 text-slate-600 ring-slate-300/40">{directionLabel[d.direction]}</Chip>
            <Chip className={clsx('ring-1 ring-inset', dispositionMeta[d.disposition_status].chip)}>{dispositionMeta[d.disposition_status].label}</Chip>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={onOpenPlaybook} title="See this provision in the playbook" className="flex items-center gap-1 text-[12px] font-semibold text-slate-400 hover:text-ai-600">
            <BookOpen size={13} /> In playbook
          </button>
          {hasClause && (
            <button onClick={onViewInDoc} className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-brand-600">
              <FileText size={13} /> View in doc <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <div>
          <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Template position</div>
          <div className="rounded-lg bg-brand-50/60 px-2.5 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-brand-100">{d.template_position}</div>
        </div>
        <div>
          <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Counterparty position</div>
          <div className="rounded-lg bg-red-50/50 px-2.5 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-red-100">{d.counterparty_position}</div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ai-600"><Sparkles size={11} /> Recommended response</div>
        <div className="rounded-lg bg-ai-50/60 px-2.5 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-ai-100">{d.recommended_response}</div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
        {canDispose ? (
          <div className="flex items-center gap-1.5">
            <DispoButton tone="accept" active={d.disposition_status === 'accepted'} onClick={() => setDisposition(d.id, 'accepted')} icon={<Check size={13} />} label="Accept" />
            <DispoButton tone="counter" active={d.disposition_status === 'countered'} onClick={() => setDisposition(d.id, 'countered')} icon={<CornerUpLeft size={13} />} label="Counter" />
            <DispoButton tone="reject" active={d.disposition_status === 'rejected'} onClick={() => setDisposition(d.id, 'rejected')} icon={<X size={13} />} label="Reject" />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400"><Lock size={12} /> Read-only — dispositions are set by the Assigned Attorney</div>
        )}
        {d.disposition_by && d.disposition_status !== 'open' && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Avatar userId={d.disposition_by} size={18} /> decided
          </div>
        )}
      </div>
    </div>
  )
}

export function IssuesView({ agreementId, onViewInDoc }: { agreementId: string; onViewInDoc: (deviationId: string) => void }) {
  const devs = useStore((s) => s.deviations).filter((d) => d.agreement_id === agreementId)
  const agreements = useStore((s) => s.agreements)
  const openCanvas = useStore((s) => s.openCanvas)
  const playbookId = agreements.find((a) => a.id === agreementId)?.playbook_id ?? 'pb_nda'
  const openPlaybook = () => openCanvas({ view: 'playbook', playbookId, playbookMode: 'inventory' })
  const sorted = [...devs].sort((a, b) => riskMeta[a.risk_category].order - riskMeta[b.risk_category].order)

  const summary = (['red_line', 'negotiate', 'missing', 'new', 'enhancement', 'accept'] as const)
    .map((rc) => ({ rc, n: devs.filter((d) => d.risk_category === rc).length }))
    .filter((x) => x.n > 0)

  if (devs.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-400">No deviations — this agreement has no playbook analysis yet.</div>
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] font-bold text-slate-500">{devs.length} deviations · sorted by risk</span>
        <span className="text-slate-300">·</span>
        {summary.map((s) => (
          <Chip key={s.rc} className={clsx('ring-1 ring-inset', riskMeta[s.rc].chip)}>{s.n} {riskMeta[s.rc].label}</Chip>
        ))}
      </div>
      {/* R43 — the list is a derived artifact of the playbook analysis, not a static list. */}
      <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-ai-50/50 px-2.5 py-1.5 text-[11px] text-ai-700 ring-1 ring-ai-100">
        <Sparkles size={12} /> Generated by playbook analysis — each change was diffed against the prior version and classified against the playbook. Edit a clause and the issues change.
      </div>
      <div className="space-y-3">
        {sorted.map((d) => <DeviationCard key={d.id} d={d} onViewInDoc={() => onViewInDoc(d.id)} onOpenPlaybook={openPlaybook} />)}
      </div>
    </div>
  )
}
