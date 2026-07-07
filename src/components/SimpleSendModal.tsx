// A first-time send for a from-scratch draft (our own paper, no counterparty version yet) —
// no clean-copy/redline generation needed since nothing has been negotiated yet. Just who's
// receiving it.
import { useState } from 'react'
import { Send, X } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui'

export function SimpleSendModal({ agreementId, onClose }: { agreementId: string; onClose: () => void }) {
  const agreement = useStore((s) => s.agreements.find((a) => a.id === agreementId))
  const sendDraftToCounterparty = useStore((s) => s.sendDraftToCounterparty)
  const [receiverName, setReceiverName] = useState('')

  const send = () => {
    sendDraftToCounterparty(agreementId, receiverName)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-pop">
        <div className="mb-1 flex items-center gap-2">
          <Send size={16} className="text-ai-600" />
          <h2 className="text-[15px] font-bold text-slate-800">Send to counterparty</h2>
          <button onClick={onClose} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <p className="mb-3 text-[12px] text-slate-500">{agreement?.title} hasn't been negotiated yet — this is a first send, so there's nothing to clean up. Who's receiving it?</p>

        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Receiver's name</label>
        <input autoFocus value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="e.g. Jordan Lee, Rivian Legal"
          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] outline-none focus:border-ai-400" />

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="ai" icon={<Send size={13} />} onClick={send} disabled={!receiverName.trim()}>Send</Button>
        </div>
      </div>
    </div>
  )
}
