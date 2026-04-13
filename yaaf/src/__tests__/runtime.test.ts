/**
 * Tests for YAAF runtime harnesses:
 * - createCLI (export/type verification)
 * - createServer (HTTP integration tests)
 * - createWorker (fetch handler tests)
 */

import { describe, it, expect, afterEach } from 'vitest'
import {
  createServer,
  type ServerAgent,
  type ServerHandle,
} from '../runtime/server.js'
import {
  createWorker,
  type WorkerAgent,
} from '../runtime/worker.js'
import {
  createCLI,
  type CLIAgent,
} from '../runtime/cli.js'

// ── Mock agents ──────────────────────────────────────────────────────────────

const echoAgent: ServerAgent & WorkerAgent = {
  run: async (input: string) => `Echo: ${input}`,
}

const streamingAgent: ServerAgent & WorkerAgent = {
  run: async (input: string) => `Echo: ${input}`,
  async *runStream(input: string) {
    yield { type: 'text_delta' as const, text: 'Hello ' }
    yield { type: 'text_delta' as const, text: 'world' }
    yield { type: 'done' as const }
  },
}

// ════════════════════════════════════════════════════════════════════════════
// createServer
// ════════════════════════════════════════════════════════════════════════════

describe('createServer', () => {
  let server: ServerHandle | null = null

  afterEach(async () => {
    if (server) {
      await server.close()
      server = null
    }
  })

  it('starts and returns a handle', async () => {
    server = createServer(echoAgent, {
      port: 18770,
      onStart: () => {},
    })
    await new Promise(r => setTimeout(r, 100))

    // Server handle has correct shape
    expect(server.close).toBeInstanceOf(Function)
    expect(typeof server.url).toBe('string')
  })

  it('GET /health returns ok', async () => {
    server = createServer(echoAgent, { port: 18771, onStart: () => {} })

    // Give server a moment to start
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18771/health')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe('ok')
    expect(typeof data.uptime).toBe('number')
  })

  it('GET /info returns agent metadata', async () => {
    server = createServer(echoAgent, {
      port: 18772,
      name: 'test-agent',
      version: '1.0.0',
      onStart: () => {},
    })
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18772/info')
    const data = await res.json()

    expect(data.name).toBe('test-agent')
    expect(data.version).toBe('1.0.0')
    expect(data.endpoints).toBeInstanceOf(Array)
  })

  it('POST /chat returns agent response', async () => {
    server = createServer(echoAgent, { port: 18773, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18773/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello!' }),
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.response).toBe('Echo: Hello!')
  })

  it('POST /chat validates request body', async () => {
    server = createServer(echoAgent, { port: 18774, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    // Empty body
    const res1 = await fetch('http://localhost:18774/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '',
    })
    expect(res1.status).toBe(400)

    // Missing message field
    const res2 = await fetch('http://localhost:18774/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'wrong field' }),
    })
    expect(res2.status).toBe(400)

    // Invalid JSON
    const res3 = await fetch('http://localhost:18774/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    expect(res3.status).toBe(400)
  })

  it('returns 405 for wrong method', async () => {
    server = createServer(echoAgent, { port: 18775, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18775/chat')
    expect(res.status).toBe(405)
  })

  it('returns 404 for unknown routes', async () => {
    server = createServer(echoAgent, { port: 18776, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18776/unknown')
    expect(res.status).toBe(404)
  })

  it('POST /chat/stream returns SSE', async () => {
    server = createServer(streamingAgent, { port: 18777, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18777/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello!' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')

    const text = await res.text()
    expect(text).toContain('data:')
    expect(text).toContain('text_delta')
  })

  it('returns 501 for /chat/stream without runStream', async () => {
    server = createServer(echoAgent, { port: 18778, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18778/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello!' }),
    })
    expect(res.status).toBe(501)
  })

  it('sets CORS headers', async () => {
    server = createServer(echoAgent, { port: 18779, cors: true, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18779/health')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('supports custom routes', async () => {
    server = createServer(echoAgent, {
      port: 18780,
      onStart: () => {},
      routes: {
        '/custom': (_req, res) => {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('custom response')
        },
      },
    })
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18780/custom')
    expect(await res.text()).toBe('custom response')
  })

  it('calls beforeRun hook', async () => {
    let captured = ''
    server = createServer(echoAgent, {
      port: 18781,
      onStart: () => {},
      beforeRun: (input) => {
        captured = input
        return `Modified: ${input}`
      },
    })
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18781/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'original' }),
    })
    const data = await res.json()

    expect(captured).toBe('original')
    expect(data.response).toBe('Echo: Modified: original')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// createWorker
// ════════════════════════════════════════════════════════════════════════════

describe('createWorker', () => {
  it('GET /health returns ok', async () => {
    const handler = createWorker(echoAgent)
    const res = await handler(new Request('http://localhost/health'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe('ok')
  })

  it('GET /info returns agent metadata', async () => {
    const handler = createWorker(echoAgent, { name: 'test-worker' })
    const res = await handler(new Request('http://localhost/info'))
    const data = await res.json()

    expect(data.name).toBe('test-worker')
  })

  it('POST /chat returns response', async () => {
    const handler = createWorker(echoAgent)
    const res = await handler(new Request('http://localhost/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello worker!' }),
    }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.response).toBe('Echo: Hello worker!')
  })

  it('validates request body', async () => {
    const handler = createWorker(echoAgent)

    const res = await handler(new Request('http://localhost/chat', {
      method: 'POST',
      body: '',
    }))
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown routes', async () => {
    const handler = createWorker(echoAgent)
    const res = await handler(new Request('http://localhost/nope'))
    expect(res.status).toBe(404)
  })

  it('handles CORS preflight', async () => {
    const handler = createWorker(echoAgent, { cors: true })
    const res = await handler(new Request('http://localhost/chat', { method: 'OPTIONS' }))

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('supports authorization', async () => {
    const handler = createWorker(echoAgent, {
      authorize: (req) => req.headers.get('Authorization') === 'Bearer secret',
    })

    // Without auth
    const res1 = await handler(new Request('http://localhost/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'hi' }),
    }))
    expect(res1.status).toBe(401)

    // With auth
    const res2 = await handler(new Request('http://localhost/chat', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
      body: JSON.stringify({ message: 'hi' }),
    }))
    expect(res2.status).toBe(200)
  })

  it('POST /chat/stream returns SSE', async () => {
    const handler = createWorker(streamingAgent)
    const res = await handler(new Request('http://localhost/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'stream this' }),
    }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')

    const text = await res.text()
    expect(text).toContain('Hello ')
    expect(text).toContain('world')
  })

  it('returns 501 for streaming without runStream', async () => {
    const handler = createWorker(echoAgent)
    const res = await handler(new Request('http://localhost/chat/stream', {
      method: 'POST',
      body: JSON.stringify({ message: 'hi' }),
    }))
    expect(res.status).toBe(501)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// createCLI (type verification only — REPL can't be tested easily)
// ════════════════════════════════════════════════════════════════════════════

describe('createCLI', () => {
  it('exports createCLI function', () => {
    expect(typeof createCLI).toBe('function')
  })

  it('CLIAgent type is compatible with basic agent', () => {
    const agent: CLIAgent = {
      run: async (input: string) => `Response to: ${input}`,
    }
    expect(agent.run).toBeInstanceOf(Function)
  })

  it('CLIAgent supports optional streaming', () => {
    const agent: CLIAgent = {
      run: async () => 'done',
      async *runStream() {
        yield { type: 'text_delta' as const, text: 'hi' }
      },
    }
    expect(agent.runStream).toBeInstanceOf(Function)
  })
})
