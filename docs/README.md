# Zenpho developer guide

This guide is a reproducible blueprint for rebuilding and operating Zenpho. It describes the current repository and distinguishes shipped behavior from recommended hardening. Read the pages in order if you are building from an empty directory; use the table below as a reference once the project is running.

## Choose a project half

| Beginner guide | What it explains |
| --- | --- |
| [FRONTEND.md](FRONTEND.md) | Browser pages, React/TypeScript, routing, state, queries, editor, responsive UI, animation, and audio. |
| [BACKEND.md](BACKEND.md) | Supabase Auth, PostgreSQL/RLS/functions, the Node/Docker judge, persistence, rewards, and security boundaries. |

For an agent creating slides, give it the single [presentation context brief](PRESENTATION_CONTEXT.md). It summarizes the project and separates verified features from current limitations.

| Guide | What you will learn and produce |
| --- | --- |
| [1. Architecture and concepts](01-architecture-and-concepts.md) | Why the browser, judge, Docker, and Supabase are separate; state ownership and request flow |
| [2. Local setup](02-local-setup.md) | Exact commands for hosted or local Supabase, env files, judge, Vite, and another device |
| [3. Build from scratch](03-build-from-scratch.md) | Ordered manual implementation plan from an empty Vite project through a complete game; links to the detailed beginner course |
| [Beginner build course and source companion](from-scratch/README.md) | Plain-language lessons, copyable full text source, and an explanation of every project file |
| [4. Database and authentication](04-database-and-auth.md) | Tables, RLS, migrations, RPCs, signup bootstrap, confirmation, and persistence |
| [5. Judge and battle](05-judge-and-battle.md) | Code contracts, test groups, Docker execution, energy, party combat, catches, and rewards |
| [6. Frontend and assets](06-frontend-and-assets.md) | Routes, React state layers, loading gates, sprites, effects, audio, and licensing |
| [7. Verification, deployment, troubleshooting](07-verification-deployment-and-troubleshooting.md) | Tests, demo checklist, multi-device networking, failure diagnosis, and security limits |

## How to use this guide

- **I want to run the repo:** Follow [local setup](02-local-setup.md), then [verification](07-verification-deployment-and-troubleshooting.md).
- **I want to build it myself:** If new to programming, begin with the [beginner course](from-scratch/README.md). Otherwise read [architecture](01-architecture-and-concepts.md), then follow every checkpoint in [build from scratch](03-build-from-scratch.md). Keep the database and judge chapters beside you for contracts and schema details.
- **I want to extend it:** Locate the relevant feature in the [repository map](../README.md#repository-map), read its current contract, add a new migration for database changes, and rerun the corresponding checks.
- **I want to publish it:** First read [security and current limitations](07-verification-deployment-and-troubleshooting.md#security-and-current-limitations). A Vite build by itself is not a deployment of the judge or database.

## Source of truth and older notes

The actual code and the latest migration for a function take precedence when a document disagrees. Migrations are applied in filename order; later `CREATE OR REPLACE FUNCTION` definitions supersede earlier ones. The older [schema note](supabase-game-schema.md), [data-model plan](../frontend/docs/data-model-plan.md), and [battle presentation note](../frontend/BATTLE_PRESENTATION.md) record earlier design stages and may describe retired mechanics. This guide describes the current rules and calls out the unresolved trust boundary explicitly.

## Core vocabulary

| Term | Meaning |
| --- | --- |
| **Question** | A public coding prompt, examples, starter code, and one associated Pokémon species. |
| **Checkpoint** | One of the sample, hidden, or large-input test groups. “Efficiency” means completing the large-input tests within the time limit; it does not measure Big-O. |
| **Judge** | Local HTTP service in `frontend/scripts/judge-server.mjs` that runs submissions inside Docker. It is separate from Vite and Supabase. |
| **Attempt** | A stored `battle_attempts` row for a question and encounter. Repeated questions can create new attempts. |
| **Party** | Up to six owned creatures selected in `party_slots`; `player_creatures` stores each creature's persistent HP. |
| **Energy** | One ticket earned for a first solve and spent when entering one battle. Moves do not consume energy. |
| **RLS** | PostgreSQL row-level security; grants allow an operation, policies restrict which rows the role can see or change. |
| **RPC** | A PostgreSQL function exposed through Supabase's Data API and called with `supabase.rpc(...)`. |
