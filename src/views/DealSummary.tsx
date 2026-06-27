import { useState } from 'react'
import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import {
  ScrollText, TrendingDown, TrendingUp, Lightbulb, FileSignature, Sparkles, ShieldCheck,
  Download, FileText, X, Check, Archive, Clock, History as HistoryIcon, Stamp,
} from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, SectionLabel, AiTag, Empty, Button, Avatar } from '@/components/ui'
import { fmtDate, fmtDateTime, riskMeta } from '@/lib/labels'
import { dealSummaryData } from '@/lib/analytics'
import { executedDoc, executionDetails, type ExecutionDetails } from '@/data/executed'
import { userById } from '@/data/seed'

// Curated key commercial terms per executed deal (final negotiated outcome).
const keyTermsMap: Record<string, { label: string; value: string }[]> = {
  'AGR-2201': [
    { label: 'Term', value: '3 years' }, { label: 'CI survival', value: '3 years' },
    { label: 'Trade secrets', value: 'Indefinite' }, { label: 'Governing law', value: 'Delaware' },
    { label: 'Injunctive relief', value: 'Mutual, court-set bond' }, { label: 'Residuals', value: 'None (struck)' },
  ],
  'AGR-2150': [
    { label: 'Term', value: '2 years' }, { label: 'CI survival', value: '5 years' },
    { label: 'Trade secrets', value: 'Indefinite' }, { label: 'Governing law', value: 'Delaware' },
  ],
  'AGR-2152': [
    { label: 'Term', value: '3 years' }, { label: 'CI survival', value: '3 years' },
    { label: 'Paper', value: 'Counterparty' }, { label: 'Governing law', value: 'New York' },
  ],
}

