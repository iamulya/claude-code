/**
 * Honcho Plugin — Cloud memory, reasoning, and user modeling
 *
 * Implements: MemoryAdapter + ContextProvider
 *
 * @example
 * ```ts
 * const host = new PluginHost();
 * await host.register(new HonchoPlugin({
 *   apiKey: process.env.HONCHO_API_KEY!,
 *   workspaceId: 'my-app',
 *   defaultPeerId: 'alice',
 * }));
 *
 * const memory = host.getAdapter<MemoryAdapter>('memory')!;
 * await memory.save({ name: 'User prefers dark mode', ... });
 *
 * // Or use Honcho-specific features directly
 * const honcho = host.getPlugin<HonchoPlugin>('honcho')!;
 * const insight = await honcho.chat('alice', 'What motivates this user?');
 * ```
 */

import type {
  PluginCapability,
  MemoryAdapter,
  ContextProvider,
  MemoryEntry,
  MemoryEntryWithContent,
  MemoryEntryMeta,
  MemoryFilter,
  MemorySearchResult,
  ContextSection,
} from '../plugin/types.js'
import { PluginBase } from '../plugin/base.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type HonchoConfig = {
  /** Honcho API key from app.honcho.dev */
  apiKey: string
  /** Base URL for the Honcho API (default: https://api.honcho.dev) */
  baseUrl?: string
  /** Workspace ID — top-level isolation unit */
  workspaceId: string
  /** Request timeout in ms (default: 30_000) */
  timeoutMs?: number
  /** Default peer ID for memory operations */
  defaultPeerId?: string
  /** Default session ID */
  defaultSessionId?: string
  /** Context token budget (default: 10_000) */
  contextTokens?: number
}

export type HonchoMessage = {
  peerId: string
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, unknown>
}

export type HonchoContextOpts = {
  summary?: boolean
  tokens?: number
  format?: 'openai' | 'raw'
}

export type HonchoSearchResult = {
  content: string
  score: number
  sessionId: string
  messageId: string
  metadata?: Record<string, unknown>
}

export type HonchoRepresentation = {
  peerId: string
  sessionId?: string
  content: string
  createdAt: string
  updatedAt: string
}

// ── HTTP Client ──────────────────────────────────────────────────────────────

