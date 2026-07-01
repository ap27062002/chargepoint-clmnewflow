// ============================================================================
// Playbook restructure/edit engine (Eric R52/R57/R58/R60) — chat instructions
// perform REAL, input-dependent transforms on the live published playbook tree,
// persisted to the store. Re-tier moves text between tiers; nest creates a parent
// and reparents children; group toggles the render layout; add/remove change the
// provision set. Deterministic. R54: layout/presentation ops are admin-only.
// ============================================================================
import type { Playbook, Provision, ProvisionTier } from '@/types'

const lc = (s: string) => s.toLowerCase()
const norm = (s: string) => lc(s).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

// Fuzzy-find a provision by name at any depth; returns a path so we can mutate in place.
export function fuzzyFindProvision(provisions: Provision[], query: string): Provision | undefined {
  const q = norm(query)
  if (!q) return undefined
  let best: { p: Provision; score: number } | undefined
  const walk = (ps: Provision[]) => ps.forEach((p) => {
    const name = norm(p.provision_name)
    let score = 0
    if (name === q) score = 100
    else if (name.includes(q) || q.includes(name)) score = 60
    else { const qt = q.split(' '); const nt = name.split(' '); score = qt.filter((t) => nt.includes(t)).length * 10 }
    if (score > 0 && (!best || score > best.score)) best = { p, score }
    if (p.children) walk(p.children)
  })
  walk(provisions)
  return best?.p
}

const TIERS: Record<string, ProvisionTier> = { baseline: 'baseline', fallback: 'fallback', 'red line': 'red_line', 'red-line': 'red_line', redline: 'red_line', deferred: 'deferred' }
function parseTier(t: string): ProvisionTier | undefined {
  for (const k of Object.keys(TIERS)) if (t.includes(k)) return TIERS[k]
  return undefined
}

export type OpKind = 'retier' | 'add' | 'remove' | 'nest' | 'group' | 'flatten' | 'reorder' | 'render' | 'theme' | 'unknown'
export interface OpResult { ok: boolean; message: string; op: OpKind; presentation: boolean; playbook?: Playbook }

// Only VISUAL BRANDING (theme/color) is admin-exclusive (R54). Structural restructure — nest, group,
// flatten, reorder, re-tier, render-for-audience — is available to the playbook OWNER (Eric), per R57/R58/R60.
const PRESENTATION_OPS: OpKind[] = ['theme']

function removeFromTree(provisions: Provision[], target: Provision): Provision[] {
  return provisions.filter((p) => p !== target).map((p) => (p.children ? { ...p, children: removeFromTree(p.children, target) } : p))
}

export function classifyInstruction(instr: string): OpKind {
  const t = lc(instr)
  if (/\b(theme|brand|accent|colou?r|logo|font|visual)\b/.test(t)) return 'theme'
  if (/\b(nest|reparent|group .* under|move .* under|put .* under)\b/.test(t)) return 'nest'
  if (/\b(reorder|move .* (first|last|before|after)|put .* first|order .* first)\b/.test(t)) return 'reorder'
  if (/\b(render|reformat|format .* as|counterparty-facing|counterparty facing|external|training|audience|cheat.?sheet)\b/.test(t)) return 'render'
  if (/\b(group|by category|by risk|categor)\b/.test(t)) return 'group'
  if (/\b(flatten|ungroup|flat list|by section|simple list)\b/.test(t)) return 'flatten'
  if (/\b(re-?tier|make .* (a |an )?(baseline|fallback|red ?line|deferred)|promote .* to|demote)\b/.test(t)) return 'retier'
  if (/\b(remove|delete|drop)\b/.test(t)) return 'remove'
  if (/\b(add|include)\b/.test(t)) return 'add'
  return 'unknown'
}

const ACCENTS: Record<string, string> = { blue: '#2563eb', green: '#1f8c3f', violet: '#7559e8', purple: '#7559e8', red: '#dc2626', amber: '#d97706', orange: '#d97706', slate: '#334155', teal: '#0d9488' }

