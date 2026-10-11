import { useQuery } from '@tanstack/react-query'
import { getSolvedQuestionIds } from '../lib/progress'
import { useAuthStore } from '../store/authStore'

export function useSolvedQuestions() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    enabled: Boolean(user),
    queryFn: getSolvedQuestionIds,
    queryKey: ['solved-questions', user?.id],
    staleTime: 15_000,
  })
}
