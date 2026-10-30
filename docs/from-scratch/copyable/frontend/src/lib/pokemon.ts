import encounterTiers from '../data/encounter-tiers.json'
import pokemonRoster from '../data/pokemon-roster.json'
import { getSprite } from './sprites'

export type PokemonRarity = 'common' | 'uncommon' | 'rare' | 'legendary'
export type QuestionDifficulty = 'easy' | 'medium' | 'hard'
export type TopicType = 'arrays' | 'strings' | 'graphs' | 'trees' | 'dp' | 'math'

export type PokemonSpecies = {
  id: number
  name: string
  types: string[]
  rarity: PokemonRarity
  isLegendary: boolean
}

export type PokemonSpeciesWithSprites = PokemonSpecies & {
  sprites: {
    front: string
    back: string
    shiny: string
    icon: string
  }
  cry: string | null
}

export type EncounterTiers = Record<
  QuestionDifficulty,
  Partial<Record<PokemonRarity, number[]>>
>

export const pokemonSpecies = pokemonRoster as PokemonSpecies[]
export const pokemonEncounterTiers = encounterTiers as EncounterTiers

export const starterPokemonIds = [1, 4, 7] as const

export const topicTypeFlavor: Record<TopicType, string[]> = {
  arrays: ['Normal', 'Grass', 'Water', 'Electric'],
  strings: ['Normal', 'Psychic'],
  graphs: ['Electric', 'Ghost', 'Psychic'],
  trees: ['Grass', 'Bug', 'Ground'],
  dp: ['Psychic', 'Dragon'],
  math: ['Rock', 'Psychic', 'Electric'],
}

export function getPokemonById(id: number) {
  return pokemonSpecies.find((pokemon) => pokemon.id === id)
}

export function getPokemonWithSprites(pokemon: PokemonSpecies): PokemonSpeciesWithSprites {
  return {
    ...pokemon,
    sprites: {
      front: getSprite(pokemon.id, 'front'),
      back: getSprite(pokemon.id, 'back'),
      shiny: getSprite(pokemon.id, 'shiny'),
      icon: getSprite(pokemon.id, 'icon'),
    },
    cry: null,
  }
}

export function getStarterPokemon() {
  return starterPokemonIds
    .map((id) => getPokemonById(id))
    .filter((pokemon): pokemon is PokemonSpecies => Boolean(pokemon))
    .map(getPokemonWithSprites)
}

export function getEncounterPool(difficulty: QuestionDifficulty) {
  const tiers = pokemonEncounterTiers[difficulty]
  const ids = Object.values(tiers).flat()

  return ids
    .map((id) => getPokemonById(id))
    .filter((pokemon): pokemon is PokemonSpecies => Boolean(pokemon))
    .map(getPokemonWithSprites)
}

export function getRarityLabel(rarity: PokemonRarity) {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1)
}
