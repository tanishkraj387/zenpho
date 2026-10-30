# Lesson 4: the Python/JavaScript judge

**Goal:** Run checks sample cases; Submit checks sample, hidden, and large-input cases. The answer runs in a temporary Docker container, not inside the browser.

## 1. Make public questions and private cases agree

Create `judge-data/` next to, **not inside**, `frontend/`. Copy [question-tests.json](copyable/judge-data/question-tests.json). The keys match question IDs in [questions.json](copyable/frontend/src/data/questions.json). One case looks like:

```json
{
  "input": { "nums": [2, 7, 11, 15], "target": 9 },
  "expected": [0, 1]
}
```

The Python runner calls `module.solve(**test["input"])`, which supplies named arguments `nums` and `target`. The JavaScript runner imports `solve` and passes the object's values in their defined order. This is why the editor starter function name, parameter order, case keys, and prompt must agree. A Python solution pasted without its `def solve(nums, target):` wrapper is not a complete module.

`samples` may be shown to a player. `hidden` checks cases not shown in the question. `efficiency` contains larger inputs and uses a time limit; it does **not** calculate Big-O. The judge should return a failed group and diagnostic without dumping hidden inputs into the browser.

## 2. Create a separate HTTP service

Copy [judge-server.mjs](copyable/frontend/scripts/judge-server.mjs) to `frontend/scripts/`. `.mjs` means a Node JavaScript module. It imports the private JSON from `../../judge-data/question-tests.json` and starts an HTTP server on port 8787 by default. `POST /judge` accepts a JSON body containing code, language (`python` or `javascript`), mode (`run` or `submit`), and question ID. It validates the input and selects cases from its **own** test catalog. It does not accept expected answers from the browser.

Important blocks in that file:

1. **Constants and helpers:** images, port, time and code limits, JSON response, and bounded request-body reading.
2. **`buildPythonRunner` / `buildJavascriptRunner`:** generate the code that loads the user's `solve` function, calls it for every case, compares results, and prints machine-readable JSON.
3. **`runGroup`:** writes a temporary solution, runner, and case file; spawns Docker; parses results; removes the temporary folder in `finally`.
4. **`judgeSubmission`:** validates question/language/mode/code, chooses groups, stops at the first failure, and builds diagnostics and playback text.
5. **`createServer`:** translates HTTP requests into `judgeSubmission` calls and sends JSON responses.

Never build a shell command by joining the user's code into a command string. The existing judge passes a fixed executable and argument array to `spawn`, and writes the source to a file. This avoids shell interpretation of submitted text.

## 3. Understand the Docker command

The code constructs an argument array equivalent to this example:

```powershell
docker run --rm --pull never --network none --memory 256m --cpus 1 -v TEMP_FOLDER:/workspace:ro -w /workspace python:3.12-alpine python /workspace/runner.py
```

`--rm` deletes the container after it exits. `--pull never` requires the image to be present before a submission. `--network none` removes container network access. `--memory` and `--cpus` limit resources. The mounted workspace is read-only **inside the container**. The Node judge also stops a group after its configured timeout and removes its host temporary folder. These constraints help a local project but do not turn Docker into a complete secure public sandbox.

Before running the judge, pull both images once:

```powershell
docker pull python:3.12-alpine
docker pull node:22-alpine
cd frontend
npm run judge
```

Keep that terminal open. A running Node judge does not mean a container is always visible in Docker Desktop. It creates one only when a group is being tested, then `--rm` removes it.

## 4. Connect the editor to the judge

Copy [frontend/src/lib/judge.ts](copyable/frontend/src/lib/judge.ts). It defines `JudgeResult` and `JudgeDiagnostic` TypeScript shapes, builds the URL from `VITE_JUDGE_URL` or the website hostname on port 8787, and uses `fetch` to send JSON. If the network request fails, it raises an error explaining where to start the judge. If the judge returns an error body, it shows that message.

`Battle.tsx` has `submitToJudge(mode)`. It opens Results, calls `judgeCode`, stores diagnostics, and, for a successful Submit, records the solve and opens the Fight/Hub overlay. A successful Run only gives sample feedback. On any exception, it keeps the code draft and shows a Submission error in Results. Do not mark an infrastructure failure as a wrong answer, and do not erase the editor to show an error.

## 5. Check it before blaming a submitted solution

Copy [check-judge.mjs](copyable/frontend/scripts/check-judge.mjs) and [judge-server.test.mjs](copyable/frontend/scripts/judge-server.test.mjs). In another `frontend/` terminal run:

```powershell
npm run judge:check
node --test scripts/judge-server.test.mjs
```

`judge:check` sends a known-good Python Two Sum source through HTTP and Docker. If it fails, inspect Docker Desktop, `docker info`, pulled images, the judge terminal, and the returned error. The unit test checks judge behavior without replacing the full end-to-end check.

**Checkpoint:** Run samples, Submit all groups with a correct solution, submit a wrong answer, submit invalid syntax, and stop Docker to see an infrastructure error. Only the successful Submit should be eligible for a solve. Next: [battle and rewards](05-battle.md).
