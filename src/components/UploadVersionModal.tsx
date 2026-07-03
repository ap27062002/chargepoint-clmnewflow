// Intake §1 — in-deal upload with DETECTION + validation questioning. Drop a file, the
// system identifies it by content match (the embedded-ID path is shown on the agent flow),
// and asks a follow-up when the user says the guess is wrong.
import { useState } from 'react'
import { clsx } from 'clsx'
import { X, UploadCloud, FileSearch, Check, FileQuestion } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Chip } from '@/components/ui'

const typeTag = (t: string) => (t === 'Other' ? 'Document' : t)

export function UploadVersionModal({ ticketId, defaultAgreementId, onClose }: { ticketId: string; defaultAgreementId?: string; onClose: () => void }) {
  const agreements = useStore((s) => s.agreements).filter((a) => a.ticket_id === ticketId)
  const versions = useStore((s) => s.versions)
  const ingestVersion = useStore((s) => s.ingestVersion)
  const [step, setStep] = useState<'drop' | 'detect' | 'which'>('drop')
  const [fileName, setFileName] = useState('NWE_MSA_final_FINAL2.pdf')
  const [dragOver, setDragOver] = useState(false)
  const guess = agreements.find((a) => a.id === defaultAgreementId) ?? agreements.find((a) => a.agreement_type === 'MSA') ?? agreements[0]
  const nextNum = versions.filter((v) => v.agreement_id === guess?.id).length + 1

  const drop = (name?: string) => { if (name) setFileName(name); setStep('detect') }
  const confirm = (agreementId: string, asNew?: boolean) => {
    ingestVersion(agreementId, fileName, asNew)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-pop">
        <div className="mb-3 flex items-center gap-2">
          <UploadCloud size={16} className="text-brand-600" />
          <h3 className="text-[14px] font-bold text-slate-800">Upload new version</h3>
          <button onClick={onClose} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={15} /></button>
        </div>

        {step === 'drop' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); drop(e.dataTransfer.files?.[0]?.name) }}
            onClick={() => drop()}
            className={clsx('flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition', dragOver ? 'border-brand-400 bg-brand-50/50' : 'border-slate-300 hover:border-brand-300')}
          >
            <UploadCloud size={22} className="mb-1.5 text-slate-400" />
            <div className="text-[13px] font-semibold text-slate-600">Drop the returned document here</div>
            <div className="text-[11px] text-slate-400">.docx or .pdf — or click to use a sample counterparty file</div>
          </div>
        )}

        {step === 'detect' && guess && (
          <div>
            <div className="flex items-start gap-2.5 rounded-xl border border-ai-200 bg-ai-50/40 p-3.5">
              <FileSearch size={17} className="mt-0.5 shrink-0 text-ai-600" />
              <div className="text-[12.5px] leading-relaxed text-slate-700">
                This looks like <b>Version {nextNum}</b> of <b>{guess.title}</b> <span className="text-slate-500">(97% content match with v{nextNum - 1})</span>.
                <div className="mt-1 text-[11.5px] text-slate-500">File name received: <code className="rounded bg-white px-1 py-0.5 font-mono text-[10.5px] ring-1 ring-slate-200">"{fileName}"</code></div>
                <div className="mt-1 text-[11px] font-semibold text-amber-600">Embedded ID not found — matched via content analysis.</div>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" icon={<FileQuestion size={13} />} onClick={() => setStep('which')}>This is a different document</Button>
              <Button variant="primary" icon={<Check size={13} />} onClick={() => confirm(guess.id)}>Confirm as {typeTag(guess.agreement_type)} v{nextNum}</Button>
            </div>
          </div>
        )}

        {step === 'which' && (
          <div>
            {/* validation questioning — the system asks rather than guessing again */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-[12.5px] text-slate-700">
              Understood — which document on this deal does <b>"{fileName}"</b> belong to?
            </div>
            <div className="mt-2 space-y-1.5">
              {agreements.map((a) => (
                <button key={a.id} onClick={() => confirm(a.id)} className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-[12.5px] font-semibold text-slate-700 hover:border-brand-300 hover:bg-brand-50/40">
                  {a.title} <Chip className="bg-indigo-50 text-indigo-600 ring-indigo-500/20">{typeTag(a.agreement_type)}</Chip>
                </button>
              ))}
              <button onClick={() => confirm('', true)} className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-left text-[12.5px] font-semibold text-slate-500 hover:border-brand-300">
                + New document (add to this deal)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
