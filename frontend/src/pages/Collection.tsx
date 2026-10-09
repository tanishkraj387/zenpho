import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/auth/AppHeader'
import { Modal } from '../components/ui/Modal'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { Sprite } from '../components/ui/Sprite'
import {
  getPokemonWithSprites,
  getRarityLabel,
  type PokemonRarity,
  pokemonSpecies,
} from '../lib/pokemon'

type CollectionStatus = 'caught' | 'seen' | 'unknown'
type CollectionFilter = 'all' | CollectionStatus

type CollectionEntry = {
  affinity?: string
  caughtAt?: string
  source?: string
  status: CollectionStatus
}

const mockCollection: Record<number, CollectionEntry> = {
  1: {
    affinity: 'Arrays',
    caughtAt: 'Today',
    source: 'Starter choice',
    status: 'caught',
  },
  4: {
    affinity: 'Strings',
    caughtAt: 'Route: Easy Arrays',
    source: 'Milestone reward',
    status: 'caught',
  },
  7: {
    affinity: 'Math',
    caughtAt: 'Practice route',
    source: 'Starter preview',
    status: 'caught',
  },
  25: {
    affinity: 'Strings',
    caughtAt: 'Route: Strings 01',
    source: 'Question encounter',
    status: 'caught',
  },
  54: {
    affinity: 'Arrays',
    caughtAt: 'Route: Arrays 02',
    source: 'Question encounter',
    status: 'caught',
  },
  63: {
    affinity: 'Graphs',
    caughtAt: 'Route: Graphs 01',
    source: 'Question encounter',
    status: 'caught',
  },
  92: {
    affinity: 'Graphs',
    source: 'Wild encounter',
    status: 'seen',
  },
  129: {
    affinity: 'Practice',
    source: 'Practice encounter',
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
    source: 'Legendary milestone',
    status: 'seen',
  },
}

const filterOptions: { label: string; value: CollectionFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Caught', value: 'caught' },
  { label: 'Seen', value: 'seen' },
  { label: 'Unknown', value: 'unknown' },
]

const rarityClasses: Record<PokemonRarity, string> = {
  common: 'bg-grass text-cream',
  uncommon: 'bg-sky text-ink',
  rare: 'bg-warning text-ink',
  legendary: 'bg-danger text-cream',
}

const statusClasses: Record<CollectionStatus, string> = {
  caught: 'bg-grass text-cream',
  seen: 'bg-warning text-ink',
  unknown: 'bg-ink text-cream',
}

function getCollectionEntry(id: number): CollectionEntry {
  return mockCollection[id] ?? { status: 'unknown' }
}

function getDisplayStats(id: number) {
  return {
    attack: 30 + ((id * 7) % 70),
    defense: 28 + ((id * 11) % 72),
    focus: 35 + ((id * 5) % 65),
  }
}

function StatusPill({ status }: { status: CollectionStatus }) {
  return (
    <span
      className={`border-4 border-ink px-2 py-1 font-heading text-[9px] uppercase ${statusClasses[status]}`}
    >
      {status}
    </span>
  )
}

