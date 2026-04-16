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

  // ── SSE tool-call event flow (regression for tool_call_result gap) ─────────

  it('SSE stream includes tool_call_start and tool_call_result events', async () => {
    // The server passes runner events through verbatim, accumulates event.text
    // to build the final synthetic 'done' event, then closes the stream.
    const toolCallAgent: ServerAgent = {
      run: async () => 'done',
      async *runStream(_input: string) {
        yield { type: 'tool_call_start' as const, name: 'my_tool', arguments: { q: 'test' } }
        yield { type: 'tool_call_result' as const, name: 'my_tool', result: '{"answer":42}', durationMs: 5 }
        // Server accumulates event.text (not event.content) for the done event
        yield { type: 'text_delta' as const, text: 'The answer is 42.' }
      },
    }

    server = createServer(toolCallAgent, { port: 18790, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18790/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'what is the answer?' }),
    })

    expect(res.status).toBe(200)
    const text = await res.text()

    // Parse all SSE events
    const events = text
      .split('\n')
      .filter(l => l.startsWith('data: '))
      .map(l => JSON.parse(l.slice(6)) as Record<string, unknown>)

    const types = events.map(e => e['type'])

    // Server passes tool events through verbatim
    expect(types).toContain('tool_call_start')
    expect(types).toContain('tool_call_result')
    expect(types).toContain('text_delta')
    // Server always appends a synthetic 'done' event after the stream
    expect(types).toContain('done')

    // Verify tool_call_start payload
    const tcStart = events.find(e => e['type'] === 'tool_call_start')
    expect(tcStart?.['toolName']).toBe('my_tool')

    // Verify tool_call_result payload
    const tcResult = events.find(e => e['type'] === 'tool_call_result')
    expect(tcResult?.['toolName']).toBe('my_tool')

    // The synthetic done event text is built from accumulated event.text fields
    const done = events.find(e => e['type'] === 'done')
    expect(done?.['text']).toBe('The answer is 42.')
  })


  it('SSE stream emits error event when runStream throws, does not crash server', async () => {
    const errorAgent: ServerAgent = {
      run: async () => 'ok',
      async *runStream(): AsyncGenerator<{ type: 'text_delta'; content: string }> {
        yield { type: 'text_delta', content: 'starting...' }
        throw new Error('tool pipeline exploded')
      },
    }

    server = createServer(errorAgent, { port: 18791, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    const res = await fetch('http://localhost:18791/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'go' }),
    })

    expect(res.status).toBe(200) // headers already sent; error is in SSE body
    const text = await res.text()
    const events = text
      .split('\n')
      .filter(l => l.startsWith('data: '))
      .map(l => JSON.parse(l.slice(6)) as Record<string, unknown>)

    const errEvent = events.find(e => e['type'] === 'error')
    expect(errEvent).toBeDefined()
    expect(String(errEvent?.['text'])).toContain('tool pipeline exploded')

    // Server stays alive — another request after error must succeed
    const res2 = await fetch('http://localhost:18791/health')
    expect(res2.status).toBe(200)
  })

  // ── Multi-turn input (buildMultiTurnInput) ─────────────────────────────────

  it('SSE /chat/stream passes multi-turn history to agent when multiTurn enabled', async () => {
    let receivedInput = ''
    const historyAgent: ServerAgent = {
      run: async () => 'done',
      async *runStream(input: string) {
        receivedInput = input
        yield { type: 'text_delta' as const, content: 'ok' }
        yield { type: 'final_response' as const, content: 'ok' }
      },
    }

    server = createServer(historyAgent, { port: 18792, multiTurn: true, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    await fetch('http://localhost:18792/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'And what is 2+2?',
        history: [
          { role: 'user',      content: 'What is 1+1?' },
          { role: 'assistant', content: 'It is 2.' },
        ],
      }),
    })

    // Agent must receive formatted multi-turn context
    expect(receivedInput).toContain('Human: What is 1+1?')
    expect(receivedInput).toContain('Assistant: It is 2.')
    expect(receivedInput).toContain('Human: And what is 2+2?')
    expect(receivedInput).toContain('Assistant:')
  })

  it('ignores history with invalid entries (strips malformed turns)', async () => {
    let receivedInput = ''
    const historyAgent: ServerAgent = {
      run: async () => 'done',
      async *runStream(input: string) {
        receivedInput = input
        yield { type: 'text_delta' as const, content: 'ok' }
        yield { type: 'final_response' as const, content: 'ok' }
      },
    }

    server = createServer(historyAgent, { port: 18793, multiTurn: true, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    await fetch('http://localhost:18793/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'hello',
        history: [
          { role: 'user',    content: 'valid turn' },
          { role: 'invalid', content: 'bad role — should be filtered' },  // invalid role
          null,                                                            // null entry
          42,                                                              // non-object
        ],
      }),
    })

    // Only the valid turn should appear; invalid ones stripped
    expect(receivedInput).toContain('Human: valid turn')
    expect(receivedInput).not.toContain('invalid')
    expect(receivedInput).not.toContain('bad role')
  })

  it('/chat/stream ignores history when multiTurn is disabled', async () => {
    let receivedInput = ''
    const historyAgent: ServerAgent = {
      run: async () => 'done',
      async *runStream(input: string) {
        receivedInput = input
        yield { type: 'text_delta' as const, content: 'ok' }
        yield { type: 'final_response' as const, content: 'ok' }
      },
    }

    // multiTurn NOT set → defaults to false
    server = createServer(historyAgent, { port: 18794, onStart: () => {} })
    await new Promise(r => setTimeout(r, 100))

    await fetch('http://localhost:18794/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'current message',
        history: [{ role: 'user', content: 'should be ignored' }],
      }),
    })

    // Only the raw message should reach the agent
    expect(receivedInput).toBe('current message')
    expect(receivedInput).not.toContain('should be ignored')
  })
}) // end createServer


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
