import { useQuery } from '@tanstack/react-query'
import { getPlayerSummary } from '../lib/player'
import { useAuthStore } from '../store/authStore'

export function usePlayerSummary() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    enabled: Boolean(user),
    queryFn: () => getPlayerSummary(user!.id),
    queryKey: ['player-summary', user?.id],
    staleTime: 30_000,
  })
}
