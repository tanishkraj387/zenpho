# 3. Rebuild Zenpho manually from an empty directory

This is an implementation recipe, not an instruction to copy the existing code blindly. Follow the stages in order. Each stage names the files to create, the contract those files must satisfy, and a check before proceeding. The companion chapters give the full data model and request flows. The checked-in source is a reference implementation for details such as exact UI markup and every catalog row.

## Stage 0 — Set the rules before writing code

Write down the domain model: one question has one encounter species; passing sample, hidden, and large-input checkpoints solves that question; a first solve grants one energy; entering a battle spends one energy; moves cost no energy; a party contains at most six owned creatures; each creature's HP persists; rematches do not repeat first-solve or first-win rewards; a won rematch can still catch a species not already owned. Keep game writes in the database, and make the browser play returned events. Define **large-input** as a timed test group, not an algorithmic-complexity measurement.

Acceptance check: for every action, you can say which process owns its result. For example, the browser may choose a move, but the database must decide hit, damage, faint, and resulting HP.

## Stage 1 — Create the frontend workspace

From an empty directory:

```powershell
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react-router-dom zustand @tanstack/react-query @supabase/supabase-js @monaco-editor/react framer-motion react-resizable-panels @fontsource/pixelify-sans @fontsource/press-start-2p
npm install -D @tailwindcss/vite tailwindcss oxlint postgres
```

Use npm and commit the lockfile. Add the React and Tailwind Vite plugins in `vite.config.ts`; import Tailwind in `src/index.css`. Put the color tokens and pixel fonts in CSS, then import CSS and render `<App />` from `src/main.tsx`. `src/App.tsx` should wrap routes in `QueryClientProvider`, auth bootstrap, and the route-transition system. The active repo's [`frontend/package.json`](../frontend/package.json), [`vite.config.ts`](../frontend/vite.config.ts), and [`src/index.css`](../frontend/src/index.css) show the exact dependency and theme choices. Avoid installing the obsolete root app's dependencies as the game frontend.

Acceptance check: `npm run dev` shows a basic React page; `npm run build` type-checks and bundles it.

## Stage 2 — Design the database before the screens

Create `supabase/config.toml` and ordered SQL migrations. Begin with enums and catalogs (`pokemon_species`, `questions`, `inventory_items`), then user-owned tables (`profiles`, `player_resources`, `player_inventory`, `player_creatures`, `battle_attempts`, `battle_events`, `catch_attempts`, `milestone_progress`). Add `party_slots`, `player_pokedex`, milestone/gym catalogs and badges. Finally add `current_hp`/`max_hp`, active creature, turn, and outcome fields. Define foreign keys, `CHECK` constraints, unique keys, and indexes before relying on application logic. See [database and auth](04-database-and-auth.md) for the actual table map and migration sequence.

For each table reachable through Supabase's Data API, enable RLS, revoke broad privileges, grant only required operations, and write policies. A typical player-owned read policy is:

```sql
create policy "read own rows" on public.player_creatures
for select to authenticated
using ((select auth.uid()) = user_id);
```

Do **not** copy this policy indiscriminately onto catalogs or privileged functions; their access rules differ. Create an `auth.users` trigger to provision profile/resources/inventory when a user is created. Keep functions that mutate resources in SQL transactions. Use `auth.uid()` and ownership checks inside any exposed `SECURITY DEFINER` RPC, set a safe `search_path`, and revoke default public execute before granting the intended role.

Acceptance check: reset a disposable local DB from migrations and run the SQL authorization tests. A signed-in user can read their own rows but not another user's; anonymous users cannot mutate player state.

## Stage 3 — Add Supabase Auth and guarded routing

Create `src/lib/supabase.ts` with `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`. The key is browser-visible and must be a public/anon key. Add `src/store/authStore.ts` for session, user, loading, signup, sign-in, sign-out, and `onAuthStateChange`. Build `/signup`, `/login`, and `/auth/callback`. Route signed-out users to login; route a signed-in player with no starter to `/starter`, otherwise `/hub`.

The distinction between a **user record** and a **session** matters: with email confirmation enabled, signup can return a user but no session. Do not treat that record as signed in. `ProtectedRoute` must require the session when Supabase is configured. The database `choose_starter` function should accept only IDs 1, 4, and 7, reject a second starter, and create both the creature and first party slot atomically.

Acceptance check: new unconfirmed signup cannot choose a starter; confirmed login can choose exactly once; logout returns to login; reload restores a valid session.

## Stage 4 — Create public questions and private tests

Define a typed question contract with `id`, `title`, `difficulty`, `topic`, `description`, `constraints`, examples, `starterCode.python`, `starterCode.javascript`, and `encounterPokemonId`. Store the public catalog in `frontend/src/data/questions.json` and seed equivalent active rows in `public.questions`. The current project has 50 questions. Keep sample/hidden/large-input test inputs in `judge-data/question-tests.json`, which is read by Node and must **not** be copied into `frontend/public/`, imported by browser code, or returned by a public database query.

Use the editor contract consistently:

```python
def solve(nums, target):
    return []
```

```javascript
export function solve(nums, target) {
  return []
}
```

The runner calls those functions with each case's `input` object. Make the displayed examples, private test JSON, starter signatures, and problem statement agree on argument order and return type. The catalog generator at `tools/build_question_catalog.py` can be used to regenerate public/private files, but review its output and seed migrations before applying changes. Give each question a unique encounter Pokémon and add a database uniqueness constraint once the catalog is valid.

