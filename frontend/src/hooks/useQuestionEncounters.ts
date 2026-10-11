import { useQuery } from '@tanstack/react-query'
import { getCodingQuestionEncounters, getQuestionEncounters } from '../lib/questions'

export function useQuestionEncounters() {
  return useQuery({
    queryFn: getCodingQuestionEncounters,
    queryKey: ['question-encounters'],
    placeholderData: getQuestionEncounters,
    staleTime: 60_000,
  })
}
