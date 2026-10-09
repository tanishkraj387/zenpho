import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PixelCard } from '../ui/PixelCard'
import { useAuthStore } from '../../store/authStore'
import { getPostLoginPath } from '../../lib/starter'

type RouteWrapperProps = {
  children?: ReactNode
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sky p-6 font-pixel text-ink">
      <PixelCard title="Loading">
        <p className="text-xl">Checking your trainer pass...</p>
      </PixelCard>
    </main>
  )
}

export function ProtectedRoute({ children }: RouteWrapperProps) {
  const loading = useAuthStore((state) => state.loading)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return children ?? <Outlet />
}

export function PublicOnlyRoute({ children }: RouteWrapperProps) {
  const loading = useAuthStore((state) => state.loading)
  const user = useAuthStore((state) => state.user)
  const [redirectPath, setRedirectPath] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    if (!user) {
      setRedirectPath(null)
      return () => {
        isMounted = false
      }
    }

    getPostLoginPath(user.id).then((path) => {
      if (isMounted) {
        setRedirectPath(path)
      }
    })

    return () => {
      isMounted = false
    }
  }, [user])

  if (loading || (user && !redirectPath)) {
    return <LoadingScreen />
  }

  if (user && redirectPath) {
    return <Navigate replace to={redirectPath} />
  }

  return children ?? <Outlet />
}