Acceptance check: every active question has a suite and unique species, and a known-good solution passes every test group. The checked-in `npm run judge:check` demonstrates this for Python two-sum.

## Stage 5 — Implement the code judge

Build a Node HTTP server separate from Vite. Accept `POST /judge` with a bounded JSON body containing question ID, language, mode (`run` or `submit`), and source code. Select tests **by server-side question ID**; never accept expected outputs from the browser. `run` executes samples only; `submit` executes samples, hidden, then large-input tests, stopping at the first failed group. Return structured `tests`, `diagnostics`, `events`, and `solved` fields. See the [Run and Submit contract](05-judge-and-battle.md#run-and-submit).

For each group, create a temporary directory, write only that group's test JSON plus the solution and runner, then spawn `docker run` with an argument array (no shell interpolation). The current runner uses a read-only workspace mount, no container network, 256 MiB, one CPU, a group timeout, pre-pulled Python/Node images, and `--rm`. Always delete the temporary directory. Distinguish Docker CLI/daemon/image failures from wrong answers; infrastructure errors must not award or deduct game progress. This local sandbox is **not** a complete public multi-tenant isolation design.

Acceptance check: a correct sample and full submission pass; a wrong answer produces expected/received diagnostics; a runtime exception shows an error; missing Docker returns a setup error, never “wrong answer.”

## Stage 6 — Make the game loop authoritative

Implement and expose database functions in this order: `choose_starter`, `start_battle`, `record_battle_result`, `spend_battle_energy`, `take_battle_action`, `catch_pokemon`, `set_party_slot`, `use_healing_item`, `buy_item`, `claim_milestone_reward`, and `claim_gym_reward`. The latest migrations are the authoritative definitions. Transactional updates should lock the relevant attempt/resource/creature rows, check `auth.uid()`, and reject invalid transitions. Use unique keys or advisory locks for first-solve rewards and concurrent catches.

Design the battle attempt states (`started`, `submitted`, `running`, `won`, `lost`, `abandoned`) and a turn response with ordered events. The browser should use a reducer/queue to animate those events; it should not compute persistent HP, damage, inventory, or rewards. The current database `take_battle_action` already handles moves, switching, healing, enemy response, party collapse, and persistent HP. A critical follow-up before public deployment is to have a trusted judge/backend attest checkpoint results directly to the database, rather than forwarding browser-provided statuses.

Acceptance check: two concurrent requests cannot double-spend energy, double-award a first win, or catch an already owned species. A fainted Pokémon remains fainted after page reload; a healthy party member can switch in.

## Stage 7 — Build React feature slices

Create pages in this order: landing/auth, starter, hub, practice, battle, collection/party, shop, profile, gyms, leaderboard. Use small adapters in `src/lib/` for Supabase reads and RPCs. Wrap those adapters in TanStack Query hooks keyed by the signed-in user ID; invalidate affected keys after a mutation. Keep editor and modal state local to their page. Keep auth and battle-event playback in Zustand stores. Lazy-load page modules in `App.tsx` so the initial screen does not download Monaco and the full battle bundle.

In `Battle.tsx`, separate the problem statement, Monaco editor, results drawer, and battle arena. Run must never mark the problem solved; only Submit can begin the success/fight transition after all checkpoints pass. Show exact judge diagnostics, including runtime and infrastructure errors. Keep the results pane resizable with `react-resizable-panels`. Add a prompt to fight or return to hub after a solve. See [frontend and assets](06-frontend-and-assets.md) for the route and component map.

Acceptance check: a second account sees its own resources, collection, party, and solved status; resizing, keyboard navigation, and narrow screens remain usable.

## Stage 8 — Add presentation and media

Add the PokéRogue-derived sprite atlases, frame JSON, move animation sheets, cries, music, and effects under `frontend/public/pokerogue/` with their attribution and per-asset license notices. Build a shared sprite loader/cache; render the 320×180 battle field on canvas; scale it in CSS without using the animation to change authoritative game state. Add timed move cues, cry playback, switch animations, and a loading gate between routes. Honor reduced-motion preferences, enable audio only after a user gesture, and keep a visible mute control. Do not assume every upstream asset can be redistributed under the same license.

Acceptance check: assets resolve locally, a missing optional cue does not prevent judging, and switching or move VFX never changes the database result.

## Stage 9 — Verify, document, and prepare a demo

Run type-check/build, lint, judge regression tests, `judge:check`, database RLS tests, and a fresh-account browser journey. Test both first wins and duplicate solves, no-energy entry, full-party faint, revive, catching an unowned rematch species, and blocked recatch of owned species. Test another device with reachable Vite, judge, and Supabase URLs. Document which service runs on which machine. Review the [deployment/security chapter](07-verification-deployment-and-troubleshooting.md) before calling it internet-ready.

## Completion checklist

- The project can be recreated from migrations and catalog files; no hidden manual SQL is needed.
- Public question data never contains hidden test cases.
- The browser has only public Supabase credentials.
- The judge reports infrastructure failures separately from failed code.
- Persistent state survives reload and is scoped by account.
- Every reward/catch/HP mutation is checked server-side; any remaining untrusted result handoff is explicitly identified.
- Asset provenance and license notices travel with the media.
