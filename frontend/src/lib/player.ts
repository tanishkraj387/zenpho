import { isSupabaseConfigured, supabase } from './supabase'

export type PlayerSummary = {
  username: string | null
  coins: number
  xp: number
  energy: number
  maxEnergy: number
  caughtCount: number
  starterPokemonIds: number[]
}

export async function getPlayerSummary(userId: string): Promise<PlayerSummary> {
  if (!isSupabaseConfigured) {
    return {
      username: null,
      coins: 245,
      xp: 0,
      energy: 37,
      maxEnergy: 50,
      caughtCount: 0,
      starterPokemonIds: [],
    }
  }

  const [profileResult, resourcesResult, creaturesResult] = await Promise.all([
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

  return {
    username: profileResult.data?.username ?? null,
    coins: resourcesResult.data?.coins ?? 0,
    xp: resourcesResult.data?.xp ?? 0,
    energy: resourcesResult.data?.energy ?? 0,
    maxEnergy: resourcesResult.data?.max_energy ?? 50,
    caughtCount: creaturesResult.data?.length ?? 0,
    starterPokemonIds:
      creaturesResult.data
        ?.filter((creature) => creature.is_starter)
        .map((creature) => creature.pokemon_id) ?? [],
  }
}
