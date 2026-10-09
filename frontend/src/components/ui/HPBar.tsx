type HPBarProps = {
  current: number
  max: number
  label: string
  level: number
}

function clampPercent(current: number, max: number) {
  if (max <= 0) {
    return 0
  }

  return Math.max(0, Math.min(100, (current / max) * 100))
}

function hpColor(percent: number) {
  if (percent > 50) {
    return 'bg-hp-green'
  }

  if (percent >= 20) {
    return 'bg-hp-yellow'
  }

  return 'bg-hp-red'
}

export function HPBar({ current, label, level, max }: HPBarProps) {
  const percent = clampPercent(current, max)

  return (
    <div aria-label={`${label} level ${level} HP ${current} of ${max}`} className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3 font-heading text-[10px] uppercase">
        <span>{label}</span>
        <span>Lv {level}</span>
      </div>
      <div className="border-4 border-ink bg-cream p-1">
        <div className="h-4 bg-ink">
          <div
            className={`h-full transition-[width] duration-700 ease-out ${hpColor(percent)}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className="mt-1 text-right font-heading text-[10px]">
        {current}/{max}
      </div>
    </div>
  )
}
