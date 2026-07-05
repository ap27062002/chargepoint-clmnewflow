import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { ListChecks, FileText, MessageSquare, Sparkles, History, AtSign, CheckCircle2, FileQuestion, Wand2, BookOpen, GitCompareArrows, ArrowRight, PanelRightClose, Send, CheckCheck, Layers, X as XIcon, MoreVertical, FileDown } from 'lucide-react'
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
import { MentionComposer } from '@/components/MentionComposer'
import { sourceLabel, fmtDate, fmtDateTime } from '@/lib/labels'
import { diffVersions, clauseIdForDeviation, cleanCopyId } from '@/data/documents'
import { userById } from '@/data/seed'

function CommentsPanel({ ticketId, agreementId, provisionOptions = [] }: { ticketId: string; agreementId: string; provisionOptions?: string[] }) {
  const messages = useStore((s) => s.messages).filter((m) => m.thread_type === 'agreement_level' && m.agreement_id === agreementId)
  const postMessage = useStore((s) => s.postMessage)
  const resolveMention = useStore((s) => s.resolveMention)
  const users = useStore((s) => s.users)
  const currentUserId = useStore((s) => s.currentUserId)
  const canComment = useStore((s) => can(s.users.find((u) => u.id === s.currentUserId)!.role, 'comment'))
  const taggable = users.filter((u) => u.id !== currentUserId)
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
          <MentionComposer
            people={taggable}
            provisionOptions={provisionOptions}
            onPost={({ body, mentions, provision_reference }) =>
              postMessage({ thread_type: 'agreement_level', ticket_id: ticketId, agreement_id: agreementId, body: body || `Requesting sign-off from ${mentions.length} contributor(s).`, tag: 'question', mentions, provision_reference })}
          />
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

function VersionCompare({ versionList, documents, fileBase }: { versionList: Version[]; documents: Record<string, DocModel>; fileBase: string }) {
  const withDocs = versionList.filter((v) => documents[v.id])
  const [aId, setAId] = useState(withDocs[0]?.id)
  const [bId, setBId] = useState(withDocs[withDocs.length - 1]?.id)
  const [generating, setGenerating] = useState(false)
  const setToast = useStore((s) => s.setToast)
  const da = documents[aId]
  const db = documents[bId]
  const diffs = da && db ? diffVersions(da, db) : []
  const va = withDocs.find((v) => v.id === aId), vb = withDocs.find((v) => v.id === bId)
  // Standalone redline export — zero connection to the send-to-counterparty flow.
  const generateRedlineFile = () => {
    if (generating) return
    setGenerating(true)
    const fname = `${fileBase}_${va?.label ?? 'a'}_vs_${vb?.label ?? 'b'}_Redline.docx`
    setTimeout(() => {
      setGenerating(false)
      setToast(`Redline generated. Downloading ${fname}`)
      const body = diffs.map((d) => `${d.heading}\n  BEFORE: ${d.aText}\n  AFTER: ${d.bText}`).join('\n\n')
      const blob = new Blob([`REDLINE — ${fileBase} ${va?.label} vs ${vb?.label}\n\n${body}`], { type: 'application/msword' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = fname; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    }, 900)
  }
  const Picker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12.5px] font-semibold text-slate-700 outline-none">
      {withDocs.map((v) => <option key={v.id} value={v.id}>{v.label} - {sourceLabel[v.source]} - {fmtDate(v.created_date)}</option>)}
    </select>
  )
  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mb-4 flex items-center gap-2">
        <Picker value={aId} onChange={setAId} /><ArrowRight size={15} className="text-slate-400" /><Picker value={bId} onChange={setBId} />
        <Button size="sm" variant="primary" icon={<FileDown size={13} />} onClick={generateRedlineFile} disabled={generating}>{generating ? 'Generating…' : 'Generate Redline'}</Button>
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

// Version model (Eric §7): only MAJOR versions live in the dropdown. Internal drafting
// cycles are captured as audit history — this panel shows them, plus per-version
// correction (reassign / renumber) for when auto-detection got it wrong (Intake §5).
function EditHistoryPanel({ agreementId, versions, onClose }: { agreementId: string; versions: Version[]; onClose: () => void }) {
  const agreements = useStore((s) => s.agreements)
  const tickets = useStore((s) => s.tickets)
  const reassignVersion = useStore((s) => s.reassignVersion)
  const [kebab, setKebab] = useState<string | null>(null)
  const [reassign, setReassign] = useState<string | null>(null)
  const [target, setTarget] = useState('')
  const [renumber, setRenumber] = useState('')
  const ag = agreements.find((a) => a.id === agreementId)
  const dealAgs = agreements.filter((a) => a.ticket_id === ag?.ticket_id)
  const cur = versions[versions.length - 1]
  const SAVES = [
    { who: 'Kirsten Sachs', what: 'edited clause 4', when: 'Fri 2:14 PM' },
    { who: 'Daniel Vohrer', what: 'commented on §3(e)', when: 'Wed 11:02 AM' },
    { who: 'Kirsten Sachs', what: 'accepted 2 counterparty changes', when: 'Wed 9:48 AM' },
    { who: 'Autosave', what: 'internal working save', when: 'Tue 6:31 PM' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-pop">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-slate-800">Edit history — {ag?.title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><XIcon size={15} /></button>
        </div>
        <p className="mb-3 text-[11.5px] text-slate-400">Only major versions (sent to / received from the counterparty) appear in the version dropdown. Internal drafting cycles are captured here as audit history — not as new versions.</p>

        <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Internal saves within {cur?.label ?? 'the working version'}</div>
        <div className="mb-4 space-y-1">
          {SAVES.map((sv, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-[12px] text-slate-600">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
              <span><b>{sv.who}</b> {sv.what}</span>
              <span className="ml-auto shrink-0 text-[11px] text-slate-400">{sv.when}</span>
            </div>
          ))}
        </div>

        <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Major versions</div>
        <div className="space-y-1">
          {versions.map((v) => (
            <div key={v.id} className="relative flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-[12.5px]">
              <span className="font-bold text-slate-700">{v.label}</span>
              <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">{sourceLabel[v.source]}</Chip>
              <span className="text-[11px] text-slate-400">{fmtDate(v.created_date)} · {v.document_ref}</span>
              <button onClick={() => setKebab(kebab === v.id ? null : v.id)} className="ml-auto rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"><MoreVertical size={13} /></button>
              {kebab === v.id && (
                <div className="absolute right-2 top-9 z-10 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-pop">
                  <button onClick={() => { setReassign(v.id); setKebab(null); setTarget(dealAgs.find((a) => a.id !== agreementId)?.id ?? dealAgs[0]?.id ?? '') }}
                    className="block w-full rounded-md px-2 py-1.5 text-left text-[12px] text-slate-600 hover:bg-slate-50">Reassign version…</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {reassign && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <div className="text-[12px] font-bold text-slate-700">Reassign {versions.find((v) => v.id === reassign)?.label} — wrong document or wrong number?</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12px] outline-none">
                {dealAgs.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                {tickets.filter((t) => t.id !== ag?.ticket_id).slice(0, 2).map((t) => agreements.filter((a) => a.ticket_id === t.id).slice(0, 1).map((a) => <option key={a.id} value={a.id}>{a.title} ({t.counterparty_name})</option>))}
              </select>
              <input value={renumber} onChange={(e) => setRenumber(e.target.value)} placeholder="Renumber (e.g. 4)" className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-[12px] outline-none" />
              <Button size="sm" variant="primary" onClick={() => { reassignVersion(reassign, target, renumber ? Number(renumber) : undefined); setReassign(null) }}>Apply</Button>
              <Button size="sm" variant="outline" onClick={() => setReassign(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Send-back (Eric §3) — everything is PREPARED automatically; this is a review-and-confirm
// screen, not a build-it-yourself pipeline. The doc was cleaned in real time as you dispositioned;
// the redline auto-generates; the summary is one optional click; then Send.
function SendBackPanel({ agreementId }: { agreementId: string }) {
  const sendBack = useStore((s) => s.canvas.sendBack)
  const versions = useStore((s) => s.versions).filter((v) => v.agreement_id === agreementId).sort((a, b) => a.version_number - b.version_number)
  const allDevs = useStore((s) => s.deviations)
  const documents = useStore((s) => s.documents)
  const applyAllRecommended = useStore((s) => s.applyAllRecommended)
  const setBase = useStore((s) => s.setSendBackBase)
  const setCumulative = useStore((s) => s.setSendBackCumulative)
  const generate = useStore((s) => s.generateRedline)
  const summarize = useStore((s) => s.summarizeChanges)
  const send = useStore((s) => s.sendRedline)
  const navigate = useStore((s) => s.navigate)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const devs = allDevs.filter((d) => d.agreement_id === agreementId)
  const counts = {
    open: devs.filter((d) => d.disposition_status === 'open').length,
    accepted: devs.filter((d) => d.disposition_status === 'accepted').length,
    countered: devs.filter((d) => d.disposition_status === 'countered').length,
    rejected: devs.filter((d) => d.disposition_status === 'rejected').length,
  }
  const agreements = useStore((s) => s.agreements)
  const curVerId = agreements.find((a) => a.id === agreementId)?.current_version_id ?? ''
  const hasDoc = !!documents[cleanCopyId(agreementId)] || !!documents[curVerId]

  // Auto-generate the redline — the user shouldn't have to assemble it by hand.
  useEffect(() => {
    if (sendBack && !sendBack.redline && !sendBack.staged && hasDoc) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendBack?.baseVersionId, sendBack?.cumulative, sendBack?.redline])

  if (!sendBack) return null
  const baseOptions = versions.filter((v) => v.source === 'counterparty_response' || v.source === 'counterparty_draft' || v.version_number === 1)
  const baseLabel = versions.find((v) => v.id === (sendBack.redline?.baseVersionId ?? sendBack.baseVersionId))?.label ?? sendBack.baseVersionId

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-3.5">
        <div>
          <h2 className="text-[16px] font-bold text-slate-800">Send back to counterparty</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500">Your decisions were applied to the document as you made them. Everything below is prepared — review it and send.</p>
        </div>

        {/* Resolution status — computed, not a manual step */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400"><ListChecks size={13} /> Resolution status</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20">{counts.accepted} accepted</Chip>
            <Chip className="bg-amber-50 text-amber-700 ring-amber-500/20">{counts.countered} countered</Chip>
            <Chip className="bg-red-50 text-red-700 ring-red-500/20">{counts.rejected} rejected</Chip>
            {counts.open > 0 && <Chip className="bg-slate-100 text-slate-600 ring-slate-300/40">{counts.open} still open</Chip>}
          </div>
          {counts.open > 0 ? (
            <div className="mt-2.5 flex items-center justify-between rounded-lg bg-amber-50/70 px-3 py-2 ring-1 ring-amber-100">
              <span className="text-[12.5px] text-amber-800">{counts.open} issue{counts.open === 1 ? '' : 's'} still undecided — resolve them in the review, or apply the recommended dispositions.</span>
              <Button size="sm" variant="outline" icon={<CheckCheck size={13} />} onClick={() => applyAllRecommended(agreementId)}>Apply recommended to {counts.open}</Button>
            </div>
          ) : (
            <div className="mt-2.5 rounded-lg bg-brand-50/60 px-3 py-2 text-[12.5px] text-brand-700 ring-1 ring-brand-100">✓ All issues resolved — the working document is clean and reflects every decision.</div>
          )}
        </Card>

        {/* Redline — auto-generated; advanced options tucked away */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400"><GitCompareArrows size={13} /> Redline for the counterparty</div>
          {sendBack.redline ? (
            <button onClick={() => navigate({ reviewMode: 'redline' })} className="flex w-full items-center justify-between rounded-lg bg-brand-50/60 px-3 py-2.5 text-left ring-1 ring-brand-100 hover:bg-brand-50">
              <span className="text-[12.5px] font-semibold text-brand-700"><GitCompareArrows size={12} className="mr-1 inline" /> Ready — {sendBack.redline.changeCount} change{sendBack.redline.changeCount === 1 ? '' : 's'} vs {baseLabel} (their last version)</span>
              <span className="text-[11.5px] font-semibold text-brand-600">Review it →</span>
            </button>
          ) : (
            <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-400">{hasDoc ? 'Generating…' : 'No tracked-changes document available for this agreement.'}</div>
          )}
          <details className="mt-2">
            <summary className="cursor-pointer select-none text-[11.5px] font-semibold text-slate-400 hover:text-slate-600">Advanced — compare against a different version</summary>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select value={sendBack.baseVersionId} onChange={(e) => setBase(e.target.value)} disabled={sendBack.cumulative} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12.5px] font-semibold text-slate-700 outline-none disabled:opacity-50">
                {baseOptions.map((v) => <option key={v.id} value={v.id}>{v.label} · {sourceLabel[v.source]}</option>)}
              </select>
              <label title="Cumulative diffs against the original first draft (every change since the start). Off = just this round's changes vs their last version." className="flex items-center gap-1.5 text-[12px] text-slate-600"><input type="checkbox" checked={sendBack.cumulative} onChange={(e) => setCumulative(e.target.checked)} className="accent-brand-500" /><Layers size={12} /> Cumulative (vs the original draft)</label>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Changing this regenerates the redline automatically.</div>
          </details>
        </Card>

        {/* Optional summary */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400"><Sparkles size={13} /> Cover summary <span className="font-normal normal-case text-slate-300">· optional</span></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" icon={<Sparkles size={13} />} onClick={() => summarize('internal')}>For the deal team</Button>
            <Button size="sm" variant="outline" icon={<Sparkles size={13} />} onClick={() => summarize('external')}>For the counterparty</Button>
          </div>
          {sendBack.summary && (
            <div className="mt-2 rounded-lg bg-ai-50/50 p-3 ring-1 ring-ai-100">
              <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-slate-700">{sendBack.summary.headline}<Chip className="bg-white text-ai-700 ring-ai-200">{sendBack.summary.audience}</Chip></div>
              <ul className="space-y-0.5 text-[12px] text-slate-600">{sendBack.summary.bullets.map((b, i) => <li key={i}>• {b}</li>)}</ul>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between rounded-xl border border-ai-200 bg-ai-50/40 px-4 py-3">
          <span className="text-[12.5px] text-slate-600">{sendBack.staged ? '✓ Sent — status is now In Negotiation, ball in their court.' : `Sends the clean copy + the redline${sendBack.summary ? ' + your cover summary' : ''} to the counterparty, staged under your account.`}</span>
          <Button variant="ai" icon={<Send size={14} />} disabled={!sendBack.redline || sendBack.staged} onClick={() => setConfirmOpen(true)}>Send to counterparty</Button>
        </div>

        {/* Confirmation modal (Eric §9): pending-issues flag + the two attached files */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setConfirmOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-pop">
              <h3 className="text-[14px] font-bold text-slate-800">Send to counterparty?</h3>
              {counts.open > 0 && (
                <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800 ring-1 ring-amber-200">
                  ⚠ {counts.open} unresolved item{counts.open === 1 ? '' : 's'} — proceed anyway?
                </div>
              )}
              <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Attached files</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20"><FileText size={11} /> Clean version (.docx)</Chip>
                <Chip className="bg-red-50 text-red-700 ring-red-500/20"><GitCompareArrows size={11} /> Redline vs {baseLabel} (.docx)</Chip>
              </div>
              <p className="mt-2 text-[12px] text-slate-500">Both the clean version and a redline against the last received version will be sent.</p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button variant="ai" icon={<Send size={13} />} onClick={() => { send(agreementId); setConfirmOpen(false) }}>Send</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Right panel = the AI assistant ONLY (Eric doc-review §1). Comments live inline in the
// document margin, anchored to their clauses.
type RightTab = 'ai' | null

export function AgreementReview({ agreementId }: { agreementId: string }) {
  const agreement = useStore((s) => s.agreements.find((a) => a.id === agreementId)!)
  const versions = useStore((s) => s.versions).filter((v) => v.agreement_id === agreementId).sort((a, b) => a.version_number - b.version_number)
  const documents = useStore((s) => s.documents)
  const canvas = useStore((s) => s.canvas)
  const navigate = useStore((s) => s.navigate)
  const openSendBack = useStore((s) => s.openSendBack)
  const rawMode = canvas.reviewMode ?? 'directive'
  const mode = rawMode === 'document' ? 'directive' : rawMode // 'document' aliases to the split
  const [rightTab, setRightTab] = useState<RightTab>('ai')
  const [aiSeed, setAiSeed] = useState<{ text: string; nonce: number } | null>(null)
  const [focusClause, setFocusClause] = useState<string | undefined>()
  const [selVer, setSelVer] = useState<string | undefined>(undefined)

  // Eric §2: the attorney works on V3 (their working copy), not the counterparty's V2.
  const reviewVersion = versions.find((v) => v.source === 'cp_redline' && documents[v.id]) ?? versions.find((v) => v.source === 'counterparty_response') ?? versions[versions.length - 1]
  const activeVerId = (selVer && versions.some((v) => v.id === selVer)) ? selVer : reviewVersion?.id
  const activeDoc = documents[activeVerId ?? '']
  const hasDoc = !!activeDoc

  const askAiAboutSelection = (text: string) => { setRightTab('ai'); setAiSeed((prev) => ({ text, nonce: (prev?.nonce ?? 0) + 1 })) }
  const [historyOpen, setHistoryOpen] = useState(false)
  const focusDeviation = (deviationId: string) => {
    const cid = clauseIdForDeviation(activeDoc, deviationId) ?? clauseIdForDeviation(documents['V-2201-2'], deviationId)
    if (cid) setFocusClause(cid)
    setFocusClause((prev) => (prev === cid ? cid + ' ' : cid)) // force re-trigger even if same
  }

  // Send-back is reached via the green stage-tracker CTA, not a tab here (avoids a duplicate control).
  const TABS = [
    { key: 'directive', label: 'Review', icon: <ListChecks size={14} /> },
    { key: 'issues', label: 'List', icon: <FileText size={14} /> },
    { key: 'compare', label: 'Compare', icon: <GitCompareArrows size={14} /> },
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
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <History size={13} />
            {/* Major versions only — a version = something received from / sent to the counterparty. */}
            <select value={activeVerId} onChange={(e) => { setSelVer(e.target.value); navigate({ reviewMode: 'directive' }) }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12px] font-semibold text-slate-700 outline-none">
              {versions.map((v) => <option key={v.id} value={v.id}>{v.label} - {sourceLabel[v.source]} - {fmtDate(v.created_date)}</option>)}
            </select>
          </div>
          <button onClick={() => setHistoryOpen(true)} className="text-[10.5px] font-semibold text-slate-400 underline-offset-2 hover:text-brand-600 hover:underline">View edit history</button>
        </div>
      </div>
      {historyOpen && <EditHistoryPanel agreementId={agreementId} versions={versions} onClose={() => setHistoryOpen(false)} />}

      {/* body */}
      <div className="flex min-h-0 flex-1">
        {!agreement.playbook_id ? (
          <div className="min-w-0 flex-1"><NoPlaybook title={agreement.title} type={agreement.agreement_type} /></div>
        ) : mode === 'sendback' ? (
          <div className="min-w-0 flex-1"><SendBackPanel agreementId={agreementId} /></div>
        ) : mode === 'redline' ? (
          <div className="min-w-0 flex-1"><RedlineDocView agreementId={agreementId} /></div>
        ) : mode === 'compare' ? (
          <div className="min-w-0 flex-1"><VersionCompare versionList={versions} documents={documents} fileBase={`${agreement.title.split(' ')[0]}_${agreement.agreement_type === 'Other' ? 'Document' : agreement.agreement_type}`} /></div>
        ) : mode === 'issues' ? (
          <div className="min-w-0 flex-1 overflow-y-auto"><IssuesView agreementId={agreementId} onViewInDoc={(id) => { navigate({ reviewMode: 'directive' }); focusDeviation(id) }} /></div>
        ) : (
          <>
            {/* SPLIT: document (left) + review directive / ask claude / comments (right) — Eric §2 */}
            <div className="flex min-w-0 flex-1 flex-col border-r border-slate-200">
              {hasDoc
                ? <DocumentViewer versionId={activeVerId!} agreementId={agreementId} focusClauseId={focusClause?.trim()} focusRef={canvas.reviewFocusRef} onAskAi={askAiAboutSelection} />
                : <div className="flex h-full flex-col items-center justify-center px-8 text-center text-sm text-slate-400">
                    <FileText size={28} className="mb-2 text-slate-300" />
                    {versions.find((v) => v.id === activeVerId)?.label ?? 'This version'} — no tracked-changes document to display.
                    {documents['V-2201-2'] && agreementId === 'AGR-2201' && <button onClick={() => setSelVer(reviewVersion?.id)} className="mt-2 text-[12.5px] font-semibold text-brand-600 hover:underline">View the counterparty redline (Draft 2)</button>}
                  </div>}
            </div>
            {rightTab === null ? (
              <div className="flex w-12 shrink-0 flex-col items-center gap-2 bg-white py-3">
                <button onClick={() => setRightTab('ai')} title="Ask Claude" className="flex h-9 w-9 items-center justify-center rounded-lg text-ai-600 hover:bg-ai-50"><Sparkles size={16} /></button>
              </div>
            ) : (
              <div className="flex w-[440px] shrink-0 flex-col bg-white">
                <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[13px] font-bold text-ai-700"><Sparkles size={14} /> Ask Claude</div>
                    <div className="text-[11px] text-slate-400">Playbook guidance, precedents, and drafting help.</div>
                  </div>
                  <button onClick={() => setRightTab(null)} title="Collapse panel" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><PanelRightClose size={15} /></button>
                </div>
                <div className="min-h-0 flex-1">
                  <AIPanel agreementTitle={agreement.title} seed={aiSeed} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
