import { useState } from 'react'
import { clsx } from 'clsx'
import { ListChecks, FileText, MessageSquare, Sparkles, History, AtSign, CheckCircle2, FileQuestion, Wand2, BookOpen, GitCompareArrows, ArrowRight, PanelRightClose } from 'lucide-react'
import { sendToAgent } from '@/agent/engine'
import { can } from '@/lib/access'
import type { Version } from '@/types'
import type { DocModel } from '@/data/documents'
import { useStore } from '@/store'
import { IssuesView } from '@/views/IssuesView'
import { DocumentViewer } from '@/views/DocumentViewer'
import { AIPanel } from '@/views/AIPanel'
import { StageTracker } from '@/views/StageTracker'
import { Chip, Avatar, Button, Card } from '@/components/ui'
import { sourceLabel, fmtDateTime } from '@/lib/labels'
import { diffVersions } from '@/data/documents'
import { userById } from '@/data/seed'

function CommentsPanel({ ticketId, agreementId }: { ticketId: string; agreementId: string }) {
  const messages = useStore((s) => s.messages).filter((m) => m.thread_type === 'agreement_level' && m.agreement_id === agreementId)
  const postMessage = useStore((s) => s.postMessage)
  const resolveMention = useStore((s) => s.resolveMention)
  const canComment = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'comment'))
  const [body, setBody] = useState('')

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m) => {
          const u = userById(m.author_id)
          return (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-card">
              <div className="flex items-center gap-2">
                <Avatar userId={m.author_id} size={22} />
                <span className="text-[12.5px] font-semibold text-slate-700">{u?.name}</span>
                {m.provision_reference && <Chip className="bg-slate-100 text-slate-500 ring-slate-300/40">{m.provision_reference}</Chip>}
                <span className="ml-auto text-[10.5px] text-slate-300">{fmtDateTime(m.created_date)}</span>
              </div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-slate-700">{m.body}</div>
              {m.mentions && m.mentions.length > 0 && (
                <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
                  <AtSign size={12} className="text-amber-500" />
                  <span className="text-[11.5px] text-slate-500">Sign-off requested: {m.mentions.map((id) => userById(id)?.name.split(' ')[0]).join(', ')}</span>
                  {m.resolved
                    ? <Chip className="ml-auto bg-brand-100 text-brand-700 ring-brand-500/20"><CheckCircle2 size={10} /> Resolved</Chip>
                    : <button onClick={() => resolveMention(m.id)} className="ml-auto text-[11.5px] font-semibold text-brand-600 hover:underline">Mark responded</button>}
                </div>
              )}
            </div>
          )
        })}
        {messages.length === 0 && <div className="py-8 text-center text-[12px] text-slate-400">No provision comments yet. Tag a colleague to request sign-off.</div>}
      </div>
      <div className="border-t border-slate-100 p-2.5">
        {canComment ? (
          <>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Comment on a provision… use @ to tag for sign-off" className="w-full resize-none rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand-400" />
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { if (body.trim()) { postMessage({ thread_type: 'agreement_level', ticket_id: ticketId, agreement_id: agreementId, body: body.trim(), tag: 'question' }); setBody('') } }}>Post comment</Button>
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-center text-[11.5px] text-slate-400">Read-only access — you can view this thread but not comment.</div>
        )}
      </div>
    </div>
  )
}

