import { useQuery } from '@tanstack/react-query'
import { getProfileSummary } from '../lib/profile'
import { useAuthStore } from '../store/authStore'

export function useProfileSummary() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    enabled: Boolean(user),
    queryFn: () => getProfileSummary(user!.id),
    queryKey: ['profile-summary', user?.id],
    staleTime: 30_000,
  })
}
