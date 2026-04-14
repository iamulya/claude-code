/**
 * System Prompt Builder for the YAAF Expert Agent
 *
 * Dynamically assembles a comprehensive system prompt from:
 * 1. The agent's identity and mission
 * 2. All YAAF documentation files (ingested at startup)
 * 3. The project structure map
 * 4. Key API surfaces extracted from source
 *
 * This gives the agent deep, current knowledge of YAAF without
 * relying on stale training data.
 */

import * as fs from 'fs/promises'
import * as path from 'path'

const YAAF_ROOT = path.resolve(import.meta.dirname, '..', '..')
const DOCS_DIR = path.join(YAAF_ROOT, 'docs')

// ── Identity ────────────────────────────────────────────────────────────────

const IDENTITY = `# YAAF Expert Agent

You are an expert on YAAF (Yet Another Agent Framework) — a TypeScript-first, provider-agnostic, production-grade agent framework. You have deep knowledge of every subsystem, API surface, and design decision.

## Your capabilities
- **Answer any question** about YAAF architecture, APIs, configuration, or usage
- **Read and search** the actual YAAF source code on the developer's machine
- **Compile the project** (tsc --noEmit) to check for errors
- **Run tests** (npm test) and diagnose failures
- **Suggest fixes** with exact file paths, line numbers, and code snippets
- **Explain design decisions** by referencing the actual implementation

## Your behavior
- Always ground your answers in the actual source code — use your tools to verify before answering
- Quote exact file paths and line numbers when referencing code
- When suggesting code changes, show the exact diff
- If you're not sure about something, search the codebase first
- Be concise but thorough — developers value precision over verbosity
- When in daemon mode, only surface actionable findings (don't report "all clear" repeatedly)

## Key project paths
- \`src/\` — Main source code
- \`src/agent.ts\` — The primary Agent class
- \`src/agents/runner.ts\` — AgentRunner (LLM↔Tool execution loop)
- \`src/models/\` — LLM provider implementations (OpenAI, Gemini, specs registry)
- \`src/context/\` — ContextManager and compaction strategies
- \`src/tools/\` — Tool definitions and utilities
- \`src/permissions.ts\` — Permission policy engine
- \`src/hooks.ts\` — Lifecycle hooks
- \`src/sandbox.ts\` — Execution sandboxing
- \`src/memory/\` — Memory strategies
- \`src/session.ts\` — Session persistence
- \`src/vigil.ts\` — Autonomous agent mode
- \`src/cli/\` — CLI runtime
- \`docs/\` — Documentation
- \`src/__tests__/\` — Test suite
`

// ── Documentation Ingestion ──────────────────────────────────────────────────

async function loadDocs(): Promise<string> {
  const sections: string[] = []

  try {
    const files = await fs.readdir(DOCS_DIR)
    const mdFiles = files.filter(f => f.endsWith('.md')).sort()

    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(DOCS_DIR, file), 'utf8')
      // Truncate very long docs to keep within token budget
      const truncated = content.length > 3000
        ? content.slice(0, 3000) + '\n\n[... truncated for brevity — use read_file to see full content]'
        : content
      sections.push(`## Documentation: ${file}\n\n${truncated}`)
    }
  } catch {
    sections.push('[Documentation directory not found — use read_file tool to access docs on demand]')
  }

  // Also ingest the README
  try {
    const readme = await fs.readFile(path.join(YAAF_ROOT, 'README.md'), 'utf8')
    const truncatedReadme = readme.length > 4000
      ? readme.slice(0, 4000) + '\n\n[... truncated]'
      : readme
    sections.unshift(`## README\n\n${truncatedReadme}`)
  } catch { /* ok */ }

  return sections.join('\n\n---\n\n')
}

// ── API Surface Extraction ───────────────────────────────────────────────────

async function extractApiSurface(): Promise<string> {
  const indexPath = path.join(YAAF_ROOT, 'src', 'index.ts')
  try {
    const content = await fs.readFile(indexPath, 'utf8')
    // Extract export lines for a quick reference
    const exports = content
      .split('\n')
      .filter(l => l.startsWith('export'))
      .join('\n')
    return `## Public API Exports (src/index.ts)\n\n\`\`\`typescript\n${exports}\n\`\`\``
  } catch {
    return '[Could not read index.ts — use read_file tool]'
  }
}

// ── Project Structure ────────────────────────────────────────────────────────

async function getStructure(): Promise<string> {
  const lines: string[] = ['## Source File Map\n']

  async function walk(dir: string, prefix: string = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (['node_modules', 'dist', '.git', 'yaaf-agent'].includes(entry.name)) continue
      const rel = path.relative(YAAF_ROOT, path.join(dir, entry.name))
      if (entry.isDirectory()) {
        lines.push(`${prefix}📁 ${entry.name}/`)
        await walk(path.join(dir, entry.name), prefix + '  ')
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.md')) {
        const stat = await fs.stat(path.join(dir, entry.name))
        lines.push(`${prefix}📄 ${entry.name} (${(stat.size / 1024).toFixed(1)}K)`)
      }
    }
  }

  await walk(YAAF_ROOT)
  return lines.join('\n')
}

// ── Build full prompt ────────────────────────────────────────────────────────

export async function buildSystemPrompt(): Promise<string> {
  const [docs, api, structure] = await Promise.all([
    loadDocs(),
    extractApiSurface(),
    getStructure(),
  ])

  return [
    IDENTITY,
    '\n---\n\n# YAAF Knowledge Base\n\n',
    'The following is your embedded knowledge, extracted directly from the current YAAF source tree.\n\n',
    docs,
    '\n\n---\n\n',
    api,
    '\n\n---\n\n',
    structure,
  ].join('')
}

// ── Daemon-specific prompt ───────────────────────────────────────────────────

export const DAEMON_TICK_PROMPT = (ts: string, count: number) =>
  `<tick timestamp="${ts}" count="${count}">
You are running in daemon mode. Check the YAAF project for:
1. TypeScript compilation errors (run_tsc)
2. Test failures (run_tests) — only if compilation passes
3. Any new issues since your last check

Rules:
- Only report if you find NEW problems. Do NOT report "all clear".
- When you find an issue, diagnose it and suggest a specific fix.
- Use brief() to communicate findings to the developer.
- Keep your analysis concise and actionable.
</tick>`
