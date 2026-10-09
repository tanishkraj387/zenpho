import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'

type AuthBootstrapProps = {
  children: ReactNode
}

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => initialize(), [initialize])

  return children
}
