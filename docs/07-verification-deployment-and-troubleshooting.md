# Verification, deployment, and troubleshooting

Verify each service separately, then verify a complete player journey. A successful Vite build means the frontend compiles; it cannot prove the database, judge, or Docker works on another machine.

## Repeatable checks

From `frontend/`, after `npm ci`:

```powershell
npm run lint
npm run build
node --test scripts/judge-server.test.mjs
```

With Docker Desktop running and both judge images present, start `npm run judge` in a separate terminal and run:

```powershell
npm run judge:check
```

This sends a known-correct Python Two Sum submission through HTTP and a temporary Docker container. The `supabase/tests/backend_game_systems_rls.test.sql` file contains database authorization/game-system tests; run it against an isolated local test database with the Supabase test workflow after applying migrations. Never run a destructive database reset against a shared hosted project.

## Manual demo walkthrough

1. Start the selected Supabase backend, the judge, and the Vite app. Open browser developer tools so failed network requests are visible.
2. Sign up with a fresh account. Confirm the email when enabled, sign in, and choose a starter. Confirm the Hub displays real resources and the starter in the party.
3. Open Practice and filter/search the catalog. Open a question; check examples, constraints, editor starter, and panel resizing.
4. Run a correct sample, then Submit a complete solution. Confirm all three checkpoints pass, the solve is stored, and the Fight/Hub overlay appears.
5. Choose Fight. Confirm one energy is spent once, the party lead and enemy remain visible, move animations and sounds play when enabled, and the database's HP result matches the scene after each action.
6. Switch a party member, use an item if available, finish the encounter, and attempt a catch. Check Collection, resources, party HP, and Profile after a reload.
7. Revisit the same solved question. Confirm it can be submitted again and fought again, but first-solve rewards do not repeat. If the species was not caught, the rematch can provide another catch chance; if already owned, it cannot be caught again.
8. Try an invalid solution and a syntax/runtime error. Confirm the draft remains, Results names the failed checkpoint or error, and neither is recorded as a solve.
9. Repeat the browser flow on a second device using the host's network URL. Verify its browser can reach both Vite and the judge and can authenticate with the chosen Supabase API.

Check desktop (around 1366×768), tablet, and narrow phone widths. The Battle canvas must remain inside its panel during both sides' attacks. Verify keyboard focus, text alternatives for important images, readable error text, and reduced-motion behavior. The visual sequence should never be the only indication of a win or loss.

## Deployment topology

The deployable parts are distinct:

| Part | What must run | Public exposure |
| --- | --- | --- |
| Frontend | `npm run build` output in `frontend/dist/`, served by a static host with SPA route fallback | HTTPS site |
| Supabase | Auth, Postgres migrations, Data API, allowed redirect URLs | Hosted Supabase or a separately operated stack |
| Judge | Node HTTP service, Docker engine, Python/Node images, private `judge-data/` | An authenticated, protected HTTPS service after hardening |

For a college demo on a LAN, Vite and judge can run on one development computer while both devices use a hosted Supabase project. Run Vite with `npm run dev -- --host 0.0.0.0`; point the second device to the network URL Vite prints. The browser's default judge URL follows that same hostname at port 8787. Open the necessary firewall ports and ensure both devices can reach the Supabase URL. `localhost` always refers to the device currently running the browser.

A production static host needs a rewrite to `index.html` for client-side routes. It also needs a separately deployed judge; uploading `frontend/dist/` does not start Node or Docker. If the site uses HTTPS, the judge also needs HTTPS or the browser will block mixed-content requests. Set `VITE_JUDGE_URL` to the final reachable URL at **build time** and rebuild; Vite's `VITE_` values are included in the client bundle.

## Troubleshooting by symptom

| Symptom | Check and corrective action |
| --- | --- |
| “Could not reach the judge” | Keep `npm run judge` running on the website host. Open/check TCP 8787 from the browser device. Verify `VITE_JUDGE_URL`, protocol, hostname, firewall, and that Vite was restarted after env changes. |
| `npm run judge` starts but a correct answer fails | Run `npm run judge:check` on that machine. Check `docker info`, Linux-container mode, and both pulled images. Read the Results error; distinguish a code diagnostic from Docker/infrastructure failure. |
| No container visible in Docker Desktop | The judge uses `docker run --rm` for each group. Containers exist only while testing. Use `npm run judge:check` to prove creation rather than expecting an idle container. |
| Docker daemon “Access is denied” | Ensure Docker Desktop is running and the terminal's account can access its engine. Open a fresh terminal after Docker/group changes; use `docker info` before retrying the judge. This is a host permission problem, not a Python answer problem. |
| Python Two Sum code seems correct but fails | Compare the submitted full source with the expected starter signature; include the `def` line and valid indentation. Then inspect the failing checkpoint diagnostic. The built-in judge check is a baseline for the host. |
| Login says “Email not confirmed” | Confirm the signup link. On the local stack, inspect Inbucket. Check Supabase Auth site URL and redirect allow-list, then sign in again. |
| “Could not choose starter” or battle cannot be saved | Check that every migration applied to the intended database, including later corrective migrations. Inspect the browser's failed RPC response and the authenticated session; retry with a fresh confirmed account. Do not put a database password in the browser to work around a policy error. |
| Second device can view pages but cannot Submit | That device may reach Vite but not port 8787. The judge runs on the host, not on the viewing device; check the endpoint in its browser Network panel. |
| Old balance/HP after a turn | Check the RPC result and whether TanStack Query invalidation/refetch completed. Reload to distinguish stale UI cache from persisted database state. |
| Route works in Vite but 404s after static deployment | Configure the static server's SPA fallback to serve `index.html` for application routes. |

## Security and current limitations

The PostgreSQL functions own battle turns, HP, item use, catches, and stored rewards. However, `record_battle_result` currently trusts checkpoint pass/fail states sent by the browser after a separate, unauthenticated judge request. A modified client can misreport a solve. The current judge also accepts code without binding the request to a logged-in account or attempt. **Do not expose this judge as a public code-execution API or claim the solve/reward path is tamper-proof.** For a public launch, make a trusted judge/backend attest results for a specific authenticated attempt and have the database verify that attestation or receive the result server-to-server. Add authentication, rate limits, request size limits, stronger container isolation, monitoring, and operational controls for the judge. Keep hidden tests and database/service credentials server-side.

The intended small HP cost for wrong submissions is not implemented by the current `record_battle_result` function. Failed submissions save the draft/checkpoint result, but do not deduct persistent creature HP. This is a documented product-rule gap rather than a working mechanic.

There are also media distribution considerations. Read the [asset attribution](../frontend/public/pokerogue/ATTRIBUTION.md) and [REUSE metadata](../frontend/public/pokerogue/REUSE.toml) and review each asset's terms before publishing a build that includes it.

The [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vite environment guide](https://vite.dev/guide/env-and-mode.html), and [Docker run reference](https://docs.docker.com/engine/containers/run/) are useful primary references when hardening or operating these boundaries.
