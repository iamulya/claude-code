/**
 * Knowledge Base Agent
 *
 * An agent that answers questions using a compiled YAAF knowledge base.
 * The compiled wiki articles are injected directly into its system prompt —
 * no RAG, no vector search.
 *
 * How it works:
 *   1. At startup, all compiled articles from kb/compiled/ are loaded
 *   2. Articles are formatted as a readable wiki and injected into the system prompt
 *   3. The agent answers questions using this context + its own LLM knowledge
 *   4. The `search_kb` tool lets it find specific articles by title or topic
 *   5. The `list_kb` tool shows what articles are available
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

import { Agent, buildTool } from 'yaaf'
import { loadCompiledKB, buildKBContext, buildKBIndex } from './kb-reader.js'
import type { KBArticle, KBLoadResult } from './kb-reader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KB_DIR = join(__dirname, '..', 'kb')
const COMPILED_DIR = join(KB_DIR, 'compiled')

// ── ANSI color helpers ─────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  magenta: '\x1b[35m', blue: '\x1b[34m',
}

const log = (msg: string) => console.log(msg)
const logHeader = (msg: string) => log(`\n${c.bold}${c.cyan}${msg}${c.reset}`)
const logAgent = (msg: string) => log(`\n${c.green}🤖 Agent:${c.reset} ${msg}`)
const logUser = (msg: string) => log(`\n${c.blue}👤 You:${c.reset} ${msg}`)
const logTool = (name: string, detail: string) =>
  log(`  ${c.yellow}⚡ ${name}${c.reset} ${c.dim}${detail}${c.reset}`)

// ── KB tools ──────────────────────────────────────────────────────────────────

function createKBTools(kb: KBLoadResult) {
  /**
   * Search KB articles by topic or title keyword.
   * Returns matching article content for closer inspection.
   */
  const searchKB = buildTool({
    name: 'search_kb',
    describe: ({ query }: { query?: string }) =>
      `Search KB for "${query ?? '...'}"`,
    maxResultChars: 8000,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search term — a concept name, paper title, or topic keyword',
        },
        entityType: {
          type: 'string',
          enum: ['concept', 'research_paper', 'tool', 'any'],
          description: 'Filter by entity type (default: any)',
        },
      },
      required: ['query'],
    },
    isReadOnly: () => true,
    async call({ query, entityType = 'any' }: { query: string; entityType?: string }): Promise<{ data: unknown }> {
      const q = query.toLowerCase()
      const matches = kb.articles.filter(article => {
        const typeOk = entityType === 'any' || article.entityType === entityType
        const titleMatch = article.title.toLowerCase().includes(q)
        const bodyMatch = article.body.toLowerCase().includes(q)
        return typeOk && (titleMatch || bodyMatch)
      })

      if (matches.length === 0) {
        return {
          data: {
            found: 0,
            message: `No KB articles match "${query}". The KB may not cover this topic.`,
          },
        }
      }

      return {
        data: {
          found: matches.length,
          articles: matches.slice(0, 3).map(a => ({
            title: a.title,
            entityType: a.entityType,
            docId: a.docId,
            stub: a.isStub,
            excerpt: a.body.substring(0, 800) + (a.body.length > 800 ? '…' : ''),
          })),
        },
      }
    },
  })

  /**
   * List all KB articles with their titles and types.
   */
  const listKB = buildTool({
    name: 'list_kb',
    describe: () => 'List all KB articles',
    maxResultChars: 4000,
    inputSchema: {
      type: 'object' as const,
      properties: {
        entityType: {
          type: 'string',
          enum: ['concept', 'research_paper', 'tool', 'all'],
          description: 'Filter by entity type (default: all)',
        },
      },
      required: [],
    },
    isReadOnly: () => true,
    async call({ entityType = 'all' }: { entityType?: string }) {
      const filtered = entityType === 'all'
        ? kb.articles
        : kb.articles.filter(a => a.entityType === entityType)

      const byType = new Map<string, KBArticle[]>()
      for (const a of filtered) {
        const group = byType.get(a.entityType) ?? []
        group.push(a)
        byType.set(a.entityType, group)
      }

      const result: Record<string, Array<{ title: string; docId: string; stub: boolean; wordCount: number }>> = {}
      for (const [type, articles] of byType) {
        result[type] = articles.map(a => ({
          title: a.title,
          docId: a.docId,
          stub: a.isStub,
          wordCount: a.wordCount,
        }))
      }

      return {
        data: {
          totalArticles: filtered.length,
          byType: result,
        },
      }
    },
  })

  /**
   * Get the full content of a specific article by docId.
   */
  const getArticle = buildTool({
    name: 'get_article',
    describe: ({ docId }: { docId?: string }) =>
      `Get article: ${docId ?? '...'}`,
    maxResultChars: 16000,
    inputSchema: {
      type: 'object' as const,
      properties: {
        docId: {
          type: 'string',
          description: 'The article docId (e.g. "concepts/transformer", "tools/pytorch")',
        },
      },
      required: ['docId'],
    },
    isReadOnly: () => true,
    async call({ docId }: { docId: string }): Promise<{ data: unknown }> {
      const article = kb.articles.find(a => a.docId === docId)
      if (!article) {
        const suggestions = kb.articles
          .filter(a => a.docId.includes(docId.split('/').pop() ?? ''))
          .map(a => a.docId)
          .slice(0, 3)

        return {
          data: {
            found: false,
            message: `No article with docId "${docId}".`,
            suggestions: suggestions.length > 0 ? suggestions : undefined,
          },
        }
      }

      return {
        data: {
          found: true,
          title: article.title,
          entityType: article.entityType,
          stub: article.isStub,
          wordCount: article.wordCount,
          content: article.body,
        },
      }
    },
  })

  return [searchKB, listKB, getArticle]
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(kb: KBLoadResult): string {
  const kbContext = buildKBContext(kb)
  const kbIndex = buildKBIndex(kb)

  return `You are a knowledgeable AI assistant with access to a curated knowledge base on Machine Learning and AI Research.

## Your Knowledge

${kbIndex}

You have deep expertise in all topics covered by the knowledge base. When answering questions:

1. **Use the KB articles as your primary reference** — they are comprehensive, accurate, and cross-linked
2. **Be specific** — cite specific details, numbers, and formulas from the articles
3. **Cross-reference** — connect related concepts using the wikilinks you know about (e.g., [[Transformer]] uses [[Attention Mechanism]])  
4. **Use tools when needed** — \`search_kb\` to find articles, \`get_article\` for full content, \`list_kb\` for discovery
5. **Admit gaps** — if the KB doesn't cover a topic, say so and offer what general knowledge you have

## Style

- Concise but thorough — lead with the key answer, then add depth
- Use markdown formatting (headers, lists, code blocks) for complex topics
- For technical concepts, include formulas or pseudocode when helpful
- For comparison questions, use tables

${kbContext}`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const isDemo = process.argv.includes('--demo')

  // Load compiled KB
  logHeader('📚 Knowledge Base Agent')
  process.stdout.write(`${c.dim}Loading compiled knowledge base...${c.reset}`)

  let kb: KBLoadResult
  try {
    kb = await loadCompiledKB(COMPILED_DIR)
    process.stdout.write(`\r${c.green}✓${c.reset} KB loaded: ${kb.articles.length} articles`)

    if (kb.articles.length === 0) {
      console.log(`\n\n${c.yellow}⚠ No compiled articles found.${c.reset}`)
      console.log(`  Run ${c.cyan}npm run compile${c.reset} first to build the knowledge base.`)
      console.log(`  The agent will still work but won't have KB knowledge.\n`)
    } else {
      const nonStubs = kb.articles.filter(a => !a.isStub)
      const stubs = kb.articles.filter(a => a.isStub)
      console.log(` (${nonStubs.length} full, ${stubs.length} stubs, ~${kb.totalTokensEstimate.toLocaleString()} tokens)`)

      // Show what's in the KB
      const byType = new Map<string, number>()
      for (const a of kb.articles) {
        byType.set(a.entityType, (byType.get(a.entityType) ?? 0) + 1)
      }
      for (const [type, count] of byType) {
        console.log(`  ${c.dim}${type}s: ${count}${c.reset}`)
      }
    }
  } catch (err) {
    console.log(`\n${c.yellow}⚠ Could not load KB: ${(err as Error).message}${c.reset}`)
    kb = { articles: [], totalWords: 0, totalTokensEstimate: 0 }
  }

  // Create agent
  const systemPrompt = buildSystemPrompt(kb)
  const tools = createKBTools(kb)

  let agent: Agent
  try {
    agent = new Agent({
      name: 'KBAgent',
      systemPrompt,
      tools,
      maxIterations: 10,
      temperature: 0.2,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`\n${c.bold}Knowledge Base Agent${c.reset}`)
    console.error(msg)
    console.error(`\n${c.dim}Set one of: GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY${c.reset}`)
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

  const providerLabel = process.env['GEMINI_API_KEY']
    ? `Gemini / ${process.env['GEMINI_MODEL'] ?? 'gemini-2.0-flash'}`
    : process.env['ANTHROPIC_API_KEY']
    ? 'Anthropic / claude'
    : `OpenAI / ${process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini'}`

  log(`${c.dim}Provider: ${providerLabel}${c.reset}`)
  log(`${c.dim}Tools: search_kb, list_kb, get_article${c.reset}`)

  if (isDemo) await runDemo(agent)
  else await runRepl(agent, kb)
}

// ── Demo mode ─────────────────────────────────────────────────────────────────

async function runDemo(agent: Agent) {
  const demoQuestions = [
    'What is the attention mechanism and how does it work mathematically?',
    'How does RLHF make LLMs more helpful? What are the three phases?',
    'What is the difference between RAG and a compiled knowledge base?',
    'How do I implement multi-head attention in PyTorch?',
    'What papers or tools do you know about in the ML space?',
  ]

  log(`\n${c.dim}Running demo conversation...${c.reset}\n`)

  for (const question of demoQuestions) {
    logUser(question)
    try {
      const response = await agent.run(question)
      logAgent(response)
    } catch (err) {
      log(`${c.magenta}Error: ${err instanceof Error ? err.message : String(err)}${c.reset}`)
      break
    }
    log(`\n${c.dim}${'─'.repeat(70)}${c.reset}`)
  }

  log(`\n${c.dim}Demo complete.${c.reset}`)
}

// ── Interactive REPL ──────────────────────────────────────────────────────────

async function runRepl(agent: Agent, kb: KBLoadResult) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  log('')
  log(`${c.dim}Ask me anything about the knowledge base topics.${c.reset}`)
  log(`${c.dim}Commands: /list  /reset  /topics  /exit${c.reset}`)
  log('')

  const prompt = () => {
    rl.question(`${c.blue}You: ${c.reset}`, async (input: string) => {
      const trimmed = input.trim()
      if (!trimmed) { prompt(); return }

      if (trimmed === '/exit' || trimmed === '/quit') {
        log(`\n${c.dim}Goodbye! 📚${c.reset}`)
        rl.close()
        return
      }

      if (trimmed === '/reset') {
        agent.reset()
        log(`${c.dim}Conversation reset.${c.reset}\n`)
        prompt()
        return
      }

      if (trimmed === '/list') {
        log('')
        log(`${c.bold}${c.cyan}Articles in KB (${kb.articles.length} total):${c.reset}`)
        const byType = new Map<string, KBArticle[]>()
        for (const a of kb.articles) {
          const group = byType.get(a.entityType) ?? []
          group.push(a)
          byType.set(a.entityType, group)
        }
        for (const [type, articles] of byType) {
          log(`\n  ${c.yellow}${type}s:${c.reset}`)
          for (const a of articles) {
            const stub = a.isStub ? ` ${c.dim}(stub)${c.reset}` : ''
            const words = `${c.dim}${a.wordCount}w${c.reset}`
            log(`    • ${a.title}${stub} ${words}`)
          }
        }
        log('')
        prompt()
        return
      }

      if (trimmed === '/topics') {
        const topics = kb.articles
          .filter(a => !a.isStub)
          .map(a => a.title)
          .join(', ')
        log(`\n${c.dim}Topics I know about: ${topics}${c.reset}\n`)
        prompt()
        return
      }

      try {
        const response = await agent.run(trimmed)
        logAgent(response)
      } catch (err) {
        log(`${c.magenta}Error: ${err instanceof Error ? err.message : String(err)}${c.reset}`)
      }

      log('')
      prompt()
    })
  }

  prompt()
}

// ── Entry ─────────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
