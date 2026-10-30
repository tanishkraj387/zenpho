import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const outputRoot = path.join(frontendRoot, 'public/user-assets/roms')
const romRoot = process.argv[2]
const extractAll = process.argv.includes('--all')

const interestingExtensions = new Set([
  '.sdat',
  '.narc',
  '.btx',
  '.nsbmd',
  '.nsbtx',
  '.nanr',
  '.ncer',
  '.ncgr',
  '.nclr',
])

const interestingPathParts = [
  'sound',
  'snd',
  'music',
  'bgm',
  'se',
  'sfx',
  'effect',
  'graphic',
  'graphics',
  'pokemon',
  'poke',
  'sprite',
  'battle',
]

if (!romRoot) {
  console.error('Usage: npm run rom-assets -- <path-to-rom-folder> [--all]')
  process.exit(1)
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readAscii(buffer, start, length) {
  return buffer
    .subarray(start, start + length)
    .toString('ascii')
    .replace(/\0+$/g, '')
    .trim()
}

function readU32(buffer, offset) {
  return buffer.readUInt32LE(offset)
}

function readU16(buffer, offset) {
  return buffer.readUInt16LE(offset)
}

function getNdsHeader(buffer) {
  return {
    title: readAscii(buffer, 0, 12),
    gameCode: readAscii(buffer, 12, 4),
    fntOffset: readU32(buffer, 0x40),
    fntSize: readU32(buffer, 0x44),
    fatOffset: readU32(buffer, 0x48),
    fatSize: readU32(buffer, 0x4c),
  }
}

function parseNdsFiles(buffer) {
  const header = getNdsHeader(buffer)
  const directoryCount = readU16(buffer, header.fntOffset + 6)
  const directories = []

  for (let index = 0; index < directoryCount; index += 1) {
    const entryOffset = header.fntOffset + index * 8
    directories.push({
      id: 0xf000 + index,
      subtableOffset: header.fntOffset + readU32(buffer, entryOffset),
      firstFileId: readU16(buffer, entryOffset + 4),
      parentId: readU16(buffer, entryOffset + 6),
    })
  }

  const files = []

  function walkDirectory(directoryId, parentPath) {
    const directory = directories[directoryId - 0xf000]

    if (!directory) {
      return
    }

    let cursor = directory.subtableOffset
    let fileId = directory.firstFileId

    while (cursor < header.fntOffset + header.fntSize) {
      const control = buffer[cursor]
      cursor += 1

      if (control === 0) {
        break
      }

      const nameLength = control & 0x7f
      const name = buffer.subarray(cursor, cursor + nameLength).toString('utf8')
      cursor += nameLength

      if (control & 0x80) {
        const childDirectoryId = readU16(buffer, cursor)
        cursor += 2
        walkDirectory(childDirectoryId, path.posix.join(parentPath, name))
      } else {
        const fatEntryOffset = header.fatOffset + fileId * 8
        const start = readU32(buffer, fatEntryOffset)
        const end = readU32(buffer, fatEntryOffset + 4)

        files.push({
          fileId,
          path: path.posix.join(parentPath, name),
          size: end - start,
          start,
          end,
        })
        fileId += 1
      }
    }
  }

  walkDirectory(0xf000, '')

  return {
    header,
    files,
  }
}

function shouldExtractNdsFile(file) {
  if (extractAll) {
    return true
  }

  const extension = path.extname(file.path).toLowerCase()
  const lowerPath = file.path.toLowerCase()

  return (
    interestingExtensions.has(extension) ||
    interestingPathParts.some((part) => lowerPath.includes(part))
  )
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

async function extractNds(romPath, romName) {
  const buffer = await readFile(romPath)
  const { header, files } = parseNdsFiles(buffer)
  const romOutput = path.join(outputRoot, slugify(romName))
  const extractedFiles = []

  for (const file of files) {
    if (!shouldExtractNdsFile(file)) {
      continue
    }

    const outputPath = path.join(romOutput, 'nitrofs', ...file.path.split('/'))
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, buffer.subarray(file.start, file.end))
    extractedFiles.push(file.path)
  }

  await writeJson(path.join(romOutput, 'manifest.json'), {
    sourceRom: romName,
    platform: 'nds',
    title: header.title,
    gameCode: header.gameCode,
    totalFiles: files.length,
    extractedFiles: extractedFiles.length,
    mode: extractAll ? 'all nitrofs files' : 'likely asset containers only',
    files: files.map((file) => ({
      id: file.fileId,
      path: file.path,
      size: file.size,
      extracted: extractedFiles.includes(file.path),
    })),
  })

  return {
    platform: 'nds',
    title: header.title,
    totalFiles: files.length,
    extractedFiles: extractedFiles.length,
  }
}

async function catalogGba(romPath, romName) {
  const buffer = await readFile(romPath)
  const title = readAscii(buffer, 0xa0, 12)
  const gameCode = readAscii(buffer, 0xac, 4)
  const makerCode = readAscii(buffer, 0xb0, 2)
  const romOutput = path.join(outputRoot, slugify(romName))

  await mkdir(romOutput, { recursive: true })
  await writeJson(path.join(romOutput, 'manifest.json'), {
    sourceRom: romName,
    platform: 'gba',
    title,
    gameCode,
    makerCode,
    note:
      'GBA Pokemon assets are embedded in packed binary data, not a filesystem. Add a dedicated decoder tool before using sprites, SFX, or music directly.',
  })

  return {
    platform: 'gba',
    title,
    totalFiles: 0,
    extractedFiles: 0,
  }
}

const entries = await readdir(romRoot, { withFileTypes: true })
const romFiles = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => ['.nds', '.gba'].includes(path.extname(name).toLowerCase()))

const summary = []

await mkdir(outputRoot, { recursive: true })

for (const romName of romFiles) {
  const romPath = path.join(romRoot, romName)
  const extension = path.extname(romName).toLowerCase()

  if (extension === '.nds') {
    summary.push({
      rom: romName,
      ...(await extractNds(romPath, romName)),
    })
  } else if (extension === '.gba') {
    summary.push({
      rom: romName,
      ...(await catalogGba(romPath, romName)),
    })
  }
}

await writeJson(path.join(outputRoot, 'manifest.json'), {
  sourceFolder: romRoot,
  generatedAt: new Date().toISOString(),
  extractAll,
  roms: summary,
})

console.log(`ROMs processed: ${summary.length}`)

for (const item of summary) {
  console.log(
    `- ${item.rom} (${item.platform} ${item.title || 'untitled'}): ${item.extractedFiles} extracted/cataloged`,
  )
}

console.log(`Output: ${path.relative(frontendRoot, outputRoot).replaceAll(path.sep, '/')}`)
