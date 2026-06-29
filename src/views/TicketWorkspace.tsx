import { clsx } from 'clsx'
import { ArrowLeft, MessagesSquare, FileSearch } from 'lucide-react'
import { useStore } from '@/store'
import { Chip } from '@/components/ui'
import { statusChip, priorityMeta, ticketTypeLabel, fmtDate } from '@/lib/labels'
import { agreementStatusMeta } from '@/lib/labels'
import { DealDiscussion } from '@/views/DealDiscussion'
import { AgreementReview } from '@/views/AgreementReview'
import { userById } from '@/data/seed'

export function TicketWorkspace() {
  const canvas = useStore((s) => s.canvas)
  const tickets = useStore((s) => s.tickets)
  const agreements = useStore((s) => s.agreements)
  const setView = useStore((s) => s.setView)
  const navigate = useStore((s) => s.navigate)

  const ticket = tickets.find((t) => t.id === canvas.ticketId) ?? tickets[0]
  const ags = agreements.filter((a) => a.ticket_id === ticket.id)
  const tab = canvas.agreementTab ?? 'deal'
  const activeAgreementId = canvas.agreementId ?? ags[0]?.id
  const activeAgreement = agreements.find((a) => a.id === activeAgreementId)

  return (
    <div className="flex h-full flex-col">
      {/* Ticket header */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 pt-3.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold text-slate-800">{ticket.title}</h1>
              <Chip className={statusChip(ticket.status)}>{ticket.status}</Chip>
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

        {/* Tabs */}
        <div className="mt-3 flex gap-1">
          {[
            { key: 'deal' as const, label: 'Deal Discussion', icon: <MessagesSquare size={15} /> },
            { key: 'review' as const, label: 'Agreement Review', icon: <FileSearch size={15} /> },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => navigate({ agreementTab: t.key })}
              className={clsx(
                'flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-semibold transition',
                tab === t.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-400 hover:text-slate-600',
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agreement selector pills — only when a ticket bundles multiple agreements (e.g. MSA/DPA/SOW) */}
      {tab === 'review' && ags.length > 1 && (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-slate-100 bg-white px-5 py-2">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Agreements</span>
          {ags.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate({ agreementId: a.id, reviewMode: 'issues' })}
              className={clsx(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition',
                a.id === activeAgreementId ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
              )}
            >
              {a.title.replace(/^.*?(MSA|DPA|SOW|NDA|Agreement).*$/i, (m) => m)}
              <Chip className={clsx('!px-1.5 !py-0', agreementStatusMeta[a.status].chip)}>{agreementStatusMeta[a.status].label}</Chip>
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="min-h-0 flex-1">
        {tab === 'deal' ? (
          <DealDiscussion ticketId={ticket.id} />
        ) : activeAgreement ? (
          <AgreementReview agreementId={activeAgreement.id} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">This ticket has no agreements (legal inquiry).</div>
        )}
      </div>
    </div>
  )
}
