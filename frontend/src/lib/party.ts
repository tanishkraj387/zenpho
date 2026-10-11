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
    .from('party_slots')
    .select('slot,player_creatures(id,pokemon_id,level,xp,is_starter)')
    .eq('user_id', userId)
    .order('slot', { ascending: true })

  if (error) {
    throw error
  }

  const slottedParty =
    data
      ?.map((slot) => {
        const creature = Array.isArray(slot.player_creatures)
          ? slot.player_creatures[0]
          : slot.player_creatures
        const pokemon = creature ? getPokemonById(creature.pokemon_id) : null

        if (!pokemon || !creature) {
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

  if (slottedParty.length > 0) {
    return slottedParty
  }

  const fallbackResult = await supabase
    .from('player_creatures')
    .select('id,pokemon_id,level,xp,is_starter,caught_at')
    .eq('user_id', userId)
    .order('is_starter', { ascending: false })
    .order('caught_at', { ascending: true })
    .limit(6)

  if (fallbackResult.error) {
    throw fallbackResult.error
  }

  const party =
    fallbackResult.data
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
