import { useQuery } from '@tanstack/react-query'
import { getOwnedCreatures } from '../lib/party'
import { useAuthStore } from '../store/authStore'

export function useOwnedCreatures() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    enabled: Boolean(user),
    queryFn: () => getOwnedCreatures(user!.id),
    queryKey: ['owned-creatures', user?.id],
    staleTime: 15_000,
  })
}
