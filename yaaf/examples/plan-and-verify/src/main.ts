/**
 * Plan-and-Verify Example
 *
 * Demonstrates three YAAF features for safer, auditable agentic workflows:
 *
 *   1. **planMode.plannerTools** — read-only tools available during the planning phase.
 *      The planner can search and read files before producing its plan, instead of
 *      reasoning blindly about the task. Write tools are withheld until after approval.
 *
 *   2. **session.setPlan() / session.getPlan()** — plan persistence across compaction
 *      and process restarts. The approved plan is saved into the session JSONL stream
 *      as a `{ type: "plan" }` record and restored on resume.
 *
 *   3. **Verification agent recipe** — an adversarial sub-agent that tries to *break*
 *      the implementation rather than confirm it works. Produces a structured
 *      PASS / FAIL / PARTIAL verdict with evidence for every check (command + output + result).
 *
 * Architecture:
 *
 *   User Request
 *     │
 *     ▼
 *   Planning Phase (plannerTools: read-only)
 *     │  → explore codebase via search/read tools
 *     │  → generate numbered implementation plan
 *     │
 *     ▼
 *   Approval Gate (onPlan callback)
 *     │  → show plan to user / store in session for auditability
 *     │  → await y/n
 *     │
 *     ▼
 *   Execution Phase (full tools including writes)
 *     │  → implements the approved plan step-by-step
 *     │
 *     ▼
 *   Verification Phase (verificationAgent, adversarial)
 *     │  → adversarial: tries to break the implementation
 *     │  → structured report: PASS / FAIL / PARTIAL
 *     │
 *     ▼
 *   Result + Verdict
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/main.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/main.ts --auto
 */

import * as readline from 'readline'
import * as path from 'path'
import * as os from 'os'
import { Agent, Session, buildTool } from 'yaaf'
import {
  buildVerificationAgent,
  parseVerdict,
  type VerificationResult,
} from './verificationAgent.js'

// ── Simulated tools ────────────────────────────────────────────────────────────

/** Read-only: simulates file search. Used in both plannerTools and execution. */
const searchTool = buildTool({
  name: 'search_codebase',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'Search query (filename or keyword)' },
    },
    required: ['query'],
  },
  maxResultChars: 2000,
  describe: ({ query }) => `Search codebase for "${query}"`,
  async call({ query }) {
    // Simulated file index
    const files: Record<string, string[]> = {
      auth: ['src/auth/login.ts', 'src/auth/jwt.ts', 'src/auth/middleware.ts'],
      user: ['src/models/user.ts', 'src/api/users.ts'],
      test: ['src/__tests__/auth.test.ts', 'src/__tests__/users.test.ts'],
      config: ['src/config.ts', '.env.example'],
    }
    const matches = Object.entries(files)
      .filter(([k]) => (query as string).toLowerCase().includes(k))
      .flatMap(([, v]) => v)
    return {
      data:
        matches.length > 0
          ? `Found ${matches.length} files:\n${matches.join('\n')}`
          : `No files found for "${query}". Try: auth, user, test, config`,
    }
  },
  isReadOnly: () => true,
})

/** Read-only: simulates reading a file. Used in plannerTools and verification. */
const readFileTool = buildTool({
  name: 'read_file',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'File path to read' },
    },
    required: ['path'],
  },
  maxResultChars: 3000,
  describe: ({ path: p }) => `Read ${p}`,
  async call({ path: filePath }) {
    const simulated: Record<string, string> = {
      'src/auth/login.ts': `// login.ts - Current implementation
export async function login(email: string, password: string) {
  const user = await db.findByEmail(email)
  if (!user || user.password !== password) {  // BUG: plain text comparison
    throw new Error('Invalid credentials')
  }
  return generateToken(user)
}`,
      'src/auth/jwt.ts': `// jwt.ts
import jwt from 'jsonwebtoken'
export function generateToken(user: User) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}`,
      'src/__tests__/auth.test.ts': `// auth.test.ts
describe('auth', () => {
  it('rejects invalid password', async () => {
    await expect(login('a@b.com', 'wrong')).rejects.toThrow()
  })
})`,
    }
    const content = simulated[filePath as string]
    if (!content) return { data: `File not found: ${filePath}` }
    return { data: content }
  },
  isReadOnly: () => true,
})

