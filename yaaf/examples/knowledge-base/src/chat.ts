/**
 * Knowledge Base Agent
 *
 * An agent that answers questions using a compiled YAAF knowledge base.
 * Uses the new KnowledgeBase runtime API for clean tool integration.
 *
 * How it works:
 *   1. KnowledgeBase.load() reads all compiled articles at startup
 *   2. kb.tools() provides list_kb_index, fetch_kb_document, search_kb
 *   3. kb.systemPromptSection() tells the agent what articles it has access to
 *   4. The agent browses, searches, and reads articles on demand
 *
 * Usage:
 *   GEMINI_API_KEY=...    npx tsx src/chat.ts
 *   GEMINI_API_KEY=...    npx tsx src/chat.ts --demo
 *
 * Compile the KB first:
 *   npx tsx src/compile.ts
 */

import * as readline from 'readline'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { Agent } from 'yaaf'
import { KnowledgeBase } from 'yaaf/knowledge'

import { c, log, logHeader, logOk, groupBy } from './utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KB_DIR    = join(__dirname, '..', 'kb')

// ── Local log helpers (chat-specific) ─────────────────────────────────────────

const logAgent = (msg: string): void => { log(`\n${c.green}🤖 Agent:${c.reset} ${msg}`) }
const logUser  = (msg: string): void => { log(`\n${c.blue}👤 You:${c.reset} ${msg}`) }
const logTool  = (name: string, detail: string): void => {
  log(`  ${c.yellow}⚡ ${name}${c.reset} ${c.dim}${detail}${c.reset}`)
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(kb: KnowledgeBase): string {
  return `You are a knowledgeable AI assistant with access to a curated knowledge base on Machine Learning and AI Research.

## Your Capabilities

${kb.systemPromptSection()}

When answering questions:

1. **Use KB tools to access your knowledge** — call list_kb_index to discover articles, search_kb to find specific topics, and fetch_kb_document to read full articles
2. **Be specific** — cite specific details, numbers, and formulas from the articles
3. **Cross-reference** — connect related concepts using the wikilinks you know about
4. **Admit gaps** — if the KB doesn't cover a topic, say so and offer what general knowledge you have

## Style

- Concise but thorough — lead with the key answer, then add depth
- Use markdown formatting (headers, lists, code blocks) for complex topics
- For technical concepts, include formulas or pseudocode when helpful
- For comparison questions, use tables`
}

// ── Provider label ────────────────────────────────────────────────────────────

function providerLabel(): string {
  if (process.env['GEMINI_API_KEY'])    return `Gemini / ${process.env['GEMINI_SYNTHESIS_MODEL'] ?? 'gemini-2.5-pro'}`
  if (process.env['ANTHROPIC_API_KEY']) return `Anthropic / claude-sonnet-4-5`
  return `OpenAI / ${process.env['OPENAI_SYNTHESIS_MODEL'] ?? 'gpt-4o'}`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isDemo = process.argv.includes('--demo')

  logHeader('📚 Knowledge Base Agent')
  process.stdout.write(`${c.dim}Loading compiled knowledge base...${c.reset}`)

  // ── Load KB using the new runtime API ───────────────────────────────────────

  let kb: KnowledgeBase
  try {
    kb = await KnowledgeBase.load(KB_DIR)
    process.stdout.write(`\r${c.green}✓${c.reset} KB loaded: ${kb.size} articles`)

    if (kb.size === 0) {
      log(`\n\n${c.yellow}⚠ No compiled articles found.${c.reset}`)
      log(`  Run ${c.cyan}npm run compile${c.reset} first to build the knowledge base.`)
      log(`  The agent will still work but won't have KB knowledge.\n`)
    } else {
      const allDocs = kb.getAllDocuments()
      const stubs    = allDocs.filter(a =>  a.isStub)
      const nonStubs = allDocs.filter(a => !a.isStub)
      const index = kb.index()
      log(` (${nonStubs.length} full, ${stubs.length} stubs, ~${index.totalTokenEstimate.toLocaleString()} tokens)`)

      for (const [type, articles] of groupBy(allDocs, a => a.entityType)) {
        log(`  ${c.dim}${type}s: ${articles.length}${c.reset}`)
      }
    }
  } catch (err) {
    log(`\n${c.yellow}⚠ Could not load KB: ${(err as Error).message}${c.reset}`)
    // Create an empty KB — agent will still work without knowledge
    kb = await KnowledgeBase.load({ kbDir: KB_DIR })
  }

  // ── Create agent with KB tools ──────────────────────────────────────────────

  let agent: Agent
  try {
    agent = new Agent({
      name: 'KBAgent',
      systemPrompt:  buildSystemPrompt(kb),
      tools:         kb.tools(),     // ← list_kb_index, fetch_kb_document, search_kb
      maxIterations: 10,
      temperature:   0.2,
    })
  } catch (err) {
    log(`\n${c.bold}Knowledge Base Agent${c.reset}`)
    log((err instanceof Error ? err.message : String(err)))
    log(`\n${c.dim}Set one of: GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY${c.reset}`)
    process.exit(1)
  }

  // Wire events
  agent
    .on('tool:call', ({ name, arguments: args }) => {
      const detail = Object.entries(args as Record<string, unknown>)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(', ')
      logTool(name, detail)
    })
    .on('tool:result', ({ name, durationMs }) =>
      log(`  ${c.dim}  ✓ ${name} (${durationMs}ms)${c.reset}`))

  log(`${c.dim}Provider: ${providerLabel()}${c.reset}`)
  log(`${c.dim}Tools: list_kb_index, fetch_kb_document, search_kb${c.reset}`)

  if (isDemo) await runDemo(agent)
  else        await runRepl(agent, kb)
}

// ── Demo mode ─────────────────────────────────────────────────────────────────

async function runDemo(agent: Agent): Promise<void> {
  const questions = [
    'What is the attention mechanism and how does it work mathematically?',
    'How does RLHF make LLMs more helpful? What are the three phases?',
    'What is the difference between RAG and a compiled knowledge base?',
    'How do I implement multi-head attention in PyTorch?',
    'What papers or tools do you know about in the ML space?',
  ]

  log(`\n${c.dim}Running demo conversation...${c.reset}\n`)

  for (const question of questions) {
    logUser(question)
    try {
      logAgent(await agent.run(question))
    } catch (err) {
      log(`${c.magenta}Error: ${err instanceof Error ? err.message : String(err)}${c.reset}`)
      break
    }
    log(`\n${c.dim}${'─'.repeat(70)}${c.reset}`)
  }

  log(`\n${c.dim}Demo complete.${c.reset}`)
}

// ── Interactive REPL ──────────────────────────────────────────────────────────

async function runRepl(agent: Agent, kb: KnowledgeBase): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  log('')
  log(`${c.dim}Ask me anything about the knowledge base topics.${c.reset}`)
  log(`${c.dim}Commands: /list  /reset  /topics  /exit${c.reset}`)
  log('')

  const prompt = (): void => {
    rl.question(`${c.blue}You: ${c.reset}`, async (input: string) => {
      const trimmed = input.trim()
      if (!trimmed) { prompt(); return }

      switch (trimmed) {
        case '/exit':
        case '/quit':
          log(`\n${c.dim}Goodbye! 📚${c.reset}`)
          rl.close()
          return

        case '/reset':
          agent.reset()
          log(`${c.dim}Conversation reset.${c.reset}\n`)
          prompt()
          return

        case '/list': {
          const allDocs = kb.getAllDocuments()
          log('')
          logOk(`Articles in KB (${allDocs.length} total):`)
          for (const [type, articles] of groupBy(allDocs, a => a.entityType)) {
            log(`\n  ${c.yellow}${type}s:${c.reset}`)
            for (const a of articles) {
              const stubMark = a.isStub ? ` ${c.dim}(stub)${c.reset}` : ''
              log(`    • ${a.title}${stubMark} ${c.dim}${a.wordCount}w${c.reset}`)
            }
          }
          log('')
          prompt()
          return
        }

        case '/topics': {
          const topics = kb.getAllDocuments().filter(a => !a.isStub).map(a => a.title).join(', ')
          log(`\n${c.dim}Topics I know about: ${topics}${c.reset}\n`)
          prompt()
          return
        }

        default:
          try {
            logAgent(await agent.run(trimmed))
          } catch (err) {
            log(`${c.magenta}Error: ${err instanceof Error ? err.message : String(err)}${c.reset}`)
          }
          log('')
          prompt()
      }
    })
  }

  prompt()
}

// ── Entry ─────────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
