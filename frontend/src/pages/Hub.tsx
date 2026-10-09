import { Link } from 'react-router-dom'
import { AppHeader } from '../components/auth/AppHeader'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { getUsername, useAuthStore } from '../store/authStore'

export function Hub() {
  const user = useAuthStore((state) => state.user)

  return (
    <main className="min-h-screen bg-sky font-pixel text-ink">
      <AppHeader coins={245} />
      <section className="mx-auto max-w-4xl p-6">
        <PixelCard title="Hub">
          <div className="space-y-5 text-xl">
            <h1 className="font-heading text-xl leading-relaxed">
              Welcome, {getUsername(user)}
            </h1>
            <p>Choose your next coding battle checkpoint.</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/battle">
                <PixelButton>Battle</PixelButton>
              </Link>
              <Link to="/practice">
                <PixelButton variant="secondary">Practice</PixelButton>
              </Link>
            </div>
          </div>
        </PixelCard>
      </section>
    </main>
  )
}
