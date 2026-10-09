import type { ButtonHTMLAttributes, ReactNode } from 'react'

type PixelButtonVariant = 'primary' | 'secondary' | 'danger'

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: PixelButtonVariant
}

const variantClasses: Record<PixelButtonVariant, string> = {
  primary: 'bg-grass text-cream',
  secondary: 'bg-cream text-ink',
  danger: 'bg-danger text-cream',
}

export function PixelButton({
  children,
  className = '',
  disabled,
  variant = 'primary',
  ...props
}: PixelButtonProps) {
  return (
    <button
      className={[
        'pixel-focus border-4 border-ink px-4 py-3 font-heading text-xs uppercase leading-relaxed shadow-[6px_6px_0_#1a1c2c] transition-transform',
        'active:translate-x-1 active:translate-y-1 active:shadow-none',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        variantClasses[variant],
        className,
      ].join(' ')}
      disabled={disabled}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}
