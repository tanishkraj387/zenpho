import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const sourceRoot = process.argv[2]

const itemNames = [
  'potion',
  'super-potion',
  'hyper-potion',
  'max-potion',
  'revive',
  'max-revive',
  'poke-ball',
  'great-ball',
  'ultra-ball',
  'master-ball',
  'rare-candy',
]

if (!sourceRoot) {
  console.error('Usage: npm run sprites -- <path-to-item-sprites>')
  process.exit(1)
}

const copyJobs = [
  ...itemNames.map((name) => ({
    from: path.join(sourceRoot, 'sprites/items', `${name}.png`),
    to: path.join(frontendRoot, 'public/sprites/items', `${name}.png`),
  })),
]

const missing = []
let copied = 0

for (const job of copyJobs) {
  try {
    await mkdir(path.dirname(job.to), { recursive: true })
    await copyFile(job.from, job.to)
    copied += 1
  } catch (error) {
    if (error?.code === 'ENOENT') {
      missing.push(path.relative(sourceRoot, job.from).replaceAll(path.sep, '/'))
      continue
    }

    throw error
  }
}

console.log(`Files copied: ${copied}`)
console.log('Missing files:')

if (missing.length === 0) {
  console.log('none missing')
} else {
  for (const file of missing) {
    console.log(`- ${file}`)
  }
}
