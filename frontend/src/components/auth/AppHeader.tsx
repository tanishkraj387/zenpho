import { Link } from 'react-router-dom'
import { usePlayerSummary } from '../../hooks/usePlayerSummary'
import { AudioToggle } from '../ui/AudioToggle'
import { PixelButton } from '../ui/PixelButton'
import { getUsername, useAuthStore } from '../../store/authStore'

type AppHeaderProps = {
  coins?: number
  onBag?: () => void
  onHint?: () => void
  showBattleActions?: boolean
}

function CoinArt() {
  return (
    <svg aria-hidden="true" className="h-8 w-8 shrink-0" shapeRendering="crispEdges" viewBox="0 0 32 32">
      <path d="M8 1h16v2h4v3h2v20h-2v3h-4v2H8v-2H4v-3H2V6h2V3h4z" fill="#1a1c2c" />
      <path d="M8 4h16v2h3v20h-3v2H8v-2H5V6h3z" fill="#a96713" />
      <path d="M8 6h16v2h2v16h-2v2H8v-2H6V8h2z" fill="#f7c948" />
      <path d="M8 8h3v2H8zm3-2h11v2H11zm-3 4h2v8H8z" fill="#fff4bd" />
      <path d="M15 10h5v3h-4v2h4v2h-4v2h4v3h-5v-2h-2v-3h2v-2h-2v-3h2z" fill="#8a5310" />
    </svg>
  )
}

function EnergyArt() {
  return (
    <svg aria-hidden="true" className="h-8 w-8 shrink-0" shapeRendering="crispEdges" viewBox="0 0 32 32">
      <path d="M14 1h11l-6 11h8L11 31l3-13H6z" fill="#1a1c2c" />
      <path d="M15 4h5l-6 11h8L13 25l3-10h-5z" fill="#f7c948" />
      <path d="M16 5h3l-4 8h-2z" fill="#fff4bd" />
      <path d="M22 15h2L14 26l2-7z" fill="#e99b23" />
    </svg>
  )
}

export function AppHeader({ coins, onBag, onHint, showBattleActions = false }: AppHeaderProps) {
  const user = useAuthStore((state) => state.user)
  const playerSummary = usePlayerSummary()
  const currentCoins = playerSummary.data?.coins ?? (playerSummary.isLoading ? null : coins)
  const energy = playerSummary.data?.energy
  const maxEnergy = playerSummary.data?.maxEnergy
  const energyPercent = typeof energy === 'number' && typeof maxEnergy === 'number' && maxEnergy > 0
    ? Math.min(100, Math.max(0, (energy / maxEnergy) * 100))
    : 0

  return (
    <header className="relative z-20 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b-4 border-ink bg-cream px-3 py-2 sm:px-4">
      <Link className="pixel-focus shrink-0 font-heading text-[10px]" to="/hub">
        Back to Hub
      </Link>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <span className="hidden max-w-[140px] truncate font-heading text-[10px] sm:inline">
          {getUsername(user)}
        </span>
        <nav aria-label="Trainer resources" className="order-last flex w-full justify-end gap-2 sm:order-none sm:w-auto">
          <Link
            aria-label={`Coins: ${currentCoins ?? 'loading'}. Open shop`}
            className="pixel-focus flex min-w-24 items-center gap-1 border-4 border-ink bg-[#fff0a6] px-1.5 py-1 shadow-[3px_3px_0_#1a1c2c] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none sm:min-w-28 sm:gap-2 sm:px-2"
            to="/shop"
          >
            <CoinArt />
            <span className="grid gap-0.5">
              <span className="font-pixel text-xs leading-none">Coins</span>
              <span className="font-heading text-[10px] leading-tight">{currentCoins?.toLocaleString() ?? '—'}</span>
            </span>
          </Link>
          <Link
            aria-label={`Energy: ${energy ?? 'loading'}${typeof maxEnergy === 'number' ? ` of ${maxEnergy}` : ''}. Open profile`}
            className="pixel-focus flex min-w-28 items-center gap-1 border-4 border-ink bg-[#d7f2ff] px-1.5 py-1 shadow-[3px_3px_0_#1a1c2c] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none sm:min-w-32 sm:gap-2 sm:px-2"
            to="/profile"
          >
            <EnergyArt />
            <span className="grid min-w-0 gap-1">
              <span className="font-pixel text-xs leading-none">Energy</span>
              <span className="font-heading text-[10px] leading-tight">{energy ?? '—'}{typeof maxEnergy === 'number' ? ` / ${maxEnergy}` : ''}</span>
              <span aria-hidden="true" className="h-1.5 w-full min-w-14 border border-ink bg-white">
                <span className="block h-full bg-warning" style={{ width: `${energyPercent}%` }} />
              </span>
            </span>
          </Link>
        </nav>
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
