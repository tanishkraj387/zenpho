import { useQuery } from '@tanstack/react-query'
import { getGyms } from '../lib/gyms'
import { useAuthStore } from '../store/authStore'

export function useGyms() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    enabled: Boolean(user),
    queryFn: () => getGyms(user!.id),
    queryKey: ['gyms', user?.id],
    staleTime: 30_000,
  })
}
