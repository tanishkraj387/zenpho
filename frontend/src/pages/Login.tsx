import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { getPostLoginPath } from '../lib/starter'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

type LocationState = {
  from?: {
    pathname?: string
  }
}

function friendlyAuthError(message: string) {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('invalid login')) {
    return 'That email and password did not match a trainer account.'
  }

  if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('network')) {
    return 'Network trouble. Check your connection and try again.'
  }

  return message
}

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((state) => state.signIn)
  const signInAsDevTrainer = useAuthStore((state) => state.signInAsDevTrainer)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const user = await signIn(email.trim(), password)
      const state = location.state as LocationState | null
      const wantedPath = state?.from?.pathname

      if (wantedPath && wantedPath !== '/login' && wantedPath !== '/signup') {
        navigate(wantedPath, { replace: true })
        return
      }

      navigate(await getPostLoginPath(user.id), { replace: true })
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Login failed.'
      setError(friendlyAuthError(message))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDevContinue() {
    const state = location.state as LocationState | null
    const wantedPath = state?.from?.pathname
    const user = signInAsDevTrainer()

    navigate(
      wantedPath && wantedPath !== '/login' && wantedPath !== '/signup'
        ? wantedPath
        : await getPostLoginPath(user.id),
      { replace: true },
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sky p-6 font-pixel text-ink">
      <PixelCard className="w-full max-w-md" title="Login">
        <form className="space-y-4 text-xl" onSubmit={handleSubmit}>
          <label className="block">
            <span className="font-heading text-[10px]">Email</span>
            <input
              autoComplete="email"
              className="pixel-focus mt-2 w-full border-4 border-ink bg-white p-3"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block">
            <span className="font-heading text-[10px]">Password</span>
            <input
              autoComplete="current-password"
              className="pixel-focus mt-2 w-full border-4 border-ink bg-white p-3"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error ? (
            <div className="border-4 border-ink bg-danger p-3 text-cream" role="alert">
              {error}
            </div>
          ) : null}
          <PixelButton className="w-full justify-center" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </PixelButton>
          <p>
            New trainer?{' '}
            <Link className="underline" to="/signup">
              Create an account
            </Link>
          </p>
          {!isSupabaseConfigured ? (
            <div className="space-y-3 border-4 border-ink bg-warning p-3">
              <p>
                Supabase is not configured locally yet. Use demo mode to review
                the game screens without real auth.
              </p>
              <PixelButton
                className="w-full justify-center"
                onClick={handleDevContinue}
                variant="secondary"
              >
                Continue demo
              </PixelButton>
            </div>
          ) : null}
        </form>
      </PixelCard>
    </main>
  )
}
