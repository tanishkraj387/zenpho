const localStarterStorageKey = 'zenpho-local-starter-id'

export async function hasStarter(_userId: string) {
  // TODO: Replace with a Supabase query once the starter creature table is confirmed.
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

export function saveLocalStarterId(id: number) {
  // TODO: Replace with a Supabase insert once the starter creature table is confirmed.
  localStorage.setItem(localStarterStorageKey, String(id))
}
