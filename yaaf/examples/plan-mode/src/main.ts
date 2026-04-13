/**
 * Plan Mode Example
 *
 * Demonstrates:
 *   - planMode: true — agent plans before executing
 *   - planMode.onPlan — interactive approval gate before execution
 *   - Auto-plan: plan generated, printed, then automatically approved
 *   - Plan rejection: user can reject a plan and stop execution
 *   - Combined with permissions for extra safety
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/main.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/main.ts
 */

import * as readline from 'readline'
import { buildTool, Agent } from 'yaaf'

// ── Simulated tools ───────────────────────────────────────────────────────────

const readFileTool = buildTool({
  name: 'read_file',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  },
  maxResultChars: 2000,
  describe: ({ path }) => `Read ${path}`,
  async call({ path }) {
    return { data: `# ${path}\n\nSimulated file content.\nLine 1.\nLine 2.\nLine 3.` }
  },
  isReadOnly: () => true,
})

const writeFileTool = buildTool({
  name: 'write_file',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['path', 'content'],
  },
  maxResultChars: 200,
  describe: ({ path }) => `Write ${path}`,
  async call({ path, content }) {
    console.log(`    [write_file] Writing ${(content as string).length} bytes to ${path}`)
    return { data: `Wrote ${path}` }
  },
})

const runTestsTool = buildTool({
  name: 'run_tests',
  inputSchema: {
    type: 'object',
    properties: { suite: { type: 'string', description: 'Test suite to run' } },
    required: [],
  },
  maxResultChars: 1000,
  describe: ({ suite }) => `Run tests${suite ? `: ${suite}` : ''}`,
  async call({ suite }) {
    return { data: `Tests passed: 24/24${suite ? ` (suite: ${suite})` : ''}\n✓ All green` }
  },
  isReadOnly: () => true,
})

// ── Colors ────────────────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', red: '\x1b[31m',
}

// ── Interactive approval ──────────────────────────────────────────────────────

async function askApproval(plan: string): Promise<boolean> {
  console.log(`\n${c.bold}${c.yellow}📋 Agent's Plan:${c.reset}`)
  console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`)
  console.log(plan)
  console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`\n${c.cyan}Approve this plan? [y/N] ${c.reset}`, answer => {
      rl.close()
      const approved = answer.trim().toLowerCase() === 'y'
      if (approved) console.log(`${c.green}✓ Plan approved — executing...${c.reset}\n`)
      else console.log(`${c.red}✗ Plan rejected — execution stopped.${c.reset}\n`)
      resolve(approved)
    })
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.bold}${c.cyan}🗺️  Plan Mode Example${c.reset}`)
  console.log(`${c.dim}Agent plans before acting — approve/reject before execution${c.reset}\n`)

  const allTools = [readFileTool, writeFileTool, runTestsTool]
  const isInteractive = !process.argv.includes('--auto')

  // ─────────────────────────────────────────────────────────────────────────
  // Mode A: Auto-approve (non-interactive demo)
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`${c.yellow}Mode: ${isInteractive ? 'Interactive (y/n approval prompt)' : 'Auto-approve'}${c.reset}`)
  console.log(`${c.dim}Tip: Run with --auto to skip the approval prompt${c.reset}\n`)

  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)

  if (!hasKey) {
    console.log(`${c.yellow}No API key set.${c.reset}`)
    console.log(`${c.dim}Set GEMINI_API_KEY or OPENAI_API_KEY to run the live demo.`)
    console.log(`\nThis example demonstrates:`)
    console.log(`  • planMode: { onPlan } — LLM generates a plan first, you approve/reject`)
    console.log(`  • planMode: true       — auto-approve, useful for audit logging`)
    console.log(`  • onPlan callback      — return true to execute, false to abort`)
    console.log(`  • Two-phase execution  — plan turn (no tools) → approved → execute turn\n`)
    console.log(`Run with:`)
    console.log(`  GEMINI_API_KEY=... npx tsx src/main.ts --auto   # auto-approve`)
    console.log(`  GEMINI_API_KEY=... npx tsx src/main.ts           # interactive y/n${c.reset}\n`)
    return
  }

  const agent = new Agent({
    name: 'PlanAgent',
    systemPrompt: `You are a careful software engineer. 
You approach tasks methodically and always think before acting.
Your plans should be specific, numbered steps.`,
    tools: allTools,
    planMode: isInteractive
      ? { onPlan: askApproval }
      : {
          onPlan: async (plan) => {
            console.log(`\n${c.yellow}📋 Generated Plan:${c.reset}`)
            console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`)
            console.log(plan)
            console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`)
            console.log(`${c.green}✓ Auto-approving...${c.reset}\n`)
            return true
          },
        },
    maxIterations: 12,
    temperature: 0.2,
  })

  agent
    .on('tool:call', ({ name, arguments: args }) => {
      const preview = JSON.stringify(args).slice(0, 60)
      console.log(`  ${c.yellow}⚡${c.reset} ${name}(${preview}${preview.length >= 60 ? '...' : ''})`)
    })
    .on('tool:result', ({ name, durationMs }) => {
      console.log(`  ${c.dim}  ✓ ${name} (${durationMs}ms)${c.reset}`)
    })

  const task = `Refactor the authentication module:
1. Read the current auth.ts implementation
2. Write an improved version with better error handling
3. Run the test suite to verify nothing broke`

  console.log(`${c.blue}Task:${c.reset} ${task}\n`)

  try {
    const result = await agent.run(task)
    console.log(`\n${c.green}Result:${c.reset}\n${result}\n`)
  } catch (err) {
    if (err instanceof Error && err.message.includes('provider')) {
      console.log(`\n${c.dim}No API key set. Set GEMINI_API_KEY or OPENAI_API_KEY to run the full demo.${c.reset}`)
      console.log(`${c.dim}The plan mode logic (two-phase: plan → approve → execute) is fully functional.${c.reset}\n`)
    } else {
      throw err
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mode B: planMode: true (no approval callback — always executes)
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`\n${c.yellow}planMode: true — plans but auto-executes (no approval)${c.reset}`)
  console.log(`${c.dim}Useful for logging/auditing plans without blocking execution.${c.reset}\n`)

  const silentPlanAgent = new Agent({
    name: 'SilentPlanAgent',
    systemPrompt: 'You are a helpful assistant. Always plan carefully.',
    tools: [readFileTool, runTestsTool],
    planMode: true,  // generates a plan, then executes immediately
    maxIterations: 5,
  })

  try {
    const r = await silentPlanAgent.run('Read the config.ts file and run its tests')
    console.log(`${c.green}Done:${c.reset} ${r.slice(0, 200)}\n`)
  } catch (err) {
    if (err instanceof Error && err.message.includes('provider')) {
      console.log(`${c.dim}(No API key — skipping)${c.reset}\n`)
    } else {
      throw err
    }
  }
}

main().catch(err => { console.error(err); process.exit(1) })
