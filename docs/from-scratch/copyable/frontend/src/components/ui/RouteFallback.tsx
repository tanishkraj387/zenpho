import { useEffect } from 'react'
import { useGateReadiness } from './gateTransition'

export function RouteFallback() {
  const setReady = useGateReadiness()
  useEffect(() => {
    setReady(false)
    return () => setReady(true)
  }, [setReady])

  return (
    <main role="status" aria-live="polite" className="grid min-h-screen place-items-center bg-sky p-4 font-pixel text-ink">
      <div className="border-4 border-ink bg-cream p-5 shadow-[6px_6px_0_#1a1c2c]">
        <p className="font-heading text-[10px] leading-relaxed">Preparing your next adventure…</p>
        <div className="loading-gate__track" aria-hidden="true"><i /></div>
      </div>
    </main>
  )
}
