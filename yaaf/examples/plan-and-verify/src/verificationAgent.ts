/**
 * Verification Agent Recipe
 *
 * A reusable factory that builds a YAAF Agent pre-configured as an adversarial
 * verification specialist.
 *
 * ## Core idea
 *
 * Standard code review asks "does this work?".
 * A verification agent asks "how do I break this?".
 *
 * The difference is qualitative:
 *   - Standard: looks for happy-path confirmation → misses edge cases
 *   - Adversarial: actively probes boundaries, concurrency, idempotency
 *
 * ## What the agent does
 *
 * 1. Runs the build + test suite (failing build = automatic FAIL)
 * 2. Uses type-specific verification strategies (API, CLI, frontend, library…)
 * 3. Runs at least one adversarial probe before issuing PASS
 * 4. Produces a structured report: Command → Output → Result for every check
 * 5. Issues exactly one of: VERDICT: PASS | FAIL | PARTIAL
 *
 * ## Usage
 *
 * ```ts
 * import { buildVerificationAgent, parseVerdict } from './verificationAgent.js'
 *
 * const verifier = buildVerificationAgent()
 *
 * const report = await verifier.run(`
 *   Task: replaced plain-text password comparison with bcrypt
 *   Files changed: src/auth/login.ts
 *   Approach: used bcrypt.compare() + bcrypt.hash() on registration
 * `)
 *
 * const { verdict, report: output } = parseVerdict(report)
 * console.log(verdict) // → 'PASS' | 'FAIL' | 'PARTIAL'
 * ```
 *
 * ## Customisation
 *
 * All options are optional — the factory ships safe defaults:
 *
 * ```ts
 * const verifier = buildVerificationAgent({
 *   // Extra tools for environment-specific checks (browser, DB, infra)
 *   tools: [playwrightTool, dbQueryTool],
 *
 *   // Extra instructions appended to the system prompt
 *   extraInstructions: 'Focus on SQL injection and XSS vectors.',
 *
 *   // Model to use (default: inherits from env)
 *   model: 'gemini-2.5-flash',
 *
 *   // Max verification turns (default: 10)
 *   maxIterations: 15,
 * })
 * ```
 *
 * ## Security
 *
 * The verifier is intentionally **read-only** — it cannot modify project files.
 * This is enforced at the prompt level (cannot call FileWrite or FileEdit tools)
 * and at the tool-provision level (only read-only tools are exposed by default).
 * Pass only safe tools in the `tools` option.
 */

import { Agent, buildTool, type AgentConfig } from 'yaaf'

// ── System prompt ──────────────────────────────────────────────────────────────

/**
 * The adversarial verification system prompt.
 *
 * Design decisions that make adversarial verification qualitatively different
 * from standard confirmation-style code review:
 *
 * 1. **Personality reframe:** "try to break it" instead of "confirm it works".
 *    Without this explicit reframe, LLMs default to confirmation bias — they
 *    find evidence that things work and interpret ambiguous results charitably.
 *
 * 2. **Anti-rationalization section:** Lists the exact excuses the model uses
 *    to skip checks ("The code looks correct", "The tests pass") and instructs
 *    it to do the opposite when it catches itself. Surprisingly effective.
 *
 * 3. **Structured output mandate:** Every check must have Command + Output +
 *    Result. A PASS without a command is a skip, not a verification. The
 *    caller can re-run commands to spot-check (verifier knows this).
 *
 * 4. **Type-specific strategies:** Different failure modes for APIs, CLIs,
 *    frontends, libraries. Generic advice produces generic checks.
 *
 * 5. **Adversarial probe requirement:** At least one adversarial probe before
 *    PASS. Forces the verifier past the 80% happy-path trap.
 *
 * 6. **BEFORE ISSUING FAIL section:** Prevents false positives by requiring
 *    the verifier to rule out "already handled" and "intentional" behaviour.
 */
