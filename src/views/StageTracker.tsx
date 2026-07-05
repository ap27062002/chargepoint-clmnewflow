import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { Check, ChevronRight, ArrowRight, ShieldCheck, Lock, Undo2 } from 'lucide-react'
import { useStore, AGREEMENT_LIFECYCLE } from '@/store'
import { can } from '@/lib/access'
import { Chip, Avatar } from '@/components/ui'
import { agreementStatusMeta } from '@/lib/labels'
import { userById } from '@/data/seed'

export function StageTracker({ agreementId }: { agreementId: string }) {
  const agreement = useStore((s) => s.agreements.find((a) => a.id === agreementId))
  const approvals = useStore((s) => s.approvals).filter((ap) => ap.agreement_id === agreementId)
  const advance = useStore((s) => s.advanceAgreementStage)
  const openSendBack = useStore((s) => s.openSendBack)
  const receiveRedline = useStore((s) => s.receiveCounterpartyRedline)
  const decideApproval = useStore((s) => s.decideApproval)
  const uid = useStore((s) => s.currentUserId)
  const role = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!.role)
  const canAdvance = can(role, 'disposition')
  const stepperRef = useRef<HTMLDivElement>(null)
  const curIdx = agreement ? AGREEMENT_LIFECYCLE.indexOf(agreement.status) : -1
  // Keep the current stage visible when the stepper overflows behind the Advance button.
  useEffect(() => {
    const c = stepperRef.current
    const cur = c?.querySelector('[data-current="true"]') as HTMLElement | null
    if (c && cur) c.scrollLeft = Math.max(0, cur.offsetLeft - 24)
  }, [curIdx])
  if (!agreement) return null

  const next = AGREEMENT_LIFECYCLE[curIdx + 1]
  const pendingApproval = approvals.find((ap) => ap.state === 'pending')
  const blockedBySend = next === 'sent_to_counterparty' && (!approvals.some((a) => a.type === 'external_delivery' && a.state === 'granted'))

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5">
      {/* stepper + advance — single compact row */}
      <div className="flex items-center gap-2">
        <div ref={stepperRef} className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {AGREEMENT_LIFECYCLE.map((st, i) => {
            const done = i < curIdx
            const current = i === curIdx
            return (
              <div key={st} data-current={current} className="flex items-center gap-1">
                <div className={clsx('flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                  done ? 'bg-brand-50 text-brand-600' : current ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400')}>
                  {done && <Check size={11} />}
                  {agreementStatusMeta[st].label}
                </div>
                {i < AGREEMENT_LIFECYCLE.length - 1 && <ChevronRight size={13} className="shrink-0 text-slate-300" />}
              </div>
            )
          })}
        </div>
        {/* Negotiation loop: the counterparty can return further redlines instead of accepting (Eric §3). */}
        {agreement.status === 'negotiation' && canAdvance && (
          <button onClick={() => receiveRedline(agreementId)} title="Simulate the counterparty returning the document with further changes — reopens Redline Received with a new version."
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12.5px] font-semibold text-amber-700 transition hover:bg-amber-100">
            <Undo2 size={13} /> Counterparty sent further redlines
          </button>
        )}
        {/* "Send back to counterparty" is hidden for the attorney persona specifically —
            every other transition (advance, execute & sign) is unaffected. */}
        {agreement.status !== 'executed' && next && !(next === 'negotiation' && role === 'attorney') && (
          canAdvance ? (
            <button onClick={() => (next === 'negotiation' ? openSendBack(agreementId) : advance(agreementId))}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-600">
              {next === 'negotiation' ? 'Send back to counterparty' : next === 'executed' ? 'Execute & sign' : next === 'sent_to_counterparty' && blockedBySend ? 'Request approval to send' : `Advance to ${agreementStatusMeta[next].label}`}
              <ArrowRight size={13} />
            </button>
          ) : (
            <span className="flex shrink-0 items-center gap-1 text-[11.5px] font-medium text-slate-400"><Lock size={12} /> Attorney-only</span>
          )
        )}
        {agreement.status === 'executed' && <Chip className="shrink-0 bg-brand-100 text-brand-800 ring-brand-500/20"><Check size={11} /> Executed</Chip>}
      </div>

      {/* inline approval chain */}
      {approvals.length > 0 && (
        <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/40 p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-violet-700">
            <ShieldCheck size={12} /> Approval chain
            <Chip className="bg-white text-violet-700 ring-violet-200 capitalize">{approvals[0].mode}</Chip>
            <Chip className={clsx('ml-1', approvals[0].state === 'granted' ? 'bg-brand-50 text-brand-700 ring-brand-500/20' : approvals[0].state === 'denied' ? 'bg-red-50 text-red-700 ring-red-500/20' : 'bg-amber-50 text-amber-700 ring-amber-500/20')}>
              {approvals[0].state}
            </Chip>
          </div>
          <div className="mb-1.5 text-[12px] text-slate-500">{approvals[0].reason}</div>
          <div className="flex flex-wrap gap-2">
            {approvals[0].steps.map((st) => {
              const mine = st.approver_id === uid && st.state === 'pending'
              return (
                <div key={st.approver_id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                  <Avatar userId={st.approver_id} size={20} />
                  <span className="text-[12px] font-semibold text-slate-700">{userById(st.approver_id)?.name.split(' ')[0]}</span>
                  {st.state === 'granted' ? <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20"><Check size={10} /> Granted</Chip>
                    : st.state === 'denied' ? <Chip className="bg-red-50 text-red-700 ring-red-500/20">Denied</Chip>
                    : mine ? (
                      <span className="flex gap-1">
                        <button onClick={() => decideApproval(approvals[0].id, st.approver_id, true)} className="rounded bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-brand-600">Grant</button>
                        <button onClick={() => decideApproval(approvals[0].id, st.approver_id, false)} className="rounded border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">Deny</button>
                      </span>
                    ) : <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">Pending</Chip>}
                </div>
              )
            })}
          </div>
          {approvals[0].state === 'granted' && next === 'sent_to_counterparty' && (
            <div className="mt-1.5 text-[11.5px] font-semibold text-brand-600">✓ Approved — click “Advance to Sent to Counterparty” to deliver.</div>
          )}
          {pendingApproval && !pendingApproval.steps.some((st) => st.approver_id === uid) && (
            <div className="mt-1.5 text-[11.5px] text-slate-400">Waiting on the approver(s) above. Switch persona to an approver to grant it in the demo.</div>
          )}
        </div>
      )}
    </div>
  )
}
