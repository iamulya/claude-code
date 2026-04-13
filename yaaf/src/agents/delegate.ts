/**
 * Delegate Architecture — Named agent routing with session isolation.
 *
 * Manages multiple named agents, each with their own personality, skills,
 * and session scope. Incoming messages are routed to the appropriate agent
 * based on explicit mentions, workspace context, or routing rules.
 *
 * Inspired by OpenClaw's multi-agent routing, presence, and delegate architecture.
 *
 * @example
 * ```ts
 * const router = new AgentRouter();
 *
 * router.register({
 *   id: 'writer',
 *   agent: writerRunner,
 *   skills: ['grammar', 'style'],
 *   routes: [{ match: /write|essay|article/i }],
 * });
 *
 * router.register({
 *   id: 'coder',
 *   agent: coderRunner,
 *   skills: ['code', 'test'],
 *   routes: [{ match: /code|bug|function/i }],
 * });
 *
 * // Route a message
 * const agent = router.route(inboundMessage);
 * const response = await agent.run(inboundMessage.text);
 * ```
 *
 * @module agents/delegate
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type AgentEntry = {
  /** Unique agent identifier */
  id: string
  /** The agent runner instance */
  agent: { run(input: string, signal?: AbortSignal): Promise<string> }
  /** Human-readable display name */
  displayName?: string
  /** Allowed skill names (empty = all, undefined = inherit defaults) */
  skills?: string[]
  /** Routing rules — checked in order, first match wins */
  routes?: RoutingRule[]
  /**
   * Session isolation scope.
   * - 'shared': all messages share one session
   * - 'per-sender': isolated by sender ID
   * - 'per-channel': isolated by channel
   * - 'per-channel-sender': isolated by channel + sender (default)
   */
  sessionScope?: SessionScope
  /** Whether this agent is currently available */
  active?: boolean
  /** Agent metadata (for UI/debugging) */
  meta?: Record<string, unknown>
}

export type SessionScope = 'shared' | 'per-sender' | 'per-channel' | 'per-channel-sender'

export type RoutingRule = {
  /** Regex pattern to match against message text */
  match?: RegExp
  /** Match messages from specific channels */
  channels?: string[]
  /** Match messages from specific senders */
  senders?: string[]
  /**
   * Routing priority (higher = checked first).
   * Default: 0. Use to override when multiple agents match.
   */
  priority?: number
}

/** Minimal message shape for routing decisions */
export type RoutableMessage = {
  text: string
  senderId?: string
  channelName?: string
  groupId?: string
  /** Explicit @mention of an agent (e.g., "@coder fix this bug") */
  mentionedAgent?: string
}

export type PresenceInfo = {
  id: string
  displayName: string
  active: boolean
  lastActivity?: number
}

// ── Router ───────────────────────────────────────────────────────────────────

export class AgentRouter {
  private agents: Map<string, AgentEntry> = new Map()
  private defaultAgentId: string | null = null
  private lastActivity: Map<string, number> = new Map()

  /**
   * Register a named agent.
   */
  register(entry: AgentEntry): this {
    this.agents.set(entry.id, { active: true, ...entry })
    return this
  }

  /**
   * Unregister an agent.
   */
  unregister(id: string): boolean {
    return this.agents.delete(id)
  }

  /**
   * Set the default agent (fallback when no routing rule matches).
   */
  setDefault(id: string): this {
    if (!this.agents.has(id)) {
      throw new Error(`Agent "${id}" not registered`)
    }
    this.defaultAgentId = id
    return this
  }

  /**
   * Enable or disable an agent.
   */
  setActive(id: string, active: boolean): this {
    const entry = this.agents.get(id)
    if (entry) entry.active = active
    return this
  }

  /**
   * Route a message to the best-matching agent.
   * Returns the agent runner (or null if no match and no default).
   */
  route(message: RoutableMessage): AgentEntry | null {
    // 1. Explicit @mention has highest priority
    if (message.mentionedAgent) {
      const entry = this.agents.get(message.mentionedAgent)
      if (entry?.active) {
        this.recordActivity(entry.id)
        return entry
      }
    }

    // 2. Check routing rules (sorted by priority)
    const candidates: { entry: AgentEntry; priority: number }[] = []

    for (const entry of this.agents.values()) {
      if (!entry.active) continue
      if (!entry.routes || entry.routes.length === 0) continue

      for (const rule of entry.routes) {
        if (this.matchesRule(rule, message)) {
          candidates.push({
            entry,
            priority: rule.priority ?? 0,
          })
          break // One match per agent is enough
        }
      }
    }

    // Sort by priority (highest first)
    candidates.sort((a, b) => b.priority - a.priority)

    if (candidates.length > 0) {
      const winner = candidates[0]!.entry
      this.recordActivity(winner.id)
      return winner
    }

    // 3. Fall back to default
    if (this.defaultAgentId) {
      const defaultEntry = this.agents.get(this.defaultAgentId)
      if (defaultEntry?.active) {
        this.recordActivity(defaultEntry.id)
        return defaultEntry
      }
    }

    return null
  }

  /**
   * Get presence info for all agents.
   */
  presence(): PresenceInfo[] {
    return [...this.agents.values()].map(entry => ({
      id: entry.id,
      displayName: entry.displayName ?? entry.id,
      active: entry.active ?? true,
      lastActivity: this.lastActivity.get(entry.id),
    }))
  }

  /**
   * Get a specific agent by ID.
   */
  get(id: string): AgentEntry | undefined {
    return this.agents.get(id)
  }

  /**
   * List all registered agents.
   */
  list(): AgentEntry[] {
    return [...this.agents.values()]
  }

  /**
   * Resolve a session key for a message+agent pair.
   */
  resolveSessionKey(agentId: string, message: RoutableMessage): string {
    const entry = this.agents.get(agentId)
    const scope = entry?.sessionScope ?? 'per-channel-sender'

    switch (scope) {
      case 'shared':
        return `${agentId}:main`
      case 'per-sender':
        return `${agentId}:${message.senderId ?? 'unknown'}`
      case 'per-channel':
        return `${agentId}:${message.channelName ?? 'unknown'}`
      case 'per-channel-sender':
        return `${agentId}:${message.channelName ?? 'unknown'}:${message.senderId ?? 'unknown'}`
    }
  }

  private matchesRule(rule: RoutingRule, message: RoutableMessage): boolean {
    // Check text pattern
    if (rule.match && !rule.match.test(message.text)) return false

    // Check channel filter
    if (rule.channels && message.channelName) {
      if (!rule.channels.includes(message.channelName)) return false
    }

    // Check sender filter
    if (rule.senders && message.senderId) {
      if (!rule.senders.includes(message.senderId)) return false
    }

    return true
  }

  private recordActivity(id: string): void {
    this.lastActivity.set(id, Date.now())
  }
}
