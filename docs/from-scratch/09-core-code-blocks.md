# Core files, block by block

The [file atlas](file-atlas.md) gives the job of every text file. This chapter slows down at the largest and most important ones. Read the full file from the [copyable snapshot](copyable/README.md) and use the headings below as a guided tour. Line numbers are approximate landmarks in this source snapshot; search the named function if a later edit moves it.

## `frontend/src/App.tsx`: the website's traffic director

**Imports and lazy pages.** The first block imports React, TanStack Query, React Router, and shared components. Each `lazy(() => import('./pages/...'))` says “download this page only when needed.” A Battle page with Monaco and animation assets is larger than a simple Login page, so lazy loading makes the initial visit lighter.

**`queryClient`.** This creates one cache shared by pages. `retry: 1` means a failed query gets one automatic second attempt; errors still reach the page if that fails.

**`App()`.** The outer component nests providers. `QueryClientProvider` makes cached queries possible; `AuthBootstrap` restores login; `BrowserRouter` understands the URL; `AudioSceneController` changes music; `LoadingGate` animates navigation. Provider order matters because an inner component can use an outer provider, but not one created below it.

**`AppRoutes()`.** The route table maps strings such as `/hub` to React pages. A `ProtectedRoute` parent guards pages that need a session. `PublicOnlyRoute` keeps signed-in players from going back to login. `AppErrorBoundary` gives a fallback on a rendering error, and `Suspense` shows a loading view while a lazy page imports.

## `frontend/src/store/authStore.ts`: account session memory

**Types and initial values.** `AuthState` says a session or user can be null, and exposes `initialize`, `signUp`, `signIn`, and `signOut`. The initial `loading: true` prevents the app from assuming a player is signed out before Supabase answers.

**`initialize`.** Calls `supabase.auth.getSession()` once and subscribes to `onAuthStateChange`. It returns a cleanup function to unsubscribe when the bootstrap component unmounts. The `isMounted` guard prevents an old asynchronous response from setting state after cleanup.

**`signUp`.** Sends email, password, and username to Supabase Auth, including the `/auth/callback` redirect. `needsConfirmation: !data.session` distinguishes “account created” from “signed in.” The username is display metadata, never an ownership credential.

**`signIn`/`signOut`.** Update local state only after Supabase succeeds. A failed request throws so the form can show the error. The development trainer branch when Supabase is absent is not a real authenticated account; use actual Supabase for persistence.

## `frontend/src/pages/Battle.tsx`: the player-facing workflow

This is the longest React file. Do not try to memorize it line by line. Find these named blocks in order:

| Block | Input → work → output |
| --- | --- |
| Imports, types, helpers (near the top) | Pulls in editor, battle components, hooks, adapters, and store types; defines ball options, catch phases, error formatting, layout helpers. |
| `Battle()` state and queries | Reads question/party/resources/solves; remembers code, language, open panels, active creature, catch stage, pending requests. These values drive rendering and cannot grant saved rewards by themselves. |
| `submitToJudge` | Gets editor source and Run/Submit mode; calls `judgeCode`; shows diagnostics; on passing Submit records the attempt and opens the Fight/Hub prompt. Catches network/Docker/RPC errors and shows them in Results. |
| `recordCurrentBattleResult` | Converts checkpoint state and final event into `recordBattleResult` RPC parameters; invalidates summary/party/solved queries after success. |
| `startEncounterFight` | Requires a saved attempt and healthy lead, preloads visual assets, calls `spendBattleEnergy`, then opens the combat scene. A failure leaves the Fight prompt and shows an error. |
| `runBattleAction` | Calls `takeBattleAction` for move/switch/item, queues returned events, refetches changed party/inventory, and records a confirmed final outcome. |
| `startCatch` | Calls SQL catch through `collection.ts`; uses the returned `caught` boolean to choose success/breakout animation; refetches collection and inventory. |
| Returned JSX | Renders header, question, resizable editor/results, arena, command menu, overlays, and error text from the above state. |

Notice how `startCatch` waits for the RPC before choosing its animation. That order is essential: the visual throw is allowed to be delayed or skipped, but the saved catch outcome comes from SQL.

## `frontend/scripts/judge-server.mjs`: code checking

**Imports and constants (start of file).** The server reads private test JSON, configures port/images/time limit, and caps source length. It is a separate Node process from Vite.

**`jsonResponse`, `readBody`, `runCommand` (early helpers).** These turn an HTTP request into bounded JSON and run a child process with a timeout. `runCommand` uses fixed command arguments rather than inserting source code into a shell command.

**Language runners.** `buildPythonRunner` creates Python code that imports `/workspace/solution.py` and calls `solve` with named input fields. `buildJavascriptRunner` imports `solve` from the submitted module and passes input values. Both compare actual and expected outputs and return a JSON results list. A thrown exception becomes a failed diagnostic.

