import { access, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const toolsRoot = path.join(frontendRoot, 'public/user-assets/tools')
const audioRoot = path.join(frontendRoot, 'public/user-assets/audio')
const sdatRoot = path.join(audioRoot, 'sdat')
const rippedRoot = path.join(audioRoot, 'ripped')
const defaultDualRip = path.join(toolsRoot, 'DualRip.exe')
const dualRipPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultDualRip
const allowDsBulkRip = process.argv.includes('--allow-ds-bulk-rip')

if (!allowDsBulkRip) {
  console.error('ROM music ripping is disabled by default.')
  console.error('This project is targeting Kanto/Gen 1 scope, but the available Kanto ROM is Pokemon FireRed.gba.')
  console.error('DualRip is for Nintendo DS SDAT archives, so running it here rips thousands of unrelated DS files.')
  console.error('If you intentionally want the old DS bulk rip, rerun with: npm run rom-rip -- --allow-ds-bulk-rip')
  process.exit(1)
}

async function pathExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function walk(directory, visitor) {
  if (!(await pathExists(directory))) {
    return
  }

  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      await walk(entryPath, visitor)
    } else if (entry.isFile()) {
      await visitor(entryPath)
    }
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: frontendRoot,
      stdio: 'inherit',
      windowsHide: true,
    })

    child.on('error', (error) => {
      console.error(error.message)
      resolve(1)
    })

    child.on('close', (code) => {
      resolve(code ?? 1)
    })
  })
}

if (!(await pathExists(dualRipPath))) {
  console.error(`DualRip was not found at: ${dualRipPath}`)
  console.error('Download DualRip.exe and place it at:')
  console.error(defaultDualRip)
  console.error('Then rerun: npm run rom-rip')
  process.exit(1)
}

const sdatFiles = []

await walk(sdatRoot, async (filePath) => {
  if (path.extname(filePath).toLowerCase() === '.sdat') {
    sdatFiles.push(filePath)
  }
})

if (sdatFiles.length === 0) {
  console.error(`No .sdat files found in ${sdatRoot}`)
  console.error('Run: npm run rom-assets -- D:\\assets\\roms')
  process.exit(1)
}

await mkdir(rippedRoot, { recursive: true })

let failed = 0

for (const sdatFile of sdatFiles) {
  const outDir = path.join(rippedRoot, slugify(path.basename(sdatFile)))

  console.log('')
  console.log(`Ripping ${path.basename(sdatFile)} -> ${path.relative(frontendRoot, outDir)}`)

  const code = await runCommand(dualRipPath, [
    '--file',
    sdatFile,
    '--sequence',
    'all',
    '--out',
    outDir,
  ])

  if (code !== 0) {
    failed += 1
    console.error(`DualRip failed for ${sdatFile} with exit code ${code}`)
  }
}

if (failed > 0) {
  console.error('')
  console.error(`Finished with ${failed} failed SDAT rip(s).`)
  process.exit(1)
}

console.log('')
console.log('Refreshing app audio manifest from ripped WAV files...')
const manifestCode = await runCommand(process.execPath, [
  path.join(__dirname, 'prepare-rom-music.mjs'),
  rippedRoot,
])

process.exit(manifestCode)
