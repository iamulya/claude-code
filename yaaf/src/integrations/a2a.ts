/**
 * A2A Protocol — Agent-to-Agent interoperability for YAAF.
 *
 * Implements the A2A open protocol (https://a2a-protocol.org) enabling YAAF
 * agents to communicate with agents built on any framework (ADK, LangGraph,
 * BeeAI, etc.) as long as they speak A2A.
 *
 * Two sides:
 * 1. **A2AClient** — call remote A2A agents from YAAF (as tools or directly)
 * 2. **A2AServer** — expose YAAF agents as A2A-compliant endpoints
 *
 * Protocol summary:
 * - Transport: JSON-RPC 2.0 over HTTP(S)
 * - Discovery: Agent Cards (JSON at `/.well-known/agent.json`)
 * - Interaction: Tasks (create → in-progress → completed/failed)
 * - Streaming: Server-Sent Events (SSE) for real-time updates
 * - Auth: Bearer tokens, API keys (extensible via AgentCard auth schemes)
 *
 * @example
 * ```ts
 * // CLIENT — call a remote A2A agent
 * const client = new A2AClient('https://remote-agent.example.com');
 * const card = await client.fetchAgentCard();
 * console.log(card.name, card.skills);
 *
 * const result = await client.sendTask({
 *   message: { role: 'user', parts: [{ text: 'What is the weather?' }] },
 * });
 * console.log(result.status, result.artifacts);
 *
 * // CLIENT — wrap a remote agent as a YAAF tool
 * const weatherTool = client.asTool();
 * const agent = new Agent({ tools: [weatherTool] });
 *
 * // SERVER — expose a YAAF agent as A2A
 * const server = new A2AServer(myAgent, {
 *   name: 'My YAAF Agent',
 *   description: 'A helpful assistant',
 *   skills: [{ id: 'general', name: 'General Q&A' }],
 *   port: 4000,
 * });
 * await server.start();
 * ```
 *
 * @module integrations/a2a
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'crypto'
import { buildTool, type Tool } from '../tools/tool.js'

// ── A2A Protocol Types ──────────────────────────────────────────────────────

/** A2A Agent Card — describes an agent's capabilities for discovery. */
export type AgentCard = {
  name: string
  description?: string
  url: string
  version?: string
  /** Authentication schemes accepted by this agent. */
  authentication?: {
    schemes: Array<{
      scheme: string // 'bearer', 'apiKey', 'oauth2', etc.
      [key: string]: unknown
    }>
  }
  /** Default input/output modalities. */
  defaultInputModes?: string[]
  defaultOutputModes?: string[]
  /** Skills this agent can perform. */
  skills?: AgentSkill[]
  /** Capabilities supported by this agent. */
  capabilities?: {
    streaming?: boolean
    pushNotifications?: boolean
    stateTransitionHistory?: boolean
  }
}

export type AgentSkill = {
  id: string
  name: string
  description?: string
  tags?: string[]
  examples?: string[]
}

/** A2A Message — a single message in a task conversation. */
export type A2AMessage = {
  role: 'user' | 'agent'
  parts: A2APart[]
  metadata?: Record<string, unknown>
}

/** A2A Part — content within a message. */
export type A2APart =
  | { type?: 'text'; text: string }
  | { type: 'file'; file: { name?: string; mimeType?: string; data?: string; uri?: string } }
  | { type: 'data'; data: Record<string, unknown> }

/** A2A Task — the core interaction unit. */
export type A2ATask = {
  id: string
  status: A2ATaskStatus
  /** Conversation history. */
  history?: A2AMessage[]
  /** Output artifacts produced by the agent. */
  artifacts?: A2AArtifact[]
  metadata?: Record<string, unknown>
}

export type A2ATaskStatus = {
  state: 'submitted' | 'working' | 'input-required' | 'completed' | 'canceled' | 'failed'
  message?: A2AMessage
  timestamp?: string
}

