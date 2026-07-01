import { useState } from 'react'
import { clsx } from 'clsx'
import { BookOpen, ChevronRight, ShieldCheck, TrendingUp, Plus, Sparkles, Check, X, Clock, Filter, Inbox, Wand2, Layers } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Avatar, Button, SectionLabel, Empty } from '@/components/ui'
import { fmtDate } from '@/lib/labels'
import { refinementRecs } from '@/lib/analytics'
import { userById } from '@/data/seed'
import { can } from '@/lib/access'
import type { Provision, ProvisionTier, PlaybookSuggestion } from '@/types'

const actionColor: Record<string, string> = { Revise: 'text-amber-600', Add: 'text-violet-600', Maintain: 'text-brand-600' }
const tierOf = (p: Provision): ProvisionTier => p.tier ?? (p.fallback_tiers.length > 0 ? 'fallback' : 'baseline')
const tierMeta: Record<ProvisionTier, { label: string; chip: string }> = {
  baseline: { label: 'Baseline', chip: 'bg-brand-50 text-brand-700 ring-brand-500/20' },
  fallback: { label: 'Fallback', chip: 'bg-amber-50 text-amber-700 ring-amber-500/20' },
  red_line: { label: 'Red line', chip: 'bg-red-50 text-red-700 ring-red-500/20' },
  deferred: { label: 'Deferred', chip: 'bg-violet-50 text-violet-700 ring-violet-500/20' },
}
const ccLabel: Record<string, string> = {
  liability: 'Liability', indemnification: 'Indemnification', confidentiality: 'Confidentiality',
  ip_ownership: 'IP Ownership', data_privacy: 'Data Privacy', term_and_termination: 'Term & Termination',
}

