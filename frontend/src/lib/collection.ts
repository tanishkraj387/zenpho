import { isSupabaseConfigured, supabase } from './supabase'

export type CollectionStatus = 'caught' | 'seen' | 'unknown'

export type CollectionEntry = {
  affinity?: string
  caughtAt?: string
  source?: string
  status: CollectionStatus
}

const previewSeenCollection: Record<number, CollectionEntry> = {
  25: {
    affinity: 'Strings',
    source: 'Route preview',
    status: 'seen',
  },
  54: {
    affinity: 'Arrays',
    source: 'Practice route preview',
    status: 'seen',
  },
  63: {
    affinity: 'Graphs',
    source: 'Question encounter preview',
    status: 'seen',
  },
  92: {
    affinity: 'Graphs',
    source: 'Wild encounter preview',
    status: 'seen',
  },
  129: {
    affinity: 'Practice',
    source: 'Practice encounter preview',
    status: 'seen',
  },
  133: {
    affinity: 'DP',
    source: 'Milestone preview',
    status: 'seen',
  },
  143: {
    affinity: 'Trees',
    source: 'Gym preview',
    status: 'seen',
  },
  147: {
    affinity: 'DP',
    source: 'Hard DP preview',
    status: 'seen',
  },
  150: {
    affinity: 'Hard DP',
    source: 'Legendary milestone preview',
    status: 'seen',
  },
}

function formatCaughtAt(value: string | null) {
  if (!value) {
    return undefined
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function formatAffinity(value: string | null) {
  if (!value) {
    return undefined
  }

  return value.toUpperCase() === 'DP'
    ? 'DP'
    : value.charAt(0).toUpperCase() + value.slice(1)
}

export async function getCollectionEntries(userId: string): Promise<Record<number, CollectionEntry>> {
  if (!isSupabaseConfigured) {
    return previewSeenCollection
  }

  const { data, error } = await supabase
    .from('player_creatures')
    .select('pokemon_id,affinity,source,is_starter,caught_at')
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  const entries: Record<number, CollectionEntry> = { ...previewSeenCollection }

  for (const creature of data ?? []) {
    entries[creature.pokemon_id] = {
      affinity: formatAffinity(creature.affinity),
      caughtAt: formatCaughtAt(creature.caught_at),
      source: creature.is_starter ? 'Starter choice' : creature.source,
      status: 'caught',
    }
  }

  return entries
}

export async function catchPokemon({
  ballItemKey,
  pokemonId,
  questionId,
}: {
  ballItemKey: string
  pokemonId: number
  questionId: string
}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase.rpc('catch_pokemon', {
    p_ball_item_key: ballItemKey,
    p_pokemon_id: pokemonId,
    p_question_id: questionId,
  })

  if (error) {
    throw error
  }

  const result = Array.isArray(data) ? data[0] : data

  if (!result) {
    throw new Error('Catch result was empty.')
  }

  return {
    caught: Boolean(result.caught),
    quantity: Number(result.quantity),
    roll: Number(result.roll),
    threshold: Number(result.threshold),
  }
}
