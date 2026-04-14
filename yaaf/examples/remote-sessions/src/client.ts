/**
 * Remote Sessions — HTTP Client
 *
 * Connects to the Remote Session server via HTTP and demonstrates
 * multi-turn conversation with session persistence.
 *
 * Start the server first:  npx tsx src/server.ts
 * Then run this:           npx tsx src/client.ts
 */

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:4200'

async function chat(message: string, sessionId?: string): Promise<{ sessionId: string; response: string }> {
  const res = await fetch(`${SERVER_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  })
  if (!res.ok) {
    const err = await res.json() as any
    throw new Error(`HTTP ${res.status}: ${err.error}`)
  }
  return res.json() as any
}

async function main() {
  console.log(`\n  Connecting to ${SERVER_URL}...\n`)

  // Check server is up
  try {
    const health = await fetch(`${SERVER_URL}/health`)
    const data = await health.json() as any
    console.log(`  ✅ Server: ${data.name} (${data.sessions} active sessions)\n`)
  } catch {
    console.error(`  ❌ Cannot reach server at ${SERVER_URL}`)
    console.error(`     Start it first: npx tsx src/server.ts\n`)
    process.exit(1)
  }

  // Turn 1 — new session
  console.log('  You: What is YAAF?')
  const turn1 = await chat('What is YAAF?')
  console.log(`  🤖 [session ${turn1.sessionId.slice(0, 8)}] ${turn1.response}\n`)

  // Turn 2 — same session (follow-up)
  console.log('  You: How does it compare to other frameworks?')
  const turn2 = await chat('How does it compare to other frameworks?', turn1.sessionId)
  console.log(`  🤖 [session ${turn2.sessionId.slice(0, 8)}] ${turn2.response}\n`)

  // Turn 3 — new topic
  console.log('  You: Tell me about A2A')
  const turn3 = await chat('Tell me about A2A', turn1.sessionId)
  console.log(`  🤖 [session ${turn3.sessionId.slice(0, 8)}] ${turn3.response}\n`)

  // Show sessions
  const sessions = await fetch(`${SERVER_URL}/sessions`)
  const data = await sessions.json() as any
  console.log(`  📊 Active sessions: ${data.sessions.length}`)
  for (const s of data.sessions) {
    console.log(`     • ${s.id.slice(0, 8)}... — ${s.messageCount} messages`)
  }
  console.log()
}

main().catch(console.error)
