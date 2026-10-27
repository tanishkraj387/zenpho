import type { PokemonSpecies } from './pokemon'

export type PokemonType =
  | 'Normal'
  | 'Fire'
  | 'Water'
  | 'Electric'
  | 'Grass'
  | 'Ice'
  | 'Fighting'
  | 'Poison'
  | 'Ground'
  | 'Flying'
  | 'Psychic'
  | 'Bug'
  | 'Rock'
  | 'Ghost'
  | 'Dragon'

export type MoveVfx = 'impact' | 'slash' | 'leaf' | 'fire' | 'water' | 'electric' | 'psychic' | 'rock' | 'ghost'

export type BattleMove = {
  accuracy: number
  description: string
  name: string
  power: number
  type: PokemonType
  vfx: MoveVfx
}

type MoveOutcome = {
  critical: boolean
  damage: number
  effectiveness: number
  hit: boolean
  message: string
  sameTypeAttackBonus: boolean
}

const typeChart: Partial<Record<PokemonType, Partial<Record<PokemonType, number>>>> = {
  Normal: { Ghost: 0, Rock: 0.5 },
  Fire: { Bug: 2, Grass: 2, Ice: 2, Dragon: 0.5, Fire: 0.5, Rock: 0.5, Water: 0.5 },
  Water: { Fire: 2, Ground: 2, Rock: 2, Dragon: 0.5, Grass: 0.5, Water: 0.5 },
  Electric: { Flying: 2, Water: 2, Dragon: 0.5, Electric: 0.5, Grass: 0.5, Ground: 0 },
  Grass: {
    Ground: 2,
    Rock: 2,
    Water: 2,
    Bug: 0.5,
    Dragon: 0.5,
    Fire: 0.5,
    Flying: 0.5,
    Grass: 0.5,
    Poison: 0.5,
  },
  Ice: { Dragon: 2, Flying: 2, Grass: 2, Ground: 2, Fire: 0.5, Ice: 0.5, Water: 0.5 },
  Fighting: {
    Ice: 2,
    Normal: 2,
    Rock: 2,
    Bug: 0.5,
    Flying: 0.5,
    Poison: 0.5,
    Psychic: 0.5,
    Ghost: 0,
  },
  Poison: { Bug: 2, Grass: 2, Ghost: 0.5, Ground: 0.5, Poison: 0.5, Rock: 0.5 },
  Ground: { Electric: 2, Fire: 2, Poison: 2, Rock: 2, Bug: 0.5, Grass: 0.5, Flying: 0 },
  Flying: { Bug: 2, Fighting: 2, Grass: 2, Electric: 0.5, Rock: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5 },
  Bug: { Grass: 2, Poison: 2, Psychic: 2, Fighting: 0.5, Fire: 0.5, Flying: 0.5, Ghost: 0.5 },
  Rock: { Bug: 2, Fire: 2, Flying: 2, Ice: 2, Fighting: 0.5, Ground: 0.5 },
  Ghost: { Ghost: 2, Psychic: 0, Normal: 0 },
  Dragon: { Dragon: 2 },
}

const moveByType: Record<PokemonType, BattleMove[]> = {
  Normal: [
    { name: 'Tackle', type: 'Normal', power: 40, accuracy: 100, vfx: 'impact', description: 'Reliable physical hit.' },
    { name: 'Quick Attack', type: 'Normal', power: 40, accuracy: 100, vfx: 'slash', description: 'A swift physical strike.' },
  ],
  Fire: [
    { name: 'Ember', type: 'Fire', power: 40, accuracy: 100, vfx: 'fire', description: 'A small flame attack.' },
    { name: 'Flamethrower', type: 'Fire', power: 90, accuracy: 100, vfx: 'fire', description: 'A strong stream of fire.' },
  ],
  Water: [
    { name: 'Water Gun', type: 'Water', power: 40, accuracy: 100, vfx: 'water', description: 'A clean water blast.' },
    { name: 'Surf', type: 'Water', power: 90, accuracy: 100, vfx: 'water', description: 'A heavy wave attack.' },
  ],
  Electric: [
    { name: 'Thunder Shock', type: 'Electric', power: 40, accuracy: 100, vfx: 'electric', description: 'A jolt of electricity.' },
    { name: 'Thunderbolt', type: 'Electric', power: 90, accuracy: 100, vfx: 'electric', description: 'A powerful electric bolt.' },
  ],
  Grass: [
    { name: 'Vine Whip', type: 'Grass', power: 45, accuracy: 100, vfx: 'leaf', description: 'Whips with vines.' },
    { name: 'Razor Leaf', type: 'Grass', power: 55, accuracy: 95, vfx: 'leaf', description: 'Sharp leaves slice the target.' },
  ],
  Ice: [
    { name: 'Ice Beam', type: 'Ice', power: 90, accuracy: 100, vfx: 'water', description: 'A freezing beam.' },
  ],
  Fighting: [
    { name: 'Karate Chop', type: 'Fighting', power: 50, accuracy: 100, vfx: 'impact', description: 'A chopping strike.' },
    { name: 'Submission', type: 'Fighting', power: 80, accuracy: 80, vfx: 'impact', description: 'Heavy fighting damage.' },
  ],
  Poison: [
    { name: 'Poison Sting', type: 'Poison', power: 15, accuracy: 100, vfx: 'slash', description: 'Cheap poison jab.' },
    { name: 'Sludge', type: 'Poison', power: 65, accuracy: 100, vfx: 'ghost', description: 'A toxic sludge hit.' },
  ],
  Ground: [
    { name: 'Dig', type: 'Ground', power: 80, accuracy: 100, vfx: 'rock', description: 'A ground attack.' },
    { name: 'Earthquake', type: 'Ground', power: 100, accuracy: 100, vfx: 'rock', description: 'Huge ground damage.' },
  ],
  Flying: [
    { name: 'Gust', type: 'Flying', power: 40, accuracy: 100, vfx: 'slash', description: 'A sharp wind hit.' },
    { name: 'Wing Attack', type: 'Flying', power: 60, accuracy: 100, vfx: 'slash', description: 'A wing strike.' },
  ],
  Psychic: [
    { name: 'Confusion', type: 'Psychic', power: 50, accuracy: 100, vfx: 'psychic', description: 'A psychic pulse.' },
    { name: 'Psychic', type: 'Psychic', power: 90, accuracy: 100, vfx: 'psychic', description: 'A powerful mind attack.' },
  ],
  Bug: [
    { name: 'Leech Life', type: 'Bug', power: 20, accuracy: 100, vfx: 'slash', description: 'Small bug damage.' },
    { name: 'Twineedle', type: 'Bug', power: 50, accuracy: 100, vfx: 'slash', description: 'A double needle hit.' },
  ],
  Rock: [
    { name: 'Rock Throw', type: 'Rock', power: 50, accuracy: 90, vfx: 'rock', description: 'Throws a rock.' },
    { name: 'Rock Slide', type: 'Rock', power: 75, accuracy: 90, vfx: 'rock', description: 'Heavy rock damage.' },
  ],
  Ghost: [
    { name: 'Lick', type: 'Ghost', power: 30, accuracy: 100, vfx: 'ghost', description: 'A spooky contact move.' },
    { name: 'Night Shade', type: 'Ghost', power: 70, accuracy: 100, vfx: 'ghost', description: 'A ghostly strike.' },
  ],
  Dragon: [
    { name: 'Dragon Rage', type: 'Dragon', power: 70, accuracy: 100, vfx: 'fire', description: 'Classic dragon damage.' },
  ],
}

