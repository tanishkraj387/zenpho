import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { hasStarter } from '../lib/starter'
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

      navigate((await hasStarter(user.id)) ? '/hub' : '/starter', { replace: true })
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Login failed.'
      setError(friendlyAuthError(message))
    } finally {
      setIsSubmitting(false)
    }
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
        </form>
      </PixelCard>
    </main>
  )
}
