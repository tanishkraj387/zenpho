import type { HTMLAttributes, ReactNode } from 'react'

type PixelCardProps = HTMLAttributes<HTMLElement> & {
  bodyClassName?: string
  children: ReactNode
  title?: string
}

export function PixelCard({
  bodyClassName = 'p-4',
  children,
  className = '',
  title,
  ...props
}: PixelCardProps) {
  return (
    <section
      className={['pixel-panel bg-cream text-ink', className].join(' ')}
      {...props}
    >
      {title ? (
        <div className="border-b-4 border-ink bg-ink px-4 py-3 font-heading text-xs uppercase leading-relaxed text-cream">
          {title}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
