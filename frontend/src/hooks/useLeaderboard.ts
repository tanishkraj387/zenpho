import { useQuery } from '@tanstack/react-query'
import { getLeaderboard } from '../lib/leaderboard'

export function useLeaderboard() {
  return useQuery({
    queryFn: getLeaderboard,
    queryKey: ['leaderboard'],
    staleTime: 30_000,
  })
}
