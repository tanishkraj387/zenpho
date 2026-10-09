# Pokemon Data Pipeline Plan

## Goal

Create a local data pipeline that gives the frontend and future backend seed scripts consistent Pokemon metadata:

- original Pokemon names
- Pokedex IDs
- types
- rarity
- sprite paths
- optional cry/audio paths
- encounter tiers

## Inputs

### Existing Local Sprite Assets

Already copied under:

- `frontend/public/sprites/battle/front/{id}.gif`
- `frontend/public/sprites/battle/back/{id}.gif`
- `frontend/public/sprites/battle/shiny/{id}.gif`
- `frontend/public/sprites/icons/{id}.png`
- `frontend/public/sprites/items/{name}.png`

Roster source:

- `frontend/sprite-ids.json`

### Pokemon Metadata

Use original names and types from PokéAPI-derived data.

Preferred future options:

1. Generate metadata from PokéAPI once and commit a small static JSON file.
2. Use a local checked-in seed file for the first roster.
3. Avoid runtime API dependence for the game UI.

## Output Files

### `frontend/src/data/pokemon-roster.json`

Shape:

```json
[
  {
    "id": 1,
    "name": "Bulbasaur",
    "types": ["Grass", "Poison"],
    "rarity": "common",
    "isLegendary": false,
    "sprites": {
      "front": "/sprites/battle/front/1.gif",
      "back": "/sprites/battle/back/1.gif",
      "shiny": "/sprites/battle/shiny/1.gif",
      "icon": "/sprites/icons/1.png"
    },
    "cry": null
  }
]
```

### `frontend/src/data/encounter-tiers.json`

Maps difficulty/topic to encounter pools.

Example shape:

```json
{
  "easy": {
    "common": [1, 4, 7, 25, 54],
    "uncommon": [63, 66, 74]
  },
  "medium": {
    "uncommon": [64, 67, 75, 93],
    "rare": [26, 94, 130, 143]
  },
  "hard": {
    "rare": [65, 68, 76, 149],
    "legendary": [150]
  }
}
```

## Rarity Rules

Initial tiers:

- `common`: early/basic encounters
- `uncommon`: evolved or stronger route encounters
- `rare`: high-value or iconic encounters
- `legendary`: milestone plus hard-question gated

Difficulty mapping:

- Easy: common, small uncommon chance
- Medium: uncommon, rare chance
- Hard: rare, legendary chance only if milestone requirements are met

## Topic Flavor Mapping

Topics influence encounter flavor but should not hard-lock too aggressively at first.

- Arrays: Normal, Grass, Water, Electric
- Strings: Normal, Psychic, Fairy-style flavor if added later
- Graphs: Electric, Ghost, Psychic
- Trees: Grass, Bug, Ground
- DP: Psychic, Dragon, Legendary-style
- Math: Rock, Psychic, Electric

## Starter Plan

Initial starter choice can be:

- Bulbasaur
- Charmander
- Squirtle

These are already in the roster as IDs `1`, `4`, and `7`.

Starter selection should create:

- `player_pokemon` row
- `pokedex_entries` caught row
- `player_party` active slot row

Server should perform the write.

## Audio Plan

Pokemon cries:

- Optional for local prototype.
- Keep paths nullable until cry assets are approved and copied.

Background music:

- Prefer original chiptune loops inspired by classic handheld RPGs.
- Do not depend on official Pokemon music for public builds.

## Next Implementation Slice

Step 3 implementation should create:

1. `frontend/src/data/pokemon-roster.json`
2. `frontend/src/data/encounter-tiers.json`
3. TypeScript helpers for reading roster data
4. A small `/pokedex-preview` or updated Hub preview using static local data

No Supabase writes yet.
