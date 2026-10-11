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
        { type: 'text', text: 'Sample tests passed. Keep going for the full solve.' },
        { type: 'text', text: `${pokemonName} is watching your solution carefully.` },
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
        {
          type: 'text',
          text: `Solved! Server playback awarded ${rewards.xp} XP and ${rewards.coins} coins.`,
        },
        { type: 'text', text: `${topicLabel} energy is ready for the encounter.` },
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
        { type: 'text', text: encouragingText },
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
        { type: 'text', text: 'Refine the approach and run it again.' },
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
      { type: 'text', text: encouragingText },
    ],
  }
}
