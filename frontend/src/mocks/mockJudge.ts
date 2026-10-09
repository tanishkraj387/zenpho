import type { BattleEvent, JudgeOutcome, TestGroupState } from '../store/battleStore'
import type { QuestionDifficulty } from '../lib/pokemon'

type MockJudgeResult = {
  events: BattleEvent[]
  tests: Record<TestGroupState['id'], TestGroupState['state']>
}

type MockJudgeContext = {
  difficulty?: QuestionDifficulty
  pokemonName?: string
  topicLabel?: string
}

const encouragingText = 'That one missed, but your draft is safe. Try another angle!'

function getRewards(difficulty: QuestionDifficulty = 'medium') {
  if (difficulty === 'hard') {
    return { xp: 220, coins: 90 }
  }

  if (difficulty === 'easy') {
    return { xp: 60, coins: 20 }
  }

  return { xp: 120, coins: 45 }
}

export function mockJudge(outcome: JudgeOutcome, context: MockJudgeContext = {}): MockJudgeResult {
  const pokemonName = context.pokemonName ?? 'the wild Pokemon'
  const topicLabel = context.topicLabel ?? 'coding'
  const rewards = getRewards(context.difficulty)

  if (outcome === 'samples-pass') {
    return {
      tests: {
        samples: 'passed',
        hidden: 'pending',
        efficiency: 'pending',
      },
      events: [
        { type: 'text', text: 'Sample tests passed. The encounter braces itself!' },
        { type: 'player_attack', text: `${topicLabel} Strike lands a clean hit.` },
        { type: 'enemy_hit', text: `${pokemonName} wobbles.` },
        { type: 'enemy_hp', value: 72, text: `${pokemonName}'s HP dropped.` },
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
        { type: 'enemy_hit', text: `It is super effective against ${pokemonName}.` },
        { type: 'enemy_hp', value: 0, text: `${pokemonName}'s HP fell to zero.` },
        { type: 'enemy_faint', text: `${pokemonName} is weak enough to catch.` },
        {
          type: 'victory',
          text: `Victory! Server playback awarded ${rewards.xp} XP and ${rewards.coins} coins.`,
          rewards,
        },
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
        { type: 'enemy_attack', text: `${pokemonName} counters with an edge case.` },
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
        { type: 'enemy_attack', text: `${pokemonName} pressures your approach.` },
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
      { type: 'enemy_attack', text: `${pokemonName} tosses a failing test case.` },
      { type: 'player_hit', text: 'Your player takes a small hit.' },
      { type: 'player_hp', delta: -10, text: encouragingText },
    ],
  }
}
