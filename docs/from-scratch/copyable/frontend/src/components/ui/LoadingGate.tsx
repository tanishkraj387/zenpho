import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAudioStore } from '../../lib/audio'
import { GateContext, GateLocationContext, GateReadinessContext, type GateTransition } from './gateTransition'

type GatePhase = 'loading' | 'closing' | 'aligned' | 'opening' | 'complete'
export function LoadingGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [phase, setPhase] = useState<GatePhase>('loading')
  const [title, setTitle] = useState('Welcome to Zenpho')
  const [routeReady, setRouteReady] = useState(true)
  const actionRef = useRef<(() => void) | null>(null)
  const busyRef = useRef(true)
  const latestLocation = useRef(location)
  useEffect(() => { latestLocation.current = location }, [location])
  const playSound = useAudioStore((state) => state.playSound)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const transition = useCallback<GateTransition>((action, label = 'Preparing your adventure') => {
    if (busyRef.current) return
    busyRef.current = true
    actionRef.current = action
    setTitle(label)
    setPhase('closing')
  }, [])

  useEffect(() => {
    if (location.key !== displayLocation.key && phase === 'complete') {
      transition(() => setDisplayLocation(latestLocation.current),
        location.pathname === '/battle' ? 'A new encounter awaits' : 'Preparing your next route')
    }
  }, [location, displayLocation.key, phase, transition])

  useEffect(() => {
    if (phase === 'complete' || (phase === 'aligned' && !routeReady)) return
    // Timed completion also handles interrupted CSS animations and background tabs.
    const duration = phase === 'aligned' && title === 'Question solved!'
      ? 1500
      : reducedMotion ? 80 : phase === 'loading' ? 900 : phase === 'closing' ? 480 : phase === 'aligned' ? 450 : 850
    const timer = window.setTimeout(() => {
      if (phase === 'loading' || phase === 'closing') {
        const action = actionRef.current
        actionRef.current = null
        action?.()
        setPhase('aligned')
      } else if (phase === 'aligned') {
        playSound('unlock')
        setPhase('opening')
      } else {
        busyRef.current = false
        setPhase('complete')
      }
    }, duration)
    return () => window.clearTimeout(timer)
  }, [phase, reducedMotion, playSound, routeReady, title])

  return (
    <GateContext.Provider value={transition}>
      <GateLocationContext.Provider value={displayLocation}>
        <GateReadinessContext.Provider value={setRouteReady}>
          <div inert={phase !== 'complete'}>{children}</div>
          {phase !== 'complete' && (
            <div className={`loading-gate is-${phase}`} role="status" aria-live="polite" aria-label={title}>
              <div className="loading-gate__reveal" aria-hidden="true" />
              <div className="loading-gate__door loading-gate__door--left" aria-hidden="true" />
              <div className="loading-gate__door loading-gate__door--right" aria-hidden="true" />
              <div className="loading-gate__ball" aria-hidden="true">
                <div className="loading-gate__half loading-gate__half--top" />
                <div className="loading-gate__band" />
                <div className="loading-gate__half loading-gate__half--bottom" />
                <div className="loading-gate__button" />
              </div>
              <div className="loading-gate__caption">
                <p>{title}</p>
                <span>{phase === 'opening' ? 'Ready to go!' : title === 'Question solved!' ? 'All checkpoints passed. Your encounter is ready.' : 'Getting everything ready for you...'}</span>
                <div className="loading-gate__track" aria-hidden="true"><i /></div>
              </div>
            </div>
          )}
        </GateReadinessContext.Provider>
      </GateLocationContext.Provider>
    </GateContext.Provider>
  )
}
