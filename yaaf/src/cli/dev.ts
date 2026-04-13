/**
 * yaaf dev — Interactive REPL for agent development.
 *
 * Runs the agent in an interactive terminal session:
 * - Type messages to chat with your agent
 * - /quit to exit
 * - /clear to reset conversation
 * - /context to inspect the system prompt
 * - /tools to list available tools
 * - /cost to show token usage
 *
 * @module cli/dev
 */

import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

// ── Styling ──────────────────────────────────────────────────────────────────

const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const MAGENTA = '\x1b[35m'
const RESET = '\x1b[0m'

// ── Dev REPL ─────────────────────────────────────────────────────────────────

export async function runDev(args: string[]): Promise<void> {
  const cwd = process.cwd()

  // Find the agent entry point
  const candidates = [
    'src/agent.ts',
    'src/index.ts',
    'src/main.ts',
    'agent.ts',
  ]

  const entry = candidates.find(c => existsSync(resolve(cwd, c)))

  console.log(`
${CYAN}${BOLD}  ╦ ╦╔═╗╔═╗╔═╗${RESET}  ${GREEN}dev mode${RESET}
${CYAN}${BOLD}  ╚╦╝╠═╣╠═╣╠╣ ${RESET}  ${DIM}Interactive REPL${RESET}
${CYAN}${BOLD}   ╩ ╩ ╩╩ ╩╚  ${RESET}
`)

  // Show project info
  const pkgPath = resolve(cwd, 'package.json')
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    console.log(`  ${BOLD}Agent:${RESET}  ${pkg.name ?? 'unnamed'}`)
  }

  // Check for API keys
  const hasKey = !!(
    process.env.GOOGLE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY
  )

  if (!hasKey) {
    console.log(`
  ${YELLOW}⚠ No API key found.${RESET} Set one of:
    ${DIM}export GOOGLE_API_KEY=...${RESET}
    ${DIM}export OPENAI_API_KEY=...${RESET}
    ${DIM}export ANTHROPIC_API_KEY=...${RESET}
`)
  }

  // Show slash commands
  console.log(`
  ${DIM}Type a message to chat with your agent.${RESET}
  ${DIM}Slash commands:${RESET}
    ${GREEN}/quit${RESET}      Exit
    ${GREEN}/clear${RESET}     Reset conversation
    ${GREEN}/tools${RESET}     List available tools
    ${GREEN}/context${RESET}   Inspect system prompt
    ${GREEN}/cost${RESET}      Show token usage
    ${GREEN}/help${RESET}      Show commands
`)

  // Try to dynamically load the agent
  let agent: { run(input: string): Promise<string> } | null = null

  if (entry) {
    console.log(`  ${DIM}Loading ${entry}...${RESET}`)
    try {
      // Use tsx to run TypeScript files
      // For now, create a simple echo agent as fallback
      const entryPath = resolve(cwd, entry)

      // Try dynamic import (works if already compiled or using tsx loader)
      try {
        const mod = await import(entryPath)
        if (mod.default?.run) {
          agent = mod.default
        } else if (mod.agent?.run) {
          agent = mod.agent
        }
      } catch {
        // TypeScript source — can't import directly without tsx loader
      }
    } catch {
      // Ignore import errors
    }
  }

  if (!agent) {
    console.log(`  ${YELLOW}⚠ Could not load agent module.${RESET}`)
    console.log(`  ${DIM}Using echo mode. To use your agent, run: npx tsx src/agent.ts${RESET}`)
    agent = {
      run: async (input: string) =>
        `${DIM}[echo]${RESET} ${input}\n\n${DIM}Tip: Configure your agent in src/agent.ts and ensure it exports an agent with a .run() method.${RESET}`,
    }
  } else {
    console.log(`  ${GREEN}✓ Agent loaded${RESET}`)
  }

  console.log()

  // Create readline interface
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${CYAN}you ▸${RESET} `,
    terminal: true,
  })

  let conversationCount = 0

  rl.prompt()

  rl.on('line', async (line) => {
    const input = line.trim()
    if (!input) {
      rl.prompt()
      return
    }

    // Handle slash commands
    if (input.startsWith('/')) {
      await handleSlashCommand(input, cwd)
      rl.prompt()
      return
    }

    // Run through agent
    conversationCount++
    try {
      console.log()
      const response = await agent!.run(input)
      console.log(`${MAGENTA}${BOLD}agent ▸${RESET} ${response}`)
      console.log()
    } catch (err) {
      console.error(`  ${YELLOW}Error: ${err instanceof Error ? err.message : String(err)}${RESET}`)
      console.log()
    }

    rl.prompt()
  })

  rl.on('close', () => {
    console.log(`\n${DIM}Goodbye! (${conversationCount} messages)${RESET}\n`)
    process.exit(0)
  })
}

// ── Slash Commands ───────────────────────────────────────────────────────────

async function handleSlashCommand(input: string, cwd: string): Promise<void> {
  const [cmd, ...args] = input.slice(1).split(/\s+/)

  switch (cmd) {
    case 'quit':
    case 'exit':
    case 'q':
      console.log(`\n${DIM}Goodbye!${RESET}\n`)
      process.exit(0)

    case 'clear':
      console.clear()
      console.log(`  ${GREEN}✓ Conversation cleared${RESET}\n`)
      break

    case 'help':
    case 'h':
      console.log(`
  ${GREEN}/quit${RESET}      Exit the REPL
  ${GREEN}/clear${RESET}     Clear screen and reset conversation
  ${GREEN}/tools${RESET}     List tools in the project
  ${GREEN}/context${RESET}   Show system prompt sections
  ${GREEN}/cost${RESET}      Show estimated cost
  ${GREEN}/help${RESET}      Show this help
