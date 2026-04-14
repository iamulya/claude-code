/**
 * A2A Interoperability Example — Complete Demo
 *
 * Demonstrates the A2A (Agent-to-Agent) protocol in action:
 *
 *   🏗️  YAAF Agent (Weather Specialist) ← A2A Server
 *         ↕  JSON-RPC 2.0 / HTTP
 *   🤖  Vercel AI SDK Agent (Travel Planner) ← A2A Client
 *
 * This file runs BOTH agents in a single process for easy testing.
 * For a more realistic setup, use separate terminals:
 *   Terminal 1:  npx tsx src/yaaf-server.ts
 *   Terminal 2:  npx tsx src/vercel-client.ts
 *
 * The key idea:
 *   Two agents built with DIFFERENT frameworks communicate via the
 *   A2A open protocol. Neither agent knows the other's internals —
 *   they are opaque to each other. The YAAF agent's tools, prompts,
 *   and memory are invisible to the Vercel AI agent.
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/index.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/index.ts
 */

import { Agent, serveA2A, buildTool, A2AClient } from 'yaaf'
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log(`\n${'═'.repeat(62)}\n  ${title}\n${'═'.repeat(62)}`)
}

function section(title: string) {
  console.log(`\n${'─'.repeat(50)}\n  ${title}\n${'─'.repeat(50)}`)
}

// ── Weather Data (simulated) ─────────────────────────────────────────────────

const weatherData: Record<string, { temp: number; condition: string; humidity: number; wind: string }> = {
  'san francisco': { temp: 62, condition: 'Foggy', humidity: 85, wind: '12 mph W' },
  'new york': { temp: 78, condition: 'Partly Cloudy', humidity: 65, wind: '8 mph NE' },
  'london': { temp: 55, condition: 'Rainy', humidity: 90, wind: '15 mph SW' },
  'tokyo': { temp: 72, condition: 'Clear', humidity: 50, wind: '5 mph SE' },
  'paris': { temp: 68, condition: 'Sunny', humidity: 55, wind: '10 mph N' },
  'sydney': { temp: 70, condition: 'Warm & Clear', humidity: 45, wind: '7 mph NW' },
  'berlin': { temp: 60, condition: 'Overcast', humidity: 75, wind: '11 mph E' },
  'mumbai': { temp: 88, condition: 'Hot & Humid', humidity: 80, wind: '6 mph S' },
  'dubai': { temp: 95, condition: 'Sunny & Hot', humidity: 35, wind: '4 mph NE' },
}

// ── YAAF Weather Agent (A2A Server) ──────────────────────────────────────────

