import { clsx } from 'clsx'
import { GitPullRequestArrow, Send, Settings2, FileText } from 'lucide-react'
import { useStore } from '@/store'
import { Chip, Button } from '@/components/ui'
import { redlineKindMeta } from '@/lib/labels'

// Full-frame Word-style redline of our clean copy vs the counterparty's version.
export function RedlineDocView({ agreementId }: { agreementId: string }) {
  const sendBack = useStore((s) => s.canvas.sendBack)
  const navigate = useStore((s) => s.navigate)
  const sendRedline = useStore((s) => s.sendRedline)
  const rl = sendBack?.redline

  if (!rl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <GitPullRequestArrow size={30} className="text-slate-300" />
        <div className="text-sm font-semibold text-slate-500">No redline generated yet</div>
        <Button variant="outline" icon={<Settings2 size={14} />} onClick={() => navigate({ reviewMode: 'sendback' })}>Open the send-back panel</Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <GitPullRequestArrow size={15} className="text-brand-500" />
        <span className="text-[12.5px] font-bold text-slate-700">Redline document</span>
        <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">{rl.workingVersionId} vs {rl.baseVersionId}{rl.cumulative ? ' · cumulative' : ''}</Chip>
        <Chip className="bg-amber-50 text-amber-700 ring-amber-500/20">{rl.changeCount} change{rl.changeCount === 1 ? '' : 's'}</Chip>
        <span className="ml-auto flex items-center gap-2 text-[11px]">
          <span className="tc-ins font-semibold">insertion</span>
          <span className="tc-del font-semibold">deletion</span>
        </span>
        <button onClick={() => navigate({ reviewMode: 'sendback' })} className="ml-2 flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold text-slate-500 hover:bg-slate-100"><Settings2 size={12} /> Options</button>
        <Button size="sm" variant="ai" icon={<Send size={13} />} onClick={() => sendRedline(agreementId)}>Send clean copy + redline</Button>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <div className="doc-prose mx-auto max-w-2xl rounded-lg bg-white p-10 font-serif text-[13.5px] text-slate-800 shadow-panel">
          <h1>{rl.title}</h1>
          <p className="mb-5 text-center text-[11px] not-italic text-slate-400">{rl.subtitle}</p>
          {rl.clauses.map((c) => (
            <div key={c.ref} className="clause rounded-md px-2 py-1">
              {c.heading && (
                <div className="flex items-center gap-2">
                  <h2 className="!mb-1">{c.heading}</h2>
                  {c.status !== 'unchanged' && <Chip className={clsx('ring-1 ring-inset', redlineKindMeta[c.status].chip)}>{redlineKindMeta[c.status].label}</Chip>}
                </div>
              )}
              <p>
                {c.runs.map((r, i) => (
                  <span key={i} className={r.kind === 'ins' ? 'tc-ins' : r.kind === 'del' ? 'tc-del' : ''}>{r.text}</span>
                ))}
              </p>
            </div>
          ))}
          {rl.clauses.length === 0 && <p className="flex items-center gap-1 text-slate-400"><FileText size={13} /> No differences to show.</p>}
        </div>
      </div>
    </div>
  )
}
