-- Keep the migration helper's bookkeeping table out of the public API surface.
-- This table is only used by frontend/scripts/apply-supabase-migrations.mjs.

create table if not exists public.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);

alter table public.schema_migrations enable row level security;
revoke all on public.schema_migrations from anon, authenticated;
