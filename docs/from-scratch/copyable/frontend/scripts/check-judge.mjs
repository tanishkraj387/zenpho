const port = process.env.JUDGE_PORT ?? '8787'
const judgeUrl = process.env.JUDGE_URL ?? `http://localhost:${port}/judge`
const code = `def solve(nums, target):
    num_map = {}
    for index, number in enumerate(nums):
        complement = target - number
        if complement in num_map:
            return [num_map[complement], index]
        num_map[number] = index
    return []
`

try {
  const response = await fetch(judgeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      difficulty: 'easy',
      language: 'python',
      mode: 'submit',
      pokemonName: 'Bulbasaur',
      questionId: 'easy-arrays-two-sum',
    }),
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error ?? `Judge returned HTTP ${response.status}.`)
  }

  for (const diagnostic of result.diagnostics ?? []) {
    console.log(`${diagnostic.label}: ${diagnostic.message}`)
    if (diagnostic.expected !== undefined || diagnostic.actual !== undefined) {
      console.log(`Expected: ${JSON.stringify(diagnostic.expected)}; received: ${JSON.stringify(diagnostic.actual)}`)
    }
  }

  if (!result.solved) {
    throw new Error('Known-good Python two-sum solution was not accepted.')
  }

  console.log('Judge check passed: Python two-sum accepted across all checkpoints.')
} catch (error) {
  console.error(`Judge check failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
