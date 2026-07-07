// Materialize a real, editable DocModel for a brand-new draft — either from a template's
// clause bodies (Start Drafting flow) or as a minimal placeholder for an uploaded document
// (we can't read real file contents in this demo, matching how Upload New Version behaves).
import type { DocModel, DocClause } from '@/data/documents'
import type { AgreementTemplate } from '@/types'
import { generateSectionBodies } from '@/lib/templateGen'

export function materializeDraftDoc(versionId: string, agreementTitle: string, template: AgreementTemplate): DocModel {
  const sections = generateSectionBodies(template.sections)
  const clauses: DocClause[] = sections.map((s, i) => ({
    id: `dc-${versionId}-${i}`,
    ref: `§${i + 1}`,
    heading: s.heading,
    runs: [{ text: s.body ?? s.summary, type: 'normal' }],
    level: 1,
  }))
  return {
    versionId,
    title: agreementTitle.toUpperCase(),
    subtitle: `ChargePoint working draft (v1) — from ${template.name} · not yet sent`,
    clauses,
    toc: clauses.map((c) => ({ label: c.heading, clauseId: c.id })),
  }
}

export function placeholderUploadDoc(versionId: string, agreementTitle: string, fileName: string): DocModel {
  return {
    versionId,
    title: agreementTitle.toUpperCase(),
    subtitle: `ChargePoint working draft (v1) — uploaded as "${fileName}"`,
    clauses: [
      { id: `dc-${versionId}-0`, ref: '§1', heading: '1. Uploaded Document', runs: [{ text: `This draft was uploaded as "${fileName}". Its content isn't extracted in this demo — open it, then use Edit directly or Ask Claude to draft the body.`, type: 'normal' }], level: 1 },
    ],
  }
}
