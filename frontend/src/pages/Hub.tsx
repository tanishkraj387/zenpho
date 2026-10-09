import { Link } from 'react-router-dom'
import { AppHeader } from '../components/auth/AppHeader'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { Sprite } from '../components/ui/Sprite'
import { TypeBadge, type TopicType } from '../components/ui/TypeBadge'
import { XPBar } from '../components/ui/XPBar'
import {
  getEncounterPool,
  getPokemonWithSprites,
  getRarityLabel,
  pokemonSpecies,
} from '../lib/pokemon'
import { getUsername, useAuthStore } from '../store/authStore'

type NavAction = {
  label: string
  to: string
  variant?: 'primary' | 'secondary'
}

const trainerStats = {
  coins: 245,
  energy: {
    current: 37,
    max: 50,
  },
  pokedex: {
    caught: 6,
    seen: 14,
    total: pokemonSpecies.length,
  },
  milestone: {
    label: 'Next milestone',
    title: 'Solve 5 Easy questions',
    progress: 3,
    max: 5,
    reward: 'Guaranteed common encounter',
  },
}

const navActions: NavAction[] = [
  { label: 'Battle', to: '/battle' },
  { label: 'Practice', to: '/practice', variant: 'secondary' },
  { label: 'Shop', to: '/shop', variant: 'secondary' },
  { label: 'Gyms', to: '/gyms', variant: 'secondary' },
  { label: 'Pokedex', to: '/collection', variant: 'secondary' },
  { label: 'Leaderboard', to: '/leaderboard', variant: 'secondary' },
]

const partyPokemon = [1, 4, 7]
  .map((id) => pokemonSpecies.find((pokemon) => pokemon.id === id))
  .filter((pokemon): pokemon is NonNullable<typeof pokemon> => Boolean(pokemon))
  .map(getPokemonWithSprites)

const pokedexPreview = [25, 54, 63, 92, 129, 133]
  .map((id) => pokemonSpecies.find((pokemon) => pokemon.id === id))
  .filter((pokemon): pokemon is NonNullable<typeof pokemon> => Boolean(pokemon))
  .map(getPokemonWithSprites)

const hardPreview = getEncounterPool('hard').slice(0, 4)
const topicBadges: TopicType[] = ['Arrays', 'Strings', 'Graphs', 'Trees', 'DP', 'Math']

function StatTile({
  label,
  value,
  detail,
}: {
  detail: string
  label: string
  value: string
}) {
  return (
    <article className="border-4 border-ink bg-white p-3 shadow-[4px_4px_0_#1a1c2c]">
      <p className="font-heading text-[9px] uppercase leading-relaxed">{label}</p>
      <p className="mt-2 font-heading text-lg">{value}</p>
      <p className="mt-1 text-lg leading-tight">{detail}</p>
    </article>
  )
}

