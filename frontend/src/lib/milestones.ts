import { getPokemonById } from './pokemon'
import { isSupabaseConfigured, supabase } from './supabase'

export type MilestoneProgress = {
  completedAt: string | null
  description: string
  isComplete: boolean
  isRewardClaimed: boolean
  key: string
  progress: number
  reward: string
  target: number
  title: string
}

type MilestoneCatalogRow = {
  description: string
  milestone_key: string
  reward_coins: number
  reward_item_key: string | null
  reward_pokemon_id: number | null
  reward_xp: number
  target: number
  title: string
}

type MilestoneProgressRow = {
  completed_at: string | null
  milestone_key: string
  progress: number
  reward_claimed_at: string | null
  target: number
}

const fallbackMilestones: MilestoneProgress[] = [
  {
    completedAt: null,
    description: 'Win one question encounter.',
    isComplete: false,
    isRewardClaimed: false,
    key: 'first_win',
    progress: 0,
    reward: 'Caterpie, 25 coins, 40 XP, Poke Ball',
    target: 1,
    title: 'First Clear',
  },
]

function describeReward(milestone: MilestoneCatalogRow) {
  const rewardParts = []
  const pokemon = milestone.reward_pokemon_id ? getPokemonById(milestone.reward_pokemon_id) : null

  if (pokemon) {
    rewardParts.push(pokemon.name)
  }

  if (milestone.reward_coins > 0) {
    rewardParts.push(`${milestone.reward_coins} coins`)
  }

  if (milestone.reward_xp > 0) {
    rewardParts.push(`${milestone.reward_xp} XP`)
  }

  if (milestone.reward_item_key) {
    rewardParts.push(milestone.reward_item_key.replaceAll('-', ' '))
  }

  return rewardParts.join(', ') || 'Progress reward'
}

export async function getMilestones(userId: string): Promise<MilestoneProgress[]> {
  if (!isSupabaseConfigured) {
    return fallbackMilestones
  }

  const [catalogResult, progressResult] = await Promise.all([
    supabase
      .from('milestone_catalog')
      .select('milestone_key,title,description,target,reward_pokemon_id,reward_coins,reward_xp,reward_item_key')
      .eq('is_active', true),
    supabase
      .from('milestone_progress')
      .select('milestone_key,progress,target,completed_at,reward_claimed_at')
      .eq('user_id', userId),
  ])

  if (catalogResult.error) {
    throw catalogResult.error
  }

  if (progressResult.error) {
    throw progressResult.error
  }

  const progressByKey = new Map(
    ((progressResult.data ?? []) as MilestoneProgressRow[]).map((progress) => [
      progress.milestone_key,
      progress,
    ]),
  )

  return ((catalogResult.data ?? []) as MilestoneCatalogRow[]).map((milestone) => {
    const progress = progressByKey.get(milestone.milestone_key)
    const currentProgress = progress?.progress ?? 0
    const target = progress?.target ?? milestone.target

    return {
      completedAt: progress?.completed_at ?? null,
      description: milestone.description,
      isComplete: currentProgress >= target,
      isRewardClaimed: Boolean(progress?.reward_claimed_at),
      key: milestone.milestone_key,
      progress: currentProgress,
      reward: describeReward(milestone),
      target,
      title: milestone.title,
    }
  })
}

export async function claimMilestoneReward(milestoneKey: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase.rpc('claim_milestone_reward', {
    p_milestone_key: milestoneKey,
  })

  if (error) {
    throw error
  }

  return data
}