export type A2AArtifact = {
  name?: string
  description?: string
  parts: A2APart[]
  metadata?: Record<string, unknown>
}

/** JSON-RPC 2.0 request. */
type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

/** JSON-RPC 2.0 response. */
type JsonRpcResponse = {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

// ── A2A Client ──────────────────────────────────────────────────────────────

export type A2AClientConfig = {
  /** Base URL of the remote A2A agent. */
  url: string
  /** Bearer token for authentication. */
  token?: string
  /** API key for authentication. */
  apiKey?: string
  /** Custom headers for all requests. */
  headers?: Record<string, string>
  /** Request timeout in ms. Default: 60_000. */
  timeoutMs?: number
}

/**
 * A2AClient — call remote A2A-compatible agents.
 *
 * Handles Agent Card fetching, task creation, task polling, and
 * SSE streaming. Can be wrapped as a YAAF Tool for seamless integration.
 */
export class A2AClient {
  private readonly url: string
  private readonly headers: Record<string, string>
  private readonly timeoutMs: number
  private cachedCard: AgentCard | null = null

  constructor(config: string | A2AClientConfig) {
    const cfg = typeof config === 'string' ? { url: config } : config
    this.url = cfg.url.replace(/\/$/, '')
    this.timeoutMs = cfg.timeoutMs ?? 60_000

    this.headers = {
      'Content-Type': 'application/json',
      ...(cfg.headers ?? {}),
    }
    if (cfg.token) this.headers['Authorization'] = `Bearer ${cfg.token}`
    if (cfg.apiKey) this.headers['X-API-Key'] = cfg.apiKey
  }

  // ── Discovery ───────────────────────────────────────────────────────────

  /**
   * Fetch the remote agent's Agent Card.
   * Cached after first fetch.
   */
  async fetchAgentCard(): Promise<AgentCard> {
    if (this.cachedCard) return this.cachedCard

    const response = await this.httpGet('/.well-known/agent.json')
    this.cachedCard = response as AgentCard
    return this.cachedCard
  }

  // ── Task Management ─────────────────────────────────────────────────────

  /**
   * Send a task to the remote agent and wait for completion.
   * This is the primary interaction method.
   */
  async sendTask(params: {
    message: A2AMessage
    taskId?: string
    metadata?: Record<string, unknown>
  }): Promise<A2ATask> {
    const result = await this.jsonRpc('tasks/send', {
      id: params.taskId ?? randomUUID(),
      message: params.message,
      metadata: params.metadata,
    })
    return result as A2ATask
  }

  /**
   * Send a task and receive a stream of status updates via SSE.
   * Returns an async iterable of task status events.
   */
  async *sendTaskStreaming(params: {
    message: A2AMessage
    taskId?: string
    metadata?: Record<string, unknown>
  }): AsyncIterable<A2ATaskStatus> {
    const taskId = params.taskId ?? randomUUID()
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: taskId,
      method: 'tasks/sendSubscribe',
      params: {
        id: taskId,
        message: params.message,
        metadata: params.metadata,
      },
    })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs * 5) // Longer timeout for streaming

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { ...this.headers, Accept: 'text/event-stream' },
        body,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`A2A streaming request failed: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body for streaming')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') return

            try {
              const event = JSON.parse(data) as { result?: { status?: A2ATaskStatus } }
              if (event.result?.status) {
                yield event.result.status
                if (
                  event.result.status.state === 'completed' ||
                  event.result.status.state === 'failed' ||
                  event.result.status.state === 'canceled'
                ) {
                  return
                }
              }
            } catch {
              // Skip malformed SSE events
            }
          }
        }
      }
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Get the current status of an existing task.
   */
  async getTask(taskId: string): Promise<A2ATask> {
    const result = await this.jsonRpc('tasks/get', { id: taskId })
    return result as A2ATask
  }

  /**
   * Cancel a running task.
   */
  async cancelTask(taskId: string): Promise<A2ATask> {
    const result = await this.jsonRpc('tasks/cancel', { id: taskId })
    return result as A2ATask
  }

  // ── YAAF Tool Integration ─────────────────────────────────────────────

  /**
   * Wrap this remote A2A agent as a YAAF Tool.
   *
   * The tool accepts a text message and returns the agent's response.
   * This enables any YAAF agent to call A2A agents as tools.
   *
   * @param toolName - Custom tool name. Default: derived from Agent Card name.
   */
  asTool(toolName?: string): Tool {
    const client = this

    return buildTool({
      name: toolName ?? `a2a_${this.url.replace(/[^a-z0-9]/gi, '_').slice(0, 30)}`,
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Message to send to the remote agent',
          },
        },
        required: ['message'],
      },
      maxResultChars: 50_000,
      describe: (input) =>
        `Send message to remote A2A agent: "${(input as Record<string, string>).message?.slice(0, 80)}"`,
      async call(input: Record<string, unknown>) {
        const message = input.message as string
        const result = await client.sendTask({
          message: {
            role: 'user',
            parts: [{ text: message }],
          },
        })

        // Extract text from artifacts
        const texts: string[] = []
        if (result.artifacts) {
          for (const artifact of result.artifacts) {
            for (const part of artifact.parts) {
              if ('text' in part) texts.push(part.text)
            }
          }
        }

        // Also check status message
        if (result.status.message) {
          for (const part of result.status.message.parts) {
            if ('text' in part) texts.push(part.text)
          }
        }

        return {
          data: {
            taskId: result.id,
            status: result.status.state,
            response: texts.join('\n') || '(no text response)',
          },
        }
      },
    })
  }

  /**
   * Create multiple tools from an Agent Card's skills.
   * Each skill becomes a separate tool.
   */
  async asTools(): Promise<Tool[]> {
    const card = await this.fetchAgentCard()
    const skills = card.skills ?? [{ id: 'default', name: card.name }]

    return skills.map((skill) => {
      const client = this
      return buildTool({
        name: `a2a_${skill.id}`.replace(/[^a-z0-9_]/gi, '_'),
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: skill.description ?? `Send message to ${skill.name}`,
            },
          },
          required: ['message'],
        },
        maxResultChars: 50_000,
        describe: () => skill.description ?? `${skill.name} via A2A`,
        async call(input: Record<string, unknown>) {
          const result = await client.sendTask({
            message: {
              role: 'user',
              parts: [{ text: input.message as string }],
              metadata: { skillId: skill.id },
            },
          })

          const texts: string[] = []
          for (const artifact of result.artifacts ?? []) {
            for (const part of artifact.parts) {
              if ('text' in part) texts.push(part.text)
            }
          }

          return { data: { taskId: result.id, status: result.status.state, response: texts.join('\n') } }
        },
      })
    })
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private async jsonRpc(method: string, params: Record<string, unknown>): Promise<unknown> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: randomUUID(),
      method,
      params,
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`A2A request failed: ${response.status} ${response.statusText}`)
      }

      const json = (await response.json()) as JsonRpcResponse
      if (json.error) {
        throw new Error(`A2A error [${json.error.code}]: ${json.error.message}`)
      }

      return json.result
    } finally {
      clearTimeout(timer)
    }
  }

  private async httpGet(path: string): Promise<unknown> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${this.url}${path}`, {
        method: 'GET',
        headers: this.headers,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`A2A GET ${path} failed: ${response.status}`)
      }

      return await response.json()
    } finally {
      clearTimeout(timer)
    }
  }
}

