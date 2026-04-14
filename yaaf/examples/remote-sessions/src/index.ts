/**
 * Remote Sessions Example — WebSocket Agent Server
 *
 * Demonstrates YAAF's Remote Session server which provides:
 *   - HTTP REST endpoint (POST /chat) for simple request/response
 *   - WebSocket endpoint (WS /ws) for persistent, bidirectional sessions
 *   - Session persistence across requests (via session ID)
 *   - Session management (list, destroy, max sessions)
 *   - Health and info endpoints
 *
 * This example runs a complete demo in a single process:
 *   1. Starts a YAAF agent as a remote session server
 *   2. Sends HTTP chat requests (REST)
 *   3. Connects via WebSocket for real-time messaging
 *   4. Demonstrates session persistence and management
 *
 * For separate server/client usage, see:
 *   npx tsx src/server.ts   (start the server)
 *   npx tsx src/client.ts   (connect as a client)
 *
 * Run:
 *   GEMINI_API_KEY=...    npx tsx src/index.ts
 *   OPENAI_API_KEY=sk-... npx tsx src/index.ts
 */

import { Agent, buildTool } from 'yaaf'
import { RemoteSessionServer } from 'yaaf/remote'

// ── Helpers ──────────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log(`\n${'═'.repeat(62)}\n  ${title}\n${'═'.repeat(62)}`)
}

function section(title: string) {
  console.log(`\n${'─'.repeat(50)}\n  ${title}\n${'─'.repeat(50)}`)
}

// ── Knowledge Base Tool ──────────────────────────────────────────────────────

const knowledgeBase: Record<string, string> = {
  'yaaf': 'YAAF (Yet Another Agent Framework) is a TypeScript multi-agent framework with support for tool calling, streaming, session persistence, and multi-agent orchestration.',
  'a2a': 'A2A (Agent-to-Agent) is a JSON-RPC 2.0 based protocol for cross-framework agent communication. It uses Agent Cards for discovery and Tasks for interaction.',
  'mcp': 'MCP (Model Context Protocol) is a protocol for connecting LLMs to external tool servers. YAAF supports MCP via its plugin system with stdio and SSE transports.',
  'remote sessions': 'Remote Sessions provide WebSocket-based persistent connections for distributed agent serving. They support session management, multi-client, and HTTP fallback.',
  'tools': 'YAAF tools are JSON Schema-defined functions that agents can call. They support input validation, result truncation, concurrency safety, and read-only modes.',
}

const lookupTool = buildTool({
  name: 'lookup_knowledge',
  maxResultChars: 5000,
  inputSchema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'Topic to look up (e.g., "yaaf", "a2a", "mcp")' },
    },
    required: ['topic'],
  },
  describe: (input) => `Look up: ${(input as any).topic}`,
  async call(input: Record<string, unknown>): Promise<any> {
    const topic = (input.topic as string).toLowerCase()
    const entry = knowledgeBase[topic]
    if (entry) return { data: { topic, info: entry } }
    return {
      data: {
        error: `Topic "${input.topic}" not found.`,
        available: Object.keys(knowledgeBase),
      },
    }
  },
})

// ── Create the Agent ─────────────────────────────────────────────────────────

