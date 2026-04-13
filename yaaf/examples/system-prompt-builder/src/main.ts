/**
 * System Prompt Builder Example
 *
 * Demonstrates:
 *   - SystemPromptBuilder: section-based, cached prompt assembly
 *   - Static sections (session-cached): identity, rules, tool guides
 *   - Dynamic sections (per-turn): environment info, live memory, date/time
 *   - DYNAMIC_BOUNDARY_MARKER: separates cacheable from per-turn content
 *   - defaultPromptBuilder(): sensible-defaults factory
 *   - addWhen(): conditional sections
 *   - Agent.create(): async factory for builder resolution
 *   - reset(): clear cache for a fresh session
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/main.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/main.ts
 */

import { Agent, SystemPromptBuilder, defaultPromptBuilder, buildTool } from 'yaaf'

// ── A simple memory store (in-memory for demo) ────────────────────────────────

const inMemoryMemory: string[] = []

const rememberTool = buildTool({
  name: 'remember',
  inputSchema: {
    type: 'object',
    properties: { fact: { type: 'string', description: 'Fact to remember' } },
    required: ['fact'],
  },
  maxResultChars: 200,
  describe: ({ fact }) => `Remember: ${fact}`,
  async call({ fact }) {
    inMemoryMemory.push(String(fact))
    return { data: `Stored: "${fact}"` }
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
  console.log(`\n${c.bold}${c.cyan}📝 System Prompt Builder Example${c.reset}`)
  console.log(`${c.dim}Section-based, cached prompt composition${c.reset}\n`)

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Manual builder — full control
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`${c.yellow}1. Building a custom prompt with SystemPromptBuilder${c.reset}\n`)

  const isDebugMode = process.env.DEBUG === '1'

  const builder = new SystemPromptBuilder()
    // Static sections — computed once, cached for the session lifetime
    .addStatic('identity', () => `You are a helpful assistant named Atlas.
You are knowledgeable, concise, and always cite your reasoning.`, 0)

    .addStatic('rules', () => `## Rules
- Always be honest about what you know vs. what you are inferring
- Never make up facts
- Ask for clarification when the request is ambiguous
- Format code with proper syntax highlighting`, 50)

    .addStatic('tool-guide', () => `## Available Tools
- \`remember\`: Store important facts for this session
Use this proactively when the user shares important preferences or facts.`, 100)

    // Conditional section — only included when debug mode is on
    .addWhen(
      () => isDebugMode,
      'debug-info',
      () => `## Debug Mode
You are running in debug mode. Verbosely explain every reasoning step.`,
      { cache: 'session', order: 120 },
    )

    // Dynamic sections — recomputed every call (use sparingly!)
    .addDynamic(
      'live-memory',
      () => {
        if (inMemoryMemory.length === 0) return null
        return `## Session Memory\nFacts stored this session:\n${
          inMemoryMemory.map((f, i) => `${i + 1}. ${f}`).join('\n')
        }`
      },
      'memory changes as user stores new facts',
      200,
    )

    .addDynamic(
      'timestamp',
      () => `Current time: ${new Date().toLocaleString()}`,
      'time changes every turn',
      210,
    )

  // Preview the built prompt
  const prompt = await builder.build()
  console.log(`${c.dim}Built prompt (${prompt.length} chars, ${builder.size} sections):${c.reset}`)
  console.log(`${c.dim}Sections: [${builder.sectionNames().join(' → ')}]${c.reset}\n`)
  console.log(`${c.dim}First 400 chars:${c.reset}`)
  console.log(prompt.slice(0, 400) + (prompt.length > 400 ? '...' : ''))
  console.log()

  // ─────────────────────────────────────────────────────────────────────────
  // 2. defaultPromptBuilder() — sensible defaults in one line
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`${c.yellow}2. defaultPromptBuilder() — env + date included automatically${c.reset}\n`)

  const quickBuilder = defaultPromptBuilder('You are a coding assistant specializing in TypeScript.')
    .addStatic('style', () => `## Style Guide
- Prefer functional patterns over classes when possible
- Always add JSDoc to public APIs
- Use strict TypeScript — no any`)

  const quickPrompt = await quickBuilder.build()
  console.log(`${c.dim}Sections: [${quickBuilder.sectionNames().join(' → ')}]${c.reset}`)
  console.log(`${c.dim}Total: ${quickPrompt.length} chars${c.reset}\n`)

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Use with Agent.create() — async resolution at construction time
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`${c.yellow}3. Using builder with Agent.create() (async factory)${c.reset}\n`)

  let agent: Agent
  try {
    agent = await Agent.create({
      name: 'Atlas',
      systemPromptProvider: builder,   // ← builder resolved async here
      tools: [rememberTool],
      maxIterations: 8,
      temperature: 0.3,
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes('provider')) {
      console.log(`${c.dim}No API key set — showing prompt output only.${c.reset}`)
      console.log(`\n${c.green}✓ Builder API demonstrated successfully${c.reset}`)
      console.log(`${c.dim}Set GEMINI_API_KEY or OPENAI_API_KEY to run the full demo.${c.reset}\n`)
      return
    }
    throw err
  }

  // 4. Run a turn — dynamic sections are computed fresh each call
  console.log(`${c.blue}You:${c.reset} Remember that I prefer dark mode. Then tell me the current time.`)
  const r1 = await agent.run('Remember that I prefer dark mode. Then tell me the current time.')
  console.log(`${c.green}Agent:${c.reset} ${r1}\n`)

  // After the remember tool ran, the next build() will include the memory
  console.log(`${c.blue}You:${c.reset} What do you remember about my preferences?`)
  const r2 = await agent.run('What do you remember about my preferences?')
  console.log(`${c.green}Agent:${c.reset} ${r2}\n`)

  // ─────────────────────────────────────────────────────────────────────────
  // 4. reset() — for new sessions
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`${c.yellow}4. builder.reset() — clear cache for a new session${c.reset}\n`)
  builder.reset()
  inMemoryMemory.length = 0
  console.log(`${c.dim}Cache cleared. Next build() will recompute all static sections.${c.reset}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