export function Hub() {
  const user = useAuthStore((state) => state.user)
  const username = getUsername(user)
  const pokedexPercent = Math.round(
    (trainerStats.pokedex.caught / trainerStats.pokedex.total) * 100,
  )

  return (
    <main className="min-h-screen bg-sky font-pixel text-ink">
      <AppHeader coins={trainerStats.coins} />
      <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <PixelCard bodyClassName="p-4 sm:p-5" title="Trainer Hub">
            <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
              <div className="space-y-4">
                <div>
                  <p className="font-heading text-[10px] uppercase leading-relaxed">
                    Welcome back, {username}
                  </p>
                  <h1 className="mt-3 font-heading text-2xl leading-relaxed sm:text-3xl">
                    Choose your next encounter
                  </h1>
                </div>
                <p className="max-w-3xl text-xl leading-relaxed">
                  Solve coding questions to weaken wild Pokemon, catch them with
                  balls from the shop, and fill your Pokedex one route at a time.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {navActions.map((action) => (
                    <Link className="min-w-0" key={action.to} to={action.to}>
                      <PixelButton
                        className="box-border flex min-h-14 w-full items-center justify-center px-5 text-center whitespace-nowrap"
                        variant={action.variant}
                      >
                        {action.label}
                      </PixelButton>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="border-4 border-ink bg-white p-4">
                <p className="font-heading text-[10px] uppercase leading-relaxed">
                  Active Route
                </p>
                <div className="mt-4 flex items-end justify-center gap-4">
                  <Sprite
                    alt="Bulbasaur back sprite"
                    className="h-24 w-24 object-contain"
                    id={1}
                    type="back"
                  />
                  <Sprite
                    alt="Pikachu front sprite"
                    className="h-24 w-24 object-contain"
                    id={25}
                    type="front"
                  />
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {topicBadges.slice(0, 3).map((topic) => (
                    <TypeBadge key={topic} type={topic} />
                  ))}
                </div>
              </div>
            </div>
          </PixelCard>

          <PixelCard bodyClassName="space-y-4 p-4 sm:p-5" title="Resources">
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <StatTile
                detail="Spend on balls, potions, and revives."
                label="Coins"
                value={String(trainerStats.coins)}
              />
              <StatTile
                detail="Drains from runs, submits, and hard encounters."
                label="Energy"
                value={`${trainerStats.energy.current}/${trainerStats.energy.max}`}
              />
              <StatTile
                detail={`${trainerStats.pokedex.seen} seen across the current roster.`}
                label="Pokedex"
                value={`${pokedexPercent}%`}
              />
            </div>
          </PixelCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <PixelCard bodyClassName="p-4 sm:p-5" title="Current Party">
            <div className="grid gap-4 lg:grid-cols-3">
              {partyPokemon.map((pokemon, index) => (
                <article
                  className="flex min-h-[220px] min-w-0 flex-col border-4 border-ink bg-white p-4 shadow-[4px_4px_0_#1a1c2c]"
                  key={pokemon.id}
                >
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_80px] items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-heading text-[9px] uppercase">Slot {index + 1}</p>
                      <h2 className="mt-2 font-heading text-[11px] leading-relaxed">
                        {pokemon.name}
                      </h2>
                    </div>
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center border-4 border-ink bg-cream">
                      <Sprite
                        alt={`${pokemon.name} icon`}
                        className="h-16 w-16 object-contain"
                        id={pokemon.id}
                        type="icon"
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-lg">{pokemon.types.join(' / ')}</p>
                  <div className="mt-auto pt-4">
                    <XPBar current={40 + index * 18} label="Bond" max={100} />
                  </div>
                </article>
              ))}
            </div>
          </PixelCard>

          <PixelCard bodyClassName="p-4 sm:p-5" title="Next Milestone">
            <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
              <div className="space-y-3">
                <p className="font-heading text-[10px] uppercase leading-relaxed">
                  {trainerStats.milestone.label}
                </p>
                <h2 className="font-heading text-xl leading-relaxed">
                  {trainerStats.milestone.title}
                </h2>
                <p className="text-xl leading-relaxed">{trainerStats.milestone.reward}</p>
                <XPBar
                  current={trainerStats.milestone.progress}
                  label="Progress"
                  max={trainerStats.milestone.max}
                />
              </div>
              <div className="border-4 border-ink bg-white p-3 text-center">
                <Sprite
                  alt="Rare encounter preview"
                  className="mx-auto h-24 w-24 object-contain"
                  id={133}
                  type="front"
                />
                <p className="mt-2 font-heading text-[10px] uppercase">Reward Preview</p>
                <p className="mt-1 text-lg">Catch chance unlock</p>
              </div>
            </div>
          </PixelCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <PixelCard bodyClassName="p-4 sm:p-5" title="Pokedex Preview">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {pokedexPreview.map((pokemon, index) => (
                <article
                  className="border-4 border-ink bg-white p-3 text-center"
                  key={pokemon.id}
                >
                  <Sprite
                    alt={`${pokemon.name} icon`}
                    className="mx-auto h-14 w-14 object-contain"
                    id={pokemon.id}
                    type="icon"
                  />
                  <h2 className="mt-2 font-heading text-[9px] leading-relaxed">
                    {pokemon.name}
                  </h2>
                  <p className="mt-1 text-base">
                    {index < 3 ? 'Caught' : 'Seen'}
                  </p>
                </article>
              ))}
            </div>
          </PixelCard>

          <PixelCard bodyClassName="p-4 sm:p-5" title="Hard Encounter Watch">
            <div className="grid gap-3 sm:grid-cols-2">
              {hardPreview.map((pokemon) => (
                <article
                  className="grid grid-cols-[56px_1fr] items-center gap-3 border-4 border-ink bg-white p-3"
                  key={pokemon.id}
                >
                  <Sprite
                    alt={`${pokemon.name} icon`}
                    className="h-14 w-14 object-contain"
                    id={pokemon.id}
                    type="icon"
                  />
                  <div>
                    <h2 className="font-heading text-[10px] leading-relaxed">
                      {pokemon.name}
                    </h2>
                    <p className="text-lg">{getRarityLabel(pokemon.rarity)}</p>
                    <p className="text-base">{pokemon.types.join(' / ')}</p>
                  </div>
                </article>
              ))}
            </div>
          </PixelCard>
        </div>
      </section>
    </main>
  )
}
