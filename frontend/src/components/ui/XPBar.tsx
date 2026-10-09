type XPBarProps = {
  current: number
  max: number
  label?: string
}

export function XPBar({ current, label = 'XP', max }: XPBarProps) {
  const percent = max <= 0 ? 0 : Math.max(0, Math.min(100, (current / max) * 100))

  return (
    <div aria-label={`${label} ${current} of ${max}`} className="w-full">
      <div className="mb-1 font-heading text-[10px] uppercase">{label}</div>
      <div className="border-4 border-ink bg-cream p-1">
        <div className="h-2 bg-ink">
          <div
            className="h-full bg-sky transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