// The single entry point: transform `pb` per `instr`. Pure — returns a new playbook.
export function applyPlaybookInstruction(pb: Playbook, instr: string, canPresentation: boolean): OpResult {
  const op = classifyInstruction(instr)
  const t = lc(instr)
  if (PRESENTATION_OPS.includes(op) && !canPresentation) {
    return { ok: false, op, presentation: true, message: 'Setting the visual theme / branding of the playbook is administrator-only. You can still restructure it (nest, group, reorder, re-render) and edit provisions (add / remove / re-tier).' }
  }

  if (op === 'retier') {
    const tier = parseTier(t); if (!tier) return { ok: false, op, presentation: false, message: 'Tell me the target tier (baseline / fallback / red line / deferred).' }
    // provision name = text between the verb and the tier word
    const nameGuess = t.replace(/.*\b(make|promote|demote|re-?tier)\b/, '').replace(/\b(to|a|an|the|as)\b/g, ' ').replace(/(baseline|fallback|red ?line|deferred|provision|clause)/g, '').trim()
    const prov = fuzzyFindProvision(pb.provisions, nameGuess)
    if (!prov) return { ok: false, op, presentation: false, message: `Couldn't find a provision matching "${nameGuess}".` }
    const oldTier = prov.tier
    const updated = retierProvision(pb.provisions, prov, tier)
    return { ok: true, op, presentation: false, message: `Re-tiered **${prov.provision_name}** from ${oldTier ?? 'baseline'} → ${tier.replace('_', ' ')}.`, playbook: { ...pb, provisions: updated } }
  }

  if (op === 'remove') {
    const nameGuess = t.replace(/.*\b(remove|delete|drop)\b (?:the )?/, '').replace(/ ?(provision|clause).*/, '').trim()
    const prov = fuzzyFindProvision(pb.provisions, nameGuess)
    if (!prov) return { ok: false, op, presentation: false, message: `Couldn't find a provision matching "${nameGuess}".` }
    return { ok: true, op, presentation: false, message: `Removed **${prov.provision_name}**.`, playbook: { ...pb, provisions: removeFromTree(pb.provisions, prov) } }
  }

  if (op === 'add') {
    const m = t.match(/\b(?:add|include)\b (?:a |an |the )?(.+)/)
    const raw = (m?.[1] ?? 'New Provision').replace(/\b(as )?(a |an )?(red[ -]?line|fallback|baseline|deferred|provision|clause)\b/g, '').replace(/\s+/g, ' ').trim()
    const name = (raw || 'New Provision').replace(/\b\w/g, (c) => c.toUpperCase())
    const tier = parseTier(t) ?? 'baseline'
    const nu: Provision = { id: 'pv_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), provision_name: name, standard_position: `Standard ChargePoint position on ${name}.`, fallback_tiers: tier === 'fallback' ? [`Approved fallback for ${name}.`] : [], red_line: tier === 'red_line' ? `Do not accept adverse ${name} terms.` : 'Deviations flagged for review.', rationale: 'Added via chat.', tier }
    return { ok: true, op, presentation: false, message: `Added a ${tier.replace('_', ' ')} provision **${name}**.`, playbook: { ...pb, provisions: [...pb.provisions, nu] } }
  }

  if (op === 'group') return { ok: true, op, presentation: true, message: 'Regrouped the playbook by cross-cutting category — related provisions now sit under category headers. Deviation detection is unchanged.', playbook: { ...pb, group_mode: 'category' } }
  if (op === 'flatten') return { ok: true, op, presentation: true, message: 'Flattened to a single ordered section list.', playbook: { ...pb, group_mode: 'sections' } }

  if (op === 'nest') {
    // "nest A, B, C under [a new] Parent" — create the parent, move the named children under it.
    const um = t.match(/under (?:a new |the )?([a-z0-9 &/]+)$/)
    const parentName = (um?.[1] ?? 'Group').replace(/(provision|parent)/g, '').trim().replace(/\b\w/g, (c) => c.toUpperCase())
    const listPart = t.replace(/^.*\b(nest|group|move|put)\b/, '').replace(/under .*/, '').replace(/\b(and|the|provisions?)\b/g, ',')
    const childNames = listPart.split(',').map((s) => s.trim()).filter((s) => s.length > 2)
    const children = childNames.map((n) => fuzzyFindProvision(pb.provisions, n)).filter((p): p is Provision => !!p)
    if (children.length < 2) return { ok: false, op, presentation: true, message: `I need at least two named provisions to nest under "${parentName}". Try: "nest Marking, Exclusions and Return under Confidentiality Mechanics".` }
    let tree = pb.provisions
    children.forEach((c) => { tree = removeFromTree(tree, c) })
    const parent: Provision = { id: 'pv_' + parentName.toLowerCase().replace(/[^a-z0-9]+/g, '_'), provision_name: parentName, standard_position: `Parent grouping for ${children.map((c) => c.provision_name).join(', ')}.`, fallback_tiers: [], red_line: 'See child provisions.', rationale: 'Created via chat restructuring.', tier: 'baseline', children: children.map((c) => ({ ...c, parent_id: 'pv_' + parentName.toLowerCase().replace(/[^a-z0-9]+/g, '_') })) }
    return { ok: true, op, presentation: true, message: `Nested ${children.length} provisions (${children.map((c) => c.provision_name).join(', ')}) under a new parent **${parentName}**.`, playbook: { ...pb, provisions: [...tree, parent] } }
  }

  if (op === 'render') {
    // R57/R60 — actually re-render the playbook for an audience (persisted, changes the display).
    const purpose: NonNullable<Playbook['render_purpose']> = /counterparty|external|summary/.test(t) ? 'external' : /training|new.?hire|onboard/.test(t) ? 'training' : 'standard'
    const label = purpose === 'external' ? 'a counterparty-facing summary (red-line internals hidden)' : purpose === 'training' ? 'a new-hire training view (rationale shown inline)' : 'the standard attorney view'
    return { ok: true, op, presentation: false, message: `Re-rendered the playbook as **${label}**. Same underlying positions — only the presentation changed.`, playbook: { ...pb, render_purpose: purpose } }
  }

  if (op === 'reorder') {
    // "put X and Y first" — move the named provisions to the front of the list.
    const namesPart = t.replace(/^.*\b(reorder|put|move|order)\b/, '').replace(/\b(first|to the top|before .*|after .*|and|the|provisions?)\b/g, ',')
    const names = namesPart.split(',').map((s) => s.trim()).filter((s) => s.length > 2)
    const targets = names.map((nm) => fuzzyFindProvision(pb.provisions, nm)).filter((p): p is Provision => !!p)
    if (!targets.length) return { ok: false, op, presentation: false, message: 'Tell me which provisions to move first, e.g. "put Residuals and Term first".' }
    const rest = pb.provisions.filter((p) => !targets.includes(p))
    return { ok: true, op, presentation: false, message: `Moved **${targets.map((p) => p.provision_name).join(', ')}** to the top.`, playbook: { ...pb, provisions: [...targets, ...rest] } }
  }

  if (op === 'theme') {
    const colour = Object.keys(ACCENTS).find((c) => t.includes(c))
    if (!colour) return { ok: false, op, presentation: true, message: 'Name a colour for the playbook accent (e.g. "set the theme to teal").' }
    return { ok: true, op, presentation: true, message: `Set the playbook accent colour to **${colour}** — the look & feel now reflects it.`, playbook: { ...pb, accent: ACCENTS[colour] } }
  }

  return { ok: false, op: 'unknown', presentation: false, message: 'I can add, remove, re-tier, nest, group, flatten, reorder, or re-render provisions (and admins can set the visual theme) — just tell me what you want (e.g. "make Governing Law a fallback", "nest Marking and Return under Confidentiality Mechanics", "render as a counterparty-facing summary", "put Residuals first").' }
}

function retierProvision(provisions: Provision[], target: Provision, tier: ProvisionTier): Provision[] {
  return provisions.map((p) => {
    if (p === target) {
      // move the standard text into/out of the fallback list so the change is real, not cosmetic
      if (tier === 'fallback' && p.tier !== 'fallback') return { ...p, tier, fallback_tiers: [p.standard_position, ...p.fallback_tiers].slice(0, 3) }
      if (tier === 'red_line') return { ...p, tier, red_line: p.red_line || `Do not accept deviations on ${p.provision_name}.` }
      return { ...p, tier }
    }
    return p.children ? { ...p, children: retierProvision(p.children, target, tier) } : p
  })
}
