import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const databaseUrl = process.env.SUPABASE_DB_URL
const mode = process.argv[2]
const migrationNames = [
  '20261019120000_allow_question_rematches.sql',
  '20261019121000_add_question_catalog.sql',
  '20261020120000_allow_repeat_battle_wins.sql',
]

if (!databaseUrl || !['inspect', 'apply'].includes(mode)) {
  console.error('Usage: SUPABASE_DB_URL=<connection> node deploy-rematch-catalog.mjs inspect|apply')
  process.exit(1)
}

const migrationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations')
const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => {} })

try {
  const [schema] = await sql`
    select
      to_regclass('public.questions') is not null as has_questions,
      to_regclass('public.battle_attempts') is not null as has_attempts,
      to_regclass('public.schema_migrations') is not null as has_ledger,
      to_regprocedure('public.start_battle(text,integer,text)') is not null as has_start_battle,
      to_regprocedure('public.catch_pokemon(text,integer,text)') is not null as has_catch_pokemon
  `
  console.log('Schema:', JSON.stringify(schema))

  if (!schema.has_questions || !schema.has_attempts || !schema.has_start_battle || !schema.has_catch_pokemon) {
    throw new Error('Required game schema is missing; apply the baseline migrations first.')
  }

  const [{ count: beforeCount }] = await sql`select count(*)::integer as count from public.questions where is_active`
  const applied = schema.has_ledger
    ? await sql`select filename from public.schema_migrations where filename = any(${migrationNames}) order by filename`
    : []
  console.log('Active questions before:', beforeCount)
  console.log('Recorded migrations:', applied.map((row) => row.filename).join(', ') || '(none)')

  if (mode === 'apply') {
    if (beforeCount < 20) {
      throw new Error('Expected at least 20 baseline questions before catalog expansion.')
    }

    await sql.begin(async (tx) => {
      if (!schema.has_ledger) {
        await tx`create table public.schema_migrations (filename text primary key, applied_at timestamptz not null default now())`
        await tx`alter table public.schema_migrations enable row level security`
        await tx`revoke all on public.schema_migrations from anon, authenticated`
      }

      for (const name of migrationNames) {
        const rows = await tx`select 1 from public.schema_migrations where filename = ${name}`
        if (rows.length) {
          console.log('Already applied:', name)
          continue
        }
        const source = await readFile(path.join(migrationRoot, name), 'utf8')
        await tx.unsafe(source)
        await tx`insert into public.schema_migrations (filename) values (${name})`
        console.log('Applied:', name)
      }
    })

    const [{ count: afterCount }] = await sql`select count(*)::integer as count from public.questions where is_active`
    const [functions] = await sql`
      select
        (select prosrc like '%already_won%' from pg_proc where oid = 'public.record_battle_result(uuid,text,text,public.test_group_status,public.test_group_status,public.test_group_status,public.battle_status,integer,integer)'::regprocedure) as rewards_guarded,
        (select prosrc not like '%Question already solved%' from pg_proc where oid = 'public.start_battle(text,integer,text)'::regprocedure) as rematches_enabled
    `
    const recorded = await sql`select filename from public.schema_migrations where filename = any(${migrationNames})`
    const [{ index_removed: indexRemoved }] = await sql`
      select to_regclass('public.battle_attempts_one_win_per_user_question_idx') is null as index_removed
    `
    console.log('Active questions after:', afterCount)
    console.log('Verification:', JSON.stringify({ ...functions, indexRemoved, recorded: recorded.length }))
    if (afterCount < 50 || !functions.rewards_guarded || !functions.rematches_enabled || !indexRemoved || recorded.length !== migrationNames.length) {
      throw new Error('Post-deployment verification failed.')
    }
  }
} catch (error) {
  console.error('Database operation failed:', error?.code || error?.name || 'Error', error?.message || 'Unknown error')
  process.exitCode = 1
} finally {
  await sql.end()
}
