import { createServer } from 'node:http'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import testSuites from '../src/data/question-tests.json' with { type: 'json' }

const port = Number(process.env.JUDGE_PORT ?? 8787)
const pythonImage = process.env.JUDGE_PYTHON_IMAGE ?? 'python:3.12-alpine'
const nodeImage = process.env.JUDGE_NODE_IMAGE ?? 'node:22-alpine'
const groupTimeoutMs = Number(process.env.JUDGE_TIMEOUT_MS ?? 5000)
const maxCodeChars = 20000

const groupLabels = {
  samples: 'Sample tests',
  hidden: 'Hidden tests',
  efficiency: 'Efficiency tests',
}

function jsonResponse(response, status, body) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  })
  response.end(JSON.stringify(body))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''

    request.on('data', (chunk) => {
      body += chunk

      if (body.length > 100000) {
        request.destroy()
        reject(new Error('Request body is too large.'))
      }
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

function runCommand(command, args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      resolve({ code: 1, stdout, stderr: error.message, timedOut })
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      resolve({ code: code ?? 1, stdout, stderr, timedOut })
    })
  })
}

function normalize(value) {
  return JSON.stringify(value)
}

function buildPythonRunner() {
  return `
import importlib.util
import json
import sys
import traceback

spec = importlib.util.spec_from_file_location("solution", "/workspace/solution.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

tests = json.load(open("/workspace/tests.json", "r", encoding="utf-8"))
results = []

for index, test in enumerate(tests):
    try:
        actual = module.solve(**test["input"])
        expected = test["expected"]
        passed = actual == expected
        results.append({
            "index": index,
            "passed": passed,
            "actual": actual,
            "expected": expected
        })
        if not passed:
            break
    except Exception:
        results.append({
            "index": index,
            "passed": False,
            "error": traceback.format_exc(limit=2)
        })
        break

print(json.dumps({"results": results}))
`
}

function buildJavascriptRunner() {
  return `
import { solve } from '/workspace/solution.mjs'
import { readFileSync } from 'node:fs'

const tests = JSON.parse(readFileSync('/workspace/tests.json', 'utf8'))
const results = []

for (const [index, test] of tests.entries()) {
  try {
    const actual = await solve(...Object.values(test.input))
    const expected = test.expected
    const passed = JSON.stringify(actual) === JSON.stringify(expected)
    results.push({ index, passed, actual, expected })
    if (!passed) {
      break
    }
  } catch (error) {
    results.push({
      index,
      passed: false,
      error: error instanceof Error ? error.stack : String(error),
    })
    break
  }
}

console.log(JSON.stringify({ results }))
`
}

async function runGroup({ code, language, tests }) {
  const workspace = await mkdtemp(path.join(tmpdir(), 'zenpho-judge-'))

  try {
    await writeFile(path.join(workspace, 'tests.json'), JSON.stringify(tests), 'utf8')

    const image = language === 'python' ? pythonImage : nodeImage
    const command = language === 'python' ? 'python' : 'node'
    const runnerFile = language === 'python' ? 'runner.py' : 'runner.mjs'
    const solutionFile = language === 'python' ? 'solution.py' : 'solution.mjs'

    await writeFile(path.join(workspace, solutionFile), code, 'utf8')
    await writeFile(
      path.join(workspace, runnerFile),
      language === 'python' ? buildPythonRunner() : buildJavascriptRunner(),
      'utf8',
    )

    const result = await runCommand(
      'docker',
      [
        'run',
        '--rm',
        '--network',
        'none',
        '--memory',
        '256m',
        '--cpus',
        '1',
        '-v',
        `${workspace}:/workspace:ro`,
        '-w',
        '/workspace',
        image,
        command,
        `/workspace/${runnerFile}`,
      ],
      groupTimeoutMs,
    )

    if (result.timedOut) {
      return { passed: false, error: 'Timed out before finishing this test group.' }
    }

    if (result.code !== 0) {
      return { passed: false, error: result.stderr.trim() || 'Code failed before tests completed.' }
    }

    const parsed = JSON.parse(result.stdout.trim())
    const failed = parsed.results.find((item) => !item.passed)

    if (failed) {
      return {
        passed: false,
        failedIndex: failed.index,
        actual: failed.actual,
        expected: failed.expected,
        error: failed.error,
      }
    }

    return { passed: true, passedCount: parsed.results.length }
  } catch (error) {
    return {
      passed: false,
      error: error instanceof Error ? error.message : 'Judge failed unexpectedly.',
    }
  } finally {
    await rm(workspace, { force: true, recursive: true })
  }
}

