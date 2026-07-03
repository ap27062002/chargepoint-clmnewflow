import { useState } from 'react'
import { clsx } from 'clsx'
import { FolderKanban, FileStack, Plus, Sparkles, Wand2, BookOpen, Save, FileText } from 'lucide-react'
import { useStore } from '@/store'
import { comparativeAnalysis } from '@/data/playbookDerive'
import { exportTemplateHtml } from '@/lib/templateGen'
import { Card, Chip, Button, SectionLabel, Empty } from '@/components/ui'
import type { TemplateProject, AgreementTemplate } from '@/types'

const projStatusChip: Record<string, string> = {
  building: 'bg-slate-100 text-slate-600 ring-slate-300/30', iterating: 'bg-ai-50 text-ai-700 ring-ai-500/20',
  template_ready: 'bg-brand-50 text-brand-700 ring-brand-500/20', archived: 'bg-slate-100 text-slate-400 ring-slate-300/30',
}
const tplStatusChip: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 ring-slate-300/30', in_review: 'bg-amber-50 text-amber-700 ring-amber-500/20', published: 'bg-brand-50 text-brand-700 ring-brand-500/20',
}

function ProjectDetail({ project }: { project: TemplateProject }) {
  const templates = useStore((s) => s.templates)
  const toggleSource = useStore((s) => s.toggleProjectSource)
  const generate = useStore((s) => s.generateTemplateDraft)
  const iterate = useStore((s) => s.iterateTemplate)
  const save = useStore((s) => s.saveTemplate)
  const buildPlaybook = useStore((s) => s.buildPlaybookFromTemplate)
  const [instr, setInstr] = useState('')
  const draft = templates.find((t) => t.id === project.draftTemplateId)
  // R85 — publish the finished TEMPLATE into an access-scoped team folder (not just playbooks).
  const teamFolders = useStore((s) => s.teamFolders)
  const publishArtifact = useStore((s) => s.publishArtifact)
  const [pubFolder, setPubFolder] = useState('')
  // R105 — the comparative analysis across the SELECTED negotiated agreements (computed from real clause text).
  const selectedIds = project.sources.filter((s) => s.selected).flatMap((s) => s.agreementIds ?? [])
  const analysis = comparativeAnalysis(selectedIds)

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-bold text-slate-800">{project.name}</h2>
          <Chip className={projStatusChip[project.status]}>{project.status.replace('_', ' ')}</Chip>
        </div>
        <p className="mt-0.5 text-[12.5px] text-slate-500">{project.goal}</p>
      </div>

      {/* Sources */}
      <Card className="p-4">
        <SectionLabel className="mb-2">Source material — the agent learns from these</SectionLabel>
        <div className="space-y-1.5">
          {project.sources.map((src) => (
            <label key={src.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
              <input type="checkbox" checked={src.selected} onChange={() => toggleSource(project.id, src.id)} className="mt-0.5 accent-brand-500" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700">{src.name}
                  <Chip className="bg-slate-100 text-slate-500 ring-slate-300/30">{src.kind.replace(/_/g, ' ')}</Chip></div>
                <div className="text-[11.5px] text-slate-400">{src.detail}</div>
              </div>
            </label>
          ))}
        </div>
        {!draft && (
          <div className="mt-3 flex justify-end">
            <Button variant="ai" icon={<Wand2 size={14} />} onClick={() => generate(project.id)}>Generate the template</Button>
          </div>
        )}
      </Card>

      {/* R105 — real comparative analysis across the selected negotiated agreements */}
      {draft && analysis.length > 0 && (
        <Card className="p-4">
          <SectionLabel className="mb-2 flex items-center gap-1.5"><FileStack size={13} className="text-ai-600" /> Comparative analysis · {selectedIds.length} negotiated agreement{selectedIds.length === 1 ? '' : 's'}</SectionLabel>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-[11.5px]">
              <thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-2.5 py-1.5 font-semibold">Concept</th><th className="px-2 py-1.5 font-semibold">Seen in</th><th className="px-2 py-1.5 font-semibold">Positions across precedents</th>
              </tr></thead>
              <tbody>
                {analysis.map((row) => (
                  <tr key={row.key} className="border-t border-slate-100 align-top">
                    <td className="px-2.5 py-1.5 font-semibold text-slate-700">{row.label}</td>
                    <td className="px-2 py-1.5 text-slate-500">{row.seenIn.length}/{selectedIds.length}</td>
                    <td className="px-2 py-1.5 text-slate-500">{[...new Set(row.positions.map((p) => `${p.text.length > 60 ? p.text.slice(0, 60) + '…' : p.text} [${p.counterparty.split(' ')[0]}]`))].join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-400">Toggle a source above and this analysis + the generated template change — both are computed from the actual clause text.</div>
        </Card>
      )}

      {/* Generated template preview */}
      {draft && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <SectionLabel className="flex items-center gap-1.5"><FileStack size={13} /> Generated template · {draft.sections.length} sections</SectionLabel>
            <Chip className={tplStatusChip[draft.status]}>{draft.status.replace('_', ' ')}</Chip>
          </div>
          <div className="text-[11.5px] text-slate-400">{draft.source_summary}</div>
          <div className="mt-2 grid grid-cols-1 gap-1">
            {draft.sections.map((s) => (
              <div key={s.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                <FileText size={13} className="mt-0.5 shrink-0 text-slate-300" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700">{s.heading}{s.cpConcept && <Chip className="bg-ai-50 text-ai-700 ring-ai-500/20"><Sparkles size={9} /> CP concept</Chip>}</div>
                  {/* R107 — real drafted clause body text, not just a heading */}
                  {s.body ? <div className="mt-0.5 rounded bg-slate-50 px-2 py-1 font-serif text-[11.5px] leading-snug text-slate-600">{s.body}</div> : <div className="text-[11.5px] text-slate-400">{s.summary}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={<Save size={13} />} onClick={() => save(project.id)}>Save to library</Button>
            <Button size="sm" variant="outline" icon={<FileText size={13} />} onClick={() => {
              const html = exportTemplateHtml(draft)
              const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
              const a = document.createElement('a'); a.href = url; a.download = `${draft.name.replace(/[^a-z0-9]+/gi, '-')}.html`; a.click(); URL.revokeObjectURL(url)
            }}>Export (.html)</Button>
            <Button size="sm" variant="ai" icon={<BookOpen size={13} />} onClick={() => buildPlaybook(draft.id)}>Build a playbook from this</Button>
          </div>
          {/* R85 — place the finished template in a folder accessible to the larger team */}
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
            <span className="text-[11.5px] font-semibold text-slate-500">Publish to team folder:</span>
            <select value={pubFolder || teamFolders[0]?.path} onChange={(e) => setPubFolder(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11.5px] font-semibold text-slate-600 outline-none">
              {teamFolders.map((f) => <option key={f.path} value={f.path}>{f.path} · {f.category}</option>)}
            </select>
            <Button size="sm" variant="outline" icon={<Save size={12} />} onClick={() => publishArtifact('template', draft.id, draft.name, 'Form template', pubFolder || teamFolders[0]?.path)}>Publish template</Button>
          </div>
        </Card>
      )}

      {/* Iteration chat (feedback loop) */}
      {draft && (
        <Card className="p-4">
          <SectionLabel className="mb-2 flex items-center gap-1.5"><Sparkles size={13} className="text-ai-600" /> Refine by chat</SectionLabel>
          <div className="space-y-2">
            {project.iterations.map((it) => (
              <div key={it.id} className={clsx('text-[12.5px]', it.role === 'user' ? 'text-right' : '')}>
                <div className={clsx('inline-block rounded-2xl px-3 py-1.5', it.role === 'user' ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-700 shadow-card')}>{it.text}</div>
                {it.changeNote && it.role === 'agent' && <div className="mt-0.5 text-[10.5px] text-slate-400">✓ {it.changeNote}</div>}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 focus-within:border-ai-400">
            <input value={instr} onChange={(e) => setInstr(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && instr.trim()) { iterate(project.id, instr.trim()); setInstr('') } }}
              placeholder="e.g. tighten the Station Data section…" className="flex-1 text-[12.5px] outline-none placeholder:text-slate-400" />
            <button onClick={() => { if (instr.trim()) { iterate(project.id, instr.trim()); setInstr('') } }} className="text-ai-600 hover:text-ai-700"><Sparkles size={15} /></button>
          </div>
        </Card>
      )}
    </div>
  )
}

function TemplateDetail({ template }: { template: AgreementTemplate }) {
  const playbooks = useStore((s) => s.playbooks)
  const buildPlaybook = useStore((s) => s.buildPlaybookFromTemplate)
  const pb = playbooks.find((p) => p.id === template.playbook_id)
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2"><h2 className="text-[16px] font-bold text-slate-800">{template.name}</h2><Chip className={tplStatusChip[template.status]}>{template.status.replace('_', ' ')}</Chip></div>
        <p className="mt-0.5 text-[12.5px] text-slate-500">{template.agreement_type} · v{template.version} · {template.source_summary}</p>
      </div>
      <Card className="p-4">
        <SectionLabel className="mb-2">{template.sections.length} sections</SectionLabel>
        <div className="grid grid-cols-1 gap-1">
          {template.sections.map((s) => (
            <div key={s.id} className="flex items-start gap-2 rounded-md px-2 py-1.5">
              <FileText size={13} className="mt-0.5 shrink-0 text-slate-300" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700">{s.heading}{s.cpConcept && <Chip className="bg-ai-50 text-ai-700 ring-ai-500/20">CP</Chip>}</div>
                {/* R107 — real drafted clause body (composed from precedent text), not just a heading */}
                {s.body ? <div className="mt-0.5 rounded bg-slate-50 px-2 py-1 font-serif text-[11.5px] leading-snug text-slate-600">{s.body}</div> : <div className="text-[11.5px] text-slate-400">{s.summary}</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon={<FileText size={13} />} onClick={() => {
            const html = exportTemplateHtml(template)
            const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
            const a = document.createElement('a'); a.href = url; a.download = `${template.name.replace(/[^a-z0-9]+/gi, '-')}.html`; a.click(); URL.revokeObjectURL(url)
          }}>Export (.html)</Button>
          {pb ? <Chip className="bg-brand-50 text-brand-700 ring-brand-500/20"><BookOpen size={11} /> Playbook: {pb.name}</Chip>
            : <Button size="sm" variant="ai" icon={<BookOpen size={13} />} onClick={() => buildPlaybook(template.id)}>Build a playbook from this template</Button>}
        </div>
      </Card>
    </div>
  )
}

export function ProjectsView() {
  const projects = useStore((s) => s.projects)
  const templates = useStore((s) => s.templates)
  const canvas = useStore((s) => s.canvas)
  const createProject = useStore((s) => s.createProject)
  const navigate = useStore((s) => s.navigate)

  const activeProject = projects.find((p) => p.id === canvas.projectId)
  const activeTemplate = templates.find((t) => t.id === canvas.templateId)

  return (
    <div className="flex h-full">
      {/* Left list */}
      <div className="flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h1 className="text-[15px] font-bold text-slate-800">Projects</h1>
          <button onClick={() => createProject('New form template', 'Build a new form agreement from precedent + market standards.', 'MSA')}
            title="New project" className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai-600 text-white hover:bg-ai-700"><Plus size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          <div className="px-2 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Building</div>
          {projects.map((p) => (
            <button key={p.id} onClick={() => navigate({ projectId: p.id, templateId: undefined })}
              className={clsx('flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left', canvas.projectId === p.id && !canvas.templateId ? 'bg-ai-50' : 'hover:bg-slate-50')}>
              <FolderKanban size={15} className="mt-0.5 shrink-0 text-ai-500" />
              <div className="min-w-0"><div className="truncate text-[12.5px] font-semibold text-slate-700">{p.name}</div><div className="text-[11px] text-slate-400">{p.agreement_type} · {p.status.replace('_', ' ')}</div></div>
            </button>
          ))}
          <div className="px-2 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Templates library</div>
          {templates.map((t) => (
            <button key={t.id} onClick={() => navigate({ templateId: t.id, projectId: undefined })}
              className={clsx('flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left', canvas.templateId === t.id ? 'bg-ai-50' : 'hover:bg-slate-50')}>
              <FileStack size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0"><div className="truncate text-[12.5px] font-semibold text-slate-700">{t.name}</div><div className="text-[11px] text-slate-400">{t.agreement_type} · {t.status.replace('_', ' ')}</div></div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="min-w-0 flex-1 overflow-y-auto p-6">
        {activeTemplate ? <TemplateDetail template={activeTemplate} />
          : activeProject ? <ProjectDetail project={activeProject} />
          : <Empty icon={<FolderKanban size={30} className="text-ai-400" />} title="Build a new form template" sub="Point the agent at precedent agreements + market standards and it generates a new template — your Claude Projects flow, made enterprise. Pick a project or start a new one." />}
      </div>
    </div>
  )
}
