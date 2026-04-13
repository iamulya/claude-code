/**
 * createWorker — Ship your agent as an edge function.
 *
 * Creates a fetch-compatible request handler that can run on:
 * - Cloudflare Workers
 * - Vercel Edge Functions
 * - Deno Deploy
 * - Bun
 * - Any platform supporting the Web Fetch API
 *
 * Returns a standard `fetch` handler: (Request) => Promise<Response>
 *
 * @example Cloudflare Workers
 * ```ts
 * import { Agent } from 'yaaf';
 * import { createWorker } from 'yaaf/worker';
 *
 * const agent = new Agent({ systemPrompt: 'You are helpful.' });
 * const handler = createWorker(agent);
 *
 * export default { fetch: handler };
 * ```
 *
 * @example Vercel Edge Functions
 * ```ts
 * import { Agent } from 'yaaf';
 * import { createWorker } from 'yaaf/worker';
 *
 * const agent = new Agent({ systemPrompt: 'You are helpful.' });
 * const handler = createWorker(agent);
 *
 * export const config = { runtime: 'edge' };
 * export default async function(req: Request) {
 *   return handler(req);
 * }
 * ```
 *
 * @module runtime/worker
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** Minimal agent interface. */
export type WorkerAgent = {
  run(input: string, signal?: AbortSignal): Promise<string>
  runStream?: (input: string, signal?: AbortSignal) => AsyncIterable<WorkerStreamEvent>
}

export type WorkerStreamEvent = {
  type: 'text_delta' | 'tool_call_start' | 'tool_call_end' | 'done'
  text?: string
  toolName?: string
}

export type WorkerConfig = {
  /** Agent name (shown in /info). Default: 'yaaf-agent' */
  name?: string
  /** Enable CORS. Default: true */
  cors?: boolean
  /** Allowed CORS origin. Default: '*' */
  corsOrigin?: string
  /** Max request body size in bytes. Default: 1MB */
  maxBodySize?: number
  /** Request timeout in ms. Default: 30000 (shorter for edge) */
  timeout?: number
  /** Called before the agent runs. */
  beforeRun?: (input: string, req: Request) => string | Promise<string>
  /** Called after the agent responds. */
  afterRun?: (input: string, response: string, req: Request) => void | Promise<void>
  /** Auth check. Return true to allow, false to deny. */
  authorize?: (req: Request) => boolean | Promise<boolean>
}

type FetchHandler = (request: Request) => Promise<Response>

// ── Worker ───────────────────────────────────────────────────────────────────

export function createWorker(agent: WorkerAgent, config: WorkerConfig = {}): FetchHandler {
  const name = config.name ?? 'yaaf-agent'
  const corsEnabled = config.cors ?? true
  const corsOrigin = config.corsOrigin ?? '*'
  const maxBodySize = config.maxBodySize ?? 1_048_576
  const timeout = config.timeout ?? 30_000

  return async (request: Request): Promise<Response> => {
    const corsHeaders: Record<string, string> = corsEnabled
      ? {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
      : {}

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Auth check
    if (config.authorize) {
      const allowed = await config.authorize(request)
      if (!allowed) {
        return jsonResponse(401, { error: 'Unauthorized' }, corsHeaders)
      }
    }

    const url = new URL(request.url)
    const path = url.pathname

    try {
      switch (path) {
        case '/health':
          return jsonResponse(200, { status: 'ok' }, corsHeaders)

        case '/info':
          return jsonResponse(200, {
            name,
            endpoints: ['/chat', '/chat/stream', '/health', '/info'],
            streaming: !!agent.runStream,
          }, corsHeaders)

        case '/chat':
          if (request.method !== 'POST') {
            return jsonResponse(405, { error: 'Method not allowed' }, corsHeaders)
          }
          return handleChat(agent, request, config, corsHeaders, maxBodySize, timeout)

        case '/chat/stream':
          if (request.method !== 'POST') {
            return jsonResponse(405, { error: 'Method not allowed' }, corsHeaders)
          }
          if (!agent.runStream) {
            return jsonResponse(501, { error: 'Streaming not supported' }, corsHeaders)
          }
          return handleStream(agent as WorkerAgent & { runStream: NonNullable<WorkerAgent['runStream']> }, request, config, corsHeaders, maxBodySize, timeout)

        default:
          return jsonResponse(404, {
            error: 'Not found',
            endpoints: ['/chat', '/chat/stream', '/health', '/info'],
          }, corsHeaders)
      }
    } catch (err) {
      return jsonResponse(500, {
        error: 'Internal server error',
        message: err instanceof Error ? err.message : String(err),
      }, corsHeaders)
    }
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleChat(
  agent: WorkerAgent,
  request: Request,
  config: WorkerConfig,
  corsHeaders: Record<string, string>,
  maxBodySize: number,
  timeout: number,
): Promise<Response> {
  const body = await readRequestBody(request, maxBodySize)
  const parsed = parseInput(body)
  if ('error' in parsed) {
    return jsonResponse(400, { error: parsed.error }, corsHeaders)
  }

  let input = parsed.message
  if (config.beforeRun) {
    input = await config.beforeRun(input, request)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await agent.run(input, controller.signal)
    await config.afterRun?.(parsed.message, response, request)

    return jsonResponse(200, { response }, corsHeaders)
  } catch (err) {
    if (controller.signal.aborted) {
      return jsonResponse(408, { error: 'Request timeout' }, corsHeaders)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function handleStream(
  agent: WorkerAgent & { runStream: NonNullable<WorkerAgent['runStream']> },
  request: Request,
  config: WorkerConfig,
  corsHeaders: Record<string, string>,
  maxBodySize: number,
  timeout: number,
): Promise<Response> {
  const body = await readRequestBody(request, maxBodySize)
  const parsed = parseInput(body)
  if ('error' in parsed) {
    return jsonResponse(400, { error: parsed.error }, corsHeaders)
  }

  let input = parsed.message
  if (config.beforeRun) {
    input = await config.beforeRun(input, request)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(streamController) {
      const encoder = new TextEncoder()
      let fullResponse = ''

      try {
        for await (const event of agent.runStream(input, controller.signal)) {
          if (event.text) fullResponse += event.text
          const data = `data: ${JSON.stringify(event)}\n\n`
          streamController.enqueue(encoder.encode(data))
        }

        // Final done event
        const doneData = `data: ${JSON.stringify({ type: 'done', text: fullResponse })}\n\n`
        streamController.enqueue(encoder.encode(doneData))
        streamController.close()

        await config.afterRun?.(parsed.message, fullResponse, request)
      } catch (err) {
        const errorData = `data: ${JSON.stringify({
          type: 'error',
          text: err instanceof Error ? err.message : String(err),
        })}\n\n`
        streamController.enqueue(encoder.encode(errorData))
        streamController.close()
      } finally {
        clearTimeout(timer)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...corsHeaders,
    },
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(
  status: number,
  data: unknown,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
}

async function readRequestBody(request: Request, maxSize: number): Promise<string> {
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > maxSize) {
    throw new Error(`Request body exceeds ${maxSize} bytes`)
  }

  const body = await request.text()
  if (body.length > maxSize) {
    throw new Error(`Request body exceeds ${maxSize} bytes`)
  }
  return body
}

function parseInput(body: string): { message: string; model?: string } | { error: string } {
  if (!body.trim()) {
    return { error: 'Request body required. Send JSON: { "message": "..." }' }
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
