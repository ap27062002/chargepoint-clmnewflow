import type { ChatMessage, ChatAction, User } from '@/types'
import { startersFor, ROLE_LABEL } from '@/lib/access'

const BODIES: Record<User['role'], string> = {
  attorney: `Good morning, {first}. Three things need you today:\n\n1. **Vishay NDA** — redline analyzed: **1 red line**, 4 negotiables, and a residuals clause **deferred to the business owner** (excluded from AI review).\n2. **Airbus NDA** — at **80% of SLA**, 3 open red lines.\n3. **Daniel Vohrer** hasn't responded yet on the §3(e) data-controller tag.\n\nWhat would you like to start with?`,
  initiator: `Hi {first}. As an **Initiator**, you can submit new contract requests and track the status of your own tickets — I'll route them to the right attorney and keep you posted.\n\nYou have requests in progress with Legal. Want to start a new one or check on an existing request?`,
  contributor: `Hi {first}. As a **Contributor**, you have **read-only** access to the documents you're tagged on, and you can comment on provisions.\n\nYou've been asked to weigh in — want to see what's tagged to you?`,
  playbook_owner: `Good morning, {first}. As **Playbook Owner**, you steward the **NDA playbook (v3)**.\n\n**3 refinement recommendations** from this week's analysis are awaiting your approval (add a 3yr/3yr fallback, promote *residuals* to a red line, maintain marking). Want to review them?`,
  administrator: `Hi {first}. As **Administrator**, you own platform configuration and oversight — routing, SLAs, approvals, notifications, users, integrations, and the immutable audit log.\n\nWhat would you like to configure?`,
}

export function greetingFor(user: User): ChatMessage {
  const first = user.name.split(' ')[0]
  const text = (BODIES[user.role] ?? BODIES.attorney).replace(/\{first\}/g, first)
  const starters = startersFor(user.role)
  const actions: ChatAction[] = starters.slice(0, 3).map((s, i) => ({
    label: s.label, prompt: s.prompt, variant: i === 0 ? 'primary' : 'ghost',
  }))
  return {
    id: 'greeting',
    role: 'agent',
    aiGenerated: true,
    ts: '2026-06-27T10:08:00.000Z',
    text,
    artifact: { kind: 'none' },
    actions,
  }
}

// Default (Assigned Attorney persona) — used as the store's initial seed.
import { users, CURRENT_USER_ID } from '@/data/seed'
export const GREETING: ChatMessage = greetingFor(users.find((u) => u.id === CURRENT_USER_ID) ?? users[0])
export { ROLE_LABEL }
