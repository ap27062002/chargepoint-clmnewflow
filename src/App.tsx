import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { ChatPanel } from '@/components/ChatPanel'
import { Canvas } from '@/components/Canvas'
import { CommandMenu } from '@/components/CommandMenu'
import { LeftRail } from '@/components/LeftRail'
import { EntryLanding } from '@/components/EntryLanding'
import { useStore } from '@/store'

function Toast() {
  const toast = useStore((s) => s.toast)
  const setToast = useStore((s) => s.setToast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast, setToast])
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fade-in">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-medium text-white shadow-pop">
        <CheckCircle2 size={16} className="text-brand-400" />
        {toast}
        <button onClick={() => setToast(null)} className="ml-1 text-slate-400 hover:text-white"><X size={14} /></button>
      </div>
    </div>
  )
}

export default function App() {
  const open = useStore((s) => s.canvas.open)
  const solo = useStore((s) => s.canvas.solo)
  const entered = useStore((s) => s.entered)
  const runSlaCheck = useStore((s) => s.runSlaCheck)
  useEffect(() => { runSlaCheck() }, [runSlaCheck])
  if (!entered) return <EntryLanding />
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <TopBar />
      <main className="flex min-h-0 flex-1">
        <LeftRail />
        {open ? (
          solo ? (
            // Full-width canvas — agent collapsed (one click away via the rail).
            <section className="min-w-0 flex-1 animate-slide-in-right">
              <Canvas />
            </section>
          ) : (
            <>
              <aside className="w-[40%] min-w-[440px] max-w-[600px] shrink-0 border-r border-slate-200 bg-white animate-dock-in">
                <ChatPanel variant="docked" />
              </aside>
              <section className="min-w-0 flex-1 animate-slide-in-right">
                <Canvas />
              </section>
            </>
          )
        ) : (
          <ChatPanel variant="hero" />
        )}
      </main>
      <Toast />
      <CommandMenu />
    </div>
  )
}
