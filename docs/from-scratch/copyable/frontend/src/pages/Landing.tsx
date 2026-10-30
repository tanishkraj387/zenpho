import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { getPostLoginPath } from '../lib/starter'
import { getUsername, useAuthStore } from '../store/authStore'

export function Landing() {
  const user = useAuthStore((state) => state.user)
  const [continuePath, setContinuePath] = useState('/hub')

  useEffect(() => {
    let isMounted = true

    if (!user) {
      setContinuePath('/hub')
      return () => {
        isMounted = false
      }
    }

    getPostLoginPath(user.id).then((path) => {
      if (isMounted) {
        setContinuePath(path)
      }
    })

    return () => {
      isMounted = false
    }
  }, [user])

  return (
    <main className="flex min-h-screen items-center justify-center bg-sky p-6 font-pixel text-ink">
      <PixelCard className="max-w-2xl" title="Zenpho">
        <div className="space-y-6 text-xl">
          <h1 className="font-heading text-2xl leading-relaxed">Coding Battle League</h1>
          <p>
            Train with coding problems, clear battle checkpoints, and keep your progress
            synced with your trainer account.
          </p>
          {user ? (
            <div className="space-y-4">
              <p>Welcome back, {getUsername(user)}.</p>
              <Link to={continuePath}>
                <PixelButton>Continue</PixelButton>
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              <Link to="/signup">
                <PixelButton>Start</PixelButton>
              </Link>
              <Link to="/login">
                <PixelButton variant="secondary">Login</PixelButton>
              </Link>
            </div>
          )}
        </div>
      </PixelCard>
    </main>
  )
}