async function startWeatherServer() {
  const getWeatherTool = buildTool({
    name: 'get_weather',
    maxResultChars: 10_000,
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name' },
      },
      required: ['city'],
    },
    describe: (input) => `Get weather for ${(input as any).city}`,
    async call(input: Record<string, unknown>): Promise<any> {
      const city = (input.city as string).toLowerCase()
      const data = weatherData[city]
      if (!data) {
        return {
          data: {
            error: `Weather data not available for "${input.city}".`,
            availableCities: Object.keys(weatherData).map(c =>
              c.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
            ),
          },
        }
      }
      return {
        data: {
          city: input.city,
          temperature: `${data.temp}°F (${Math.round((data.temp - 32) * 5 / 9)}°C)`,
          condition: data.condition,
          humidity: `${data.humidity}%`,
          wind: data.wind,
        },
      }
    },
  })

  const weatherAgent = new Agent({
    name: 'WeatherSpecialist',
    systemPrompt: `You are a weather specialist. Use the get_weather tool to fetch weather data.
Present results clearly and concisely. If comparing cities, list all data.`,
    tools: [getWeatherTool],
  })

  return serveA2A(weatherAgent, {
    name: 'YAAF Weather Specialist',
    description: 'Provides current weather data for major cities.',
    port: 4100,
    skills: [
      {
        id: 'weather_lookup',
        name: 'Weather Lookup',
        description: 'Get current weather for a city',
        examples: ['What is the weather in Tokyo?'],
      },
    ],
  })
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  banner('A2A Interop: YAAF ↔ Vercel AI SDK')
  console.log(`
  This demo runs two agents built with different frameworks:
    • YAAF Agent → Weather Specialist (A2A Server)
    • Vercel AI Agent → Travel Planner (A2A Client)
  They communicate via the A2A open protocol.
  `)

  // ── Start the YAAF A2A server ─────────────────────────────────────────────
  section('Step 1: Start YAAF Weather Agent as A2A Server')
  const serverHandle = await startWeatherServer()
  console.log(`\n  ✅ A2A Server running at ${serverHandle.url}`)

  const model = await getModel()

  // ── A2A Discovery ─────────────────────────────────────────────────────────
  section('Step 2: A2A Discovery — Fetch Agent Card')

  const a2aClient = new A2AClient(serverHandle.url)
  const card = await a2aClient.fetchAgentCard()

  console.log(`\n  📋 Discovered remote agent:`)
  console.log(`     Name:    ${card.name}`)
  console.log(`     URL:     ${card.url}`)
  console.log(`     Skills:  ${card.skills?.map(s => s.name).join(', ')}`)
  console.log(`     Stream:  ${card.capabilities?.streaming}`)

  // ── Direct A2A call (protocol only, no LLM wrapping) ──────────────────────
  section('Step 3: Direct A2A Task — Protocol-Level Call')

  console.log('\n  Sending A2A task: "What is the weather in Tokyo?"')
  const taskResult = await a2aClient.sendTask({
    message: { role: 'user', parts: [{ text: 'What is the weather in Tokyo?' }] },
  })

  console.log(`  Task ID: ${taskResult.id}`)
  console.log(`  Status:  ${taskResult.status.state}`)
  const directResponse = taskResult.artifacts?.flatMap(a =>
    a.parts.filter((p): p is { text: string } => 'text' in p).map(p => p.text)
  ).join('\n')
  console.log(`\n  🌤️  Response:\n  ${directResponse?.split('\n').join('\n  ') ?? '(none)'}`)

  // ── Vercel AI agent using A2A as a tool ───────────────────────────────────
  section('Step 4: Cross-Framework — Vercel AI Agent Calls YAAF Agent')

  console.log(`
  The Vercel AI "Travel Planner" agent will now use the YAAF
  "Weather Specialist" as a tool — communicating via A2A.
  `)

  // Create the A2A bridge tool for Vercel AI
  const askWeatherAgent = tool({
    description: `Ask the remote Weather Specialist for weather data.
It has current conditions for major cities worldwide.`,
    parameters: z.object({
      question: z.string().describe('Weather question for the remote agent'),
    }),
    execute: async ({ question }) => {
      console.log(`    🔗 A2A → YAAF: "${question}"`)
      const result = await a2aClient.sendTask({
        message: { role: 'user', parts: [{ text: question }] },
      })
      const text = result.artifacts?.flatMap(a =>
        a.parts.filter((p): p is { text: string } => 'text' in p).map(p => p.text)
      ).join('\n') ?? '(no response)'
      console.log(`    ✅ YAAF → Vercel AI: ${text.length} chars received`)
      return text
    },
  })

  // Run the Vercel AI agent
  console.log('  User: "Compare Paris and Tokyo weather. Which is better for sightseeing?"')

  const result = await generateText({
    model,
    system: `You are a travel planner. Use the ask_weather_agent tool to get weather data.
Give specific, actionable travel advice based on the weather.`,
    prompt: 'Compare Paris and Tokyo weather. Which is better for sightseeing?',
    tools: { ask_weather_agent: askWeatherAgent },
    maxSteps: 5,
  })

  console.log(`\n  🤖 Vercel AI Travel Planner says:\n`)
  console.log(`  ${result.text.split('\n').join('\n  ')}`)

  // ── YAAF-native A2A tool (using asTool()) ─────────────────────────────────
  section('Step 5: YAAF-Native A2A Tool — asTool() Shorthand')

  console.log(`
  YAAF also provides a built-in asTool() that wraps A2A clients
  as native YAAF tools — no manual bridging needed.
  `)

  const yaafA2ATool = a2aClient.asTool('weather_agent')
  console.log(`  Created YAAF tool: "${yaafA2ATool.name}"`)
  console.log(`  Schema: ${JSON.stringify(yaafA2ATool.inputSchema)}`)

  // Use it in a YAAF agent
  const plannerAgent = new Agent({
    name: 'YaafPlanner',
    systemPrompt: 'You are a travel planner. Use the weather_agent tool to get weather data.',
    tools: [yaafA2ATool],
  })

  console.log('\n  Running YAAF Planner agent with A2A tool...')
  console.log('  User: "What\'s the weather like in London?"')
  
  const yaafResult = await plannerAgent.run("What's the weather like in London?")
  console.log(`\n  🤖 YAAF Planner says:\n  ${yaafResult.split('\n').join('\n  ')}`)

  // ── Summary ───────────────────────────────────────────────────────────────
  banner('✅ A2A Interoperability Demo Complete!')
  console.log(`
  What we demonstrated:

  ┌─── Framework A: YAAF ──────────────────────────────────────┐
  │  Weather Specialist Agent                                   │
  │  ├── get_weather(city) tool                                │
  │  └── Served via A2A at ${serverHandle.url}    
  │      ├── GET /.well-known/agent.json (Agent Card)          │
  │      └── POST / (JSON-RPC 2.0 tasks/send)                 │
  └────────────────────────────────────────────────────────────┘
        ↕ A2A Protocol (JSON-RPC 2.0 over HTTP)
  ┌─── Framework B: Vercel AI SDK ─────────────────────────────┐
  │  Travel Planner Agent                                       │
  │  ├── ask_weather_agent tool → A2A bridge                   │
  │  └── Used YAAF agent as an opaque remote service           │
  └────────────────────────────────────────────────────────────┘

  ✓ Agent Card discovery (/.well-known/agent.json)
  ✓ Task creation via JSON-RPC 2.0
  ✓ Cross-framework tool delegation
  ✓ YAAF asTool() native bridge
  ✓ Both agents ran independently — opaque to each other
  `)

  // Cleanup
  await serverHandle.close()
  console.log('  Server stopped. Done.\n')
  process.exit(0)
}

main().catch(console.error)
