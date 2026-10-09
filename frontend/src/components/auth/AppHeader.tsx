import { Link, useNavigate } from 'react-router-dom'
import { PixelButton } from '../ui/PixelButton'
import { getUsername, useAuthStore } from '../../store/authStore'

type AppHeaderProps = {
  coins?: number
  onBag?: () => void
  onHint?: () => void
  showBattleActions?: boolean
}

export function AppHeader({ coins, onBag, onHint, showBattleActions = false }: AppHeaderProps) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b-4 border-ink bg-cream px-4">
      <Link className="pixel-focus font-heading text-[10px]" to="/hub">
        Back to Hub
      </Link>
      <div className="flex items-center gap-3">
        <span className="hidden font-heading text-[10px] sm:inline">{getUsername(user)}</span>
        {typeof coins === 'number' ? (
          <span className="font-heading text-[10px]">Coins {coins}</span>
        ) : null}
        {showBattleActions ? (
          <>
            <PixelButton className="px-3 py-2" onClick={onBag} variant="secondary">
              Bag
            </PixelButton>
            <PixelButton className="px-3 py-2" disabled={!onHint} onClick={onHint} variant="secondary">
              Hint
            </PixelButton>
          </>
        ) : null}
        <PixelButton className="px-3 py-2" onClick={handleLogout} variant="danger">
          Logout
        </PixelButton>
      </div>
    </header>
  )
}
