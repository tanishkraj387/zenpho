# 4. Database, migrations, authentication, and persistence

Supabase supplies a Postgres database, Auth, and a Data API. The browser's `supabase-js` client uses the project URL and **public** key, then attaches the signed-in user's session for table reads and RPC calls. Database grants and RLS policies constrain direct table access. Game writes happen in functions that verify `auth.uid()` and row ownership. This chapter describes the **latest** migration state, not the early schema proposal in `frontend/docs/data-model-plan.md`.

## Schema map

The ordered SQL files under `supabase/migrations/` are the definitive schema. Important tables are:

| Table | Key fields / relationship | Purpose and access |
| --- | --- | --- |
| `profiles` | `id → auth.users.id`, `username` | One trainer profile per auth user; user can read own row. |
| `player_resources` | `user_id → profiles.id`, `coins`, `xp`, `energy`, `max_energy` | Persistent trainer resources; owner reads, server functions mutate. |
| `pokemon_species` | `pokemon_id`, `name`, `types[]`, `rarity` | Public 1–151 species catalog. |
| `questions` | text `id`, `difficulty`, `topic`, `description`, `examples`, `starter_code`, `encounter_pokemon_id` | Public active question catalog; a partial unique index gives active questions distinct encounter species. No hidden tests belong here. |
| `inventory_items` / `player_inventory` | item key; `(user_id,item_key)` | Public shop catalog and private item counts. |
| `player_creatures` | UUID `id`, `user_id`, `pokemon_id`, `level`, `xp`, `current_hp`, `max_hp`, `is_starter` | Owned creature instance and persistent health. One user can own multiple instances only where current rules allow; the catch RPC blocks catching an already owned species. |
| `party_slots` | `(user_id,slot)`, `creature_id` | Up to six selected creature IDs. The party RPC checks ownership and frees a creature's old slot when moved. |
| `battle_attempts` | UUID `id`, user/question/species, checkpoint statuses, status, `energy_spent`, `active_creature_id`, `turn_number`, `battle_outcome` | Durable attempt and encounter state. Multiple attempts can exist for one question. |
| `battle_events` | attempt, user, sequence, event type, JSON payload | Ordered server-side event/audit rows used for encounter history. |
| `player_pokedex` / `catch_attempts` | user/species; user/attempt/ball | Seen/caught status and catch-roll history. |
| `milestone_catalog` / `milestone_progress` | definition and per-user progress | Milestone thresholds and claim status. |
| `gym_catalog` / `player_gym_badges` | gym definition and per-user badge | Topic gym unlocks and claimed rewards. |
| `app_private.battle_moves` / `app_private.battle_type_effectiveness` | move stats and type multipliers | Internal data used by server-side turn resolution; not browser-editable catalogs. |
| `schema_migrations` | migration filename | Tracking table for the repository's custom migration helper. |

The initial migration also defines enums for question difficulty/topic, Pokémon rarity, inventory category, battle status, test-group status, and catch status. Constraints prevent negative inventory/resources and invalid HP ranges. Foreign keys tie user-owned rows to the owning profile. Indexes support per-user battle history, question filtering, Pokédex, and catalog lookup.

## Migration order and why it matters

SQL files are sorted by filename. The major phases are:

1. `20261010121500_initial_game_schema.sql`: enums, core tables, RLS, grants, auth provisioning trigger.
2. `20261010121600_seed_catalog.sql` and later catalog migrations: species, items, starter questions, then the 50-question expansion and encounter mapping.
3. `20261011...` migrations: starter, shop, catch, battle recording, leaderboard, gyms, milestones, and party functions.
4. `20261019...`: question rematches and expanded catalog.
5. `20261020...`: duplicate reward rules, one-energy battle entry, unique active question encounters, uncaught rematch catches, persistent party HP/server battle turns, and type lookup correction.

Later `CREATE OR REPLACE FUNCTION` definitions replace older definitions of the same signature. When reading a function, search **all** migrations and use the last one applied. Never edit an already applied migration to change a live project; add a new ordered migration and test it on a disposable database first.

