import { useState } from 'react'
import { clsx } from 'clsx'
import { BookOpen, ChevronRight, ShieldCheck, TrendingUp, Plus, Sparkles, Check, X, Clock, Filter, Inbox, Wand2, Layers, Share2, FileDown, Flag, FileText } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Avatar, Button, SectionLabel, Empty } from '@/components/ui'
import { fmtDate } from '@/lib/labels'
import { refinementRecs } from '@/lib/analytics'
import { userById } from '@/data/seed'
import { folderAgreements } from '@/data/playbookDerive'
import { TEAM_FOLDERS } from '@/data/folders'
import { can } from '@/lib/access'
import type { Provision, ProvisionTier, PlaybookSuggestion, Playbook } from '@/types'

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
function ProvisionNode({ p, depth, renderPurpose = 'standard', editablePlaybookId, editableDraftId }: { p: Provision; depth: number; renderPurpose?: 'standard' | 'external' | 'training'; editablePlaybookId?: string; editableDraftId?: string }) {
  const tier = tierOf(p)
  const editText = useStore((s) => s.editProvisionText)
  const editDraftText = useStore((s) => s.editDraftProvisionText)
  const mayEdit = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'playbook_edit'))
  const inline = (!!editablePlaybookId || !!editableDraftId) && mayEdit
  const edProps = (field: 'standard' | 'fallback' | 'red_line', idx: number, current: string) => inline ? {
    contentEditable: true, suppressContentEditableWarning: true, title: 'Click to edit — saves on blur',
    onBlur: (e: React.FocusEvent<HTMLDivElement>) => {
      const t = e.currentTarget.textContent?.trim() ?? ''
      if (t && t !== current) { if (editableDraftId) editDraftText(editableDraftId, p.id, field, idx, t); else editText(editablePlaybookId!, p.id, field, idx, t) }
    },
    className: 'cursor-text focus:outline-none focus:ring-2 focus:ring-ai-300',
  } : {}
  const external = renderPurpose === 'external' // counterparty-facing: hide red-line internals
  const training = renderPurpose === 'training'
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
        {tier === 'deferred' && <span className="shrink-0 text-[10px] font-semibold text-violet-400">Not included in AI review</span>}
        {p.modified_via_chat && <Chip className="bg-ai-50 text-ai-700 ring-ai-500/20"><Sparkles size={9} /> Modified via chat</Chip>}
        {(p.negotiated_pct ?? 0) > 0 && <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400"><TrendingUp size={12} /> {p.negotiated_pct}%</span>}
      </button>
      {open && (
        <div className="space-y-2 pb-3" style={{ paddingLeft: 32 + depth * 20, paddingRight: 16 }}>
          {tier === 'deferred' && (
            <div className="flex items-start gap-2 rounded-lg bg-violet-50/70 px-3 py-2 text-[12px] leading-snug text-violet-800 ring-1 ring-violet-100">
              <Clock size={13} className="mt-0.5 shrink-0" /><span><b>Deferred</b> — no single baseline. The agent escalates to <b>{p.deferred_to ?? 'the deal team'}</b> for a written decision. <b className="text-violet-900">Not included in AI review</b> — no analysis card is produced for this provision.</span>
            </div>
          )}
          {p.standard_position && (
            <div><div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-600"><ShieldCheck size={11} /> Standard {inline && <span className="font-normal normal-case text-slate-300">· click to edit</span>}</div>
              <div {...edProps('standard', 0, p.standard_position)} className={clsx('rounded-lg bg-brand-50/60 px-3 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-brand-100', p.modified_via_chat && 'flash-once', inline && 'cursor-text focus:outline-none focus:ring-2 focus:ring-ai-300')}>{p.standard_position}</div></div>
          )}
          {p.fallback_tiers.map((f, i) => (
            <div key={i}><div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">Fallback {i + 1}</div>
              <div {...edProps('fallback', i, f)} className={clsx('rounded-lg bg-amber-50/50 px-3 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-amber-100', p.modified_via_chat && i === 0 && 'flash-once', inline && 'cursor-text focus:outline-none focus:ring-2 focus:ring-ai-300')}>{f}</div></div>
          ))}
          {p.red_line && !external && (
            <div><div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-red-600">Red line (do not accept)</div>
              <div className="rounded-lg bg-red-50/50 px-3 py-2 text-[12.5px] leading-snug text-slate-700 ring-1 ring-red-100">{p.red_line}</div></div>
          )}
          {external && <div className="text-[11px] italic text-slate-400">Internal red-line guidance hidden in the counterparty-facing view.</div>}
          {p.rationale && (external ? null : <div className={clsx('text-[11.5px]', training ? 'rounded-lg bg-ai-50/50 px-3 py-2 text-ai-800 ring-1 ring-ai-100' : 'italic text-slate-400')}>{training && <b>Why this position: </b>}{!training && 'Rationale: '}{p.rationale}</div>)}
          {p.children?.map((c) => <div key={c.id} className="mt-1 rounded-lg border border-slate-100"><ProvisionNode p={c} depth={depth + 1} renderPurpose={renderPurpose} editablePlaybookId={editablePlaybookId} editableDraftId={editableDraftId} /></div>)}
        </div>
      )}
    </div>
  )
}