async function honchoFetch(
  config: HonchoConfig,
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<unknown> {
  const url = `${config.baseUrl ?? 'https://api.honcho.dev'}${path}`
  const timeout = config.timeoutMs ?? 30_000

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Honcho API error ${response.status}: ${errorText}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

// ── Session Handle ───────────────────────────────────────────────────────────

export class HonchoSession {
  constructor(
    private config: HonchoConfig,
    public readonly sessionId: string,
    public readonly peers: string[],
  ) {}

  async addMessage(
    peerId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<{ messageId: string }> {
    const result = await honchoFetch(
      this.config,
      `/workspaces/${this.config.workspaceId}/sessions/${this.sessionId}/messages`,
      {
        method: 'POST',
        body: { peer_id: peerId, role, content, metadata },
        signal,
      },
    ) as { id: string }
    return { messageId: result.id }
  }

  async addMessages(messages: HonchoMessage[], signal?: AbortSignal): Promise<void> {
    await honchoFetch(
      this.config,
      `/workspaces/${this.config.workspaceId}/sessions/${this.sessionId}/messages/batch`,
      {
        method: 'POST',
        body: {
          messages: messages.map(m => ({
            peer_id: m.peerId, role: m.role, content: m.content, metadata: m.metadata,
          })),
        },
        signal,
      },
    )
  }

  async getContext(
    opts: HonchoContextOpts = {},
    signal?: AbortSignal,
  ): Promise<{ content: string; tokenCount?: number }> {
    const params = new URLSearchParams()
    if (opts.summary) params.set('summary', 'true')
    if (opts.tokens) params.set('tokens', String(opts.tokens))
    if (opts.format) params.set('format', opts.format)

    const result = await honchoFetch(
      this.config,
      `/workspaces/${this.config.workspaceId}/sessions/${this.sessionId}/context?${params}`,
      { signal },
    ) as { content: string; token_count?: number }
    return { content: result.content, tokenCount: result.token_count }
  }

  async getRepresentation(
    peerId: string,
    signal?: AbortSignal,
  ): Promise<HonchoRepresentation> {
    const result = await honchoFetch(
      this.config,
      `/workspaces/${this.config.workspaceId}/sessions/${this.sessionId}/representations/${peerId}`,
      { signal },
    ) as { peer_id: string; content: string; created_at: string; updated_at: string }
    return {
      peerId: result.peer_id,
      sessionId: this.sessionId,
      content: result.content,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    }
  }
}

// ── HonchoPlugin ─────────────────────────────────────────────────────────────

/**
 * Single-class Honcho integration.
 *
 * - Implements MemoryAdapter (plugin interface) for framework-level memory
 * - Implements ContextProvider (plugin interface) for auto-context injection
 * - Exposes Honcho-specific APIs (chat, search, sessions) directly
 */
export class HonchoPlugin extends PluginBase implements MemoryAdapter, ContextProvider {
  override readonly capabilities: readonly PluginCapability[] = ['memory', 'context_provider']

  private readonly config: HonchoConfig

  constructor(config: HonchoConfig) {
    super('honcho', ['memory', 'context_provider'])
    this.config = {
      ...config,
      baseUrl: config.baseUrl ?? 'https://api.honcho.dev',
      timeoutMs: config.timeoutMs ?? 30_000,
      contextTokens: config.contextTokens ?? 10_000,
    }
  }

  // ── Plugin Lifecycle ─────────────────────────────────────────────────────

  override async initialize(): Promise<void> {
    if (this.config.defaultPeerId) {
      try { await this.registerPeer(this.config.defaultPeerId) } catch { /* may exist */ }
    }
  }

  // destroy() provided by PluginBase

  override async healthCheck(): Promise<boolean> {
    try {
      if (this.config.defaultPeerId) {
        await this.searchMessages(this.config.defaultPeerId, 'health', 1)
      }
      return true
    } catch { return false }
  }

  // ── MemoryAdapter Implementation ─────────────────────────────────────────

  async save(entry: MemoryEntry): Promise<string> {
    const peerId = entry.metadata?.peerId as string ?? this.config.defaultPeerId ?? 'default'
    const sessionId = entry.metadata?.sessionId as string ?? this.config.defaultSessionId ?? 'default'
    const session = this.getSession(sessionId, [peerId])
    const result = await session.addMessage(peerId, 'user', [
      `[Memory: ${entry.type}] ${entry.name}`,
      entry.description,
      '---',
      entry.content,
    ].join('\n'))
    return result.messageId
  }

  async read(id: string): Promise<MemoryEntryWithContent | null> {
    const peerId = this.config.defaultPeerId ?? 'default'
    const results = await this.searchMessages(peerId, id, 1)
    if (results.length === 0) return null
    const r = results[0]!
    return {
      id: r.messageId, name: r.content.slice(0, 50),
      description: r.content.slice(0, 100), type: 'reference',
      content: r.content, createdAt: Date.now(), updatedAt: Date.now(),
    }
  }

  async remove(_id: string): Promise<boolean> { return false }

  async list(_filter?: MemoryFilter): Promise<MemoryEntryMeta[]> {
    const peerId = this.config.defaultPeerId ?? 'default'
    try {
      const results = await this.searchMessages(peerId, '*', 50)
      return results.map(r => ({
        id: r.messageId, name: r.content.slice(0, 50),
        description: r.content.slice(0, 100), type: 'reference', updatedAt: Date.now(),
      }))
    } catch { return [] }
  }

  async search(query: string, limit: number = 10): Promise<MemorySearchResult[]> {
    const peerId = this.config.defaultPeerId ?? 'default'
    const results = await this.searchMessages(peerId, query, limit)
    return results.map(r => ({
      entry: {
        id: r.messageId, name: r.content.slice(0, 50),
        description: r.content.slice(0, 100), type: 'reference', updatedAt: Date.now(),
      },
      score: r.score,
      snippet: r.content.slice(0, 200),
    }))
  }

  async getIndex(): Promise<string> {
    const peerId = this.config.defaultPeerId ?? 'default'
    try {
      return await this.getPeerContext(peerId, { tokens: this.config.contextTokens }) || 'No memory index available.'
    } catch { return 'No memory index available.' }
  }

  buildPrompt(): string {
    return [
      '# Memory (Honcho)',
      '',
      'Your memory is managed by Honcho, a cloud-based reasoning engine.',
      'Honcho automatically builds and maintains models of users, agents, and entities.',
      '',
      '## What Honcho tracks',
      '- User preferences, goals, and communication style',
      '- Session history and conversation context',
      '- Dynamic representations that update as interactions evolve',
    ].join('\n')
  }

  // ── ContextProvider Implementation ───────────────────────────────────────

  async getContextSections(
    _query: string,
    _existingContext?: Record<string, string>,
  ): Promise<ContextSection[]> {
    const peerId = this.config.defaultPeerId
    if (!peerId) return []

    try {
      const context = await this.getPeerContext(peerId, {
        tokens: this.config.contextTokens,
        sessionId: this.config.defaultSessionId,
      })
      if (context) {
        return [{ key: 'honcho_user_context', content: context, placement: 'system', priority: 15 }]
      }
    } catch { /* non-fatal */ }

    return []
  }

  // ── Honcho-Specific APIs (not part of adapter interfaces) ────────────────

  async registerPeer(
    peerId: string,
    metadata?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<void> {
    await honchoFetch(this.config, `/workspaces/${this.config.workspaceId}/peers`, {
      method: 'POST', body: { peer_id: peerId, metadata }, signal,
    })
  }

  async createSession(
    peerId: string,
    sessionId: string,
    metadata?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<HonchoSession> {
    await honchoFetch(this.config, `/workspaces/${this.config.workspaceId}/sessions`, {
      method: 'POST', body: { session_id: sessionId, peer_ids: [peerId], metadata }, signal,
    })
    return new HonchoSession(this.config, sessionId, [peerId])
  }

  getSession(sessionId: string, peers: string[] = []): HonchoSession {
    return new HonchoSession(this.config, sessionId, peers)
  }

  /** Ask Honcho about a peer in natural language */
  async chat(peerId: string, question: string, signal?: AbortSignal): Promise<string> {
    const result = await honchoFetch(
      this.config,
      `/workspaces/${this.config.workspaceId}/peers/${peerId}/chat`,
      { method: 'POST', body: { query: question }, signal },
    ) as { response: string }
    return result.response
  }

  /** Semantic search across a peer's interaction history */
  async searchMessages(
    peerId: string,
    query: string,
    limit: number = 10,
    signal?: AbortSignal,
  ): Promise<HonchoSearchResult[]> {
    const result = await honchoFetch(
      this.config,
      `/workspaces/${this.config.workspaceId}/peers/${peerId}/search`,
      { method: 'POST', body: { query, limit }, signal },
    ) as { results: Array<{
      content: string; score: number; session_id: string;
      message_id: string; metadata?: Record<string, unknown>
    }> }
    return result.results.map(r => ({
      content: r.content, score: r.score, sessionId: r.session_id,
      messageId: r.message_id, metadata: r.metadata,
    }))
  }

  /** Get a context string for a peer, ready for the ContextManager */
  async getPeerContext(
    peerId: string,
    opts: { tokens?: number; sessionId?: string } = {},
    signal?: AbortSignal,
  ): Promise<string> {
    const sections: string[] = []

    try {
      const repr = await honchoFetch(
        this.config,
        `/workspaces/${this.config.workspaceId}/peers/${peerId}/representation`,
        { signal },
      ) as { content: string }
      if (repr.content) sections.push(`## User Profile (via Honcho)\n${repr.content}`)
    } catch { /* representation may not exist */ }

    if (opts.sessionId) {
      try {
        const session = this.getSession(opts.sessionId)
        const ctx = await session.getContext({ summary: true, tokens: opts.tokens }, signal)
        if (ctx.content) sections.push(`## Session Summary\n${ctx.content}`)
      } catch { /* session may not exist */ }
    }

    return sections.join('\n\n') || ''
  }
}
