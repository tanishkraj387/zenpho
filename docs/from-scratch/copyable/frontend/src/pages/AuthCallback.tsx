import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { getPostLoginPath } from '../lib/starter'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function completeAuth() {
      if (!isSupabaseConfigured) {
        setError('Supabase is not configured for this local app.')
        return
      }

      const params = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const urlError = params.get('error_description') ?? hashParams.get('error_description')

      if (urlError) {
        setError(urlError)
        return
      }

      const code = params.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          setError(exchangeError.message)
          return
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        setError(sessionError.message)
        return
      }

      const user = data.session?.user

      if (!user) {
        setError('The email link did not create a session. Try logging in with your password.')
        return
      }

      useAuthStore.setState({
        session: data.session,
        user,
        loading: false,
      })

      const nextPath = await getPostLoginPath(user.id)

      if (isMounted) {
        navigate(nextPath, { replace: true })
      }
    }

    completeAuth()

    return () => {
      isMounted = false
    }
  }, [navigate])

  return (
    <main className="flex min-h-screen items-center justify-center bg-sky p-6 font-pixel text-ink">
      <PixelCard className="w-full max-w-lg" title={error ? 'Auth Error' : 'Verifying'}>
        <div className="space-y-4 text-xl">
          {error ? (
            <>
              <p className="border-4 border-ink bg-danger p-3 text-cream" role="alert">
                {error}
              </p>
              <Link to="/login">
                <PixelButton>Back to login</PixelButton>
              </Link>
            </>
          ) : (
            <p>Checking your trainer email link...</p>
          )}
        </div>
      </PixelCard>
    </main>
  )
}
