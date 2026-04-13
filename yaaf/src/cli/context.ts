/**
 * yaaf context list — Inspect the assembled system prompt.
 *
 * Scans the project for all context sources and shows what
 * would be injected into the system prompt at runtime.
 *
 * @module cli/context
 */

import { resolve } from 'node:path'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

// ── Styling ──────────────────────────────────────────────────────────────────

const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

// ── Types ────────────────────────────────────────────────────────────────────

type ContextItem = {
  source: string
  type: 'base' | 'soul' | 'skill' | 'tool' | 'memory'
  chars: number
  estimatedTokens: number
  droppable: boolean
}

// ── Context List ─────────────────────────────────────────────────────────────

export async function contextList(): Promise<void> {
  const cwd = process.cwd()
  const items: ContextItem[] = []

  console.log(`
${CYAN}${BOLD}  Context Engine Inspector${RESET}
${DIM}  Scanning project for context sources...${RESET}
`)

  // 1. Look for system prompt in agent source
  const agentFiles = ['src/agent.ts', 'src/index.ts', 'src/main.ts']
  for (const file of agentFiles) {
    const path = resolve(cwd, file)
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8')
      // Rough estimate: find systemPrompt in the source
      const match = content.match(/systemPrompt:\s*[`'"]([\s\S]*?)[`'"]/)
      if (match) {
        items.push({
          source: file,
          type: 'base',
          chars: match[1]!.length,
          estimatedTokens: Math.ceil(match[1]!.length / 4),
          droppable: false,
        })
      }
      break
    }
  }

  // 2. SOUL.md
  const soulPath = resolve(cwd, 'SOUL.md')
  if (existsSync(soulPath)) {
    const content = readFileSync(soulPath, 'utf-8')
    items.push({
      source: 'SOUL.md',
      type: 'soul',
      chars: content.length,
      estimatedTokens: Math.ceil(content.length / 4),
      droppable: false,
    })
  }

  // 3. Skills
  const skillsDir = resolve(cwd, 'skills')
  if (existsSync(skillsDir)) {
    scanSkillsDir(skillsDir, 'skills', items)
  }

  // 4. Tools (estimate from tool definitions)
  const toolsDir = resolve(cwd, 'src/tools')
  if (existsSync(toolsDir)) {
    const tools = readdirSync(toolsDir).filter(f => f.endsWith('.ts'))
    // Rough estimate: each tool definition adds ~200 tokens to the prompt
    for (const tool of tools) {
      const content = readFileSync(resolve(toolsDir, tool), 'utf-8')
      const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/)
      const descMatch = content.match(/description:\s*['"]([^'"]+)['"]/)
      const schemaSize = (content.match(/inputSchema:\s*\{[\s\S]*?\n  \}/) ?? [''])[0]!.length

      items.push({
        source: `src/tools/${tool}`,
        type: 'tool',
        chars: (nameMatch?.[1]?.length ?? 0) + (descMatch?.[1]?.length ?? 0) + schemaSize,
        estimatedTokens: Math.ceil(schemaSize / 4) + 50, // schema + overhead
        droppable: false,
      })
    }
  }

  // 5. Memory
  const memDir = resolve(cwd, '.yaaf/memory')
  if (existsSync(memDir)) {
    const entries = readdirSync(memDir)
    let totalChars = 0
    for (const entry of entries) {
      const content = readFileSync(resolve(memDir, entry), 'utf-8')
      totalChars += content.length
    }
    if (totalChars > 0) {
      items.push({
        source: `.yaaf/memory/ (${entries.length} entries)`,
        type: 'memory',
        chars: totalChars,
        estimatedTokens: Math.ceil(totalChars / 4),
        droppable: true,
      })
    }
  }

  // Display results
  if (items.length === 0) {
    console.log(`  ${YELLOW}No context sources found.${RESET}`)
    console.log(`  ${DIM}Run 'yaaf init' to create a project, or create src/agent.ts${RESET}\n`)
    return
  }

  // Table header
  const typeColors: Record<string, string> = {
    base: CYAN,
    soul: GREEN,
    skill: YELLOW,
    tool: CYAN,
    memory: DIM,
  }

  console.log(`  ${BOLD}${'Type'.padEnd(8)} ${'Source'.padEnd(40)} ${'Chars'.padStart(8)} ${'~Tokens'.padStart(8)} ${'Drop?'.padStart(6)}${RESET}`)
  console.log(`  ${DIM}${'─'.repeat(74)}${RESET}`)

  let totalChars = 0
  let totalTokens = 0

  for (const item of items) {
    const color = typeColors[item.type] ?? ''
    const dropLabel = item.droppable ? `${YELLOW}yes${RESET}` : `${DIM}no${RESET}`
    console.log(
      `  ${color}${item.type.padEnd(8)}${RESET} ` +
      `${item.source.padEnd(40)} ` +
      `${String(item.chars).padStart(8)} ` +
      `${String(item.estimatedTokens).padStart(8)} ` +
      `${dropLabel.padStart(6 + (item.droppable ? 9 : 4))}`
    )
    totalChars += item.chars
    totalTokens += item.estimatedTokens
  }

  console.log(`  ${DIM}${'─'.repeat(74)}${RESET}`)
  console.log(
    `  ${BOLD}${'TOTAL'.padEnd(8)}${RESET} ` +
    `${''.padEnd(40)} ` +
    `${BOLD}${String(totalChars).padStart(8)}${RESET} ` +
    `${BOLD}${String(totalTokens).padStart(8)}${RESET}`
  )

  // Context budget warning
  const MODEL_LIMITS: Record<string, number> = {
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'claude-3.5-sonnet': 200000,
    'gemini-2.5-pro': 1000000,
    'gemini-2.5-flash': 1000000,
  }

  console.log(`
  ${DIM}Context budget usage by model:${RESET}`)
  for (const [model, limit] of Object.entries(MODEL_LIMITS)) {
    const pct = ((totalTokens / limit) * 100).toFixed(1)
    const bar = '█'.repeat(Math.min(20, Math.ceil((totalTokens / limit) * 20)))
    const color = totalTokens / limit > 0.5 ? YELLOW : GREEN
    console.log(`    ${model.padEnd(22)} ${color}${bar.padEnd(20)}${RESET} ${pct}%`)
  }
  console.log()
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scanSkillsDir(dir: string, prefix: string, items: ContextItem[]): void {
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Check for SKILL.md inside subdirectory
      const skillMd = resolve(dir, entry.name, 'SKILL.md')
      if (existsSync(skillMd)) {
        const content = readFileSync(skillMd, 'utf-8')
        items.push({
          source: `${prefix}/${entry.name}/SKILL.md`,
          type: 'skill',
          chars: content.length,
          estimatedTokens: Math.ceil(content.length / 4),
          droppable: true,
        })
      }
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
      const content = readFileSync(resolve(dir, entry.name), 'utf-8')
      items.push({
        source: `${prefix}/${entry.name}`,
        type: 'skill',
        chars: content.length,
        estimatedTokens: Math.ceil(content.length / 4),
        droppable: true,
      })
    }
  }
}
