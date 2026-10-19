# Zenpho Frontend Context

Zenpho is a React 19 + Vite + TypeScript single-page coding battle game with a Pokémon-style progression layer. Its frontend uses React Router, TanStack Query, Zustand, Tailwind CSS 4, Framer Motion, Monaco, and Supabase.

- Preserve the existing `frontend/src` structure (`pages`, `components`, `hooks`, `lib`, `store`, and domain types). Keep changes aligned with nearby patterns; do not reorganize by feature as a default.
- Use npm and the scripts in `frontend/package.json`. The project uses Oxlint; it does not currently standardize on pnpm, ESLint, or Prettier.
- Keep the existing Tailwind and pixel-art visual language. Do not add a component framework, i18n library, or new state layer without a concrete requirement.
- Follow the existing Supabase client and auth flow. For Supabase or Postgres changes, use the repo's `supabase` and `supabase-postgres-best-practices` skills; for security-sensitive work, also use `code-security`.
- Do not write application code unless explicitly asked. Do not add or run tests unless asked.
- Game outcomes and rewards are intended to be server-authoritative. Trace UI and persistence changes to the relevant Supabase RPC and migrations; do not make the frontend an authority for damage, XP, coins, catches, or other rewards.
