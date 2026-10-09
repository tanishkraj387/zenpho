import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/auth/AppHeader'
import { DialogBox } from '../components/ui/DialogBox'
import { HPBar } from '../components/ui/HPBar'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { Sprite } from '../components/ui/Sprite'
import { XPBar } from '../components/ui/XPBar'
import { getStarterPokemon } from '../lib/pokemon'
import { saveLocalStarterId } from '../lib/starter'

const starterProfiles: Record<
  number,
  {
    affinity: string
    description: string
    move: string
    nature: string
  }
> = {
  1: {
    affinity: 'Arrays / Trees',
    description: 'A steady partner that rewards careful setup and clean growth.',
    move: 'Seed Debug',
    nature: 'Patient',
  },
  4: {
    affinity: 'Strings / Math',
    description: 'A bold partner that turns direct ideas into fast attacks.',
    move: 'Flame Refactor',
    nature: 'Brave',
  },
  7: {
    affinity: 'Graphs / DP',
    description: 'A calm partner that protects drafts while you test ideas.',
    move: 'Shell Trace',
    nature: 'Focused',
  },
}

export function Starter() {
  const navigate = useNavigate()
  const starters = useMemo(() => getStarterPokemon(), [])
  const [selectedId, setSelectedId] = useState(starters[0]?.id ?? 1)
  const selectedStarter = starters.find((starter) => starter.id === selectedId) ?? starters[0]
  const selectedProfile = starterProfiles[selectedStarter.id]

  function chooseStarter() {
    saveLocalStarterId(selectedStarter.id)
    navigate('/hub', { replace: true })
  }

  return (
    <main className="min-h-screen bg-sky font-pixel text-ink">
      <AppHeader coins={245} />
      <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <PixelCard bodyClassName="p-4 sm:p-5" title="Starter Lab">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <p className="font-heading text-[10px] uppercase leading-relaxed">
                Professor route
              </p>
              <h1 className="font-heading text-2xl leading-relaxed sm:text-3xl">
                Choose your first coding partner
              </h1>
              <p className="max-w-3xl text-xl leading-relaxed">
                This is still a local prototype choice. Later, the server will
                create the real starter creature and own the permanent record.
              </p>
            </div>
            <DialogBox
              className="min-h-0 text-[10px]"
              speed={20}
              text={`So, ${selectedStarter.name}? ${selectedProfile.description}`}
            />
          </div>
        </PixelCard>

        <div className="grid gap-5 lg:grid-cols-3">
          {starters.map((starter) => {
            const profile = starterProfiles[starter.id]
            const isSelected = selectedId === starter.id

            return (
              <button
                aria-pressed={isSelected}
                className={[
                  'pixel-focus flex min-h-[360px] flex-col border-4 border-ink bg-cream p-4 text-left shadow-[6px_6px_0_#1a1c2c]',
                  'transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none',
                  isSelected ? 'outline-4 outline-offset-4 outline-warning' : '',
                ].join(' ')}
                key={starter.id}
                onClick={() => setSelectedId(starter.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-[9px] uppercase leading-relaxed">
                      #{String(starter.id).padStart(3, '0')}
                    </p>
                    <h2 className="mt-2 font-heading text-sm leading-relaxed">
                      {starter.name}
                    </h2>
                  </div>
                  <span className="border-4 border-ink bg-white px-2 py-1 font-heading text-[9px] uppercase">
                    {isSelected ? 'Pick' : 'View'}
                  </span>
                </div>

                <div className="my-4 flex h-32 items-center justify-center border-4 border-ink bg-white">
                  <Sprite
                    alt={`${starter.name} front sprite`}
                    className="h-28 w-28 object-contain"
                    id={starter.id}
                    type="front"
                  />
                </div>

                <div className="space-y-3 text-xl">
                  <p>{starter.types.join(' / ')}</p>
                  <p>
                    <span className="font-heading text-[9px] uppercase">Affinity</span>
                    <br />
                    {profile.affinity}
                  </p>
                  <p>
                    <span className="font-heading text-[9px] uppercase">First move</span>
                    <br />
                    {profile.move}
                  </p>
                </div>

                <div className="mt-auto space-y-3 pt-5">
                  <HPBar current={44 + starter.id} label={starter.name} level={5} max={50} />
                  <XPBar current={starter.id * 12} label={profile.nature} max={100} />
                </div>
              </button>
            )
          })}
        </div>

        <PixelCard bodyClassName="p-4 sm:p-5" title="Confirm Starter">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-heading text-[10px] uppercase leading-relaxed">
                Selected
              </p>
              <p className="mt-2 text-2xl">
                {selectedStarter.name} will join your party as your first
                prototype partner.
              </p>
            </div>
            <PixelButton className="w-full lg:w-auto" onClick={chooseStarter}>
              Choose {selectedStarter.name}
            </PixelButton>
          </div>
        </PixelCard>
      </section>
    </main>
  )
}
