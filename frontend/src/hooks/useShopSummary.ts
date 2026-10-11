import { useQuery } from '@tanstack/react-query'
import { getShopSummary } from '../lib/shop'
import { useAuthStore } from '../store/authStore'

export function useShopSummary() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    enabled: Boolean(user),
    queryFn: () => getShopSummary(user!.id),
    queryKey: ['shop-summary', user?.id],
    staleTime: 30_000,
  })
}
