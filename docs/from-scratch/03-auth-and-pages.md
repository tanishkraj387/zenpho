# Lesson 3: accounts, routes, data hooks, and screens

**Goal:** a player can sign up, confirm email, choose a starter, and move between pages while seeing only their own saved data.

## 1. Connect the browser to Supabase

Copy [frontend/src/lib/supabase.ts](copyable/frontend/src/lib/supabase.ts). Its essential idea is:

```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(url, anonKey)
```

The real file also has a configuration flag and a development fallback. `createClient` builds a helper for sending HTTP requests to Supabase. `import.meta.env` is how Vite gives browser code its public configuration. The public/anon key identifies the project; login supplies the user's session. RLS and SQL functions still enforce row access. Never put a service-role key in this file.

## 2. Restore a session, not just a user object

Copy [authStore.ts](copyable/frontend/src/store/authStore.ts) and [AuthBootstrap.tsx](copyable/frontend/src/components/auth/AuthBootstrap.tsx). The store keeps `session`, `user`, and `loading`. On startup, `getSession()` checks whether a previous login is available; `onAuthStateChange()` keeps the store updated after sign-in, sign-out, or token changes. `AuthBootstrap` starts that setup once and cleans up the subscription.

With email confirmation enabled, `signUp` may create an Auth user but return **no session**. That user cannot yet call `choose_starter`. The `needsConfirmation` result lets Signup display the correct next step. A common bug is treating the returned user object as proof of login. A protected route must require a real session when Supabase is configured.

The existing auth store also has a local development trainer when Supabase is not configured. That is a UI fallback, not a real account, and cannot give server-backed rewards. For a faithful connected build and multi-device demo, configure Supabase and test with real accounts.

## 3. Create the four account screens

Copy [Signup.tsx](copyable/frontend/src/pages/Signup.tsx), [Login.tsx](copyable/frontend/src/pages/Login.tsx), [AuthCallback.tsx](copyable/frontend/src/pages/AuthCallback.tsx), and [Starter.tsx](copyable/frontend/src/pages/Starter.tsx). Signup collects email/password/username and calls the store's `signUp`. Login calls `signInWithPassword`. `AuthCallback` handles the confirmation redirect. Starter shows Bulbasaur, Charmander, and Squirtle and calls the database `choose_starter` RPC through [starter.ts](copyable/frontend/src/lib/starter.ts).

The database, not the Starter card, rejects a second selection. `starter.ts` also checks for an existing starter so login can route to `/hub` instead of `/starter`. This is a read for navigation; the SQL function is still the final authority for whether selection is allowed.

Configure Supabase Auth's site URL and redirect allow-list to include the site's origin and `/auth/callback`. For a local Supabase stack with confirmation enabled, inspect its Inbucket mail viewer. “Email not confirmed” is an Auth state, not a starter bug.

## 4. Map URLs to pages

Copy [App.tsx](copyable/frontend/src/App.tsx) and [ProtectedRoute.tsx](copyable/frontend/src/components/auth/ProtectedRoute.tsx). The key route pattern is:

```tsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/hub" element={<Hub />} />
    <Route path="/battle" element={<Battle />} />
  </Route>
</Routes>
```

`Routes` chooses a page by URL. The inner routes inherit the parent guard. `ProtectedRoute` checks loading first so a valid player does not briefly flash the login page while the session restores; then it checks the session and redirects if needed. `PublicOnlyRoute` sends already signed-in users to Starter or Hub. The complete `App.tsx` adds all routes, an error boundary, lazy loading, audio scene control, and gate transitions.

## 5. Use hooks for database reads

A **hook** begins with `use` and packages reusable React behavior. This is a simplified version of [usePlayerParty.ts](copyable/frontend/src/hooks/usePlayerParty.ts):

```ts
export function usePlayerParty() {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    enabled: Boolean(user),
    queryFn: () => getPlayerParty(user!.id),
    queryKey: ['player-party', user?.id],
    staleTime: 30_000,
  })
}
```

`enabled` prevents the query before login. `queryFn` fetches party rows through `lib/party.ts`. The query key includes the user ID so one account's cache is not reused for another. `staleTime` allows a short cache. After a battle or party edit, call `queryClient.invalidateQueries({ queryKey: ['player-party'] })` so the UI asks the server for the new HP and lineup.

The `lib/` files are **adapters**: they know Supabase table names, RPC names, and how to convert database rows into TypeScript objects. The `hooks/` files decide when to fetch and cache. The `pages/` files decide what to display and which action to request. Keeping those jobs separate makes failures easier to locate.

## 6. Understand every page's responsibility

| Page file | What the player sees | What it reads or changes |
| --- | --- | --- |
| `Landing.tsx` | Welcome and entry links | No private account state. |
| `Signup.tsx`, `Login.tsx`, `AuthCallback.tsx` | Account forms and confirmation | Supabase Auth. |
| `Starter.tsx` | First Pokémon selection | Calls `choose_starter`; checks existing starter. |
| `Hub.tsx` | Main menu and resource summary | Player resources, party, milestones. |
| `Practice.tsx` | Searchable question catalog | Public questions and solved-question IDs. |
| `Battle.tsx` | Prompt, editor, results, encounter | Judge and battle RPCs; plays server events. |
| `Collection.tsx` | Seen/caught species and party editing | Pokédex, creatures, `set_party_slot`, healing. |
| `Shop.tsx` | Buy balls and healing items | Inventory and `buy_item`. |
| `Gyms.tsx` | Topic progress and badge claims | Gym queries and claim RPC. |
| `Leaderboard.tsx` | Public ranking | `get_leaderboard`. |
| `Profile.tsx` | Account and recent activity | Profile summary, attempts, resources. |
| `NotFound.tsx` | Unknown URL message | No persistent changes. |

`PageTitle.tsx` is a shared heading component, not its own route. The [file atlas](file-atlas.md) lists every hook and adapter used by these screens.

**Checkpoint:** confirm an email, sign in, choose a starter once, refresh Hub, sign out, and sign in again. The starter must remain owned. Open a second account and confirm it sees only its own party and resources. Next: [the judge](04-judge.md).
