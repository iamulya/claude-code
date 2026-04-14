/**
 * Streaming Agent Example
 *
 * Demonstrates:
 *   - agent.runStream(): async generator yielding RunnerStreamEvent
 *   - Real-time token printing: event.type === 'text_delta' → event.content
 *   - Observing tool calls: 'tool_call_start', 'tool_call_result'
 *   - LLM usage events: 'usage', 'final_response'
 *   - Streaming with AbortController (user cancel mid-generation)
 *   - Progress indicator driven entirely by stream events
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/index.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/index.ts
 */

import {
  Agent,
  buildTool,
  type RunnerStreamEvent,
} from 'yaaf'

// ─── tools ───────────────────────────────────────────────────────────────────

const calculatorTool = buildTool({
  name: 'calculate',
  inputSchema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Math expression to evaluate, e.g. "2 + 2"' },
    },
    required: ['expression'],
  },
  maxResultChars: 500,
  describe: () => 'Evaluate a mathematical expression.',
  call: async (input: Record<string, unknown>) => {
    const expr = String(input.expression).replace(/[^0-9+\-*/().,\s]/g, '')
    try {
      const result = Function(`"use strict"; return (${expr})`)()
      return { data: String(result) }
    } catch {
      return { data: 'Error: invalid expression' }
    }
  },
  isReadOnly: () => true,
})

const weatherTool = buildTool({
  name: 'get_weather',
  inputSchema: {
    type: 'object',
    properties: { city: { type: 'string' } },
    required: ['city'],
  },
  maxResultChars: 500,
  describe: () => 'Get current weather for a city (mock data).',
  call: async (input: Record<string, unknown>) => {
    const weather: Record<string, string> = {
      London:   '15°C, partly cloudy, humidity 72%',
      Tokyo:    '22°C, sunny, humidity 55%',
      NewYork:  '18°C, overcast, humidity 68%',
      Sydney:   '24°C, sunny, humidity 45%',
    }
    const city = String(input.city)
    return { data: `${city}: ${weather[city] ?? `${Math.floor(Math.random() * 30)}°C, variable`}` }
  },
  isReadOnly: () => true,
})

// ─── helper ──────────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`)
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Basic streaming: print tokens as they arrive ──────────────────────
  banner('1. Real-Time Token Streaming (event.content)')

  const streamAgent = new Agent({
    name: 'StreamBot',
    systemPrompt: 'You are a concise assistant. Write clearly.',
  })

  console.log('\nQuestion: "Explain event sourcing in 3 sentences."\n')
  process.stdout.write('Answer: ')

  let charsWritten = 0
  for await (const event of streamAgent.runStream('Explain event sourcing in 3 sentences.')) {
    // RunnerStreamEvent: text_delta carries content (not text)
    if (event.type === 'text_delta') {
      process.stdout.write(event.content)
      charsWritten += event.content.length
    }
  }
  console.log(`\n\n(${charsWritten} chars streamed token-by-token)`)

  // ── 2. Streaming with tool calls ─────────────────────────────────────────
  banner('2. Streaming with Tool Calls')

  const toolAgent = new Agent({
    name: 'ToolStreamer',
    systemPrompt: 'You are a helpful assistant with calculator and weather tools.',
    tools: [calculatorTool, weatherTool],
  })

  console.log('\nQuestion: "What is 42 * 17? Also, what\'s the weather in Tokyo?"\n')

  const eventLog: Array<{ type: string }> = []

  for await (const event of toolAgent.runStream(
    "What is 42 * 17? Also, what's the weather in Tokyo?"
  )) {
    eventLog.push({ type: event.type })

    switch (event.type) {
      case 'tool_call_start':
        // tool_call_start: { name, arguments }
        console.log(`  🔧 Tool call: ${event.name}(${JSON.stringify(event.arguments).slice(0, 60)})`)
        break
      case 'tool_call_result':
        // tool_call_result: { name, result, durationMs }
        console.log(`  ✓  Result: ${String(event.result).slice(0, 80)}`)
        break
      case 'text_delta':
        process.stdout.write(event.content)
        break
      case 'usage':
        // usage: SessionUsage { totalPromptTokens, totalCompletionTokens, llmCalls, totalDurationMs }
        break
    }
  }

  console.log('\n')
  const counts: Record<string, number> = {}
  eventLog.forEach(e => { counts[e.type] = (counts[e.type] ?? 0) + 1 })
  console.log('Stream event breakdown:')
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k.padEnd(22)} ${v} events`))

  // ── 3. Streaming with early abort (cancellation) ─────────────────────────
  banner('3. Streaming with AbortController (Cancel Mid-Stream)')

  const abortAgent = new Agent({
    name: 'LongWriter',
    systemPrompt: 'You are a verbose writer. Write long, detailed responses.',
  })

  const ac = new AbortController()
  let charCount = 0
  const ABORT_AFTER = 80

  console.log(`\nStarting stream — will abort after ${ABORT_AFTER} characters:\n`)
  process.stdout.write('Output: ')

  try {
    for await (const event of abortAgent.runStream(
      'Write a detailed history of the internet, covering all major milestones in depth.',
      ac.signal,
    )) {
      if (event.type === 'text_delta') {
        process.stdout.write(event.content)
        charCount += event.content.length
        if (charCount >= ABORT_AFTER) {
          ac.abort()
          break
        }
      }
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') throw err
  }

  console.log(`\n\n⛔ Stream aborted after ~${charCount} characters (user cancel simulated)`)

  // ── 4. Collecting the complete final response ─────────────────────────────
  banner('4. Collecting Final Response via final_response Event')

  const collectAgent = new Agent({
    name: 'Collector',
    systemPrompt: 'Be concise.',
    tools: [calculatorTool],
  })

  console.log('\nQuestion: "What is 1024 * 1024?"\n')

  let finalResponse = ''
  let totalTokens = 0

  for await (const event of collectAgent.runStream('What is 1024 * 1024?')) {
    if (event.type === 'usage') {
      // usage event carries SessionUsage: { totalPromptTokens, totalCompletionTokens, llmCalls, totalDurationMs }
      totalTokens = event.usage.totalPromptTokens + event.usage.totalCompletionTokens
    }
    if (event.type === 'final_response') {
      // final_response: { content } — the complete agent reply
      finalResponse = event.content
    }
  }

  console.log(`Answer: ${finalResponse}`)
  console.log(`Tokens used: ${totalTokens}`)

  // ── 5. Progress indicator from stream events ──────────────────────────────
  banner('5. Animated Progress Indicator from Stream Events')

  const progressAgent = new Agent({
    name: 'ProgressBot',
    systemPrompt: 'You are a helpful assistant.',
    tools: [calculatorTool, weatherTool],
  })

  console.log('\nQuestion: "Compare the weather in London and Sydney, then multiply their temperatures."\n')

  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let spin = 0
  let phase = 'thinking'
  let answering = false

  for await (const event of progressAgent.runStream(
    'Compare the weather in London and Sydney, then multiply their temperatures together.'
  )) {
    switch (event.type) {
      case 'tool_call_start':
        phase = `calling ${event.name}`
        break
      case 'tool_call_result':
        phase = 'processing'
        break
      case 'text_delta':
        if (!answering) {
          process.stdout.write('\n')
          answering = true
        }
        process.stdout.write(event.content)
        break
      default:
        if (!answering) {
          process.stdout.write(`\r  ${spinner[spin++ % spinner.length]} ${phase}      `)
        }
    }
  }
  console.log('\n\n✅ Stream complete')
}

main().catch(console.error)
