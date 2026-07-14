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
  | 'playbook_suggest' // suggest a clause be added to the playbook
  | 'playbook_presentation' // R54 — control the look & feel (layout/nest/render/publish), ADMIN ONLY
  | 'templates'      // template "Projects" workspace
  | 'reports'        // analytics & reports — every role (legal, business stakeholders, auditors)

export const ROLE_LABEL: Record<Role, string> = {
  initiator: 'Initiator',
  attorney: 'Assigned Attorney',
  contributor: 'Contributor',
  playbook_owner: 'Playbook Owner',
  administrator: 'Administrator',
}

const ACCESS: Record<Role, Capability[]> = {
  initiator:      ['queue', 'notifications', 'intake', 'review', 'pipeline', 'reports'],
  attorney:       ['queue', 'notifications', 'intake', 'review', 'disposition', 'comment', 'pipeline', 'playbook_view', 'audit', 'deal_summary', 'templates', 'playbook_suggest', 'reports'],
  contributor:    ['queue', 'notifications', 'review', 'comment', 'pipeline', 'reports'],
  playbook_owner: ['queue', 'notifications', 'playbook_view', 'playbook_edit', 'pipeline', 'audit', 'deal_summary', 'review', 'templates', 'playbook_suggest', 'reports'],
  administrator:  ['queue', 'notifications', 'admin', 'pipeline', 'audit', 'playbook_view', 'playbook_edit', 'playbook_presentation', 'deal_summary', 'templates', 'reports'],
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
  contracts: 'pipeline',
  projects: 'templates',
  reports: 'reports',
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
  playbook_suggest: 'suggesting playbook additions', templates: 'the Templates workspace',
  playbook_presentation: 'the playbook look & feel (admin only)',
  reports: 'analytics & reports',
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
        { label: 'Create a ticket', sub: 'Negotiation or general legal support', prompt: 'create a ticket' },
        { label: 'Track my requests', sub: 'Status of my tickets', prompt: "what's on my plate?" },
        { label: 'View reports', sub: 'Cycle time & matter status', prompt: 'open the reports' },
      ]
    case 'contributor':
      return [
        { label: "What I'm tagged on", sub: 'Provisions needing my input', prompt: "what's on my plate?" },
        { label: 'Open comments report', sub: 'Every unresolved comment on my matters', prompt: 'open comments report' },
        { label: 'View reports', sub: 'Cycle time & matter status', prompt: 'open the reports' },
      ]
    case 'playbook_owner':
      return [
        { label: 'Review playbook suggestions', sub: 'Attorney-proposed additions', prompt: 'review playbook suggestions' },
        { label: 'Open the NDA playbook', sub: '10 provisions · v3', prompt: 'show me the NDA playbook' },
        { label: 'Create a new playbook', sub: 'From a template + examples', prompt: 'create a new playbook' },
        { label: 'Build a new template', sub: 'From precedent + standards', prompt: 'create a new template project' },
        { label: 'Open comments report', sub: 'Every unresolved comment across your matters', prompt: 'open comments report' },
        { label: 'View reports', sub: 'Throughput, SLA adherence & cycle time', prompt: 'open the reports' },
      ]
    case 'administrator':
      return [
        { label: 'Open the admin console', sub: 'Routing · SLAs · integrations', prompt: 'open the admin console' },
        { label: 'Review playbook suggestions', sub: 'Attorney-proposed additions', prompt: 'review playbook suggestions' },
        { label: 'Templates', sub: 'Baseline form agreements', prompt: 'open templates' },
        { label: 'Review the audit log', sub: 'Immutable event history', prompt: 'show me the audit log' },
        { label: 'Consolidated open comments', sub: 'Every unresolved comment, portfolio-wide', prompt: 'open comments report' },
        { label: 'Assign a ticket', sub: 'Lead attorney, co-counsel, or visibility', prompt: 'assign a ticket' },
        { label: 'View reports', sub: 'Throughput, SLA adherence & cycle time', prompt: 'open the reports' },
      ]
    case 'attorney':
    default:
      return [
        { label: 'Review the Vishay redline', sub: '8 issues · 1 red line', prompt: 'review the Vishay redline' },
        { label: "What's on my plate today?", sub: 'Tagged items & SLA queue', prompt: "what's on my plate?" },
        { label: 'Open comments report', sub: 'Every unresolved comment across your matters', prompt: 'open comments report' },
        { label: 'Create a ticket', sub: 'Negotiation or general legal support', prompt: 'create a ticket' },
        { label: 'Review 2 new changes in playbook', sub: '2 refinement updates to approve', prompt: 'show me the NDA playbook' },
        { label: 'View reports', sub: 'Who handled what, cycle time & SLA', prompt: 'open the reports' },
      ]
  }
}
