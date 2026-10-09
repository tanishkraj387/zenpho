import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { hasStarter } from '../lib/starter'
import { useAuthStore } from '../store/authStore'

function validateSignup(username: string, email: string, password: string, confirmPassword: string) {
  const errors: string[] = []
  const trimmedUsername = username.trim()

  if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
    errors.push('Username must be 3-20 characters.')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Enter a valid email address.')
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters.')
  }

  if (password !== confirmPassword) {
    errors.push('Passwords must match.')
  }

  return errors
}

export function Signup() {
  const navigate = useNavigate()
  const signUp = useAuthStore((state) => state.signUp)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateSignup(username, email.trim(), password, confirmPassword)
    setErrors(nextErrors)

    if (nextErrors.length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signUp(email.trim(), password, username.trim())

      if (result.needsConfirmation) {
        setNeedsConfirmation(true)
        return
      }

      const currentUser = useAuthStore.getState().user
      navigate(currentUser && (await hasStarter(currentUser.id)) ? '/hub' : '/starter', {
        replace: true,
      })
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Signup failed.'
      setErrors([message])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sky p-6 font-pixel text-ink">
      <PixelCard className="w-full max-w-lg" title="Signup">
        {needsConfirmation ? (
          <div className="space-y-4 text-xl">
            <h1 className="font-heading text-sm leading-relaxed">Check your email</h1>
            <p>Supabase needs you to confirm this email before entering the league.</p>
            <Link className="underline" to="/login">
              Back to login
            </Link>
          </div>
        ) : (
          <form className="space-y-4 text-xl" onSubmit={handleSubmit}>
            <label className="block">
              <span className="font-heading text-[10px]">Username</span>
              <input
                autoComplete="username"
                className="pixel-focus mt-2 w-full border-4 border-ink bg-white p-3"
                onChange={(event) => setUsername(event.target.value)}
                value={username}
              />
            </label>
            <label className="block">
              <span className="font-heading text-[10px]">Email</span>
              <input
                autoComplete="email"
                className="pixel-focus mt-2 w-full border-4 border-ink bg-white p-3"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>
            <label className="block">
              <span className="font-heading text-[10px]">Password</span>
              <input
                autoComplete="new-password"
                className="pixel-focus mt-2 w-full border-4 border-ink bg-white p-3"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            <label className="block">
              <span className="font-heading text-[10px]">Confirm Password</span>
              <input
                autoComplete="new-password"
                className="pixel-focus mt-2 w-full border-4 border-ink bg-white p-3"
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </label>
            {errors.length > 0 ? (
              <div className="space-y-1 border-4 border-ink bg-danger p-3 text-cream" role="alert">
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
            <PixelButton className="w-full justify-center" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </PixelButton>
            <p>
              Already registered?{' '}
              <Link className="underline" to="/login">
                Login
              </Link>
            </p>
          </form>
        )}
      </PixelCard>
    </main>
  )
}
