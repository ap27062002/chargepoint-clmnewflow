import { useState } from 'react'
import { clsx } from 'clsx'
import { ListChecks, FileText, MessageSquare, Sparkles, History, AtSign, CheckCircle2, FileQuestion, Wand2, BookOpen, GitCompareArrows, ArrowRight, PanelRightClose, Send, CheckCheck, Layers } from 'lucide-react'
import { sendToAgent } from '@/agent/engine'
import { can } from '@/lib/access'
import type { Version } from '@/types'
import type { DocModel } from '@/data/documents'
import { useStore } from '@/store'
import { IssuesView } from '@/views/IssuesView'
import { DocumentViewer } from '@/views/DocumentViewer'
import { AIPanel } from '@/views/AIPanel'
import { ReviewDirective } from '@/views/ReviewDirective'
import { RedlineDocView } from '@/views/RedlineDocView'
import { StageTracker } from '@/views/StageTracker'
import { Chip, Avatar, Button, Card } from '@/components/ui'
import { sourceLabel, fmtDateTime } from '@/lib/labels'
import { diffVersions, clauseIdForDeviation } from '@/data/documents'
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
      <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] text-slate-500">This is an internal <b>audit-trail comparison</b> (history of changes) — not the redline you send. To send a clean copy + redline to the counterparty, use <b>Send back</b>.</div>
      <div className="mb-4 flex items-center gap-2">
        <Picker value={aId} onChange={setAId} /><ArrowRight size={15} className="text-slate-400" /><Picker value={bId} onChange={setBId} />
        <span className="ml-auto text-[12px] font-semibold text-slate-400">{diffs.length} clause change{diffs.length === 1 ? '' : 's'}</span>
      </div>
      {diffs.length === 0
        ? <div className="py-10 text-center text-sm text-slate-400">No differences between these versions.</div>
        : (
          <div className="space-y-2.5">
            {diffs.map((d, i) => (
              <Card key={i} className="p-3.5">
                <div className="mb-2 flex items-center gap-2"><Chip className={clsx('ring-1 ring-inset', diffMeta[d.kind].chip)}>{diffMeta[d.kind].label}</Chip><span className="text-[13px] font-bold text-slate-700">{d.heading}</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={clsx('rounded-lg px-2.5 py-2 text-[12.5px] leading-snug ring-1', d.kind === 'removed' ? 'bg-red-50/50 text-slate-700 ring-red-100' : 'bg-slate-50 text-slate-500 ring-slate-200')}>{d.aText || <span className="italic text-slate-400">— not present —</span>}</div>
                  <div className={clsx('rounded-lg px-2.5 py-2 text-[12.5px] leading-snug ring-1', d.kind === 'added' ? 'bg-brand-50/50 text-slate-700 ring-brand-100' : d.kind === 'modified' ? 'bg-amber-50/40 text-slate-700 ring-amber-100' : 'bg-slate-50 text-slate-500 ring-slate-200')}>{d.bText || <span className="italic text-slate-400">— not present —</span>}</div>
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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500"><FileQuestion size={28} /></div>
        <Chip className="bg-amber-100 text-amber-800 ring-amber-500/20">No Playbook</Chip>
        <h3 className="mt-3 text-[15px] font-bold text-slate-800">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">There's no playbook for <span className="font-semibold">{type}</span> agreements yet, so the agent won't auto-classify deviations. Flagged for <span className="font-semibold text-amber-600">manual attorney review</span>. Once this executes, the agent can suggest building a playbook from it.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="ai" icon={<Wand2 size={14} />} onClick={() => sendToAgent(`Give me AI guidance on the ${title} (no playbook)`)}>Ask the agent for guidance</Button>
          <Button variant="outline" icon={<BookOpen size={14} />} onClick={() => sendToAgent('create a playbook')}>Create a playbook</Button>
        </div>
      </div>
    </div>
  )
}

// Send-back: clean copy + redline + change summary (Eric §3)
function SendBackPanel({ agreementId, workingVerId }: { agreementId: string; workingVerId: string }) {
  const sendBack = useStore((s) => s.canvas.sendBack)
  const versions = useStore((s) => s.versions).filter((v) => v.agreement_id === agreementId).sort((a, b) => a.version_number - b.version_number)
  const acceptAll = useStore((s) => s.acceptAllChanges)
  const setBase = useStore((s) => s.setSendBackBase)
  const setCumulative = useStore((s) => s.setSendBackCumulative)
  const generate = useStore((s) => s.generateRedline)
  const summarize = useStore((s) => s.summarizeChanges)
  const send = useStore((s) => s.sendRedline)
  const navigate = useStore((s) => s.navigate)
  if (!sendBack) return null
  const baseOptions = versions.filter((v) => v.source === 'counterparty_response' || v.source === 'counterparty_draft' || v.version_number === 1)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-3.5">
        <div>
          <h2 className="text-[16px] font-bold text-slate-800">Send back to counterparty</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">Accept your changes → clean copy → redline vs their version (non-cumulative), plus an optional summary. Then send.</p>
        </div>

        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] text-white">1</span> Clean copy</div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
            <span className="text-[12.5px] text-slate-500">Accept the counterparty's changes you're keeping, then accept all so the doc isn't a cumulative mess.</span>
            <Button size="sm" variant="outline" icon={<CheckCheck size={13} />} onClick={() => acceptAll(workingVerId)}>Accept all → clean</Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] text-white">2</span> Redline</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-slate-500">Compare against</span>
            <select value={sendBack.baseVersionId} onChange={(e) => setBase(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12.5px] font-semibold text-slate-700 outline-none">
              {baseOptions.map((v) => <option key={v.id} value={v.id}>{v.label} · {sourceLabel[v.source]}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-[12px] text-slate-600"><input type="checkbox" checked={sendBack.cumulative} onChange={(e) => setCumulative(e.target.checked)} className="accent-brand-500" /><Layers size={12} /> Cumulative</label>
            <Button size="sm" variant="ai" icon={<GitCompareArrows size={13} />} onClick={generate} className="ml-auto">Generate redline</Button>
          </div>
          {sendBack.redline && (
            <button onClick={() => navigate({ reviewMode: 'redline' })} className="mt-2 flex w-full items-center justify-between rounded-lg bg-brand-50/60 px-3 py-2 text-left ring-1 ring-brand-100 hover:bg-brand-50">
              <span className="text-[12.5px] font-semibold text-brand-700"><GitCompareArrows size={12} className="mr-1 inline" /> Redline ready — {sendBack.redline.changeCount} changes</span>
              <span className="text-[11.5px] font-semibold text-brand-600">View →</span>
            </button>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] text-white">3</span> Summary of changes (optional)</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" icon={<Sparkles size={13} />} onClick={() => summarize('internal')}>Internal summary</Button>
            <Button size="sm" variant="outline" icon={<Sparkles size={13} />} onClick={() => summarize('external')}>External summary</Button>
          </div>
          {sendBack.summary && (
            <div className="mt-2 rounded-lg bg-ai-50/50 p-3 ring-1 ring-ai-100">
              <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-slate-700">{sendBack.summary.headline}<Chip className="bg-white text-ai-700 ring-ai-200">{sendBack.summary.audience}</Chip></div>
              <ul className="space-y-0.5 text-[12px] text-slate-600">{sendBack.summary.bullets.map((b, i) => <li key={i}>• {b}</li>)}</ul>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between rounded-xl border border-ai-200 bg-ai-50/40 px-4 py-3">
          <span className="text-[12.5px] text-slate-600">{sendBack.staged ? '✓ Sent — status is now In Negotiation, ball in their court.' : 'Sends a clean copy + redline. AI can\'t deliver — this stages it under your account.'}</span>
          <Button variant="ai" icon={<Send size={14} />} disabled={!sendBack.redline || sendBack.staged} onClick={() => send(agreementId)}>Send clean copy + redline</Button>
        </div>
      </div>
    </div>
  )
}

type RightTab = 'directive' | 'ai' | 'comments' | null

export function AgreementReview({ agreementId }: { agreementId: string }) {
  const agreement = useStore((s) => s.agreements.find((a) => a.id === agreementId)!)
  const versions = useStore((s) => s.versions).filter((v) => v.agreement_id === agreementId).sort((a, b) => a.version_number - b.version_number)
  const documents = useStore((s) => s.documents)
  const canvas = useStore((s) => s.canvas)
  const navigate = useStore((s) => s.navigate)
  const openSendBack = useStore((s) => s.openSendBack)
  const rawMode = canvas.reviewMode ?? 'directive'
  const mode = rawMode === 'document' ? 'directive' : rawMode // 'document' aliases to the split
  const [rightTab, setRightTab] = useState<RightTab>('directive')
  const [aiSeed, setAiSeed] = useState<{ text: string; nonce: number } | null>(null)
  const [focusClause, setFocusClause] = useState<string | undefined>()
  const [selVer, setSelVer] = useState<string | undefined>(undefined)

  // Eric §2: the attorney works on V3 (their working copy), not the counterparty's V2.
  const reviewVersion = versions.find((v) => v.source === 'cp_redline' && documents[v.id]) ?? versions.find((v) => v.source === 'counterparty_response') ?? versions[versions.length - 1]
  const activeVerId = (selVer && versions.some((v) => v.id === selVer)) ? selVer : reviewVersion?.id
  const activeDoc = documents[activeVerId ?? '']
  const hasDoc = !!activeDoc

  const askAiAboutSelection = (text: string) => { setRightTab('ai'); setAiSeed((prev) => ({ text, nonce: (prev?.nonce ?? 0) + 1 })) }
  const focusDeviation = (deviationId: string) => {
    const cid = clauseIdForDeviation(activeDoc, deviationId) ?? clauseIdForDeviation(documents['V-2201-2'], deviationId)
    if (cid) setFocusClause(cid)
    setFocusClause((prev) => (prev === cid ? cid + ' ' : cid)) // force re-trigger even if same
  }

  const TABS = [
    { key: 'directive', label: 'Review', icon: <ListChecks size={14} /> },
    { key: 'issues', label: 'List', icon: <FileText size={14} /> },
    { key: 'compare', label: 'Compare', icon: <GitCompareArrows size={14} /> },
    { key: 'sendback', label: 'Send back', icon: <Send size={14} /> },
  ] as const
  const activeTab = mode === 'redline' ? 'sendback' : mode
  const onTab = (k: string) => { if (k === 'sendback') openSendBack(agreementId); else navigate({ reviewMode: k as typeof rawMode }) }

  const RailBtn = ({ k, icon, label, ai }: { k: RightTab; icon: JSX.Element; label: string; ai?: boolean }) => (
    <button onClick={() => setRightTab(k)} className={clsx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition',
      rightTab === k ? (ai ? 'bg-ai-50 text-ai-700' : 'bg-slate-100 text-slate-700') : 'text-slate-400 hover:bg-slate-50')}>{icon} {label}</button>
  )

  return (
    <div className="flex h-full flex-col">
      <StageTracker agreementId={agreementId} />

      {/* mode toggles + version pills */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3 py-2">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => onTab(t.key)} className={clsx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition', activeTab === t.key ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100')}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <History size={13} />
          {versions.map((v) => (
            <button key={v.id} onClick={() => { setSelVer(v.id); navigate({ reviewMode: 'directive' }) }} title={`${sourceLabel[v.source]} — ${v.change_summary}`}
              className={clsx('rounded px-1.5 py-0.5 font-semibold transition', v.id === activeVerId ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* body */}
      <div className="flex min-h-0 flex-1">
        {!agreement.playbook_id ? (
          <div className="min-w-0 flex-1"><NoPlaybook title={agreement.title} type={agreement.agreement_type} /></div>
        ) : mode === 'sendback' ? (
          <div className="min-w-0 flex-1"><SendBackPanel agreementId={agreementId} workingVerId={activeVerId ?? 'V-2201-2'} /></div>
        ) : mode === 'redline' ? (
          <div className="min-w-0 flex-1"><RedlineDocView agreementId={agreementId} /></div>
        ) : mode === 'compare' ? (
          <div className="min-w-0 flex-1"><VersionCompare versionList={versions} documents={documents} /></div>
        ) : mode === 'issues' ? (
          <div className="min-w-0 flex-1 overflow-y-auto"><IssuesView agreementId={agreementId} onViewInDoc={(id) => { navigate({ reviewMode: 'directive' }); focusDeviation(id) }} /></div>
        ) : (
          <>
            {/* SPLIT: document (left) + review directive / ask claude / comments (right) — Eric §2 */}
            <div className="flex min-w-0 flex-1 flex-col border-r border-slate-200">
              {hasDoc
                ? <DocumentViewer versionId={activeVerId!} agreementId={agreementId} focusClauseId={focusClause?.trim()} onAskAi={askAiAboutSelection} />
                : <div className="flex h-full flex-col items-center justify-center px-8 text-center text-sm text-slate-400">
                    <FileText size={28} className="mb-2 text-slate-300" />
                    {versions.find((v) => v.id === activeVerId)?.label ?? 'This version'} — no tracked-changes document to display.
                    {documents['V-2201-2'] && agreementId === 'AGR-2201' && <button onClick={() => setSelVer(reviewVersion?.id)} className="mt-2 text-[12.5px] font-semibold text-brand-600 hover:underline">View the counterparty redline (Draft 2)</button>}
                  </div>}
            </div>
            {rightTab === null ? (
              <div className="flex w-12 shrink-0 flex-col items-center gap-2 bg-white py-3">
                <button onClick={() => setRightTab('directive')} title="Review directive" className="flex h-9 w-9 items-center justify-center rounded-lg text-ai-600 hover:bg-ai-50"><ListChecks size={16} /></button>
                <button onClick={() => setRightTab('ai')} title="Ask Claude" className="flex h-9 w-9 items-center justify-center rounded-lg text-ai-600 hover:bg-ai-50"><Sparkles size={16} /></button>
                <button onClick={() => setRightTab('comments')} title="Comments" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><MessageSquare size={16} /></button>
              </div>
            ) : (
              <div className="flex w-[360px] shrink-0 flex-col bg-white">
                <div className="flex shrink-0 items-center gap-0.5 border-b border-slate-100 px-2 py-2">
                  <RailBtn k="directive" icon={<ListChecks size={14} />} label="Review" />
                  <RailBtn k="ai" icon={<Sparkles size={14} />} label="Ask Claude" ai />
                  <RailBtn k="comments" icon={<MessageSquare size={14} />} label="Comments" />
                  <button onClick={() => setRightTab(null)} title="Collapse panel" className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><PanelRightClose size={15} /></button>
                </div>
                <div className="min-h-0 flex-1">
                  {rightTab === 'directive' ? <ReviewDirective agreementId={agreementId} onFocus={focusDeviation} />
                    : rightTab === 'ai' ? <AIPanel agreementTitle={agreement.title} seed={aiSeed} />
                    : <CommentsPanel ticketId={agreement.ticket_id} agreementId={agreementId} />}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
