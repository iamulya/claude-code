/**
 * Plugin & Adapter Architecture
 *
 * The YAAF framework uses a plugin system where every integration
 * implements one or more well-defined adapter interfaces. This ensures:
 *
 * 1. **Swappable backends** — Switch from file-based memory to Honcho
 *    by changing one line, not rewriting your agent
 * 2. **Composable capabilities** — Combine adapters freely (Honcho memory
 *    + Camoufox browser + custom file system)
 * 3. **Testability** — Mock any adapter for unit testing
 * 4. **Discoverability** — Plugins declare their capabilities upfront
 *
 * ## Architecture
 *
 * ```
 *                    ┌──────────────┐
 *                    │  PluginHost  │
 *                    │  (Registry)  │
 *                    └──────┬───────┘
 *                           │
 *          ┌────────────────┼─────────────────┐
 *          │                │                 │
 *    ┌─────▼─────┐  ┌──────▼──────┐  ┌───────▼──────┐
 *    │  Plugin A  │  │  Plugin B   │  │  Plugin C    │
 *    │implements: │  │implements:  │  │implements:   │
 *    │MemoryAdapt │  │BrowserAdapt │  │MemoryAdapt   │
 *    │            │  │ToolProvider │  │FileSysAdapt  │
 *    └────────────┘  └─────────────┘  └──────────────┘
 * ```
 *
 * ## Adapter Interfaces
 *
 * Each adapter interface defines a contract for a specific capability:
 *
 * | Interface           | Purpose                                          |
 * |---------------------|--------------------------------------------------|
 * | `MemoryAdapter`     | Persistent memory (store, query, search)         |
 * | `BrowserAdapter`    | Web automation (navigate, interact, scrape)      |
 * | `FileSystemAdapter` | Virtual filesystem for agent state               |
 * | `ToolProvider`      | Dynamically provides tools to agents             |
 * | `ContextProvider`   | Injects context sections per turn                |
 * | `LLMAdapter`        | Full LLM adapter — extends ChatModel for runner  |
 * | `McpAdapter`        | Model Context Protocol server connection + tools |
 *
 * @module plugin
 */

import type { ChatModel, ChatMessage, ChatResult, ToolSchema } from '../agents/runner.js'

// ── Plugin Lifecycle ─────────────────────────────────────────────────────────

/**
 * Capability keys that a plugin can declare.
 * Used by the PluginHost to route requests to the right plugin.
 */
export type PluginCapability =
  | 'memory'
  | 'browser'
  | 'filesystem'
  | 'tool_provider'
  | 'context_provider'
  | 'llm'
  | 'mcp'

/**
 * Base plugin interface.
 * Every plugin must implement this. Adapter interfaces are opt-in.
 */
export interface Plugin {
  /** Unique plugin name (e.g., 'honcho', 'camoufox', 'agentfs') */
  readonly name: string

  /** Semver version string */
  readonly version: string

  /** Capabilities this plugin provides */
  readonly capabilities: readonly PluginCapability[]

  /**
   * Initialize the plugin. Called once when registered with the PluginHost.
   * Use this for async setup (connecting to APIs, spawning processes, etc.)
   */
  initialize?(): Promise<void>

  /**
   * Graceful shutdown. Called when the PluginHost is destroyed.
   * Use this to close connections, kill subprocesses, flush buffers.
   */
  destroy?(): Promise<void>

  /**
   * Health check. Returns true if the plugin is operational.
   * Called periodically by the PluginHost for monitoring.
   */
  healthCheck?(): Promise<boolean>
}

// ── Adapter Interfaces ───────────────────────────────────────────────────────

/**
 * Memory Adapter — abstracts persistent memory storage.
 *
 * Implementations:
 * - Built-in `MemoryStore` (file-based, local)
 * - `HonchoMemoryAdapter` (cloud-hosted, reasoning-powered)
 * - Custom: Redis, Postgres, vector DB, etc.
 */
export interface MemoryAdapter extends Plugin {
  /** Save a memory entry */
  save(entry: MemoryEntry): Promise<string>

