import { Link } from 'react-router-dom'
import { AppHeader } from '../components/auth/AppHeader'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { usePlayerSummary } from '../hooks/usePlayerSummary'
import { useAuthStore } from '../store/authStore'

export function Leaderboard() {
  const user = useAuthStore((state) => state.user)
  const leaderboard = useLeaderboard()
  const playerSummary = usePlayerSummary()
  const rows = leaderboard.data ?? []

  return (
    <main className="min-h-screen bg-sky font-pixel text-ink">
      <AppHeader coins={playerSummary.data?.coins ?? 0} />
      <section className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <PixelCard bodyClassName="p-4 sm:p-5" title="Leaderboard">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-3">
              <p className="font-heading text-[10px] uppercase leading-relaxed">
                Trainer rankings
              </p>
              <h1 className="font-heading text-2xl leading-relaxed sm:text-3xl">
                XP League
              </h1>
              <p className="max-w-3xl text-xl leading-relaxed">
                Rankings use server-owned XP, caught Pokemon count, and coin
                balance. Auth emails and private account data are never shown.
              </p>
              {leaderboard.isError ? (
                <p className="border-4 border-ink bg-warning p-3 text-lg">
                  Leaderboard data is unavailable until the Supabase ranking
                  function is applied.
                </p>
              ) : null}
            </div>
            <Link to="/hub">
              <PixelButton className="w-full sm:w-auto" variant="secondary">
                Back to Hub
              </PixelButton>
            </Link>
          </div>
        </PixelCard>

        <PixelCard bodyClassName="p-0" title="Top Trainers">
          {rows.length > 0 ? (
            <div className="divide-y-4 divide-ink">
              {rows.map((entry, index) => {
                const isCurrentUser = entry.userId === user?.id

                return (
                  <article
                    className={`grid gap-3 p-4 text-xl md:grid-cols-[80px_1fr_120px_120px_120px] md:items-center ${
                      isCurrentUser ? 'bg-warning' : 'bg-cream'
                    }`}
                    key={entry.userId}
                  >
                    <p className="font-heading text-sm">#{index + 1}</p>
                    <div>
                      <p className="font-heading text-xs leading-relaxed">
                        {entry.username}
                      </p>
                      {isCurrentUser ? <p className="text-lg">You</p> : null}
                    </div>
                    <p>
                      <span className="font-heading text-[9px] uppercase">XP</span>
                      <br />
                      {entry.xp}
                    </p>
                    <p>
                      <span className="font-heading text-[9px] uppercase">Caught</span>
                      <br />
                      {entry.caughtCount}
                    </p>
                    <p>
                      <span className="font-heading text-[9px] uppercase">Coins</span>
                      <br />
                      {entry.coins}
                    </p>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="p-4 text-xl">No leaderboard rows yet.</div>
          )}
        </PixelCard>
      </section>
    </main>
  )
}
