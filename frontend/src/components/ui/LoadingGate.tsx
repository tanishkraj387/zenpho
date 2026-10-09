import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type LoadingGateProps = {
  children: ReactNode
}

export function LoadingGate({ children }: LoadingGateProps) {
  const [phase, setPhase] = useState<'loading' | 'aligned' | 'unlocking' | 'opening' | 'complete'>(
    'loading',
  )
  const [isAppReady, setIsAppReady] = useState(false)
  const [isBallAligned, setIsBallAligned] = useState(false)
  const [isReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (isReducedMotion) {
      setPhase('complete')
      return
    }

    let isMounted = true
    const fontsReady = document.fonts?.ready ?? Promise.resolve()

    fontsReady.finally(() => {
      if (isMounted) {
        setIsAppReady(true)
      }
    })

    return () => {
      isMounted = false
    }
  }, [isReducedMotion])

  useEffect(() => {
    if (phase === 'loading' && isAppReady && isBallAligned) {
      setPhase('aligned')
    }
  }, [isAppReady, isBallAligned, phase])

  useEffect(() => {
    if (phase !== 'aligned') {
      return
    }

    const unlockTimer = window.setTimeout(() => setPhase('unlocking'), 260)

    return () => window.clearTimeout(unlockTimer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'unlocking') {
      return
    }

    const openTimer = window.setTimeout(() => setPhase('opening'), 620)

    return () => window.clearTimeout(openTimer)
  }, [phase])

  function handleBallAnimationEnd() {
    setIsBallAligned(true)
  }

  function handleDoorTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (
      phase === 'opening' &&
      event.currentTarget === event.target &&
      event.propertyName === 'transform'
    ) {
      setPhase('complete')
    }
  }

  return (
    <>
      {children}
      {phase !== 'complete' ? (
        <div
          aria-label="Loading Zenpho"
          aria-live="polite"
          className={`loading-gate is-${phase}`}
          role="status"
        >
          <div className="loading-gate__reveal" aria-hidden="true" />
          <div
            className="loading-gate__door loading-gate__door--left"
            aria-hidden="true"
            onTransitionEnd={handleDoorTransitionEnd}
          />
          <div className="loading-gate__door loading-gate__door--right" aria-hidden="true" />
          <div
            className="loading-gate__ball"
            aria-hidden="true"
            onAnimationEnd={handleBallAnimationEnd}
          >
            <div className="loading-gate__half loading-gate__half--top" />
            <div className="loading-gate__band" />
            <div className="loading-gate__half loading-gate__half--bottom" />
            <div className="loading-gate__button" />
          </div>
        </div>
      ) : null}
    </>
  )
}