export function Collection() {
  const [filter, setFilter] = useState<CollectionFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(null)

  const collection = useMemo(
    () =>
      pokemonSpecies.map((pokemon) => ({
        ...getPokemonWithSprites(pokemon),
        collection: getCollectionEntry(pokemon.id),
      })),
    [],
  )

  const caughtCount = collection.filter((pokemon) => pokemon.collection.status === 'caught').length
  const seenCount = collection.filter((pokemon) => pokemon.collection.status === 'seen').length
  const filteredCollection = collection.filter((pokemon) => {
    const matchesFilter = filter === 'all' || pokemon.collection.status === filter
    const searchValue = search.trim().toLowerCase()
    const matchesSearch =
      !searchValue ||
      pokemon.name.toLowerCase().includes(searchValue) ||
      String(pokemon.id).includes(searchValue) ||
      pokemon.types.some((type) => type.toLowerCase().includes(searchValue))

    return matchesFilter && matchesSearch
  })
  const selectedPokemon = collection.find((pokemon) => pokemon.id === selectedPokemonId)
  const selectedStats = selectedPokemon ? getDisplayStats(selectedPokemon.id) : null

  return (
    <main className="min-h-screen bg-sky font-pixel text-ink">
      <AppHeader coins={245} />
      <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <PixelCard bodyClassName="p-4 sm:p-5" title="Pokedex">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-3">
              <p className="font-heading text-[10px] uppercase leading-relaxed">
                Collection
              </p>
              <h1 className="font-heading text-2xl leading-relaxed sm:text-3xl">
                Track every encounter
              </h1>
              <p className="max-w-3xl text-xl leading-relaxed">
                Caught Pokemon show their full entry. Seen Pokemon reveal their
                name and source. Unknown Pokemon stay shadowed until the player
                meets them in battle.
              </p>
            </div>
            <Link to="/hub">
              <PixelButton className="w-full sm:w-auto" variant="secondary">
                Back to Hub
              </PixelButton>
            </Link>
          </div>
        </PixelCard>

        <div className="grid gap-4 md:grid-cols-3">
          <PixelCard bodyClassName="p-4" title="Caught">
            <p className="font-heading text-2xl">{caughtCount}</p>
            <p className="mt-2 text-xl">Added to your collection.</p>
          </PixelCard>
          <PixelCard bodyClassName="p-4" title="Seen">
            <p className="font-heading text-2xl">{seenCount}</p>
            <p className="mt-2 text-xl">Known, but not caught yet.</p>
          </PixelCard>
          <PixelCard bodyClassName="p-4" title="Roster">
            <p className="font-heading text-2xl">{collection.length}</p>
            <p className="mt-2 text-xl">Pokemon in the current game roster.</p>
          </PixelCard>
        </div>

        <PixelCard bodyClassName="space-y-4 p-4 sm:p-5" title="Filters">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="font-heading text-[10px] uppercase">Search</span>
              <input
                className="pixel-focus mt-2 w-full border-4 border-ink bg-white p-3 text-xl"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, number, or type"
                type="search"
                value={search}
              />
            </label>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              {filterOptions.map((option) => (
                <PixelButton
                  className="min-h-12 px-3 py-2"
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  variant={filter === option.value ? 'primary' : 'secondary'}
                >
                  {option.label}
                </PixelButton>
              ))}
            </div>
          </div>
        </PixelCard>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {filteredCollection.map((pokemon) => {
            const isUnknown = pokemon.collection.status === 'unknown'
            const isCaught = pokemon.collection.status === 'caught'
            const canOpenDetails = !isUnknown

            return (
              <button
                aria-label={
                  canOpenDetails
                    ? `Open ${pokemon.name} details`
                    : `Unknown Pokemon number ${pokemon.id}`
                }
                className={[
                  'pixel-focus flex min-h-[150px] flex-col items-center justify-between border-4 border-ink bg-cream p-3 text-center shadow-[4px_4px_0_#1a1c2c]',
                  'transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none',
                  isUnknown ? 'cursor-default opacity-80' : 'cursor-pointer',
                ].join(' ')}
                disabled={!canOpenDetails}
                key={pokemon.id}
                onClick={() => setSelectedPokemonId(pokemon.id)}
                type="button"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <p className="font-heading text-[8px] uppercase leading-relaxed">
                    #{String(pokemon.id).padStart(3, '0')}
                  </p>
                  <StatusPill status={pokemon.collection.status} />
                </div>

                <div className="my-2 flex h-16 w-full items-center justify-center border-4 border-ink bg-white">
                  {isUnknown ? (
                    <div className="font-heading text-2xl text-ink">?</div>
                  ) : (
                    <Sprite
                      alt={`${pokemon.name} front sprite`}
                      className={isCaught ? 'h-14 w-14 object-contain' : 'h-14 w-14 object-contain opacity-60 grayscale'}
                      id={pokemon.id}
                      type="front"
                    />
                  )}
                </div>

                <h2 className="font-heading text-[9px] leading-relaxed">
                  {isUnknown ? '?????' : pokemon.name}
                </h2>
              </button>
            )
          })}
        </div>
      </section>

      {selectedPokemon && selectedStats ? (
        <Modal
          isOpen
          onClose={() => setSelectedPokemonId(null)}
          title={selectedPokemon.name}
        >
          <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
            <div className="border-4 border-ink bg-white p-4 text-center">
              <Sprite
                alt={`${selectedPokemon.name} front sprite`}
                className="mx-auto h-24 w-24 object-contain"
                id={selectedPokemon.id}
                type="front"
              />
              <p className="mt-3 font-heading text-[10px]">
                #{String(selectedPokemon.id).padStart(3, '0')}
              </p>
            </div>
            <div className="space-y-4 text-xl">
              <div className="flex flex-wrap gap-2">
                <StatusPill status={selectedPokemon.collection.status} />
                <span
                  className={`border-4 border-ink px-2 py-1 font-heading text-[9px] uppercase ${rarityClasses[selectedPokemon.rarity]}`}
                >
                  {getRarityLabel(selectedPokemon.rarity)}
                </span>
                {selectedPokemon.isLegendary ? (
                  <span className="border-4 border-ink bg-danger px-2 py-1 font-heading text-[9px] uppercase text-cream">
                    Legendary
                  </span>
                ) : null}
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="font-heading text-[9px] uppercase">Type</dt>
                  <dd>{selectedPokemon.types.join(' / ')}</dd>
                </div>
                <div>
                  <dt className="font-heading text-[9px] uppercase">Affinity</dt>
                  <dd>{selectedPokemon.collection.affinity ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="font-heading text-[9px] uppercase">Source</dt>
                  <dd>{selectedPokemon.collection.source ?? 'Not encountered yet'}</dd>
                </div>
                <div>
                  <dt className="font-heading text-[9px] uppercase">
                    {selectedPokemon.collection.status === 'caught' ? 'Caught' : 'Last seen'}
                  </dt>
                  <dd>
                    {selectedPokemon.collection.caughtAt ??
                      (selectedPokemon.collection.status === 'seen'
                        ? 'Catch attempt pending'
                        : 'Find through encounters')}
                  </dd>
                </div>
              </dl>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border-4 border-ink bg-white p-3">
                  <p className="font-heading text-[9px] uppercase">Attack</p>
                  <p className="mt-1 font-heading text-lg">{selectedStats.attack}</p>
                </div>
                <div className="border-4 border-ink bg-white p-3">
                  <p className="font-heading text-[9px] uppercase">Defense</p>
                  <p className="mt-1 font-heading text-lg">{selectedStats.defense}</p>
                </div>
                <div className="border-4 border-ink bg-white p-3">
                  <p className="font-heading text-[9px] uppercase">Focus</p>
                  <p className="mt-1 font-heading text-lg">{selectedStats.focus}</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  )
}
