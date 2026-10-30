import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/auth/AppHeader'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { TypeBadge, type TopicType as BadgeTopicType } from '../components/ui/TypeBadge'
import { XPBar } from '../components/ui/XPBar'
import { useGyms } from '../hooks/useGyms'
import { usePlayerSummary } from '../hooks/usePlayerSummary'
import { claimGymReward, type GymProgress } from '../lib/gyms'
import { getTopicLabel } from '../lib/questions'

function getBadgeTopic(topic: GymProgress['topic']): BadgeTopicType {
  return getTopicLabel(topic) as BadgeTopicType
}

function formatStatus(gym: GymProgress) {
  if (gym.isClaimed) {
    return 'Badge claimed'
  }

  if (gym.badgeWonAt) {
    return 'Reward ready'
  }

  if (gym.isUnlocked) {
    return 'Challenge cleared'
  }

  return 'Locked'
}

export function Gyms() {
  const queryClient = useQueryClient()
  const gyms = useGyms()
  const playerSummary = usePlayerSummary()
  const [pendingGymKey, setPendingGymKey] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const gymRows = gyms.data ?? []
  const completedCount = gymRows.filter((gym) => gym.isClaimed || gym.badgeWonAt).length

  async function claimReward(gym: GymProgress) {
    setMessage('')
    setPendingGymKey(gym.key)

    try {
      await claimGymReward(gym.key)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gyms'] }),
        queryClient.invalidateQueries({ queryKey: ['player-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['player-party'] }),
        queryClient.invalidateQueries({ queryKey: ['collection-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['milestones'] }),
      ])
      setMessage(`${gym.title} badge reward claimed.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not claim gym reward.')
    } finally {
      setPendingGymKey(null)
    }
  }

  return (
    <main className="min-h-screen bg-sky font-pixel text-ink">
      <AppHeader coins={playerSummary.data?.coins ?? 0} />
      <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <PixelCard bodyClassName="p-4 sm:p-5" title="Gyms">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-3">
              <p className="font-heading text-[10px] uppercase leading-relaxed">
                Badge road
              </p>
              <h1 className="font-heading text-2xl leading-relaxed sm:text-3xl">
                Topic gyms
              </h1>
              <p className="max-w-3xl text-xl leading-relaxed">
                Gyms unlock from solved question encounters in each topic. Claiming
                a gym reward is server-authoritative and grants the badge reward
                once.
              </p>
              {gyms.isError ? (
                <p className="border-4 border-ink bg-warning p-3 text-lg">
                  Gym data is unavailable until the backend migration is applied.
                </p>
              ) : null}
              {message ? (
                <p className="border-4 border-ink bg-warning p-3 text-lg" role="status">
                  {message}
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

        <div className="grid gap-4 md:grid-cols-3">
          <PixelCard bodyClassName="p-4" title="Badges">
            <p className="font-heading text-2xl">{completedCount}</p>
            <p className="mt-2 text-xl">Claimed or unlocked.</p>
          </PixelCard>
          <PixelCard bodyClassName="p-4" title="Gyms">
            <p className="font-heading text-2xl">{gymRows.length}</p>
            <p className="mt-2 text-xl">Topic challenges seeded.</p>
          </PixelCard>
          <PixelCard bodyClassName="p-4" title="Rule">
            <p className="text-xl">Solve topic routes first, then claim the badge.</p>
          </PixelCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {gymRows.map((gym) => {
            const isPending = pendingGymKey === gym.key
            const canClaim = gym.isUnlocked && !gym.isClaimed

            return (
              <article
                className="grid gap-4 border-4 border-ink bg-cream p-4 shadow-[6px_6px_0_#1a1c2c]"
                key={gym.key}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-sm leading-relaxed">{gym.title}</h2>
                    <p className="mt-2 text-xl">{formatStatus(gym)}</p>
                  </div>
                  <TypeBadge type={getBadgeTopic(gym.topic)} />
                </div>

                <XPBar current={gym.progress} label="Topic wins" max={gym.requiredWins} />

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <p className="text-xl leading-relaxed">Reward: {gym.reward}</p>
                  <PixelButton
                    disabled={!canClaim || isPending}
                    onClick={() => claimReward(gym)}
                    variant={canClaim ? 'primary' : 'secondary'}
                  >
                    {gym.isClaimed ? 'Claimed' : isPending ? 'Claiming...' : 'Claim'}
                  </PixelButton>
                </div>
              </article>
            )
          })}
        </div>
        {gymRows.length === 0 ? (
          <PixelCard bodyClassName="p-4 text-xl" title="No Gyms">
            Gym catalog data is empty. Apply the backend migration and seed data,
            then refresh this page.
          </PixelCard>
        ) : null}
      </section>
    </main>
  )
}
