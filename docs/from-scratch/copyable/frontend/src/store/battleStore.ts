import { create } from 'zustand'

type HitFeedback = { damage: number; critical: boolean; effectiveness: number }

export type BattlePhase = 'thinking' | 'judging' | 'animating' | 'won' | 'lost'

export type BattleEvent =
  | { type: 'text'; text: string }
  | { type: 'player_attack'; text: string; animationId: string }
  | ({ type: 'enemy_hit'; text: string } & HitFeedback)
  | { type: 'enemy_hp'; value: number; text: string }
  | { type: 'enemy_faint'; text: string }
  | { type: 'enemy_attack'; text: string; animationId: string }
  | { type: 'switch_out'; text: string }
  | { type: 'switch_in'; text: string }
  | ({ type: 'player_hit'; text: string } & HitFeedback)
  | { type: 'player_hp'; value?: number; delta?: number; text: string }
  | { type: 'victory'; text: string; rewards?: { xp: number; coins: number } }
  | { type: 'defeat'; text: string }

export type TestGroupState = {
  id: 'samples' | 'hidden' | 'efficiency'
  label: string
  state: 'pending' | 'passed' | 'failed'
}

type BattleAnimation = 'idle' | 'player-lunge' | 'enemy-lunge' | 'enemy-hit' | 'player-hit' | 'enemy-faint' | 'switch-out' | 'switch-in'

type BattleState = {
  phase: BattlePhase
  eventQueue: BattleEvent[]
  currentEvent: BattleEvent | null
  dialogText: string
  playerHp: number
  playerMaxHp: number
  enemyHp: number
  enemyMaxHp: number
  animation: BattleAnimation
  tests: TestGroupState[]
  victoryRewards: { xp: number; coins: number } | null
  enqueueEvents: (events: BattleEvent[], tests?: Record<TestGroupState['id'], TestGroupState['state']>) => void
  playNextEvent: () => void
  finishCurrentEvent: () => void
  resetBattle: (dialogText: string) => void
  setPlayerHp: (value: number, max: number) => void
  setJudging: () => void
}

const initialTests: TestGroupState[] = [
  { id: 'samples', label: 'Sample tests', state: 'pending' },
  { id: 'hidden', label: 'Hidden tests', state: 'pending' },
  { id: 'efficiency', label: 'Efficiency tests', state: 'pending' },
]

const eventDelayMs = 850
let eventTimer: number | undefined

function applyEvent(state: BattleState, event: BattleEvent): Partial<BattleState> {
  if (event.type === 'player_attack') {
    return { animation: 'player-lunge', dialogText: event.text }
  }

  if (event.type === 'enemy_attack') {
    return { animation: 'enemy-lunge', dialogText: event.text }
  }

  if (event.type === 'switch_out') return { animation: 'switch-out', dialogText: event.text }
  if (event.type === 'switch_in') return { animation: 'switch-in', dialogText: event.text }

  if (event.type === 'enemy_hit') {
    return { animation: 'enemy-hit', dialogText: event.text }
  }

  if (event.type === 'player_hit') {
    return { animation: 'player-hit', dialogText: event.text }
  }

  if (event.type === 'enemy_hp') {
    return { enemyHp: Math.max(0, event.value), dialogText: event.text }
  }

  if (event.type === 'player_hp') {
    const nextHp = event.value ?? state.playerHp + (event.delta ?? 0)

    return {
      playerHp: Math.max(0, Math.min(state.playerMaxHp, nextHp)),
      dialogText: event.text,
    }
  }

  if (event.type === 'enemy_faint') {
    return { animation: 'enemy-faint', dialogText: event.text }
  }

  if (event.type === 'victory') {
    return {
      animation: 'enemy-faint',
      dialogText: event.text,
      phase: 'won',
      victoryRewards: event.rewards ?? { xp: 120, coins: 45 },
    }
  }

  if (event.type === 'defeat') {
    return { dialogText: event.text, phase: 'lost' }
  }

  return { animation: 'idle', dialogText: event.text }
}

export const useBattleStore = create<BattleState>((set, get) => ({
  phase: 'thinking',
  eventQueue: [],
  currentEvent: null,
  dialogText: 'A wild recursion bug appeared!',
  playerHp: 86,
  playerMaxHp: 100,
  enemyHp: 100,
  enemyMaxHp: 100,
  animation: 'idle',
  tests: initialTests,
  victoryRewards: null,
  setJudging: () => set({ phase: 'judging', dialogText: 'Checking the submission...' }),
  resetBattle: (dialogText) => {
    window.clearTimeout(eventTimer)
    set({
      phase: 'thinking',
      eventQueue: [],
      currentEvent: null,
      dialogText,
      playerHp: 86,
      playerMaxHp: 100,
      enemyHp: 100,
      enemyMaxHp: 100,
      animation: 'idle',
      tests: initialTests,
      victoryRewards: null,
    })
  },
  setPlayerHp: (value, max) => set({
    playerHp: Math.max(0, Math.min(max, value)),
    playerMaxHp: max,
  }),
  enqueueEvents: (events, tests) => {
    window.clearTimeout(eventTimer)
    set((state) => ({
      eventQueue: events,
      currentEvent: null,
      phase: 'animating',
      tests: tests
        ? state.tests.map((test) => ({ ...test, state: tests[test.id] }))
        : state.tests,
    }))
    get().playNextEvent()
  },
  playNextEvent: () => {
    window.clearTimeout(eventTimer)
    const state = get()
    const [nextEvent, ...remainingEvents] = state.eventQueue

    if (!nextEvent) {
      set((current) => ({
        animation: 'idle',
        currentEvent: null,
        phase: current.phase === 'won' || current.phase === 'lost' ? current.phase : 'thinking',
      }))
      return
    }

    set((current) => ({
      ...applyEvent(current, nextEvent),
      currentEvent: nextEvent,
      eventQueue: remainingEvents,
    }))

    if (nextEvent.type !== 'player_attack' && nextEvent.type !== 'enemy_attack') {
      const delay = nextEvent.type === 'switch_out' || nextEvent.type === 'switch_in' ? 300
        : nextEvent.type === 'enemy_hit' || nextEvent.type === 'player_hit' ? 360
        : nextEvent.type === 'enemy_hp' || nextEvent.type === 'player_hp' || nextEvent.type === 'enemy_faint' ? 500
        : eventDelayMs
      eventTimer = window.setTimeout(() => {
        if (get().currentEvent === nextEvent) get().finishCurrentEvent()
      }, delay)
    }
  },
  finishCurrentEvent: () => {
    window.clearTimeout(eventTimer)
    set((state) => ({
      animation:
        state.currentEvent?.type === 'enemy_faint' || state.currentEvent?.type === 'victory'
          ? 'enemy-faint'
          : 'idle',
    }))
    get().playNextEvent()
  },
}))