const FILTERS: { key: ProvisionTier | 'all'; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'baseline', label: 'Baseline' }, { key: 'fallback', label: 'Fallback' }, { key: 'red_line', label: 'Red line' }, { key: 'deferred', label: 'Deferred' },
]

const sugKindChip: Record<string, string> = { default: 'bg-brand-50 text-brand-700 ring-brand-500/20', fallback: 'bg-amber-50 text-amber-700 ring-amber-500/20', red_line: 'bg-red-50 text-red-700 ring-red-500/20' }

// Playbooks §8 — audit/evaluation: accuracy stat, user-flagged misses, run-evaluation.
function PlaybookAudit({ playbookId }: { playbookId: string }) {
  const flags = useStore((s) => s.analysisFlags)
  const deviations = useStore((s) => s.deviations)
  const setToast = useStore((s) => s.setToast)
  const seeded = [
    { id: 'FLAG-S1', provision: 'Injunctive Relief — bond language', reason: 'Should have been Fallback', status: 'reviewed', date: '2026-06-20' },
    { id: 'FLAG-S2', provision: 'Affiliate liability rider', reason: 'False positive', status: 'open', date: '2026-06-24' },
  ]
  const userFlags = flags.map((f) => {
    const d = deviations.find((x) => x.id === f.deviation_id)
    return { id: f.id, provision: d?.provision_name ?? f.deviation_id, reason: f.reason, status: f.status, date: f.date.slice(0, 10) }
  })
  const rows = [...userFlags, ...seeded]
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><SectionLabel>Detection accuracy</SectionLabel><div className="mt-1 text-2xl font-bold text-brand-600">96%</div><div className="text-[11.5px] text-slate-400">across 42 reviewed agreements</div></Card>
        <Card className="p-4"><SectionLabel>User-flagged misses</SectionLabel><div className="mt-1 text-2xl font-bold text-slate-800">{rows.length}</div><div className="text-[11.5px] text-slate-400">{rows.filter((r) => r.status === 'open').length} awaiting review</div></Card>
        <Card className="p-4"><SectionLabel>Evaluation</SectionLabel>
          <Button size="sm" variant="ai" className="mt-1.5" onClick={() => setToast('Evaluation queued — full evaluation module available in the admin portal.')}>Run evaluation</Button>
          <div className="mt-1 text-[10.5px] text-slate-400">Full evaluation module available in the admin portal.</div>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-2.5"><SectionLabel>Flagged analyses — from "Flag: incorrect analysis" on review cards</SectionLabel></div>
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2.5 border-b border-slate-50 px-4 py-2.5 text-[12.5px] last:border-0">
            <Flag size={13} className="shrink-0 text-amber-500" />
            <span className="font-semibold text-slate-700">{r.provision}</span>
            <Chip className="bg-amber-50 text-amber-700 ring-amber-500/20">{r.reason}</Chip>
            <span className="ml-auto text-[11px] text-slate-400">{r.date}</span>
            <Chip className={r.status === 'open' ? 'bg-red-50 text-red-600 ring-red-500/20' : 'bg-brand-50 text-brand-700 ring-brand-500/20'}>{r.status}</Chip>
          </div>
        ))}
        {rows.length === 0 && <div className="px-4 py-6 text-center text-[12px] text-slate-400">No flags yet — use ⋯ on an AI review card.</div>}
      </Card>
    </div>
  )
}

