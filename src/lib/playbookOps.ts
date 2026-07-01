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

export type OpKind = 'retier' | 'add' | 'remove' | 'nest' | 'group' | 'flatten' | 'reorder' | 'render' | 'unknown'
export interface OpResult { ok: boolean; message: string; op: OpKind; presentation: boolean; playbook?: Playbook }

// Presentation ops = look & feel (admin-only per R54). Content ops = owner-allowed.
const PRESENTATION_OPS: OpKind[] = ['group', 'flatten', 'nest', 'reorder', 'render']

function removeFromTree(provisions: Provision[], target: Provision): Provision[] {
  return provisions.filter((p) => p !== target).map((p) => (p.children ? { ...p, children: removeFromTree(p.children, target) } : p))
}

export function classifyInstruction(instr: string): OpKind {
  const t = lc(instr)
  if (/\b(nest|reparent|group .* under|move .* under|put .* under)\b/.test(t)) return 'nest'
  if (/\b(group|by category|by risk|categor)\b/.test(t)) return 'group'
  if (/\b(flatten|ungroup|flat list|by section|simple list)\b/.test(t)) return 'flatten'
  if (/\b(re-?tier|make .* (a |an )?(baseline|fallback|red ?line|deferred)|promote .* to|demote)\b/.test(t)) return 'retier'
  if (/\b(remove|delete|drop)\b/.test(t)) return 'remove'
  if (/\b(add|include)\b/.test(t)) return 'add'
  if (/\b(reorder|move .* (first|last|before|after)|put .* first)\b/.test(t)) return 'reorder'
  if (/\b(render|reformat|format .* as|counterparty-facing|training|audience)\b/.test(t)) return 'render'
  return 'unknown'
}

// The single entry point: transform `pb` per `instr`. Pure — returns a new playbook.
export function applyPlaybookInstruction(pb: Playbook, instr: string, canPresentation: boolean): OpResult {
  const op = classifyInstruction(instr)
  const t = lc(instr)
  if (PRESENTATION_OPS.includes(op) && !canPresentation) {
    return { ok: false, op, presentation: true, message: 'Look & feel changes (nesting, grouping, reordering, re-rendering) are administrator-only. You can still edit provision content (add / remove / re-tier).' }
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

  if (op === 'render') return { ok: true, op, presentation: true, message: 'You can publish the playbook for a specific audience (attorney cheat-sheet, counterparty-facing summary, training guide, or machine-readable) from the Publish menu — that renders the same tree for that purpose.', playbook: pb }
  if (op === 'reorder') return { ok: true, op, presentation: true, message: 'Reordering by priority — tell me which provisions to move first (e.g. "put Residuals and Term first") and I\'ll reorder them.', playbook: pb }

  return { ok: false, op: 'unknown', presentation: false, message: 'I can add, remove, re-tier, nest, group, flatten, or reorder provisions — just tell me what you want (e.g. "make Governing Law a fallback", "nest Marking and Return under Confidentiality Mechanics", "group by category").' }
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
