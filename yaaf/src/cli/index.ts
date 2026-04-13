#!/usr/bin/env node

/**
 * YAAF CLI — Developer tools for the YAAF agent framework.
 *
 * Commands:
 *   yaaf init [name]         Scaffold a new agent project
 *   yaaf dev                 Run agent in interactive REPL mode
 *   yaaf add tool <name>     Add a tool scaffold
 *   yaaf add skill <name>    Add a SKILL.md template
 *   yaaf context list        Inspect the system prompt
 *   yaaf run                 Run agent in production mode
 *   yaaf status              Show agent status
 *
 * @module cli
 */

import { parseArgs } from 'node:util'
import { initProject } from './init.js'
import { runDev } from './dev.js'
import { addComponent } from './add.js'
import { contextList } from './context.js'

// ── Styling ──────────────────────────────────────────────────────────────────

const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const RESET = '\x1b[0m'

function banner(): string {
  return `
${CYAN}${BOLD}  ╦ ╦╔═╗╔═╗╔═╗${RESET}
${CYAN}${BOLD}  ╚╦╝╠═╣╠═╣╠╣ ${RESET}  ${DIM}Yet Another Agentic Framework${RESET}
${CYAN}${BOLD}   ╩ ╩ ╩╩ ╩╚  ${RESET}  ${DIM}v0.4.0${RESET}
`
}

function helpText(): string {
  return `${banner()}
${BOLD}USAGE${RESET}
  ${CYAN}yaaf${RESET} <command> [options]

${BOLD}COMMANDS${RESET}
  ${GREEN}init${RESET} [name]           Create a new agent project
  ${GREEN}dev${RESET}                   Run agent in interactive REPL mode
  ${GREEN}add${RESET} tool <name>       Add a new tool to the project
  ${GREEN}add${RESET} skill <name>      Add a new SKILL.md to the project
  ${GREEN}context${RESET} list          Inspect the assembled system prompt
  ${GREEN}run${RESET}                   Run agent entry point
  ${GREEN}status${RESET}               Show project status

${BOLD}OPTIONS${RESET}
  ${DIM}--help, -h${RESET}             Show this help message
  ${DIM}--version, -v${RESET}          Show version

${BOLD}EXAMPLES${RESET}
  ${DIM}$${RESET} yaaf init my-agent
  ${DIM}$${RESET} yaaf dev
  ${DIM}$${RESET} yaaf add tool weather
  ${DIM}$${RESET} yaaf add skill security-review
`
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(helpText())
    return
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    console.log('yaaf v0.4.0')
    return
  }

  const command = argv[0]
  const rest = argv.slice(1)

  try {
    switch (command) {
      case 'init':
        await initProject(rest[0])
        break

      case 'dev':
        await runDev(rest)
        break

      case 'add':
        await addComponent(rest)
        break

      case 'context':
        if (rest[0] === 'list') {
          await contextList()
        } else {
          console.error(`${RED}Unknown context subcommand: ${rest[0]}${RESET}`)
          console.log(`  Usage: yaaf context list`)
          process.exitCode = 1
        }
        break

      case 'run':
        await runAgent(rest)
        break

      case 'status':
        await showStatus()
        break

      default:
        console.error(`${RED}Unknown command: ${command}${RESET}`)
        console.log(helpText())
        process.exitCode = 1
    }
  } catch (err) {
    console.error(`${RED}Error:${RESET} ${err instanceof Error ? err.message : String(err)}`)
    process.exitCode = 1
  }
}

// ── Run command ──────────────────────────────────────────────────────────────

async function runAgent(_args: string[]): Promise<void> {
  const { resolve } = await import('node:path')
  const { existsSync } = await import('node:fs')

  // Look for common entry points
  const candidates = [
    'src/index.ts',
    'src/agent.ts',
    'src/main.ts',
    'index.ts',
  ]

  const entry = candidates.find(c => existsSync(resolve(process.cwd(), c)))
  if (!entry) {
    throw new Error(
      `No entry point found. Looked for: ${candidates.join(', ')}\n` +
      `  Run from your agent project root, or create src/index.ts`
    )
  }

  console.log(`${GREEN}▶${RESET} Running ${CYAN}${entry}${RESET}...`)

  const { execSync } = await import('node:child_process')
  execSync(`npx tsx ${entry}`, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  })
}

// ── Status command ───────────────────────────────────────────────────────────

async function showStatus(): Promise<void> {
  const { resolve, basename } = await import('node:path')
  const { existsSync, readFileSync, readdirSync } = await import('node:fs')

  const cwd = process.cwd()
  const pkgPath = resolve(cwd, 'package.json')

  console.log(banner())

  // Project info
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    console.log(`${BOLD}Project:${RESET}  ${pkg.name ?? basename(cwd)}`)
    console.log(`${BOLD}Version:${RESET}  ${pkg.version ?? 'unknown'}`)
  } else {
    console.log(`${YELLOW}⚠ No package.json found${RESET}`)
  }

  // Tools
  const toolsDir = resolve(cwd, 'src/tools')
  if (existsSync(toolsDir)) {
    const tools = readdirSync(toolsDir).filter(f => f.endsWith('.ts'))
    console.log(`${BOLD}Tools:${RESET}    ${tools.length} (${tools.map(f => f.replace('.ts', '')).join(', ') || 'none'})`)
  }

  // Skills
  const skillsDir = resolve(cwd, 'skills')
  if (existsSync(skillsDir)) {
    const skills = readdirSync(skillsDir).filter(f => f.endsWith('.md'))
    console.log(`${BOLD}Skills:${RESET}   ${skills.length} (${skills.map(f => f.replace('.md', '')).join(', ') || 'none'})`)
  }

  // Soul
  const soulPath = resolve(cwd, 'SOUL.md')
  console.log(`${BOLD}Soul:${RESET}     ${existsSync(soulPath) ? GREEN + '✓ SOUL.md' + RESET : DIM + 'none' + RESET}`)

  // Memory
  const memDir = resolve(cwd, '.yaaf/memory')
  if (existsSync(memDir)) {
    const memories = readdirSync(memDir).length
    console.log(`${BOLD}Memories:${RESET} ${memories} entries`)
  }

  console.log()
}

// ── Entry point ──────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