// ── A2A Server ──────────────────────────────────────────────────────────────

export type A2AServerConfig = {
  /** Agent display name. */
  name: string
  /** Agent description. */
  description?: string
  /** Agent version. */
  version?: string
  /** Skills this agent supports. */
  skills?: AgentSkill[]
  /** Port to listen on. Default: 4000. */
  port?: number
  /** Hostname to bind to. Default: '0.0.0.0'. */
  host?: string
  /** Whether to support SSE streaming. Default: true. */
  streaming?: boolean
  /** Bearer tokens accepted for authentication. Empty = no auth. */
  acceptedTokens?: string[]
  /** Called when a task is received (for logging). */
  onTask?: (task: { id: string; message: string }) => void
}

/** Minimal agent interface for the A2A server. */
export type A2AAgent = {
  run(input: string, signal?: AbortSignal): Promise<string>
}

/**
 * A2AServer — expose a YAAF agent as an A2A-compliant endpoint.
 *
 * Implements:
 * - `GET /.well-known/agent.json` — Agent Card discovery
 * - `POST /` — JSON-RPC 2.0 handler for tasks/send, tasks/get, tasks/cancel
 * - SSE streaming for tasks/sendSubscribe
 */
export class A2AServer {
  private readonly agent: A2AAgent
  private readonly config: Required<Omit<A2AServerConfig, 'onTask' | 'acceptedTokens'>> & Pick<A2AServerConfig, 'onTask' | 'acceptedTokens'>
  private readonly tasks = new Map<string, A2ATask>()
  /** X-12 fix: cap stored tasks to prevent OOM via unbounded map growth */
  private static readonly MAX_TASKS = 10_000
  /** X-13 fix: max request body size (10 MB) */
  private static readonly MAX_BODY_BYTES = 10 * 1024 * 1024
  private server: ReturnType<typeof createHttpServer> | null = null

