import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

type AuthState = {
  session: Session | null
  user: User | null
  loading: boolean
  initialize: () => () => void
  signUp: (email: string, password: string, username: string) => Promise<{ needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<User>
  signOut: () => Promise<void>
}

export function getUsername(user: User | null) {
  return typeof user?.user_metadata.username === 'string'
    ? user.user_metadata.username
    : user?.email ?? 'Trainer'
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  initialize: () => {
    let isMounted = true

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
  signOut: async () => {
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
