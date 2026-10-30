import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const migrationsRoot = path.join(repoRoot, 'supabase', 'migrations')
const databaseUrl = process.env.SUPABASE_DB_URL

if (!databaseUrl) {
  console.error('Missing SUPABASE_DB_URL.')
  console.error('Set it only for this command, then rerun. Do not commit it.')
  process.exit(1)
}

const sql = postgres(databaseUrl, {
  max: 1,
  onnotice: () => {},
})

function isAlreadyAppliedError(error) {
  return error?.code === '42710' || error?.code === '42P07' || error?.code === '42723'
}

try {
  await sql`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `
  await sql`alter table public.schema_migrations enable row level security`
  await sql`revoke all on public.schema_migrations from anon, authenticated`

  const migrationFiles = (await readdir(migrationsRoot))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  const appliedRows = await sql`select filename from public.schema_migrations`
  const appliedFiles = new Set(appliedRows.map((row) => row.filename))

  for (const file of migrationFiles) {
    if (appliedFiles.has(file)) {
      console.log(`Skipping ${file}`)
      continue
    }

    const migrationPath = path.join(migrationsRoot, file)
    const migrationSql = await readFile(migrationPath, 'utf8')

    console.log(`Applying ${file}`)

    try {
      await sql.unsafe(migrationSql)
    } catch (error) {
      if (!isAlreadyAppliedError(error)) {
        throw error
      }

      console.log(`Already applied outside this helper: ${file}`)
    }

    await sql`
      insert into public.schema_migrations (filename)
      values (${file})
      on conflict (filename) do nothing
    `
  }

  console.log('Migrations applied.')
} finally {
  await sql.end()
}