  /** Read a memory by ID or filename */
  read(id: string): Promise<MemoryEntryWithContent | null>

  /** Remove a memory */
  remove(id: string): Promise<boolean>

  /** List all memory headers (lightweight, no content) */
  list(filter?: MemoryFilter): Promise<MemoryEntryMeta[]>

  /** Search memories by relevance to a query */
  search(query: string, limit?: number): Promise<MemorySearchResult[]>

  /** Get the memory index (summary of all memories for system prompt) */
  getIndex(): Promise<string>

  /** Build the system prompt fragment for memory instructions */
  buildPrompt(): string
}

/** Entry to save */
export type MemoryEntry = {
  name: string
  description: string
  type: 'user' | 'feedback' | 'project' | 'reference'
  content: string
  scope?: 'private' | 'team'
  metadata?: Record<string, unknown>
}

/** Full entry with content */
export type MemoryEntryWithContent = MemoryEntry & {
  id: string
  createdAt: number
  updatedAt: number
}

/** Lightweight metadata for listing */
export type MemoryEntryMeta = {
  id: string
  name: string
  description: string
  type: string
  updatedAt: number
}

/** Filter for listing memories */
export type MemoryFilter = {
  type?: string
  scope?: 'private' | 'team'
  since?: number
}

/** Search result with relevance score */
export type MemorySearchResult = {
  entry: MemoryEntryMeta
  score: number
  snippet?: string
}

// ── Browser Adapter ──────────────────────────────────────────────────────────

/**
 * Browser Adapter — abstracts web automation.
 *
 * Implementations:
 * - `CamoufoxBrowserAdapter` (anti-detect Firefox)
 * - Custom: Puppeteer, Playwright, headless Chrome, etc.
 */
export interface BrowserAdapter extends Plugin {
  /** Start the browser */
  start(): Promise<void>

  /** Stop the browser */
  stop(): Promise<void>

  /** Whether the browser is currently running */
  readonly running: boolean

  /** Navigate to a URL and extract content */
  navigate(url: string, opts?: NavigateOptions): Promise<PageContent>

  /** Take a screenshot */
  screenshot(opts?: ScreenshotOptions): Promise<ScreenshotData>

  /** Click an element */
  click(selector: string): Promise<void>

  /** Type text into an element */
  type(selector: string, text: string): Promise<void>

  /** Scroll the page */
  scroll(direction: 'up' | 'down', amount?: number): Promise<void>

  /** Wait for an element to appear */
  waitForSelector(selector: string, timeoutMs?: number): Promise<boolean>

  /** Get the current page URL */
  getUrl(): Promise<string>

  /** Evaluate JavaScript in the page context */
  evaluate(expression: string): Promise<unknown>

  /**
   * Export browser capabilities as YAAF tools.
   * This is the bridge between the browser adapter and the tool system.
   */
  asTools(prefix?: string): import('../tools/tool.js').Tool[]
}

export type NavigateOptions = {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'
  extractHtml?: boolean
}

export type PageContent = {
  url: string
  title: string
  textContent: string
  html?: string
  statusCode: number
}

export type ScreenshotOptions = {
  fullPage?: boolean
  selector?: string
}

export type ScreenshotData = {
  data: string  // base64 PNG
  width: number
  height: number
}

// ── FileSystem Adapter ───────────────────────────────────────────────────────

/**
 * FileSystem Adapter — abstracts virtual filesystem for agents.
 *
 * Implementations:
 * - `AgentFSAdapter` (in-memory virtual FS)
 * - Custom: S3-backed, Git-backed, database-backed, etc.
 */
export interface FileSystemAdapter extends Plugin {
  /** Read a file's content */
  read(path: string): Promise<string | null>

  /** Write a file */
  write(path: string, content: string, agentId?: string): Promise<void>

  /** Check if a path exists */
  exists(path: string): Promise<boolean>

  /** Delete a file */
  remove(path: string, agentId?: string): Promise<boolean>