/** Write tool: simulates writing/patching a file. Withheld during planning phase. */
const writeFileTool = buildTool({
  name: 'write_file',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'File path to write' },
      content: { type: 'string', description: 'File content' },
    },
    required: ['path', 'content'],
  },
  maxResultChars: 200,
  describe: ({ path: p }) => `Write ${p}`,
  async call({ path: filePath, content }) {
    const bytes = (content as string).length
    console.log(`  [write_file] ${filePath} (${bytes} bytes)`)
    return { data: `✓ Wrote ${filePath} (${bytes} bytes)` }
  },
})

/** Write tool: simulates running a test suite. Withheld during planning phase. */
const runTestsTool = buildTool({
  name: 'run_tests',
  inputSchema: {
    type: 'object' as const,
    properties: {
      suite: { type: 'string', description: 'Test suite path or name' },
    },
    required: [],
  },
  maxResultChars: 1000,
  describe: ({ suite }) => `Run tests${suite ? ` (${suite})` : ''}`,
  async call({ suite }) {
    return {
      data: `Test results${suite ? ` (${suite})` : ''}:\n✓ login with valid credentials (12ms)\n✓ rejects invalid password (3ms)\n✓ bcrypt comparison (8ms)\n✓ JWT expiry (5ms)\nAll 4 tests passed`,
    }
  },
})

// ── Interactive helpers ────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
}

function banner(text: string, color = c.cyan) {
  const line = '─'.repeat(60)
  console.log(`\n${c.bold}${color}${line}${c.reset}`)
  console.log(`${c.bold}${color}  ${text}${c.reset}`)
  console.log(`${c.bold}${color}${line}${c.reset}`)
}

async function askApproval(plan: string): Promise<boolean> {
  banner('📋 Agent Plan (awaiting your approval)', c.yellow)
  console.log(plan)
  console.log()

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`${c.cyan}Approve this plan? [y/N] ${c.reset}`, (answer) => {
      rl.close()
      const ok = answer.trim().toLowerCase() === 'y'
      console.log(ok ? `${c.green}✓ Approved — executing...${c.reset}\n` : `${c.red}✗ Rejected.${c.reset}\n`)
      resolve(ok)
    })
  })
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  banner('🗺️  Plan-and-Verify Example', c.magenta)
  console.log(`\n${c.dim}Features:`)
  console.log(`  • plannerTools — planner can explore codebase before planning`)
  console.log(`  • session.setPlan() — approved plan survives compaction/restart`)
  console.log(`  • Verification agent — adversarially tries to break the result${c.reset}\n`)

  const isAuto = process.argv.includes('--auto')
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)

  if (!hasKey) {
    printDryRunInfo()
    return
  }

  // ── Session setup ──────────────────────────────────────────────────────────
  // Use a persistent session so the plan survives across runs.
  // On resume after a crash, session.getPlan() returns the approved plan text.
  const sessionDir = path.join(os.tmpdir(), 'yaaf-plan-verify-demo')
  const session = await Session.resumeOrCreate('plan-verify-demo', sessionDir)

  const existingPlan = session.getPlan()
  if (existingPlan) {
    console.log(`${c.yellow}📂 Resumed session — existing plan found:${c.reset}`)
    console.log(`${c.dim}${existingPlan.slice(0, 200)}...${c.reset}\n`)
  }

  // ── Agent setup ────────────────────────────────────────────────────────────
  const agent = new Agent({
    name: 'PlanAndVerifyAgent',
    systemPrompt: `You are a careful software engineer. You approach tasks methodically.
Your plans must be specific, numbered steps referencing real file paths.`,
    // Full tool set (read + write) — used during execution phase
    tools: [searchTool, readFileTool, writeFileTool, runTestsTool],
    planMode: {
      // ✨ Feature 1: plannerTools — read-only subset available during planning.
      // The planner can search the codebase and read files before writing the plan.
      // Write tools (writeFileTool, runTestsTool) are withheld until after approval.
      plannerTools: [searchTool, readFileTool],

      // ✨ Feature 2 integration: onPlan callback also triggers session.setPlan()
      // inside runWithPlanMode automatically after this returns true.
      onPlan: isAuto
        ? async (plan) => {
            console.log(`${c.yellow}📋 Generated Plan:${c.reset}\n${plan}\n`)
            console.log(`${c.green}✓ Auto-approving...${c.reset}\n`)
            return true
          }
        : askApproval,
    },
    session,
    maxIterations: 10,
    temperature: 0.2,
  })

  // Event listeners for visibility
  agent
    .on('tool:call', ({ name, arguments: args }) => {
      const preview = JSON.stringify(args).slice(0, 50)
      console.log(`  ${c.yellow}⚡${c.reset} ${name}(${preview}${preview.length >= 50 ? '...' : ''})`)
    })
    .on('tool:result', ({ name, durationMs }) => {
      console.log(`  ${c.dim}  ✓ ${name} (${durationMs}ms)${c.reset}`)
    })

  const task = `Improve the authentication security:
- The login function in src/auth/login.ts uses plain-text password comparison (security bug)
- Replace it with bcrypt hashing
- Ensure the tests still pass after the change`

  console.log(`${c.blue}Task:${c.reset} ${task}\n`)

  // ─── Run: Plan → Approve → Execute ──────────────────────────────────────────
  let executionResult: string
  try {
    executionResult = await agent.run(task)
  } catch (err) {
    if (err instanceof Error && err.message.includes('not approved')) {
      console.log(`${c.red}Plan was rejected — stopping.${c.reset}`)
      return
    }
    throw err
  }

  banner('✅ Execution Complete', c.green)
  console.log(executionResult)

  // ✨ Feature 2: Retrieve the persisted plan from the session.
  // This is the plan that was stored automatically inside runWithPlanMode
  // after the onPlan callback returned true.
  const persistedPlan = session.getPlan()
  if (persistedPlan) {
    console.log(`\n${c.dim}💾 Plan persisted in session (survives compaction + restart):`)
    console.log(`   ${persistedPlan.split('\n').join('\n   ')}${c.reset}`)
  }

  // ─── Run: Verification Agent ─────────────────────────────────────────────────
  // ✨ Feature 3: The verification agent adversarially checks the implementation.
  // It tries to break it — not just confirm it works.
  banner('🔍 Starting Verification Agent…', c.magenta)
  console.log(`${c.dim}The verifier will try to break the implementation before issuing a verdict.${c.reset}\n`)

  const verifier = buildVerificationAgent()

  const verificationInput = `
Task that was implemented: "${task}"

Files changed:
- src/auth/login.ts (replaced plain-text password comparison with bcrypt)

Approach taken: ${persistedPlan ?? 'replaced password comparison with bcrypt.compare()'}

Implementation result:
${executionResult}
`.trim()

  const verificationReport = await verifier.run(verificationInput)

  // ─── Parse verdict ─────────────────────────────────────────────────────────
  const { verdict, report } = parseVerdict(verificationReport)
  const verdictColors: Record<VerificationResult, string> = {
    PASS: c.green,
    FAIL: c.red,
    PARTIAL: c.yellow,
  }
  const verdictColor = verdict ? verdictColors[verdict] ?? c.reset : c.reset

  if (verdict) {
    banner(`Verification Verdict: ${verdict}`, verdictColor)
  }
  console.log(report)
}

