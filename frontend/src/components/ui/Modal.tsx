import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { PixelButton } from './PixelButton'
import { PixelCard } from './PixelCard'

type ModalProps = {
  children: ReactNode
  isOpen: boolean
  title: string
  onClose: () => void
}

const focusableSelector =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export function Modal({ children, isOpen, onClose, title }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>(focusableSelector)
    firstFocusable?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      )

      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6"
      role="dialog"
    >
      <div ref={modalRef} className="w-full max-w-lg">
        <PixelCard title={title}>
          <div className="space-y-4">
            {children}
            <PixelButton onClick={onClose} variant="secondary">
              Close
            </PixelButton>
          </div>
        </PixelCard>
      </div>
    </div>
  )
}
