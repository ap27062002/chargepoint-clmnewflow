import { useState } from 'react'
import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import { Building2, Sparkles, Wand2, Check, MapPin, RefreshCw } from 'lucide-react'
import { useStore } from '@/store'
import { Card, Chip, Avatar, SectionLabel, Button } from '@/components/ui'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      {children}
    </div>
  )
}

export function IntakeFlow() {
  const cp = useStore((s) => s.canvas.intakeCp) ?? 'New Counterparty'
  const users = useStore((s) => s.users)
  const attorneys = users.filter((u) => u.role === 'attorney' || u.role === 'playbook_owner')
  const createTicket = useStore((s) => s.createTicketFromAgent)
  const openTicket = useStore((s) => s.openTicket)
  const setToast = useStore((s) => s.setToast)

  const [purpose, setPurpose] = useState<'default' | 'specific'>('default')
  const [purposeText, setPurposeText] = useState('')
  const [attorney, setAttorney] = useState('u_kirsten')
  const [law, setLaw] = useState('Delaware')
  const [generated, setGenerated] = useState(false)

  const generate = () => {
    const t = createTicket({
      title: `${cp} — Mutual NDA`, counterparty_name: cp, type: 'single_agreement',
      assigned_attorney_id: attorney, priority: 'normal',
      description: `NDA generated from CP Mutual NDA 2025 template for ${cp}. Purpose: ${purpose === 'default' ? 'broad (template default)' : purposeText || 'specific'}; governing law ${law}.`,
    })
    setGenerated(true)
    setToast(`Generated ${cp} NDA (V1) and routed to ${users.find((u) => u.id === attorney)?.name.split(' ')[0]}.`)
    setTimeout(() => openTicket(t.id), 600)
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Building2 size={20} /></div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">New Mutual NDA — {cp}</h1>
            <p className="text-[12.5px] text-slate-500">On ChargePoint paper, from the CP Mutual NDA 2025 template.</p>
          </div>
        </div>

        {/* CRM lookup */}
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <SectionLabel>Counterparty — from CRM</SectionLabel>
            <button className="flex items-center gap-1 text-[11.5px] font-semibold text-slate-400 hover:text-slate-600"><RefreshCw size={11} /> Re-check CRM</button>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
            <MapPin size={15} className="mt-0.5 text-slate-400" />
            <div className="text-[12.5px] text-slate-600">
              <div className="font-semibold text-slate-700">{cp}, Inc.</div>
              <div>Matched in Salesforce · Account #CP-{cp.length}0{cp.length}24</div>
              <div className="text-slate-400">Registered address auto-populated from the CRM record (internet fallback if absent).</div>
            </div>
            <Chip className="ml-auto bg-brand-50 text-brand-700 ring-brand-500/20"><Check size={11} /> Verified</Chip>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <Field label="Purpose / business context">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPurpose('default')} className={clsx('rounded-lg border px-3 py-2.5 text-left text-[13px] font-semibold transition', purpose === 'default' ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                Template default <div className="text-[11.5px] font-normal text-slate-400">Broad — any potential business relationship</div>
              </button>
              <button onClick={() => setPurpose('specific')} className={clsx('rounded-lg border px-3 py-2.5 text-left text-[13px] font-semibold transition', purpose === 'specific' ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                Specific purpose <div className="text-[11.5px] font-normal text-slate-400">Narrow to a defined evaluation</div>
              </button>
            </div>
            {purpose === 'specific' && (
              <input value={purposeText} onChange={(e) => setPurposeText(e.target.value)} placeholder="e.g. battery-supply technical evaluation"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-brand-400" />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Assigned attorney">
              <div className="space-y-1.5">
                {attorneys.map((a) => (
                  <button key={a.id} onClick={() => setAttorney(a.id)} className={clsx('flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition', attorney === a.id ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
                    <Avatar userId={a.id} size={22} />
                    <span className="text-[12.5px] font-semibold text-slate-700">{a.name}</span>
                    {a.expertise?.includes('NDA') && <Chip className="ml-auto bg-slate-100 text-slate-500 ring-slate-200">NDA</Chip>}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Governing law">
              <div className="space-y-1.5">
                {['Delaware', 'Counterparty home-state', 'New York (neutral)'].map((l) => (
                  <button key={l} onClick={() => setLaw(l)} className={clsx('w-full rounded-lg border px-2.5 py-2 text-left text-[12.5px] font-semibold transition', law === l ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                    {l}{l === 'Delaware' && <span className="ml-1 text-[11px] font-normal text-slate-400">· playbook standard</span>}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Card>

        <div className="flex items-center justify-between rounded-xl border border-ai-200 bg-ai-50/40 px-4 py-3">
          <div className="flex items-center gap-2 text-[12.5px] text-slate-600"><Sparkles size={15} className="text-ai-600" /> I'll populate parties, run a key-field QA check, and route it.</div>
          <Button variant="ai" icon={generated ? <Check size={15} /> : <Wand2 size={15} />} onClick={generate} disabled={generated}>
            {generated ? 'Generated' : 'Generate V1 & create ticket'}
          </Button>
        </div>
      </div>
    </div>
  )
}
