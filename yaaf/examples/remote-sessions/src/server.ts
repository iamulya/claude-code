/**
 * Remote Sessions — Standalone Server
 *
 * Start this in one terminal, then connect with src/client.ts in another.
 *
 * Run:
 *   GEMINI_API_KEY=... npx tsx src/server.ts
 */

import { Agent, buildTool } from 'yaaf'
import { RemoteSessionServer } from 'yaaf/remote'

const lookupTool = buildTool({
  name: 'lookup',
  maxResultChars: 5000,
  inputSchema: {
    type: 'object',
    properties: { topic: { type: 'string' } },
    required: ['topic'],
  },
  describe: (input) => `Look up: ${(input as any).topic}`,
  async call(input: Record<string, unknown>): Promise<any> {
    const topics: Record<string, string> = {
      'yaaf': 'YAAF is a TypeScript multi-agent framework.',
      'a2a': 'A2A is a cross-framework agent communication protocol.',
      'mcp': 'MCP connects LLMs to external tool servers.',
    }
    const topic = (input.topic as string).toLowerCase()
    return { data: topics[topic] ?? `Unknown topic: ${input.topic}` }
  },
})

const agent = new Agent({
  name: 'RemoteAssistant',
  systemPrompt: 'You are a helpful assistant. Use the lookup tool when asked about topics.',
  tools: [lookupTool],
})

const server = new RemoteSessionServer(agent, {
  port: 4200,
  name: 'yaaf-remote-agent',
  maxSessions: 50,
  onSessionCreated: (id) => console.log(`  📌 New session: ${id.slice(0, 8)}...`),
  onSessionDestroyed: (id, reason) => console.log(`  🗑️  Session ended: ${id.slice(0, 8)}... (${reason})`),
})

const handle = await server.start()

console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║  YAAF Remote Session Server                       ║
  ╠═══════════════════════════════════════════════════╣
  ║                                                    ║
  ║  HTTP:      ${handle.url.padEnd(36)}║
  ║  WebSocket: ${handle.wsUrl.padEnd(36)}║
  ║                                                    ║
  ║  Try:                                              ║
  ║    curl -X POST ${handle.url}/chat \\
  ║      -H 'Content-Type: application/json' \\        ║
  ║      -d '{"message":"What is YAAF?"}'              ║
  ║                                                    ║
  ║  Or:  npx tsx src/client.ts                        ║
  ║  Press Ctrl+C to stop.                             ║
  ╚═══════════════════════════════════════════════════╝
`)

process.on('SIGINT', async () => {
  console.log('\n  🛑 Shutting down...')
  await handle.close()
  process.exit(0)
})
