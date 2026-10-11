import { useQuery } from '@tanstack/react-query'
import {
  getCodingQuestionById,
  getEncounterForQuestion,
  getQuestionById,
} from '../lib/questions'

const fallbackQuestionId = 'medium-arrays-longest-streak'

export function useBattleQuestion(questionId: string | null) {
  const resolvedQuestionId = questionId || fallbackQuestionId

  return useQuery({
    queryFn: async () => {
      const question =
        (await getCodingQuestionById(resolvedQuestionId)) ??
        getQuestionById(fallbackQuestionId)!

      return getEncounterForQuestion(question)
    },
    queryKey: ['battle-question', resolvedQuestionId],
    placeholderData: () => {
      const question =
        getQuestionById(resolvedQuestionId) ?? getQuestionById(fallbackQuestionId)!

      return getEncounterForQuestion(question)
    },
    staleTime: 60_000,
  })
}
