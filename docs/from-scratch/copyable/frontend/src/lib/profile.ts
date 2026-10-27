import { getPokemonById } from './pokemon'
import { isSupabaseConfigured, supabase } from './supabase'

export type RecentBattle = {
  createdAt: string
  enemyName: string
  questionId: string
  status: string
}

export type ProfileSummary = {
  username: string | null
  coins: number
  xp: number
  energy: number
  maxEnergy: number
  caughtCount: number
  starterName: string | null
  recentBattles: RecentBattle[]
}

export async function getProfileSummary(userId: string): Promise<ProfileSummary> {
  if (!isSupabaseConfigured) {
    return {
      username: null,
      coins: 0,
      xp: 0,
      energy: 0,
      maxEnergy: 50,
      caughtCount: 0,
      starterName: null,
      recentBattles: [],
    }
  }

  const [profileResult, resourcesResult, creaturesResult, battlesResult] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', userId).maybeSingle(),
    supabase
      .from('player_resources')
      .select('coins,xp,energy,max_energy')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('player_creatures')
      .select('pokemon_id,is_starter')
      .eq('user_id', userId),
    supabase
      .from('battle_attempts')
      .select('question_id,pokemon_id,status,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (profileResult.error) {
    throw profileResult.error
  }

  if (resourcesResult.error) {
    throw resourcesResult.error
  }

  if (creaturesResult.error) {
    throw creaturesResult.error
  }

  if (battlesResult.error) {
    throw battlesResult.error
  }

  const starter = creaturesResult.data?.find((creature) => creature.is_starter)

  return {
    username: profileResult.data?.username ?? null,
    coins: resourcesResult.data?.coins ?? 0,
    xp: resourcesResult.data?.xp ?? 0,
    energy: resourcesResult.data?.energy ?? 0,
    maxEnergy: resourcesResult.data?.max_energy ?? 50,
    caughtCount: creaturesResult.data?.length ?? 0,
    starterName: starter ? getPokemonById(starter.pokemon_id)?.name ?? null : null,
    recentBattles:
      battlesResult.data?.map((battle) => ({
        createdAt: battle.created_at,
        enemyName: getPokemonById(battle.pokemon_id)?.name ?? `#${battle.pokemon_id}`,
        questionId: battle.question_id,
        status: battle.status,
      })) ?? [],
  }
}