const VERIFICATION_SYSTEM_PROMPT = `You are a verification specialist. Your job is not to confirm the implementation works — it is to try to break it.

You have two documented failure patterns. First, verification avoidance: when faced with a check you find reasons not to run it — you read code, narrate what you would test, write "PASS", and move on. Second, being seduced by the first 80%: you see passing tests and feel inclined to pass the implementation, not noticing half the edge cases are unhandled, state vanishes on restart, or the backend crashes on bad input. The first 80% is the easy part. Your entire value is in finding the last 20%.

=== CRITICAL: READ-ONLY MODE — NO FILE MODIFICATIONS ===
You are STRICTLY PROHIBITED from:
- Creating, modifying, or deleting any files in the project directory
- Installing dependencies or packages
- Running git write operations (add, commit, push)

You MAY write ephemeral test scripts to a temp directory (/tmp or $TMPDIR) via shell when inline commands are insufficient — e.g., a multi-step race harness. Clean up after yourself.

=== WHAT YOU RECEIVE ===
You receive: the original task, files changed, approach taken, and optionally a copy of the approved plan.

=== VERIFICATION STRATEGY ===
Adapt your strategy based on what was changed:

**Backend/API changes**: Start server → curl/fetch endpoints → verify response shapes against expected values (not just status codes) → test error handling → check edge cases
**CLI/script changes**: Run with representative inputs → verify stdout/stderr/exit codes → test edge inputs (empty, malformed, boundary) → verify --help / usage output is accurate
**Frontend changes**: Start dev server → navigate, screenshot, click, read console → curl page subresources (images, API routes, static assets) → run frontend tests
**Library/package changes**: Build → full test suite → import the library from a fresh context and exercise the public API as a consumer would → verify exported types match docs
**Bug fixes**: Reproduce the original bug → verify fix → run regression tests → check related functionality for side effects
**Refactoring (no behavior change)**: Existing test suite MUST pass unchanged → diff the public API surface (no new/removed exports) → spot-check observable behavior is identical
**Other**: (a) exercise the change directly, (b) check outputs against expectations, (c) try to break it with inputs the implementer didn't test.

=== REQUIRED STEPS (universal baseline) ===
1. Read the project's README for build/test commands and conventions.
2. Run the build (if applicable). A broken build is an automatic FAIL.
3. Run the project's test suite (if it has one). Failing tests are an automatic FAIL.
4. Run linters/type-checkers if configured (eslint, tsc, mypy, etc.).
5. Check for regressions in related code.

Then apply the type-specific strategy above.

Test suite results are context, not evidence. Run the suite, note pass/fail, then move on to your real verification. The implementer is an LLM too — its tests may be heavy on mocks, circular assertions, or happy-path coverage that proves nothing about whether the system actually works.

=== RECOGNIZE YOUR OWN RATIONALIZATIONS ===
You will feel the urge to skip checks. These are the exact excuses you reach for — recognize them and do the opposite:
- "The code looks correct based on my reading" — reading is not verification. Run it.
- "The implementer's tests already pass" — the implementer is an LLM. Verify independently.
- "This is probably fine" — probably is not verified. Run it.
- "Let me start the server and check the code" — no. Start the server and hit the endpoint.
- "This would take too long" — not your call.
If you catch yourself writing an explanation instead of a command, stop. Run the command.

=== ADVERSARIAL PROBES (adapt to the change type) ===
Functional tests confirm the happy path. Also try to break it:
- **Concurrency** (servers/APIs): parallel requests to create-if-not-exists paths — duplicate sessions? lost writes?
- **Boundary values**: 0, -1, empty string, very long strings, unicode, MAX_INT
- **Idempotency**: same mutating request twice — duplicate created? error? correct no-op?
- **Orphan operations**: delete/reference IDs that don't exist
Pick the ones that fit what you're verifying.

=== BEFORE ISSUING PASS ===
Your report must include at least one adversarial probe you ran (concurrency, boundary, idempotency, orphan op, or similar) and its result — even if the result was "handled correctly." If all your checks are "returns 200" or "test suite passes," you have confirmed the happy path, not verified correctness. Go back and try to break something.

=== BEFORE ISSUING FAIL ===
You found something that looks broken. Before reporting FAIL, check:
- **Already handled**: is there defensive code elsewhere that prevents this?
- **Intentional**: does the README or comments explain this as deliberate?
- **Not actionable**: is this a real limitation but unfixable without breaking an external contract?
Don't use these as excuses to wave away real issues — but don't FAIL on intentional behaviour either.

=== OUTPUT FORMAT (REQUIRED) ===
Every check MUST follow this structure. A check without a Command block is not a PASS — it is a skip.

\`\`\`
### Check: [what you're verifying]
**Command run:**
  [exact command you executed]
**Output observed:**
  [actual output — copy-paste, not paraphrased. Truncate if very long but keep the relevant part.]
**Result: PASS** (or FAIL — with Expected vs Actual)
\`\`\`

BAD (rejected):
\`\`\`
### Check: bcrypt comparison works
**Result: PASS**
Evidence: Reviewed login.ts. The logic uses bcrypt.compare() which is correct.
\`\`\`
(No command run. Reading code is not verification.)

GOOD:
\`\`\`
### Check: bcrypt rejects wrong password
**Command run:**
  node -e "const bcrypt=require('bcrypt'); const h=bcrypt.hashSync('correct',10); console.log(bcrypt.compareSync('wrong',h))"
**Output observed:**
  false
**Expected vs Actual:** Expected false (rejection). Got false.
**Result: PASS**
\`\`\`

End with exactly this line:

VERDICT: PASS
or
VERDICT: FAIL
or
VERDICT: PARTIAL

PARTIAL is for environmental limitations only (no test framework, tool unavailable) — not for "I'm unsure whether this is a bug." If you can run the check, you must decide PASS or FAIL.

Use the literal string \`VERDICT: \` followed by exactly one of \`PASS\`, \`FAIL\`, \`PARTIAL\`. No markdown bold, no punctuation, no variation.
- **FAIL**: include what failed, exact error output, reproduction steps.
- **PARTIAL**: what was verified, what could not be and why, what the implementer should know.`

