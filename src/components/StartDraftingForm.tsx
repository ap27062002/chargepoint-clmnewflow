// Draft-stage "Start drafting" form — purpose / term / jurisdiction. Writes REAL text into
// the document (Term & Termination / Governing Law clauses), not just metadata. The exact
// same info can be supplied conversationally in Ask Claude instead of this form.
import { useState } from 'react'
import { X, PenLine } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui'

export function StartDraftingForm({ agreementId, onClose }: { agreementId: string; onClose: () => void }) {
  const agreement = useStore((s) => s.agreements.find((a) => a.id === agreementId))
  const startDrafting = useStore((s) => s.startDrafting)
  const [purpose, setPurpose] = useState(agreement?.drafting_purpose ?? '')
  const [term, setTerm] = useState(agreement?.drafting_term ?? '')
  const [jurisdiction, setJurisdiction] = useState(agreement?.drafting_jurisdiction ?? '')

  const submit = () => {
    startDrafting(agreementId, { purpose, term, jurisdiction })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-pop">
        <div className="mb-3 flex items-center gap-2">
          <PenLine size={16} className="text-ai-600" />
          <h2 className="text-[15px] font-bold text-slate-800">Start drafting</h2>
          <button onClick={onClose} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <p className="mb-3 text-[12px] text-slate-500">Fill this in — or just tell Ask Claude "the purpose is a charging pilot, term 2 years, governed by Delaware" and I'll pick it up from there instead.</p>

        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Purpose</label>
        <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} placeholder="e.g. Evaluate a charging-network pilot at Rivian's Irvine campus"
          className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] outline-none focus:border-ai-400" />

        <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Term</label>
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. 2 years"
          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] outline-none focus:border-ai-400" />

        <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Jurisdiction</label>
        <input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="e.g. Delaware"
          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] outline-none focus:border-ai-400" />

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="ai" icon={<PenLine size={13} />} onClick={submit} disabled={!purpose.trim() && !term.trim() && !jurisdiction.trim()}>Apply to document</Button>
        </div>
      </div>
    </div>
  )
}
