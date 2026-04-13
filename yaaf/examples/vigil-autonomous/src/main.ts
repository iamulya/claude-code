/**
 * Vigil Autonomous Agent Example
 *
 * Demonstrates:
 *   - vigil(): factory for a proactive autonomous agent
 *   - tick-driven work loop: agent fires every N seconds automatically
 *   - cron-style scheduled tasks: daily/hourly recurring tasks
 *   - Brief output channel: structured output separate from conversation
 *   - Session journal: append-only log of all ticks and briefs
 *   - graceful shutdown: vigil.stop()
 *
 * Vigil is YAAF's autonomous agent mode — a tick-driven execution engine that
 * runs continuously, proactively monitoring and acting without waiting for
 * user messages.
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/main.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/main.ts
 *
 *   # Run for 30 seconds then stop
 *   GEMINI_API_KEY=... npx tsx src/main.ts --duration=30
 */

import { vigil, buildTool } from 'yaaf'

// ── Tools the Vigil agent uses on each tick ───────────────────────────────────

let systemHealth = { cpu: 0, memory: 0, errors: 0 }

const checkSystemTool = buildTool({
  name: 'check_system',
  inputSchema: { type: 'object', properties: {} },
  maxResultChars: 500,
  describe: () => 'Check system health metrics',
  async call() {
    // Simulate fluctuating metrics
    systemHealth = {
      cpu: Math.round(Math.random() * 100),
      memory: Math.round(60 + Math.random() * 40),
      errors: Math.floor(Math.random() * 3),
    }
    return {
      data: JSON.stringify({
        cpu_percent: systemHealth.cpu,
        memory_percent: systemHealth.memory,
        error_count: systemHealth.errors,
        timestamp: new Date().toISOString(),
      }, null, 2),
    }
  },
  isReadOnly: () => true,
})

const sendAlertTool = buildTool({
  name: 'send_alert',
  inputSchema: {
    type: 'object',
    properties: {
      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      message: { type: 'string' },
    },
    required: ['severity', 'message'],
  },
  maxResultChars: 200,
  describe: ({ severity, message }) => `Alert [${severity}]: ${message}`,
  async call({ severity, message }) {
    console.log(`  ${severity === 'critical' || severity === 'high' ? '🚨' : '⚠️ '} ALERT [${severity}]: ${message}`)
    return { data: `Alert sent: [${severity}] ${message}` }
  },
})

const writeBriefTool = buildTool({
  name: 'write_brief',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      status: { type: 'string', enum: ['ok', 'warning', 'critical'] },
    },
    required: ['title', 'summary', 'status'],
  },
  maxResultChars: 200,
  describe: ({ title }) => `Brief: ${title}`,
  async call({ title, summary, status }) {
    const icons: Record<string, string> = { ok: '✅', warning: '⚠️', critical: '🚨' }
    console.log(`  ${icons[status as string] ?? '📝'} Brief: ${title} — ${summary}`)
    return { data: 'Brief written' }
  },
})

// ── Colors ────────────────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m',
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const durationArg = process.argv.find(a => a.startsWith('--duration='))
  const durationSec = durationArg ? parseInt(durationArg.split('=')[1]!) : 45

  console.log(`\n${c.bold}${c.cyan}🛡️  Vigil Autonomous Agent Example${c.reset}`)
  console.log(`${c.dim}Tick-driven proactive monitoring — running for ${durationSec}s${c.reset}`)
  console.log(`${c.dim}Press Ctrl+C to stop early${c.reset}\n`)

  // Handle no API key gracefully — vigil() calls new Agent() internally
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.log(`${c.yellow}No API key set.${c.reset}`)
    console.log(`${c.dim}Set GEMINI_API_KEY or OPENAI_API_KEY to run the full monitoring loop.`)
    console.log(`\nVigil features:`)
    console.log(`  • vigil({ tickIntervalMs: 10_000, ... })  — autonomous tick loop`)
    console.log(`  • schedule: [{ cron: '0 9 * * *', ... }] — cron-scheduled tasks`)
    console.log(`  • agent.on('tick:start', ...)             — per-tick observability`)
    console.log(`  • await agent.start() / agent.stop()      — lifecycle control`)
    console.log(`  • Journal written to: /tmp/vigil-example/ ${c.reset}\n`)
    return
  }

  let tickCount = 0

  const agent = vigil({
    name: 'SystemMonitor',

    systemPrompt: `You are an autonomous system monitoring agent.
Every tick you MUST:
1. Call check_system to get current metrics
2. Analyze the metrics:
   - CPU > 80%: send an alert with severity="high", message explaining the issue
   - Memory > 90%: send an alert with severity="critical"
   - Error count > 0: send an alert with severity="medium"
   - Everything healthy: no alert needed
3. Always call write_brief with a title="System Status", a one-line summary, and status="ok"/"warning"/"critical"

Be concise. Each tick should complete in 2-3 tool calls.`,

    tools: [checkSystemTool, sendAlertTool, writeBriefTool],

    // Fire every 10 seconds (1/6 of a minute)
    tickEveryMinutes: 10 / 60,

    // Storage for tasks and journal
    storageDir: '/tmp/vigil-example',

    maxIterations: 8,
    temperature: 0.1,
  })

  // Schedule recurring tasks via the runtime API
  agent.schedule('0 9 * * *', 'Generate a comprehensive daily system health report.')
  agent.schedule('0 * * * *', 'Run a brief hourly system check and log the results.')

  // Wire up events
  agent
    .onVigil('tick', ({ count, response }) => {
      tickCount = count
      console.log(`\n${c.cyan}[Tick ${count}]${c.reset} ${new Date().toLocaleTimeString()}`)
      console.log(`  ${c.dim}Response: ${response.slice(0, 100)}${response.length > 100 ? '...' : ''}${c.reset}`)
    })
    .onVigil('error', ({ source, error }) => {
      console.log(`  ${c.magenta}${source} error: ${error.message}${c.reset}`)
    })
    .on('tool:call', ({ name }) => {
      process.stdout.write(`  ${c.dim}→ ${name}${c.reset} `)
    })
    .on('tool:result', () => {
      process.stdout.write(`${c.green}✓${c.reset}\n`)
    })


  await agent.start()

  // Run for the configured duration, then stop
  await new Promise(resolve => setTimeout(resolve, durationSec * 1000))

  await agent.stop()

  console.log(`\n${c.bold}${c.cyan}Summary${c.reset}`)
  console.log(`  Ticks completed: ${tickCount}`)
  console.log(`  Journal: /tmp/vigil-example/vigil.journal.jsonl`)
  console.log(`  Tasks:   /tmp/vigil-example/tasks/\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
