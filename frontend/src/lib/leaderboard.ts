import { isSupabaseConfigured, supabase } from './supabase'

export type LeaderboardEntry = {
  caughtCount: number
  coins: number
  userId: string
  username: string
  xp: number
}

type LeaderboardRow = {
  caught_count: number
  coins: number
  user_id: string
  username: string
  xp: number
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const { data, error } = await supabase.rpc('get_leaderboard')

  if (error) {
    throw error
  }

  return ((data ?? []) as LeaderboardRow[]).map((entry) => ({
    caughtCount: Number(entry.caught_count),
    coins: Number(entry.coins),
    userId: entry.user_id,
    username: entry.username,
    xp: Number(entry.xp),
  }))
}