function rewardsForDifficulty(difficulty) {
  if (difficulty === 'hard') {
    return { coins: 90, trainerXp: 220, partyXp: 180, energy: 44, maxEnergy: 54 }
  }

  if (difficulty === 'easy') {
    return { coins: 20, trainerXp: 60, partyXp: 45, energy: 24, maxEnergy: 34 }
  }

  return { coins: 45, trainerXp: 120, partyXp: 90, energy: 34, maxEnergy: 44 }
}

function buildEvents({ failedGroup, mode, pokemonName, topicLabel, rewards }) {
  if (!failedGroup && mode === 'submit') {
    return [
      {
        type: 'text',
        text: `Solved! Server playback awarded ${rewards.partyXp} XP and ${rewards.coins} coins.`,
      },
      { type: 'text', text: `${topicLabel} energy is ready for the encounter.` },
    ]
  }

  if (!failedGroup) {
    return [
      { type: 'text', text: 'Sample tests passed. Keep going for the full solve.' },
      { type: 'text', text: `${pokemonName} is watching your solution carefully.` },
    ]
  }

  if (failedGroup === 'samples') {
    return [
      { type: 'text', text: 'The answer missed the sample checkpoint.' },
      { type: 'text', text: 'That one missed, but your draft is safe. Try another angle!' },
    ]
  }

  if (failedGroup === 'hidden') {
    return [
      { type: 'text', text: 'Samples passed, but a hidden checkpoint failed.' },
      { type: 'text', text: 'The wild Pokemon is still testing your edge cases.' },
    ]
  }

  return [
    { type: 'text', text: 'Large-input tests did not finish within the time limit.' },
    { type: 'text', text: 'Refine the approach and submit again.' },
  ]
}

async function judgeSubmission(payload) {
  const { code, difficulty, language, mode, pokemonName, questionId, topicLabel } = payload

  if (!questionId || !testSuites[questionId]) {
    throw new Error('Unknown question.')
  }

  if (language !== 'python' && language !== 'javascript') {
    throw new Error('Unsupported language.')
  }

  if (mode !== 'run' && mode !== 'submit') {
    throw new Error('Unsupported judge mode.')
  }

  if (typeof code !== 'string' || code.length > maxCodeChars) {
    throw new Error('Code is missing or too large.')
  }

  const suite = testSuites[questionId]
  const groups = mode === 'run' ? ['samples'] : ['samples', 'hidden', 'efficiency']
  const tests = { samples: 'pending', hidden: 'pending', efficiency: 'pending' }
  const diagnostics = []
  let failedGroup = null

  for (const group of groups) {
    const result = await runGroup({ code, language, tests: suite[group] })

    if (result.passed) {
      tests[group] = 'passed'
      diagnostics.push({
        group,
        label: groupLabels[group],
        passed: true,
        message: `${groupLabels[group]} passed.`,
      })
      continue
    }

    tests[group] = 'failed'
    failedGroup = group
    diagnostics.push({
      group,
      label: groupLabels[group],
      passed: false,
      message: result.error
        ? `${groupLabels[group]} failed: ${result.error.split('\n')[0]}`
        : `${groupLabels[group]} failed on test ${Number(result.failedIndex ?? 0) + 1}.`,
      actual: result.actual,
      expected: result.expected,
    })
    break
  }

  const rewards = rewardsForDifficulty(difficulty)

  return {
    diagnostics,
    events: buildEvents({
      failedGroup,
      mode,
      pokemonName: pokemonName ?? 'the wild Pokemon',
      rewards,
      topicLabel: topicLabel ?? 'Coding',
    }),
    rewards,
    solved: mode === 'submit' && !failedGroup,
    tests,
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    jsonResponse(response, 200, { ok: true })
    return
  }

  if (request.method !== 'POST' || request.url !== '/judge') {
    jsonResponse(response, 404, { error: 'Not found.' })
    return
  }

  try {
    const body = await readBody(request)
    const payload = JSON.parse(body)
    const result = await judgeSubmission(payload)

    jsonResponse(response, 200, result)
  } catch (error) {
    jsonResponse(response, 400, {
      error: error instanceof Error ? error.message : 'Judge request failed.',
    })
  }
})

server.listen(port, () => {
  console.log(`Zenpho Docker judge listening on http://localhost:${port}`)
  console.log(`Python image: ${pythonImage}`)
  console.log(`JavaScript image: ${nodeImage}`)
})
