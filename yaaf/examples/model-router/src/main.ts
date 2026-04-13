/**
 * Model Router Example
 *
 * Demonstrates:
 *   - RouterChatModel: two-tier fast/capable model routing
 *   - Default routing heuristic (context length, keyword analysis, tool count)
 *   - Custom routing functions
 *   - router.stats(): see the fast/capable split after a workload
 *   - Cost savings by routing simple requests to a cheap model
 *
 * This example uses two Gemini models (flash = cheap/fast, pro = capable/expensive).
 * Works identically with OpenAI (gpt-4o-mini vs gpt-4o).
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/main.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/main.ts
 */

import { RouterChatModel, GeminiChatModel, OpenAIChatModel, AgentRunner, buildTool } from 'yaaf'

// ── Simple tools to test with ─────────────────────────────────────────────────

const addTool = buildTool({
  name: 'add',
  inputSchema: {
    type: 'object',
    properties: {
      a: { type: 'number' }, b: { type: 'number' },
    },
    required: ['a', 'b'],
  },
  maxResultChars: 100,
  describe: ({ a, b }) => `${a} + ${b}`,
  async call({ a, b }) { return { data: `${Number(a) + Number(b)}` } },
  isReadOnly: () => true,
})

const searchTool = buildTool({
  name: 'search',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  maxResultChars: 1000,
  describe: ({ query }) => `Search: ${query}`,
  async call({ query }) {
    return { data: `[Simulated results for: ${query}]\nResult 1: ...\nResult 2: ...` }
  },
  isReadOnly: () => true,
})

// ── Colors ────────────────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m',
}

// ── Create models ─────────────────────────────────────────────────────────────

