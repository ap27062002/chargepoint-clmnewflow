import { useState } from 'react'
import { clsx } from 'clsx'
import { ChevronRight, Folder, FolderOpen, FileText, History, FileSignature, FolderPlus, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import { Chip, Button } from '@/components/ui'
import { can } from '@/lib/access'
import { agreementStatusMeta, sourceLabel, fmtDate } from '@/lib/labels'
import type { Agreement } from '@/types'

function VersionRow({ agreementId, versionId }: { agreementId: string; versionId: string }) {
  const v = useStore((s) => s.versions.find((x) => x.id === versionId))!
  const hasDoc = useStore((s) => !!s.documents[versionId])
  const openAgreement = useStore((s) => s.openAgreement)
  const navigate = useStore((s) => s.navigate)
  const open = () => { openAgreement(agreementId, 'review'); navigate({ reviewMode: hasDoc ? 'document' : 'issues' }) }
  return (
    <button onClick={open} className="flex w-full items-center gap-2.5 rounded-lg py-1.5 pl-12 pr-3 text-left transition hover:bg-slate-50">
      <FileText size={14} className="shrink-0 text-slate-300" />
      <span className="text-[12.5px] font-semibold text-slate-700">{v.label}</span>
      <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">{sourceLabel[v.source]}</Chip>
      <span className="truncate text-[11.5px] text-slate-400">{v.change_summary}</span>
      <span className="ml-auto shrink-0 text-[11px] text-slate-300">{fmtDate(v.created_date)}</span>
    </button>
  )
}

function AgreementNode({ agreement }: { agreement: Agreement }) {
  const versions = useStore((s) => s.versions).filter((v) => v.agreement_id === agreement.id).sort((a, b) => a.version_number - b.version_number)
  const openAgreement = useStore((s) => s.openAgreement)
  const [open, setOpen] = useState(false)
  const meta = agreementStatusMeta[agreement.status]
  const executed = agreement.status === 'executed'
  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg py-1.5 pl-6 pr-3 hover:bg-slate-50">
        <button onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronRight size={14} className={clsx('shrink-0 text-slate-400 transition', open && 'rotate-90')} />
          {executed ? <FileSignature size={15} className="shrink-0 text-brand-500" /> : <FileText size={15} className="shrink-0 text-slate-400" />}
          <span className="truncate text-[13px] font-bold text-slate-800">{agreement.title}</span>
          <Chip className={meta.chip}>{meta.label}</Chip>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400"><History size={11} /> {versions.length}</span>
        </button>
        <button onClick={() => openAgreement(agreement.id, 'review')} className="shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-semibold text-ai-700 hover:bg-ai-50">Open</button>
      </div>
      {open && (
        <div className="border-l border-slate-100 pb-1">
          {versions.map((v) => <VersionRow key={v.id} agreementId={agreement.id} versionId={v.id} />)}
          {versions.length === 0 && <div className="py-1.5 pl-12 text-[12px] text-slate-400">No versions yet.</div>}
        </div>
      )}
    </div>
  )
}

export function Repository() {
  const agreements = useStore((s) => s.agreements)
  const tickets = useStore((s) => s.tickets)
  const versionCount = useStore((s) => s.versions).length
  const playbooks = useStore((s) => s.playbooks)
  const ingestFolder = useStore((s) => s.ingestFolderAgreements)
  const canSuggest = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'playbook_suggest'))
  const ndaPlaybook = playbooks.find((p) => p.agreement_type === 'MNDA' || p.agreement_type === 'NDA') ?? playbooks[0]

  // Group agreements into counterparty "folders".
  const folders = Array.from(
    agreements.reduce((map, a) => {
      const cp = tickets.find((t) => t.id === a.ticket_id)?.counterparty_name ?? 'Other'
      if (!map.has(cp)) map.set(cp, [])
      map.get(cp)!.push(a)
      return map
    }, new Map<string, Agreement[]>()),
  ).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-bold text-slate-800">Agreements repository</h1>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {agreements.length} agreements across {folders.length} counterparties · {versionCount} total versions. Expand a counterparty, then an agreement, to see every version.
          </p>
        </div>
        {canSuggest && ndaPlaybook && (
          <Button size="sm" variant="ai" icon={<FolderPlus size={13} />} onClick={() => ingestFolder(ndaPlaybook.id)}>
            Add agreements to folder
          </Button>
        )}
      </div>
      {canSuggest && ndaPlaybook && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-ai-200 bg-ai-50/40 px-4 py-2.5">
          <Sparkles size={15} className="shrink-0 text-ai-600" />
          <span className="text-[12.5px] text-slate-600">Drop new agreements into a folder and the agent learns from them — comparing against your <b>{ndaPlaybook.name}</b> and proposing updates in <b>Playbook → Suggested additions</b>.</span>
        </div>
      )}
      <div className="space-y-2.5">
        {folders.map(([cp, ags]) => <CounterpartyFolder key={cp} name={cp} agreements={ags} />)}
      </div>
    </div>
  )
}

function CounterpartyFolder({ name, agreements }: { name: string; agreements: Agreement[] }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50">
        <ChevronRight size={15} className={clsx('shrink-0 text-slate-400 transition', open && 'rotate-90')} />
        {open ? <FolderOpen size={17} className="shrink-0 text-amber-500" /> : <Folder size={17} className="shrink-0 text-amber-500" />}
        <span className="text-[13.5px] font-bold text-slate-800">{name}</span>
        <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">{agreements.length} agreement{agreements.length > 1 ? 's' : ''}</Chip>
      </button>
      {open && (
        <div className="border-t border-slate-100 py-1">
          {agreements.map((a) => <AgreementNode key={a.id} agreement={a} />)}
        </div>
      )}
    </div>
  )
}
