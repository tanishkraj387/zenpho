import { useQuery } from '@tanstack/react-query'
import { getPlayerParty } from '../lib/party'
import { useAuthStore } from '../store/authStore'

export function usePlayerParty() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    enabled: Boolean(user),
    queryFn: () => getPlayerParty(user!.id),
    queryKey: ['player-party', user?.id],
    staleTime: 30_000,
  })
}