function buildModels() {
  if (process.env.GEMINI_API_KEY) {
    const fast    = new GeminiChatModel({ apiKey: process.env.GEMINI_API_KEY, model: 'gemini-2.0-flash' })
    const capable = new GeminiChatModel({ apiKey: process.env.GEMINI_API_KEY, model: 'gemini-2.0-pro-exp' })
    return { fast, capable, fastName: 'gemini-2.0-flash', capableName: 'gemini-2.0-pro-exp' }
  }
  if (process.env.OPENAI_API_KEY) {
    const fast    = new OpenAIChatModel({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' })
    const capable = new OpenAIChatModel({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' })
    return { fast, capable, fastName: 'gpt-4o-mini', capableName: 'gpt-4o' }
  }
  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${c.bold}${c.cyan}⚡ Model Router Example${c.reset}`)
  console.log(`${c.dim}Route requests to fast/cheap or capable/expensive models automatically${c.reset}\n`)

  const models = buildModels()

  if (!models) {
    console.log(`${c.dim}No API key set — running routing logic demo (no real LLM calls)${c.reset}\n`)
    await demoRoutingLogic()
    return
  }

  const { fast, capable, fastName, capableName } = models
  console.log(`${c.dim}Fast model:    ${fastName}`)
  console.log(`Capable model: ${capableName}${c.reset}\n`)

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Default routing heuristic
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`${c.yellow}1. Default routing heuristic${c.reset}`)

  const defaultRouter = new RouterChatModel({
    fast,
    capable,
    onRoute: (decision, ctx) => {
      const icon = decision === 'fast' ? '⚡' : '🧠'
      const lastMsg = ctx.messages.at(-1)
      const preview = typeof lastMsg?.content === 'string'
        ? lastMsg.content.slice(0, 50)
        : '...'
      console.log(`  ${icon} [${decision}] "${preview}..."`)
    },
  })

  const runner1 = new AgentRunner({
    model: defaultRouter,
    tools: [addTool, searchTool],
    systemPrompt: 'You are a helpful assistant. Use tools when needed.',
    maxIterations: 5,
  })

  const simpleQueries = [
    'What is 42 + 58?',
    'Say hello in one sentence.',
  ]
  const complexQueries = [
    'Research and architect a complete microservices system for an e-commerce platform with payment processing, inventory management, and order fulfillment. Design the service boundaries, communication patterns, data ownership model, and deployment strategy.',
  ]

  console.log(`\n${c.dim}Simple queries → should route to FAST model:${c.reset}`)
  for (const q of simpleQueries) {
    console.log(`  Query: "${q}"`)
    try {
      await runner1.run(q)
    } catch { /* ignore */ }
  }

  console.log(`\n${c.dim}Complex queries → should route to CAPABLE model:${c.reset}`)
  for (const q of complexQueries) {
    console.log(`  Query: "${q.slice(0, 70)}..."`)
    try {
      await runner1.run(q)
    } catch { /* ignore */ }
  }

  const s1 = defaultRouter.stats()
  console.log(`\n${c.green}Routing stats:${c.reset} ${s1.fastCalls} fast, ${s1.capableCalls} capable (${s1.fastPercent}% fast)\n`)

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Custom routing function
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`${c.yellow}2. Custom routing function${c.reset}`)

  const customRouter = new RouterChatModel({
    fast,
    capable,
    // Custom rule: route by keyword in the last user message
    route: (ctx) => {
      const lastContent = ctx.messages
        .filter(m => m.role === 'user')
        .at(-1)?.content ?? ''
      const msg = typeof lastContent === 'string' ? lastContent.toLowerCase() : ''

      if (/design|architect|implement|refactor|complex/i.test(msg)) return 'capable'
      if (ctx.messages.length > 20) return 'capable'   // long conversation
      return 'fast'
    },
    onRoute: (d) => console.log(`  Routed to: ${d === 'fast' ? '⚡ fast' : '🧠 capable'}`),
  })

  const runner2 = new AgentRunner({
    model: customRouter,
    tools: [addTool],
    systemPrompt: 'Brief answers only.',
    maxIterations: 3,
  })

  try {
    await runner2.run('What is 2 + 2?')
    await runner2.run('Design and implement a full authentication microservice')
  } catch { /* ignore */ }

  const s2 = customRouter.stats()
  console.log(`${c.green}Routing stats:${c.reset} ${s2.fastCalls} fast, ${s2.capableCalls} capable\n`)
}

// ── Demo routing logic without LLM calls ─────────────────────────────────────

async function demoRoutingLogic() {
  const c2 = { reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m', yellow: '\x1b[33m' }

  console.log(`${c2.yellow}Routing decision demo (pure logic, no LLM calls):${c2.reset}\n`)
  console.log(`${c2.dim}Default heuristics applied to simulated request contexts:${c2.reset}\n`)

  type TestCase = { messages: Array<{ role: string; content: string }>; tools: string[]; iter: number }
  const cases: Array<{ desc: string; ctx: TestCase; expected: string }> = [
    {
      desc: 'Short, simple question',
      ctx: { messages: [{ role: 'user', content: 'What is 2+2?' }], tools: [], iter: 1 },
      expected: 'fast',
    },
    {
      desc: 'Long context (15 messages)',
      ctx: { messages: new Array(15).fill({ role: 'user', content: 'Hi' }), tools: [], iter: 1 },
      expected: 'capable',
    },
    {
      desc: 'Many tools (8)',
      ctx: { messages: [{ role: 'user', content: 'Help me' }], tools: new Array(8).fill('t'), iter: 1 },
      expected: 'capable',
    },
    {
      desc: 'Architecture keyword',
      ctx: { messages: [{ role: 'user', content: 'Design a microservices architecture' }], tools: [], iter: 1 },
      expected: 'capable',
    },
  ]

  for (const { desc, ctx, expected } of cases) {
    const COMPLEX_KEYWORDS = /\b(plan|architect|design|refactor|restructure|analyze|audit|migrate|implement|create|build|generate)\b/i
    const lastUser = [...ctx.messages].reverse().find(m => m.role === 'user')
    const content = typeof lastUser?.content === 'string' ? lastUser.content : ''

    let decision: string
    if (ctx.messages.length > 14) decision = 'capable'
    else if (ctx.tools.length > 6) decision = 'capable'
    else if (ctx.iter > 3) decision = 'capable'
    else if (content.length > 800) decision = 'capable'
    else if (COMPLEX_KEYWORDS.test(content)) decision = 'capable'
    else decision = 'fast'

    const icon = decision === 'fast' ? '⚡' : '🧠'
    const match = decision === expected ? `${c2.green}✓${c2.reset}` : '✗'
    console.log(`  ${match} ${icon} [${decision}] ${desc}`)
  }
  console.log()
}

main().catch(err => { console.error(err); process.exit(1) })