const diffMeta = {
  added: { label: 'Added', chip: 'bg-brand-50 text-brand-700 ring-brand-600/20' },
  removed: { label: 'Removed', chip: 'bg-red-50 text-red-700 ring-red-600/20' },
  modified: { label: 'Modified', chip: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  unchanged: { label: 'Unchanged', chip: 'bg-slate-100 text-slate-500 ring-slate-400/20' },
}

function VersionCompare({ versionList, documents }: { versionList: Version[]; documents: Record<string, DocModel> }) {
  const withDocs = versionList.filter((v) => documents[v.id])
  const [aId, setAId] = useState(withDocs[0]?.id)
  const [bId, setBId] = useState(withDocs[withDocs.length - 1]?.id)
  const da = documents[aId]
  const db = documents[bId]
  const diffs = da && db ? diffVersions(da, db) : []

  const Picker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12.5px] font-semibold text-slate-700 outline-none">
      {withDocs.map((v) => <option key={v.id} value={v.id}>{v.label} · {sourceLabel[v.source]}</option>)}
    </select>
  )

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mb-4 flex items-center gap-2">
        <Picker value={aId} onChange={setAId} />
        <ArrowRight size={15} className="text-slate-400" />
        <Picker value={bId} onChange={setBId} />
        <span className="ml-auto text-[12px] font-semibold text-slate-400">{diffs.length} clause change{diffs.length === 1 ? '' : 's'}</span>
      </div>
      {diffs.length === 0
        ? <div className="py-10 text-center text-sm text-slate-400">No differences between these versions.</div>
        : (
          <div className="space-y-2.5">
            {diffs.map((d, i) => (
              <Card key={i} className="p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <Chip className={clsx('ring-1 ring-inset', diffMeta[d.kind].chip)}>{diffMeta[d.kind].label}</Chip>
                  <span className="text-[13px] font-bold text-slate-700">{d.heading}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={clsx('rounded-lg px-2.5 py-2 text-[12.5px] leading-snug ring-1', d.kind === 'removed' ? 'bg-red-50/50 text-slate-700 ring-red-100' : 'bg-slate-50 text-slate-500 ring-slate-200')}>
                    {d.aText || <span className="italic text-slate-400">— not present —</span>}
                  </div>
                  <div className={clsx('rounded-lg px-2.5 py-2 text-[12.5px] leading-snug ring-1', d.kind === 'added' ? 'bg-brand-50/50 text-slate-700 ring-brand-100' : d.kind === 'modified' ? 'bg-amber-50/40 text-slate-700 ring-amber-100' : 'bg-slate-50 text-slate-500 ring-slate-200')}>
                    {d.bText || <span className="italic text-slate-400">— not present —</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}

function NoPlaybook({ title, type }: { title: string; type: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
          <FileQuestion size={28} />
        </div>
        <Chip className="bg-amber-100 text-amber-800 ring-amber-500/20">No Playbook</Chip>
        <h3 className="mt-3 text-[15px] font-bold text-slate-800">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
          There's no playbook for <span className="font-semibold">{type}</span> agreements yet, so the agent won't auto-classify
          deviations. This agreement is <span className="font-semibold text-amber-600">flagged for manual attorney review</span>.
          The agent can still provide clause-by-clause guidance, and once this deal executes it can suggest building a playbook
          from it.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="ai" icon={<Wand2 size={14} />} onClick={() => sendToAgent(`Give me AI guidance on the ${title} (no playbook)`)}>Ask the agent for guidance</Button>
          <Button variant="outline" icon={<BookOpen size={14} />} onClick={() => sendToAgent('suggest creating a playbook for this agreement type')}>Suggest a playbook</Button>
        </div>
      </div>
    </div>
  )
}

export function AgreementReview({ agreementId }: { agreementId: string }) {
  const agreement = useStore((s) => s.agreements.find((a) => a.id === agreementId)!)
  const versions = useStore((s) => s.versions).filter((v) => v.agreement_id === agreementId).sort((a, b) => a.version_number - b.version_number)
  const canvas = useStore((s) => s.canvas)
  const navigate = useStore((s) => s.navigate)
  const mode = canvas.reviewMode ?? 'issues'
  const [rightTab, setRightTab] = useState<'comments' | 'ai' | null>(null)
  const [aiSeed, setAiSeed] = useState<{ text: string; nonce: number } | null>(null)
  const [focusClause, setFocusClause] = useState<string | undefined>()

  // "Ask AI" from a document selection routes into the right-hand AI Assistant.
  const askAiAboutSelection = (text: string) => {
    setRightTab('ai')
    setAiSeed((prev) => ({ text, nonce: (prev?.nonce ?? 0) + 1 }))
  }

  const documents = useStore((s) => s.documents)
  const [selVer, setSelVer] = useState<string | undefined>(undefined)
  const reviewVersion = versions.find((v) => v.source === 'counterparty_response') ?? versions[versions.length - 1]
  const activeVerId = (selVer && versions.some((v) => v.id === selVer)) ? selVer : reviewVersion?.id
  const hasDoc = !!documents[activeVerId ?? '']

  const onViewInDoc = (deviationId: string) => {
    const clause = documents['V-2201-2']?.clauses.find((c) => c.deviationId === deviationId)
    if (clause) { navigate({ reviewMode: 'document' }); setFocusClause(clause.id) }
  }

  return (
    <div className="flex h-full flex-col">
      <StageTracker agreementId={agreementId} />
      <div className="flex min-h-0 flex-1">
      {/* LEFT: document / issues */}
      <div className="flex min-w-0 flex-1 flex-col border-r border-slate-200">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3 py-2">
          <div className="flex gap-1">
            <button onClick={() => navigate({ reviewMode: 'issues' })} className={clsx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition', mode === 'issues' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100')}>
              <ListChecks size={14} /> Issues View
            </button>
            <button onClick={() => navigate({ reviewMode: 'document' })} className={clsx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition', mode === 'document' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100')}>
              <FileText size={14} /> Document View
            </button>
            <button onClick={() => navigate({ reviewMode: 'compare' })} className={clsx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition', mode === 'compare' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100')}>
              <GitCompareArrows size={14} /> Compare
            </button>
          </div>
          {/* version selector */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <History size={13} />
            {versions.map((v) => (
              <button key={v.id} onClick={() => { setSelVer(v.id); navigate({ reviewMode: 'document' }) }} title={`${sourceLabel[v.source]} — ${v.change_summary}`}
                className={clsx('rounded px-1.5 py-0.5 font-semibold transition', v.id === activeVerId ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1">
          {!agreement.playbook_id
            ? <NoPlaybook title={agreement.title} type={agreement.agreement_type} />
            : mode === 'compare'
              ? <VersionCompare versionList={versions} documents={documents} />
            : mode === 'issues'
              ? <IssuesView agreementId={agreementId} onViewInDoc={onViewInDoc} />
              : hasDoc
                ? <DocumentViewer versionId={activeVerId!} agreementId={agreementId} focusClauseId={focusClause} onAskAi={askAiAboutSelection} />
                : <div className="flex h-full flex-col items-center justify-center px-8 text-center text-sm text-slate-400">
                    <FileText size={28} className="mb-2 text-slate-300" />
                    {versions.find((v) => v.id === activeVerId)?.label ?? 'This version'} — clean copy, no tracked changes to display.
                    <button onClick={() => setSelVer(reviewVersion?.id)} className="mt-2 text-[12.5px] font-semibold text-brand-600 hover:underline">View the counterparty redline (Draft 2)</button>
                  </div>}
        </div>
      </div>

      {/* RIGHT: collapsed icon strip (frees the document real estate) or an expanded panel */}
      {rightTab === null ? (
        <div className="flex w-12 shrink-0 flex-col items-center gap-2 bg-white py-3">
          <button onClick={() => setRightTab('comments')} title="Comments" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <MessageSquare size={16} />
          </button>
          <button onClick={() => setRightTab('ai')} title="AI Assistant" className="flex h-9 w-9 items-center justify-center rounded-lg text-ai-600 transition hover:bg-ai-50">
            <Sparkles size={16} />
          </button>
        </div>
      ) : (
        <div className="flex w-[340px] shrink-0 flex-col bg-white">
          <div className="flex shrink-0 items-center gap-1 border-b border-slate-100 px-2 py-2">
            <button onClick={() => setRightTab('comments')} className={clsx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition', rightTab === 'comments' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-50')}>
              <MessageSquare size={14} /> Comments
            </button>
            <button onClick={() => setRightTab('ai')} className={clsx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition', rightTab === 'ai' ? 'bg-ai-50 text-ai-700' : 'text-slate-400 hover:bg-slate-50')}>
              <Sparkles size={14} /> AI Assistant
            </button>
            <button onClick={() => setRightTab(null)} title="Collapse panel" className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <PanelRightClose size={15} />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {rightTab === 'comments'
              ? <CommentsPanel ticketId={agreement.ticket_id} agreementId={agreementId} />
              : <AIPanel agreementTitle={agreement.title} seed={aiSeed} />}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