`)
      break

    case 'tools': {
      const toolsDir = resolve(cwd, 'src/tools')
      if (existsSync(toolsDir)) {
        const { readdirSync } = await import('node:fs')
        const tools = readdirSync(toolsDir).filter((f: string) => f.endsWith('.ts'))
        console.log(`\n  ${BOLD}Tools (${tools.length}):${RESET}`)
        for (const t of tools) {
          console.log(`    ${GREEN}•${RESET} ${t.replace('.ts', '')}`)
        }
        console.log()
      } else {
        console.log(`  ${DIM}No tools directory found${RESET}\n`)
      }
      break
    }

    case 'context': {
      const skillsDir = resolve(cwd, 'skills')
      const soulPath = resolve(cwd, 'SOUL.md')

      console.log(`\n  ${BOLD}Context Sections:${RESET}`)
      console.log(`    ${GREEN}•${RESET} Base system prompt`)

      if (existsSync(soulPath)) {
        const content = readFileSync(soulPath, 'utf-8')
        console.log(`    ${GREEN}•${RESET} SOUL.md (${content.length} chars)`)
      }

      if (existsSync(skillsDir)) {
        const { readdirSync } = await import('node:fs')
        const skills = readdirSync(skillsDir).filter((f: string) => f.endsWith('.md'))
        for (const s of skills) {
          const content = readFileSync(resolve(skillsDir, s), 'utf-8')
          console.log(`    ${GREEN}•${RESET} Skill: ${s.replace('.md', '')} (${content.length} chars)`)
        }
      }

      console.log()
      break
    }

    case 'cost':
      console.log(`\n  ${DIM}Cost tracking requires the agent's CostTracker to be exposed.${RESET}`)
      console.log(`  ${DIM}See: import { CostTracker } from 'yaaf'${RESET}\n`)
      break

    default:
      console.log(`  ${YELLOW}Unknown command: /${cmd}${RESET}`)
      console.log(`  ${DIM}Type /help for available commands${RESET}\n`)
  }
}
