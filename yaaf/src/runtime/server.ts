/**
 * createServer — Ship your agent as an HTTP API.
 *
 * Wraps any YAAF agent in a production-ready HTTP server with:
 * - POST /chat          — Request/response (JSON)
 * - POST /chat/stream   — Server-Sent Events (SSE) streaming
 * - GET  /health        — Health check endpoint
 * - GET  /info          — Agent metadata
 * - CORS support
 * - Request validation
 * - Rate limiting (basic)
 * - Graceful shutdown
 *
 * Uses Node's built-in `http` module — zero external dependencies.
 *
 * @example
 * ```ts
 * import { Agent } from 'yaaf';
 * import { createServer } from 'yaaf/server';
 *
 * const agent = new Agent({
 *   systemPrompt: 'You are an API assistant.',
 *   tools: myTools,
 * });
 *
 * const server = createServer(agent, {
 *   port: 3000,
 *   cors: true,
 * });
 *
 * // server.close() for graceful shutdown
 * ```
 *
 * @module runtime/server
 */

import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'node:http'

// ── Types ────────────────────────────────────────────────────────────────────

/** Minimal agent interface. */
export type ServerAgent = {
  run(input: string, signal?: AbortSignal): Promise<string>
  runStream?: (input: string, signal?: AbortSignal) => AsyncIterable<ServerStreamEvent>
}

export type ServerStreamEvent = {
  type: 'text_delta' | 'tool_call_start' | 'tool_call_end' | 'done'
  text?: string
  toolName?: string
}

export type ServerConfig = {
  /** Port to listen on. Default: 3000 */
  port?: number
  /** Hostname to bind to. Default: '0.0.0.0' */
  host?: string
  /** Enable CORS headers. Default: true */
  cors?: boolean
  /** Allowed origins for CORS. Default: '*' */
  corsOrigin?: string
  /** Agent display name (shown in /info) */
  name?: string
  /** Agent version (shown in /info) */
  version?: string
  /** Max request body size in bytes. Default: 1MB */
  maxBodySize?: number
  /** Basic rate limiting: max requests per minute per IP. Default: 60 */
  rateLimit?: number
  /** Called before the agent runs. Return modified input. */
  beforeRun?: (input: string, req: IncomingMessage) => string | Promise<string>
  /** Called after the agent responds. */
  afterRun?: (input: string, response: string, req: IncomingMessage) => void | Promise<void>
  /** Custom route handlers. */
  routes?: Record<string, RouteHandler>
  /** Called on server start. */
  onStart?: (port: number) => void
  /** Request timeout in ms. Default: 120000 */
  timeout?: number
}

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  body: string,
) => void | Promise<void>

export type ServerHandle = {
  /** Close the server */
  close: () => Promise<void>
  /** Port the server is listening on */
  port: number
  /** Base URL */
  url: string
}

// ── Rate Limiter ─────────────────────────────────────────────────────────────

class RateLimiter {
  private readonly max: number
  private readonly windowMs = 60_000
  private readonly hits = new Map<string, { count: number; resetAt: number }>()

  constructor(max: number) {
    this.max = max
  }

  check(ip: string): boolean {
    const now = Date.now()
    const entry = this.hits.get(ip)

    if (!entry || now > entry.resetAt) {
      this.hits.set(ip, { count: 1, resetAt: now + this.windowMs })
      return true
    }

    entry.count++
    return entry.count <= this.max
  }

  /** Clean up expired entries (call periodically) */
  cleanup(): void {
    const now = Date.now()
    for (const [ip, entry] of this.hits) {
      if (now > entry.resetAt) this.hits.delete(ip)
    }
  }
}

// ── Server ───────────────────────────────────────────────────────────────────