const agent = new Agent({
  name: 'KnowledgeAssistant',
  systemPrompt: `You are a knowledge assistant with access to a topic database.
Use the lookup_knowledge tool to find information about topics users ask about.
Be concise and helpful. If a topic isn't available, suggest available topics.`,
  tools: [lookupTool],
})

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  banner('Remote Sessions: WebSocket Agent Server')

  // ── 1. Start the remote session server ────────────────────────────────────
  section('Step 1: Start Remote Session Server')

  const server = new RemoteSessionServer(agent, {
    port: 0, // OS picks a free port
    name: 'yaaf-knowledge-agent',
    maxSessions: 10,
    sessionTimeoutMs: 5 * 60_000, // 5 min for demo
    onSessionCreated: (id) => console.log(`    📌 Session created: ${id.slice(0, 8)}...`),
    onSessionDestroyed: (id, reason) => console.log(`    🗑️  Session destroyed: ${id.slice(0, 8)}... (${reason})`),
  })

  const handle = await server.start()
  console.log(`\n  ✅ Server running at ${handle.url}`)
  console.log(`  WebSocket: ${handle.wsUrl}`)
  console.log(`  Max sessions: 10`)

  // ── 2. Health & info endpoints ────────────────────────────────────────────
  section('Step 2: Health & Info Endpoints')

  const healthRes = await fetch(`${handle.url}/health`)
  const health = await healthRes.json() as any
  console.log(`\n  GET /health → ${JSON.stringify(health)}`)

  const infoRes = await fetch(`${handle.url}/info`)
  const info = await infoRes.json() as any
  console.log(`\n  GET /info:`)
  console.log(`    Name:      ${info.name}`)
  console.log(`    Transport: ${info.transport.join(', ')}`)
  console.log(`    Endpoints:`)
  for (const [key, val] of Object.entries(info.endpoints)) {
    console.log(`      ${key}: ${val}`)
  }

  // ── 3. HTTP chat — simple request/response ────────────────────────────────
  section('Step 3: HTTP Chat (REST API)')

  console.log('\n  User: "What is YAAF?"')
  const chatRes = await fetch(`${handle.url}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'What is YAAF?' }),
  })
  const chatData = await chatRes.json() as { sessionId: string; response: string }

  console.log(`  Session ID: ${chatData.sessionId.slice(0, 8)}...`)
  console.log(`\n  🤖 Agent: ${chatData.response}`)

  // ── 4. Session persistence — same session, follow-up question ─────────────
  section('Step 4: Session Persistence (Follow-Up in Same Session)')

  console.log(`\n  Reusing session ${chatData.sessionId.slice(0, 8)}...`)
  console.log('  User: "What about A2A?"')

  const followUpRes = await fetch(`${handle.url}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'What about A2A?',
      sessionId: chatData.sessionId, // Reuse the session
    }),
  })
  const followUp = await followUpRes.json() as { sessionId: string; response: string }

  console.log(`  Session ID: ${followUp.sessionId.slice(0, 8)}... (same!)`)
  console.log(`\n  🤖 Agent: ${followUp.response}`)

  // ── 5. Session management ─────────────────────────────────────────────────
  section('Step 5: Session Management')

  // List sessions
  const sessionsRes = await fetch(`${handle.url}/sessions`)
  const sessionsData = await sessionsRes.json() as { sessions: any[] }
  console.log(`\n  Active sessions: ${sessionsData.sessions.length}`)
  for (const s of sessionsData.sessions) {
    console.log(`    • ${s.id.slice(0, 8)}... — ${s.messageCount} messages, ${s.connections} WS connections`)
  }

  // Create a second session
  console.log('\n  Creating a second session...')
  const session2Res = await fetch(`${handle.url}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Tell me about MCP' }),
  })
  const session2 = await session2Res.json() as { sessionId: string; response: string }
  console.log(`  Session 2 created: ${session2.sessionId.slice(0, 8)}...`)
  console.log(`  Active sessions: ${handle.sessionCount()}`)
  console.log(`  Session IDs: ${handle.sessions().map(id => id.slice(0, 8) + '...').join(', ')}`)

  // Destroy a session
  console.log(`\n  Destroying session ${chatData.sessionId.slice(0, 8)}...`)
  handle.destroySession(chatData.sessionId)
  console.log(`  Active sessions after destroy: ${handle.sessionCount()}`)

  // ── 6. Max sessions enforcement ───────────────────────────────────────────
  section('Step 6: Max Sessions Enforcement')

  // Start a server with low max
  const limitedServer = new RemoteSessionServer(agent, {
    port: 0,
    maxSessions: 2,
    name: 'limited-server',
  })
  const limitedHandle = await limitedServer.start()

  // Fill up sessions
  await fetch(`${limitedHandle.url}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'session 1' }),
  })
  await fetch(`${limitedHandle.url}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'session 2' }),
  })

  console.log(`\n  Server max sessions: 2`)
  console.log(`  Active sessions: ${limitedHandle.sessionCount()}`)

  // Try to create a third — should fail
  const overflowRes = await fetch(`${limitedHandle.url}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'session 3' }),
  })
  const overflowData = await overflowRes.json() as any
  console.log(`  Third session attempt: HTTP ${overflowRes.status}`)
  console.log(`  Response: ${JSON.stringify(overflowData)}`)

  await limitedHandle.close()

  // ── 7. WebSocket Connection ───────────────────────────────────────────────
  section('Step 7: WebSocket Connection (Raw Protocol)')

  console.log(`\n  Demonstrating WebSocket protocol messages:`)
  console.log(`\n  Client → Server message types:`)
  console.log(`    { "type": "message", "text": "hello" }       → New session + query`)
  console.log(`    { "type": "message", "sessionId": "...",`)
  console.log(`      "text": "follow up" }                      → Continue session`)  
  console.log(`    { "type": "resume", "sessionId": "..." }     → Reconnect to session`)
  console.log(`    { "type": "cancel", "sessionId": "..." }     → Cancel running agent`)
  console.log(`    { "type": "ping" }                           → Keepalive`)

  console.log(`\n  Server → Client message types:`)
  console.log(`    { "type": "session", "sessionId": "...",`)
  console.log(`      "status": "created" }                      → Session created`)
  console.log(`    { "type": "response", "sessionId": "...",`)
  console.log(`      "text": "..." }                            → Agent response`)
  console.log(`    { "type": "error", "message": "..." }        → Error`)
  console.log(`    { "type": "pong" }                           → Keepalive ack`)

  console.log(`\n  WebSocket URL: ${handle.wsUrl}`)
  console.log(`  (Connect with any WebSocket client to try it interactively)`)

  // ── Summary ───────────────────────────────────────────────────────────────
  banner('✅ Remote Sessions Demo Complete!')
  console.log(`
  What we demonstrated:

  ┌─── Remote Session Server ──────────────────────────────────┐
  │  REST API                                                   │
  │  ├── GET  /health           → Server status                │
  │  ├── GET  /info             → Server capabilities          │
  │  ├── GET  /sessions         → List active sessions         │
  │  └── POST /chat             → Send message (HTTP)          │
  │                                                             │
  │  WebSocket (WS /ws)                                         │
  │  ├── Persistent bidirectional connections                   │
  │  ├── Session resume on reconnect                           │
  │  ├── Real-time streaming (text_delta events)               │
  │  └── Cancel support for running agent calls                │
  │                                                             │
  │  Session Management                                         │
  │  ├── Persistent sessions (survive disconnects)             │
  │  ├── Max session enforcement (503 on overflow)             │
  │  ├── Idle timeout cleanup                                  │
  │  └── Programmatic destroy                                  │
  └────────────────────────────────────────────────────────────┘

  ✓ HTTP chat with automatic session creation
  ✓ Session persistence across requests (same session ID)
  ✓ Session listing and management
  ✓ Max session enforcement (HTTP 503)
  ✓ Lifecycle callbacks (onSessionCreated, onSessionDestroyed)
  ✓ Zero-dependency WebSocket (RFC 6455) — no 'ws' package needed
  `)

  // Cleanup
  await handle.close()
  console.log('  Server stopped. Done.\n')
  process.exit(0)
}

main().catch(console.error)
