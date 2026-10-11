import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthBootstrap } from './components/auth/AuthBootstrap'
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/ProtectedRoute'
import { AppErrorBoundary } from './components/ui/AppErrorBoundary'
import { AudioSceneController } from './components/ui/AudioSceneController'
import { LoadingGate } from './components/ui/LoadingGate'
import { RouteFallback } from './components/ui/RouteFallback'

const AuthCallback = lazy(() => import('./pages/AuthCallback').then((page) => ({ default: page.AuthCallback })))
const Battle = lazy(() => import('./pages/Battle').then((page) => ({ default: page.Battle })))
const Collection = lazy(() => import('./pages/Collection').then((page) => ({ default: page.Collection })))
const Gyms = lazy(() => import('./pages/Gyms').then((page) => ({ default: page.Gyms })))
const Hub = lazy(() => import('./pages/Hub').then((page) => ({ default: page.Hub })))
const Landing = lazy(() => import('./pages/Landing').then((page) => ({ default: page.Landing })))
const Leaderboard = lazy(() => import('./pages/Leaderboard').then((page) => ({ default: page.Leaderboard })))
const Login = lazy(() => import('./pages/Login').then((page) => ({ default: page.Login })))
const NotFound = lazy(() => import('./pages/NotFound').then((page) => ({ default: page.NotFound })))
const Practice = lazy(() => import('./pages/Practice').then((page) => ({ default: page.Practice })))
const Profile = lazy(() => import('./pages/Profile').then((page) => ({ default: page.Profile })))
const Shop = lazy(() => import('./pages/Shop').then((page) => ({ default: page.Shop })))
const Signup = lazy(() => import('./pages/Signup').then((page) => ({ default: page.Signup })))
const SpriteTest = lazy(() => import('./pages/SpriteTest').then((page) => ({ default: page.SpriteTest })))
const Starter = lazy(() => import('./pages/Starter').then((page) => ({ default: page.Starter })))
const UiDemo = lazy(() => import('./pages/UiDemo').then((page) => ({ default: page.UiDemo })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <BrowserRouter>
          <AudioSceneController />
          <LoadingGate>
            <AppErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route element={<PublicOnlyRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                  </Route>
                  <Route path="/sprite-test" element={<SpriteTest />} />
                  <Route path="/ui-demo" element={<UiDemo />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/starter" element={<Starter />} />
                    <Route path="/hub" element={<Hub />} />
                    <Route path="/battle" element={<Battle />} />
                    <Route path="/collection" element={<Collection />} />
                    <Route path="/gyms" element={<Gyms />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/practice" element={<Practice />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AppErrorBoundary>
          </LoadingGate>
        </BrowserRouter>
      </AuthBootstrap>
    </QueryClientProvider>
  )
}