// ── Dry-run info ───────────────────────────────────────────────────────────────

function printDryRunInfo() {
  console.log(`${c.yellow}No API key detected — showing feature summary instead.${c.reset}\n`)

  console.log(`${c.bold}Feature 1: planMode.plannerTools${c.reset}`)
  console.log(`${c.dim}  Pass read-only tools to the planning phase so the planner can explore`)
  console.log(`  the codebase before writing its plan. Write tools are withheld until`)
  console.log(`  after the approval gate.`)
  console.log()
  console.log(`  Before (tools: []):     planner reasons blindly, no file access`)
  console.log(`  After  (plannerTools):  planner searches+reads, grounded plan${c.reset}\n`)

  console.log(`${c.bold}Feature 2: session.setPlan() / session.getPlan()${c.reset}`)
  console.log(`${c.dim}  The approved plan is persisted into the session JSONL stream as a`)
  console.log(`  { type: "plan" } record. It survives:`)
  console.log(`    • context compaction  (compact() re-writes plan into the new file)`)
  console.log(`    • process restart     (plan is loaded from JSONL on session.resume())`)
  console.log(`    • adapter backends    (via saveMeta/loadMeta in SessionAdapter)${c.reset}\n`)

  console.log(`${c.bold}Feature 3: Verification Agent recipe${c.reset}`)
  console.log(`${c.dim}  An adversarial sub-agent that tries to BREAK the implementation:`)
  console.log(`    • Must produce Command + Output + Result for every check`)
  console.log(`    • Runs adversarial probes (concurrency, boundary, idempotency)`)
  console.log(`    • Issues PASS / FAIL / PARTIAL verdict`)
  console.log(`    • Read-only: cannot modify the project${c.reset}\n`)

  console.log(`Run with:`)
  console.log(`  GEMINI_API_KEY=... npx tsx src/main.ts --auto   # non-interactive`)
  console.log(`  GEMINI_API_KEY=... npx tsx src/main.ts           # interactive y/n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