The repo-specific `frontend/scripts/apply-supabase-migrations.mjs` requires `SUPABASE_DB_URL`, reads every `.sql` file, and writes applied filenames to `public.schema_migrations`. Supabase CLI manages a **different** migration-history table. Choose one migration path per project, or reconcile both histories before switching tools. Do not put a Postgres URI in a browser env file. Official [Supabase local workflows](https://supabase.com/docs/guides/local-development/cli-workflows) explain the CLI path.

## RLS, grants, and function authority

PostgreSQL first checks whether a role has a table privilege, then whether an RLS policy allows the row. The initial migration revokes broad table privileges, grants public read for catalog tables, and grants owner-only reads for player rows. Typical policies compare `auth.uid()` with `user_id`. A function with `SECURITY DEFINER` can operate with elevated privileges, so it must check the authenticated user, validate every referenced row, set a restricted `search_path`, and grant execute only to the intended role. Several exposed game RPCs follow this pattern; `app_private` helpers are not meant to be called directly from the browser.

Read the [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) for the difference between grants and policies. Never treat a client-supplied user ID or editable `user_metadata` as authorization. The username metadata is used for display during signup bootstrap, not to decide ownership.

## Signup and starter lifecycle

1. `Signup.tsx` calls `supabase.auth.signUp` with email, password, and display username. If confirmation is enabled, Supabase can create `auth.users` without giving the browser a session yet.
2. `app_private.handle_new_user` runs after the user row is inserted, creates `profiles` and `player_resources`, and inserts initial inventory. An Auth confirmation link returns to `/auth/callback` if that origin/path is allowed in Auth settings.
3. `authStore` restores a session with `getSession` and subscribes to auth-state changes. Protected pages require a real session when Supabase is configured. A user record without a session is not authenticated.
4. `getPostLoginPath` checks whether an owned `player_creatures` row has `is_starter = true`. A new authenticated player goes to `/starter`; an existing one goes to `/hub`.
5. `choose_starter(selected_pokemon_id)` accepts 1, 4, or 7, rejects a second choice, creates the creature, first party slot, Pokédex entry, and milestone updates in one database call.

If login says **Email not confirmed**, the database is behaving as configured; follow the confirmation link or adjust Auth settings intentionally for a local-only test project. Do not bypass confirmation by treating a signup response's user object as a session.

## Game RPC reference

| RPC | Caller / result | Core invariants |
| --- | --- | --- |
| `start_battle` | `lib/battleAttempts.ts` creates an attempt | Authenticated user, active question, matching encounter species, valid language. |
| `record_battle_result` | Saves submitted code/checkpoint states and final status | Own attempt; first-solve energy and first-win XP/coins are guarded against repeats. **Checkpoint statuses are currently client-supplied**. |
| `spend_battle_energy` | Starts combat after solve | Own solved attempt, energy available, healthy party member; exactly one spend per attempt. |
| `take_battle_action` | Move, switch, or item | Own active encounter and party; calculates damage/HP/enemy action, persists HP, returns ordered battle events and outcome. |
| `set_party_slot` | Collection party editor | Slot 1–6; creature belongs to user; a creature cannot occupy two slots. |
| `use_healing_item` | Collection recovery | Own creature, correct potion/revive use, available item quantity, no conflicting active encounter. |
| `catch_pokemon` | Post-win catch screen | Matching active question/species, latest attempt won, species not owned, usable ball in inventory; performs server-side roll and inventory decrement. |
| `buy_item` | Shop | Enough coins, active item, atomic inventory/resource update. |
| `claim_milestone_reward`, `claim_gym_reward` | Progress screens | Requirements met and reward not previously claimed. |
| `get_leaderboard` | Leaderboard | Returns public ranking fields without exposing private account data. |

The current app uses SQL advisory locks and row locks in several functions to serialize operations such as first-solve rewards, catches, and party edits. These are not UI locks; they prevent two concurrent HTTP requests from both winning the same resource race. Keep the function calls transactional and rerun concurrency tests after changing them.

## Database verification

`supabase/tests/backend_game_systems_rls.test.sql` is a pgTAP-style authorization/game-system check. On a disposable local stack, run the Supabase CLI's database-test command supported by your installed version (currently `npx supabase test db`) and inspect any failed assertion. Also test with two real user sessions: each can read only their own party/resources, neither can directly update coins/HP, and an unconfirmed account cannot call starter selection. The frontend build alone cannot verify any of these properties.
