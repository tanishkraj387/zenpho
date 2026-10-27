import { useEffect, useMemo, useState } from 'react'

type DialogBoxProps = {
  className?: string
  text: string
  speed?: number
  onDone?: () => void
}

export function DialogBox({ className = '', onDone, speed = 35, text }: DialogBoxProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const isDone = visibleCount >= text.length
  const visibleText = useMemo(() => text.slice(0, visibleCount), [text, visibleCount])

  useEffect(() => {
    setVisibleCount(0)
  }, [text])

  useEffect(() => {
    if (isDone) {
      onDone?.()
      return
    }

    const timeout = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(count + 1, text.length))
    }, speed)

    return () => window.clearTimeout(timeout)
  }, [isDone, onDone, speed, text.length, visibleCount])

  function skip() {
    setVisibleCount(text.length)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      skip()
    }
  }

  return (
    <div
      aria-label="Dialog text"
      className={`pixel-focus pixel-panel min-h-32 cursor-pointer bg-cream p-4 font-heading text-xs leading-7 text-ink ${className}`}
      onClick={skip}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <p>{visibleText}</p>
      {isDone ? (
        <span aria-hidden="true" className="mt-3 block animate-pulse text-right">
          ▼
        </span>
      ) : null}
    </div>
  )
}
