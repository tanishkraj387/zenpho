import { getPokemonById, type PokemonSpecies, starterPokemonIds } from './pokemon'
import { isSupabaseConfigured, supabase } from './supabase'

export type PlayerPartyMember = PokemonSpecies & {
  creatureId: string
  isStarter: boolean
  level: number
  xp: number
  currentHp: number
  maxHp: number
  slot: number
}

function fallbackParty(): PlayerPartyMember[] {
  return starterPokemonIds
    .map((id) => getPokemonById(id))
    .filter((pokemon): pokemon is PokemonSpecies => Boolean(pokemon))
    .map((pokemon, index) => ({
      ...pokemon,
      creatureId: `fallback-${pokemon.id}`,
      isStarter: true,
      level: 5,
      xp: 0,
      currentHp: 100,
      maxHp: 100,
      slot: index + 1,
    }))
}

export async function getPlayerParty(userId: string): Promise<PlayerPartyMember[]> {
  if (!isSupabaseConfigured) {
    return fallbackParty()
  }

  const { data, error } = await supabase
    .from('party_slots')
    .select('slot,player_creatures(id,pokemon_id,level,xp,is_starter,current_hp,max_hp)')
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
          currentHp: creature.current_hp,
          maxHp: creature.max_hp,
          slot: slot.slot,
        }
      })
      .filter((pokemon): pokemon is PlayerPartyMember => Boolean(pokemon)) ?? []

  if ((data?.length ?? 0) > 0) {
    return slottedParty
  }

  const fallbackResult = await supabase
    .from('player_creatures')
    .select('id,pokemon_id,level,xp,is_starter,current_hp,max_hp,caught_at')
    .eq('user_id', userId)
    .order('is_starter', { ascending: false })
    .order('caught_at', { ascending: true })
    .limit(6)

  if (fallbackResult.error) {
    throw fallbackResult.error
  }

  const party =
    fallbackResult.data
      ?.map((creature, index) => {
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
          currentHp: creature.current_hp,
          maxHp: creature.max_hp,
          slot: index + 1,
        }
      })
      .filter((pokemon): pokemon is PlayerPartyMember => Boolean(pokemon)) ?? []

  return party
}

export async function getOwnedCreatures(userId: string): Promise<PlayerPartyMember[]> {
  if (!isSupabaseConfigured) return fallbackParty()

  const { data, error } = await supabase
    .from('player_creatures')
    .select('id,pokemon_id,level,xp,is_starter,current_hp,max_hp,caught_at')
    .eq('user_id', userId)
    .order('caught_at', { ascending: true })

  if (error) throw error

  return (data ?? []).flatMap((creature) => {
    const pokemon = getPokemonById(creature.pokemon_id)
    return pokemon ? [{
      ...pokemon,
      creatureId: creature.id,
      isStarter: creature.is_starter,
      level: creature.level,
      xp: creature.xp,
      currentHp: creature.current_hp,
      maxHp: creature.max_hp,
      slot: 0,
    }] : []
  })
}

export async function setPartySlot(slot: number, creatureId: string | null) {
  if (!isSupabaseConfigured) throw new Error('Party editing requires a connected account.')
  const { error } = await supabase.rpc('set_party_slot', {
    p_slot: slot,
    p_creature_id: creatureId,
  })
  if (error) throw error
}

export async function applyHealingItem(creatureId: string, itemKey: string): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('Healing requires a connected account.')
  const { data, error } = await supabase.rpc('use_healing_item', {
    p_creature_id: creatureId,
    p_item_key: itemKey,
  })
  if (error) throw error
  return Number(data)
}
