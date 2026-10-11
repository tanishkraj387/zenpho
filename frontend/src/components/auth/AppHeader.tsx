import { Link } from 'react-router-dom'
import { AudioToggle } from '../ui/AudioToggle'
import { PixelButton } from '../ui/PixelButton'
import { getUsername, useAuthStore } from '../../store/authStore'

type AppHeaderProps = {
  coins?: number
  onBag?: () => void
  onHint?: () => void
  showBattleActions?: boolean
}

export function AppHeader({ coins, onBag, onHint, showBattleActions = false }: AppHeaderProps) {
  const user = useAuthStore((state) => state.user)

  return (
    <header className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b-4 border-ink bg-cream px-2 py-2 sm:px-4">
      <Link className="pixel-focus shrink-0 font-heading text-[10px]" to="/hub">
        Back to Hub
      </Link>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <span className="hidden max-w-[140px] truncate font-heading text-[10px] sm:inline">
          {getUsername(user)}
        </span>
        {typeof coins === 'number' ? (
          <span className="shrink-0 font-heading text-[10px]">Coins {coins}</span>
        ) : null}
        <Link
          className="pixel-focus shrink-0 border-4 border-ink bg-cream px-2 py-1 font-heading text-[10px] shadow-[3px_3px_0_#1a1c2c] sm:px-3 sm:py-2"
          to="/profile"
        >
          Profile
        </Link>
        <AudioToggle />
        {showBattleActions ? (
          <>
            <PixelButton className="px-2 py-1 sm:px-3 sm:py-2" onClick={onBag} variant="secondary">
              Bag
            </PixelButton>
            <PixelButton className="px-2 py-1 sm:px-3 sm:py-2" disabled={!onHint} onClick={onHint} variant="secondary">
              Hint
            </PixelButton>
          </>
        ) : null}
      </div>
    </header>
  )
}
