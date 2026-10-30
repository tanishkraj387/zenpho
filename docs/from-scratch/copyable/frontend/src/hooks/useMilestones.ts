import { useQuery } from '@tanstack/react-query'
import { getMilestones } from '../lib/milestones'
import { useAuthStore } from '../store/authStore'

export function useMilestones() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    enabled: Boolean(user),
    queryFn: () => getMilestones(user!.id),
    queryKey: ['milestones', user?.id],
    staleTime: 30_000,
  })
}
