# Lesson 2: public data, PostgreSQL, and migrations

**Goal:** understand where questions and Pokémon come from, then create durable account and battle tables. A database is the game's saved memory. If you close the browser and a Pokémon's HP is still lower when you return, the value came from PostgreSQL rather than a React variable.

## 1. Separate three kinds of data

| Data | Example | Where it belongs | Why |
| --- | --- | --- | --- |
| Public catalog | Question text, examples, starter code, Pokémon species | `frontend/src/data/` and public catalog tables | Everyone may read it. |
| Private judge cases | Hidden inputs and expected results | `judge-data/question-tests.json` on the judge host | A player must not download the answers. |
| Per-player state | Coins, energy, creatures, HP, attempts, catches | PostgreSQL tables protected by RLS | It must persist and belong to one account. |

Create `frontend/src/data/` and copy [questions.json](copyable/frontend/src/data/questions.json), [pokemon-roster.json](copyable/frontend/src/data/pokemon-roster.json), and [encounter-tiers.json](copyable/frontend/src/data/encounter-tiers.json). The first has 50 prompts. Each `encounterPokemonId` is unique. `questions.ts` validates/maps question IDs; `pokemon.ts` looks up species; `pokemonBattle.ts` supplies battle presentation data. These files are public display data, not authority for catches or rewards.

One question record looks like this (abbreviated to teach the shape; copy the **full** JSON file from the snapshot):

```json
{
  "id": "easy-arrays-two-sum",
  "title": "Two Sum Training",
  "difficulty": "easy",
  "topic": "arrays",
  "description": "Given nums and target, return two indices...",
  "encounterPokemonId": 54,
  "examples": [{ "input": "nums = [2,7], target = 9", "output": "[0,1]" }],
  "starterCode": {
    "python": "def solve(nums, target):\n    return []\n",
    "javascript": "export function solve(nums, target) {\n  return []\n}\n"
  },
  "constraints": ["Exactly one pair adds to target."]
}
```

The ID joins the public question, private tests, and database row. Changing an ID in only one place breaks submissions. The text in `starterCode` is a *string containing code*; `\n` represents a new line inside JSON.

## 2. Create a Supabase project

The easiest first run uses a hosted Supabase project. In its dashboard, obtain the Project URL and **public/anon** key. Copy [frontend/.env.example](copyable/frontend/.env.example) to `frontend/.env.local` and fill in those two values. The `VITE_JUDGE_URL` field can stay blank for a local judge. Restart Vite after editing it. Never put the Postgres password or service-role key in a `VITE_` field: Vite exposes those values to the browser.

Alternatively, install the Supabase CLI using the repository's root package or your normal CLI installation, start Docker Desktop, and follow [local setup](../02-local-setup.md) to run `npx supabase start` and `npx supabase db reset`. A reset deletes local data, so use it only on disposable local development data.

## 3. Make tables with SQL migrations

Create `supabase/migrations/` under the outer project folder. A filename starting with a timestamp sorts migrations into a fixed order. Copy the [migration files](copyable/supabase/migrations/) in that order. The first file, `20261010121500_initial_game_schema.sql`, creates types, tables, foreign keys, checks, indexes, RLS, grants, and the signup trigger. Later files seed catalogs and add/replace functions. **Do not apply only the first migration and expect the final battle to work.** Apply every migration; the latest function definition wins.

Here is a small example of the kind of invariant in the first migration:

```sql
create table public.player_resources (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  xp integer not null default 0 check (xp >= 0),
  energy integer not null default 50 check (energy >= 0),
  max_energy integer not null default 50 check (max_energy > 0),
  updated_at timestamptz not null default now(),
  check (energy <= max_energy)
);
```

`primary key` makes one resource row per user. `references` links that row to the player's profile; `on delete cascade` removes it if the account is removed. `default` gives starting values. `check` prevents negative resources and energy above the maximum even if a programmer makes a mistake. These are database rules; a disabled button in the browser is only a convenience.

`player_creatures` stores each owned Pokémon instance and its persistent `current_hp`/`max_hp`. `party_slots` selects at most six of those creatures. `battle_attempts` stores question ID, language, code draft, checkpoint states, encounter HP, turn, entry-energy status, and outcome. `player_pokedex` records seen/caught species. `player_inventory` records item quantities. Read the [database chapter](../04-database-and-auth.md) for the complete table map.

## 4. Protect player rows with RLS

**Row-level security** means PostgreSQL checks which rows a signed-in role may read or change. A typical owner-only policy is:

```sql
alter table public.player_creatures enable row level security;
create policy "read own creatures" on public.player_creatures
  for select to authenticated
  using ((select auth.uid()) = user_id);
```

`auth.uid()` comes from the verified Supabase session, not a user ID typed into a request. The `(select auth.uid())` form is a common Supabase pattern that can avoid re-evaluating the function for every row. Grants and RLS both matter: a policy cannot allow an operation a role has no grant for. Direct resource updates should not be granted to the browser; validated SQL functions do them.

## 5. Understand database functions and atomicity

An **RPC** is a SQL function the frontend calls using `supabase.rpc('function_name', { ... })`. For example, `choose_starter` checks the caller, verifies the starter ID, checks that they have not chosen before, creates an owned creature, puts it in a party slot, and updates related records in one database transaction. If any part fails, the whole transaction rolls back. This prevents half a starter selection.

Functions that run with `SECURITY DEFINER` require extra care. They must authenticate with `auth.uid()`, check ownership of every row and ID, use a restricted `search_path`, and grant execute only to intended roles. Do not trust a user ID, coins, HP, or “passed” status merely because the browser sent it. The current `record_battle_result` still accepts client-supplied checkpoint statuses; this is documented in [lesson 5](05-battle.md), not endorsed as a safe final design.

Concurrent requests are another reason to use database functions. A **row lock** or **advisory transaction lock** serializes a critical operation so two clicks cannot both spend the same one energy or both receive a first-win reward. Unique indexes enforce one active encounter species per question and prevent duplicate ownership where the current rules require it.

## 6. Apply and test migrations

For a fresh hosted project, the repo's helper [apply-supabase-migrations.mjs](copyable/frontend/scripts/apply-supabase-migrations.mjs) reads the `SUPABASE_DB_URL` environment variable, applies sorted SQL files, and records filenames in `public.schema_migrations`. Set the variable only in the terminal running the helper; do not save it in frontend env files. See the exact commands in [local setup](../02-local-setup.md). The Supabase CLI uses a separate migration history; choose one method per project unless you deliberately reconcile both histories.

Copy [supabase/tests/backend_game_systems_rls.test.sql](copyable/supabase/tests/backend_game_systems_rls.test.sql) to test the database. Use a throwaway local database for test resets. Verify two accounts cannot read each other's party/resources and cannot directly edit rewards. A fresh confirmed account should select exactly one starter.

**Checkpoint:** all migrations apply without error, 50 question rows have unique encounters, a confirmed user receives profile/resources, and direct writes to another player's resources are rejected. Next: [Auth and pages](03-auth-and-pages.md).
