#!/usr/bin/env node
/**
 * YAAF Expert Agent — Entrypoint
 *
 * Two modes:
 *   $ npm start          → Interactive REPL (ask questions about YAAF)
 *   $ npm run daemon     → Background daemon (watches for errors, proactively helps)
 *   $ npm start -- --watch → Lightweight file watcher (no LLM calls)
 *
 * This agent is built WITH YAAF, FOR YAAF developers — the ultimate dogfood.
 */

import * as readline from 'readline'
import { Agent, Vigil, ContextManager } from 'yaaf'
import { codeIntelligenceTools } from './tools.js'
import { buildSystemPrompt, DAEMON_TICK_PROMPT } from './prompt.js'
import { YaafDaemon } from './daemon.js'

// ── Mode detection ───────────────────────────────────────────────────────────

const isDaemon = process.argv.includes('--daemon')
const isWatch = process.argv.includes('--watch')

// ── ANSI colors ──────────────────────────────────────────────────────────────

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`

// ── Banner ───────────────────────────────────────────────────────────────────

function printBanner(mode: string): void {
  console.log('')
  console.log(cyan('  ╔══════════════════════════════════════════════╗'))
  console.log(cyan('  ║') + bold('       🤖 YAAF Expert Agent v0.1.0          ') + cyan('║'))
  console.log(cyan('  ║') + dim(`       Mode: ${mode.padEnd(30)}`) + cyan('║'))
  console.log(cyan('  ╚══════════════════════════════════════════════╝'))
  console.log('')
}

// ── Interactive Mode ─────────────────────────────────────────────────────────

async function startInteractive(): Promise<void> {
  printBanner('Interactive REPL')

  console.log(dim('  Building knowledge base from YAAF source tree...'))
  const systemPrompt = await buildSystemPrompt()
  console.log(green('  ✓ Knowledge base loaded'))
  console.log(dim('  Tools: read_file, grep_search, list_dir, run_tsc, run_tests, get_project_structure'))
  console.log('')
  console.log(bold('  Ask me anything about YAAF.'))
  console.log(dim('  Examples:'))
  console.log(dim('    • "How does the AgentRunner handle context overflow?"'))
  console.log(dim('    • "What compaction strategies are available?"'))
  console.log(dim('    • "Run the tests and tell me about any failures"'))
  console.log(dim('    • "Find all places where maxTokens is used"'))
  console.log('')

  const agent = new Agent({
    name: 'YAAF Expert',
    systemPrompt,
    tools: codeIntelligenceTools,
    contextManager: new ContextManager({
      contextWindowTokens: 1_048_576,
      maxOutputTokens: 65_536,
      compactionStrategy: 'truncate',
    }),
    maxIterations: 25,  // Allow deep multi-step investigations
  })

  // Simple readline REPL
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: cyan('  yaaf> '),
  })

  rl.prompt()

  rl.on('line', async (line) => {
    const input = line.trim()
    if (!input) { rl.prompt(); return }
    if (input === 'exit' || input === 'quit' || input === '.exit') {
      console.log(dim('\n  Goodbye!'))
      rl.close()
      process.exit(0)
    }
    if (input === 'reset') {
      agent.reset()
      console.log(green('  ✓ Conversation reset'))
      rl.prompt()
      return
    }

    try {
      console.log('')
      // Stream the response
      let hasContent = false
      for await (const event of agent.runStream(input)) {
        if (event.type === 'text_delta') {
          if (!hasContent) { process.stdout.write(cyan('  ')); hasContent = true }
          process.stdout.write(event.content)
        } else if (event.type === 'tool_call_start') {
          console.log(dim(`\n  ⚙ ${event.name}...`))
        } else if (event.type === 'tool_call_result') {
          console.log(dim(`  ✓ ${event.name} (${event.durationMs}ms)`))
        }
      }
      if (hasContent) console.log('')
      console.log('')
    } catch (err: any) {
      console.error(red(`  Error: ${err.message}`))
      console.log('')
    }

    rl.prompt()
  })

  rl.on('close', () => {
    process.exit(0)
  })
}

// ── Daemon Mode ──────────────────────────────────────────────────────────────

async function startDaemon(): Promise<void> {
  const checkInterval = parseInt(process.env.CHECK_INTERVAL_SEC ?? '30', 10)
  printBanner(`Daemon (every ${checkInterval}s)`)

  console.log(dim('  Building knowledge base from YAAF source tree...'))
  const systemPrompt = await buildSystemPrompt()
  console.log(green('  ✓ Knowledge base loaded'))
  console.log(dim(`  Watching for TypeScript errors and test failures every ${checkInterval}s`))
  console.log(dim('  Press Ctrl+C to stop'))
  console.log('')

  const daemon = new YaafDaemon({
    name: 'YAAF Daemon',
    systemPrompt,
    tools: codeIntelligenceTools,
    contextManager: new ContextManager({
      contextWindowTokens: 1_048_576,
      maxOutputTokens: 65_536,
      compactionStrategy: 'truncate',
    }),
    maxIterations: 10,
    checkIntervalSec: checkInterval,
    onIssue: (issue) => {
      const icon = issue.type === 'compile_error' ? red('🔴') : yellow('🟡')
      console.log(`\n${icon} ${bold(issue.summary)}`)
      console.log(dim(issue.details.split('\n').slice(0, 5).join('\n')))
      console.log('')
    },
  })

  // Event listeners
  daemon.onVigil('start', ({ tickInterval, taskCount }) => {
    console.log(green(`  ✓ Daemon started (interval: ${tickInterval / 1000}s, tasks: ${taskCount})`))
  })

  daemon.onVigil('tick', ({ count }) => {
    const status = daemon.getHealthStatus()
    const statusIcon = status.healthy ? green('●') : red('●')
    const line = dim(`  [${new Date().toLocaleTimeString()}] Tick #${count} ${statusIcon}`)
    process.stdout.write(`\r${line}`)
  })

  daemon.onVigil('error', ({ source, error }) => {
    console.error(red(`\n  ✗ ${source} error: ${error.message}`))
  })

  daemon.onVigil('brief', ({ message }) => {
    console.log(`\n${cyan('  📋 Agent Brief:')}\n${message.split('\n').map(l => `    ${l}`).join('\n')}`)
  })

  // Run initial health check immediately
  console.log(dim('  Running initial health check...'))
  const issues = await daemon.healthCheck()
  if (issues.length === 0) {
    console.log(green('  ✓ Initial check: All clear'))
  } else {
    console.log(yellow(`  ⚠ Initial check: ${issues.length} issue(s) found`))
  }

  await daemon.start()

  process.on('SIGINT', () => {
    console.log(dim('\n\n  Shutting down daemon...'))
    daemon.stop()
    process.exit(0)
  })
}

