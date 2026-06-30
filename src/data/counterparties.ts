import type { CounterpartyProfile } from '@/types'

// Mock "CRM + web lookup" so the agent can resolve a counterparty from a name or website,
// the way the CIO described ("give me the website and name — is this the company? → yes → address populates").
export const COUNTERPARTY_DB: CounterpartyProfile[] = [
  {
    legal_name: 'UnifyApps, Inc.', website: 'unifyapps.com', hq_city: 'Bengaluru', hq_country: 'India',
    address: 'Prestige Tech Park, Marathahalli–Sarjapur Outer Ring Rd, Bengaluru, Karnataka 560103, India',
    industry: 'Enterprise software / AI', region: 'India',
    crm_account: 'CRM-AC-7741', sf_opportunity: 'OPP-4471 · Unify CLM Platform', logoSeed: 'UA',
  },
  {
    legal_name: 'Google LLC', website: 'google.com', hq_city: 'Mountain View', hq_country: 'USA',
    address: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
    industry: 'Technology', region: 'North America',
    crm_account: 'CRM-AC-1001', sf_opportunity: 'OPP-2210 · Fleet charging pilot', logoSeed: 'GO',
  },
  {
    legal_name: 'Siemens AG', website: 'siemens.com', hq_city: 'Munich', hq_country: 'Germany',
    address: 'Werner-von-Siemens-Straße 1, 80333 Munich, Germany',
    industry: 'Industrial / energy', region: 'EMEA',
    crm_account: 'CRM-AC-3380', sf_opportunity: 'OPP-3902 · Depot electrification', logoSeed: 'SI',
  },
  {
    legal_name: 'Rivian Automotive, Inc.', website: 'rivian.com', hq_city: 'Irvine', hq_country: 'USA',
    address: '14600 Myford Road, Irvine, CA 92606, USA',
    industry: 'Automotive / EV', region: 'North America',
    crm_account: 'CRM-AC-2056', logoSeed: 'RV',
  },
  {
    legal_name: 'Panasonic Energy Co., Ltd.', website: 'panasonic.com', hq_city: 'Osaka', hq_country: 'Japan',
    address: '1006 Kadoma, Kadoma City, Osaka 571-8501, Japan',
    industry: 'Battery / electronics', region: 'APAC',
    crm_account: 'CRM-AC-6612', sf_opportunity: 'OPP-4120 · Cell supply NDA', logoSeed: 'PA',
  },
]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\b(inc|llc|ltd|corp|co|ag|gmbh|the|company)\b/g, ' ').trim()

// Resolve a counterparty from a free-text name or website. Returns ranked matches.
// Never dead-ends: if nothing matches, fabricates a plausible profile flagged "pending verification".
export function lookupCounterparty(query: string): CounterpartyProfile[] {
  const q = norm(query)
  if (!q) return []
  const hits = COUNTERPARTY_DB.filter((c) => {
    const name = norm(c.legal_name)
    const site = c.website.toLowerCase()
    return name.includes(q) || q.includes(name) || site.includes(q.replace(/ /g, '')) || q.includes(site.split('.')[0])
  })
  if (hits.length) return hits

  // Graceful fallback — synthesize a believable record from the query so the flow continues.
  const title = query.trim().replace(/\b\w/g, (c) => c.toUpperCase())
  const slug = norm(query).replace(/ /g, '')
  return [{
    legal_name: `${title}, Inc.`, website: `${slug || 'counterparty'}.com`,
    hq_city: '—', hq_country: '—',
    address: 'Address pending verification — confirm or paste the registered address',
    industry: 'Unknown — confirm', region: 'North America',
    logoSeed: (title.slice(0, 2) || 'CP').toUpperCase(),
  }]
}

export interface DealContext {
  jurisdiction: string
  governingLaw: string
  clausePosture: string
  purpose: string
  foreignNote?: string
}

// Infer the deal posture from the counterparty profile (jurisdiction, governing law, likely clauses).
export function inferDealContext(p: CounterpartyProfile): DealContext {
  const isUS = p.hq_country === 'USA'
  const tech = /software|ai|technolog/i.test(p.industry)
  const battery = /battery|electronic|energy|cell/i.test(p.industry)
  return {
    jurisdiction: p.region,
    governingLaw: 'Delaware',
    foreignNote: isUS ? undefined : `${p.hq_country}-based counterparty — apply the foreign-counterparty note; neutral-law (New York) fallback available if pushed.`,
    clausePosture: tech
      ? 'Technology counterparty — likely API & source/architecture exposure. Emphasize IP ownership and the residuals red line; mutual obligations.'
      : battery
        ? 'Hardware/supply counterparty — protect evaluation data and trade secrets; 5-yr CI survival, trade secrets indefinite.'
        : 'Standard mutual NDA posture; broad definition of Confidential Information, 2-yr term / 5-yr survival.',
    purpose: tech
      ? 'Evaluate a potential technology and platform relationship (integration / API access).'
      : 'Evaluate a potential business relationship.',
  }
}
