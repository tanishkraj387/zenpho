import type { BattleEvent, JudgeOutcome, TestGroupState } from '../store/battleStore'

type MockJudgeResult = {
  events: BattleEvent[]
  tests: Record<TestGroupState['id'], TestGroupState['state']>
}

const encouragingText = 'That one missed, but your draft is safe. Try another angle!'

export function mockJudge(outcome: JudgeOutcome): MockJudgeResult {
  if (outcome === 'samples-pass') {
    return {
      tests: {
        samples: 'passed',
        hidden: 'pending',
        efficiency: 'pending',
      },
      events: [
        { type: 'text', text: 'Sample tests passed. The creature braces itself!' },
        { type: 'player_attack', text: 'Your solution lands a clean hit.' },
        { type: 'enemy_hit', text: 'The bug-type logic wobbles.' },
        { type: 'enemy_hp', value: 72, text: 'Enemy HP dropped.' },
      ],
    }
  }

  if (outcome === 'all-pass') {
    return {
      tests: {
        samples: 'passed',
        hidden: 'passed',
        efficiency: 'passed',
      },
      events: [
        { type: 'text', text: 'All checkpoints passed.' },
        { type: 'player_attack', text: 'Your final answer surges forward!' },
        { type: 'enemy_hit', text: 'It is super effective.' },
        { type: 'enemy_hp', value: 0, text: 'Enemy HP fell to zero.' },
        { type: 'enemy_faint', text: 'The wild bug fainted.' },
        { type: 'victory', text: 'Victory! You gained 120 XP and 45 coins.' },
      ],
    }
  }

  if (outcome === 'hidden-fail') {
    return {
      tests: {
        samples: 'passed',
        hidden: 'failed',
        efficiency: 'pending',
      },
      events: [
        { type: 'text', text: 'Samples passed, but a hidden checkpoint failed.' },
        { type: 'enemy_attack', text: 'The creature counters with an edge case.' },
        { type: 'player_hit', text: 'Your player takes a small hit.' },
        { type: 'player_hp', delta: -12, text: encouragingText },
      ],
    }
  }

  if (outcome === 'efficiency-fail') {
    return {
      tests: {
        samples: 'passed',
        hidden: 'passed',
        efficiency: 'failed',
      },
      events: [
        { type: 'text', text: 'Large-input tests did not finish within the limit.' },
        { type: 'enemy_attack', text: 'The creature pressures your approach.' },
        { type: 'player_hit', text: 'Your player loses some HP.' },
        { type: 'player_hp', delta: -10, text: 'Refine the approach and run it again.' },
      ],
    }
  }

  return {
    tests: {
      samples: 'failed',
      hidden: 'pending',
      efficiency: 'pending',
    },
    events: [
      { type: 'text', text: 'The answer missed the sample checkpoint.' },
      { type: 'enemy_attack', text: 'The creature tosses a failing test case.' },
      { type: 'player_hit', text: 'Your player takes a small hit.' },
      { type: 'player_hp', delta: -10, text: encouragingText },
    ],
  }
}
