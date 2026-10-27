# 2. Local setup and first run

This chapter starts the existing repository. Choose **one** database path: hosted Supabase or a local Supabase stack. Both use the same React app and judge. Work in `frontend/` for app commands; the root package contains an older scaffold and is not the game runtime.

## Prerequisites

- Git, Node.js with npm, and Docker Desktop in **Linux-container mode** (or a compatible Docker Engine). Node 24 was used to verify this repository; check the [Vite guide](https://vite.dev/guide/) if selecting a different supported Node release.
- Enough disk space for the Python and Node container images and the checked-in media assets.
- A Supabase project URL and browser-safe public/anon key, or the local Supabase CLI stack. Do **not** place a database password, service-role key, or JWT secret in any `VITE_` variable.
- For a second device, both machines must be on a network where the browser can reach the website, judge port 8787, and the selected Supabase API.

Clone the repository and install the frontend's locked dependencies:

```powershell
git clone https://github.com/tanishkraj387/zenpho.git
cd zenpho
git switch frontend-setup
cd frontend
npm ci
```

On macOS/Linux, use `cp .env.example .env.local` in the next steps instead of PowerShell's `Copy-Item`. If you use an existing checkout, pull the branch first rather than cloning.

## Option A: Hosted Supabase

1. Create a Supabase project. Obtain its **Project URL** and public/anon key from the project Connect/API settings. Never use the service-role key in the browser.
2. Apply the ordered SQL migrations in `supabase/migrations/` to that project. For this repo's custom helper, set `SUPABASE_DB_URL` only in the shell that runs it:

   ```powershell
   cd frontend
   $env:SUPABASE_DB_URL = '<your Postgres connection URI>'
   npm run supabase:apply
   Remove-Item Env:SUPABASE_DB_URL
   ```

   The helper records filenames in `public.schema_migrations`. It is an **imperative repo-specific path**, separate from the Supabase CLI's `supabase_migrations.schema_migrations`. Do not mix `supabase db push` and this helper on the same project without reconciling their histories. Check which files were applied before running against an existing project. Use a throwaway project first if you are unsure.
3. Copy the example env file and fill in the public values:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-anon-key
   VITE_JUDGE_URL=
   ```

4. In Supabase Auth URL settings, allow your local site origin and `/auth/callback` redirect. If email confirmation is enabled, confirm the signup email before trying to choose a starter. An unconfirmed user record is not a signed-in session.

## Option B: Local Supabase

The repository has `supabase/config.toml`, migrations, and catalog seed migrations. Docker Desktop must be running first. From the **repo root**:

```powershell
npm ci
npx supabase start
npx supabase db reset
npx supabase status
```

`db reset` recreates the **local** database from migrations; it deletes local data. Do not add `--linked` unless deliberately resetting a remote development project. Copy the local API URL and anon key printed by `supabase status` into `frontend/.env.local`. The configured local API port is 54321, Studio 54323, and Inbucket 54324. The local Auth config enables email confirmation; use Inbucket to inspect local confirmation mail. A browser on another computer cannot reach `127.0.0.1:54321` on your host by using its own loopback address. For multi-device testing, a hosted Supabase project is simpler, or explicitly expose and configure the local stack and its Auth redirects.

The local stack's `supabase_*` Docker containers are the database/API services. They are **not** the judge's Python/Node test containers. The Supabase CLI's [local workflow](https://supabase.com/docs/guides/local-development/cli-workflows) explains its migration and seed behavior.

## Start the judge

On the computer that will serve the website, from `frontend/`:

```powershell
docker info
docker pull python:3.12-alpine
docker pull node:22-alpine
npm run judge
```

Leave this terminal open. The judge prints engine and missing-image diagnostics on startup. The image pulls are required because the judge uses `docker run --pull never` to keep network downloads out of a timed submission. The Node HTTP service listens on port 8787; it does **not** create a persistent Docker container. Each Run/Submit launches a container per test group and removes it with `--rm` when that group finishes. [Docker's run reference](https://docs.docker.com/reference/cli/docker/container/run) documents both flags.

In a second `frontend/` terminal, run:

```powershell
npm run judge:check
```

It sends a known-good Python two-sum solution through HTTP, Docker, and all three checkpoint groups. A pass proves the local judge path, but does not test login or database rewards. A failure prints the exact judge/Docker error; fix it before evaluating player submissions.

## Start the website

In another `frontend/` terminal:

```powershell
npm run dev
```

Open Vite's printed URL, usually `http://localhost:5173`. Register an account, confirm its email if required, sign in, choose a starter, solve a question, and enter an encounter. Run/Submit uses the judge at `http://<website-hostname>:8787/judge` unless `VITE_JUDGE_URL` is explicitly set. Vite reads `VITE_` variables when it starts and exposes them to the browser; restart Vite after editing `.env.local`. [Vite's environment guide](https://vite.dev/guide/env-and-mode.html) explains the rule.

## View the site on a second device

Run Vite with LAN binding on the hosting computer:

```powershell
npm run dev -- --host 0.0.0.0
```

Use the **network URL printed by Vite**, not `localhost`, on the second device. Keep `npm run judge` running on the same hosting computer, or explicitly set `VITE_JUDGE_URL` to a separately reachable judge before restarting Vite. Allow inbound access to Vite's port and TCP 8787 in the host firewall. Both devices need a reachable Supabase API URL and an allowed Auth redirect origin. For a production-style HTTPS site, do not point browser JavaScript at an HTTP-only judge; serve an authenticated HTTPS judge behind an appropriate reverse proxy after addressing the [security limitations](07-verification-deployment-and-troubleshooting.md#security-and-current-limitations).

## Before declaring setup complete

Run `npm run build`, `npm run lint`, and `node --test scripts/judge-server.test.mjs` from `frontend/`; then follow the full [verification checklist](07-verification-deployment-and-troubleshooting.md). The build does not prove that Docker or Supabase is reachable at runtime.