// Recursive provision node — supports nesting (Eric §8: Indemnification parent + children).
function ProvisionNode({ p, depth }: { p: Provision; depth: number }) {
  const tier = tierOf(p)
  const hasKids = !!p.children?.length
  const [open, setOpen] = useState(depth === 0 && (tier === 'red_line' || tier === 'deferred' || hasKids || (p.negotiated_pct ?? 0) >= 40))
  return (
    <div className={clsx('border-b border-slate-100 last:border-0', depth > 0 && 'border-l-2 border-l-slate-100')}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 py-2.5 pr-4 text-left hover:bg-slate-50" style={{ paddingLeft: 12 + depth * 20 }}>
        <ChevronRight size={14} className={clsx('shrink-0 text-slate-400 transition', open && 'rotate-90')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={clsx('font-bold text-slate-800', depth === 0 ? 'text-[13.5px]' : 'text-[12.5px]')}>{p.provision_name}</span>
            {hasKids && <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30"><Layers size={9} /> {p.children!.length}</Chip>}
            {depth === 0 && p.cross_cutting_category && <Chip className="bg-indigo-50 text-indigo-600 ring-indigo-500/20">{ccLabel[p.cross_cutting_category]}</Chip>}
          </div>
        </div>
        <Chip className={tierMeta[tier].chip}>{tierMeta[tier].label}{tier === 'fallback' && p.fallback_tiers.length > 1 ? ` ×${p.fallback_tiers.length}` : ''}</Chip>
        {(p.negotiated_pct ?? 0) > 0 && <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400"><TrendingUp size={12} /> {p.negotiated_pct}%</span>}
      </button>
      {open && (
        <div className="space-y-2 pb-3" style={{ paddingLeft: 32 + depth * 20, paddingRight: 16 }}>
          {tier === 'deferred' && (
            <div className="flex items-start gap-2 rounded-lg bg-violet-50/70 px-3 py-2 text-[12px] leading-snug text-violet-800 ring-1 ring-violet-100">
              <Clock size={13} className="mt-0.5 shrink-0" /><span><b>Deferred</b> — no single baseline. The agent escalates to <b>{p.deferred_to ?? 'the deal team'}</b> for a written decision.</span>
            </div>
          )}
          {p.standard_position && (
            <div><div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-600"><ShieldCheck size={11} /> Standard</div>
              <div className="rounded-lg bg-brand-50/60 px-3 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-brand-100">{p.standard_position}</div></div>
          )}
          {p.fallback_tiers.map((f, i) => (
            <div key={i}><div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">Fallback {i + 1}</div>
              <div className="rounded-lg bg-amber-50/50 px-3 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-amber-100">{f}</div></div>
          ))}
          {p.red_line && (
            <div><div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-red-600">Red line (do not accept)</div>
              <div className="rounded-lg bg-red-50/50 px-3 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-red-100">{p.red_line}</div></div>
          )}
          {p.rationale && <div className="text-[11.5px] italic text-slate-400">Rationale: {p.rationale}</div>}
          {p.children?.map((c) => <div key={c.id} className="mt-1 rounded-lg border border-slate-100"><ProvisionNode p={c} depth={depth + 1} /></div>)}
        </div>
      )}
    </div>
  )
}

const FILTERS: { key: ProvisionTier | 'all'; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'baseline', label: 'Baseline' }, { key: 'fallback', label: 'Fallback' }, { key: 'red_line', label: 'Red line' }, { key: 'deferred', label: 'Deferred' },
]

const sugKindChip: Record<string, string> = { default: 'bg-brand-50 text-brand-700 ring-brand-500/20', fallback: 'bg-amber-50 text-amber-700 ring-amber-500/20', red_line: 'bg-red-50 text-red-700 ring-red-500/20' }

function SuggestionsPanel({ playbookId }: { playbookId: string }) {
  const suggestions = useStore((s) => s.playbookSuggestions).filter((x) => x.playbook_id === playbookId)
  const decide = useStore((s) => s.decidePlaybookSuggestion)
  const canEdit = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'playbook_edit'))
  const pending = suggestions.filter((x) => x.state === 'pending')
  const decided = suggestions.filter((x) => x.state !== 'pending')
  const Row = ({ x }: { x: PlaybookSuggestion }) => (
    <Card className="p-3.5">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold text-slate-800">{x.provision_name}</span>
        <Chip className={sugKindChip[x.kind]}>{x.kind.replace('_', ' ')}</Chip>
        {x.state === 'approved' && <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20"><Check size={10} /> Approved</Chip>}
        {x.state === 'rejected' && <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">Rejected</Chip>}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400"><Avatar userId={x.suggested_by} size={16} /> {userById(x.suggested_by)?.name.split(' ')[0]}</span>
      </div>
      <div className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] text-slate-700">{x.proposed_text}</div>
      {x.rationale && <div className="mt-1 text-[11.5px] italic text-slate-400">{x.rationale}</div>}
      {x.source_agreement_id && <div className="mt-1 text-[11px] text-slate-400">From {x.source_agreement_id}{x.source_section ? ` ${x.source_section}` : ''}</div>}
      {x.state === 'pending' && canEdit && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="ai" icon={<Check size={13} />} onClick={() => decide(x.id, true)}>Approve & add</Button>
          <Button size="sm" variant="outline" icon={<X size={13} />} onClick={() => decide(x.id, false)}>Reject</Button>
        </div>
      )}
    </Card>
  )
  return (
    <div className="space-y-3">
      <div className="text-[12.5px] text-slate-500">Attorneys highlight clauses in documents and suggest adding them to the playbook. Approve to add them (as a default, fallback, or red line); the agent then flags them automatically.</div>
      {pending.length === 0 && <Empty icon={<Inbox size={26} className="text-slate-300" />} title="No pending suggestions" sub="Suggestions from attorneys will appear here for approval." />}
      {pending.map((x) => <Row key={x.id} x={x} />)}
      {decided.length > 0 && <><SectionLabel className="pt-2">Decided</SectionLabel>{decided.map((x) => <Row key={x.id} x={x} />)}</>}
    </div>
  )
}

