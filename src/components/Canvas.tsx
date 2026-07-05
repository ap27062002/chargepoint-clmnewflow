import { clsx } from 'clsx'
import { PanelLeftClose, ChevronLeft, Sparkles, Lock } from 'lucide-react'
import { useStore } from '@/store'
import { canView, VIEW_CAP, CAP_LABEL, ROLE_LABEL, ROLE_SCOPE } from '@/lib/access'
import { Dashboard } from '@/views/Dashboard'
import { TicketWorkspace } from '@/views/TicketWorkspace'
import { PlaybookView } from '@/views/PlaybookView'
import { AdminView } from '@/views/AdminView'
import { AuditView } from '@/views/AuditView'
import { NotificationsView } from '@/views/NotificationsView'
import { MyQueue } from '@/views/MyQueue'
import { DealSummary } from '@/views/DealSummary'
import { IntakeFlow } from '@/views/IntakeFlow'
import { ExecutionView } from '@/views/ExecutionView'
import { DealExecutionView } from '@/views/DealExecutionView'
import { Repository } from '@/views/Repository'
import { ContractsList } from '@/views/ContractsList'
import { ProjectsView } from '@/views/ProjectsView'

function useBreadcrumb(): string {
  const canvas = useStore((s) => s.canvas)
  const tickets = useStore((s) => s.tickets)
  const playbooks = useStore((s) => s.playbooks)
  const labels: Record<string, string> = {
    dashboard: 'Leadership overview', admin: 'Admin console',
    audit: 'Audit center', notifications: 'Notification center', queue: 'My queue',
    deal_summary: 'Deal summary', intake: 'NDA drafting brief',
    repository: 'Archive', contracts: 'All contracts', projects: 'Templates',
  }
  if (canvas.view === 'ticket' || canvas.view === 'agreement') return 'Dashboard'
  if (canvas.view === 'playbook') {
    if (canvas.playbookMode === 'library') return 'Playbooks'
    const pb = playbooks.find((p) => p.id === (canvas.playbookId ?? playbooks[0].id)) ?? playbooks[0]
    const suffix = canvas.playbookMode === 'create' ? ' · Create' : canvas.playbookMode === 'suggestions' ? ' · Suggested additions' : ''
    return pb.name + suffix
  }
  if (canvas.view === 'execution') {
    const t = tickets.find((x) => x.id === canvas.executionTicketId)
    return t ? `Execute — ${t.title}` : 'Execution & e-signature'
  }
  return labels[canvas.view] ?? 'Workspace'
}

function AccessDenied({ view }: { view: ReturnType<typeof useStore.getState>['canvas']['view'] }) {
  const role = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!.role)
  const closeCanvas = useStore((s) => s.closeCanvas)
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Lock size={26} /></div>
        <h3 className="text-[15px] font-bold text-slate-800">You don't have access to {CAP_LABEL[VIEW_CAP[view]]}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
          You're signed in as <span className="font-semibold">{ROLE_LABEL[role]}</span>, so you can {ROLE_SCOPE[role]}.
          This section is restricted to a different role. Switch persona from the top-right to demo it.
        </p>
        <button onClick={closeCanvas} className="mt-4 rounded-lg bg-ai-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-ai-700">Back to the agent</button>
      </div>
    </div>
  )
}

export function Canvas() {
  const view = useStore((s) => s.canvas.view)
  const execTicketId = useStore((s) => s.canvas.executionTicketId)
  const role = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!.role)
  const closeCanvas = useStore((s) => s.closeCanvas)
  const openCanvas = useStore((s) => s.openCanvas)
  const crumb = useBreadcrumb()
  const allowed = canView(role, view)
  const goToDashboard = () => openCanvas({ view: 'dashboard' })

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 bg-white/70 px-3 backdrop-blur">
        <div className="flex items-center gap-2 text-[12px] text-slate-400">
          {view !== 'dashboard' && (
            <button onClick={goToDashboard} title="Back to Dashboard" className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700">
              <ChevronLeft size={14} /> Back
            </button>
          )}
          <Sparkles size={13} className="text-ai-500" />
          <span className="font-medium text-slate-500">Workspace</span>
          <span className="text-slate-300">/</span>
          {view === 'ticket' || view === 'agreement'
            ? <button onClick={goToDashboard} className="font-semibold text-slate-700 hover:text-brand-600 hover:underline">{crumb}</button>
            : <span className="font-semibold text-slate-700">{crumb}</span>}
        </div>
        <button onClick={closeCanvas} title="Collapse to full-screen agent"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
          <PanelLeftClose size={14} /> Collapse
        </button>
      </div>
      <div className={clsx('min-h-0 flex-1 overflow-hidden')}>
        {!allowed ? <AccessDenied view={view} /> : (
          <>
            {view === 'dashboard' && <Dashboard />}
            {(view === 'ticket' || view === 'agreement') && <TicketWorkspace />}
            {view === 'playbook' && <PlaybookView />}
            {view === 'admin' && <AdminView />}
            {view === 'audit' && <AuditView />}
            {view === 'notifications' && <NotificationsView />}
            {view === 'queue' && <MyQueue />}
            {view === 'deal_summary' && <DealSummary />}
            {view === 'intake' && <IntakeFlow />}
            {view === 'execution' && (execTicketId ? <DealExecutionView /> : <ExecutionView />)}
            {view === 'repository' && <Repository />}
            {view === 'contracts' && <ContractsList />}
            {view === 'projects' && <ProjectsView />}
          </>
        )}
      </div>
    </div>
  )
}
