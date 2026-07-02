// R85 — real team folders / categories a published playbook or template can land in,
// each with an access scope (so "put it in a folder accessible to the larger team / a
// category of NDAs" is a real destination, not a toast).
import type { TeamFolder } from '@/types'

export const TEAM_FOLDERS: TeamFolder[] = [
  { path: 'Legal › Playbooks › NDAs', category: 'NDA', access_roles: ['attorney', 'playbook_owner', 'administrator'] },
  { path: 'Legal › Playbooks › Commercial', category: 'MSA / Commercial', access_roles: ['attorney', 'playbook_owner', 'administrator'] },
  { path: 'Legal › Templates › Published', category: 'Templates', access_roles: ['attorney', 'playbook_owner', 'administrator', 'initiator'] },
  { path: 'Sales Enablement › Approved Forms', category: 'Sales-accessible', access_roles: ['attorney', 'playbook_owner', 'administrator', 'initiator', 'contributor'] },
]
