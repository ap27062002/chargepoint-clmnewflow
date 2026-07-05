import { useState } from 'react'
import { clsx } from 'clsx'
import { FileSignature, Send, Layers, Check } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Button, SectionLabel } from '@/components/ui'
import { agreementStatusMeta } from '@/lib/labels'
import type { EnvelopeMode } from '@/types'
import { SingleAgreementExecution } from '@/views/ExecutionView'

export function DealExecutionView() {
  const ticketId = useStore((s) => s.canvas.executionTicketId) ?? 'TKT-1031'
  const tickets = useStore((s) => s.tickets)
  const agreements = useStore((s) => s.agreements)
  const envelopes = useStore((s) => s.envelopes)

  const ticket = tickets.find((t) => t.id === ticketId)
  const ags = agreements.filter((a) => a.ticket_id === ticketId && a.status !== 'executed')
  const ready = (st: string) => st === 'pending_execution'
  const [selected, setSelected] = useState<string[]>(ags.filter((a) => ready(a.status)).map((a) => a.id))
  const [mode, setMode] = useState<EnvelopeMode>('individual')
  // "Routed" just opens the signature step for a document — it does NOT create the envelope yet.
  // The envelope is only created once the receiver's name/email is entered (SingleAgreementExecution).
  const [openedIds, setOpenedIds] = useState<string[]>([])
  const [groupMeta, setGroupMeta] = useState<{ groupId: string; mode: EnvelopeMode } | null>(null)

  if (!ticket) return null
  const routed = ags.filter((a) => openedIds.includes(a.id) || envelopes.some((e) => e.agreement_id === a.id))
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const route = () => {
    if (!selected.length) return
    const groupId = 'grp_' + Math.abs([...(ticketId + mode + selected.join(''))].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(16)
    setGroupMeta({ groupId, mode })
    setOpenedIds((ids) => [...new Set([...ids, ...selected])])
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><FileSignature size={20} /></div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Execute & sign — {ticket.title}</h1>
            <p className="text-[12.5px] text-slate-500">{ags.length} document{ags.length === 1 ? '' : 's'} on this deal · route them together or individually.</p>
          </div>
        </div>

        {/* Select which documents to sign + routing mode */}
        <Card className="mb-4 p-4">
          <SectionLabel className="mb-2">Documents to sign</SectionLabel>
          <div className="space-y-1.5">
            {ags.map((a) => {
              const isReady = ready(a.status)
              const isRouted = routed.some((r) => r.id === a.id)
              return (
                <label key={a.id} className={clsx('flex items-center gap-2.5 rounded-lg border px-3 py-2', isReady ? 'border-slate-200 hover:bg-slate-50 cursor-pointer' : 'border-slate-100 bg-slate-50/60')}>
                  <input type="checkbox" disabled={!isReady || isRouted} checked={selected.includes(a.id)} onChange={() => toggle(a.id)} className="accent-brand-500" />
                  <span className="text-[13px] font-semibold text-slate-700">{a.title}</span>
                  <Chip className={agreementStatusMeta[a.status].chip}>{agreementStatusMeta[a.status].label}</Chip>
                  {!isReady && <span className="ml-auto text-[11px] text-slate-400">Not ready — still in {agreementStatusMeta[a.status].label.toLowerCase()}</span>}
                  {isRouted && <Chip className="ml-auto bg-sky-50 text-sky-700 ring-sky-500/20">Routed</Chip>}
                </label>
              )
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11.5px] font-semibold text-slate-400">Route</span>
              <div className="flex rounded-lg border border-slate-200 p-0.5">
                {(['individual', 'combined'] as EnvelopeMode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={clsx('flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-semibold', mode === m ? 'bg-slate-800 text-white' : 'text-slate-500')}>
                    {m === 'combined' && <Layers size={12} />}{m === 'combined' ? 'All together' : 'Individually'}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="ai" icon={<Send size={14} />} disabled={!selected.length} onClick={route}>
              Route {selected.length || ''} for signature
            </Button>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {mode === 'combined' ? 'One envelope, signed as a batch.' : 'Separate envelopes — each can complete on its own timeline (the SOW may finish before the MSA).'}
          </div>
        </Card>

        {/* Per-document execution (advance each envelope; one may finish first) */}
        {routed.length > 0 && (
          <>
            <SectionLabel className="mb-2 flex items-center gap-1.5"><Check size={12} /> In signature</SectionLabel>
            <div className="space-y-4">
              {routed.map((a) => (
                <div key={a.id}>
                  <div className="mb-1 text-[12.5px] font-bold text-slate-700">{a.title}</div>
                  <SingleAgreementExecution agreementId={a.id} compact envelopeMeta={groupMeta ? { envelope_group_id: groupMeta.groupId, mode: groupMeta.mode } : undefined} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
