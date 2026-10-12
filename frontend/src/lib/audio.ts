import { create } from 'zustand'
import { getPokemonCry } from './sprites'

export type SoundName =
  | 'boot'
  | 'unlock'
  | 'click'
  | 'hit'
  | 'damage'
  | 'victory'
  | 'catchThrow'
  | 'catchShake'
  | 'catchSuccess'
  | 'catchBreakout'

export type BgmScene = 'boot' | 'hub' | 'route' | 'battle' | 'gym' | 'victory' | 'catch'

type AudioManifest = {
  playableTracks?: {
    id: string
    title: string
    url: string
  }[]
}

type CryManifest = {
  cries?: {
    id: number
    url: string
  }[]
}

type SfxManifest = {
  sounds?: Partial<Record<SoundName, string>>
}

type AudioState = {
  bgmScene: BgmScene
  bgmStatus: 'unknown' | 'loading' | 'available' | 'missing'
  bgmVolume: number
  cryStatus: 'unknown' | 'loading' | 'available' | 'missing'
  enabled: boolean
  sfxVolume: number
  loadCries: () => Promise<void>
  playPokemonCry: (id: number) => void
  playSound: (sound: SoundName) => void
  setBgmScene: (scene: BgmScene) => void
  setBgmVolume: (volume: number) => void
  setSfxVolume: (volume: number) => void
  startBgm: (scene?: BgmScene) => Promise<void>
  stopBgm: () => void
  toggleAudio: () => void
}

const trackPreference: Record<BgmScene, string[]> = {
  boot: ['firered-264', 'firered-272', 'firered-291'],
  hub: ['firered-264', 'firered-291', 'firered-272'],
  route: ['firered-291', 'firered-264', 'firered-278'],
  battle: ['firered-265', 'firered-278', 'firered-272'],
  gym: ['firered-278', 'firered-265', 'firered-291'],
  victory: ['firered-272', 'firered-264', 'firered-291'],
  catch: ['firered-272', 'firered-278', 'firered-264'],
}

let audioContext: AudioContext | null = null
let bgmAudio: HTMLAudioElement | null = null
let cryAudio: HTMLAudioElement | null = null
let cueAudio: HTMLAudioElement | null = null
let bgmLoadPromise: Promise<AudioManifest | null> | null = null
let cryLoadPromise: Promise<Set<number> | null> | null = null
let sfxLoadPromise: Promise<SfxManifest | null> | null = null
let activeTrackUrl = ''

function readStoredNumber(key: string, fallback: number) {
  const value = Number(localStorage.getItem(key))

  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback
}

function getAudioContext() {
  audioContext ??= new AudioContext()
  return audioContext
}

function playTone(
  frequency: number,
  duration: number,
  volume: number,
  startOffset = 0,
  type: OscillatorType = 'square',
) {
  const context = getAudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const startTime = context.currentTime + startOffset
  const endTime = startTime + duration

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.12 * volume, startTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, endTime)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startTime)
  oscillator.stop(endTime + 0.02)
}

function playSequence(
  notes: Array<[number, number]>,
  volume: number,
  type: OscillatorType = 'square',
) {
  let offset = 0

  for (const [frequency, duration] of notes) {
    playTone(frequency, duration, volume, offset, type)
    offset += duration * 0.72
  }
}

function playNoise(duration: number, volume: number) {
  const context = getAudioContext()
  const bufferSize = Math.floor(context.sampleRate * duration)
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < bufferSize; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize)
  }

  const source = context.createBufferSource()
  const gain = context.createGain()

  gain.gain.value = 0.09 * volume
  source.buffer = buffer
  source.connect(gain)
  gain.connect(context.destination)
  source.start()
}

function playGeneratedSound(sound: SoundName, volume: number) {
  if (sound === 'boot') {
    playSequence([[220, 0.08], [330, 0.08], [440, 0.12]], volume)
  } else if (sound === 'unlock') {
    playSequence([[520, 0.06], [780, 0.08], [1040, 0.12]], volume)
  } else if (sound === 'click') {
    playTone(620, 0.04, volume)
  } else if (sound === 'hit') {
    playSequence([[280, 0.05], [190, 0.08]], volume, 'sawtooth')
  } else if (sound === 'damage') {
    playNoise(0.12, volume)
  } else if (sound === 'victory') {
    playSequence([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.16]], volume)
  } else if (sound === 'catchThrow') {
    playSequence([[392, 0.05], [523, 0.08], [659, 0.1]], volume)
  } else if (sound === 'catchShake') {
    playSequence([[196, 0.05], [196, 0.05], [196, 0.05]], volume)
  } else if (sound === 'catchSuccess') {
    playSequence([[392, 0.08], [523, 0.08], [784, 0.18]], volume)
  } else if (sound === 'catchBreakout') {
    playSequence([[330, 0.08], [220, 0.12]], volume, 'sawtooth')
  }
}

