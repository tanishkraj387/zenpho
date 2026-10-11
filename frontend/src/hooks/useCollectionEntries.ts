import { useQuery } from '@tanstack/react-query'
import { getCollectionEntries } from '../lib/collection'
import { useAuthStore } from '../store/authStore'

export function useCollectionEntries() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    enabled: Boolean(user),
    queryFn: () => getCollectionEntries(user!.id),
    queryKey: ['collection-entries', user?.id],
    staleTime: 30_000,
  })
}