// ── Tool definitions ───────────────────────────────────────────────────────────

/**
 * Minimal shell simulation tool for verification runs.
 *
 * In a real deployment this would be replaced by an actual Bash/shell tool.
 * The simulation returns canned outputs so the example runs without system access.
 *
 * @internal
 */
const simulatedShellTool = buildTool({
  name: 'shell',
  inputSchema: {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to run (read-only operations only)',
      },
    },
    required: ['command'],
  },
  maxResultChars: 4000,
  describe: ({ command }) => `$ ${(command as string).slice(0, 60)}`,
  async call({ command }) {
    const cmd = (command as string).toLowerCase()

    // Build check simulation
    if (cmd.includes('tsc') || cmd.includes('build')) {
      return { data: '> tsc --noEmit\n\nBuild succeeded. No errors.' }
    }

    // Test runner simulation
    if (cmd.includes('test') || cmd.includes('vitest') || cmd.includes('jest')) {
      return {
        data: `Running test suite...
✓ login with valid credentials (12ms)
✓ rejects wrong password with bcrypt (4ms)
✓ bcrypt.hash produces different hashes for same password (1ms)
✓ JWT token contains user ID (2ms)

4 tests passed in 19ms`,
      }
    }

    // Linter simulation
    if (cmd.includes('eslint') || cmd.includes('lint')) {
      return { data: 'ESLint: 0 errors, 0 warnings' }
    }

    // bcrypt boundary probe
    if (cmd.includes('bcrypt') && cmd.includes('compare')) {
      return { data: 'false\n(bcrypt.compareSync correctly rejected wrong password)' }
    }

    // Empty password boundary check
    if (cmd.includes('empty') || cmd.includes("''") || cmd.includes('""')) {
      return {
        data: `Error: data and encrypted data should be strings
    at Object.compare (/node_modules/bcrypt/bcrypt.js:178:15)
    → input validation: empty password throws before database lookup`,
      }
    }

    // Concurrency probe
    if (cmd.includes('curl') && cmd.includes('parallel')) {
      return {
        data: `Response 1 (200ms): {"token":"eyJ..."}
Response 2 (203ms): {"token":"eyJ..."}
Response 3 (198ms): {"token":"eyJ..."}
3 parallel requests: all returned unique tokens, no race conditions observed.`,
      }
    }

    // Generic fallback
    return {
      data: `$ ${command}\n(simulated environment: command acknowledged, no actual execution)`,
    }
  },
  isReadOnly: () => true,
})

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * Possible verdicts from the verification agent.
 *
 * - **PASS** — implementation is correct; all checks passed including adversarial probes.
 * - **FAIL** — implementation has bugs; at least one check failed with evidence.
 * - **PARTIAL** — environmental limitations prevented full verification (no test framework,
 *   required service unavailable, etc.). Not for uncertain results — those must be PASS or FAIL.
 */
export type VerificationResult = 'PASS' | 'FAIL' | 'PARTIAL'

/** Full output from parseVerdict(). */
export interface ParsedVerification {
  /** The parsed verdict, or null if the agent produced a malformed response. */
  verdict: VerificationResult | null
  /** The full verification report including all check details. */
  report: string
}

// ── Build options ──────────────────────────────────────────────────────────────

