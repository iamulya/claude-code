/**
 * Travel Booking Agent — Example using the Agentic framework
 *
 * This example demonstrates how simple it is to create an agent:
 * - `new Agent({ ... })` — picks provider from env automatically
 * - `agent.on('tool:call', ...)` — fluent event subscription
 * - `agent.run(...)` — single call, handles all tool loops
 *
 * Provider priority: GEMINI_API_KEY → OPENAI_API_KEY → error
 *
 * Usage:
 *   GEMINI_API_KEY=...    npx tsx src/main.ts           # Google Gemini
 *   GEMINI_API_KEY=...    npx tsx src/main.ts --demo    # demo conversation
 *   OPENAI_API_KEY=sk-... npx tsx src/main.ts           # OpenAI
 *
 * Other OpenAI-compatible providers (set OPENAI_API_KEY + OPENAI_BASE_URL):
 *   OPENAI_API_KEY=gsk_... OPENAI_BASE_URL=https://api.groq.com/openai/v1 OPENAI_MODEL=llama-3.3-70b-versatile npx tsx src/main.ts
 *   OPENAI_API_KEY=ollama  OPENAI_BASE_URL=http://localhost:11434/v1 OPENAI_MODEL=llama3.1 npx tsx src/main.ts
 */

import * as readline from 'readline'
import { Agent } from 'yaaf'
import { createTravelTools } from './tools.js'

// ── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert travel booking agent. You help users plan and book trips by:

1. Understanding their travel preferences (destination, dates, budget, travel style)
2. Searching for flights and hotels that match their needs
3. Checking weather conditions at the destination
4. Recommending attractions and activities
5. Estimating the total trip budget
6. Booking confirmed trips when explicitly asked

## Guidelines
- Always ask clarifying questions if the request is vague
- Search for flights and hotels before making recommendations
- Check weather to help users pick the best travel dates
- Provide clear price comparisons and highlight best value options
- Estimate total budget before booking
- Only book when the user explicitly confirms

## Style
- Be concise but thorough
- Use bullet points for comparisons
- Always mention prices in USD
- Proactively check weather alongside flight searches`

// ── Color Helpers ─────────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  magenta: '\x1b[35m', blue: '\x1b[34m',
}

const log = (msg: string) => console.log(msg)
const logHeader = (msg: string) => log(`\n${c.bold}${c.cyan}${msg}${c.reset}`)
const logTool = (name: string, detail: string) =>
  log(`  ${c.yellow}⚡ ${name}${c.reset} ${c.dim}${detail}${c.reset}`)
const logAgent = (msg: string) => log(`\n${c.green}🤖 Agent:${c.reset} ${msg}`)
const logUser = (msg: string) => log(`\n${c.blue}👤 You:${c.reset} ${msg}`)

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const isDemo = process.argv.includes('--demo')

  // Create the agent — automatically picks Gemini or OpenAI from env vars
  let agent: Agent
  try {
    agent = new Agent({
      name: 'TravelAgent',
      systemPrompt: SYSTEM_PROMPT,
      tools: createTravelTools(),
      maxIterations: 15,
      temperature: 0.3,
    })
  } catch (err) {
    // Thrown when no API key is found
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`\n${c.bold}${c.yellow}Travel Booking Agent${c.reset}`)
    console.error(`${c.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`)
    console.error(msg)
    console.error(`\n${c.dim}Examples:${c.reset}`)
    console.error(`  ${c.green}GEMINI_API_KEY=... npx tsx src/main.ts${c.reset}`)
    console.error(`  ${c.green}OPENAI_API_KEY=sk-... npx tsx src/main.ts${c.reset}`)
    console.error(`  ${c.green}GEMINI_API_KEY=... npx tsx src/main.ts --demo${c.reset}`)
    process.exit(1)
  }

  // Wire up tool call logging — fluent chaining
  agent
    .on('tool:call', ({ name, arguments: args }) => {
      const summary = Object.entries(args as Record<string, unknown>)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
      logTool(name, summary)
    })
    .on('tool:result', ({ name, durationMs }) =>
      log(`  ${c.dim}  ✓ ${name} completed in ${durationMs}ms${c.reset}`))
    .on('tool:error', ({ name, error }) =>
      log(`  ${c.magenta}  ✗ ${name} failed: ${error}${c.reset}`))

  // Detect which provider was selected for the header
  const geminiKey = process.env.GEMINI_API_KEY
  const providerLabel = geminiKey
    ? `Gemini / ${process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'}`
    : `OpenAI / ${process.env.OPENAI_MODEL ?? 'gpt-4o-mini'}`

  logHeader('✈️  Travel Booking Agent')
  log(`${c.dim}Powered by Agentic framework | ${providerLabel}${c.reset}`)
  log(`${c.dim}Tools: search_flights, search_hotels, check_weather, get_attractions, estimate_budget, book_trip${c.reset}`)
  log('')

  if (isDemo) await runDemo(agent)
  else await runRepl(agent)
}

// ── Demo Mode ─────────────────────────────────────────────────────────────────

async function runDemo(agent: Agent) {
  const demoQueries = [
    "I want to plan a 5-day trip to Paris for 2 people in mid-June. We're on a mid-range budget.",
    "Can you check the weather and recommend the top attractions?",
    "Pick the cheapest flight and a 4-star hotel, then estimate our total budget.",
  ]

  log(`${c.dim}Running demo conversation...${c.reset}\n`)

  for (const query of demoQueries) {
    logUser(query)
    try {
      const response = await agent.run(query)
      logAgent(response)
    } catch (err) {
      log(`${c.magenta}Error: ${err instanceof Error ? err.message : String(err)}${c.reset}`)
      break
    }
    log(`\n${c.dim}${'─'.repeat(60)}${c.reset}`)
  }

  log(`\n${c.dim}Demo complete. ${agent.messageCount} messages exchanged.${c.reset}`)
}

// ── Interactive REPL ──────────────────────────────────────────────────────────

async function runRepl(agent: Agent) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  log(`${c.dim}Type your travel request, or /reset to start over, /exit to quit.${c.reset}\n`)

  const prompt = () => {
    rl.question(`${c.blue}You: ${c.reset}`, async (input: string) => {
      const trimmed = input.trim()
      if (!trimmed) { prompt(); return }

      if (trimmed === '/exit' || trimmed === '/quit') {
        log(`\n${c.dim}Goodbye! 🛫${c.reset}`)
        rl.close()
        return
      }

      if (trimmed === '/reset') {
        agent.reset()
        log(`${c.dim}Conversation reset.${c.reset}\n`)
        prompt()
        return
      }

      try {
        const response = await agent.run(trimmed)
        logAgent(response)
      } catch (err) {
        log(`${c.magenta}Error: ${err instanceof Error ? err.message : String(err)}${c.reset}`)
      }

      log('')
      prompt()
    })
  }

  prompt()
}

// ── Entry ─────────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