// ── Watch Mode (lightweight — no LLM, just error detection) ──────────────────

async function startWatch(): Promise<void> {
  printBanner('Watch (no LLM)')

  console.log(dim('  Lightweight error watcher — no LLM calls, just tsc every 10s'))
  console.log(dim('  Press Ctrl+C to stop'))
  console.log('')

  const { execSync: exec } = await import('child_process')
  const pathMod = await import('path')
  const root = pathMod.resolve(import.meta.dirname, '..', '..')

  let lastErrors = new Set<string>()
  let tickCount = 0

  const check = () => {
    tickCount++
    const time = new Date().toLocaleTimeString()

    try {
      exec('npx tsc --noEmit 2>&1', { cwd: root, encoding: 'utf8', timeout: 60_000 })
      process.stdout.write(`\r  ${dim(`[${time}]`)} ${green('●')} ${dim(`Check #${tickCount}: clean`)}`)
      if (lastErrors.size > 0) {
        console.log(green(`\n  ✓ All ${lastErrors.size} error(s) resolved!`))
        lastErrors = new Set()
      }
    } catch (err: any) {
      const output = (err.stdout ?? '') + (err.stderr ?? '')
      const errors = output.split('\n').filter((l: string) => l.match(/error TS\d+/)).map((l: string) => l.trim())
      const newErrors = errors.filter((e: string) => !lastErrors.has(e))
      lastErrors = new Set(errors)
      if (newErrors.length > 0) {
        console.log(red(`\n  ✗ ${newErrors.length} new error(s) at ${time}:`))
        for (const e of newErrors.slice(0, 10)) console.log(`    ${e}`)
      } else {
        process.stdout.write(`\r  ${dim(`[${time}]`)} ${red('●')} ${dim(`Check #${tickCount}: ${errors.length} error(s) (unchanged)`)}`)
      }
    }
  }

  check()
  setInterval(check, 10_000)

  process.on('SIGINT', () => {
    console.log(dim('\n\n  Stopped.'))
    process.exit(0)
  })
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (isDaemon) {
    await startDaemon()
  } else if (isWatch) {
    await startWatch()
  } else {
    await startInteractive()
  }
}

main().catch(err => {
  console.error(red(`Fatal: ${err.message}`))
  process.exit(1)
})
