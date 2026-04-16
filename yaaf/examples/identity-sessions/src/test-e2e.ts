#!/usr/bin/env npx tsx
/**
 * End-to-End Test Script for Identity + Sessions
 *
 * Runs against the live server (start with `npm start` first).
 * Tests the full lifecycle:
 *
 *   1. Unauthenticated → 401
 *   2. API Key auth → 200 + session_id
 *   3. Session resume with session_id
 *   4. Session isolation (Bob can't access Alice's session)
 *   5. JWT auth (self-signed HS256)
 *   6. List sessions
 *   7. Delete session
 *   8. Streaming with identity + sessions
 *
 * Usage:
 *   npm start          # in terminal 1
 *   npm test           # in terminal 2
 */

import * as crypto from 'crypto'

const BASE = process.env.BASE_URL ?? 'http://localhost:4200'
const JWT_SECRET = 'yaaf-demo-jwt-secret-do-not-use-in-production!'

// ── JWT Helper ──────────────────────────────────────────────────────────────

function createJwt(payload: Record<string, unknown>): string {
  const b64url = (data: string | Buffer): string =>
    Buffer.from(data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  const sig = b64url(
    crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest(),
  )
  return `${header}.${body}.${sig}`
}

// ── Test Runner ─────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}`)
    console.log(`     ${err instanceof Error ? err.message : String(err)}`)
    failed++
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

// ── Tests ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🧪 YAAF Identity + Sessions — End-to-End Tests`)
  console.log(`   Target: ${BASE}\n`)

  // Check server is up
  try {
    await fetch(`${BASE}/health`)
  } catch {
    console.error(`❌ Server not reachable at ${BASE}`)
    console.error(`   Start the server first: npm start`)
    process.exit(1)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('─── Authentication ───')

  await test('Unauthenticated request → 401', async () => {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    })
    assert(res.status === 401, `Expected 401, got ${res.status}`)
    const data = await res.json()
    assert(data.error === 'Unauthorized', `Expected "Unauthorized", got "${data.error}"`)
  })

  await test('Invalid API key → 401', async () => {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk-wrong-key',
      },
      body: JSON.stringify({ message: 'hello' }),
    })
    assert(res.status === 401, `Expected 401, got ${res.status}`)
  })

  let aliceSessionId: string

  await test('API key auth (Alice) → 200 + session_id', async () => {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk-alice-admin',
      },
      body: JSON.stringify({ message: 'Hello! Who am I?' }),
    })
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert(typeof data.session_id === 'string', 'Expected session_id in response')
    assert(data.response.length > 0, 'Expected non-empty response')
    aliceSessionId = data.session_id
    console.log(`     → session_id: ${aliceSessionId}`)
    console.log(`     → response: "${data.response.slice(0, 80)}..."`)
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n─── Session Continuity ───')

  await test('Resume session with session_id', async () => {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk-alice-admin',
      },
      body: JSON.stringify({
        message: 'What time is it?',
        session_id: aliceSessionId,
      }),
    })
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert(data.session_id === aliceSessionId, 'session_id should match')
    console.log(`     → same session: ${data.session_id === aliceSessionId}`)
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n─── Session Isolation ───')

  await test('Bob cannot access Alice\'s session → 403', async () => {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk-bob-viewer',
      },
      body: JSON.stringify({
        message: 'Snooping on Alice',
        session_id: aliceSessionId,
      }),
    })
    assert(res.status === 403, `Expected 403, got ${res.status}`)
    const data = await res.json()
    assert(data.error.includes('another user'), `Expected ownership error, got: ${data.error}`)
    console.log(`     → correctly denied: "${data.error}"`)
  })

  let bobSessionId: string

  await test('Bob gets his own session', async () => {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk-bob-viewer',
      },
      body: JSON.stringify({ message: 'What time is it?' }),
    })
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    bobSessionId = data.session_id
    assert(bobSessionId !== aliceSessionId, 'Bob should get a different session')
    console.log(`     → Bob's session: ${bobSessionId}`)
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n─── JWT Authentication ───')

  await test('JWT auth with valid token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = createJwt({
      sub: 'jwt-user-carol',
      name: 'Carol from JWT',
      roles: ['admin'],
      tenant: 'acme',
      iss: 'yaaf-demo',
      iat: now,
      exp: now + 3600,
    })

    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message: 'Hello! I authenticated via JWT!' }),
    })
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert(typeof data.session_id === 'string', 'Expected session_id')
    console.log(`     → JWT user session: ${data.session_id}`)
    console.log(`     → response: "${data.response.slice(0, 80)}..."`)
  })

  await test('Expired JWT → 401', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = createJwt({
      sub: 'expired-user',
      iss: 'yaaf-demo',
      exp: now - 3600, // expired 1 hour ago
    })

    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message: 'I should be rejected' }),
    })
    assert(res.status === 401, `Expected 401, got ${res.status}`)
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n─── Session Management API ───')

  await test('GET /sessions → lists user sessions', async () => {
    const res = await fetch(`${BASE}/sessions`, {
      headers: { 'X-API-Key': 'sk-alice-admin' },
    })
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert(Array.isArray(data.sessions), 'Expected sessions array')
    assert(data.sessions.includes(aliceSessionId), `Expected Alice's session in list`)
    console.log(`     → Alice's sessions: [${data.sessions.join(', ')}]`)
  })

  await test('GET /sessions (Bob) → only his sessions', async () => {
    const res = await fetch(`${BASE}/sessions`, {
      headers: { 'X-API-Key': 'sk-bob-viewer' },
    })
    const data = await res.json()
    assert(data.sessions.includes(bobSessionId), 'Expected Bob\'s session')
    // Bob should not see Alice's session
    assert(!data.sessions.includes(aliceSessionId), 'Bob should NOT see Alice\'s session')
    console.log(`     → Bob can see: [${data.sessions.join(', ')}]`)
    console.log(`     → Alice's session hidden: ✅`)
  })

  await test('DELETE /sessions/:id → deletes own session', async () => {
    const res = await fetch(`${BASE}/sessions/${bobSessionId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': 'sk-bob-viewer' },
    })
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert(data.deleted === bobSessionId, 'Expected deleted session ID')
    console.log(`     → deleted: ${data.deleted}`)
  })

  await test('DELETE Alice\'s session as Bob → 403', async () => {
    const res = await fetch(`${BASE}/sessions/${aliceSessionId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': 'sk-bob-viewer' },
    })
    assert(res.status === 403, `Expected 403, got ${res.status}`)
    console.log(`     → correctly denied`)
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n─── Streaming with Identity ───')

  await test('POST /chat/stream with API key → SSE stream', async () => {
    const res = await fetch(`${BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk-alice-admin',
      },
      body: JSON.stringify({ message: 'What time is it?' }),
    })
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(
      res.headers.get('content-type')?.includes('text/event-stream') ?? false,
      'Expected SSE content type',
    )

    // Read the full SSE response
    const text = await res.text()
    const events = text.split('\n\n')
      .filter(Boolean)
      .map(e => e.replace('data: ', ''))
      .filter(e => e.trim())
      .map(e => { try { return JSON.parse(e) } catch { return null } })
      .filter(Boolean)

    // Check for session event
    const sessionEvent = events.find(e => e.type === 'session')
    assert(sessionEvent !== undefined, 'Expected session event in SSE stream')
    console.log(`     → stream session_id: ${sessionEvent.session_id}`)

    // Check for done event with session_id
    const doneEvent = events.find(e => e.type === 'done')
    assert(doneEvent !== undefined, 'Expected done event')
    assert(typeof doneEvent.session_id === 'string', 'Expected session_id in done event')
    console.log(`     → stream events: ${events.length}`)
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n─── Cross-Tenant Isolation ───')

  await test('Eve (globex) gets her own session, separate from acme', async () => {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk-eve-external',
      },
      body: JSON.stringify({ message: 'Hello from Globex!' }),
    })
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert(data.session_id !== aliceSessionId, 'Eve should get her own session')
    console.log(`     → Eve's session: ${data.session_id}`)
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  console.log(`${'═'.repeat(60)}\n`)

  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
