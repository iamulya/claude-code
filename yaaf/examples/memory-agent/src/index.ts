/**
 * Memory Agent Example
 *
 * Demonstrates:
 *   - MemoryStore: file-based persistent memory with 4 types:
 *     user, feedback, project, reference
 *   - MemoryStore.save(), scan(), read()
 *   - MemoryRelevanceEngine: LLM-powered relevance scoring
 *   - RelevanceQueryFn: providing your own LLM adapter to the engine
 *   - Injecting memories into a system prompt for long-term recall
 *   - Memory persisting across Agent instances (simulated restart)
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/index.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/index.ts
 */

import { tmpdir } from 'os'
import { join } from 'path'
import { mkdtemp } from 'fs/promises'
import {
  Agent,
  MemoryStore,
  MemoryRelevanceEngine,
  resolveModel,
  type MemoryType,
} from 'yaaf'

// ─── helper ──────────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`)
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  // Use a temp dir so the demo is self-contained
  const memDir = await mkdtemp(join(tmpdir(), 'yaaf-memory-'))
  console.log(`Memory stored at: ${memDir}`)

  // ── 1. Initialize and seed the MemoryStore ───────────────────────────────
  banner(`1. Seeding Memory Store
  MemoryType values: "user" | "feedback" | "project" | "reference"`)

  // MemoryStoreConfig uses privateDir (not baseDir)
  const store = new MemoryStore({ privateDir: memDir })
  await store.initialize()

  const entries: { name: string; type: MemoryType; description: string; content: string }[] = [
    {
      name: 'user-language-preference',
      type: 'user',
      description: 'Preferred programming language of the user',
      content: 'The user strongly prefers TypeScript over JavaScript.',
    },
    {
      name: 'project-forge-cli',
      type: 'project',
      description: 'Most recent project the user is working on',
      content: 'User is building a CLI tool called "forge" — a code scaffolding utility.',
    },
    {
      name: 'deploy-process',
      type: 'reference',
      description: 'How to deploy the project to production',
      content: 'Deploy by running: npm run build && npm run deploy:prod',
    },
    {
      name: 'user-runtime-preference',
      type: 'user',
      description: 'Preferred JavaScript runtime',
      content: 'The user uses bun instead of node for running scripts.',
    },
    {
      name: 'feedback-code-review',
      type: 'feedback',
      description: 'Feedback from last code review session',
      content: 'Reviewer noted: improve error handling in the CLI parser, add retry logic.',
    },
  ]

  for (const entry of entries) {
    await store.save(entry)
  }

  // Scan memories using scan() which returns MemoryHeader[]
  const headers = await store.scan()
  console.log(`\nStored ${headers.length} memories:`)
  headers.forEach(h => console.log(`  [${h.type}] ${h.name}`))

  // ── 2. Read a specific memory by filename ─────────────────────────────────
  banner('2. Reading a Specific Memory (store.read)')

  // scan() returns MemoryHeader with .filename for reading
  const deployHeader = headers.find(h => h.name === 'deploy-process')
  if (deployHeader) {
    const entry = await store.read(deployHeader.filename)
    if (entry) {
      console.log(`\nFetched: "${entry.name}"`)
      console.log(`Content: ${entry.content}`)
    }
  }

  // ── 3. MemoryRelevanceEngine with custom LLM adapter ─────────────────────
  banner('3. Relevance Engine with Custom LLM Adapter (RelevanceQueryFn)')

  // Resolve the model from env vars to use as a custom LLM adapter
  const model = resolveModel({})

  // RelevanceQueryFn: (params: { system, userMessage, maxTokens, signal? }) => Promise<string>
  const relevanceEngine = new MemoryRelevanceEngine(async ({ system, userMessage, maxTokens }) => {
    // Use the raw model's complete() method directly (low-level ChatModel interface)
    const result = await model.complete({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      tools: [],
      maxTokens,
    })
    return result.content ?? ''
  })

  const allHeaders = await store.scan()
  const query = 'How should I run and deploy my TypeScript project?'

  console.log(`\nFinding memories relevant to: "${query}"`)
  const relevant = await relevanceEngine.findRelevant(query, allHeaders)

  console.log(`\nRelevant memories (${relevant.length} found):`)
  // RelevantMemory has: { path, mtimeMs, filename }
  relevant.forEach((r, i) => {
    const h = allHeaders.find(h => h.filename === r.filename)
    console.log(`  ${i + 1}. ${r.filename}${h ? ` — ${h.description}` : ''}`)
  })

  // ── 4. Agent with memory-injected system prompt ──────────────────────────
  banner('4. Agent with Memory Context Injected into System Prompt')

  // Read content for the relevant memories
  const memoryContext = await Promise.all(
    relevant.map(async r => {
      const entry = await store.read(r.filename)
      return entry ? `[${entry.type}] ${entry.name}: ${entry.content}` : null
    })
  )
  const filteredContext = memoryContext.filter(Boolean).join('\n')

  const agent = new Agent({
    name: 'MemoryAssistant',
    systemPrompt: `You are a helpful assistant with access to user memory.

## Relevant Memories
${filteredContext}

Use these memories to give accurate, personalised answers.`,
  })

  agent.on('llm:request', () => process.stdout.write('\n  [LLM thinking] '))

  const question = 'How should I run and deploy my TypeScript project?'
  console.log(`\nQuestion: "${question}"\n`)
  const answer = await agent.run(question)
  console.log(answer)

  // ── 5. Memory durability: survives process restart ────────────────────────
  banner('5. Memory Survives Process Restart (MemoryStore persistence)')

  const reloadedStore = new MemoryStore({ privateDir: memDir })
  await reloadedStore.initialize()
  const reloaded = await reloadedStore.scan()
  console.log(`\nLoaded ${reloaded.length}/${headers.length} memories after restart.`)
  console.log(reloaded.length === headers.length ? '✅ Memory is fully durable!' : '⚠ Count mismatch')
}

main().catch(console.error)
