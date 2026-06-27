import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import { AtSign, Clock, GitPullRequestArrow, CheckCircle2, ArrowRight, Inbox, ShieldCheck } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Avatar, SectionLabel, Empty } from '@/components/ui'
import { statusChip, slaStatus, riskMeta, fmtDateTime } from '@/lib/labels'
import { userById } from '@/data/seed'

function Section({ icon, title, count, children }: { icon: JSX.Element; title: string; count: number; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <SectionLabel>{title}</SectionLabel>
        <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-500">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export function MyQueue() {
  const uid = useStore((s) => s.currentUserId)
  const messages = useStore((s) => s.messages)
  const tickets = useStore((s) => s.tickets)
  const deviations = useStore((s) => s.deviations)
  const agreements = useStore((s) => s.agreements)
  const openTicket = useStore((s) => s.openTicket)
  const openAgreement = useStore((s) => s.openAgreement)
  const resolveMention = useStore((s) => s.resolveMention)
  const approvals = useStore((s) => s.approvals)
  const decideApproval = useStore((s) => s.decideApproval)
  const openCanvas = useStore((s) => s.openCanvas)
  const myApprovals = approvals.filter((ap) => ap.state === 'pending' && ap.steps.some((st) => st.approver_id === uid && st.state === 'pending'))

  const awaitingMe = messages.filter((m) => m.mentions?.includes(uid) && !m.resolved)
  const requestedByMe = messages.filter((m) => m.author_id === uid && m.mentions?.length && !m.resolved)
  const myTickets = tickets.filter((t) => t.assigned_attorney_id === uid && t.status !== 'Executed' && t.status !== 'Resolved')
  const myAgreementIds = new Set(agreements.filter((a) => myTickets.some((t) => t.id === a.ticket_id)).map((a) => a.id))
  const openDevs = deviations.filter((d) => d.disposition_status === 'open' && myAgreementIds.has(d.agreement_id))

  const total = awaitingMe.length + requestedByMe.length + myTickets.length + openDevs.length + myApprovals.length

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">My Queue</h1>
        <p className="text-[13px] text-slate-500">Everything waiting on you, {userById(uid)?.name.split(' ')[0]} — tagged provisions, assignments, and open decisions.</p>
      </div>

      {total === 0 && <Empty icon={<CheckCircle2 size={28} className="text-brand-400" />} title="You're all clear" sub="Nothing is currently waiting on you." />}

      <div className="space-y-6">
        {myApprovals.length > 0 && (
          <Section icon={<ShieldCheck size={15} />} title="Approvals awaiting you" count={myApprovals.length}>
            {myApprovals.map((ap) => (
              <Card key={ap.id} className="border-violet-200 bg-violet-50/30 p-3">
                <div className="flex items-center gap-2 text-[12px] text-slate-500">
                  <Chip className="bg-white text-violet-700 ring-violet-200 capitalize">{ap.type.replace('_', ' ')}</Chip>
                  <span className="capitalize">{ap.mode}</span>
                </div>
                <div className="mt-1.5 text-[13px] text-slate-700">{ap.reason}</div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => decideApproval(ap.id, uid, true)} className="rounded-md bg-brand-500 px-3 py-1 text-[12px] font-semibold text-white hover:bg-brand-600">Grant</button>
                  <button onClick={() => decideApproval(ap.id, uid, false)} className="rounded-md border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-500 hover:bg-slate-50">Deny</button>
                  <button onClick={() => openCanvas({ view: 'execution', executionAgreementId: ap.agreement_id })} className="ml-auto flex items-center gap-1 text-[12px] font-semibold text-violet-600 hover:underline">Open execution <ArrowRight size={12} /></button>
                </div>
              </Card>
            ))}
          </Section>
        )}
        {awaitingMe.length > 0 && (
          <Section icon={<AtSign size={15} />} title="Awaiting your sign-off" count={awaitingMe.length}>
            {awaitingMe.map((m) => (
              <Card key={m.id} className="border-amber-200 bg-amber-50/30 p-3">
                <div className="flex items-center gap-2 text-[12px] text-slate-500">
                  <Avatar userId={m.author_id} size={20} /> {userById(m.author_id)?.name} tagged you
                  {m.provision_reference && <Chip className="bg-white text-slate-600 ring-slate-200">{m.provision_reference}</Chip>}
                  <span className="ml-auto">{fmtDateTime(m.created_date)}</span>
                </div>
                <div className="mt-1.5 text-[13px] text-slate-700">{m.body}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => openAgreement(m.agreement_id!, 'review')} className="flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:underline">Open agreement <ArrowRight size={12} /></button>
                  <button onClick={() => resolveMention(m.id)} className="text-[12px] font-semibold text-slate-400 hover:text-slate-600">Mark responded</button>
                </div>
              </Card>
            ))}
          </Section>
        )}

        {requestedByMe.length > 0 && (
          <Section icon={<AtSign size={15} />} title="Sign-offs you requested" count={requestedByMe.length}>
            {requestedByMe.map((m) => (
              <Card key={m.id} className="p-3">
                <div className="flex items-center gap-2 text-[12px] text-slate-500">
                  Waiting on {m.mentions!.map((id) => userById(id)?.name.split(' ')[0]).join(', ')}
                  {m.provision_reference && <Chip className="bg-slate-100 text-slate-600 ring-slate-200">{m.provision_reference}</Chip>}
                  <span className="ml-auto">{fmtDateTime(m.created_date)}</span>
                </div>
                <div className="mt-1.5 text-[13px] text-slate-700">{m.body}</div>
                <button onClick={() => openAgreement(m.agreement_id!, 'review')} className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:underline">Open thread <ArrowRight size={12} /></button>
              </Card>
            ))}
          </Section>
        )}

        {myTickets.length > 0 && (
          <Section icon={<Inbox size={15} />} title="Your active matters" count={myTickets.length}>
            {myTickets.map((t) => {
              const sla = slaStatus(t.created_date, t.sla_target_date)
              return (
                <Card key={t.id} onClick={() => openTicket(t.id)} className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-[13.5px] font-semibold text-slate-700">{t.title}</div>
                    <div className="text-[11.5px] text-slate-400">{t.id} · {t.counterparty_name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={clsx('flex items-center gap-1 text-[11.5px] font-semibold', sla.state === 'breach' ? 'text-red-600' : sla.state === 'warning' ? 'text-amber-600' : 'text-slate-400')}>
                      <Clock size={12} /> {sla.state === 'breach' ? 'SLA breached' : `${sla.daysLeft}d left`}
                    </span>
                    <Chip className={statusChip(t.status)}>{t.status}</Chip>
                  </div>
                </Card>
              )
            })}
          </Section>
        )}

        {openDevs.length > 0 && (
          <Section icon={<GitPullRequestArrow size={15} />} title="Open deviations to decide" count={openDevs.length}>
            {openDevs.map((d) => (
              <Card key={d.id} onClick={() => openAgreement(d.agreement_id, 'review')} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Chip className={clsx('ring-1 ring-inset', riskMeta[d.risk_category].chip)}><span className={clsx('h-1.5 w-1.5 rounded-full', riskMeta[d.risk_category].dot)} />{riskMeta[d.risk_category].label}</Chip>
                  <span className="text-[13px] font-semibold text-slate-700">{d.provision_name}</span>
                  <span className="font-mono text-[11px] text-slate-400">{d.section_reference}</span>
                </div>
                <ArrowRight size={14} className="text-slate-300" />
              </Card>
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}
