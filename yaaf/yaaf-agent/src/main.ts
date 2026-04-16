#!/usr/bin/env node
/**
 * YAAF Expert Agent — Server Entrypoint
 *
 * Runs as an HTTP/SSE server with the YAAF Dev UI enabled.
 * Knowledge is served from the pre-compiled KB (knowledge/compiled/).
 * No doc-slurping at startup — the agent retrieves knowledge on demand
 * via KB tools (search_kb, read_kb, list_kb_index).
 *
 * Usage:
 *   npm start                  → server on PORT (default 3001)
 *   PORT=4000 npm start        → custom port
 *   npm start -- --dev         → also mount live source tools (contributors only)
 *
 * End users:
 *   npx yaaf-agent             → same as npm start
 */

import { createRequire } from 'module'
import * as path from 'path'

import { Agent, KBStore, createKBTools } from 'yaaf'
import { createServer }             from 'yaaf/server'

// ── KB path resolution ────────────────────────────────────────────────────────

/**
 * Resolve the compiled KB directory.
 *
 * - End users (npm install yaaf-agent):
 *     node_modules/yaaf-agent/knowledge/compiled/
 * - Dev (running from the monorepo):
 *     yaaf-agent/knowledge/compiled/
 */
function resolveKBDir(): string {
  try {
    // Production: resolve from the installed package
    const req = createRequire(import.meta.url)
    const pkgPath = req.resolve('yaaf-agent/package.json')
    return path.join(path.dirname(pkgPath), 'knowledge')
  } catch {
    // Dev fallback: relative to this source file
    return path.resolve(import.meta.dirname, '..', 'knowledge')
  }
}

// ── System prompt (slim — knowledge lives in the KB, not here) ────────────────

const SYSTEM_PROMPT = `\
You are the YAAF Expert Agent — an AI assistant with deep knowledge of YAAF (Yet Another Agent Framework), a TypeScript-first, provider-agnostic, production-grade agent framework.

## How to answer questions

You have access to a pre-compiled knowledge base containing 900+ articles covering every API, subsystem, concept, and guide in YAAF. Always use the KB tools to retrieve accurate, up-to-date information before answering.

### KB tools available
- **search_kb**: Full-text search across all articles — use this first for any question
- **list_kb_index**: Browse articles by entity type (api, concept, subsystem, guide, plugin)
- **read_kb**: Fetch the full content of a specific article by docId

### Answering strategy
1. Search the KB for the most relevant articles using \`search_kb\`
2. Read the full article(s) with \`read_kb\` when you need complete details
3. Synthesise a precise, helpful answer with working code examples
4. Cross-reference related articles when the question spans multiple subsystems

## Response style
- Be concise and direct — developers are reading this in a chat UI
- Include working TypeScript code examples where relevant
- Use markdown formatting: code blocks, headers (h1–h4), bullet lists
- When referencing an API, always include the import path
- If you're not sure about something, say so clearly
- **Never** include a "Related KB Articles", "Related:", or "See also:" section — users cannot navigate to internal KB docIds
- **Never** expose raw KB docIds (e.g. \`subsystems/foo\`, \`apis/bar\`) in your response — they are internal references meaningless to the user

## What you know about YAAF
YAAF is a production-grade TypeScript agent framework. Key capabilities:
- Multi-LLM provider support (Gemini, OpenAI, Anthropic, Ollama, etc.)
- Plugin system with typed adapter interfaces (memory, session, browser, observability)
- Built-in context management and compaction strategies
- Permission policies, IAM, and security hooks
- Runtimes: HTTP/SSE server, CLI, Web Worker, Gateway
- Multi-agent orchestration, Vigil (autonomous mode), A2A integration
- Knowledge Base subsystem (KBCompiler, KBStore, KBFederation)
`

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const port   = parseInt(process.env.PORT ?? '3001', 10)
  const isDev  = process.argv.includes('--dev')
  const kbDir  = resolveKBDir()

  console.log('')
  console.log('🤖 YAAF Expert Agent')
  console.log(`   KB:   ${kbDir}`)
  console.log(`   Port: ${port}`)
  if (isDev) console.log('   Mode: dev (live source tools enabled)')
  console.log('')

  // ── Load the pre-compiled knowledge base ──────────────────────────────────

  console.log('Loading knowledge base...')
  const store = new KBStore(kbDir)
  await store.load()
  const docCount = store.getAllDocuments().length
  console.log(`✓ Knowledge base loaded (${docCount} articles)`)
  console.log('')

  // ── Build tool set ────────────────────────────────────────────────────────

  const kbTools = createKBTools(store, {
    maxDocumentChars: 20_000,   // generous — modern context windows can handle it
    maxSearchResults: 8,
    maxExcerptChars: 1_200,
  })

  // Dev-mode: add live source tools for framework contributors
  const devTools = isDev ? (await import('./tools.js')).codeIntelligenceTools : []

  // ── Create agent ──────────────────────────────────────────────────────────

  const agent = new Agent({
    name: 'YAAF Expert',
    systemPrompt: SYSTEM_PROMPT,
    tools: [...kbTools, ...devTools],
    // contextManager:'auto' reads context window + output token limits from the
    // model spec registry — prevents requesting more tokens than the model allows.
    contextManager: 'auto',
    // Model selection (unified env var strategy — pick one):
    //
    //   LLM_BASE_URL + LLM_MODEL  → any OpenAI-compatible endpoint
    //     e.g. LLM_BASE_URL=http://localhost:11434/v1  LLM_MODEL=qwen2.5:72b
    //
    //   GEMINI_API_KEY   → Google Gemini   (LLM_MODEL overrides default)
    //   ANTHROPIC_API_KEY → Anthropic Claude (LLM_MODEL overrides default)
    //   OPENAI_API_KEY   → OpenAI           (LLM_MODEL overrides default)
    //
    //   YAAF_AGENT_MODEL is also accepted as an alias for LLM_MODEL.
    ...(process.env.YAAF_AGENT_MODEL ? { model: process.env.YAAF_AGENT_MODEL } : {}),
    maxIterations: 15,
  })

  // ── Start HTTP server with Dev UI ─────────────────────────────────────────

  createServer(agent, {
    port,
    name: 'YAAF Expert Agent',
    devUi: true,
    cors: true,
    onStart: (port) => {
      console.log(`✓ Dev UI ready at http://localhost:${port}`)
      console.log('')
      console.log('  Open the URL above in your browser to start chatting.')
      console.log('  Press Ctrl+C to stop.')
      console.log('')
    },
  })
}

main().catch(err => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
