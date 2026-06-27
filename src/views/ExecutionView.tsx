import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import { FileSignature, Check, Clock, Send, ShieldCheck, Archive, ScrollText, PenLine } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Avatar, Button, SectionLabel } from '@/components/ui'
import { userById } from '@/data/seed'
import { fmtDateTime } from '@/lib/labels'
import type { Envelope } from '@/types'

function Step({ n, title, state, children }: { n: number; title: string; state: 'done' | 'active' | 'todo'; children?: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={clsx('flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold',
          state === 'done' ? 'bg-brand-500 text-white' : state === 'active' ? 'bg-ai-600 text-white' : 'bg-slate-200 text-slate-400')}>
          {state === 'done' ? <Check size={16} /> : n}
        </div>
        <div className={clsx('mt-1 w-px flex-1', state === 'done' ? 'bg-brand-300' : 'bg-slate-200')} />
      </div>
      <div className="flex-1 pb-6">
        <div className={clsx('text-[13.5px] font-bold', state === 'todo' ? 'text-slate-400' : 'text-slate-800')}>{title}</div>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  )
}

function SignerRow({ env, role }: { env: Envelope; role: 'cp_signer' | 'counterparty_signer' }) {
  const s = env.signers.find((x) => x.role === role)!
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <div className="flex items-center gap-2">
        <PenLine size={14} className="text-slate-400" />
        <div>
          <div className="text-[12.5px] font-semibold text-slate-700">{s.name}</div>
          <div className="text-[11px] text-slate-400">{s.email}</div>
        </div>
      </div>
      {s.state === 'signed' ? <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20"><Check size={11} /> Signed</Chip>
        : s.state === 'sent' ? <Chip className="bg-sky-50 text-sky-700 ring-sky-500/20"><Clock size={11} /> Awaiting signature</Chip>
        : <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">Queued</Chip>}
    </div>
  )
}

export function ExecutionView() {
  const id = useStore((s) => s.canvas.executionAgreementId) ?? 'AGR-2201'
  const agreement = useStore((s) => s.agreements.find((a) => a.id === id))
  const ticket = useStore((s) => s.tickets.find((t) => t.id === agreement?.ticket_id))
  const approvals = useStore((s) => s.approvals).filter((ap) => ap.agreement_id === id)
  const envelope = useStore((s) => s.envelopes).find((e) => e.agreement_id === id)
  const createApproval = useStore((s) => s.createApproval)
  const decideApproval = useStore((s) => s.decideApproval)
  const startEnvelope = useStore((s) => s.startEnvelope)
  const advanceEnvelope = useStore((s) => s.advanceEnvelope)
  const openCanvas = useStore((s) => s.openCanvas)

  if (!agreement) return null

  const approval = approvals[0]
  const approved = !approval || approval.state === 'granted'
  const executed = agreement.status === 'executed'

  const approvalStep: 'done' | 'active' | 'todo' = approved ? 'done' : 'active'
  const signStep: 'done' | 'active' | 'todo' = executed ? 'done' : approved ? (envelope ? 'active' : 'active') : 'todo'
  const archiveStep: 'done' | 'active' | 'todo' = executed ? 'done' : 'todo'

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><FileSignature size={20} /></div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Execution — {agreement.title}</h1>
            <p className="text-[12.5px] text-slate-500">{ticket?.counterparty_name} · attorney approval → DocuSign → archive → executed</p>
          </div>
          <Chip className="ml-auto bg-slate-100 text-slate-600 ring-slate-300/30">{agreement.status.replace(/_/g, ' ')}</Chip>
        </div>

        <Card className="p-5">
          {/* Step 1: approval */}
          <Step n={1} title="Attorney / approval chain" state={approvalStep}>
            {!approval ? (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="text-[12.5px] text-slate-500">External delivery requires an approval chain (senior counsel + privacy).</span>
                <Button size="sm" variant="outline" icon={<ShieldCheck size={13} />} onClick={() => createApproval(id, 'external_delivery')}>Request approvals</Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-[12px] text-slate-500">{approval.reason} · <span className="capitalize">{approval.mode}</span></div>
                {approval.steps.map((st) => (
                  <div key={st.approver_id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div className="flex items-center gap-2"><Avatar userId={st.approver_id} size={22} /><span className="text-[12.5px] font-semibold text-slate-700">{userById(st.approver_id)?.name}</span></div>
                    {st.state === 'granted' ? <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20"><Check size={11} /> Granted</Chip>
                      : st.state === 'denied' ? <Chip className="bg-red-50 text-red-700 ring-red-500/20">Denied</Chip>
                      : <div className="flex gap-1.5">
                          <button onClick={() => decideApproval(approval.id, st.approver_id, true)} className="rounded-md bg-brand-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-600">Grant</button>
                          <button onClick={() => decideApproval(approval.id, st.approver_id, false)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">Deny</button>
                        </div>}
                  </div>
                ))}
              </div>
            )}
          </Step>

          {/* Step 2: e-signature */}
          <Step n={2} title="Electronic signature (DocuSign)" state={signStep}>
            {!approved ? (
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-400">Waiting on approval before routing for signature.</div>
            ) : !envelope ? (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="text-[12.5px] text-slate-500">Clean execution copy ready. AI can't sign — you route the envelope.</span>
                <Button size="sm" variant="ai" icon={<Send size={13} />} onClick={() => startEnvelope(id)}>Send for signature</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11.5px] text-slate-400"><span className="font-mono">{envelope.id}</span> · created {fmtDateTime(envelope.created_date)}</div>
                <SignerRow env={envelope} role="cp_signer" />
                <SignerRow env={envelope} role="counterparty_signer" />
                {envelope.state !== 'completed' && (
                  <Button size="sm" variant="primary" icon={<PenLine size={13} />} onClick={() => advanceEnvelope(envelope.id)}>
                    {envelope.state === 'pending_cp' ? 'Simulate: CP signer signs' : 'Simulate: counterparty signs'}
                  </Button>
                )}
              </div>
            )}
          </Step>

          {/* Step 3: archive + executed */}
          <Step n={3} title="Archive & generate deal summary" state={archiveStep}>
            {executed ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-brand-50/60 px-3 py-2 text-[12.5px] text-brand-700 ring-1 ring-brand-100">
                  <Archive size={14} /> Executed {agreement.executed_date ? fmtDateTime(agreement.executed_date) : ''} · archived to the contract repository.
                </div>
                <Button size="sm" variant="outline" icon={<ScrollText size={13} />} onClick={() => openCanvas({ view: 'deal_summary', dealSummaryId: id })}>View the generated deal summary</Button>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-400">On full execution, the agreement is archived and a deal summary is generated automatically.</div>
            )}
          </Step>
        </Card>
      </div>
    </div>
  )
}
