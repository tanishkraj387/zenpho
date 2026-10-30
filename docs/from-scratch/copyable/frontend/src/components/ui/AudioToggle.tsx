import { useState } from 'react'
import { useAudioStore } from '../../lib/audio'

function statusLabel(status: 'unknown' | 'loading' | 'available' | 'missing') {
  if (status === 'available') {
    return 'Ready'
  }

  if (status === 'loading') {
    return 'Loading'
  }

  if (status === 'missing') {
    return 'Fallback'
  }

  return 'Idle'
}

export function AudioToggle() {
  const [isOpen, setIsOpen] = useState(false)
  const enabled = useAudioStore((state) => state.enabled)
  const bgmStatus = useAudioStore((state) => state.bgmStatus)
  const bgmVolume = useAudioStore((state) => state.bgmVolume)
  const cryStatus = useAudioStore((state) => state.cryStatus)
  const sfxVolume = useAudioStore((state) => state.sfxVolume)
  const setBgmVolume = useAudioStore((state) => state.setBgmVolume)
  const setSfxVolume = useAudioStore((state) => state.setSfxVolume)
  const toggleAudio = useAudioStore((state) => state.toggleAudio)
  const label = enabled ? 'Audio On' : 'Audio Off'

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-pressed={enabled}
        className="pixel-focus border-4 border-ink bg-cream px-2 py-1 font-heading text-[10px]"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {label}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 border-4 border-ink bg-cream p-3 text-ink shadow-[4px_4px_0_#1a1c2c]">
          <div className="grid gap-3">
            <button
              aria-pressed={enabled}
              className="pixel-focus border-4 border-ink bg-grass px-3 py-2 font-heading text-[10px] text-cream shadow-[3px_3px_0_#1a1c2c]"
              onClick={toggleAudio}
              type="button"
            >
              {enabled ? 'Disable Audio' : 'Enable Audio'}
            </button>

            <label className="grid gap-2">
              <span className="font-heading text-[9px] uppercase">
                Music {Math.round(bgmVolume * 100)}%
              </span>
              <input
                aria-label="Music volume"
                className="pixel-focus w-full accent-[#42a82f]"
                max="1"
                min="0"
                onChange={(event) => setBgmVolume(Number(event.target.value))}
                step="0.05"
                type="range"
                value={bgmVolume}
              />
            </label>

            <label className="grid gap-2">
              <span className="font-heading text-[9px] uppercase">
                SFX / Cries {Math.round(sfxVolume * 100)}%
              </span>
              <input
                aria-label="SFX and cry volume"
                className="pixel-focus w-full accent-[#42a82f]"
                max="1"
                min="0"
                onChange={(event) => setSfxVolume(Number(event.target.value))}
                step="0.05"
                type="range"
                value={sfxVolume}
              />
            </label>

            <div className="grid gap-1 border-4 border-ink bg-white p-2 text-lg">
              <p>ROM music: {statusLabel(bgmStatus)}</p>
              <p>Pokemon cries: {statusLabel(cryStatus)}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