function SuggestionsPanel({ playbookId }: { playbookId: string }) {
  const suggestions = useStore((s) => s.playbookSuggestions).filter((x) => x.playbook_id === playbookId)
  const decide = useStore((s) => s.decidePlaybookSuggestion)
  const canEdit = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'playbook_edit'))
  const pending = suggestions.filter((x) => x.state === 'pending')
  const decided = suggestions.filter((x) => x.state !== 'pending')
  // 'decided' also covers deferred — parked, not urgent, but not lost either.
  const Row = ({ x }: { x: PlaybookSuggestion }) => (
    <Card className="p-3.5">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold text-slate-800">{x.provision_name}</span>
        <Chip className={sugKindChip[x.kind]}>{x.kind.replace('_', ' ')}</Chip>
        {x.state === 'approved' && <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20"><Check size={10} /> Approved</Chip>}
        {x.state === 'rejected' && <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">Rejected</Chip>}
        {x.state === 'deferred' && <Chip className="bg-violet-50 text-violet-700 ring-violet-500/20"><Clock size={10} /> Deferred</Chip>}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400"><Avatar userId={x.suggested_by} size={16} /> {userById(x.suggested_by)?.name.split(' ')[0]}</span>
      </div>
      <div className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] text-slate-700">{x.proposed_text}</div>
      {x.rationale && <div className="mt-1 text-[11.5px] italic text-slate-400">{x.rationale}</div>}
      {x.source_agreement_id && <div className="mt-1 text-[11px] text-slate-400">From {x.source_agreement_id}{x.source_section ? ` ${x.source_section}` : ''}</div>}
      {x.state === 'pending' && canEdit && (
        <div className="mt-2 flex gap-1.5">
          <button onClick={() => decide(x.id, 'accept')} title="Approve as suggested" className="rounded-md bg-brand-500 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-brand-600">Accept</button>
          <button onClick={() => decide(x.id, 'reject')} title="Drop this suggestion" className="rounded-md border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600">Reject</button>
          <button onClick={() => decide(x.id, 'redline')} title="Approve, but designate it a strict red line" className="rounded-md border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700">Redline</button>
          <button onClick={() => decide(x.id, 'defer')} title="Park it — no decision yet" className="rounded-md border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:bg-violet-50 hover:text-violet-600">Defer</button>
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

const REFINE_EXAMPLES = ['Add a Publicity red line', 'Add an Insurance fallback provision', 'Remove the Injunctive Relief provision']

// Publish the same playbook for different purposes/audiences (Eric §8).
const PUBLISH_PURPOSES = [
  { key: 'attorney', label: 'Negotiation cheat-sheet', sub: 'Attorney-facing — positions, fallbacks & red lines side by side' },
  { key: 'external', label: 'Counterparty position summary', sub: 'External — our standard positions, red lines redacted' },
  { key: 'training', label: 'New-hire training guide', sub: 'Plain-language walk-through with rationale for each position' },
  { key: 'engine', label: 'Machine-readable (JSON)', sub: 'For the deviation engine / downstream systems' },
]

function PlaybookCreate() {
  const drafts = useStore((s) => s.playbookDrafts)
  const canvas = useStore((s) => s.canvas)
  const advance = useStore((s) => s.advancePlaybookDraft)
  const publish = useStore((s) => s.publishPlaybookDraft)
  const refine = useStore((s) => s.refinePlaybookDraft)
  const setDraftExampleRefs = useStore((s) => s.setDraftExampleRefs)
  const agreements = useStore((s) => s.agreements)
  const tickets = useStore((s) => s.tickets)
  const draft = drafts.find((d) => d.id === canvas.playbookDraftId) ?? drafts[0]
  const [refineInput, setRefineInput] = useState('')
  const [lastReply, setLastReply] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [dropped, setDropped] = useState(0)
  const [describe, setDescribe] = useState('')
  const decide = useStore((s) => s.decideDraftProvision)
  // R48 — the real, selectable folder of example agreements the derivation reads from.
  const folder = useStore((s) => (draft ? s.playbookSourceDefaults[draft.agreement_type] : undefined))
  const allExamples = folderAgreements(agreements, tickets)
  if (!draft) return <Empty icon={<Wand2 size={28} className="text-ai-400" />} title="Create a playbook in plain language" sub="Ask the agent to “create a playbook”, or start from a template in Templates." />
  const runRefine = (instr: string) => { if (!instr.trim()) return; const reply = refine(draft.id, instr.trim()); setLastReply(reply); setRefineInput('') }
  const toggleExample = (id: string) => setDraftExampleRefs(draft.id, draft.exampleRefs.includes(id) ? draft.exampleRefs.filter((x) => x !== id) : [...draft.exampleRefs, id])
  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center gap-2"><Wand2 size={16} className="text-ai-600" /><span className="text-[14px] font-bold text-slate-800">{draft.name}</span><Chip className="bg-ai-50 text-ai-700 ring-ai-500/20">{draft.stage}</Chip></div>
        <p className="mt-1 text-[12px] text-slate-500">“{draft.rawPrompt}”</p>
        {/* Step 1 (Eric): a full-width DROP ZONE + folder select + a narrative description —
            the Claude-project pattern. The checkbox picker is demoted to "Browse archive". */}
        {draft.stage === 'collecting' && (
          <div className="mt-3 space-y-2.5">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); setDropped((p) => p + Math.max(1, e.dataTransfer.files?.length ?? 1)) }}
              onClick={() => setDropped((p) => p + 1)}
              className={clsx('flex w-full cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition', dragOver ? 'border-ai-400 bg-ai-50/50' : 'border-slate-300 bg-white hover:border-ai-300')}
            >
              <Wand2 size={20} className="mb-1 text-ai-500" />
              <div className="text-[13px] font-bold text-slate-700">Drop your template and negotiated agreements here</div>
              <div className="mt-0.5 text-[11px] text-slate-400">{dropped > 0 ? `${dropped} file${dropped === 1 ? '' : 's'} received — plus the folder selection below.` : 'Or pick a folder / browse the archive below.'}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-semibold text-slate-500">Select a folder:</span>
              <select defaultValue={draft.sourcePath ?? folder?.path ?? ''} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12px] outline-none">
                <option value={folder?.path ?? '/Legal/NDAs'}>{folder?.path ?? '/Legal/NDAs'}</option>
                <option>/Legal/Executed/2025</option>
                <option>/Legal/MSAs — enterprise</option>
              </select>
              <Chip className="ml-auto bg-white text-slate-500 ring-slate-200">Template: {draft.sourceTemplateId ?? `${draft.agreement_type} standard`}</Chip>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Describe what's in these documents</div>
              <textarea value={describe} onChange={(e) => setDescribe(e.target.value)} rows={2}
                placeholder="e.g. Our standard NDA template plus 11 executed NDAs from the last 18 months; the Mondelez and Clever Devices deals were heavily negotiated…"
                className="w-full resize-none rounded-lg border border-slate-300 px-2.5 py-2 text-[12.5px] outline-none focus:border-ai-400" />
            </div>
            <details>
              <summary className="cursor-pointer text-[11.5px] font-semibold text-slate-400 hover:text-slate-600">Browse archive — pick individual example agreements</summary>
              <div className="mt-1.5 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
                {allExamples.map((ex) => {
                  const on = draft.exampleRefs.includes(ex.id)
                  return (
                    <button key={ex.id} onClick={() => toggleExample(ex.id)} className={clsx('flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] transition', on ? 'bg-brand-50 text-slate-700 ring-1 ring-brand-200' : 'text-slate-500 hover:bg-white')}>
                      <span className={clsx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300')}>{on && <Check size={11} />}</span>
                      <span className="truncate font-medium">{ex.name}</span>
                      <Chip className="ml-auto bg-white text-slate-400 ring-slate-200">{ex.agreement_type}</Chip>
                    </button>
                  )
                })}
              </div>
            </details>
          </div>
        )}
        {/* Step 2: what the analysis DETECTED, stated as deviations from the template */}
        {draft.stage !== 'collecting' && (
          <div className="mt-3 rounded-lg border border-ai-200 bg-ai-50/40 px-3 py-2.5 text-[12.5px] text-slate-700">
            <Sparkles size={12} className="mr-1 inline text-ai-600" />
            Analyzed <b>{Math.max(draft.exampleRefs.length, dropped, 2)} agreements</b> against the template. Detected: <b>Residuals clause appears in 50% of your NDAs</b>, deviating from your template · marking requirements negotiated in 27% · survival shortened in 41%.
          </div>
        )}
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
        <>
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-2.5"><SectionLabel>Generated provisions ({draft.provisions.length}) — decide each (Accept · Reject · Defer) · click any position text to edit it</SectionLabel></div>
            {draft.provisions.map((p) => (
              <div key={p.id} className="border-b border-slate-100 last:border-0">
                <ProvisionNode p={p} depth={0} editableDraftId={draft.id} />
                <div className="flex items-center gap-1.5 bg-slate-50/60 px-4 py-1.5">
                  {p.review_state === 'accepted' && (p.tier === 'fallback'
                    ? <Chip className="bg-amber-50 text-amber-700 ring-amber-500/20"><Check size={10} /> Approved as a Fallback</Chip>
                    : <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20"><Check size={10} /> Approved into the playbook</Chip>)}
                  {p.review_state === 'deferred' && <Chip className="bg-violet-50 text-violet-700 ring-violet-500/20"><Clock size={10} /> Deferred — not included in AI review</Chip>}
                  {!p.review_state && (
                    <>
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Decision:</span>
                      <button onClick={() => decide(draft.id, p.id, 'accept')} title="Approve as a baseline position" className="rounded-md bg-brand-500 px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-brand-600">Approve</button>
                      <button onClick={() => decide(draft.id, p.id, 'reject')} title="Drop this clause from the playbook" className="rounded-md border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600">Reject</button>
                      <button onClick={() => decide(draft.id, p.id, 'fallback')} title="Approve, but as a negotiable fallback position rather than the baseline" className="rounded-md border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-amber-50 hover:text-amber-600">Fallback</button>
                      <button onClick={() => decide(draft.id, p.id, 'defer')} title="Park it — no single position; excluded from AI review" className="rounded-md border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-violet-50 hover:text-violet-600">Defer</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </Card>
          {/* NL content refinement — add / remove / re-tier provisions in plain language (Eric §8). */}
          <Card className="p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ai-700"><Sparkles size={12} /> Refine the provisions in plain language</div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {REFINE_EXAMPLES.map((ex) => <button key={ex} onClick={() => runRefine(ex)} className="rounded-full border border-ai-200 bg-white px-2.5 py-0.5 text-[11.5px] font-medium text-ai-700 hover:bg-ai-50">{ex}</button>)}
            </div>
            {lastReply && <div className="mb-2 rounded-lg bg-ai-50/60 px-3 py-2 text-[12px] text-ai-800 ring-1 ring-ai-100"><Sparkles size={11} className="mr-1 inline" />{lastReply}</div>}
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-2.5 py-1.5 focus-within:border-ai-400">
              <input value={refineInput} onChange={(e) => setRefineInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runRefine(refineInput) }}
                placeholder="e.g. “add a Data Breach Notification red line”, “remove the Residuals provision”" className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-slate-400" />
              <button onClick={() => runRefine(refineInput)} className="text-ai-600 hover:text-ai-700"><Sparkles size={15} /></button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

// Flatten a provision tree (parents + nested children) for honest tier counts.
const flatProvisions = (ps: Provision[]): Provision[] => ps.flatMap((p) => [p, ...(p.children ? flatProvisions(p.children) : [])])

// The all-playbooks LIBRARY — what the nav lands on. Cards for every playbook + resumable
// drafts + a prominent Create. Clicking a card opens the existing detail view.
function PlaybookLibrary() {
  const uploadTemplate = useStore((s) => s.uploadTemplate)
  const createProject = useStore((s) => s.createProject)
  const [addTplOpen, setAddTplOpen] = useState(false)
  const playbooks = useStore((s) => s.playbooks)
  const drafts = useStore((s) => s.playbookDrafts)
  const suggestions = useStore((s) => s.playbookSuggestions)
  const agreements = useStore((s) => s.agreements)
  const role = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!.role)
  const openCanvas = useStore((s) => s.openCanvas)
  const startDraft = useStore((s) => s.startPlaybookDraft)
  const sourceDefaults = useStore((s) => s.playbookSourceDefaults)
  const canEdit = can(role, 'playbook_edit')
  const [createOpen, setCreateOpen] = useState(false)

  const openPb = (id: string) => openCanvas({ view: 'playbook', playbookId: id, playbookMode: 'inventory' })
  const tierCounts = (pb: Playbook) => {
    const flat = flatProvisions(pb.provisions)
    return (['baseline', 'fallback', 'red_line', 'deferred'] as const).map((t) => ({ t, n: flat.filter((p) => tierOf(p) === t).length })).filter((x) => x.n > 0)
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[18px] font-bold text-slate-800"><BookOpen size={20} className="text-brand-500" /> Playbooks</h1>
          <p className="mt-0.5 text-[12.5px] text-slate-500">{playbooks.length} playbooks · your negotiation positions, fallbacks and red lines per agreement type. The agent uses these to classify every counterparty deviation.</p>
        </div>
        {canEdit && (
          <div className="relative flex shrink-0 items-start gap-2">
            <div className="relative">
              <Button variant="outline" icon={<FileText size={14} />} onClick={() => setAddTplOpen((v) => !v)}>Add template</Button>
              {addTplOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAddTplOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                    <button onClick={() => { setAddTplOpen(false); uploadTemplate('Uploaded form agreement.docx') }}
                      className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50">
                      <FileText size={14} className="mt-0.5 shrink-0 text-slate-400" />
                      <span><span className="block text-[12.5px] font-semibold text-slate-700">Upload template</span><span className="text-[11px] text-slate-400">Drop or pick a form agreement (.docx)</span></span>
                    </button>
                    <button onClick={() => { setAddTplOpen(false); createProject('New template from examples', 'Analyze existing agreements and generate a brand-new baseline agreement.', 'MSA') }}
                      className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50">
                      <Wand2 size={14} className="mt-0.5 shrink-0 text-ai-500" />
                      <span><span className="block text-[12.5px] font-semibold text-slate-700">Create from examples</span><span className="text-[11px] text-slate-400">Generate a baseline from existing agreements</span></span>
                    </button>
                  </div>
                </>
              )}
            </div>
            <Button variant="ai" icon={<Plus size={14} />} onClick={() => setCreateOpen((v) => !v)}>Create playbook</Button>
            {createOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setCreateOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  <div className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Derived from a template + real examples</div>
                  {([['MNDA', 'NDA playbook'], ['MSA', 'MSA playbook']] as const).map(([type, label]) => (
                    <button key={type} onClick={() => { setCreateOpen(false); startDraft(`New ${label}`, type, `Create a ${type} playbook from ${sourceDefaults[type]?.path ?? 'the default folder'}`) }}
                      className="flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-50">
                      <Wand2 size={13} className="mt-0.5 shrink-0 text-ai-500" />
                      <div><div className="text-[12.5px] font-semibold text-slate-700">{label}</div><div className="text-[11px] text-slate-400">{sourceDefaults[type]?.path ?? 'Pick sources in the builder'} · {sourceDefaults[type]?.exampleAgreementIds.length ?? 0} examples</div></div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* In-progress drafts — resume where you left off */}
      {drafts.length > 0 && (
        <Card className="mb-4 overflow-hidden">
          <div className="border-b border-slate-100 bg-ai-50/40 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-ai-700">Drafts in progress · {drafts.length}</div>
          {drafts.map((d) => (
            <div key={d.id} className="flex items-center gap-2.5 border-b border-slate-50 px-4 py-2.5 last:border-0">
              <Wand2 size={14} className="shrink-0 text-ai-500" />
              <span className="text-[13px] font-semibold text-slate-700">{d.name}</span>
              <Chip className="bg-ai-50 text-ai-700 ring-ai-500/20">{d.stage}</Chip>
              <span className="text-[11.5px] text-slate-400">{d.agreement_type} · {d.exampleRefs.length} example{d.exampleRefs.length === 1 ? '' : 's'}</span>
              <button onClick={() => openCanvas({ view: 'playbook', playbookMode: 'create', playbookDraftId: d.id })} className="ml-auto text-[12px] font-semibold text-ai-700 hover:underline">Resume →</button>
            </div>
          ))}
        </Card>
      )}

      {/* The library */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {playbooks.map((pb) => {
          const pending = suggestions.filter((x) => x.playbook_id === pb.id && x.state === 'pending').length
          const usedBy = agreements.filter((a) => a.playbook_id === pb.id).length
          return (
            <Card key={pb.id} onClick={() => openPb(pb.id)} className="overflow-hidden" style={pb.accent ? { borderTop: `3px solid ${pb.accent}` } : undefined}>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} style={pb.accent ? { color: pb.accent } : undefined} className={pb.accent ? '' : 'text-brand-500'} />
                  <span className="truncate text-[14px] font-bold text-slate-800">{pb.name}</span>
                  <Chip className="shrink-0 bg-indigo-50 text-indigo-600 ring-indigo-500/20">{pb.agreement_type}</Chip>
                  <span className="ml-auto shrink-0 text-[11px] font-semibold text-slate-400">v{pb.version}</span>
                </div>
                <div className="mt-1 truncate text-[11.5px] text-slate-400">{pb.generated_from}</div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {tierCounts(pb).map(({ t, n }) => <Chip key={t} className={clsx('ring-1 ring-inset', tierMeta[t].chip)}>{n} {tierMeta[t].label.toLowerCase()}</Chip>)}
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
                  <Avatar userId={pb.owner_id} size={20} />
                  <span className="text-[11.5px] text-slate-500">{userById(pb.owner_id)?.name.split(' ')[0]} · {fmtDate(pb.created_date)}</span>
                  <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">{usedBy} agreement{usedBy === 1 ? '' : 's'}</Chip>
                  {pending > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); openCanvas({ view: 'playbook', playbookId: pb.id, playbookMode: 'suggestions' }) }}
                      className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100"><Inbox size={10} /> {pending} suggestion{pending === 1 ? '' : 's'}</button>
                  )}
                  <span className="ml-auto text-[12px] font-semibold text-brand-600">Open →</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
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
  const [publishOpen, setPublishOpen] = useState(false)
  const publishArtifact = useStore((s) => s.publishArtifact)
  const teamFolders = useStore((s) => s.teamFolders) // R85 — stateful, user-creatable folders
  const createTeamFolder = useStore((s) => s.createTeamFolder)
  const [pubFolder, setPubFolder] = useState(() => useStore.getState().teamFolders[0]?.path ?? TEAM_FOLDERS[0].path)
  const [newFolder, setNewFolder] = useState<{ path: string; category: string; broad: boolean } | null>(null)
  // R52/R57/R58/R60 — chat-driven restructure performs a REAL transform on the published playbook.
  const restructurePlaybook = useStore((s) => s.restructurePlaybook)
  const [restructOpen, setRestructOpen] = useState(false)
  const [restructMsgs, setRestructMsgs] = useState<{ role: 'user' | 'agent'; text: string }[]>([])
  const [restructInput, setRestructInput] = useState('')

  const canEdit = can(role, 'playbook_edit')
  const canPresentation = can(role, 'playbook_presentation') // R54 — look & feel is admin-only
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

  const layout = pb.group_mode === 'category' ? 'grouped' : 'sections'
  const applyRestructure = (instr: string) => {
    if (!instr.trim()) return
    const reply = restructurePlaybook(pb.id, instr.trim()) // real transform on the published playbook
    setRestructMsgs((m) => [...m, { role: 'user', text: instr }, { role: 'agent', text: reply }])
    setRestructInput('')
  }

  // Nav lands on the all-playbooks library; a card click opens the detail below.
  if (mode === 'library') return <PlaybookLibrary />

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header — playbook picker + mode + owner actions */}
      <Card className="mb-4 overflow-hidden" style={pb.accent ? { borderTop: `3px solid ${pb.accent}` } : undefined}>
        <div className="bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BookOpen size={20} style={pb.accent ? { color: pb.accent } : undefined} className={pb.accent ? '' : 'text-brand-400'} />
              <div>
                <select value={pb.id} onChange={(e) => setPlaybook(e.target.value)} className="rounded-md bg-slate-800 px-2 py-1 text-[15px] font-bold text-white outline-none">
                  {playbooks.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="mt-0.5 text-[11.5px] text-slate-400">{pb.provisions.length} provisions · v{pb.version} · {pb.agreement_type}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Not relevant mid-draft — a brand-new playbook has no suggestions queue yet. */}
              {mode !== 'create' && (
                <button onClick={() => openCanvas({ view: 'playbook', playbookId: pb.id, playbookMode: 'suggestions' })} className={clsx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold', mode === 'suggestions' ? 'bg-white text-slate-800' : 'bg-slate-800 text-slate-200 hover:bg-slate-700')}>
                  <Inbox size={13} /> Suggested {pendingCount > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10.5px] text-white">{pendingCount}</span>}
                </button>
              )}
              {canEdit && <button onClick={() => startDraft('New Playbook', pb.agreement_type, 'Create a playbook from a template + examples')} className={clsx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold', mode === 'create' ? 'bg-white text-slate-800' : 'bg-slate-800 text-slate-200 hover:bg-slate-700')}><Plus size={13} /> Create</button>}
              {/* R85 — publishing to a team folder is the owner's workflow (visual theme stays admin-only, R54). */}
              {canEdit && <div className="relative">
                <button onClick={() => setPublishOpen((v) => !v)} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[12px] font-semibold text-slate-200 hover:bg-slate-700"><Share2 size={13} /> Publish</button>
                {publishOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPublishOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg">
                      <div className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Publish this playbook to a team folder…</div>
                      {/* R85 — real access-scoped destination folder + category (user-creatable) */}
                      <div className="px-2.5 pb-1.5">
                        <select value={pubFolder} onChange={(e) => setPubFolder(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11.5px] font-semibold text-slate-600 outline-none">
                          {teamFolders.map((f) => <option key={f.path} value={f.path}>{f.path} · {f.category}</option>)}
                        </select>
                        <div className="mt-0.5 text-[10.5px] text-slate-400">Accessible to: {(teamFolders.find((f) => f.path === pubFolder)?.access_roles ?? []).map((r) => r.replace('_', ' ')).join(', ')}</div>
                        {newFolder === null ? (
                          <button onClick={() => setNewFolder({ path: '', category: '', broad: false })} className="mt-1 text-[11px] font-semibold text-brand-600 hover:underline">＋ New folder…</button>
                        ) : (
                          <div className="mt-1.5 space-y-1 rounded-lg bg-slate-50 p-1.5 ring-1 ring-slate-200">
                            <input autoFocus value={newFolder.path} onChange={(e) => setNewFolder({ ...newFolder, path: e.target.value })} placeholder="Folder path, e.g. Legal › Playbooks › DPAs" className="w-full rounded border border-slate-200 px-1.5 py-1 text-[11px] outline-none focus:border-brand-400" />
                            <input value={newFolder.category} onChange={(e) => setNewFolder({ ...newFolder, category: e.target.value })} placeholder="Category, e.g. DPA" className="w-full rounded border border-slate-200 px-1.5 py-1 text-[11px] outline-none focus:border-brand-400" />
                            <label className="flex items-center gap-1.5 text-[10.5px] text-slate-500"><input type="checkbox" checked={newFolder.broad} onChange={(e) => setNewFolder({ ...newFolder, broad: e.target.checked })} className="accent-brand-500" /> Also accessible to business users (requestors & contributors)</label>
                            <div className="flex gap-1">
                              <button onClick={() => { const p = createTeamFolder(newFolder.path, newFolder.category, newFolder.broad ? ['initiator', 'attorney', 'contributor', 'playbook_owner', 'administrator'] : []); if (p) { setPubFolder(p); setNewFolder(null) } }} className="rounded bg-brand-500 px-2 py-0.5 text-[10.5px] font-semibold text-white hover:bg-brand-600">Create</button>
                              <button onClick={() => setNewFolder(null)} className="rounded px-2 py-0.5 text-[10.5px] font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">…for</div>
                      {PUBLISH_PURPOSES.map((p) => (
                        <button key={p.key} onClick={() => { setPublishOpen(false); publishArtifact('playbook', pb.id, pb.name, p.label, pubFolder) }}
                          className="flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
                          <FileDown size={13} className="mt-0.5 shrink-0 text-slate-400" />
                          <div><div className="text-[12.5px] font-semibold text-slate-700">{p.label}</div><div className="text-[11px] text-slate-400">{p.sub}</div></div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-400">
            <button onClick={() => openCanvas({ view: 'playbook', playbookMode: 'library' })} className="font-semibold text-slate-300 hover:text-white">← All playbooks</button>
            <span className="flex items-center gap-1.5"><Avatar userId={pb.owner_id} size={18} /> Owner: {userById(pb.owner_id)?.name}</span>
            <span>Generated {fmtDate(pb.created_date)}</span>
            <span className="font-semibold text-slate-300">v{pb.version}{pb.edited_date ? `, edited ${fmtDate(pb.edited_date)}` : ''}</span>
            {mode !== 'inventory' && <button onClick={() => setPlaybook(pb.id)} className="text-slate-300 hover:text-white">← Back to inventory</button>}
          </div>
        </div>
      </Card>

      {mode === 'suggestions' ? <SuggestionsPanel playbookId={pb.id} />
        : mode === 'audit' ? <PlaybookAudit playbookId={pb.id} />
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
              <div className="ml-auto flex items-center gap-1">
                {canEdit && <button onClick={() => setRestructOpen((v) => !v)} title="Edits CONTENT (tighten/add/remove positions) and layout (nest/group/reorder/render)" className={clsx('flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold', restructOpen ? 'bg-ai-50 text-ai-700' : 'text-ai-600 hover:bg-ai-50')}><Wand2 size={12} /> Edit via chat</button>}
              </div>
            </div>

            {/* Chat-driven restructure — tell the agent how to render the playbook (Eric §8) */}
            {restructOpen && canEdit && (
              <Card className="mb-3 border-ai-200 bg-ai-50/30 p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ai-700"><Sparkles size={12} /> Edit content or layout in plain language</div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {['Tighten the fallback position on exclusions from confidential information', 'Make Governing Law a fallback', 'Nest Marking, Return and Protection Obligations under Confidentiality Mechanics', 'Render as a counterparty-facing summary', 'Group by category', ...(canPresentation ? ['Set the theme to teal'] : [])].map((ex) => (
                    <button key={ex} onClick={() => applyRestructure(ex)} className="rounded-full border border-ai-200 bg-white px-2.5 py-0.5 text-[11.5px] font-medium text-ai-700 hover:bg-ai-50">{ex}</button>
                  ))}
                </div>
                {restructMsgs.length > 0 && (
                  <div className="mb-2 space-y-1.5">
                    {restructMsgs.map((m, i) => (
                      <div key={i} className={clsx('text-[12px]', m.role === 'user' ? 'text-right' : '')}>
                        <span className={clsx('inline-block rounded-2xl px-3 py-1.5', m.role === 'user' ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-700 shadow-card')}>{m.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus-within:border-ai-400">
                  <input value={restructInput} onChange={(e) => setRestructInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') applyRestructure(restructInput) }}
                    placeholder="e.g. group related provisions by category…" className="flex-1 text-[12.5px] outline-none placeholder:text-slate-400" />
                  <button onClick={() => applyRestructure(restructInput)} className="text-ai-600 hover:text-ai-700"><Sparkles size={15} /></button>
                </div>
              </Card>
            )}

            {/* R57/R60 — audience render mode (persisted) visibly changes the display */}
            {pb.render_purpose && pb.render_purpose !== 'standard' && (
              <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] ring-1" style={{ background: (pb.accent ?? '#7559e8') + '14', color: pb.accent ?? '#7559e8', borderColor: (pb.accent ?? '#7559e8') + '33' }}>
                <Sparkles size={13} />
                {pb.render_purpose === 'external' ? 'Counterparty-facing view — internal red-line guidance is hidden.' : 'New-hire training view — the rationale for each position is shown inline.'}
                <button onClick={() => restructurePlaybook(pb.id, 'render as the standard attorney view')} className="ml-auto font-semibold hover:underline">Back to standard view</button>
              </div>
            )}
            {layout === 'grouped' ? (
              <div className="space-y-3">
                {Array.from(shown.reduce((map, p) => { const k = p.cross_cutting_category ?? 'other'; if (!map.has(k)) map.set(k, []); map.get(k)!.push(p); return map }, new Map<string, Provision[]>())).map(([cat, provs]) => (
                  <Card key={cat} className="overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[12px] font-bold text-slate-600">{ccLabel[cat] ?? 'Other'} · {provs.length}</div>
                    {provs.map((p) => <ProvisionNode key={p.id} p={p} depth={0} renderPurpose={pb.render_purpose} editablePlaybookId={pb.id} />)}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <SectionLabel>Provisions ({shown.length}{filter !== 'all' ? ` of ${pb.provisions.length}` : ''})</SectionLabel>
                  <span className="text-[11px] text-slate-400">Existing agreements retain their original version</span>
                </div>
                {shown.map((p) => <ProvisionNode key={p.id} p={p} depth={0} renderPurpose={pb.render_purpose} editablePlaybookId={pb.id} />)}
                {shown.length === 0 && <div className="py-8 text-center text-[12px] text-slate-400">No provisions in this category.</div>}
              </Card>
            )}
          </>
        )}
    </div>
  )
}
