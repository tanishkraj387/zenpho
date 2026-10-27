# Zenpho

Zenpho is a Pokémon-style coding game. A player signs in, chooses a starter, solves a programming question, spends one energy to enter the associated encounter, battles with a party of up to six, and may catch a species they do not already own. The question catalog has 50 entries. Python and JavaScript solutions are checked by a local Node judge that launches short-lived Docker containers. Supabase provides authentication, PostgreSQL persistence, row-level security (RLS), and game RPC functions.

> **Project status:** This is a college-project/local-demo architecture, not a hardened public code-execution service. Battle turns and stored resources are calculated in PostgreSQL, but `record_battle_result` still accepts checkpoint statuses supplied by the browser after the separate judge responds. The judge endpoint has no account authentication. See [Security and current limitations](docs/07-verification-deployment-and-troubleshooting.md#security-and-current-limitations) before exposing it publicly.

## Start here

The active application is **`frontend/`**. The root `package.json`, `page.tsx`, and `index.html` are remnants of an earlier scaffold; use `frontend/package.json` for the game commands.

You need Node.js and npm, Docker Desktop running Linux containers (or a compatible Docker engine), and a Supabase project. Node 24 is a known-working choice in this repository; check the current Vite requirements if using another release. See [local setup](docs/02-local-setup.md) for exact local and hosted Supabase paths.

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.
docker pull python:3.12-alpine
docker pull node:22-alpine
npm run judge
```

Leave the judge running. In another `frontend/` terminal:

```powershell
npm run dev
```

Open the address printed by Vite. To verify the entire Python judge path, use a third terminal and run `npm run judge:check`. The judge creates a container only during Run/Submit and removes it after the test group finishes; an empty Docker container list while idle is expected.

| Command, from `frontend/` | Purpose |
| --- | --- |
| `npm run dev` | Vite development server |
| `npm run judge` | HTTP judge on port 8787; Docker containers start per submission |
| `npm run judge:check` | Submit a known-good Python two-sum answer to the local judge |
| `npm run build` | Type-check and create the production frontend in `frontend/dist/` |
| `npm run preview` | Serve the built frontend locally |
| `npm run lint` | Oxlint checks |
| `npm run supabase:apply` | Apply repo migrations to a database named by `SUPABASE_DB_URL` |

## Documentation

The [documentation index](docs/README.md) is the reading path for developers who want to recreate the project manually. It covers [architecture](docs/01-architecture-and-concepts.md), [setup](docs/02-local-setup.md), the [from-scratch build](docs/03-build-from-scratch.md), [database and auth](docs/04-database-and-auth.md), [judging and game rules](docs/05-judge-and-battle.md), [frontend and media](docs/06-frontend-and-assets.md), and [verification/deployment](docs/07-verification-deployment-and-troubleshooting.md). New programmers can follow the [beginner build course](docs/from-scratch/README.md), which explains the code and includes a copyable text-source companion.

## Repository map

```text
frontend/src/           React pages, components, hooks, stores, and data adapters
frontend/public/        Local sprites, battle animation sheets, sounds, icons
frontend/scripts/       Judge, migration helper, catalog and asset utilities
frontend/src/data/      Public question and Pokémon catalog JSON
judge-data/             Private sample/hidden/large-input test cases for the local judge
supabase/migrations/    Ordered PostgreSQL schema, catalog, and game RPC migrations
supabase/tests/         Database authorization/game-system test SQL
tools/                  Question-catalog generation utility
docs/                   Current developer guide and an older schema note
```

## Media and attribution

PokéRogue-derived sprites, animation data, cries, music, and sound effects are stored with [asset attribution](frontend/public/pokerogue/ATTRIBUTION.md), [REUSE metadata](frontend/public/pokerogue/REUSE.toml), and upstream license notices. Those assets do **not** all share one license. Pokémon and related names remain the property of their respective owners. Zenpho is an unaffiliated, non-commercial college project; do not assume that publishing the code grants permission to redistribute every media asset.