function buildExecutedHtml(id: string, agreementTitle: string, exec: ExecutionDetails): string {
  const doc = executedDoc(id)
  const clauses = (doc?.clauses ?? []).map((c) => `<h3>${c.ref ? c.ref + ' ' : ''}${c.heading}</h3><p>${c.text}</p>`).join('')
  const sigs = exec.signers.map((s) => `<div class="sig"><div class="line"></div><div><b>${s.name}</b> — ${s.org}<br/><span>${s.email} · signed ${new Date(s.signedAt).toLocaleString()} · IP ${s.ip}</span></div></div>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${agreementTitle} — Executed</title>
<style>body{font-family:'Times New Roman',Georgia,serif;max-width:720px;margin:40px auto;color:#111;line-height:1.6}
h1{text-align:center;font-size:18px}h3{font-size:14px;margin:18px 0 4px}p{font-size:13px;margin:0 0 8px}
.meta{text-align:center;color:#666;font-size:12px;margin-bottom:24px}
.cert{margin-top:40px;border-top:2px solid #111;padding-top:16px;font-family:Arial,sans-serif}
.sig{display:flex;gap:12px;align-items:flex-end;margin:18px 0}.sig .line{width:200px;border-bottom:1px solid #111;height:28px}
.sig span{color:#666;font-size:11px}.stamp{color:#1b6f34;font-weight:bold;border:2px solid #1b6f34;display:inline-block;padding:4px 10px;border-radius:6px;transform:rotate(-4deg)}
.fields{font-family:Arial,sans-serif;font-size:12px;color:#333}</style></head>
<body><h1>${doc?.title ?? agreementTitle}</h1>
<div class="meta">${doc?.parties.cp ?? 'ChargePoint, Inc.'} and ${doc?.parties.counterparty ?? ''}<br/>Effective ${doc?.effectiveDate ?? ''}</div>
${clauses}
<div class="cert"><p class="stamp">EXECUTED VIA DOCUSIGN</p>
<div class="fields">Envelope ID: ${exec.envelopeId} · Completed ${new Date(exec.completedAt).toLocaleString()}<br/>Certificate of Completion: ${exec.certificateHash}<br/>Archive: ${exec.archivePath} · Retention ${exec.retention}</div>
<h3>Signatures</h3>${sigs}</div></body></html>`
}

function SignedDocModal({ id, agreementTitle, exec, onClose }: { id: string; agreementTitle: string; exec: ExecutionDetails; onClose: () => void }) {
  const doc = executedDoc(id)
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="my-4 w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-pop animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-700"><FileSignature size={15} className="text-brand-600" /> Executed agreement · fully signed</div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={15} /></button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto bg-slate-100 p-5">
          <div className="mx-auto max-w-xl rounded-lg bg-white p-8 font-serif text-[13px] text-slate-800 shadow-card">
            <h1 className="mb-1 text-center text-[15px] font-bold">{doc?.title ?? agreementTitle}</h1>
            <p className="mb-5 text-center text-[11px] text-slate-400">{doc?.parties.cp} and {doc?.parties.counterparty} · Effective {doc?.effectiveDate}</p>
            {doc?.clauses.map((c, i) => (
              <div key={i} className="mb-3">
                {c.heading && <div className="text-[13px] font-bold">{c.ref ? `${c.ref} ` : ''}{c.heading}</div>}
                <p className="leading-relaxed">{c.text}</p>
              </div>
            ))}
            {!doc && <p className="text-slate-400">Executed copy archived; full text available in the contract repository.</p>}
            {/* signature certificate */}
            <div className="mt-6 border-t-2 border-slate-800 pt-4 font-sans">
              <span className="inline-block -rotate-3 rounded-md border-2 border-brand-700 px-2.5 py-1 text-[11px] font-bold text-brand-700">EXECUTED VIA DOCUSIGN</span>
              <div className="mt-3 text-[11px] text-slate-500">Envelope {exec.envelopeId} · Completed {fmtDateTime(exec.completedAt)} · Certificate {exec.certificateHash}</div>
              <div className="mt-4 space-y-4">
                {exec.signers.map((s, i) => (
                  <div key={i} className="flex items-end gap-3">
                    <div className="font-['Brush_Script_MT',cursive] text-[20px] italic text-slate-700" style={{ fontFamily: 'cursive' }}>{s.name}</div>
                    <div className="mb-1 flex-1 border-b border-slate-300" />
                    <div className="text-[10.5px] text-slate-400">{s.org}<br />signed {fmtDateTime(s.signedAt)} · IP {s.ip}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DealSummary() {
  const id = useStore((s) => s.canvas.dealSummaryId) ?? 'AGR-2150'
  const agreement = useStore((s) => s.agreements.find((a) => a.id === id))
  const ticket = useStore((s) => s.tickets.find((t) => t.id === agreement?.ticket_id))
  const deviations = useStore((s) => s.deviations).filter((d) => d.agreement_id === id)
  const envelope = useStore((s) => s.envelopes).find((e) => e.agreement_id === id)
  const allAgreements = useStore((s) => s.agreements)
  const allTickets = useStore((s) => s.tickets)
  const setToast = useStore((s) => s.setToast)
  const [showDoc, setShowDoc] = useState(false)

  if (!agreement) return <Empty title="No deal summary" sub="Deal summaries are generated automatically on execution." />
  const computed = dealSummaryData(agreement, ticket, deviations)
  const keyTerms = keyTermsMap[id] ?? []
  const exec = executionDetails(agreement, ticket, envelope)
  const hasSignedDoc = !!executedDoc(id)

  // negotiation stats (computed)
  const cpUnfav = deviations.filter((d) => d.direction === 'cp_unfavorable')
  const acceptanceRate = deviations.length ? Math.round((100 * deviations.filter((d) => d.disposition_status === 'accepted').length) / deviations.length) : 0
  const concessionRate = cpUnfav.length ? Math.round((100 * cpUnfav.filter((d) => d.disposition_status === 'accepted').length) / cpUnfav.length) : 0
  const redLinesHeld = deviations.filter((d) => d.risk_category === 'red_line' && d.disposition_status === 'rejected').length
  const attorney = userById(ticket?.assigned_attorney_id ?? '')

  // counterparty history / benchmark
  const executed = allAgreements.filter((a) => a.status === 'executed')
  const priorWithCp = executed.filter((a) => a.id !== id && allTickets.find((t) => t.id === a.ticket_id)?.counterparty_name === ticket?.counterparty_name)
  const cycleDays = executed.map((a) => {
    const tk = allTickets.find((t) => t.id === a.ticket_id)
    return a.executed_date && tk ? Math.round((+new Date(a.executed_date) - +new Date(tk.created_date)) / 86400000) : null
  }).filter((x): x is number => x != null)
  const avgCycle = cycleDays.length ? Math.round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length) : null

  const download = () => {
    const html = buildExecutedHtml(id, agreement.title, exec)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(ticket?.counterparty_name ?? 'Agreement').replace(/\s+/g, '_')}_${agreement.agreement_type}_Executed.html`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    setToast('Downloaded the executed agreement — open it and Print → Save as PDF.')
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* header */}
        <Card className="overflow-hidden">
          <div className="bg-slate-900 px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ScrollText size={20} className="text-brand-400" />
                <div>
                  <h1 className="text-[16px] font-bold">{agreement.title} — Deal Summary</h1>
                  <div className="text-[11.5px] text-slate-400">Generated on execution · stored permanently · envelope {exec.envelopeId}</div>
                </div>
              </div>
              <Chip className="bg-brand-500/20 text-brand-300 ring-brand-400/30"><FileSignature size={11} /> Executed</Chip>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-slate-300">
              <span><span className="text-slate-500">Counterparty:</span> {ticket?.counterparty_name}</span>
              <span><span className="text-slate-500">Type:</span> {agreement.agreement_type}</span>
              <span><span className="text-slate-500">Executed:</span> {agreement.executed_date ? fmtDate(agreement.executed_date) : '—'}</span>
              <span><span className="text-slate-500">Paper:</span> {agreement.paper_origin === 'cp_paper' ? 'ChargePoint' : 'Counterparty'}</span>
              <span><span className="text-slate-500">Attorney:</span> {attorney?.name ?? '—'}</span>
            </div>
          </div>
        </Card>

        {/* SIGNED DOCUMENT — the executed copy + completion certificate */}
        <Card className="overflow-hidden border-brand-200">
          <div className="flex items-center justify-between border-b border-slate-100 bg-brand-50/40 px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] font-bold text-slate-800"><Stamp size={15} className="text-brand-600" /> Signed document</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<FileText size={14} />} onClick={() => setShowDoc(true)} disabled={!hasSignedDoc}>View</Button>
              <Button size="sm" variant="primary" icon={<Download size={14} />} onClick={download} disabled={!hasSignedDoc}>Download</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <SectionLabel className="mb-2">Completion certificate</SectionLabel>
              <div className="space-y-1.5 text-[12.5px]">
                <Row k="Envelope ID" v={<span className="font-mono text-[11.5px]">{exec.envelopeId}</span>} />
                <Row k="Completed" v={fmtDateTime(exec.completedAt)} />
                <Row k="Certificate" v={<span className="font-mono text-[11px]">{exec.certificateHash}</span>} />
                <Row k="Archive" v={<span className="text-[11.5px]">{exec.archivePath}</span>} />
                <Row k="Retention" v={exec.retention} />
              </div>
            </div>
            <div>
              <SectionLabel className="mb-2">Signers</SectionLabel>
              <div className="space-y-2">
                {exec.signers.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700"><Check size={12} /></span>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-slate-700">{s.name} <span className="font-normal text-slate-400">· {s.org}</span></div>
                      <div className="text-[10.5px] text-slate-400">Signed {fmtDateTime(s.signedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* key terms */}
        <Card className="p-4">
          <SectionLabel className="mb-2.5">Key commercial terms</SectionLabel>
          {keyTerms.length === 0 ? <div className="text-[12.5px] text-slate-400">Recorded in the executed copy.</div> : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {keyTerms.map((k) => (
                <div key={k.label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</div>
                  <div className="mt-0.5 text-[13px] font-bold text-slate-800">{k.value}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* negotiation stats (computed) */}
        <Card className="p-4">
          <SectionLabel className="mb-2.5">Negotiation summary — computed from {deviations.length} deviations</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Deviations" value={deviations.length} />
            <Stat label="Acceptance rate" value={`${acceptanceRate}%`} />
            <Stat label="Concession rate" value={`${concessionRate}%`} accent={concessionRate > 50 ? 'text-amber-600' : 'text-slate-800'} />
            <Stat label="Red lines held" value={redLinesHeld} accent="text-brand-600" />
            <Stat label="Cycle time" value={computed.cycleDays != null ? `${computed.cycleDays}d` : '—'} />
          </div>
        </Card>

        {/* outcomes */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-1.5"><TrendingDown size={14} className="text-amber-500" /><SectionLabel className="text-amber-600">Concessions ({computed.concessions.length})</SectionLabel></div>
            {computed.concessions.length === 0 ? <div className="text-[12.5px] text-slate-400">None — no counterparty-favorable terms were accepted.</div>
              : <ul className="space-y-1.5 text-[12.5px] text-slate-600">{computed.concessions.map((c, i) => <li key={i} className="flex gap-1.5"><span className="text-amber-400">•</span>{c}</li>)}</ul>}
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-1.5"><TrendingUp size={14} className="text-brand-500" /><SectionLabel className="text-brand-600">Improvements ({computed.improvements.length})</SectionLabel></div>
            {computed.improvements.length === 0 ? <div className="text-[12.5px] text-slate-400">—</div>
              : <ul className="space-y-1.5 text-[12.5px] text-slate-600">{computed.improvements.map((c, i) => <li key={i} className="flex gap-1.5"><span className="text-brand-400">•</span>{c}</li>)}</ul>}
          </Card>
        </div>

        {/* deviations on record */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5"><ScrollText size={14} className="text-slate-400" /><SectionLabel>Deviations on record ({deviations.length})</SectionLabel></div>
          <div className="flex flex-wrap gap-1.5">
            {deviations.length === 0 ? <span className="text-[12.5px] text-slate-400">Archived with the executed version.</span>
              : deviations.map((d) => (
                <Chip key={d.id} className={clsx('ring-1 ring-inset', riskMeta[d.risk_category].chip)}>
                  <span className={clsx('h-1.5 w-1.5 rounded-full', riskMeta[d.risk_category].dot)} />{d.provision_name} · {d.section_reference}
                </Chip>
              ))}
          </div>
        </Card>

        {/* counterparty history / benchmark */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5"><HistoryIcon size={14} className="text-slate-400" /><SectionLabel>Counterparty history & benchmark</SectionLabel></div>
          <div className="text-[12.5px] text-slate-600">
            {priorWithCp.length === 0
              ? <>This is the <b>first executed agreement</b> with {ticket?.counterparty_name}.</>
              : <>{priorWithCp.length} prior executed agreement(s) with {ticket?.counterparty_name}.</>}
            {avgCycle != null && <> Cycle time {computed.cycleDays ?? '—'} days vs. a <b>{avgCycle}-day</b> average across {executed.length} executed NDAs.</>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {executed.filter((a) => a.id !== id).slice(0, 4).map((a) => {
              const tk = allTickets.find((t) => t.id === a.ticket_id)
              return <Chip key={a.id} className="bg-slate-100 text-slate-600 ring-slate-200">{tk?.counterparty_name} · {a.agreement_type}</Chip>
            })}
          </div>
        </Card>

        {/* lessons learned */}
        <Card className="border-ai-200 bg-ai-50/40 p-4">
          <div className="mb-2 flex items-center gap-1.5"><Lightbulb size={14} className="text-ai-600" /><SectionLabel className="text-ai-700">Lessons learned</SectionLabel></div>
          <ul className="space-y-1.5 text-[12.5px] text-slate-600">{computed.lessons.map((c, i) => <li key={i} className="flex gap-1.5"><Sparkles size={12} className="mt-0.5 shrink-0 text-ai-400" />{c}</li>)}</ul>
          <div className="mt-2.5 flex items-center gap-2"><AiTag /><span className="flex items-center gap-1 text-[11px] text-slate-400"><ShieldCheck size={11} /> Feeds the weekly playbook-refinement loop</span></div>
        </Card>

        <div className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-slate-400">
          <Archive size={12} /> Immutable archive · {exec.retention} · {exec.archivePath}
        </div>
      </div>

      {showDoc && <SignedDocModal id={id} agreementTitle={agreement.title} exec={exec} onClose={() => setShowDoc(false)} />}
    </div>
  )
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex items-baseline justify-between gap-3"><span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</span><span className="text-right text-slate-700">{v}</span></div>
}
function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={clsx('mt-0.5 text-[16px] font-bold', accent ?? 'text-slate-800')}>{value}</div>
    </div>
  )
}