function PlaybookCreate() {
  const drafts = useStore((s) => s.playbookDrafts)
  const canvas = useStore((s) => s.canvas)
  const advance = useStore((s) => s.advancePlaybookDraft)
  const publish = useStore((s) => s.publishPlaybookDraft)
  const draft = drafts.find((d) => d.id === canvas.playbookDraftId) ?? drafts[0]
  if (!draft) return <Empty icon={<Wand2 size={28} className="text-ai-400" />} title="Create a playbook in plain language" sub="Ask the agent to “create a playbook”, or start from a template in Projects." />
  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center gap-2"><Wand2 size={16} className="text-ai-600" /><span className="text-[14px] font-bold text-slate-800">{draft.name}</span><Chip className="bg-ai-50 text-ai-700 ring-ai-500/20">{draft.stage}</Chip></div>
        <p className="mt-1 text-[12px] text-slate-500">“{draft.rawPrompt}”</p>
        <div className="mt-3 space-y-2">
          {[['collecting', 'Point at the template + example agreements', draft.stage !== 'collecting'],
            ['analyzing', 'Analyze the examples vs the template', draft.stage === 'generated'],
            ['generated', 'Generate the provisions', draft.stage === 'generated']].map(([st, label, done], i) => (
            <div key={i} className="flex items-center gap-2 text-[12.5px]">
              <span className={clsx('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold', done ? 'bg-brand-500 text-white' : draft.stage === st ? 'bg-ai-600 text-white' : 'bg-slate-200 text-slate-400')}>{done ? <Check size={12} /> : i + 1}</span>
              <span className={done ? 'text-slate-700' : 'text-slate-500'}>{label as string}</span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          {draft.stage !== 'generated'
            ? <Button variant="ai" icon={<Sparkles size={14} />} onClick={() => advance(draft.id)}>{draft.stage === 'collecting' ? 'Analyze examples' : 'Generate provisions'}</Button>
            : <Button variant="ai" icon={<Check size={14} />} onClick={() => publish(draft.id)}>Publish playbook</Button>}
        </div>
      </Card>
      {draft.stage === 'generated' && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-2.5"><SectionLabel>Generated provisions ({draft.provisions.length}) — review & refine by chat</SectionLabel></div>
          {draft.provisions.map((p) => <ProvisionNode key={p.id} p={p} depth={0} />)}
        </Card>
      )}
    </div>
  )
}

export function PlaybookView() {
  const playbooks = useStore((s) => s.playbooks)
  const canvas = useStore((s) => s.canvas)
  const role = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!.role)
  const suggestions = useStore((s) => s.playbookSuggestions)
  const allDeviations = useStore((s) => s.deviations)
  const setPlaybook = useStore((s) => s.setPlaybook)
  const openCanvas = useStore((s) => s.openCanvas)
  const setToast = useStore((s) => s.setToast)
  const auditPush = useStore((s) => s.audit_push)
  const startDraft = useStore((s) => s.startPlaybookDraft)
  const [filter, setFilter] = useState<ProvisionTier | 'all'>('all')
  const [applied, setApplied] = useState(false)

  const canEdit = can(role, 'playbook_edit')
  const activeId = canvas.playbookId ?? 'pb_nda'
  const pb = playbooks.find((p) => p.id === activeId) ?? playbooks[0]
  const mode = canvas.playbookMode ?? 'inventory'
  const pendingCount = suggestions.filter((x) => x.playbook_id === pb.id && x.state === 'pending').length
  const recs = refinementRecs(pb, allDeviations)
  const shown = filter === 'all' ? pb.provisions : pb.provisions.filter((p) => tierOf(p) === filter)
  const tierCount = (t: ProvisionTier) => pb.provisions.filter((p) => tierOf(p) === t).length

  const approve = () => {
    setApplied(true)
    auditPush({ event_type: 'playbook_updated', summary: `${pb.name} refinement recommendations applied.` })
    setToast('Refinements applied. Existing agreements keep their original version.')
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header — playbook picker + mode + owner actions */}
      <Card className="mb-4 overflow-hidden">
        <div className="bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BookOpen size={20} className="text-brand-400" />
              <div>
                <select value={pb.id} onChange={(e) => setPlaybook(e.target.value)} className="rounded-md bg-slate-800 px-2 py-1 text-[15px] font-bold text-white outline-none">
                  {playbooks.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="mt-0.5 text-[11.5px] text-slate-400">{pb.provisions.length} provisions · v{pb.version} · {pb.agreement_type}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => openCanvas({ view: 'playbook', playbookId: pb.id, playbookMode: 'suggestions' })} className={clsx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold', mode === 'suggestions' ? 'bg-white text-slate-800' : 'bg-slate-800 text-slate-200 hover:bg-slate-700')}>
                <Inbox size={13} /> Suggested {pendingCount > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10.5px] text-white">{pendingCount}</span>}
              </button>
              {canEdit && <button onClick={() => startDraft('New Playbook', pb.agreement_type, 'Create a playbook from a template + examples')} className={clsx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold', mode === 'create' ? 'bg-white text-slate-800' : 'bg-slate-800 text-slate-200 hover:bg-slate-700')}><Plus size={13} /> Create</button>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-400">
            <span className="flex items-center gap-1.5"><Avatar userId={pb.owner_id} size={18} /> Owner: {userById(pb.owner_id)?.name}</span>
            <span>Generated {fmtDate(pb.created_date)}</span>
            {mode === 'inventory' && <button onClick={() => setPlaybook(pb.id)} className="text-slate-300 hover:text-white">← Back to inventory</button>}
          </div>
        </div>
      </Card>

      {mode === 'suggestions' ? <SuggestionsPanel playbookId={pb.id} />
        : mode === 'create' ? <PlaybookCreate />
        : (
          <>
            {/* Refinement banner */}
            {recs.length > 0 && (
              <Card className="mb-4 border-ai-200 bg-ai-50/40 p-4">
                <div className="flex items-start gap-2.5">
                  <Sparkles size={16} className="mt-0.5 text-ai-600" />
                  <div className="flex-1">
                    <SectionLabel className="text-ai-700">Refinement recommendations — from {allDeviations.length} observed deviations</SectionLabel>
                    <ul className="mt-1.5 space-y-1 text-[12.5px] text-slate-600">
                      {recs.map((r, i) => <li key={i}>• <b>{r.provision}</b> — {r.detail} <span className={clsx('font-semibold', actionColor[r.action])}>{r.action}</span></li>)}
                    </ul>
                    <div className="mt-2"><Button size="sm" variant={canEdit ? 'ai' : 'outline'} disabled={!canEdit || applied} onClick={approve} icon={applied ? <Check size={13} /> : <Plus size={13} />}>{applied ? 'Applied' : canEdit ? 'Approve & apply' : 'Owner approval required'}</Button></div>
                  </div>
                </div>
              </Card>
            )}

            {/* Filter bar */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <Filter size={13} className="mr-0.5 text-slate-400" />
              {FILTERS.map((f) => {
                const count = f.key === 'all' ? pb.provisions.length : tierCount(f.key)
                const active = filter === f.key
                return (
                  <button key={f.key} onClick={() => setFilter(f.key)} className={clsx('flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition', active ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50')}>
                    {f.label}<span className={clsx('rounded-full px-1.5 text-[10.5px]', active ? 'bg-white/20' : 'bg-slate-100 text-slate-400')}>{count}</span>
                  </button>
                )
              })}
              {canEdit && <button onClick={() => sendRestructureHint(setToast)} className="ml-auto flex items-center gap-1 text-[11.5px] font-semibold text-ai-600 hover:underline"><Wand2 size={12} /> Restructure via chat</button>}
            </div>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <SectionLabel>Provisions ({shown.length}{filter !== 'all' ? ` of ${pb.provisions.length}` : ''})</SectionLabel>
                <span className="text-[11px] text-slate-400">Existing agreements retain their original version</span>
              </div>
              {shown.map((p) => <ProvisionNode key={p.id} p={p} depth={0} />)}
              {shown.length === 0 && <div className="py-8 text-center text-[12px] text-slate-400">No provisions in this category.</div>}
            </Card>
          </>
        )}
    </div>
  )
}

function sendRestructureHint(setToast: (t: string) => void) {
  setToast('Ask the agent to “restructure the playbook” — e.g. nest child concepts under a parent. UI-from-chat is in preview.')
}
