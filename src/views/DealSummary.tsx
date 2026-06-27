import { ScrollText, TrendingDown, TrendingUp, Lightbulb, FileSignature, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, SectionLabel, AiTag, Empty } from '@/components/ui'
import { fmtDate } from '@/lib/labels'
import { dealSummaryData } from '@/lib/analytics'

// Key commercial terms aren't part of the deviation data, so they stay curated per deal;
// concessions / improvements / lessons are COMPUTED from the agreement's deviations + dispositions.
const keyTermsMap: Record<string, { label: string; value: string }[]> = {
  'AGR-2150': [
    { label: 'Term', value: '2 years' }, { label: 'CI survival', value: '5 years' },
    { label: 'Trade secrets', value: 'Indefinite' }, { label: 'Governing law', value: 'Delaware' },
  ],
  'AGR-2152': [
    { label: 'Term', value: '3 years' }, { label: 'CI survival', value: '3 years' },
    { label: 'Paper', value: 'Counterparty' }, { label: 'Governing law', value: 'New York' },
  ],
}

export function DealSummary() {
  const id = useStore((s) => s.canvas.dealSummaryId) ?? 'AGR-2150'
  const agreement = useStore((s) => s.agreements.find((a) => a.id === id))
  const ticket = useStore((s) => s.tickets.find((t) => t.id === agreement?.ticket_id))
  const deviations = useStore((s) => s.deviations).filter((d) => d.agreement_id === id)

  if (!agreement) return <Empty title="No deal summary" sub="Deal summaries are generated automatically on execution." />
  const sum = { keyTerms: keyTermsMap[id] ?? [], ...dealSummaryData(agreement, ticket, deviations) }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="overflow-hidden">
          <div className="bg-slate-900 px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ScrollText size={20} className="text-brand-400" />
                <div>
                  <h1 className="text-[16px] font-bold">{agreement.title} — Deal Summary</h1>
                  <div className="text-[11.5px] text-slate-400">Generated on execution · stored permanently</div>
                </div>
              </div>
              <Chip className="bg-brand-500/20 text-brand-300 ring-brand-400/30"><FileSignature size={11} /> Executed</Chip>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-slate-300">
              <span><span className="text-slate-500">Counterparty:</span> {ticket?.counterparty_name}</span>
              <span><span className="text-slate-500">Type:</span> {agreement.agreement_type}</span>
              <span><span className="text-slate-500">Executed:</span> {agreement.executed_date ? fmtDate(agreement.executed_date) : '—'}</span>
              <span><span className="text-slate-500">Paper:</span> {agreement.paper_origin === 'cp_paper' ? 'ChargePoint' : 'Counterparty'}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <SectionLabel className="mb-2.5">Key commercial terms</SectionLabel>
          <div className="grid grid-cols-4 gap-3">
            {sum.keyTerms.map((k) => (
              <div key={k.label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</div>
                <div className="mt-0.5 text-[14px] font-bold text-slate-800">{k.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-1.5"><TrendingDown size={14} className="text-amber-500" /><SectionLabel className="text-amber-600">Concessions ({sum.concessions.length})</SectionLabel></div>
            <ul className="space-y-1.5 text-[12.5px] text-slate-600">{sum.concessions.map((c, i) => <li key={i} className="flex gap-1.5"><span className="text-amber-400">•</span>{c}</li>)}</ul>
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-1.5"><TrendingUp size={14} className="text-brand-500" /><SectionLabel className="text-brand-600">Improvements ({sum.improvements.length})</SectionLabel></div>
            <ul className="space-y-1.5 text-[12.5px] text-slate-600">{sum.improvements.map((c, i) => <li key={i} className="flex gap-1.5"><span className="text-brand-400">•</span>{c}</li>)}</ul>
          </Card>
        </div>

        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5"><GitDeviations n={deviations.length} /></div>
          <div className="flex flex-wrap gap-1.5">
            {deviations.length === 0
              ? <span className="text-[12.5px] text-slate-400">Deviation history archived with the executed version.</span>
              : deviations.map((d) => <Chip key={d.id} className="bg-slate-100 text-slate-600 ring-slate-200">{d.provision_name} · {d.section_reference}</Chip>)}
          </div>
        </Card>

        <Card className="border-ai-200 bg-ai-50/40 p-4">
          <div className="mb-2 flex items-center gap-1.5"><Lightbulb size={14} className="text-ai-600" /><SectionLabel className="text-ai-700">Lessons learned</SectionLabel></div>
          <ul className="space-y-1.5 text-[12.5px] text-slate-600">{sum.lessons.map((c, i) => <li key={i} className="flex gap-1.5"><Sparkles size={12} className="mt-0.5 shrink-0 text-ai-400" />{c}</li>)}</ul>
          <div className="mt-2.5"><AiTag /></div>
        </Card>
      </div>
    </div>
  )
}

function GitDeviations({ n }: { n: number }) {
  return <><ScrollText size={14} className="text-slate-400" /><SectionLabel>Deviations on record ({n})</SectionLabel></>
}
