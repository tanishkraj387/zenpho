import { getPokemonById, type TopicType } from './pokemon'
import { isSupabaseConfigured, supabase } from './supabase'

export type GymProgress = {
  badgeWonAt: string | null
  isClaimed: boolean
  isUnlocked: boolean
  key: string
  progress: number
  requiredWins: number
  reward: string
  title: string
  topic: TopicType
}

type GymCatalogRow = {
  gym_key: string
  required_wins: number
  reward_coins: number
  reward_pokemon_id: number | null
  reward_xp: number
  title: string
  topic: TopicType
}

type GymBadgeRow = {
  gym_key: string
  reward_claimed_at: string | null
  won_at: string
}

type BattleWinRow = {
  question_id: string
  questions: { topic: TopicType } | { topic: TopicType }[] | null
}

const fallbackGyms: GymProgress[] = [
  {
    badgeWonAt: null,
    isClaimed: false,
    isUnlocked: false,
    key: 'array_gym',
    progress: 0,
    requiredWins: 3,
    reward: 'Psyduck, 80 coins, 120 XP',
    title: 'Array Gym',
    topic: 'arrays',
  },
]

function describeReward(gym: GymCatalogRow) {
  const parts = []
  const pokemon = gym.reward_pokemon_id ? getPokemonById(gym.reward_pokemon_id) : null

  if (pokemon) {
    parts.push(pokemon.name)
  }

  if (gym.reward_coins > 0) {
    parts.push(`${gym.reward_coins} coins`)
  }

  if (gym.reward_xp > 0) {
    parts.push(`${gym.reward_xp} XP`)
  }

  return parts.join(', ') || 'Badge reward'
}

function getTopicFromWin(win: BattleWinRow) {
  if (Array.isArray(win.questions)) {
    return win.questions[0]?.topic
  }

  return win.questions?.topic
}

export async function getGyms(userId: string): Promise<GymProgress[]> {
  if (!isSupabaseConfigured) {
    return fallbackGyms
  }

  const [gymsResult, badgesResult, winsResult] = await Promise.all([
    supabase
      .from('gym_catalog')
      .select('gym_key,title,topic,required_wins,reward_pokemon_id,reward_coins,reward_xp')
      .eq('is_active', true),
    supabase
      .from('player_gym_badges')
      .select('gym_key,won_at,reward_claimed_at')
      .eq('user_id', userId),
    supabase
      .from('battle_attempts')
      .select('question_id,questions(topic)')
      .eq('user_id', userId)
      .eq('status', 'won'),
  ])

  if (gymsResult.error) {
    throw gymsResult.error
  }

  if (badgesResult.error) {
    throw badgesResult.error
  }

  if (winsResult.error) {
    throw winsResult.error
  }

  const badgesByKey = new Map(
    ((badgesResult.data ?? []) as GymBadgeRow[]).map((badge) => [badge.gym_key, badge]),
  )
  const winsByTopic = new Map<TopicType, Set<string>>()

  for (const win of (winsResult.data ?? []) as BattleWinRow[]) {
    const topic = getTopicFromWin(win)

    if (!topic) {
      continue
    }

    if (!winsByTopic.has(topic)) {
      winsByTopic.set(topic, new Set())
    }

    winsByTopic.get(topic)!.add(win.question_id)
  }

  return ((gymsResult.data ?? []) as GymCatalogRow[]).map((gym) => {
    const badge = badgesByKey.get(gym.gym_key)
    const progress = winsByTopic.get(gym.topic)?.size ?? 0

    return {
      badgeWonAt: badge?.won_at ?? null,
      isClaimed: Boolean(badge?.reward_claimed_at),
      isUnlocked: progress >= gym.required_wins,
      key: gym.gym_key,
      progress,
      requiredWins: gym.required_wins,
      reward: describeReward(gym),
      title: gym.title,
      topic: gym.topic,
    }
  })
}

export async function claimGymReward(gymKey: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase.rpc('claim_gym_reward', {
    p_gym_key: gymKey,
  })

  if (error) {
    throw error
  }

  return data
}
