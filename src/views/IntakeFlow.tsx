import { useState } from 'react'
import { clsx } from 'clsx'
import { Sparkles, Wand2, Check, Globe, Building2, PenLine, ChevronDown, Link2, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Avatar, SectionLabel, Button, Empty } from '@/components/ui'
import type { InferredField, IntakePayload } from '@/types'

type InferredKey = 'template' | 'jurisdiction' | 'governingLaw' | 'clausePosture' | 'purpose' | 'sfOpportunity'

const SOURCE_LABEL: Record<InferredField['source'], string> = {
  logged_in: 'From your login', crm: 'CRM / Salesforce', web: 'Web lookup', playbook: 'Playbook', inference: 'AI inference', manual: 'Manual',
}
const CONF_CHIP: Record<InferredField['confidence'], string> = {
  high: 'bg-brand-50 text-brand-700 ring-brand-500/20',
  medium: 'bg-amber-50 text-amber-700 ring-amber-500/20',
  low: 'bg-slate-100 text-slate-500 ring-slate-300/30',
}

function InferredRow({ label, field, onChange }: { label: string; field: InferredField; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  return (
    <div className="rounded-lg border border-slate-200 p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
        {field.edited
          ? <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30"><PenLine size={9} /> edited</Chip>
          : <Chip className={CONF_CHIP[field.confidence]}><Sparkles size={9} /> {SOURCE_LABEL[field.source]}</Chip>}
        <button onClick={() => setEditing((e) => !e)} className="ml-auto text-[11px] font-semibold text-ai-600 hover:underline">{editing ? 'Done' : 'Edit'}</button>
      </div>
      {editing
        ? <textarea autoFocus value={field.value} onChange={(e) => onChange(e.target.value)} rows={field.value.length > 60 ? 2 : 1}
            className="mt-1.5 w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-[13px] outline-none focus:border-ai-400" />
        : <div className="mt-1 text-[13px] leading-snug text-slate-700">{field.value}</div>}
      {field.note && !editing && <div className="mt-0.5 text-[11px] text-slate-400">{field.note}</div>}
    </div>
  )
}

export function IntakeFlow() {
  const payload = useStore((s) => s.canvas.intakePayload)
  const users = useStore((s) => s.users)
  const update = useStore((s) => s.updateIntakeField)
  const confirmCp = useStore((s) => s.confirmCounterparty)
  const prepareIntake = useStore((s) => s.prepareIntake)
  const generate = useStore((s) => s.generateNdaFromIntake)
  const openTicket = useStore((s) => s.openTicket)
  const [generated, setGenerated] = useState(false)
  const [behalf, setBehalf] = useState('')
  const [reQuery, setReQuery] = useState('')
  const [searching, setSearching] = useState(false)

  if (!payload) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Empty icon={<Wand2 size={30} className="text-ai-400" />} title="Ask the agent to draft an NDA"
          sub="e.g. “create an NDA using the ChargePoint template for UnifyApps” — I'll infer the counterparty, jurisdiction and posture, and pre-fill everything." />
      </div>
    )
  }

  const requestor = users.find((u) => u.id === payload.requestorId)
  const attorney = users.find((u) => u.id === payload.attorneyId)
  const attorneys = users.filter((u) => u.role === 'attorney' || u.role === 'playbook_owner')
  const profile = payload.profile
  const canGenerate = payload.confirmed && !!payload.signerName.trim() && /\S+@\S+\.\S+/.test(payload.signerEmail)
  const setField = (key: InferredKey, value: string) => update(key, { ...payload[key], value, edited: true })
  const onGenerate = () => { const t = generate(); if (!t) return; setGenerated(true); setTimeout(() => openTicket(t.id), 600) }
  const reRun = (q: string, onBehalf?: string) => { if (q.trim()) prepareIntake({ query: q.trim(), rawPrompt: payload.rawPrompt, onBehalfOf: onBehalf }) }

  // What this request implies downstream — the agent surfaces rework risk BEFORE drafting, so a
  // business user understands the trade-offs of a non-standard ask (Eric: "get the full implications").
  const posture = payload.clausePosture.value.toLowerCase()
  const law = payload.governingLaw.value
  const nonStandardLaw = !/california|delaware|new york/i.test(law)
  const aggressive = /aggress|custom|non-standard|counterparty|favorable to them|broad|one-sided/.test(posture)
  const redlineHint = /residual|perpetual|unlimited|no exp|indefinite/.test(posture)
  const implications: { text: string; sev: 'info' | 'warn' }[] = [
    { text: `Given the ${profile?.industry ?? 'counterparty'} profile and posture, expect ${aggressive ? '3–5' : '1–2'} likely redline round${aggressive ? 's' : ''} before signature.`, sev: aggressive ? 'warn' : 'info' },
  ]
  if (nonStandardLaw) implications.push({ text: `Governing law “${law}” sits outside ChargePoint's standard three (CA / DE / NY) — that usually adds a senior-counsel approval step and lengthens the cycle.`, sev: 'warn' })
  if (redlineHint) implications.push({ text: `The posture hints at residuals / perpetual terms — those are playbook red lines and will bounce back in review.`, sev: 'warn' })
  implications.push({ text: `Using the mutual template keeps you inside the playbook — the agent auto-classifies any counterparty deviations, so nothing slips through.`, sev: 'info' })
  const warnCount = implications.filter((i) => i.sev === 'warn').length
  const risk = warnCount >= 2 ? 'High' : warnCount === 1 ? 'Medium' : 'Low'
  const riskMeta = { High: 'bg-red-50 text-red-700 ring-red-500/20', Medium: 'bg-amber-50 text-amber-700 ring-amber-500/20', Low: 'bg-brand-50 text-brand-700 ring-brand-500/20' }[risk]

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ai-500 to-ai-700 text-white shadow-sm"><Wand2 size={20} /></div>
          <div>
            <h1 className="text-[18px] font-bold text-slate-800">Drafting your NDA{profile ? ` — ${profile.legal_name}` : ''}</h1>
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              From: <span className="font-medium text-slate-600">“{payload.rawPrompt}”</span>. I inferred everything below — confirm the counterparty, add the signer, and generate.
            </p>
          </div>
        </div>

        {/* 1 — Counterparty confirmation (gates generation) */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5"><Globe size={14} className="text-slate-400" /><SectionLabel>{payload.confirmed ? 'Counterparty' : 'Is this the counterparty?'}</SectionLabel></div>
          {profile ? (
            <div className={clsx('flex items-start gap-3 rounded-lg p-3 ring-1', payload.confirmed ? 'bg-brand-50/50 ring-brand-100' : 'bg-slate-50 ring-slate-200')}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[12px] font-bold text-white">{profile.logoSeed}</span>
              <div className="min-w-0 text-[12.5px]">
                <div className="font-semibold text-slate-800">{profile.legal_name}</div>
                <div className="flex flex-wrap items-center gap-x-2 text-slate-500"><Link2 size={11} /> {profile.website} · {profile.industry}</div>
                <div className="text-slate-400">{profile.address}</div>
                {profile.crm_account && <div className="text-slate-400">CRM {profile.crm_account}{profile.sf_opportunity ? ` · ${profile.sf_opportunity}` : ''}</div>}
              </div>
              {payload.confirmed && <Chip className="ml-auto shrink-0 bg-brand-100 text-brand-700 ring-brand-500/20"><Check size={10} /> Confirmed</Chip>}
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50/60 p-3 text-[12.5px] text-amber-800 ring-1 ring-amber-100">Couldn't resolve “{payload.counterpartyQuery}” — search again below.</div>
          )}
          {!payload.confirmed && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {profile && <Button variant="primary" size="sm" icon={<Check size={13} />} onClick={() => confirmCp(profile)}>Yes, that's them</Button>}
              {!searching
                ? <Button variant="outline" size="sm" onClick={() => setSearching(true)}>{profile ? 'No — different company' : 'Search a company'}</Button>
                : (
                  <span className="flex items-center gap-1.5">
                    <input autoFocus value={reQuery} onChange={(e) => setReQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { reRun(reQuery, payload.onBehalfOf); setSearching(false); setReQuery('') } }}
                      placeholder="Company name or website…" className="rounded-md border border-slate-300 px-2 py-1 text-[12.5px] outline-none focus:border-ai-400" />
                    <Button variant="outline" size="sm" onClick={() => { reRun(reQuery, payload.onBehalfOf); setSearching(false); setReQuery('') }}>Look up</Button>
                  </span>
                )}
            </div>
          )}
        </Card>

        {/* 2 — Requestor (auto from login) + impersonation */}
        <Card className="p-4">
          <SectionLabel>Requestor</SectionLabel>
          <div className="mt-1.5 flex items-center gap-2.5">
            <Avatar userId={requestor?.id} size={32} />
            <div className="text-[12.5px]">
              <div className="font-semibold text-slate-800">{requestor?.name}{payload.onBehalfOf ? <span className="font-normal text-slate-400"> · on behalf, filed by you</span> : ''}</div>
              <div className="text-[11px] text-slate-400">{requestor?.email} · {requestor?.title} — auto-filled from {payload.onBehalfOf ? 'the named requestor' : 'your login'}</div>
            </div>
          </div>
          <details className="mt-2 text-[11px] text-slate-400">
            <summary className="flex cursor-pointer items-center gap-1 select-none"><ChevronDown size={11} /> 3 fields handled in the backend — not asked</summary>
            <div className="mt-1 pl-4">Requestor email, business unit, and ChargePoint signing entity come from the identity record. The old form asked for these; we don't.</div>
          </details>
          <div className="mt-2.5">
            <input value={behalf} onChange={(e) => setBehalf(e.target.value)} onBlur={() => { if (behalf.trim()) reRun(payload.counterpartyQuery, behalf.trim()) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && behalf.trim()) reRun(payload.counterpartyQuery, behalf.trim()) }}
              placeholder="Filing for someone else? Type their name (e.g. Marcus)…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-ai-400 focus:bg-white" />
          </div>
        </Card>

        {/* 3 — AI-inferred deal context (all editable) */}
        <Card className="p-4">
          <div className="mb-2.5 flex items-center gap-1.5"><Sparkles size={14} className="text-ai-600" /><SectionLabel className="text-ai-700">AI-inferred — edit anything</SectionLabel></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2"><InferredRow label="Template" field={payload.template} onChange={(v) => setField('template', v)} /></div>
            <InferredRow label="Jurisdiction" field={payload.jurisdiction} onChange={(v) => setField('jurisdiction', v)} />
            <InferredRow label="Governing law" field={payload.governingLaw} onChange={(v) => setField('governingLaw', v)} />
            <div className="col-span-2"><InferredRow label="Likely clause posture" field={payload.clausePosture} onChange={(v) => setField('clausePosture', v)} /></div>
            <div className="col-span-2"><InferredRow label="Purpose" field={payload.purpose} onChange={(v) => setField('purpose', v)} /></div>
            <div className="col-span-2"><InferredRow label="Salesforce opportunity" field={payload.sfOpportunity} onChange={(v) => setField('sfOpportunity', v)} /></div>
          </div>
          <div className="mt-3">
            <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Assigned attorney <span className="font-normal normal-case text-slate-400">· auto-routed</span></div>
            <div className="flex flex-wrap gap-1.5">
              {attorneys.map((a) => (
                <button key={a.id} onClick={() => update('attorneyId', a.id)}
                  className={clsx('flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition', a.id === attorney?.id ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                  <Avatar userId={a.id} size={18} />{a.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* 4 — Implications & rework risk (the agent educates before drafting) */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-ai-600" /><SectionLabel className="text-ai-700">Implications & rework risk</SectionLabel>
            <Chip className={clsx('ml-auto ring-1 ring-inset', riskMeta)}>{risk === 'Low' ? <ShieldCheck size={10} /> : <AlertTriangle size={10} />} {risk} rework risk</Chip>
          </div>
          <div className="space-y-1.5">
            {implications.map((im, i) => (
              <div key={i} className="flex items-start gap-2 text-[12.5px] leading-snug">
                <span className={clsx('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', im.sev === 'warn' ? 'bg-amber-400' : 'bg-brand-400')} />
                <span className={im.sev === 'warn' ? 'text-slate-700' : 'text-slate-500'}>{im.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] text-slate-400">You can still proceed — this is guidance, not a blocker. Editing the posture above updates these implications live.</div>
        </Card>

        {/* 5 — The only manual fields */}
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" /><SectionLabel>Signer — the only thing I need from you</SectionLabel></div>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <input value={payload.signerName} onChange={(e) => update('signerName', e.target.value)} placeholder="Signer name"
              className="rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] outline-none focus:border-brand-400" />
            <input value={payload.signerEmail} onChange={(e) => update('signerEmail', e.target.value)} placeholder="Signer email"
              className="rounded-lg border border-slate-300 px-2.5 py-2 text-[13px] outline-none focus:border-brand-400" />
          </div>
        </Card>

        {/* 5 — Generate */}
        <div className="flex items-center justify-between rounded-xl border border-ai-200 bg-ai-50/40 px-4 py-3">
          <div className="flex items-center gap-2 text-[12.5px] text-slate-600"><Sparkles size={15} className="text-ai-600" />
            {payload.confirmed ? 'I\'ll generate V1, populate parties from the resolved profile, QA it, and route it.' : 'Confirm the counterparty above to enable generation.'}
          </div>
          <Button variant="ai" icon={generated ? <Check size={15} /> : <Wand2 size={15} />} onClick={onGenerate} disabled={!canGenerate || generated}>
            {generated ? 'Generated' : 'Generate V1 & create ticket'}
          </Button>
        </div>
      </div>
    </div>
  )
}
