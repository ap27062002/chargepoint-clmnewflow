// R89 — scale simulator. Generates N synthetic contract rows (deterministic) so the
// list can demonstrate that the UX/perf holds at portfolio scale (paginated/windowed render,
// memoized filter/sort), rather than only ever showing a handful of seed rows.
import type { ContractRow } from '@/lib/contracts'
import type { AgreementStatus, AgreementType, BallInCourt } from '@/types'

const CPS = ['Aptiv', 'TE Connectivity', 'Bosch', 'Delphi', 'Continental', 'Panasonic', 'Siemens', 'Rivian', 'Lucid', 'Magna', 'Denso', 'Valeo', 'Hyundai', 'LG Energy', 'Samsung SDI', 'Northvolt', 'Sila', 'QuantumScape', 'Wolfspeed', 'onsemi']
const TYPES: AgreementType[] = ['MNDA', 'NDA', 'MSA', 'DPA', 'SOW', 'Reseller']
const STAGES: AgreementStatus[] = ['draft', 'internal_review', 'sent_to_counterparty', 'redline_received', 'negotiation', 'pending_execution', 'executed']
const STAGE_TOTAL = 7

// Deterministic synthetic rows (index-seeded — no Math.random, so it's stable across renders).
export function syntheticContractRows(n: number): ContractRow[] {
  const out: ContractRow[] = []
  for (let i = 0; i < n; i++) {
    const cp = CPS[i % CPS.length]
    const type = TYPES[i % TYPES.length]
    const stageIdx = i % STAGE_TOTAL
    const stage = STAGES[stageIdx]
    const executed = stage === 'executed'
    const days = executed ? 0 : (i * 7) % 21
    out.push({
      agreementId: `AGR-SIM-${i}`,
      ticketId: `TKT-SIM-${i}`,
      name: `${cp} ${type} — ${2024 + (i % 3)}`,
      type,
      counterparty: `${cp} ${['Inc.', 'PLC', 'GmbH', 'Ltd.'][i % 4]}`,
      stage,
      stageIdx,
      stageTotal: STAGE_TOTAL,
      ball: (i % 2 === 0 ? 'cp_legal' : 'counterparty') as BallInCourt,
      daysWaiting: days,
      turns: i % 5,
      attorneyId: null,
      agreementDate: `2026-0${(i % 6) + 1}-${((i % 27) + 1).toString().padStart(2, '0')}`,
      executed,
      value: type === 'MSA' || type === 'SOW' ? (i % 20) * 50000 : 0,
      slaState: days >= 12 ? 'breach' : days >= 7 ? 'warning' : 'ok',
    })
  }
  return out
}