export function createServer(agent: ServerAgent, config: ServerConfig = {}): ServerHandle {
  const port = config.port ?? 3000
  const host = config.host ?? '0.0.0.0'
  const corsEnabled = config.cors ?? true
  const corsOrigin = config.corsOrigin ?? '*'
  const maxBodySize = config.maxBodySize ?? 1_048_576 // 1MB
  const rateLimit = new RateLimiter(config.rateLimit ?? 60)
  const timeout = config.timeout ?? 120_000
  const name = config.name ?? 'yaaf-agent'
  const version = config.version ?? '0.1.0'

  let requestCount = 0
  const startedAt = new Date()

  // Cleanup rate limiter every 5 minutes
  const cleanupTimer = setInterval(() => rateLimit.cleanup(), 300_000)

  const server = createHttpServer(async (req, res) => {
    requestCount++

    // CORS
    if (corsEnabled) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin)
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.setHeader('Access-Control-Max-Age', '86400')
    }

    // Preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // Rate limiting
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? 'unknown'

    if (!rateLimit.check(clientIp)) {
      sendJson(res, 429, { error: 'Rate limit exceeded. Try again later.' })
      return
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
    const path = url.pathname

    try {
      // Check custom routes first
      if (config.routes?.[path]) {
        const body = req.method === 'POST' ? await readBody(req, maxBodySize) : ''
        await config.routes[path]!(req, res, body)
        return
      }

      switch (path) {
        case '/health':
          sendJson(res, 200, {
            status: 'ok',
            uptime: Math.floor((Date.now() - startedAt.getTime()) / 1000),
            requests: requestCount,
          })
          break

        case '/info':
          sendJson(res, 200, {
            name,
            version,
            endpoints: [
              { method: 'POST', path: '/chat', description: 'Send a message' },
              { method: 'POST', path: '/chat/stream', description: 'Stream a response (SSE)' },
              { method: 'GET', path: '/health', description: 'Health check' },
              { method: 'GET', path: '/info', description: 'Agent info' },
            ],
            streaming: !!agent.runStream,
          })
          break

        case '/chat':
          if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed. Use POST.' })
            return
          }
          await handleChat(agent, req, res, config, maxBodySize, timeout)
          break

        case '/chat/stream':
          if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed. Use POST.' })
            return
          }
          if (!agent.runStream) {
            sendJson(res, 501, {
              error: 'Streaming not supported. Agent does not implement runStream().',
            })
            return
          }
          await handleChatStream(
            agent as ServerAgent & { runStream: NonNullable<ServerAgent['runStream']> },
            req, res, config, maxBodySize, timeout,
          )
          break

        default:
          sendJson(res, 404, {
            error: 'Not found',
            endpoints: ['/chat', '/chat/stream', '/health', '/info'],
          })
      }
    } catch (err) {
      console.error('[yaaf/server] Request error:', err)
      if (!res.headersSent) {
        sendJson(res, 500, {
          error: 'Internal server error',
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }
  })

  server.listen(port, host, () => {
    if (config.onStart) {
      config.onStart(port)
    } else {
      console.log(`\n🚀 ${name} listening on http://${host}:${port}`)
      console.log(`   POST /chat         — Send a message`)
      console.log(`   POST /chat/stream  — Stream response (SSE)`)
      console.log(`   GET  /health       — Health check`)
      console.log(`   GET  /info         — Agent info\n`)
    }
  })

  // Graceful shutdown
  const handle: ServerHandle = {
    port,
    url: `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`,
    close: () => new Promise<void>((resolve, reject) => {
      clearInterval(cleanupTimer)
      server.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    }),
  }

  return handle
}

// ── Request Handlers ─────────────────────────────────────────────────────────

async function handleChat(
  agent: ServerAgent,
  req: IncomingMessage,
  res: ServerResponse,
  config: ServerConfig,
  maxBodySize: number,
  timeout: number,
): Promise<void> {
  const body = await readBody(req, maxBodySize)
  const parsed = parseRequest(body)
  if ('error' in parsed) {
    sendJson(res, 400, { error: parsed.error })
    return
  }

  let input = parsed.message
  if (config.beforeRun) {
    input = await config.beforeRun(input, req)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await agent.run(input, controller.signal)

    await config.afterRun?.(parsed.message, response, req)

    sendJson(res, 200, {
      response,
      model: parsed.model,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function handleChatStream(
  agent: ServerAgent & { runStream: NonNullable<ServerAgent['runStream']> },
  req: IncomingMessage,
  res: ServerResponse,
  config: ServerConfig,
  maxBodySize: number,
  timeout: number,
): Promise<void> {
  const body = await readBody(req, maxBodySize)
  const parsed = parseRequest(body)
  if ('error' in parsed) {
    sendJson(res, 400, { error: parsed.error })
    return
  }

  let input = parsed.message
  if (config.beforeRun) {
    input = await config.beforeRun(input, req)
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  let fullResponse = ''

  try {
    for await (const event of agent.runStream(input, controller.signal)) {
      if (event.text) fullResponse += event.text

      const sseData = JSON.stringify(event)
      res.write(`data: ${sseData}\n\n`)
    }

    // Send done event
    res.write(`data: ${JSON.stringify({ type: 'done', text: fullResponse })}\n\n`)
    res.end()

    await config.afterRun?.(parsed.message, fullResponse, req)
  } catch (err) {
    const errorEvent = JSON.stringify({
      type: 'error',
      text: err instanceof Error ? err.message : String(err),
    })
    res.write(`data: ${errorEvent}\n\n`)
    res.end()
  } finally {
    clearTimeout(timer)
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function readBody(req: IncomingMessage, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0

    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maxSize) {
        req.destroy()
        reject(new Error(`Request body exceeds ${maxSize} bytes`))
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function parseRequest(body: string): { message: string; model?: string } | { error: string } {
  if (!body.trim()) {
    return { error: 'Request body is required. Send JSON: { "message": "..." }' }
  }

  try {
    const data = JSON.parse(body)
    if (typeof data.message !== 'string' || !data.message.trim()) {
      return { error: '"message" field is required and must be a non-empty string.' }
    }
    return { message: data.message.trim(), model: data.model }
  } catch {
    return { error: 'Invalid JSON. Send: { "message": "your question" }' }
  }
}