**`runGroup`.** Creates a temporary host folder, writes `solution`, `runner`, and `tests.json`, invokes Docker with no container network, one CPU, 256 MiB memory, read-only mount, and `--rm`. It recognizes timeout, spawn, Docker, runtime, and wrong-answer cases. The `finally` block removes the temporary folder regardless of success.

**`judgeSubmission`.** Validates a known question ID and supported language/mode, then chooses only samples for Run or all three groups for Submit. It stops on a failure and builds diagnostics. `rewardsForDifficulty` creates a **display preview** using a client-supplied difficulty; PostgreSQL independently determines actual stored reward amounts and first-win eligibility. Never make this preview authoritative.

**HTTP server block.** Only `POST /judge` enters the judge. It returns JSON success/error. It currently has no authentication, so keep it local or protected until the trust boundary is hardened.

## `20261020160000_persistent_party_battles.sql`: the current combat rules

The SQL file has several `CREATE OR REPLACE FUNCTION` blocks. The later `20261020161000_fix_battle_type_lookup.sql` corrects part of the type lookup, so both must be applied.

| Block in the migration | What it changes and why |
| --- | --- |
| `ALTER TABLE player_creatures` and `battle_attempts` | Adds persistent HP and current combat fields. A creature's health survives reload; an attempt tracks active member, turn, and outcome. |
| Starter-to-party insert | Backfills a party slot for existing starter owners so older accounts can fight under the new six-slot system. |
| `set_party_slot` | Checks slot range and creature ownership, prevents unsafe party edits during an active fight, and updates selection. |
| `app_private.use_healing_item` | Validates item and creature, consumes inventory, computes recovered HP. `public.use_healing_item` exposes a controlled authenticated entry point. |
| `battle_moves` and `battle_type_effectiveness` | Server-only move stats and type chart used for damage, rather than trusting client Pokémon data. |
| `app_private.resolve_battle_move` | Computes hit, critical, type effectiveness, and damage. The latest correction migration matters here. |
| `spend_battle_energy` | Locks the attempt/party, requires passed checkpoints and one healthy selected creature, decrements energy once, marks the attempt running. |
| `take_battle_action` | Validates move/switch/item, updates HP and turn, decides enemy response, win/loss/forced switch, and returns ordered JSON events. |
| `record_battle_result` | Saves draft/checkpoints/final status; first solve adds energy and first confirmed win grants coins/XP once. It currently trusts browser-supplied checkpoint states. |
| `REVOKE`/`GRANT` after public functions | Prevents broad function execution and grants only authenticated users the intended calls. Functions still check `auth.uid()` and row ownership inside. |

Read `take_battle_action` as a transaction: validate caller → lock the current attempt → load the active party creature → branch on move/switch/item → resolve enemy action if needed → save HP/outcome → record a turn event → return JSON. If any `raise exception` occurs, PostgreSQL rolls back that call, so no partial inventory or HP update should remain.

## `frontend/src/store/battleStore.ts`: how server events become motion

`BattleEvent` is a TypeScript **union**: every possible event has a `type`, and some types require extra fields such as damage or HP value. `applyEvent` checks `event.type` and changes only display state: dialogue, animation name, HP bar value, or phase. `enqueueEvents` puts server events in order. `playNextEvent` displays the next one and sets a timer for ordinary text/HP events. Attack events wait for the stage's animation completion. `finishCurrentEvent` advances again. The store contains initial/fallback display numbers; database rows and RPC results are authoritative.

## `frontend/src/components/ui/LoadingGate.tsx`: route change without a flash

The component keeps both the actual router location and a `displayLocation`. A requested transition stores an action, closes the doors, runs the action while covered, aligns the new route, and opens. `busyRef` prevents overlapping transitions. A readiness flag keeps the doors closed until the destination is prepared. A timer fallback makes progress even if CSS animation events are interrupted. The reduced-motion media query shortens waits for players who ask for less motion.

## `frontend/src/lib/pokerogueAnimation.ts`: frame-based artwork

The first types describe a frame, timed audio/background event, and loaded image sheet. Constants define a 320×180 logical field and 50 ms move frame. `prepareBattleScene` preloads player/enemy sprites and arena layers. `loadBattleImage` and `loadMoveAnimation` cache fetches and reject missing files. `frameTransform` interprets coordinates and direction for player or enemy variants. `paintMoveFrame` draws one animation frame on canvas; `paintMoveBackground` draws timed background effects. This code paints a result; it cannot change SQL damage.

## `frontend/src/lib/audio.ts`: preference, source, fallback

The first types describe scene names and audio manifests. Loader helpers read optional local manifests. Playback helpers handle generated cues, battle cues, cries, and music. The Zustand store exposes volume and enabled controls and persists preferences locally. `AudioSceneController` selects the scene as the route changes. Sounds may fail because of missing files or autoplay rules; the game must remain understandable from text and HP bars.

When a block still feels mysterious, use the [one-player trace](08-follow-one-player.md): find the click, then the called adapter, then the SQL function, then the returned event. You do not need to understand every CSS selector before you can follow that flow.
