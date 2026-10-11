import { create } from 'zustand'
import { getPokemonCry } from './sprites'

type SoundName =
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

type AudioState = {
  enabled: boolean
  bgmStatus: 'unknown' | 'loading' | 'available' | 'missing'
  toggleAudio: () => void
  playSound: (sound: SoundName) => void
  playPokemonCry: (id: number) => void
  startBgm: () => Promise<void>
  stopBgm: () => void
}

let audioContext: AudioContext | null = null
let bgmAudio: HTMLAudioElement | null = null
let cryAudio: HTMLAudioElement | null = null
let bgmLoadPromise: Promise<string | null> | null = null

function getAudioContext() {
  audioContext ??= new AudioContext()
  return audioContext
}

function playTone(frequency: number, duration: number, startOffset = 0, type: OscillatorType = 'square') {
  const context = getAudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const startTime = context.currentTime + startOffset
  const endTime = startTime + duration

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.08, startTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, endTime)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startTime)
  oscillator.stop(endTime + 0.02)
}

function playSequence(notes: Array<[number, number]>, type: OscillatorType = 'square') {
  let offset = 0

  for (const [frequency, duration] of notes) {
    playTone(frequency, duration, offset, type)
    offset += duration * 0.72
  }
}

function playNoise(duration: number) {
  const context = getAudioContext()
  const bufferSize = Math.floor(context.sampleRate * duration)
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
  const data = buffer.getChannelData(0)

  for (let index = 0; index < bufferSize; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize)
  }

  const source = context.createBufferSource()
  const gain = context.createGain()

  gain.gain.value = 0.06
  source.buffer = buffer
  source.connect(gain)
  gain.connect(context.destination)
  source.start()
}

function playGeneratedSound(sound: SoundName) {
  if (sound === 'boot') {
    playSequence([[220, 0.08], [330, 0.08], [440, 0.12]])
  } else if (sound === 'unlock') {
    playSequence([[520, 0.06], [780, 0.08], [1040, 0.12]])
  } else if (sound === 'click') {
    playTone(620, 0.04)
  } else if (sound === 'hit') {
    playSequence([[280, 0.05], [190, 0.08]], 'sawtooth')
  } else if (sound === 'damage') {
    playNoise(0.12)
  } else if (sound === 'victory') {
    playSequence([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.16]])
  } else if (sound === 'catchThrow') {
    playSequence([[392, 0.05], [523, 0.08], [659, 0.1]])
  } else if (sound === 'catchShake') {
    playSequence([[196, 0.05], [196, 0.05], [196, 0.05]])
  } else if (sound === 'catchSuccess') {
    playSequence([[392, 0.08], [523, 0.08], [784, 0.18]])
  } else if (sound === 'catchBreakout') {
    playSequence([[330, 0.08], [220, 0.12]], 'sawtooth')
  }
}

async function getLocalRomTrack() {
  bgmLoadPromise ??= fetch('/user-assets/audio/manifest.json')
    .then((response) => {
      if (!response.ok) {
        return null
      }

      return response.json() as Promise<{ playableTracks?: { url: string }[] }>
    })
    .then((manifest) => manifest?.playableTracks?.[0]?.url ?? null)
    .catch(() => null)

  return bgmLoadPromise
}

export const useAudioStore = create<AudioState>((set, get) => ({
  enabled: localStorage.getItem('zenpho-audio-enabled') === 'true',
  bgmStatus: 'unknown',
  toggleAudio: () => {
    const nextEnabled = !get().enabled

    localStorage.setItem('zenpho-audio-enabled', String(nextEnabled))
    set({ enabled: nextEnabled })

    if (nextEnabled) {
      void getAudioContext().resume()
      playGeneratedSound('boot')
      void get().startBgm()
    } else {
      get().stopBgm()
    }
  },
  playSound: (sound) => {
    if (!get().enabled) {
      return
    }

    void getAudioContext().resume()
    playGeneratedSound(sound)
  },
  playPokemonCry: (id) => {
    if (!get().enabled) {
      return
    }

    cryAudio?.pause()
    cryAudio = new Audio(getPokemonCry(id))
    cryAudio.volume = 0.55
    void cryAudio.play().catch(() => {
      playGeneratedSound('click')
    })
  },
  startBgm: async () => {
    if (!get().enabled) {
      return
    }

    set({ bgmStatus: 'loading' })
    const trackUrl = await getLocalRomTrack()

    if (!trackUrl) {
      set({ bgmStatus: 'missing' })
      return
    }

    bgmAudio ??= new Audio()
    bgmAudio.src = trackUrl
    bgmAudio.loop = true
    bgmAudio.volume = 0.28

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
}))
