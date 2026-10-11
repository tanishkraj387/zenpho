import { getPokemonById, type PokemonSpecies, starterPokemonIds } from './pokemon'
import { isSupabaseConfigured, supabase } from './supabase'

export type PlayerPartyMember = PokemonSpecies & {
  creatureId: string
  isStarter: boolean
  level: number
  xp: number
}

function fallbackParty(): PlayerPartyMember[] {
  return starterPokemonIds
    .map((id) => getPokemonById(id))
    .filter((pokemon): pokemon is PokemonSpecies => Boolean(pokemon))
    .map((pokemon) => ({
      ...pokemon,
      creatureId: `fallback-${pokemon.id}`,
      isStarter: true,
      level: 5,
      xp: 0,
    }))
}

export async function getPlayerParty(userId: string): Promise<PlayerPartyMember[]> {
  if (!isSupabaseConfigured) {
    return fallbackParty()
  }

  const { data, error } = await supabase
    .from('player_creatures')
    .select('id,pokemon_id,level,xp,is_starter,caught_at')
    .eq('user_id', userId)
    .order('is_starter', { ascending: false })
    .order('caught_at', { ascending: true })
    .limit(6)

  if (error) {
    throw error
  }

  const party =
    data
      ?.map((creature) => {
        const pokemon = getPokemonById(creature.pokemon_id)

        if (!pokemon) {
          return null
        }

        return {
          ...pokemon,
          creatureId: creature.id,
          isStarter: creature.is_starter,
          level: creature.level,
          xp: creature.xp,
        }
      })
      .filter((pokemon): pokemon is PlayerPartyMember => Boolean(pokemon)) ?? []

  return party.length > 0 ? party : fallbackParty()
}