  constructor(agent: A2AAgent, config: A2AServerConfig) {
    this.agent = agent
    this.config = {
      name: config.name,
      description: config.description ?? '',
      version: config.version ?? '1.0.0',
      skills: config.skills ?? [],
      port: config.port ?? 4000,
      host: config.host ?? '0.0.0.0',
      streaming: config.streaming ?? true,
      acceptedTokens: config.acceptedTokens,
      onTask: config.onTask,
    }
  }

  /** Build the Agent Card for discovery. */
  getAgentCard(): AgentCard {
    const baseUrl = `http://${this.config.host === '0.0.0.0' ? 'localhost' : this.config.host}:${this.config.port}`
    return {
      name: this.config.name,
      description: this.config.description,
      url: baseUrl,
      version: this.config.version,
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
      skills: this.config.skills,
      capabilities: {
        streaming: this.config.streaming,
        pushNotifications: false,
        stateTransitionHistory: true,
      },
      ...(this.config.acceptedTokens?.length
        ? { authentication: { schemes: [{ scheme: 'bearer' }] } }
        : {}),
    }
  }

  /** Start the A2A server. */
  async start(): Promise<{ url: string; port: number; close: () => Promise<void> }> {
    const { port, host } = this.config

    this.server = createHttpServer(async (req, res) => {
      try {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

        if (req.method === 'OPTIONS') {
          res.writeHead(204)
          res.end()
          return
        }

        const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

        // Auth check
        if (this.config.acceptedTokens?.length) {
          const authHeader = req.headers.authorization
          const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
          if (!token || !this.config.acceptedTokens.includes(token)) {
            this.sendJsonRpcError(res, null, -32000, 'Unauthorized', 401)
            return
          }
        }

        // Agent Card discovery
        if (url.pathname === '/.well-known/agent.json' && req.method === 'GET') {
          this.sendJson(res, 200, this.getAgentCard())
          return
        }

        // Health check
        if (url.pathname === '/health' && req.method === 'GET') {
          this.sendJson(res, 200, { status: 'ok', agent: this.config.name })
          return
        }

        // JSON-RPC handler
        if (req.method === 'POST') {
          const body = await this.readBody(req)
          const rpc = JSON.parse(body) as JsonRpcRequest

          if (rpc.jsonrpc !== '2.0' || !rpc.method) {
            this.sendJsonRpcError(res, rpc.id ?? null, -32600, 'Invalid JSON-RPC request')
            return
          }

          await this.handleRpc(rpc, req, res)
          return
        }

        this.sendJson(res, 404, { error: 'Not found' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (!res.headersSent) {
          this.sendJsonRpcError(res, null, -32603, `Internal error: ${message}`)
        }
      }
    })

    return new Promise((resolve) => {
      this.server!.listen(port, host, () => {
        const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`
        console.log(`\n🤝 A2A Server "${this.config.name}" listening on ${url}`)
        console.log(`   Agent Card: ${url}/.well-known/agent.json\n`)
        resolve({
          url,
          port,
          close: () => this.stop(),
        })
      })
    })
  }

  /** Stop the A2A server. */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) { resolve(); return }
      this.server.close((err) => (err ? reject(err) : resolve()))
      this.server = null
    })
  }

  // ── RPC Dispatch ────────────────────────────────────────────────────────

  private async handleRpc(rpc: JsonRpcRequest, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const params = rpc.params ?? {}

    switch (rpc.method) {
      case 'tasks/send':
        await this.handleTaskSend(rpc.id, params, res)
        break

      case 'tasks/sendSubscribe':
        await this.handleTaskSendSubscribe(rpc.id, params, res)
        break

      case 'tasks/get':
        this.handleTaskGet(rpc.id, params, res)
        break

      case 'tasks/cancel':
        this.handleTaskCancel(rpc.id, params, res)
        break

      default:
        this.sendJsonRpcError(res, rpc.id, -32601, `Method not found: ${rpc.method}`)
    }
  }

  private async handleTaskSend(
    rpcId: string | number,
    params: Record<string, unknown>,
    res: ServerResponse,
  ): Promise<void> {
    const taskId = (params.id as string) ?? randomUUID()
    const message = params.message as A2AMessage | undefined

    if (!message?.parts?.length) {
      this.sendJsonRpcError(res, rpcId, -32602, 'Missing or empty message.parts')
      return
    }

    // Extract text from message parts
    const inputText = message.parts
      .filter((p): p is { text: string } => 'text' in p)
      .map((p) => p.text)
      .join('\n')

    // Create task record (X-12 fix: evict oldest if at capacity)
    if (this.tasks.size >= A2AServer.MAX_TASKS) {
      const oldestKey = this.tasks.keys().next().value
      if (oldestKey) this.tasks.delete(oldestKey)
    }
    const task: A2ATask = {
      id: taskId,
      status: { state: 'working', timestamp: new Date().toISOString() },
      history: [message],
      artifacts: [],
    }
    this.tasks.set(taskId, task)
    this.config.onTask?.({ id: taskId, message: inputText })

    try {
      // Run the agent
      const result = await this.agent.run(inputText)

      // Update task
      const agentMessage: A2AMessage = {
        role: 'agent',
        parts: [{ text: result }],
      }

      task.status = {
        state: 'completed',
        message: agentMessage,
        timestamp: new Date().toISOString(),
      }
      task.history!.push(agentMessage)
      task.artifacts = [{ parts: [{ text: result }] }]

      this.sendJsonRpcResult(res, rpcId, task)
    } catch (err) {
      // X-14 fix: sanitize error message — never expose internal details to remote agents
      const safeMessage = err instanceof Error
        ? err.message.replace(/\/[^\s]+/g, '[path]').slice(0, 200)
        : 'Internal agent error'
      task.status = {
        state: 'failed',
        message: {
          role: 'agent',
          parts: [{ text: safeMessage }],
        },
        timestamp: new Date().toISOString(),
      }
      this.sendJsonRpcResult(res, rpcId, task)
    }
  }

  private async handleTaskSendSubscribe(
    rpcId: string | number,
    params: Record<string, unknown>,
    res: ServerResponse,
  ): Promise<void> {
    const taskId = (params.id as string) ?? randomUUID()
    const message = params.message as A2AMessage | undefined

    if (!message?.parts?.length) {
      this.sendJsonRpcError(res, rpcId, -32602, 'Missing or empty message.parts')
      return
    }

    const inputText = message.parts
      .filter((p): p is { text: string } => 'text' in p)
      .map((p) => p.text)
      .join('\n')

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    const sendEvent = (data: unknown) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // Send initial working status
    const task: A2ATask = {
      id: taskId,
      status: { state: 'working', timestamp: new Date().toISOString() },
      history: [message],
    }
    this.tasks.set(taskId, task)

    sendEvent({ jsonrpc: '2.0', id: rpcId, result: { id: taskId, status: task.status } })

    try {
      const result = await this.agent.run(inputText)

      const agentMessage: A2AMessage = { role: 'agent', parts: [{ text: result }] }
      task.status = { state: 'completed', message: agentMessage, timestamp: new Date().toISOString() }
      task.artifacts = [{ parts: [{ text: result }] }]
      task.history!.push(agentMessage)

      sendEvent({ jsonrpc: '2.0', id: rpcId, result: { id: taskId, status: task.status, artifacts: task.artifacts } })
    } catch (err) {
      task.status = {
        state: 'failed',
        message: { role: 'agent', parts: [{ text: err instanceof Error ? err.message : String(err) }] },
        timestamp: new Date().toISOString(),
      }
      sendEvent({ jsonrpc: '2.0', id: rpcId, result: { id: taskId, status: task.status } })
    }

    res.write('data: [DONE]\n\n')
    res.end()
  }

  private handleTaskGet(rpcId: string | number, params: Record<string, unknown>, res: ServerResponse): void {
    const taskId = params.id as string
    const task = this.tasks.get(taskId)
    if (!task) {
      this.sendJsonRpcError(res, rpcId, -32001, `Task not found: ${taskId}`)
      return
    }
    this.sendJsonRpcResult(res, rpcId, task)
  }

  private handleTaskCancel(rpcId: string | number, params: Record<string, unknown>, res: ServerResponse): void {
    const taskId = params.id as string
    const task = this.tasks.get(taskId)
    if (!task) {
      this.sendJsonRpcError(res, rpcId, -32001, `Task not found: ${taskId}`)
      return
    }
    task.status = { state: 'canceled', timestamp: new Date().toISOString() }
    this.sendJsonRpcResult(res, rpcId, task)
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    const body = JSON.stringify(data)
    res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
    res.end(body)
  }

  private sendJsonRpcResult(res: ServerResponse, id: string | number, result: unknown): void {
    this.sendJson(res, 200, { jsonrpc: '2.0', id, result })
  }

  private sendJsonRpcError(res: ServerResponse, id: string | number | null, code: number, message: string, httpStatus = 200): void {
    this.sendJson(res, httpStatus, { jsonrpc: '2.0', id, error: { code, message } })
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      let totalBytes = 0
      req.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length
        // X-13 fix: reject oversized request bodies before OOM
        if (totalBytes > A2AServer.MAX_BODY_BYTES) {
          req.destroy()
          reject(new Error(`Request body exceeds ${A2AServer.MAX_BODY_BYTES} byte limit`))
          return
        }
        chunks.push(chunk)
      })
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
      req.on('error', reject)
    })
  }
}

// ── Factory helpers ────────────────────────────────────────────────────────

/**
 * Connect to a remote A2A agent and return a YAAF tool for it.
 *
 * @example
 * ```ts
 * const tool = a2aTool('https://weather-agent.example.com');
 * const agent = new Agent({ tools: [tool] });
 * ```
 */
export function a2aTool(url: string, config?: Omit<A2AClientConfig, 'url'>): Tool {
  return new A2AClient({ url, ...config }).asTool()
}

/**
 * Expose a YAAF agent as an A2A server.
 *
 * @example
 * ```ts
 * const handle = await serveA2A(myAgent, { name: 'My Agent', port: 4000 });
 * // handle.close() to stop
 * ```
 */
export async function serveA2A(
  agent: A2AAgent,
  config: A2AServerConfig,
): Promise<{ url: string; port: number; close: () => Promise<void> }> {
  const server = new A2AServer(agent, config)
  return server.start()
}
