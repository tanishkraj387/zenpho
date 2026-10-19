export function BattleStatus({ side, name, level, hp, maxHp }: {
  side: 'player' | 'enemy'; name: string; level?: number; hp: number; maxHp: number
}) {
  const fraction = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)))
  return <div className={`pokerogue-status pokerogue-status--${side}`} aria-label={`${name}, ${hp} of ${maxHp} HP`}>
    <span className="pokerogue-status__name">{name}</span>
    {level !== undefined && <span className="pokerogue-status__level">Lv{level}</span>}
    <div className="pokerogue-status__hp" role="progressbar" aria-label={`${name} HP`} aria-valuenow={hp} aria-valuemin={0} aria-valuemax={maxHp}>
      <i style={{ width: `${fraction * 100}%`, backgroundColor: fraction > .5 ? '#70f8a8' : fraction > .2 ? '#f8d858' : '#f85858' }} />
    </div>
    {side === 'player' && <span className="pokerogue-status__value">{hp} / {maxHp}</span>}
  </div>
}
