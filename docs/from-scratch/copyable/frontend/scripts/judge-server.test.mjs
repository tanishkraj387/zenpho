import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

async function unusedPort() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  await new Promise((resolve) => server.close(resolve))
  if (!address || typeof address === 'string') throw new Error('No test port')
  return address.port
}

test('missing Docker is a judge error, not a wrong answer', async () => {
  const emptyPath = await mkdtemp(path.join(tmpdir(), 'zenpho-empty-path-'))
  const port = await unusedPort()
  const server = spawn(process.execPath, [fileURLToPath(new URL('./judge-server.mjs', import.meta.url))], {
    env: { ...process.env, PATH: emptyPath, JUDGE_PORT: String(port) },
    stdio: 'ignore',
    windowsHide: true,
  })

  try {
    let response
    const payload = {
      code: 'def solve(nums, target):\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]',
      difficulty: 'easy',
      language: 'python',
      mode: 'submit',
      pokemonName: 'Bulbasaur',
      questionId: 'easy-arrays-two-sum',
    }

    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/judge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        break
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    assert.ok(response, 'judge server did not start')
    const body = await response.json()
    assert.equal(response.status, 400)
    assert.match(body.error, /docker/i)
    assert.doesNotMatch(body.error, /answer missed/i)
  } finally {
    server.kill()
    await rm(emptyPath, { recursive: true, force: true })
  }
})
