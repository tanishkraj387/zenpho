import type { BattleEvent, TestGroupState } from '../store/battleStore'
import type { CodeLanguage, CodingQuestion } from './questions'

export type JudgeMode = 'run' | 'submit'

export type JudgeDiagnostic = {
  group: TestGroupState['id']
  label: string
  passed: boolean
  message: string
  actual?: unknown
  expected?: unknown
}

export type JudgeReward = {
  coins: number
  trainerXp: number
  partyXp: number
  energy: number
  maxEnergy: number
}

export type JudgeResult = {
  diagnostics: JudgeDiagnostic[]
  events: BattleEvent[]
  rewards: JudgeReward
  solved: boolean
  tests: Record<TestGroupState['id'], TestGroupState['state']>
}

const judgeUrl = import.meta.env.VITE_JUDGE_URL || 'http://localhost:8787/judge'

export async function judgeCode({
  code,
  language,
  mode,
  pokemonName,
  question,
  topicLabel,
}: {
  code: string
  language: CodeLanguage
  mode: JudgeMode
  pokemonName: string
  question: Pick<CodingQuestion, 'difficulty' | 'id'>
  topicLabel: string
}) {
  const response = await fetch(judgeUrl, {
    body: JSON.stringify({
      code,
      difficulty: question.difficulty,
      language,
      mode,
      pokemonName,
      questionId: question.id,
      topicLabel,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const body = (await response.json()) as Partial<JudgeResult> & { error?: string }

  if (!response.ok) {
    throw new Error(body.error ?? 'Judge server rejected the submission.')
  }

  return body as JudgeResult
}
