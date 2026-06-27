import { useState } from 'react'
import { clsx } from 'clsx'
import { BookOpen, ChevronDown, ShieldCheck, TrendingUp, Plus, Sparkles, Check } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Avatar, Button, SectionLabel } from '@/components/ui'
import { fmtDate } from '@/lib/labels'
import { refinementRecs } from '@/lib/analytics'
import { userById } from '@/data/seed'
import type { Provision } from '@/types'

const actionColor: Record<string, string> = { Revise: 'text-amber-600', Add: 'text-violet-600', Maintain: 'text-brand-600' }

const ccLabel: Record<string, string> = {
  liability: 'Liability', indemnification: 'Indemnification', confidentiality: 'Confidentiality',
  ip_ownership: 'IP Ownership', data_privacy: 'Data Privacy', term_and_termination: 'Term & Termination',
}

function ProvisionRow({ p, owner }: { p: Provision; owner: boolean }) {
  const [open, setOpen] = useState(p.provision_name.includes('Residual') || p.negotiated_pct! >= 40)
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
        <ChevronDown size={15} className={clsx('shrink-0 text-slate-400 transition', open && 'rotate-180')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold text-slate-800">{p.provision_name}</span>
            {p.cross_cutting_category && <Chip className="bg-indigo-50 text-indigo-600 ring-indigo-500/20">{ccLabel[p.cross_cutting_category]}</Chip>}
          </div>
        </div>
        {p.fallback_tiers.length > 0
          ? <Chip className="bg-amber-50 text-amber-700 ring-amber-500/20">{p.fallback_tiers.length} fallback{p.fallback_tiers.length > 1 ? 's' : ''}</Chip>
          : <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20">Baseline</Chip>}
        {p.negotiated_pct! > 0 && <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400"><TrendingUp size={12} /> {p.negotiated_pct}%</span>}
      </button>
      {open && (
        <div className="space-y-2.5 px-4 pb-4 pl-11">
          <div>
            <div className="mb-1 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-brand-600"><ShieldCheck size={11} /> Standard position (strongest)</div>
            <div className="rounded-lg bg-brand-50/60 px-3 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-brand-100">{p.standard_position}</div>
          </div>
          {p.fallback_tiers.map((f, i) => (
            <div key={i}>
              <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-amber-600">Fallback {i + 1}</div>
              <div className="rounded-lg bg-amber-50/50 px-3 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-amber-100">{f}</div>
            </div>
          ))}
          <div>
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-red-600">Red line (do not accept)</div>
            <div className="rounded-lg bg-red-50/50 px-3 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-red-100">{p.red_line}</div>
          </div>
          <div className="text-[11.5px] italic text-slate-400">Rationale: {p.rationale}</div>
        </div>
      )}
    </div>
  )
}

export function PlaybookView() {
  const pb = useStore((s) => s.playbooks[0])
  const role = useStore((s) => s.users.find((u) => u.id === s.currentUserId)?.role)
  const setToast = useStore((s) => s.setToast)
  const auditPush = useStore((s) => s.audit_push)
  const owner = role === 'playbook_owner'
  const allDeviations = useStore((s) => s.deviations)
  const recs = refinementRecs(pb, allDeviations)
  const [applied, setApplied] = useState(false)

  const approve = () => {
    setApplied(true)
    auditPush({ event_type: 'playbook_updated', summary: 'NDA playbook v4 published — 3 refinement recommendations applied.' })
    setToast('Playbook v4 published — 3 refinements applied. Existing agreements keep their original version.')
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <Card className="mb-4 overflow-hidden">
        <div className="bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BookOpen size={20} className="text-brand-400" />
              <div>
                <h1 className="text-[16px] font-bold">{pb.name}</h1>
                <div className="text-[11.5px] text-slate-400">Complete provision inventory — baselines, approved fallbacks &amp; red lines · v{pb.version}</div>
              </div>
            </div>
            <Chip className="bg-slate-800 text-slate-200 ring-slate-700">v{pb.version}</Chip>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-400">
            <span className="flex items-center gap-1.5"><Avatar userId={pb.owner_id} size={18} /> Owner: {userById(pb.owner_id)?.name}</span>
            <span>Generated {fmtDate(pb.created_date)}</span>
            <span>Source: {pb.generated_from}</span>
          </div>
        </div>
      </Card>

      {/* Refinement banner */}
      <Card className="mb-4 border-ai-200 bg-ai-50/40 p-4">
        <div className="flex items-start gap-2.5">
          <Sparkles size={16} className="mt-0.5 text-ai-600" />
          <div className="flex-1">
            <SectionLabel className="text-ai-700">Refinement recommendations — computed from {allDeviations.length} observed deviations</SectionLabel>
            <ul className="mt-1.5 space-y-1 text-[12.5px] text-slate-600">
              {recs.map((r, i) => (
                <li key={i}>• <b>{r.provision}</b> — {r.detail} <span className={clsx('font-semibold', actionColor[r.action])}>{r.action}</span></li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant={owner ? 'ai' : 'outline'} disabled={!owner || applied} onClick={approve} icon={applied ? <Check size={13} /> : <Plus size={13} />}>{applied ? 'Changes applied — v4 published' : owner ? 'Approve & apply changes' : 'Playbook Owner approval required'}</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <SectionLabel>Provisions ({pb.provisions.length})</SectionLabel>
          <span className="text-[11px] text-slate-400">Existing agreements retain their original playbook version</span>
        </div>
        {pb.provisions.map((p) => <ProvisionRow key={p.id} p={p} owner={owner} />)}
      </Card>
    </div>
  )
}
