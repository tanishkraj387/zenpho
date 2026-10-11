# Supabase Game Schema

This schema is the first backend authority layer for Zenpho.

## Files

- `supabase/migrations/20261010121500_initial_game_schema.sql`
- `supabase/migrations/20261010121600_seed_catalog.sql`
- `supabase/migrations/20261010121700_choose_starter_function.sql`

## Authority Model

The frontend may read:

- active Pokemon species catalog
- active coding questions
- active shop item catalog
- the signed-in user's own profile
- the signed-in user's own resources, inventory, creatures, battles, catch attempts, and milestones

The frontend must not authoritatively mutate:

- coins
- XP
- energy
- inventory quantities
- caught Pokemon
- battle results
- catch results
- milestone rewards

Those mutations should be performed by trusted server-side code later, such as Supabase Edge Functions or backend services using trusted credentials.

## RLS Shape

All public tables have RLS enabled.

Catalog tables use public read policies:

- `pokemon_species`
- `questions`
- `inventory_items`

Player-owned tables use owner-only read policies with:

```sql
(select auth.uid()) = user_id
```

The `profiles` table uses the authenticated user's `auth.users.id` as its primary key.

## Signup Bootstrap

The migration adds an `auth.users` trigger that creates:

- `profiles`
- `player_resources`
- starter inventory rows for basic items

The trigger lives in `app_private`, runs as `security definer`, and has public execute revoked. It uses `raw_user_meta_data.username` only as a display value, not as authorization data.

## Applying Later

Supabase CLI is not installed in this workspace right now. Once installed and linked, apply with the normal project workflow, for example:

```bash
supabase db push
```

Then run the advisors/tests available in your Supabase setup before treating this as production-ready.

## Local Setup

This repo now includes `supabase/config.toml` for a local Supabase project.

After installing the Supabase CLI:

```bash
supabase start
supabase db reset
```

The local API will use:

```text
http://127.0.0.1:54321
```

Copy only the local public anon key into your local `frontend/.env` or equivalent environment file:

```text
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon key from supabase start>
```

Do not commit `.env` files.

## Cloud Setup

For the hosted project:

1. Sign in to Supabase with your account.
2. Create or open the Zenpho project.
3. Apply the migrations in `supabase/migrations/`.
4. Copy the project URL and public anon key into your local frontend env file.
5. Create your app account through `/signup` using your email and username.

The frontend must use only the public anon key. Never put a service role key in the frontend.

## Starter Selection

The frontend calls:

```sql
public.choose_starter(selected_pokemon_id integer)
```

The function:

- requires an authenticated user
- only allows Bulbasaur, Charmander, or Squirtle
- prevents more than one starter per user
- inserts the starter creature server-side

This keeps starter ownership out of local client authority once Supabase is configured.

## Local ROM Music

The app can use local ROM-derived music, but browsers cannot directly play Nintendo DS `.sdat` sequence archives. The repo now includes:

```bash
npm run rom-music
```

This scans ignored local ROM assets and writes:

```text
frontend/public/user-assets/audio/manifest.json
```

To make actual music play:

1. Open one of the discovered `.sdat` archives in VGMTrans or another local converter.
2. Export/render the track as `.ogg`, `.mp3`, or `.wav`.
3. Run:

```bash
npm run rom-music -- <folder-with-converted-audio>
```

When `manifest.json` contains a playable track, the frontend audio system will use it as looping background music when sound is enabled. These local assets are ignored by Git.