  /** List entries in a directory */
  list(path: string): Promise<FSEntryInfo[]>

  /** Create a directory */
  mkdir(path: string): Promise<void>

  /** Get a text representation of the filesystem for LLM context */
  toPrompt(path?: string): string

  /** Get filesystem stats */
  getStats(): FSStats
}

export type FSEntryInfo = {
  name: string
  path: string
  type: 'file' | 'directory' | 'tool' | 'symlink'
  size?: number
}

export type FSStats = {
  totalSize: number
  maxSize: number
  usagePercent: number
  fileCount: number
}

// ── Tool Provider ────────────────────────────────────────────────────────────

/**
 * Tool Provider — dynamically provides tools to agents.
 *
 * Unlike static tool registration, a ToolProvider can generate tools
 * at runtime based on context (e.g., browser adapter creates web tools
 * only when browsing is needed).
 */
export interface ToolProvider extends Plugin {
  /** Get all tools this provider offers */
  getTools(): import('../tools/tool.js').Tool[]

  /**
   * Optional: get tools filtered by context.
   * E.g., a database provider might return different tools
   * depending on which database is connected.
   */
  getToolsForContext?(context: Record<string, unknown>): import('../tools/tool.js').Tool[]
}

// ── Context Provider ─────────────────────────────────────────────────────────

/**
 * Context Provider — injects context sections into the LLM prompt.
 *
 * Called at the start of each turn to gather context from external sources.
 * E.g., Honcho provides user representations, AgentFS provides the filesystem tree.
 */
export interface ContextProvider extends Plugin {
  /**
   * Get context sections to inject into the prompt.
   * @param query - The current user query / task description
   * @param existingContext - Already-gathered context (to avoid duplication)
   */
  getContextSections(
    query: string,
    existingContext?: Record<string, string>,
  ): Promise<ContextSection[]>
}

export type ContextSection = {
  key: string
  content: string
  placement: 'system' | 'user'
  priority?: number
}

// ── LLM Adapter ──────────────────────────────────────────────────────────────

/**
 * LLM Adapter — the full plugin contract for LLM providers.
 *
 * Extends `ChatModel` from the runner so that any model registered with
 * `PluginHost` can also be passed directly to `AgentRunner` / `Agent`
 * without any casting or wrapper.
 *
 * A model registered as an `LLMAdapter` plugin participates in:
 * - `PluginHost.getAdapter<LLMAdapter>('llm')` — retrieve the default model
 * - `PluginHost.healthCheckAll()` — verify API connectivity
 * - `PluginHost.destroyAll()` — graceful shutdown (close connections, flush)
 *
 * Implementations: OpenAIChatModel, GeminiChatModel
 */
export interface LLMAdapter extends Plugin, ChatModel {
  // ChatModel already provides:
  //   complete(params): Promise<ChatResult>

  /**
   * Simple text query — no tool schemas, no history management.
   * Wraps `complete()` with a single user message for convenience.
   */
  query(params: LLMQueryParams): Promise<LLMResponse>

  /**
   * Summarize a conversation into a compact string.
   * Used by ContextManager for context compaction.
   */
  summarize(messages: LLMMessage[], instructions?: string): Promise<string>

  /** Estimate token count for a string (rough, no network call). */
  estimateTokens(text: string): number

  /** Model identifier (e.g. 'gemini-2.0-flash', 'gpt-4o-mini') */
  readonly model: string

  /** Context window size in tokens */
  readonly contextWindowTokens: number

  /** Maximum output tokens per completion */
  readonly maxOutputTokens: number
}

export type LLMMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type LLMQueryParams = {
  messages: LLMMessage[]
  system?: string
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}

export type LLMResponse = {
  content: string
  tokensUsed: { input: number; output: number }
  model: string
  stopReason?: string
}

// ── MCP Adapter ──────────────────────────────────────────────────────────────

