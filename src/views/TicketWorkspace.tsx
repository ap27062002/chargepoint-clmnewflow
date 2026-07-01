import { clsx } from 'clsx'
import { MessagesSquare, FileSearch, LayoutGrid, FileSignature, ArrowRight, Flame } from 'lucide-react'
import { useStore } from '@/store'
import { Chip, Card, Button, SectionLabel, StackBar } from '@/components/ui'
import { statusChip, priorityMeta, ticketTypeLabel, fmtDate, agreementStatusMeta } from '@/lib/labels'
import { fmtMoney } from '@/lib/analytics'
import { DealDiscussion } from '@/views/DealDiscussion'
import { AgreementReview } from '@/views/AgreementReview'
import { userById } from '@/data/seed'
import type { Agreement } from '@/types'

const ballDot = (b: string) => (b === 'cp_legal' ? 'bg-brand-500' : 'bg-slate-400')

function DealOverview({ ticketId }: { ticketId: string }) {
  const agreements = useStore((s) => s.agreements)
  const navigate = useStore((s) => s.navigate)
  const openDealExecution = useStore((s) => s.openDealExecution)
  const ags = agreements.filter((a) => a.ticket_id === ticketId)
  const open = ags.filter((a) => a.status !== 'executed')
  const cpCourt = open.filter((a) => a.ball_in_court === 'cp_legal').length
  const cpt = open.filter((a) => a.ball_in_court === 'counterparty').length
  const value = ags.reduce((n, a) => n + (a.contract_value ?? 0), 0)
  const redLines = ags.reduce((n, a) => n + a.red_line_count, 0)
  const readyToSign = ags.filter((a) => a.status === 'pending_execution').length
  const openAg = (a: Agreement) => navigate({ agreementId: a.id, agreementTab: 'review', reviewMode: 'directive', solo: true })

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* rollup */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="p-3.5"><SectionLabel>Documents</SectionLabel><div className="mt-1 text-2xl font-bold text-slate-800">{ags.length}</div></Card>
          <Card className="p-3.5"><SectionLabel>In our court</SectionLabel><div className="mt-1 text-2xl font-bold text-brand-700">{cpCourt}<span className="text-sm text-slate-400">/{open.length}</span></div></Card>
          <Card className="p-3.5"><SectionLabel>Red lines</SectionLabel><div className={clsx('mt-1 text-2xl font-bold', redLines ? 'text-red-600' : 'text-slate-800')}>{redLines}</div></Card>
          <Card className="p-3.5"><SectionLabel>Deal value</SectionLabel><div className="mt-1 text-2xl font-bold text-slate-800">{fmtMoney(value)}</div></Card>
        </div>
        <div className="px-1"><StackBar segments={[{ n: cpCourt, className: 'bg-brand-500', label: 'Our court' }, { n: cpt, className: 'bg-slate-400', label: 'Counterparty' }, { n: ags.length - open.length, className: 'bg-brand-200', label: 'Executed' }]} /></div>

        {/* per-document rows */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <SectionLabel>Documents on this deal</SectionLabel>
            {readyToSign > 0 && <Button size="sm" variant="ai" icon={<FileSignature size={13} />} onClick={() => openDealExecution(ticketId)}>Execute & sign ({readyToSign} ready)</Button>}
          </div>
          {ags.map((a) => (
            <button key={a.id} onClick={() => openAg(a)} className="flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50">
              <FileSignature size={16} className={a.status === 'executed' ? 'text-brand-500' : 'text-slate-300'} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-slate-700">{a.title}</div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">{a.agreement_type}{a.contract_value ? ` · ${fmtMoney(a.contract_value)}` : ''}{a.red_line_count > 0 && <span className="flex items-center gap-0.5 text-red-500"><Flame size={10} /> {a.red_line_count}</span>}</div>
              </div>
              <Chip className={agreementStatusMeta[a.status].chip}>{agreementStatusMeta[a.status].label}</Chip>
              {a.status !== 'executed' && <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400"><span className={clsx('h-1.5 w-1.5 rounded-full', ballDot(a.ball_in_court))} />{a.ball_in_court === 'cp_legal' ? 'Us' : 'Them'}</span>}
              <ArrowRight size={14} className="text-slate-300" />
            </button>
          ))}
        </Card>
      </div>
    </div>
  )
}

export function TicketWorkspace() {
  const canvas = useStore((s) => s.canvas)
  const tickets = useStore((s) => s.tickets)
  const agreements = useStore((s) => s.agreements)
  const navigate = useStore((s) => s.navigate)

  const ticket = tickets.find((t) => t.id === canvas.ticketId) ?? tickets[0]
  const ags = agreements.filter((a) => a.ticket_id === ticket.id)
  const multi = ticket.type === 'multi_agreement' || ags.length > 1
  const tab = canvas.agreementTab ?? (multi ? 'overview' : 'deal')
  const activeAgreementId = canvas.agreementId ?? ags[0]?.id
  const activeAgreement = agreements.find((a) => a.id === activeAgreementId)

  const tabs = [
    ...(multi ? [{ key: 'overview' as const, label: 'Deal Overview', icon: <LayoutGrid size={15} /> }] : []),
    { key: 'deal' as const, label: 'Deal Discussion', icon: <MessagesSquare size={15} /> },
    { key: 'review' as const, label: 'Agreement Review', icon: <FileSearch size={15} /> },
  ]
  const onTab = (k: 'overview' | 'deal' | 'review') => navigate({ agreementTab: k, solo: k === 'review' })

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 pt-3.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold text-slate-800">{ticket.title}</h1>
              <Chip className={statusChip(ticket.status)}>{ticket.status}</Chip>
              {multi && <Chip className="bg-indigo-50 text-indigo-600 ring-indigo-500/20">{ags.length} documents</Chip>}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-slate-500">
              <span className="font-mono text-slate-400">{ticket.id}</span>
              <span>{ticketTypeLabel[ticket.type]}</span>
              <span>· {ticket.counterparty_name}</span>
              <span>· Initiator {userById(ticket.initiator_id)?.name}</span>
              <Chip className={priorityMeta[ticket.priority].chip}>{priorityMeta[ticket.priority].label}</Chip>
              <span>· SLA {fmtDate(ticket.sla_target_date)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => onTab(t.key)}
              className={clsx('flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-semibold transition', tab === t.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-400 hover:text-slate-600')}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agreement selector pills — on the Review tab of a multi-agreement deal */}
      {tab === 'review' && ags.length > 1 && (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-slate-100 bg-white px-5 py-2">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Documents</span>
          {ags.map((a) => (
            <button key={a.id} onClick={() => navigate({ agreementId: a.id, reviewMode: 'directive', reviewFocusDeviationId: undefined })}
              className={clsx('flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition', a.id === activeAgreementId ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50')}>
              {a.status !== 'executed' && <span className={clsx('h-1.5 w-1.5 rounded-full', ballDot(a.ball_in_court))} />}
              {a.agreement_type}
              <Chip className={clsx('!px-1.5 !py-0', agreementStatusMeta[a.status].chip)}>{agreementStatusMeta[a.status].label}</Chip>
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1">
        {tab === 'overview' ? <DealOverview ticketId={ticket.id} />
          : tab === 'deal' ? <DealDiscussion ticketId={ticket.id} />
          : activeAgreement ? <AgreementReview agreementId={activeAgreement.id} />
          : <div className="flex h-full items-center justify-center text-sm text-slate-400">This ticket has no agreements (legal inquiry).</div>}
      </div>
    </div>
  )
}
