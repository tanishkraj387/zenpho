import { useAudioStore } from '../../lib/audio'

export function AudioToggle() {
  const enabled = useAudioStore((state) => state.enabled)
  const bgmStatus = useAudioStore((state) => state.bgmStatus)
  const toggleAudio = useAudioStore((state) => state.toggleAudio)
  const label = enabled
    ? bgmStatus === 'available'
      ? 'ROM Music'
      : 'Sound On'
    : 'Sound Off'

  return (
    <button
      aria-pressed={enabled}
      className="pixel-focus border-4 border-ink bg-cream px-2 py-1 font-heading text-[10px]"
      onClick={toggleAudio}
      type="button"
    >
      {label}
    </button>
  )
}
