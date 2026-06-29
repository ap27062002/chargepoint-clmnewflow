import type { Role, ViewKey } from '@/types'

// Capabilities a role may hold. Grounded in the spec's role permissions.
export type Capability =
  | 'queue'          // my queue / what's tagged to me  (everyone)
  | 'notifications'  // notification center             (everyone)
  | 'pipeline'       // dashboard / all matters
  | 'review'         // open & read agreement workspaces
  | 'disposition'    // decide deviations, edit docs, approve external delivery
  | 'intake'         // create tickets / draft new agreements
  | 'playbook_view'  // view playbooks
  | 'playbook_edit'  // create/approve playbook changes + refinement
  | 'admin'          // admin console (routing/SLA/approvals/users/integrations)
  | 'audit'          // audit center
  | 'deal_summary'   // executed deal summaries / analytics
  | 'comment'        // comment on provisions

export const ROLE_LABEL: Record<Role, string> = {
  initiator: 'Initiator',
  attorney: 'Assigned Attorney',
  contributor: 'Contributor',
  playbook_owner: 'Playbook Owner',
  administrator: 'Administrator',
}

const ACCESS: Record<Role, Capability[]> = {
  initiator:      ['queue', 'notifications', 'intake', 'review', 'pipeline'],
  attorney:       ['queue', 'notifications', 'intake', 'review', 'disposition', 'comment', 'pipeline', 'playbook_view', 'audit', 'deal_summary'],
  contributor:    ['queue', 'notifications', 'review', 'comment'],
  playbook_owner: ['queue', 'notifications', 'playbook_view', 'playbook_edit', 'pipeline', 'audit', 'deal_summary', 'review'],
  administrator:  ['queue', 'notifications', 'admin', 'pipeline', 'audit'],
}

export function can(role: Role, cap: Capability): boolean {
  return ACCESS[role].includes(cap)
}

// Which capability a canvas view requires.
export const VIEW_CAP: Record<ViewKey, Capability> = {
  dashboard: 'pipeline',
  ticket: 'review',
  agreement: 'review',
  playbook: 'playbook_view',
  admin: 'admin',
  audit: 'audit',
  notifications: 'notifications',
  queue: 'queue',
  deal_summary: 'deal_summary',
  intake: 'intake',
  execution: 'disposition',
  repository: 'review',
}

export function canView(role: Role, view: ViewKey): boolean {
  return can(role, VIEW_CAP[view])
}

// Human label for a capability, used in "you don't have access" messages.
export const CAP_LABEL: Record<Capability, string> = {
  queue: 'your queue', notifications: 'notifications', pipeline: 'the full contract pipeline',
  review: 'agreement review', disposition: 'deciding deviations or sending documents',
  intake: 'creating new agreements', playbook_view: 'the playbook', playbook_edit: 'editing playbooks',
  admin: 'the admin console', audit: 'the audit center', deal_summary: 'deal summaries & analytics',
  comment: 'commenting',
}

// One-line summary of what each role CAN do — shown when access is denied.
export const ROLE_SCOPE: Record<Role, string> = {
  initiator: 'submit new contract requests and track the status of your own tickets',
  attorney: 'review and negotiate your assigned agreements, set dispositions, and approve external delivery',
  contributor: 'view documents you’re tagged on (read-only) and comment on provisions',
  playbook_owner: 'manage playbooks, approve refinement recommendations, and review analytics',
  administrator: 'configure routing, SLAs, approvals, users and integrations, and review the audit log',
}

export interface Starter { label: string; sub: string; prompt: string }

// Role-appropriate conversation starters (already access-filtered by construction).
export function startersFor(role: Role): Starter[] {
  switch (role) {
    case 'initiator':
      return [
        { label: 'Submit a new contract request', sub: 'Create a ticket', prompt: 'create a new NDA' },
        { label: 'Track my requests', sub: 'Status of my tickets', prompt: "what's on my plate?" },
      ]
    case 'contributor':
      return [
        { label: "What I'm tagged on", sub: 'Provisions needing my input', prompt: "what's on my plate?" },
        { label: 'Review the Vishay redline', sub: 'Read-only · comment', prompt: 'review the Vishay redline' },
      ]
    case 'playbook_owner':
      return [
        { label: 'Review 2 new changes in playbook', sub: '2 refinement updates to approve', prompt: 'show me the NDA playbook' },
        { label: 'Refinement recommendations', sub: 'Weekly analysis to approve', prompt: 'what is the refinement loop recommending?' },
        { label: 'Summarize the Mondelez deal', sub: 'Executed · analytics', prompt: 'summarize the Mondelez deal' },
        { label: "What's on my plate?", sub: 'My queue', prompt: "what's on my plate?" },
      ]
    case 'administrator':
      return [
        { label: 'Open the admin console', sub: 'Routing · SLAs · integrations', prompt: 'open the admin console' },
        { label: 'Review the audit log', sub: 'Immutable event history', prompt: 'show me the audit log' },
        { label: 'Pipeline overview', sub: 'All active matters', prompt: 'show me the dashboard' },
        { label: "What's on my plate?", sub: 'My queue', prompt: "what's on my plate?" },
      ]
    case 'attorney':
    default:
      return [
        { label: 'Review the Vishay redline', sub: '9 deviations · 2 red lines', prompt: 'review the Vishay redline' },
        { label: "What's on my plate today?", sub: 'Tagged items & SLA queue', prompt: "what's on my plate?" },
        { label: 'Draft a new NDA', sub: 'CP paper · from template', prompt: 'create a new NDA' },
        { label: 'Review 2 new changes in playbook', sub: '2 refinement updates to approve', prompt: 'show me the NDA playbook' },
      ]
  }
}
