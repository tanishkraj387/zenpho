# Follow one player click through the entire codebase

This chapter is a reading exercise. Keep the [copyable source](copyable/README.md) open beside it. Search each named function in the linked file. You will see how a click travels through a page, a helper, a network request, a SQL function, and back to an animation. The same pattern explains most of Zenpho.

## Example A: new account chooses a starter

1. The browser loads [index.html](copyable/frontend/index.html), which starts [main.tsx](copyable/frontend/src/main.tsx). `main.tsx` renders [App.tsx](copyable/frontend/src/App.tsx).
2. `App.tsx` wraps pages in `AuthBootstrap`. [authStore.ts](copyable/frontend/src/store/authStore.ts) calls `supabase.auth.getSession()` and subscribes to future changes. While it checks, `loading` is true.
3. The player types email, password, and username in [Signup.tsx](copyable/frontend/src/pages/Signup.tsx). `signUp` sends them to Supabase Auth. A database trigger created in [the initial schema](copyable/supabase/migrations/20261010121500_initial_game_schema.sql) provisions `profiles`, `player_resources`, and starting inventory. If email confirmation is enabled, the browser gets no session yet.
4. After confirmation, [AuthCallback.tsx](copyable/frontend/src/pages/AuthCallback.tsx) and the auth store establish a session. [ProtectedRoute.tsx](copyable/frontend/src/components/auth/ProtectedRoute.tsx) waits for loading to finish and admits the player only when the real session exists.
5. [starter.ts](copyable/frontend/src/lib/starter.ts) reads `player_creatures` to decide whether to show `/starter` or `/hub`. The player clicks Charmander in [Starter.tsx](copyable/frontend/src/pages/Starter.tsx); `chooseStarter(4)` calls `supabase.rpc('choose_starter', ...)`.
6. The SQL function in [choose_starter_function.sql](copyable/supabase/migrations/20261010121700_choose_starter_function.sql) checks the authenticated user and selected ID and creates the owned creature and first party slot. Reloading the page still shows the starter because those are database rows.

**Why so many files?** The page handles form and feedback; the store handles session changes; the adapter knows the RPC name; the SQL function enforces one-time ownership. Each has one job.

## Example B: Practice opens a question

1. [Practice.tsx](copyable/frontend/src/pages/Practice.tsx) gets question encounters and solved status through hooks. Search/filter controls change which cards are shown, not the database.
2. A question card navigates to `/battle?question=easy-arrays-two-sum`. The query parameter is an ID, not a trusted reward request.
3. [useBattleQuestion.ts](copyable/frontend/src/hooks/useBattleQuestion.ts) obtains the question, using [questions.ts](copyable/frontend/src/lib/questions.ts) to map it to public Pokémon display data. If Supabase is configured, `getCodingQuestionById` reads the public `questions` row; the local JSON supplies placeholder/fallback display data.
4. [Battle.tsx](copyable/frontend/src/pages/Battle.tsx) loads the prompt, examples, constraints, and starter code into the Monaco editor. Separately, it calls [battleAttempts.ts](copyable/frontend/src/lib/battleAttempts.ts) `startBattleAttempt`, which creates a saved attempt with the authenticated user/question/species. The SQL function checks that the question is active and the species matches the question.

**Why both a public JSON and database questions?** The JSON gives fast local display and a known catalog order. The database row supports authoritative attempt validation and shared live state. Keep the IDs and encounter mapping in sync.

## Example C: Submit a correct solution

1. The player edits `def solve(nums, target): ...` and clicks Submit. `submitToJudge('submit')` in `Battle.tsx` opens Results, checks whether this question was solved before, and calls `judgeCode` in [judge.ts](copyable/frontend/src/lib/judge.ts).
2. `judge.ts` sends `POST /judge` to port 8787 (or the configured URL). [judge-server.mjs](copyable/frontend/scripts/judge-server.mjs) finds test cases by question ID in [question-tests.json](copyable/judge-data/question-tests.json). It starts a temporary Docker container for samples, then hidden, then large-input cases. It stops at the first failed group.
3. The judge returns a `JudgeResult`: group states, diagnostics, events, and `solved`. If a case failed, Results shows the diagnostic; the page saves the attempt's draft/checkpoint state and does not open Fight. A Docker/network error is shown as a submission error and must not be called a wrong answer.
4. When all groups pass, `Battle.tsx` calls `recordBattleResult` through `battleAttempts.ts`. The latest `record_battle_result` SQL definition in [persistent_party_battles.sql](copyable/supabase/migrations/20261020160000_persistent_party_battles.sql) sees a first solve and adds one energy. It stores code draft and statuses. The gate says “Question solved!” and the overlay offers Fight or Hub.

**Trust warning:** the browser currently forwards group states to SQL. It can be modified. This is an implementation gap; a public version needs a trusted judge proof or server-to-server handoff. The SQL function does not currently deduct HP on wrong submissions, although that is an intended product rule.

## Example D: Fight a turn and catch

1. The player clicks Fight. `startEncounterFight` in `Battle.tsx` refetches the party, preloads art, and calls `spendBattleEnergy` in `battleAttempts.ts`. The SQL `spend_battle_energy` checks the paid/solved attempt, healthy selected party, and resource row, then subtracts one energy exactly once.
2. The player chooses a move. `runBattleAction('move', { moveName })` calls `takeBattleAction`. The database validates the allowed move, computes hit/damage/effectiveness, updates enemy HP and the active creature's persistent HP, and returns ordered JSON events. The enemy may act in the same SQL call.
3. [battleStore.ts](copyable/frontend/src/store/battleStore.ts) queues those events. `applyEvent` changes dialogue and displayed HP; [BattleStage.tsx](copyable/frontend/src/components/ui/BattleStage.tsx) and [pokerogueAnimation.ts](copyable/frontend/src/lib/pokerogueAnimation.ts) play the visual. If a move animation file is missing, the database's damage is still what happened.
4. If the active Pokémon faints but another selected one is healthy, the server returns `needsSwitch`. The page asks the player to choose a healthy party creature. If all selected creatures faint, the server outcome is `lost`. Database `current_hp` values stay low across reloads.
5. If the enemy faints, the server outcome is `won`. The page records that confirmed result; the SQL function grants coins/XP only for an eligible first win. The player may throw a ball. [collection.ts](copyable/frontend/src/lib/collection.ts) calls `catch_pokemon`; SQL checks the latest matching win, the ball, and species ownership, then consumes a ball and decides the roll. The page animates a catch or breakout **after** the RPC returns its result.
6. The page invalidates TanStack Query keys for resources, party, collection, shop, and solved status. The next read comes from PostgreSQL, so a reload or second device sees the saved values.

**Why events?** The database's response describes the result once. Multiple UI components can then show text, HP movement, sounds, and sprite effects in the right order without recalculating the combat outcome.

## What to ask yourself while reading any function

- Which input came from a player or browser? Could it be changed?
- Which values are mere display choices, and which change saved state?
- Which layer validates ownership and prevents a duplicate reward?
- If the page reloads halfway through, which facts remain in PostgreSQL?
- If a network call fails, where is the error shown, and can the player retry safely?
- Which later migration replaced this SQL function?

When you can answer those six questions for the four examples, you can follow almost any feature in the [file atlas](file-atlas.md).
