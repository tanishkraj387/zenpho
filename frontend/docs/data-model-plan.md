# Zenpho Data Model Plan

## Approved Product Rules

- Solving a coding question creates a Pokemon encounter.
- Passing test groups weakens the encountered Pokemon.
- Solving the question makes the Pokemon catchable.
- Every solved question allows a catch attempt.
- Failed catches consume the ball.
- Energy is stamina, not a battle ticket.
- Energy drains from runs, submits, wrong answers, harder questions, repeated attempts, special encounters, and gym or milestone battles.
- Energy recharges from solving questions.
- Low energy reduces both catch odds and rewards.
- Duplicate caught Pokemon are allowed.
- Only the chosen active Pokemon levels from battle XP.
- Legendary Pokemon require both hard questions and milestone progress.
- Server decides damage, HP changes, energy changes, rewards, catches, inventory, and milestones.
- Frontend plays back server events only.

## Public Catalog Data

Readable by logged-out users:

- Pokemon species catalog
- Active question previews
- Active item catalog
- Active milestone definitions
- Public encounter metadata

Private to authenticated users:

- Profile
- Inventory
- Caught Pokemon
- Pokedex status
- Battle attempts
- Battle events
- Catch attempts
- Milestone progress
- Purchases

## Tables

### `profiles`

One row per authenticated player.

- `id uuid primary key references auth.users(id)`
- `username text not null`
- `display_name text`
- `coins integer not null default 0`
- `energy integer not null default 100`
- `max_energy integer not null default 100`
- `xp integer not null default 0`
- `level integer not null default 1`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Server-owned fields: `coins`, `energy`, `max_energy`, `xp`, `level`.

### `pokemon_species`

Canonical Pokemon roster data.

- `id integer primary key`
- `name text not null`
- `primary_type text not null`
- `secondary_type text`
- `rarity text not null`
- `sprite_front text not null`
- `sprite_back text not null`
- `sprite_icon text not null`
- `cry_path text`
- `is_legendary boolean not null default false`
- `created_at timestamptz not null default now()`

Public read-only catalog.

### `questions`

Coding question catalog.

- `id uuid primary key default gen_random_uuid()`
- `slug text unique not null`
- `title text not null`
- `description text not null`
- `difficulty text not null`
- `topic text not null`
- `starter_code jsonb not null default '{}'`
- `examples jsonb not null default '[]'`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`

Hidden tests must not live in readable client tables.

### `question_encounters`

Maps questions to Pokemon encounters.

- `id uuid primary key default gen_random_uuid()`
- `question_id uuid not null references questions(id)`
- `pokemon_id integer not null references pokemon_species(id)`
- `rarity text not null`
- `encounter_kind text not null`
- `created_at timestamptz not null default now()`

### `player_pokemon`

Caught Pokemon owned by players. Duplicates are allowed.

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id)`
- `pokemon_id integer not null references pokemon_species(id)`
- `nickname text`
- `level integer not null default 1`
- `xp integer not null default 0`
- `source text not null`
- `caught_at timestamptz not null default now()`

Indexes:

- `(user_id)`
- `(user_id, pokemon_id)`

### `player_party`

Tracks chosen Pokemon. Only the active chosen Pokemon receives battle XP.

- `user_id uuid not null references auth.users(id)`
- `player_pokemon_id uuid not null references player_pokemon(id)`
- `slot integer not null`
- `is_active boolean not null default false`
- primary key `(user_id, slot)`

Rules:

- Slot should be 1 through 6.
- Only one row per user should have `is_active = true`.
- A party row must reference a Pokemon owned by the same user.

### `pokedex_entries`

Seen/caught tracking.

- `user_id uuid not null references auth.users(id)`
- `pokemon_id integer not null references pokemon_species(id)`
- `seen_at timestamptz`
- `caught_at timestamptz`
- `status text not null`
- primary key `(user_id, pokemon_id)`

### `inventory_items`

Shop and item catalog.

- `id text primary key`
- `name text not null`
- `item_type text not null`
- `price integer not null`
- `effect jsonb not null default '{}'`
- `sprite_path text`
- `is_active boolean not null default true`

Public read-only catalog.

### `player_inventory`

Player item counts.

- `user_id uuid not null references auth.users(id)`
- `item_id text not null references inventory_items(id)`
- `quantity integer not null default 0`
- `updated_at timestamptz not null default now()`
- primary key `(user_id, item_id)`

### `battle_attempts`

One coding battle attempt/session.

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id)`
- `question_id uuid not null references questions(id)`
- `pokemon_id integer not null references pokemon_species(id)`
- `phase text not null`
- `player_hp integer not null default 100`
- `enemy_hp integer not null default 100`
- `energy_spent integer not null default 0`
- `started_at timestamptz not null default now()`
- `completed_at timestamptz`

Code drafts stay frontend-only until submit.

Indexes:

- `(user_id, started_at desc)`
- `(user_id, phase)`

### `battle_submissions`

Submitted code history only, not draft history.

- `id uuid primary key default gen_random_uuid()`
- `battle_attempt_id uuid not null references battle_attempts(id)`
- `user_id uuid not null references auth.users(id)`
- `language text not null`
- `submitted_code text not null`
- `result text not null`
- `created_at timestamptz not null default now()`

Server-owned. Consider storing hashes instead of full code if privacy/storage becomes a concern.

### `battle_events`

Playback events for frontend animation.

- `id uuid primary key default gen_random_uuid()`
- `battle_attempt_id uuid not null references battle_attempts(id)`
- `user_id uuid not null references auth.users(id)`
- `event_type text not null`
- `payload jsonb not null default '{}'`
- `created_at timestamptz not null default now()`
- `sequence integer not null`

Index:

- `(battle_attempt_id, sequence)`

### `catch_attempts`

Tracks ball throws and outcomes.

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id)`
- `battle_attempt_id uuid not null references battle_attempts(id)`
- `pokemon_id integer not null references pokemon_species(id)`
- `ball_item_id text not null references inventory_items(id)`
- `success boolean not null`
- `shake_count integer not null`
- `created_at timestamptz not null default now()`

### `milestones`

Milestone definitions.

- `id text primary key`
- `title text not null`
- `description text not null`
- `milestone_type text not null`
- `target jsonb not null`
- `reward jsonb not null`
- `is_active boolean not null default true`

Public read-only catalog.

### `player_milestones`

Player progress toward milestones.

- `user_id uuid not null references auth.users(id)`
- `milestone_id text not null references milestones(id)`
- `progress integer not null default 0`
- `completed_at timestamptz`
- `claimed_at timestamptz`
- primary key `(user_id, milestone_id)`

### `shop_purchases`

Audit trail of purchases.

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id)`
- `item_id text not null references inventory_items(id)`
- `quantity integer not null`
- `coins_spent integer not null`
- `created_at timestamptz not null default now()`

## Server-Owned Actions

These should become Edge Functions or backend endpoints:

- `start_battle(question_id)`
- `run_samples(battle_attempt_id, language, code)`
- `submit_solution(battle_attempt_id, language, code)`
- `throw_ball(battle_attempt_id, ball_item_id)`
- `buy_item(item_id, quantity)`
- `claim_milestone(milestone_id)`
- `set_active_pokemon(player_pokemon_id)`

## RLS Rules

- Enable RLS on every exposed table.
- Player-owned rows use `user_id` policies based on `(select auth.uid()) = user_id`.
- Public catalog tables may allow `anon` and `authenticated` read access to active rows only.
- Client cannot directly change coins, XP, energy, inventory, catch results, caught Pokemon, battle events, or milestone progress.
- Never use editable `user_metadata` for authorization decisions.
