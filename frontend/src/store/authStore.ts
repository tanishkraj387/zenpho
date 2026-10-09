import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const devSessionStorageKey = 'zenpho-dev-session'

type AuthState = {
  session: Session | null
  user: User | null
  loading: boolean
  initialize: () => () => void
  signUp: (email: string, password: string, username: string) => Promise<{ needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<User>
  signInAsDevTrainer: () => User
  signOut: () => Promise<void>
}

export function getUsername(user: User | null) {
  return typeof user?.user_metadata.username === 'string'
    ? user.user_metadata.username
    : user?.email ?? 'Trainer'
}

function createDevUser(): User {
  return {
    id: 'local-dev-trainer',
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'dev-trainer@zenpho.local',
    user_metadata: {
      username: 'Dev Trainer',
    },
  } as User
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  initialize: () => {
    let isMounted = true

    if (!isSupabaseConfigured) {
      const hasDevSession = localStorage.getItem(devSessionStorageKey) === 'true'

      set({
        session: null,
        user: hasDevSession ? createDevUser() : null,
        loading: false,
      })

      return () => {
        isMounted = false
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return
      }

      set({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      })
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  },
  signUp: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })

    if (error) {
      throw error
    }

    set({
      session: data.session,
      user: data.user,
      loading: false,
    })

    return { needsConfirmation: !data.session }
  },
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    set({
      session: data.session,
      user: data.user,
      loading: false,
    })

    return data.user
  },
  signInAsDevTrainer: () => {
    const user = createDevUser()

    localStorage.setItem(devSessionStorageKey, 'true')
    set({
      session: null,
      user,
      loading: false,
    })

    return user
  },
  signOut: async () => {
    if (!isSupabaseConfigured) {
      localStorage.removeItem(devSessionStorageKey)
      set({
        session: null,
        user: null,
        loading: false,
      })
      return
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }

    set({
      session: null,
      user: null,
      loading: false,
    })
  },
}))
