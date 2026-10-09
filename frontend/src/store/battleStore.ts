import { create } from 'zustand'

export type BattlePhase = 'thinking' | 'judging' | 'animating' | 'won' | 'lost'

export type BattleEvent =
  | { type: 'text'; text: string }
  | { type: 'player_attack'; text: string }
  | { type: 'enemy_hit'; text: string }
  | { type: 'enemy_hp'; value: number; text: string }
  | { type: 'enemy_faint'; text: string }
  | { type: 'enemy_attack'; text: string }
  | { type: 'player_hit'; text: string }
  | { type: 'player_hp'; value?: number; delta?: number; text: string }
  | { type: 'victory'; text: string; rewards?: { xp: number; coins: number } }
  | { type: 'defeat'; text: string }

export type JudgeOutcome =
  | 'samples-pass'
  | 'all-pass'
  | 'hidden-fail'
  | 'efficiency-fail'
  | 'wrong-answer'

export type TestGroupState = {
  id: 'samples' | 'hidden' | 'efficiency'
  label: string
  state: 'pending' | 'passed' | 'failed'
}

type BattleAnimation = 'idle' | 'player-lunge' | 'enemy-lunge' | 'enemy-hit' | 'player-hit' | 'enemy-faint'

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
  useBagItem: (item: 'potion' | 'shield' | 'revive') => void
  resetBattle: (dialogText: string) => void
  setJudging: () => void
}

const initialTests: TestGroupState[] = [
  { id: 'samples', label: 'Sample tests', state: 'pending' },
  { id: 'hidden', label: 'Hidden tests', state: 'pending' },
  { id: 'efficiency', label: 'Efficiency tests', state: 'pending' },
]

const eventDelayMs = 850

function applyEvent(state: BattleState, event: BattleEvent): Partial<BattleState> {
  if (event.type === 'player_attack') {
    return { animation: 'player-lunge', dialogText: event.text }
  }

  if (event.type === 'enemy_attack') {
    return { animation: 'enemy-lunge', dialogText: event.text }
  }

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
  resetBattle: (dialogText) =>
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
    }),
  enqueueEvents: (events, tests) => {
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

    window.setTimeout(() => {
      get().finishCurrentEvent()
    }, eventDelayMs)
  },
  finishCurrentEvent: () => {
    set((state) => ({
      animation:
        state.currentEvent?.type === 'enemy_faint' || state.currentEvent?.type === 'victory'
          ? 'enemy-faint'
          : 'idle',
    }))
    get().playNextEvent()
  },
  useBagItem: (item) => {
    if (item === 'potion') {
      set((state) => ({
        playerHp: Math.min(state.playerMaxHp, state.playerHp + 25),
        dialogText: 'Potion restored 25 HP.',
      }))
      return
    }

    if (item === 'shield') {
      set({ dialogText: 'Shield is ready. It would reduce the next hit in a real battle.' })
      return
    }

    set((state) => ({
      playerHp: state.playerHp <= 0 ? Math.floor(state.playerMaxHp / 2) : state.playerHp,
      dialogText: state.playerHp <= 0 ? 'Revive brought you back!' : 'Revive has no effect right now.',
    }))
  },
}))
