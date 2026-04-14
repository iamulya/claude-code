/**
 * Vercel AI SDK Client — Calls the YAAF Weather Agent via A2A
 *
 * This demonstrates cross-framework interoperability:
 *   - The YAAF agent runs as an A2A server (yaaf-server.ts)
 *   - This Vercel AI SDK agent discovers it and calls it as a tool
 *   - The A2A protocol handles all the communication
 *
 * Requirements:
 *   1. Start the YAAF A2A server first:  npx tsx src/yaaf-server.ts
 *   2. Then run this client:             npx tsx src/vercel-client.ts
 *   3. Set one of: GEMINI_API_KEY, OPENAI_API_KEY
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/vercel-client.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/vercel-client.ts
 */

import { generateText, tool } from 'ai'
import { z } from 'zod'

// ── Detect model provider ────────────────────────────────────────────────────

async function getModel() {
  // Bridge YAAF's GEMINI_API_KEY to @ai-sdk/google's expected env var
  if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    const { google } = await import('@ai-sdk/google')
    return google('gemini-2.0-flash')
  }
  if (process.env.OPENAI_API_KEY) {
    const { openai } = await import('@ai-sdk/openai')
    return openai('gpt-4o-mini')
  }
  throw new Error('Set GEMINI_API_KEY or OPENAI_API_KEY to run this example.')
}

// ── A2A Protocol helpers ─────────────────────────────────────────────────────

const A2A_SERVER_URL = process.env.A2A_SERVER_URL ?? 'http://localhost:4100'

/**
 * Fetch the remote agent's A2A Agent Card.
 * This is the standard discovery mechanism in the A2A protocol.
 */
async function fetchAgentCard(baseUrl: string) {
  const response = await fetch(`${baseUrl}/.well-known/agent.json`)
  if (!response.ok) throw new Error(`Failed to fetch Agent Card: ${response.status}`)
  return await response.json()
}

/**
 * Send a task to a remote A2A agent via JSON-RPC 2.0.
 */
async function sendA2ATask(baseUrl: string, message: string): Promise<string> {
  const requestBody = {
    jsonrpc: '2.0',
    id: `task-${Date.now()}`,
    method: 'tasks/send',
    params: {
      id: `task-${Date.now()}`,
      message: {
        role: 'user',
        parts: [{ text: message }],
      },
    },
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`A2A request failed: ${response.status} ${response.statusText}`)
  }

  const json = await response.json() as any

  if (json.error) {
    throw new Error(`A2A error [${json.error.code}]: ${json.error.message}`)
  }

  // Extract text from the A2A response
  const task = json.result
  const texts: string[] = []

  // Check artifacts
  if (task.artifacts) {
    for (const artifact of task.artifacts) {
      for (const part of artifact.parts) {
        if (part.text) texts.push(part.text)
      }
    }
  }

  // Check status message
  if (task.status?.message?.parts) {
    for (const part of task.status.message.parts) {
      if (part.text) texts.push(part.text)
    }
  }

  return texts.join('\n') || '(no response)'
}

// ── Main example ─────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`)
}

