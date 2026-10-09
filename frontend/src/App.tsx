import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthBootstrap } from './components/auth/AuthBootstrap'
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/ProtectedRoute'
import { LoadingGate } from './components/ui/LoadingGate'
import { Battle } from './pages/Battle'
import { Collection } from './pages/Collection'
import { Gyms } from './pages/Gyms'
import { Hub } from './pages/Hub'
import { Landing } from './pages/Landing'
import { Leaderboard } from './pages/Leaderboard'
import { Login } from './pages/Login'
import { Practice } from './pages/Practice'
import { Profile } from './pages/Profile'
import { Shop } from './pages/Shop'
import { Signup } from './pages/Signup'
import { SpriteTest } from './pages/SpriteTest'
import { Starter } from './pages/Starter'
import { UiDemo } from './pages/UiDemo'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <BrowserRouter>
          <LoadingGate>
            <Routes>
              <Route path="/" element={<Landing />} />
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
            </Routes>
          </LoadingGate>
        </BrowserRouter>
      </AuthBootstrap>
    </QueryClientProvider>
  )
}