export function getEffectiveness(moveType: PokemonType, defenderTypes: string[]) {
  return defenderTypes.reduce((total, defenderType) => {
    return total * (typeChart[moveType]?.[defenderType as PokemonType] ?? 1)
  }, 1)
}

export function getBattleMovesForPokemon(pokemon: PokemonSpecies) {
  const typedMoves = pokemon.types.flatMap((type) => moveByType[type as PokemonType] ?? [])
  const moves = [...typedMoves, ...moveByType.Normal]
  const uniqueMoves = new Map(moves.map((move) => [move.name, move]))

  return [...uniqueMoves.values()].slice(0, 4)
}

export function chooseEnemyMove(pokemon: PokemonSpecies, defender: PokemonSpecies, turn: number) {
  const moves = getBattleMovesForPokemon(pokemon)
  const ranked = moves.map((move) => ({
    move,
    score: move.power * (move.accuracy / 100) * getEffectiveness(move.type, defender.types) *
      (pokemon.types.includes(move.type) ? 1.5 : 1),
  })).sort((a, b) => b.score - a.score)

  // Favor useful moves without repeating the same attack on every turn.
  return ranked[turn % 3 === 2 ? 1 : 0]?.move ?? ranked[0]?.move ?? moveByType.Normal[0]
}

function seededRoll(seed: string, turn: number) {
  const value = `${seed}-${turn}`.split('').reduce((total, character) => {
    return (total * 31 + character.charCodeAt(0)) % 10000
  }, 17)

  return value / 100
}

export function resolveMove({
  attacker,
  defender,
  move,
  seed,
  turn,
}: {
  attacker: PokemonSpecies
  defender: PokemonSpecies
  move: BattleMove
  seed: string
  turn: number
}): MoveOutcome {
  const roll = seededRoll(seed, turn)
  const hit = roll < move.accuracy

  if (!hit) {
    return {
      critical: false,
      damage: 0,
      effectiveness: 1,
      hit,
      message: `${attacker.name}'s ${move.name} missed!`,
      sameTypeAttackBonus: false,
    }
  }

  const effectiveness = getEffectiveness(move.type, defender.types)
  const sameTypeAttackBonus = attacker.types.includes(move.type)
  const critical = seededRoll(`${seed}-critical`, turn) >= 94
  const variance = 0.9 + seededRoll(`${seed}-variance`, turn) / 1000
  const baseDamage = move.power * 0.32 + 8
  const damage = Math.max(
    effectiveness === 0 ? 0 : 1,
    Math.round(
      baseDamage *
        (sameTypeAttackBonus ? 1.5 : 1) *
        effectiveness *
        (critical ? 1.7 : 1) *
        variance,
    ),
  )

  let message = ''

  if (effectiveness === 0) {
    message = "It doesn't affect the target."
  } else if (effectiveness > 1) {
    message = "It's super effective!"
  } else if (effectiveness < 1) {
    message = "It's not very effective."
  } else {
    message = `${move.name} hit!`
  }

  if (critical && effectiveness > 0) {
    message = `A critical hit! ${message}`
  }

  return {
    critical,
    damage,
    effectiveness,
    hit,
    message,
    sameTypeAttackBonus,
  }
}
