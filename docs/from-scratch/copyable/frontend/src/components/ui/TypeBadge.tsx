export type TopicType = 'Arrays' | 'Strings' | 'Graphs' | 'Trees' | 'DP' | 'Math'

type TypeBadgeProps = {
  type: TopicType
}

const badgeClasses: Record<TopicType, string> = {
  Arrays: 'bg-grass text-cream',
  Strings: 'bg-sky text-ink',
  Graphs: 'bg-danger text-cream',
  Trees: 'bg-[#7f5539] text-cream',
  DP: 'bg-warning text-ink',
  Math: 'bg-[#8b5cf6] text-cream',
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span
      className={`inline-block border-4 border-ink px-3 py-1 font-heading text-[10px] uppercase ${badgeClasses[type]}`}
    >
      {type}
    </span>
  )
}
