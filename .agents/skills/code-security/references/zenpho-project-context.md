# Zenpho Security Context

Zenpho is a Pokémon-style coding practice game. A player selects one programming problem for a battle, edits a Python or JavaScript solution in Monaco, and submits it against sample, hidden, and efficiency test groups. Battle events animate the result. The RPG layer tracks a party and collection, XP, coins, items, gyms, and progression.

## Trust boundaries

- Treat submitted code, request bodies, and client-provided player or battle fields as untrusted.
- The judge runner is in `frontend/scripts/judge-server.mjs`. It creates a temporary workspace and invokes Docker with a read-only workspace mount, no network, 256 MB memory, one CPU, and a timeout. Preserve these restrictions and review the whole host/container boundary when changing execution. Do not infer production isolation or deployment topology from this local runner alone.
- Supabase migrations and RPCs hold the intended authority for player state and outcomes. The frontend should play back authoritative battle events; it must not be the authority for damage, XP, coins, catches, or other rewards.
- Hidden tests must remain outside frontend-delivered assets and client-readable endpoints. Efficiency checkpoints test large inputs within a time limit; do not claim they measure Big-O.

## Review the complete flow

When changing judging or rewards, trace the path from the editor through `frontend/src/lib/judge.ts`, the judge server, `frontend/src/lib/battleAttempts.ts`, and the relevant Supabase RPC/migration. Verify which component actually judges the code and which component decides and persists outcomes. Do not assume that a server-side RPC is authoritative if it accepts client-supplied test statuses, HP, or rewards without independently validating them.

The repository's stated intent is the security requirement; source code may not fully implement it yet. Report that gap with evidence instead of treating current client behavior as the desired architecture.
