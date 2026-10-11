import { access, mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const audioRoot = path.join(frontendRoot, 'public/user-assets/audio')
const outputRoot = path.join(audioRoot, 'firered')
const toolRoot = path.join(frontendRoot, 'public/user-assets/tools/gba-audio-tools-py')
const defaultRomPath = 'D:\\assets\\roms\\Pokemon FireRed.gba'
const romPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultRomPath
const curatedSongs = [264, 265, 272, 278, 291]

async function pathExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function runCommand(command, args, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: frontendRoot,
      env: {
        ...process.env,
        ...extraEnv,
      },
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

async function writeManifest() {
  const playableTracks = []

  for (const songId of curatedSongs) {
    const fileName = `song${songId}.wav`
    const filePath = path.join(outputRoot, fileName)

    if (!(await pathExists(filePath))) {
      continue
    }

    const info = await stat(filePath)

    playableTracks.push({
      id: `firered-${songId}`,
      title: `FireRed Song ${songId}`,
      source: 'Pokemon FireRed.gba',
      url: `/user-assets/audio/firered/${fileName}`,
      bytes: info.size,
    })
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    playableTracks,
    discoveredSdatArchives: [],
    conversionNote:
      'Kanto-only audio is rendered from the user-owned Pokemon FireRed.gba ROM with gba-audio-tools. These local files are ignored by Git.',
  }

  await writeFile(path.join(audioRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(
    path.join(audioRoot, 'README.md'),
    [
      '# Local FireRed Audio',
      '',
      'This folder is ignored by Git and is only for local user-owned ROM assets.',
      '',
      'Zenpho is currently scoped to Kanto/Gen 1, so the app uses a small curated set of music rendered from `Pokemon FireRed.gba` instead of bulk-ripping Nintendo DS SDAT archives.',
      '',
      'Rerun the FireRed render with:',
      '',
      '```powershell',
      'npm run firered-music -- "D:\\assets\\roms\\Pokemon FireRed.gba"',
      '```',
      '',
      'The script expects `gba-audio-tools` to be installed locally under `public/user-assets/tools/gba-audio-tools-py` and writes playable tracks to `public/user-assets/audio/firered/`.',
      '',
    ].join('\n'),
  )

  return playableTracks.length
}

if (!(await pathExists(romPath))) {
  console.error(`FireRed ROM was not found at: ${romPath}`)
  console.error('Pass the ROM path explicitly, for example:')
  console.error('npm run firered-music -- "D:\\assets\\roms\\Pokemon FireRed.gba"')
  process.exit(1)
}

if (!(await pathExists(toolRoot))) {
  console.error(`gba-audio-tools was not found at: ${toolRoot}`)
  console.error('Install it locally first:')
  console.error(
    'python -m pip install --target "public\\user-assets\\tools\\gba-audio-tools-py" "git+https://github.com/mudassarzahid/gba-audio-tools.git"',
  )
  process.exit(1)
}

await mkdir(outputRoot, { recursive: true })

console.log(`Rendering FireRed songs from: ${romPath}`)
console.log(`Output folder: ${path.relative(frontendRoot, outputRoot)}`)

const code = await runCommand(
  'python',
  [
    '-m',
    'gba_audio.cli',
    'wav',
    romPath,
    '--songs',
    curatedSongs.join(','),
    '--loops',
    '1',
    '--fade',
    '1200',
    '--seconds',
    '75',
    '-o',
    outputRoot,
  ],
  {
    PYTHONPATH: toolRoot,
    PYTHONIOENCODING: 'utf-8',
  },
)

if (code !== 0) {
  process.exit(code)
}

const trackCount = await writeManifest()

console.log('')
console.log(`Playable FireRed tracks in manifest: ${trackCount}`)