/**
 * MCP Adapter — first-class plugin type for Model Context Protocol servers.
 *
 * Extends `ToolProvider` so that `PluginHost.getAllTools()` automatically
 * includes all tools discovered from connected MCP servers — no extra wiring
 * required.
 *
 * The `capabilities` array MUST include both `'mcp'` and `'tool_provider'`.
 *
 * @example
 * ```ts
 * class MyMcpPlugin implements McpAdapter {
 *   readonly name = 'my-mcp'
 *   readonly version = '1.0.0'
 *   readonly capabilities = ['mcp', 'tool_provider'] as const
 *
 *   async initialize() { await this.connect() }
 *   async destroy()    { await this.disconnect() }
 *
 *   getTools()  { return this.tools }
 *   listServers() { return [{ name: 'my-server', transport: 'stdio', connected: true, toolCount: 3 }] }
 *   async callTool(toolName, args) { ... }
 * }
 * ```
 */
export interface McpAdapter extends ToolProvider {
  /**
   * List all connected MCP servers and their current status.
   * Used by PluginHost.getMcpServers() for introspection and health display.
   */
  listServers(): McpServerInfo[]

  /**
   * Call a specific tool on a specific server directly (bypass tool wrapping).
   * Useful for admin / debugging flows.
   */
  callTool(
    toolName: string,
    args: Record<string, unknown>,
    serverName?: string,
  ): Promise<string>

  /**
   * The transport type(s) this adapter connects to.
   * For display / filtering purposes.
   */
  readonly transports: ReadonlyArray<'stdio' | 'sse'>
}

/** Status snapshot of a single MCP server connection. */
export type McpServerInfo = {
  /** Server name as configured */
  name: string
  /** Transport type */
  transport: 'stdio' | 'sse'
  /** Whether the server is currently connected */
  connected: boolean
  /** Number of tools exposed by this server */
  toolCount: number
  /** Server URL (SSE) or command (stdio) */
  endpoint?: string
}

// ── Plugin Host ──────────────────────────────────────────────────────────────

/**
 * PluginHost — the central registry that manages all plugins.
 *
 * @example
 * ```ts
 * const host = new PluginHost();
 *
 * // Register plugins
 * await host.register(new HonchoPlugin({ apiKey: '...' }));
 * await host.register(new CamoufoxPlugin({ headless: true }));
 * await host.register(new AgentFSPlugin());
 *
 * // Get adapters by capability
 * const memory = host.getAdapter<MemoryAdapter>('memory');
 * const browser = host.getAdapter<BrowserAdapter>('browser');
 *
 * // Get all tools from all ToolProviders
 * const tools = host.getAllTools();
 *
 * // Get all context sections from all ContextProviders
 * const sections = await host.gatherContext('Fix the auth bug');
 *
 * // Graceful shutdown
 * await host.destroyAll();
 * ```
 */
export class PluginHost {
  private plugins = new Map<string, Plugin>()
  private adaptersByCapability = new Map<PluginCapability, Plugin[]>()

