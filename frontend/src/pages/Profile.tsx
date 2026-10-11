import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/auth/AppHeader'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { XPBar } from '../components/ui/XPBar'
import { useProfileSummary } from '../hooks/useProfileSummary'
import { getUsername, useAuthStore } from '../store/authStore'

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function Profile() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const profileSummary = useProfileSummary()
  const summary = profileSummary.data
  const username = summary?.username ?? getUsername(user)

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-sky font-pixel text-ink">
      <AppHeader coins={summary?.coins ?? 0} />
      <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <PixelCard bodyClassName="p-4 sm:p-5" title="Trainer Profile">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-3">
              <p className="font-heading text-[10px] uppercase leading-relaxed">
                Account
              </p>
              <h1 className="font-heading text-2xl leading-relaxed sm:text-3xl">
                {username}
              </h1>
              <p className="max-w-3xl text-xl leading-relaxed">
                Your trainer profile summarizes account resources, starter
                progress, collection growth, and recent battle attempts.
              </p>
              {profileSummary.isError ? (
                <p className="border-4 border-ink bg-warning p-3 text-lg">
                  Profile data is unavailable right now. Check Supabase tables
                  and RLS policies.
                </p>
              ) : null}
            </div>
            <Link to="/hub">
              <PixelButton className="w-full sm:w-auto" variant="secondary">
                Back to Hub
              </PixelButton>
            </Link>
            <PixelButton className="w-full sm:w-auto" onClick={handleLogout} variant="danger">
              Logout
            </PixelButton>
          </div>
        </PixelCard>

        <div className="grid gap-4 md:grid-cols-4">
          <PixelCard bodyClassName="p-4" title="Coins">
            <p className="font-heading text-2xl">{summary?.coins ?? 0}</p>
            <p className="mt-2 text-xl">Spendable shop balance.</p>
          </PixelCard>
          <PixelCard bodyClassName="p-4" title="XP">
            <p className="font-heading text-2xl">{summary?.xp ?? 0}</p>
            <p className="mt-2 text-xl">Earned from solved encounters.</p>
          </PixelCard>
          <PixelCard bodyClassName="p-4" title="Caught">
            <p className="font-heading text-2xl">{summary?.caughtCount ?? 0}</p>
            <p className="mt-2 text-xl">Pokemon in collection.</p>
          </PixelCard>
          <PixelCard bodyClassName="p-4" title="Starter">
            <p className="font-heading text-lg leading-relaxed">
              {summary?.starterName ?? 'None'}
            </p>
            <p className="mt-2 text-xl">First coding partner.</p>
          </PixelCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <PixelCard bodyClassName="p-4 sm:p-5" title="Energy">
            <XPBar
              current={summary?.energy ?? 0}
              label="Energy"
              max={summary?.maxEnergy ?? 50}
            />
            <p className="mt-4 text-xl leading-relaxed">
              Energy drains from runs, submissions, wrong answers, and harder
              encounters. It is stamina, not a hard battle ticket.
            </p>
          </PixelCard>

          <PixelCard bodyClassName="p-4 sm:p-5" title="Recent Battles">
            {summary?.recentBattles.length ? (
              <div className="grid gap-3">
                {summary.recentBattles.map((battle) => (
                  <article
                    className="grid gap-2 border-4 border-ink bg-white p-3 sm:grid-cols-[1fr_auto]"
                    key={`${battle.createdAt}-${battle.questionId}`}
                  >
                    <div>
                      <p className="font-heading text-[10px] uppercase">
                        {battle.enemyName}
                      </p>
                      <p className="mt-1 text-lg">{battle.questionId}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-heading text-[10px] uppercase">
                        {battle.status}
                      </p>
                      <p className="mt-1 text-base">{formatDate(battle.createdAt)}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-xl">No battle attempts recorded yet.</p>
            )}
          </PixelCard>
        </div>
      </section>
    </main>
  )
}
