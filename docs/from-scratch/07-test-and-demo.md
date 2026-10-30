# Lesson 7: check the whole system and show it on another device

**Goal:** prove each worker is running and then prove the full player journey. A green frontend build alone cannot prove Docker or Supabase is reachable.

## 1. Run checks from the right folder

Open a terminal in `frontend/`:

```powershell
npm ci
npm run lint
npm run build
node --test scripts/judge-server.test.mjs
```

`lint` finds suspicious code patterns. `build` asks TypeScript to check types and Vite to create `frontend/dist/`, the static website output. The judge test checks HTTP/judge behavior. If any command fails, read the **first** useful error and its filename/line number, fix it, then rerun that command.

The database has a separate test file at `supabase/tests/backend_game_systems_rls.test.sql`. Run it with the Supabase CLI on a disposable local stack after migrations. Do not reset a shared hosted database merely to run tests.

## 2. Prove the judge can really start a container

Run `docker info`. Pull `python:3.12-alpine` and `node:22-alpine` if missing. Start `npm run judge` in one terminal and leave it open. In another terminal run `npm run judge:check`. This submits a known-correct Python Two Sum answer through the HTTP endpoint, the temporary folder, Docker, and all three test groups. Passing means that path works on this computer.

Docker Desktop may show no running container after the check. The judge uses `--rm`, so each group container disappears after its test. If `judge:check` fails while the website loads, the problem is in judge/Docker/network setup rather than the React page.

## 3. Walk through a fresh account

1. Start the selected Supabase backend, `npm run judge`, and `npm run dev` in separate terminals.
2. Sign up. If confirmation is on, open the email (or local Inbucket) and follow the `/auth/callback` link. Sign in and choose one starter.
3. Open Hub. Check the party and resources. Reload; they should persist.
4. Open Practice. Search, choose a question, inspect its examples and constraints, and resize the coding panels.
5. Submit a wrong solution. Results should show the failed checkpoint and keep the code draft. Submit a syntax error and verify the error is visible. Restore a complete correct `solve` function.
6. Run samples, then Submit all groups. Confirm the success overlay asks whether to Fight or return to Hub. Choose Hub once; it should not spend battle energy.
7. Re-enter the solved question, Submit again, choose Fight, and check that entering costs exactly one energy. Use a move, switch, or item. Reload and confirm creature HP is persisted.
8. Win; try a catch. Reload Collection and Profile. Submit that same question again: the fight is allowed, but first-solve/win rewards do not repeat, and a species already owned cannot be caught again.
9. Use a second account. Confirm its collection, party, progress, and resources are separate.

The intended wrong-answer HP penalty is not currently implemented, so step 5 confirms diagnostics and draft preservation, not an HP deduction. This is a known rule gap, described in [lesson 5](05-battle.md).

## 4. Understand the two-computer case

The hosting computer runs both Vite and the judge. From `frontend/` run `npm run dev -- --host 0.0.0.0`. On a second device, open the **Network** URL Vite prints, not `localhost`. Unless you set `VITE_JUDGE_URL`, the browser on that second device calls `http://<website-host>:8787/judge`. Therefore the host firewall must allow both Vite's port and 8787, and the judge must run on the website host. Starting `npm run judge` on the viewing laptop does not satisfy that URL.

Both devices must also reach Supabase. A hosted project is straightforward for a LAN demo. A local Supabase URL like `127.0.0.1:54321` points to each device's own loopback and is not automatically reachable from another device. Configure Auth redirect URLs for the actual site origins.

## 5. Diagnose by layer

| What you see | First check | What it means |
| --- | --- | --- |
| Blank/failed frontend build | Browser console and `npm run build` | React/import/TypeScript issue. |
| Login or starter fails | Browser Network RPC error, Auth confirmation, migrations | Supabase/Auth/database issue. |
| Results says judge unreachable | `npm run judge` terminal, URL, port 8787, firewall | Browser cannot contact Node judge. |
| Judge is listening but correct code fails | `npm run judge:check`, `docker info`, image list | Docker runner or case contract issue. |
| A Python body fails | Confirm the full `def solve(...):` wrapper and indentation | Submitted source may not match the expected module contract. |
| HP/coins display stale | Reload and inspect RPC result/query refetch | Cached UI may lag database. |
| Page refresh 404 after deployment | Static host SPA fallback to `index.html` | Server knows files, not React routes. |

## 6. Deploy responsibly

The Vite build produces static files only. It does not deploy the Node judge, Docker engine, hidden cases, or database. A public deployment needs an HTTPS frontend, Supabase or a managed database/Auth stack, and a separately operated protected judge. A browser on an HTTPS site cannot call a plain HTTP judge because of mixed-content rules. Set `VITE_JUDGE_URL` before building to the reachable protected HTTPS address.

The current judge accepts unauthenticated code and the current database accepts browser-supplied checkpoint statuses. Before public exposure, authenticate/rate-limit the judge, put it on an isolated host with stronger container restrictions and monitoring, and make a trusted backend attest solves to the database. See [the main security section](../07-verification-deployment-and-troubleshooting.md#security-and-current-limitations). Do not publish a database password, service key, hidden test JSON on a static host, or media whose distribution terms you have not reviewed.

**Completion check:** all commands pass, a fresh account can finish a question and battle, a second account remains separate, a second device can reach the same services, and you can explain which worker owns every saved outcome.
