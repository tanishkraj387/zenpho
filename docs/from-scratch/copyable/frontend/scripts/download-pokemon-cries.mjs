import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const rosterPath = path.join(frontendRoot, 'sprite-ids.json')
const audioRoot = path.join(frontendRoot, 'public/user-assets/audio')
const criesRoot = path.join(audioRoot, 'cries')
const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy'

async function pathExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume()
        downloadFile(response.headers.location, outputPath).then(resolve, reject)
        return
      }

      if (response.statusCode !== 200) {
        response.resume()
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }

      const file = createWriteStream(outputPath)
      response.pipe(file)
      file.on('finish', () => {
        file.close(() => resolve())
      })
      file.on('error', reject)
    })

    request.on('error', reject)
  })
}

async function writeCriesManifest(ids, missing) {
  const cries = []

  for (const id of ids) {
    const fileName = `${id}.ogg`
    const filePath = path.join(criesRoot, fileName)

    if (!(await pathExists(filePath))) {
      continue
    }

    const info = await stat(filePath)

    cries.push({
      id,
      source: 'PokeAPI/cries legacy',
      url: `/user-assets/audio/cries/${fileName}`,
      bytes: info.size,
    })
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'https://github.com/PokeAPI/cries',
    variant: 'legacy',
    cries,
    missing,
  }

  await writeFile(path.join(criesRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return cries.length
}

const ids = JSON.parse(await readFile(rosterPath, 'utf8'))

if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id))) {
  console.error(`Expected ${path.relative(frontendRoot, rosterPath)} to contain an array of IDs.`)
  process.exit(1)
}

await mkdir(criesRoot, { recursive: true })

let downloaded = 0
let skipped = 0
const missing = []

for (const id of ids) {
  const outputPath = path.join(criesRoot, `${id}.ogg`)

  if (await pathExists(outputPath)) {
    skipped += 1
    continue
  }

  try {
    await downloadFile(`${baseUrl}/${id}.ogg`, outputPath)
    downloaded += 1
    console.log(`Downloaded cry ${id}`)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    missing.push({ id, reason })
    console.warn(`Missing cry ${id}: ${reason}`)
  }
}

const available = await writeCriesManifest(ids, missing)

console.log('')
console.log(`Pokemon cries available: ${available}`)
console.log(`Downloaded: ${downloaded}`)
console.log(`Already cached: ${skipped}`)
console.log(`Missing: ${missing.length === 0 ? 'none' : missing.map((item) => item.id).join(', ')}`)
