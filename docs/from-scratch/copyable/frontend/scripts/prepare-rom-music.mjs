import { access, copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const romAssetRoot = path.join(frontendRoot, 'public/user-assets/roms')
const audioRoot = path.join(frontendRoot, 'public/user-assets/audio')
const bgmRoot = path.join(audioRoot, 'bgm')
const sourceAudioRoot = process.argv[2]

const playableExtensions = new Set(['.mp3', '.ogg', '.wav', '.flac', '.m4a'])
const sdatFiles = []
const copiedTracks = []

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

async function copyPlayableAudio(sourceRoot) {
  if (!sourceRoot || !(await pathExists(sourceRoot))) {
    return
  }

  await walk(sourceRoot, async (filePath) => {
    const extension = path.extname(filePath).toLowerCase()

    if (!playableExtensions.has(extension)) {
      return
    }

    const outputName = `${slugify(path.basename(filePath))}${extension}`
    const outputPath = path.join(bgmRoot, outputName)
    const info = await stat(filePath)

    await mkdir(path.dirname(outputPath), { recursive: true })
    await copyFile(filePath, outputPath)
    copiedTracks.push({
      title: path.basename(filePath, extension),
      url: `/user-assets/audio/bgm/${outputName}`,
      bytes: info.size,
    })
  })
}

await walk(romAssetRoot, async (filePath) => {
  if (path.extname(filePath).toLowerCase() === '.sdat') {
    sdatFiles.push(path.relative(frontendRoot, filePath).replaceAll(path.sep, '/'))
  }
})

await mkdir(bgmRoot, { recursive: true })
await copyPlayableAudio(sourceAudioRoot)

const manifest = {
  generatedAt: new Date().toISOString(),
  playableTracks: copiedTracks,
  discoveredSdatArchives: sdatFiles,
  conversionNote:
    'Nintendo DS Pokemon music is stored as SDAT sequenced music. Convert your owned ROM music locally with VGMTrans or a similar tool into OGG/MP3/WAV, then run this script with that converted-audio folder.',
}

await writeFile(path.join(audioRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(
  path.join(audioRoot, 'README.md'),
  [
    '# Local ROM Audio',
    '',
    'This folder is ignored by Git.',
    '',
    'Workflow:',
    '',
    '1. Use VGMTrans or another local tool to open one of the extracted `.sdat` archives.',
    '2. Export/render the music you want as `.ogg`, `.mp3`, or `.wav`.',
    '3. Run:',
    '',
    '```bash',
    'npm run rom-music -- <folder-with-converted-audio>',
    '```',
    '',
    'The app reads `manifest.json` and plays the first converted track when sound is enabled.',
    '',
  ].join('\n'),
)

console.log(`SDAT archives discovered: ${sdatFiles.length}`)
console.log(`Playable tracks copied: ${copiedTracks.length}`)

if (copiedTracks.length === 0) {
  console.log('No playable audio was copied yet.')
  console.log('Convert SDAT music with VGMTrans or another local converter, then rerun:')
  console.log('npm run rom-music -- <folder-with-converted-audio>')
} else {
  for (const track of copiedTracks) {
    console.log(`- ${track.title}: ${track.url}`)
  }
}
