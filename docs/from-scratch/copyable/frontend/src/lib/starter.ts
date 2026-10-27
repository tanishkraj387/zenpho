import { isSupabaseConfigured, supabase } from './supabase'

const localStarterStorageKey = 'zenpho-local-starter-id'

export async function hasStarter(userId: string) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('player_creatures')
      .select('id')
      .eq('user_id', userId)
      .eq('is_starter', true)
      .maybeSingle()

    if (error) {
      throw error
    }

    return Boolean(data)
  }

  return localStorage.getItem(localStarterStorageKey) !== null
}

export async function getPostLoginPath(userId: string) {
  return (await hasStarter(userId)) ? '/hub' : '/starter'
}

export function getLocalStarterId() {
  const value = localStorage.getItem(localStarterStorageKey)
  const id = value ? Number(value) : null

  return Number.isInteger(id) ? id : null
}

export async function chooseStarter(id: number) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.rpc('choose_starter', {
      selected_pokemon_id: id,
    })

    if (error) {
      throw error
    }

    return
  }

  localStorage.setItem(localStarterStorageKey, String(id))
}