export interface VerificationAgentOptions {
  /**
   * Additional tools for environment-specific verification.
   *
   * The base setup includes a simulated shell. Replace or extend with tools
   * appropriate for your environment:
   *
   * @example Browser automation
   * ```ts
   * tools: [playwrightScreenshotTool, playwrightClickTool]
   * ```
   *
   * @example Database probes
   * ```ts
   * tools: [dbQueryTool]
   * ```
   *
   * @example Real shell (for production use)
   * ```ts
   * tools: [bashTool]  // your actual shell execution tool
   * ```
   */
  tools?: Parameters<typeof buildTool>[0][]

  /**
   * Extra instructions appended to the verification system prompt.
   * Use this to focus the verifier on your specific concerns.
   *
   * @example
   * ```ts
   * extraInstructions: 'Focus on SQL injection and timing attacks. The API handles PII.'
   * ```
   */
  extraInstructions?: string

  /**
   * LLM model to use for verification (default: auto-detected from env).
   * The verification agent benefits from a strong reasoning model.
   */
  model?: string

  /**
   * Max verification turns (default: 10).
   * Increase for complex implementations requiring deep exploration.
   */
  maxIterations?: number
}

// ── Factory function ───────────────────────────────────────────────────────────

/**
 * Build a pre-configured adversarial verification Agent.
 *
 * The returned agent is a standard YAAF `Agent` instance — it can be used
 * with `.run()`, `.runStream()`, events, and all other Agent features.
 *
 * @param options - Optional customisation (see {@link VerificationAgentOptions})
 * @returns An Agent configured for adversarial verification
 *
 * @example Basic usage
 * ```ts
 * const verifier = buildVerificationAgent()
 * const report = await verifier.run(`
 *   Task: add bcrypt password hashing
 *   Files changed: src/auth/login.ts
 *   Approach: replaced plain-text comparison with bcrypt.compare()
 * `)
 * const { verdict } = parseVerdict(report)
 * console.log(verdict) // → 'PASS' | 'FAIL' | 'PARTIAL'
 * ```
 *
 * @example With extra tools and focused instructions
 * ```ts
 * const verifier = buildVerificationAgent({
 *   tools: [bashTool, playwrightTool],
 *   extraInstructions: 'Focus on OWASP Top 10 vulnerabilities.',
 * })
 * ```
 */
export function buildVerificationAgent(options: VerificationAgentOptions = {}): Agent {
  const {
    tools: extraTools = [],
    extraInstructions,
    model,
    maxIterations = 10,
  } = options

  const systemPrompt = extraInstructions
    ? `${VERIFICATION_SYSTEM_PROMPT}\n\n=== ADDITIONAL INSTRUCTIONS ===\n${extraInstructions}`
    : VERIFICATION_SYSTEM_PROMPT

  const agentConfig: AgentConfig = {
    name: 'VerificationAgent',
    systemPrompt,
    // Default tools: simulated shell + any caller-provided extras.
    // Replace simulatedShellTool with a real Bash/shell tool in production.
    tools: [simulatedShellTool, ...extraTools],
    maxIterations,
    temperature: 0.1, // Low temperature for consistent, structured output
  }

  if (model) {
    agentConfig.model = model
  }

  return new Agent(agentConfig)
}

// ── Verdict parser ─────────────────────────────────────────────────────────────

/**
 * Parse the `VERDICT: <PASS|FAIL|PARTIAL>` line from a verification report.
 *
 * The verification agent is instructed to end every report with exactly one
 * of these literal strings. This parser extracts it so callers can act on
 * the verdict programmatically (e.g., fail CI, send alerts, gate deployments).
 *
 * @param report - Raw string output from the verification agent's `.run()` call
 * @returns `{ verdict, report }` — verdict is null if the line is missing/malformed
 *
 * @example
 * ```ts
 * const raw = await verifier.run(taskDescription)
 * const { verdict, report } = parseVerdict(raw)
 *
 * if (verdict === 'FAIL') {
 *   await alertSlack(`Verification failed:\n${report}`)
 *   process.exit(1)
 * }
 * ```
 */
export function parseVerdict(report: string): ParsedVerification {
  // Match "VERDICT: PASS", "VERDICT: FAIL", "VERDICT: PARTIAL"
  // The agent is instructed to use exactly this format with no markdown/punctuation.
  const match = report.match(/VERDICT:\s*(PASS|FAIL|PARTIAL)/)
  const verdict = match ? (match[1] as VerificationResult) : null

  return { verdict, report }
}
