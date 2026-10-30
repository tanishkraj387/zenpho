import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/auth/AppHeader'
import { Modal } from '../components/ui/Modal'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { Sprite } from '../components/ui/Sprite'
import { useCollectionEntries } from '../hooks/useCollectionEntries'
import { useOwnedCreatures } from '../hooks/useOwnedCreatures'
import { usePlayerParty } from '../hooks/usePlayerParty'
import { usePlayerSummary } from '../hooks/usePlayerSummary'
import { useShopSummary } from '../hooks/useShopSummary'
import { useAudioStore } from '../lib/audio'
import { applyHealingItem, setPartySlot } from '../lib/party'
import type { CollectionStatus } from '../lib/collection'
import {
  getPokemonWithSprites,
  getRarityLabel,
  type PokemonRarity,
  pokemonSpecies,
} from '../lib/pokemon'

type CollectionFilter = 'all' | CollectionStatus

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
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<CollectionFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(null)
  const collectionEntries = useCollectionEntries()
  const ownedCreatures = useOwnedCreatures()
  const playerParty = usePlayerParty()
  const [pendingSlot, setPendingSlot] = useState<number | null>(null)
  const [partyError, setPartyError] = useState('')
  const [healTargetId, setHealTargetId] = useState<string | null>(null)
  const [pendingHeal, setPendingHeal] = useState(false)
  const shopSummary = useShopSummary()
  const playerSummary = usePlayerSummary()
  const playPokemonCry = useAudioStore((state) => state.playPokemonCry)
  const entries = collectionEntries.data ?? {}

  const collection = useMemo(
    () =>
      pokemonSpecies.map((pokemon) => ({
        ...getPokemonWithSprites(pokemon),
        collection: entries[pokemon.id] ?? { status: 'unknown' as const },
      })),
    [entries],
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

  async function changePartySlot(slot: number, creatureId: string | null) {
    setPendingSlot(slot)
    setPartyError('')
    try {
      await setPartySlot(slot, creatureId)
      await queryClient.invalidateQueries({ queryKey: ['player-party'] })
    } catch (error) {
      setPartyError(error instanceof Error ? error.message : 'Could not update your party.')
    } finally {
      setPendingSlot(null)
    }
  }

  async function healCreature(itemKey: string) {
    if (!healTargetId || pendingHeal) return
    setPendingHeal(true)
    setPartyError('')
    try {
      await applyHealingItem(healTargetId, itemKey)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['player-party'] }),
        queryClient.invalidateQueries({ queryKey: ['owned-creatures'] }),
        queryClient.invalidateQueries({ queryKey: ['shop-summary'] }),
      ])
      setHealTargetId(null)
    } catch (error) {
      setPartyError(error instanceof Error ? error.message : 'Could not use this item.')
    } finally {
      setPendingHeal(false)
    }
  }

  return (
    <main className="min-h-screen bg-sky font-pixel text-ink">
      <AppHeader coins={playerSummary.data?.coins ?? 0} />
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
              {collectionEntries.isError ? (
                <p className="border-4 border-ink bg-warning p-3 text-lg">
                  Your Pokedex could not be loaded. Please refresh to try again.
                </p>
              ) : null}
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

        <PixelCard bodyClassName="space-y-4 p-4 sm:p-5" title="Your Party · 6 Slots">
          <p className="text-lg">Choose up to six caught Pokemon for battle. HP stays with each Pokemon between encounters.</p>
          {partyError ? <p className="border-4 border-danger bg-white p-3 text-danger" role="alert">{partyError}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => {
              const slot = index + 1
              const member = playerParty.data?.find((pokemon) => pokemon.slot === slot)
              return (
                <div className="grid grid-cols-[64px_1fr] items-center gap-3 border-4 border-ink bg-white p-3" key={slot}>
                  <div className="flex h-16 w-16 items-center justify-center border-2 border-ink bg-cream">
                    {member ? <Sprite alt="" className="h-12 w-12 object-contain" id={member.id} type="icon" /> : <span className="font-heading text-lg">{slot}</span>}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <label className="block font-heading text-[9px]" htmlFor={`party-slot-${slot}`}>Slot {slot}</label>
                    <select
                      className="pixel-focus w-full border-2 border-ink bg-cream p-1 text-base"
                      disabled={pendingSlot !== null || ownedCreatures.isLoading}
                      id={`party-slot-${slot}`}
                      onChange={(event) => void changePartySlot(slot, event.target.value || null)}
                      value={member?.creatureId ?? ''}
                    >
                      <option value="">Empty</option>
                      {(ownedCreatures.data ?? []).map((pokemon) => (
                        <option key={pokemon.creatureId} value={pokemon.creatureId}>{pokemon.name} · Lv {pokemon.level} · {pokemon.currentHp}/{pokemon.maxHp} HP</option>
                      ))}
                    </select>
                    {member ? <div className="flex items-center justify-between gap-2"><p className="text-sm">{member.currentHp}/{member.maxHp} HP{member.currentHp === 0 ? ' · Fainted' : ''}</p><button className="pixel-focus border-2 border-ink bg-warning px-2 text-sm disabled:opacity-50" disabled={member.currentHp === member.maxHp} onClick={() => setHealTargetId(member.creatureId)} type="button">Heal</button></div> : null}
                    {member ? <div aria-label={`${member.name}: ${member.currentHp} of ${member.maxHp} HP`} className="h-3 overflow-hidden border-2 border-ink bg-cream" role="progressbar" aria-valuemin={0} aria-valuemax={member.maxHp} aria-valuenow={member.currentHp}><div className={`h-full ${member.currentHp / member.maxHp <= 0.25 ? 'bg-danger' : member.currentHp / member.maxHp <= 0.5 ? 'bg-warning' : 'bg-hp-green'}`} style={{ width: `${member.currentHp / member.maxHp * 100}%` }} /></div> : null}
                  </div>
                </div>
              )
            })}
          </div>
        </PixelCard>

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
                onClick={() => {
                  setSelectedPokemonId(pokemon.id)
                  playPokemonCry(pokemon.id)
                }}
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

      {selectedPokemon ? (
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
            </div>
          </div>
        </Modal>
      ) : null}
      <Modal isOpen={healTargetId !== null} onClose={() => setHealTargetId(null)} title="Heal your Pokemon">
        {partyError ? <p role="alert" className="border-4 border-danger bg-white p-2 text-danger">{partyError}</p> : null}
        {(() => {
          const target = playerParty.data?.find((pokemon) => pokemon.creatureId === healTargetId)
          if (!target) return <p>Choose a Pokemon from your party.</p>
          return <div className="space-y-3">
            <p>{target.name} · {target.currentHp}/{target.maxHp} HP</p>
            {(shopSummary.data?.items ?? []).filter((item) => item.category === 'healing').map((item) => {
              const revive = item.itemKey === 'revive' || item.itemKey === 'max-revive'
              const applicable = revive ? target.currentHp === 0 : target.currentHp > 0 && target.currentHp < target.maxHp
              return <button className="pixel-focus block w-full border-4 border-ink bg-cream p-3 text-left hover:bg-warning disabled:opacity-50"
                disabled={!applicable || item.owned < 1 || pendingHeal} key={item.itemKey}
                onClick={() => void healCreature(item.itemKey)} type="button">
                <span className="block font-heading text-[9px]">{item.name} · {item.owned} owned</span>
                <span>{item.effect}</span>
              </button>
            })}
            <Link className="pixel-focus inline-block border-b-2 border-ink" to="/shop">Visit the shop</Link>
          </div>
        })()}
      </Modal>
    </main>
  )
}
