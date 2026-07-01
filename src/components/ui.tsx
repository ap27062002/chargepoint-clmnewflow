import { clsx } from 'clsx'
import type { ReactNode, CSSProperties } from 'react'
import { userById, AI_ENGINE } from '@/data/seed'

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', className)}>
      {children}
    </span>
  )
}

export function Card({ children, className, onClick, style }: { children: ReactNode; className?: string; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={clsx('rounded-xl border border-slate-200 bg-white shadow-card', onClick && 'cursor-pointer transition hover:border-slate-300 hover:shadow-panel', className)}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('text-[11px] font-bold uppercase tracking-wider text-slate-400', className)}>{children}</div>
}

export function Avatar({ userId, size = 28, ai }: { userId?: string; size?: number; ai?: boolean }) {
  const u = ai ? null : userById(userId || '')
  const color = ai ? AI_ENGINE.color : u?.color ?? '#64748b'
  const initials = ai ? AI_ENGINE.initials : u?.initials ?? '??'
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
      title={ai ? 'CLM Agent (AI)' : u?.name}
    >
      {initials}
    </span>
  )
}

export function Button({
  children, onClick, variant = 'primary', size = 'md', className, icon, disabled,
}: {
  children?: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'ai'
  size?: 'sm' | 'md'; className?: string; icon?: ReactNode; disabled?: boolean
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed'
  const sizes = { sm: 'text-xs px-2.5 py-1.5', md: 'text-[13px] px-3.5 py-2' }
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100',
    outline: 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ai: 'bg-ai-600 text-white hover:bg-ai-700 shadow-sm',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={clsx(base, sizes[size], variants[variant], className)}>
      {icon}{children}
    </button>
  )
}

export function AiTag({ className }: { className?: string }) {
  return (
    <Chip className={clsx('bg-ai-50 text-ai-700 ring-ai-600/20', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-ai-500" /> AI-generated
    </Chip>
  )
}

export function Empty({ icon, title, sub }: { icon?: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-400">
      {icon}
      <div className="text-sm font-semibold text-slate-500">{title}</div>
      {sub && <div className="max-w-xs text-xs">{sub}</div>}
    </div>
  )
}

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={clsx('mt-1 text-2xl font-bold', accent ?? 'text-slate-800')}>{value}</div>
    </Card>
  )
}

// KPI tile — like Stat but with an icon, a sub-line, and optional click-through (deep-link to a filtered list).
export function Kpi({ label, value, sub, icon, accent, onClick }: {
  label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: ReactNode; accent?: string; onClick?: () => void
}) {
  return (
    <Card className="p-4" onClick={onClick}>
      <div className="flex items-center justify-between">
        <SectionLabel>{label}</SectionLabel>
        {icon && <span className="text-slate-300">{icon}</span>}
      </div>
      <div className={clsx('mt-1 text-2xl font-bold', accent ?? 'text-slate-800')}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-medium text-slate-400">{sub}</div>}
    </Card>
  )
}

// Horizontal stacked proportion bar (e.g. ball-in-court aging fresh/aging/stalled).
export function StackBar({ segments }: { segments: { n: number; className: string; label?: string }[] }) {
  const total = segments.reduce((s, x) => s + x.n, 0) || 1
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
      {segments.map((s, i) => (s.n > 0 ? (
        <div key={i} className={s.className} style={{ width: `${(s.n / total) * 100}%` }} title={`${s.label}: ${s.n}`} />
      ) : null))}
    </div>
  )
}