  /**
   * Register a plugin. Calls plugin.initialize() if defined.
   * Throws if a plugin with the same name is already registered.
   */
  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`)
    }

    // Initialize the plugin
    if (plugin.initialize) {
      await plugin.initialize()
    }

    this.plugins.set(plugin.name, plugin)

    // Index by capability
    for (const cap of plugin.capabilities) {
      if (!this.adaptersByCapability.has(cap)) {
        this.adaptersByCapability.set(cap, [])
      }
      this.adaptersByCapability.get(cap)!.push(plugin)
    }
  }

  /**
   * Unregister a plugin. Calls plugin.destroy() if defined.
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName)
    if (!plugin) return

    if (plugin.destroy) {
      await plugin.destroy()
    }

    this.plugins.delete(pluginName)

    // Remove from capability index
    for (const cap of plugin.capabilities) {
      const plugins = this.adaptersByCapability.get(cap)
      if (plugins) {
        const idx = plugins.indexOf(plugin)
        if (idx >= 0) plugins.splice(idx, 1)
      }
    }
  }

  /**
   * Get the first adapter for a capability.
   * Returns null if no plugin provides this capability.
   */
  getAdapter<T extends Plugin>(capability: PluginCapability): T | null {
    const plugins = this.adaptersByCapability.get(capability)
    return (plugins?.[0] as T) ?? null
  }

  /**
   * Get ALL adapters for a capability (when multiple plugins provide it).
   * Useful for fan-out queries (e.g., search across multiple memory backends).
   */
  getAdapters<T extends Plugin>(capability: PluginCapability): T[] {
    return (this.adaptersByCapability.get(capability) ?? []) as T[]
  }

  /** Get a plugin by name */
  getPlugin<T extends Plugin>(name: string): T | null {
    return (this.plugins.get(name) as T) ?? null
  }

  /** Check if a capability is available */
  hasCapability(capability: PluginCapability): boolean {
    const plugins = this.adaptersByCapability.get(capability)
    return !!plugins && plugins.length > 0
  }

  /** List all registered plugins */
  listPlugins(): Array<{
    name: string
    version: string
    capabilities: readonly PluginCapability[]
  }> {
    return [...this.plugins.values()].map(p => ({
      name: p.name,
      version: p.version,
      capabilities: p.capabilities,
    }))
  }

  /**
   * Collect all tools from all registered ToolProviders.
   *
   * MCP adapters are automatically included because they implement
   * `ToolProvider` (capabilities includes `'tool_provider'`).
   */
  getAllTools(): import('../tools/tool.js').Tool[] {
    const providers = this.getAdapters<ToolProvider>('tool_provider')
    const tools: import('../tools/tool.js').Tool[] = []
    for (const provider of providers) {
      tools.push(...provider.getTools())
    }
    return tools
  }

  /**
   * Get all tools from MCP adapters specifically.
   * Useful when you need to distinguish MCP tools from native tools.
   */
  getMcpTools(): import('../tools/tool.js').Tool[] {
    const adapters = this.getAdapters<McpAdapter>('mcp')
    const tools: import('../tools/tool.js').Tool[] = []
    for (const adapter of adapters) {
      tools.push(...adapter.getTools())
    }
    return tools
  }

  /**
   * Get status snapshots from all registered MCP adapters.
   * Useful for health dashboards and `/status` endpoints.
   */
  getMcpServers(): McpServerInfo[] {
    const adapters = this.getAdapters<McpAdapter>('mcp')
    const servers: McpServerInfo[] = []
    for (const adapter of adapters) {
      servers.push(...adapter.listServers())
    }
    return servers
  }

  /**
   * Get the registered LLM adapter as a `ChatModel` — ready to pass directly
   * to `new AgentRunner({ model: host.getLLMAdapter() })`.
   *
   * Returns null if no `LLMAdapter` is registered.
   */
  getLLMAdapter(): LLMAdapter | null {
    return this.getAdapter<LLMAdapter>('llm') ?? null
  }

  /**
   * Gather context from all registered ContextProviders.
   */
  async gatherContext(
    query: string,
    existingContext?: Record<string, string>,
  ): Promise<ContextSection[]> {
    const providers = this.getAdapters<ContextProvider>('context_provider')
    const sections: ContextSection[] = []
    for (const provider of providers) {
      const providerSections = await provider.getContextSections(
        query,
        existingContext,
      )
      sections.push(...providerSections)
    }
    return sections.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }

  /**
   * Run health checks on all plugins.
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    for (const [name, plugin] of this.plugins) {
      if (plugin.healthCheck) {
        try {
          results.set(name, await plugin.healthCheck())
        } catch {
          results.set(name, false)
        }
      } else {
        results.set(name, true) // No healthCheck = assume healthy
      }
    }
    return results
  }

  /**
   * Gracefully shut down all plugins.
   */
  async destroyAll(): Promise<void> {
    const destroyPromises = [...this.plugins.values()]
      .filter(p => p.destroy)
      .map(p => p.destroy!())
    await Promise.allSettled(destroyPromises)
    this.plugins.clear()
    this.adaptersByCapability.clear()
  }
}