async function getLocalRomManifest() {
  bgmLoadPromise ??= fetch('/user-assets/audio/manifest.json')
    .then((response) => {
      if (!response.ok) {
        return null
      }

      return response.json() as Promise<AudioManifest>
    })
    .catch(() => null)

  return bgmLoadPromise
}

async function getLocalSfxManifest() {
  sfxLoadPromise ??= fetch('/user-assets/audio/sfx/manifest.json')
    .then((response) => {
      if (!response.ok) {
        return null
      }

      return response.json() as Promise<SfxManifest>
    })
    .catch(() => null)

  return sfxLoadPromise
}

async function getLocalCries() {
  cryLoadPromise ??= fetch('/user-assets/audio/cries/manifest.json')
    .then((response) => {
      if (!response.ok) {
        return null
      }

      return response.json() as Promise<CryManifest>
    })
    .then((manifest) => {
      const ids = manifest?.cries?.map((cry) => cry.id) ?? []

      return ids.length > 0 ? new Set(ids) : null
    })
    .catch(() => null)

  return cryLoadPromise
}

function selectTrack(manifest: AudioManifest | null, scene: BgmScene) {
  const tracks = manifest?.playableTracks ?? []
  const preferences = trackPreference[scene]

  return (
    preferences
      .map((id) => tracks.find((track) => track.id === id))
      .find(Boolean) ??
    tracks[0] ??
    null
  )
}

export const useAudioStore = create<AudioState>((set, get) => ({
  bgmScene: 'hub',
  bgmStatus: 'unknown',
  bgmVolume: readStoredNumber('zenpho-bgm-volume', 0.28),
  cryStatus: 'unknown',
  enabled: localStorage.getItem('zenpho-audio-enabled') === 'true',
  sfxVolume: readStoredNumber('zenpho-sfx-volume', 0.65),
  loadCries: async () => {
    set({ cryStatus: 'loading' })
    const cries = await getLocalCries()

    set({ cryStatus: cries ? 'available' : 'missing' })
  },
  playPokemonCry: (id) => {
    if (!get().enabled) {
      return
    }

    if (get().cryStatus === 'unknown') {
      void get().loadCries()
    }

    cryAudio?.pause()
    cryAudio = new Audio(getPokemonCry(id))
    cryAudio.volume = get().sfxVolume
    void cryAudio.play().catch(() => {
      set({ cryStatus: 'missing' })
      playGeneratedSound('click', get().sfxVolume)
    })
  },
  playSound: (sound) => {
    if (!get().enabled) {
      return
    }

    void getAudioContext().resume()
    void getLocalSfxManifest().then((manifest) => {
      const cueUrl = manifest?.sounds?.[sound]

      if (!cueUrl) {
        playGeneratedSound(sound, get().sfxVolume)
        return
      }

      cueAudio?.pause()
      cueAudio = new Audio(cueUrl)
      cueAudio.volume = get().sfxVolume
      void cueAudio.play().catch(() => playGeneratedSound(sound, get().sfxVolume))
    })
  },
  setBgmScene: (scene) => {
    if (scene === get().bgmScene) {
      return
    }

    set({ bgmScene: scene })

    if (get().enabled) {
      void get().startBgm(scene)
    }
  },
  setBgmVolume: (volume) => {
    const nextVolume = Math.min(1, Math.max(0, volume))

    localStorage.setItem('zenpho-bgm-volume', String(nextVolume))
    if (bgmAudio) {
      bgmAudio.volume = nextVolume
    }
    set({ bgmVolume: nextVolume })
  },
  setSfxVolume: (volume) => {
    const nextVolume = Math.min(1, Math.max(0, volume))

    localStorage.setItem('zenpho-sfx-volume', String(nextVolume))
    set({ sfxVolume: nextVolume })
  },
  startBgm: async (scene) => {
    if (!get().enabled) {
      return
    }

    const nextScene = scene ?? get().bgmScene

    set({ bgmScene: nextScene, bgmStatus: 'loading' })
    const manifest = await getLocalRomManifest()
    const track = selectTrack(manifest, nextScene)

    if (!track) {
      set({ bgmStatus: 'missing' })
      return
    }

    bgmAudio ??= new Audio()

    if (activeTrackUrl !== track.url) {
      activeTrackUrl = track.url
      bgmAudio.pause()
      bgmAudio.src = track.url
      bgmAudio.currentTime = 0
    }

    bgmAudio.loop = !['victory', 'catch'].includes(nextScene)
    bgmAudio.volume = get().bgmVolume

    try {
      await bgmAudio.play()
      set({ bgmStatus: 'available' })
    } catch {
      set({ bgmStatus: 'missing' })
    }
  },
  stopBgm: () => {
    bgmAudio?.pause()
  },
  toggleAudio: () => {
    const nextEnabled = !get().enabled

    localStorage.setItem('zenpho-audio-enabled', String(nextEnabled))
    set({ enabled: nextEnabled })

    if (nextEnabled) {
      void getAudioContext().resume()
      playGeneratedSound('boot', get().sfxVolume)
      void get().startBgm()
      void get().loadCries()
    } else {
      get().stopBgm()
    }
  },
}))