async function main() {
  const model = await getModel()

  // ── 1. Discover the remote YAAF agent via A2A ─────────────────────────────
  banner('1. A2A Discovery — Fetching Agent Card')

  let agentCard: any
  try {
    agentCard = await fetchAgentCard(A2A_SERVER_URL)
  } catch (err) {
    console.error(`\n❌ Could not reach the YAAF A2A server at ${A2A_SERVER_URL}`)
    console.error(`   Make sure the server is running: npx tsx src/yaaf-server.ts\n`)
    process.exit(1)
  }

  console.log('\n📋 Remote Agent Card:')
  console.log(`   Name:        ${agentCard.name}`)
  console.log(`   Description: ${agentCard.description}`)
  console.log(`   URL:         ${agentCard.url}`)
  console.log(`   Streaming:   ${agentCard.capabilities?.streaming}`)
  console.log(`   Skills:`)
  for (const skill of agentCard.skills ?? []) {
    console.log(`     • ${skill.name}: ${skill.description}`)
    if (skill.examples?.length) {
      console.log(`       Examples: ${skill.examples.join(', ')}`)
    }
  }

  // ── 2. Direct A2A call (no LLM — just the protocol) ──────────────────────
  banner('2. Direct A2A Call — Protocol Only (no LLM)')

  console.log('\n  Sending: "What is the weather in Tokyo?"')
  const directResult = await sendA2ATask(A2A_SERVER_URL, 'What is the weather in Tokyo?')
  console.log(`\n  Response from YAAF agent:\n  ${directResult.split('\n').join('\n  ')}`)

  // ── 3. Vercel AI agent using A2A as a tool ────────────────────────────────
  banner('3. Vercel AI Agent — Using YAAF Agent as a Tool via A2A')

  /**
   * This is the key integration: the Vercel AI agent has a tool
   * called `ask_weather_agent` that sends A2A tasks to the YAAF agent.
   * The Vercel AI agent decides WHEN to use this tool based on the
   * user's question — exactly like any other tool.
   */
  const askWeatherAgent = tool({
    description: `Ask the remote Weather Specialist agent for weather information. 
This agent has access to current weather data for major cities worldwide.
It can look up weather for a single city or compare multiple cities.`,
    parameters: z.object({
      question: z.string().describe('The weather question to ask the remote agent'),
    }),
    execute: async ({ question }) => {
      console.log(`\n  🔗 A2A Call → YAAF Weather Agent: "${question}"`)
      const response = await sendA2ATask(A2A_SERVER_URL, question)
      console.log(`  ✅ A2A Response received (${response.length} chars)`)
      return response
    },
  })

  // The Vercel AI agent — a "Travel Planner" that delegates weather questions
  console.log('\n  User: "I\'m planning a trip. Compare the weather in Paris, Tokyo, and San Francisco.')
  console.log('         Which city would be best for outdoor activities?"\n')

  const result = await generateText({
    model,
    system: `You are a travel planning assistant. When you need weather information,
use the ask_weather_agent tool to consult the weather specialist.
Based on the weather data, provide travel recommendations.
Be concise and helpful.`,
    prompt: `I'm planning a trip. Compare the weather in Paris, Tokyo, and San Francisco. 
Which city would be best for outdoor activities?`,
    tools: { ask_weather_agent: askWeatherAgent },
    maxSteps: 5,
  })

  console.log(`\n  🤖 Vercel AI Travel Planner says:\n`)
  console.log(`  ${result.text.split('\n').join('\n  ')}`)
  console.log(`\n  📊 Usage: ${result.usage?.promptTokens ?? '?'} prompt + ${result.usage?.completionTokens ?? '?'} completion tokens`)

  // ── 4. Multi-turn conversation via A2A ────────────────────────────────────
  banner('4. Multi-Turn — Vercel AI Agent Asks Follow-Up Questions')

  console.log('\n  User: "Is Dubai hotter than Mumbai? Should I pack sunscreen for both?"')

  const followUp = await generateText({
    model,
    system: `You are a travel planning assistant. Use the weather agent tool to get 
accurate weather data before giving advice. Be specific about temperatures.`,
    prompt: 'Is Dubai hotter than Mumbai? Should I pack sunscreen for both?',
    tools: { ask_weather_agent: askWeatherAgent },
    maxSteps: 5,
  })

  console.log(`\n  🤖 Travel Planner says:\n`)
  console.log(`  ${followUp.text.split('\n').join('\n  ')}`)

  // ── Summary ───────────────────────────────────────────────────────────────
  banner('✅ A2A Interoperability Demo Complete!')
  console.log(`
  What just happened:
  ┌──────────────────────────────────────────────────────────────┐
  │  Vercel AI SDK Agent (Travel Planner)                        │
  │    │                                                         │
  │    ├─── tool call: ask_weather_agent("Compare Paris...")     │
  │    │         │                                               │
  │    │         ▼  A2A Protocol (JSON-RPC 2.0 / HTTP)           │
  │    │    ┌──────────────────────────────────┐                  │
  │    │    │  YAAF Agent (Weather Specialist)  │                 │
  │    │    │    ├── get_weather("Paris")       │                 │
  │    │    │    ├── get_weather("Tokyo")       │                 │
  │    │    │    └── get_weather("San Fran..")  │                 │
  │    │    │                                    │                │
  │    │    │    Returns weather comparison      │                │
  │    │    └──────────────────────────────────┘                  │
  │    │         │                                               │
  │    │         ▼  A2A Response                                 │
  │    │                                                         │
  │    └─── Synthesizes travel recommendation                    │
  └──────────────────────────────────────────────────────────────┘

  Two different frameworks (YAAF + Vercel AI SDK) communicated
  seamlessly using the A2A open protocol.

  The YAAF agent was opaque — the Vercel AI agent never saw its
  tools, prompts, or internal state. It only saw the A2A interface.
  `)
}

main().catch(console.error)
