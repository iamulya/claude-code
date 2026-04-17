/**
 * Plugin & Adapter Architecture
 *
 * The YAAF framework uses a plugin system where every integration
 * implements one or more well-defined adapter interfaces. This ensures:
 *
 * 1. **Swappable backends** — Switch from file-based memory to Honcho,
 * from the default JSONL session store to Redis, or from the built-in
 * truncation strategy to a custom semantic compactor — by registering
 * one plugin, not rewriting your agent.
 * 2. **Composable capabilities** — Combine adapters freely (Honcho memory
 * + Camoufox browser + custom file system + KB linter rules).
 * 3. **Testability** — Mock any adapter for unit testing.
 * 4. **Discoverability** — Plugins declare their capabilities upfront;
 * the `PluginHost` routes requests to the right adapter automatically.
 *
 * ## Architecture
 *
 * ```
 * ┌──────────────────┐
 * │ PluginHost │
 * │ (central registry│
 * │ & capability │
 * │ index) │
 * └────────┬─────────┘
 * │
 * ┌──────────────────────┼───────────────────────┐
 * │ │ │
 * ┌─────▼──────┐ ┌───────▼──────┐ ┌─────────▼────────┐
 * │ Plugin A │ │ Plugin B │ │ Plugin C │
 * │ capabilities│ │ capabilities │ │ capabilities │
 * │ - memory │ │ - browser │ │ - memory │
 * │ │ │ - tool_prov │ │ - context_prov │
 * │ │ │ - context_prov │ - skill_provider │
 * └────────────┘ └──────────────┘ └──────────────────┘
 * ```
 *
 * ## Adapter Interfaces
 *
 * | Interface | Capability | Purpose |
 * |------------------------|--------------------|---------------------------------------------------|
 * | `MemoryAdapter` | `memory` | Persistent memory (store, query, search) |
 * | `BrowserAdapter` | `browser` | Web automation (navigate, interact, scrape) |
 * | `FileSystemAdapter` | `filesystem` | Virtual filesystem for agent state |
 * | `ToolProvider` | `tool_provider` | Dynamically contributes tools to every agent turn |
 * | `ContextProvider` | `context_provider` | Injects context sections into the system prompt |
 * | `LLMAdapter` | `llm` | Full LLM backend — model, pricing, health check |
 * | `SecurityAdapter` | `security` | Pre/post-call guardrails (allow, block, modify) |
 * | `ObservabilityAdapter` | `observability` | Logs, metrics, spans for LLM and tool events |
 * | `NotificationAdapter` | `notification` | Fan-out alerts (email, Slack, webhook, PagerDuty) |
 * | `IngesterAdapter` | `ingester` | Document ingestion pipeline (PDF, HTML, etc.) |
 * | `McpAdapter` | `mcp` | MCP server connection + automatic tool bridging |
 * | `CompactionAdapter` | `compaction` | Custom context compaction (replaces truncate/LLM) |
 * | `SkillProviderAdapter` | `skill_provider` | Dynamic skill injection (API-fetched, per-user) |
 * | `SessionAdapter` | `session` | Swappable session persistence (Redis, Postgres…) |
 * | `IdentityAdapter` | `identity` | Resolve user identity from HTTP requests (JWT…) |
 * | `LinterRuleAdapter` | `linter_rule` | Extensible KB lint rules without forking checks |
 * | `SandboxBackendAdapter`| `sandbox_backend` | External tool-execution sandbox (Firecracker, …) |
 *
 * ## Quick Start
 *
 * ```ts
 * import { PluginHost, Agent } from 'yaaf'
 * import { HonchoPlugin } from 'yaaf/honcho'
 * import { CamoufoxPlugin } from 'yaaf/camoufox'
 *
 * const agent = await Agent.create({
 * model: 'gpt-4o',
 * plugins: [
 * new HonchoPlugin({ apiKey: process.env.HONCHO_KEY! }),
 * new CamoufoxPlugin({ headless: true }),
 * ],
 * })
 * ```
 *
 * @module plugin
 */

import type { ChatModel, ChatMessage, ChatResult, ToolSchema } from "../agents/runner.js";
import type { TrustPolicy } from "../security/trustPolicy.js";

// ── Plugin Lifecycle ─────────────────────────────────────────────────────────

/**
 * Capability keys that a plugin can declare.
 *
 * A plugin may declare multiple capabilities (e.g., `['browser', 'tool_provider',
 * 'context_provider']`). The `PluginHost` maintains an index keyed by capability
 * so lookups are O(1) without scanning all registered plugins.
 *
 * ### Core capabilities
 * - `memory` — Implements `MemoryAdapter` (store, query, retrieve memories)
 * - `browser` — Implements `BrowserAdapter` (navigate, click, screenshot)
 * - `filesystem` — Implements `FileSystemAdapter` (read, write, list, watch)
 * - `tool_provider` — Implements `ToolProvider` (contributes `Tool[]` to every run)
 * - `context_provider` — Implements `ContextProvider` (injects context sections per turn)
 * - `llm` — Implements `LLMAdapter` (full model: complete, stream, pricing)
 * - `mcp` — Implements `McpAdapter` (MCP server bridge + tool auto-discovery)
 *
 * ### Safety & observability capabilities
 * - `security` — Implements `SecurityAdapter` (pre/post-call guardrails)
 * - `observability` — Implements `ObservabilityAdapter` (logs, metrics, spans)
 * - `notification` — Implements `NotificationAdapter` (alerts fan-out)
 * - `ingester` — Implements `IngesterAdapter` (document ingestion pipeline)
 *
 * ### Phase 2 extension capabilities
 * - `compaction` — Implements `CompactionAdapter` (custom ContextManager strategy)
 * - `skill_provider` — Implements `SkillProviderAdapter` (dynamic skill injection)
 * - `session` — Implements `SessionAdapter` (swappable conversation persistence)
 * - `identity` — Implements `IdentityAdapter` (user identity resolution from requests)
 * - `linter_rule` — Implements `LinterRuleAdapter` (extra KB lint rules)
 */
export type PluginCapability =
  // ── Core ──────────────────────────────────────────────────────────────────
  | "memory" // MemoryAdapter
  | "browser" // BrowserAdapter
  | "filesystem" // FileSystemAdapter
  | "tool_provider" // ToolProvider
  | "context_provider" // ContextProvider
  | "llm" // LLMAdapter
  | "mcp" // McpAdapter
  // ── Safety & observability ────────────────────────────────────────────────
  | "security" // SecurityAdapter
  | "observability" // ObservabilityAdapter
  | "notification" // NotificationAdapter
  | "ingester" // IngesterAdapter
  // ── extension points ─────────────────────────────────────────────
  | "compaction" // CompactionAdapter — custom context compaction strategy
  | "skill_provider" // SkillProviderAdapter — dynamic skill injection
  | "session" // SessionAdapter — swappable conversation persistence
  | "identity" // IdentityAdapter — user identity resolution from requests
  | "linter_rule" // LinterRuleAdapter — extra KB lint rules
  // ── Multi-agent & memory ──────────────────────────────────────────────────
  | "ipc" // IPCAdapter — swappable inter-agent message transport (S2-A)
  | "vectorstore" // VectorStoreAdapter — semantic memory retrieval (S3-A)
  | "sandbox_backend"; // SandboxBackendAdapter — external tool execution runtime (Firecracker, gVisor)

/**
 * Base plugin interface.
 * Every plugin must implement this. Adapter interfaces are opt-in.
 */
export interface Plugin {
  /** Unique plugin name (e.g., 'honcho', 'camoufox', 'agentfs') */
  readonly name: string;

  /** Semver version string */
  readonly version: string;

  /** Capabilities this plugin provides */
  readonly capabilities: readonly PluginCapability[];

  /**
   * Initialize the plugin. Called once when registered with the PluginHost.
   * Use this for async setup (connecting to APIs, spawning processes, etc.)
   */
  initialize?(): Promise<void>;

  /**
   * Graceful shutdown. Called when the PluginHost is destroyed.
   * Use this to close connections, kill subprocesses, flush buffers.
   */
  destroy?(): Promise<void>;

  /**
   * Health check. Returns true if the plugin is operational.
   * Called periodically by the PluginHost for monitoring.
   */
  healthCheck?(): Promise<boolean>;
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
  save(entry: MemoryEntry): Promise<string>;

  /** Read a memory by ID or filename */
  read(id: string): Promise<MemoryEntryWithContent | null>;

  /** Remove a memory */
  remove(id: string): Promise<boolean>;

  /** List all memory headers (lightweight, no content) */
  list(filter?: MemoryFilter): Promise<MemoryEntryMeta[]>;

  /** Search memories by relevance to a query */
  search(query: string, limit?: number): Promise<MemorySearchResult[]>;

  /** Get the memory index (summary of all memories for system prompt) */
  getIndex(): Promise<string>;

  /** Build the system prompt fragment for memory instructions */
  buildPrompt(): string;
}

/** Entry to save */
export type MemoryEntry = {
  name: string;
  description: string;
  type: "user" | "feedback" | "project" | "reference";
  content: string;
  scope?: "private" | "team";
  metadata?: Record<string, unknown>;
};

/** Full entry with content */
export type MemoryEntryWithContent = MemoryEntry & {
  id: string;
  createdAt: number;
  updatedAt: number;
};

/** Lightweight metadata for listing */
export type MemoryEntryMeta = {
  id: string;
  name: string;
  description: string;
  type: string;
  updatedAt: number;
};

/** Filter for listing memories */
export type MemoryFilter = {
  type?: string;
  scope?: "private" | "team";
  since?: number;
};

/** Search result with relevance score */
export type MemorySearchResult = {
  entry: MemoryEntryMeta;
  score: number;
  snippet?: string;
};

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
  start(): Promise<void>;

  /** Stop the browser */
  stop(): Promise<void>;

  /** Whether the browser is currently running */
  readonly running: boolean;

  /** Navigate to a URL and extract content */
  navigate(url: string, opts?: NavigateOptions): Promise<PageContent>;

  /** Take a screenshot */
  screenshot(opts?: ScreenshotOptions): Promise<ScreenshotData>;

  /** Click an element */
  click(selector: string): Promise<void>;

  /** Type text into an element */
  type(selector: string, text: string): Promise<void>;

  /** Scroll the page */
  scroll(direction: "up" | "down", amount?: number): Promise<void>;

  /** Wait for an element to appear */
  waitForSelector(selector: string, timeoutMs?: number): Promise<boolean>;

  /** Get the current page URL */
  getUrl(): Promise<string>;

  /** Evaluate JavaScript in the page context */
  evaluate(expression: string): Promise<unknown>;

  /**
   * Export browser capabilities as YAAF tools.
   * This is the bridge between the browser adapter and the tool system.
   */
  asTools(prefix?: string): import("../tools/tool.js").Tool[];
}

export type NavigateOptions = {
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  extractHtml?: boolean;
};

export type PageContent = {
  url: string;
  title: string;
  textContent: string;
  html?: string;
  statusCode: number;
};

export type ScreenshotOptions = {
  fullPage?: boolean;
  selector?: string;
};

export type ScreenshotData = {
  data: string; // base64 PNG
  width: number;
  height: number;
};

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
  read(path: string): Promise<string | null>;

  /** Write a file */
  write(path: string, content: string, agentId?: string): Promise<void>;

  /** Check if a path exists */
  exists(path: string): Promise<boolean>;

  /** Delete a file */
  remove(path: string, agentId?: string): Promise<boolean>;

  /** List entries in a directory */
  list(path: string): Promise<FSEntryInfo[]>;

  /** Create a directory */
  mkdir(path: string): Promise<void>;

  /** Get a text representation of the filesystem for LLM context */
  toPrompt(path?: string): string;

  /** Get filesystem stats */
  getStats(): FSStats;
}

export type FSEntryInfo = {
  name: string;
  path: string;
  type: "file" | "directory" | "tool" | "symlink";
  size?: number;
};

export type FSStats = {
  totalSize: number;
  maxSize: number;
  usagePercent: number;
  fileCount: number;
};

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
  getTools(): import("../tools/tool.js").Tool[];

  /**
   * Optional: get tools filtered by context.
   * E.g., a database provider might return different tools
   * depending on which database is connected.
   */
  getToolsForContext?(context: Record<string, unknown>): import("../tools/tool.js").Tool[];
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
  ): Promise<ContextSection[]>;
}

export type ContextSection = {
  key: string;
  content: string;
  placement: "system" | "user";
  priority?: number;
};

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
  // complete(params): Promise<ChatResult>

  /**
   * Simple text query — no tool schemas, no history management.
   * Wraps `complete()` with a single user message for convenience.
   */
  query(params: LLMQueryParams): Promise<LLMResponse>;

  /**
   * Summarize a conversation into a compact string.
   * Used by ContextManager for context compaction.
   */
  summarize(messages: LLMMessage[], instructions?: string): Promise<string>;

  /** Estimate token count for a string (rough, no network call). */
  estimateTokens(text: string): number;

  /** Model identifier (e.g. 'gemini-2.0-flash', 'gpt-4o-mini') */
  readonly model: string;

  /** Context window size in tokens */
  readonly contextWindowTokens: number;

  /** Maximum output tokens per completion */
  readonly maxOutputTokens: number;

  /**
   * Optional pricing declaration — consumed by CostTracker to keep the
   * price table accurate without hardcoding. Per 1M tokens, USD.
   */
  readonly pricing?: LLMPricing;
}

/** Pricing per 1M tokens (USD) — mirrors CostTracker.ModelPricing. */
export type LLMPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion?: number;
  cacheWritePerMillion?: number;
};

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMQueryParams = {
  messages: LLMMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
};

export type LLMResponse = {
  content: string;
  tokensUsed: { input: number; output: number };
  model: string;
  stopReason?: string;
};

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
 * readonly name = 'my-mcp'
 * readonly version = '1.0.0'
 * readonly capabilities = ['mcp', 'tool_provider'] as const
 *
 * async initialize() { await this.connect() }
 * async destroy() { await this.disconnect() }
 *
 * getTools() { return this.tools }
 * listServers() { return [{ name: 'my-server', transport: 'stdio', connected: true, toolCount: 3 }] }
 * async callTool(toolName, args) { ... }
 * }
 * ```
 */
export interface McpAdapter extends ToolProvider {
  /**
   * List all connected MCP servers and their current status.
   * Used by PluginHost.getMcpServers() for introspection and health display.
   */
  listServers(): McpServerInfo[];

  /**
   * Call a specific tool on a specific server directly (bypass tool wrapping).
   * Useful for admin / debugging flows.
   */
  callTool(toolName: string, args: Record<string, unknown>, serverName?: string): Promise<string>;

  /**
   * The transport type(s) this adapter connects to.
   * For display / filtering purposes.
   */
  readonly transports: ReadonlyArray<"stdio" | "sse">;
}

/** Status snapshot of a single MCP server connection. */
export type McpServerInfo = {
  /** Server name as configured */
  name: string;
  /** Transport type */
  transport: "stdio" | "sse";
  /** Whether the server is currently connected */
  connected: boolean;
  /** Number of tools exposed by this server */
  toolCount: number;
  /** Server URL (SSE) or command (stdio) */
  endpoint?: string;
};

// ── Security Adapter ─────────────────────────────────────────────────────────

/**
 * Security Adapter — pluggable security middleware for LLM pipelines.
 *
 * Each adapter handles ONE security concern (injection detection, PII redaction,
 * output sanitization, anomaly detection, etc.) and declares which pipeline
 * phase it operates in. Multiple adapters compose automatically via
 * `PluginHost.buildSecurityHooks()`, ordered by `priority`.
 *
 * Built-in implementations (all opt-in via `config.security`):
 * - `PromptGuardAdapter` — prompt injection detection (LLM01)
 * - `OutputSanitizerAdapter` — XSS/HTML stripping (LLM02)
 * - `PiiRedactorAdapter` — PII detection/redaction (LLM06)
 *
 * @example
 * ```ts
 * class MyWafAdapter extends PluginBase implements SecurityAdapter {
 * readonly capabilities = ['security'] as const
 * readonly phase = 'input'
 * readonly priority = 10 // run before built-ins
 *
 * beforeLLM(messages) {
 * // scan for WAF violations...
 * return messages
 * }
 * }
 *
 * await host.register(new MyWafAdapter())
 * const agent = new Agent({ plugins: [...host.listPluginsRaw()] })
 * ```
 */
export interface SecurityAdapter extends Plugin {
  /**
   * Which pipeline phase this guard operates in.
   * - `'input'` — only `beforeLLM` is called
   * - `'output'` — only `afterLLM` is called
   * - `'both'` — both hooks are called
   */
  readonly phase: "input" | "output" | "both";

  /**
   * Execution priority — lower numbers run first.
   * Built-in guards use 50; set < 50 to run before them, > 50 to run after.
   * Default: 50
   */
  readonly priority?: number;

  /**
   * Input-side guard. Receives the current message array and returns
   * a (possibly modified) array, or undefined to pass through unchanged.
   */
  beforeLLM?(
    messages: ChatMessage[],
  ): ChatMessage[] | undefined | Promise<ChatMessage[] | undefined>;

  /**
   * Output-side guard. Receives the LLM response and returns an
   * `LLMHookResult`, or undefined to pass through unchanged.
   */
  afterLLM?(
    response: ChatResult,
    iteration: number,
  ): SecurityHookResult | undefined | Promise<SecurityHookResult | undefined>;
}

/** Result type for SecurityAdapter.afterLLM — mirrors Hooks.afterLLM return. */
export type SecurityHookResult =
  | { action: "continue" }
  | { action: "override"; content: string }
  | { action: "stop"; reason: string };

// ── Observability Adapter ────────────────────────────────────────────────────

/**
 * Observability Adapter — pluggable sink for logs, spans, and metrics.
 *
 * Replaces the single-static-handler `Logger.setHandler()` with a fan-out
 * model: every registered ObservabilityAdapter receives all events.
 *
 * @example
 * ```ts
 * class DatadogAdapter extends PluginBase implements ObservabilityAdapter {
 * readonly capabilities = ['observability'] as const
 *
 * log(entry) { datadogLogs.send(entry) }
 * metric(name, value) { datadogMetrics.gauge(name, value) }
 * }
 * await host.register(new DatadogAdapter())
 * ```
 */
export interface ObservabilityAdapter extends Plugin {
  /**
   * Receive a structured log entry.
   * Should not throw — errors in logging must never crash the agent.
   */
  log?(entry: LogEntry): void;

  /**
   * Receive a completed span (OTel-compatible).
   * Called when a span opened via the tracing module is ended.
   */
  span?(span: SpanData): void;

  /**
   * Receive a metric data point.
   * @param name — dot-separated metric name, e.g. 'agent.tokens_used'
   * @param value — numeric value
   * @param labels — optional key/value dimension labels
   */
  metric?(name: string, value: number, labels?: Record<string, string>): void;
}

/** Structured log entry passed to ObservabilityAdapter.log(). */
export type LogEntry = {
  level: "debug" | "info" | "warn" | "error";
  namespace: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
};

/** Span data passed to ObservabilityAdapter.span(). */
export type SpanData = {
  name: string;
  traceId: string;
  spanId: string;
  startTime: number;
  endTime: number;
  attributes?: Record<string, unknown>;
  status?: "ok" | "error";
  error?: string;
};

// ── Notification Adapter ─────────────────────────────────────────────────────

/**
 * Notification Adapter — pluggable channel for agent lifecycle events.
 *
 * Replaces the standalone `NotificationChannel` / `CompositeNotifier` hierarchy
 * with a proper plugin type. All registered notification adapters receive
 * events via `PluginHost.notify()`.
 *
 * Existing `ConsoleNotifier`, `WebhookNotifier`, etc. remain usable as
 * standalone objects; wrapping them in `NotificationAdapter` is opt-in.
 *
 * @example
 * ```ts
 * class SlackNotifierPlugin extends PluginBase implements NotificationAdapter {
 * readonly capabilities = ['notification'] as const
 *
 * async notify(n) {
 * await slack.postMessage({ channel: '#alerts', text: `${n.title}: ${n.message}` })
 * }
 * }
 * await host.register(new SlackNotifierPlugin())
 * ```
 */
export interface NotificationAdapter extends Plugin {
  /** Receive and deliver a notification. Must not throw. */
  notify(notification: PluginNotification): Promise<void>;
}

/** Notification payload — matches the existing `Notification` type in notifier.ts. */
export type PluginNotification = {
  type: "completed" | "failed" | "needs_attention" | "warning" | "info";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
};

// ── Ingester Adapter ─────────────────────────────────────────────────────────

/**
 * Ingester Adapter — pluggable file-format ingester for the KB compiler.
 *
 * Extends the existing `Ingester` interface with plugin lifecycle so that
 * custom format handlers (DOCX, EPUB, Notion, Confluence, etc.) can be
 * registered via `PluginHost` instead of directly imported.
 *
 * The KB compiler queries PluginHost for all `ingester` adapters and builds
 * an extension→handler dispatch table dynamically.
 *
 * @example
 * ```ts
 * class DocxIngesterPlugin extends PluginBase implements IngesterAdapter {
 * readonly capabilities = ['ingester'] as const
 * readonly supportedMimeTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
 * readonly supportedExtensions = ['docx']
 * readonly requiresOptionalDeps = true
 * readonly optionalDeps = ['mammoth']
 *
 * async ingest(filePath) { ... }
 * }
 * await host.register(new DocxIngesterPlugin())
 * ```
 */
export interface IngesterAdapter extends Plugin {
  /** MIME types this ingester handles */
  readonly supportedMimeTypes: string[];
  /** File extensions this ingester handles (without leading dot) */
  readonly supportedExtensions: string[];
  /** Whether this ingester requires optional peer dependencies */
  readonly requiresOptionalDeps: boolean;
  /** Names of required optional packages (for error messages) */
  readonly optionalDeps?: string[];
  /** Extract content from a source file. */
  ingest(filePath: string, options?: IngesterAdapterOptions): Promise<IngesterAdapterResult>;
}

export type IngesterAdapterOptions = {
  imageOutputDir?: string;
  maxImageDimension?: number;
  sourceUrl?: string;
};

export type IngesterAdapterResult = {
  text: string;
  images: Array<{
    originalSrc: string;
    localPath: string;
    altText: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  mimeType: string;
  sourceFile: string;
  title?: string;
  metadata?: Record<string, unknown>;
  lossy: boolean;
  sourceUrl?: string;
};

// ── Compaction Adapter ───────────────────────────────────────────────────────

import type { CompactionContext, StrategyResult } from "../context/strategies.js";

/**
 * Compaction Adapter — pluggable context compaction strategy.
 *
 * Allows custom compaction logic (semantic deduplication, vector search,
 * retrieval-augmented summarization, etc.) to be registered as a plugin
 * and automatically discovered by `ContextManager`.
 *
 * **Framework wiring:** When `Agent` is constructed with `contextManager: 'auto'`,
 * it calls `PluginHost.getCompactionAdapter()`. If a `CompactionAdapter` is found,
 * it is passed as the `strategy` option to `ContextManager`, overriding the default
 * `'truncate'` fallback. Only the **first** registered adapter is used.
 *
 * `shouldCompact()` is optional — when omitted, the `ContextManager`'s own
 * token-budget check is used to decide when to trigger compaction.
 *
 * @example
 * ```ts
 * class SemanticCompactionPlugin extends PluginBase implements CompactionAdapter {
 * readonly name = 'semantic-compactor'
 * readonly version = '1.0.0'
 * readonly capabilities = ['compaction'] as const
 * readonly description = 'Embedding-based semantic deduplication'
 *
 * // Optional: override the default token-budget check
 * async shouldCompact(ctx: CompactionContext) {
 * return ctx.totalTokens / ctx.effectiveLimit > 0.80
 * }
 *
 * async compact(ctx: CompactionContext): Promise<StrategyResult> {
 * const summary = await semanticSummarize(ctx.messages)
 * return { messages: [summaryMessage(summary)], summary, messagesRemoved: ctx.messages.length }
 * }
 * }
 *
 * const agent = await Agent.create({
 * model: 'gpt-4o',
 * contextManager: 'auto',
 * plugins: [new SemanticCompactionPlugin()],
 * })
 * ```
 */
export interface CompactionAdapter extends Plugin {
  /** Human-readable description shown in `/context list` and health reports */
  readonly description: string;
  /**
   * Optional override for when compaction should trigger.
   * When omitted, `ContextManager.shouldCompact()` (token-budget threshold) is used.
   */
  shouldCompact?(ctx: CompactionContext): boolean | Promise<boolean>;
  /** Perform compaction and return the replacement message set + summary. */
  compact(ctx: CompactionContext): Promise<StrategyResult>;
}

// ── Skill Provider Adapter ───────────────────────────────────────────────────

import type { Skill } from "../skills.js";

/**
 * Skill Provider Adapter — plugin that contributes skills to the agent.
 *
 * Skills are structured instructions injected into the agent's system prompt
 * (e.g., tool usage guides, domain playbooks, response format rules).
 *
 * **Framework wiring:** `Agent.create()` calls `PluginHost.getAllSkills()` after
 * initializing all plugins and before assembling the system prompt. The returned
 * skills are merged with any `AgentConfig.skills` static list. Failed providers
 * are silently skipped (best-effort fan-out).
 *
 * @example
 * ```ts
 * class CompanySkillsPlugin extends PluginBase implements SkillProviderAdapter {
 * readonly name = 'company-skills'
 * readonly version = '1.0.0'
 * readonly capabilities = ['skill_provider'] as const
 *
 * async getSkills() {
 * // Fetch personalized skills from an API, DB, or config store
 * return fetchCompanySkills(this.tenantId)
 * }
 * }
 *
 * const agent = await Agent.create({
 * model: 'gpt-4o',
 * plugins: [new CompanySkillsPlugin({ tenantId: 'acme' })],
 * })
 * // → company skills are merged into system prompt automatically
 * ```
 */
export interface SkillProviderAdapter extends Plugin {
  /** Return skills to inject. May be async (e.g., API fetch, DB query). */
  getSkills(): Skill[] | Promise<Skill[]>;
}

// ── Session Adapter ──────────────────────────────────────────────────────────

/**
 * Session Adapter — swappable conversation history persistence backend.
 *
 * By default, YAAF persists conversation sessions as JSONL files on the local
 * filesystem. Registering a `SessionAdapter` plugin replaces that backend with
 * any network-accessible store.
 *
 * **Framework wiring:** The `Session` class calls `PluginHost.getSessionAdapter()`
 * during initialization. When a `SessionAdapter` is present, all `create`,
 * `append`, `load`, `compact`, `delete`, and `list` calls are delegated to it.
 * Only the **first** registered adapter is used.
 *
 * @example
 * ```ts
 * class RedisSessionAdapter extends PluginBase implements SessionAdapter {
 * readonly name = 'redis-session'
 * readonly version = '1.0.0'
 * readonly capabilities = ['session'] as const
 *
 * async create(id: string) {
 * await this.redis.del(id)
 * }
 * async append(id: string, messages: ChatMessage[]) {
 * await this.redis.rpush(id, ...messages.map(m => JSON.stringify(m)))
 * }
 * async load(id: string): Promise<ChatMessage[]> {
 * const raw = await this.redis.lrange(id, 0, -1)
 * return raw.map(r => JSON.parse(r))
 * }
 * async delete(id: string) { await this.redis.del(id) }
 * async compact(id: string, summary: string) {
 * await this.redis.set(`${id}:summary`, summary)
 * }
 * async list(): Promise<string[]> {
 * return this.redis.keys('session:*')
 * }
 * }
 *
 * const agent = await Agent.create({
 * model: 'gpt-4o',
 * plugins: [new RedisSessionAdapter({ url: process.env.REDIS_URL! })],
 * })
 * ```
 */
export interface SessionAdapter extends Plugin {
  /** Create a new empty session with the given ID. */
  create(id: string): Promise<void>;
  /** Append messages to an existing session. */
  append(id: string, messages: ChatMessage[]): Promise<void>;
  /** Load all messages for a session. Returns [] for unknown IDs. */
  load(id: string): Promise<ChatMessage[]>;
  /** Delete a session permanently. */
  delete(id: string): Promise<void>;
  /** Replace session content with a compaction summary. */
  compact(id: string, summary: string): Promise<void>;
  /** List all known session IDs. */
  list(): Promise<string[]>;
  /**
   * Load session metadata (owner, createdAt, etc.).
   * Returns null if the session doesn't exist.
   * Optional — when omitted, adapter-backed sessions don't support ownership.
   */
  loadMeta?(id: string): Promise<{ owner?: string; createdAt?: string } | null>;
  /**
   * Persist session metadata (owner binding, etc.).
   * Optional — when omitted, adapter-backed sessions don't support ownership.
   */
  saveMeta?(id: string, meta: { owner?: string }): Promise<void>;
}

// ── Identity Adapter ─────────────────────────────────────────────────────────

import type { UserContext, IncomingRequest } from "../iam/types.js";

/**
 * Identity Adapter — pluggable user identity resolution for HTTP/A2A servers.
 *
 * Resolves a `UserContext` from an incoming request's headers, tokens, or
 * credentials. Used by `createServer()` to authenticate every request before
 * the agent runs.
 *
 * The relationship is:
 * - `IdentityProvider` (in `iam/types.ts`) — standalone interface, passed via `accessPolicy`
 * - `IdentityAdapter` (this) — plugin version with full lifecycle (init/destroy/healthCheck)
 *
 * **Framework wiring:** `createServer()` calls `PluginHost.getIdentityAdapter()`.
 * When present, every incoming request is authenticated through the adapter
 * before the agent processes it. If the adapter returns `null`, the server
 * responds with 401. Only the **first** registered adapter is used.
 *
 * @example
 * ```ts
 * class Auth0IdentityPlugin extends PluginBase implements IdentityAdapter {
 * readonly name = 'auth0-identity'
 * readonly version = '1.0.0'
 * readonly capabilities = ['identity'] as const
 *
 * async resolve(request: IncomingRequest): Promise<UserContext | null> {
 * const token = request.headers['authorization']?.replace('Bearer ', '')
 * if (!token) return null
 * const decoded = await this.verifyJwt(token)
 * return {
 * userId: decoded.sub,
 * name: decoded.name,
 * roles: decoded['https://myapp.com/roles'] ?? [],
 * attributes: { tenantId: decoded.org_id },
 * }
 * }
 *
 * async healthCheck(): Promise<boolean> {
 * // Verify JWKS endpoint is reachable
 * const res = await fetch(this.jwksUri)
 * return res.ok
 * }
 * }
 *
 * const agent = await Agent.create({
 * model: 'gpt-4o',
 * plugins: [new Auth0IdentityPlugin({ domain: 'myapp.auth0.com' })],
 * })
 *
 * const server = createServer(agent, {
 * port: 3000,
 * sessions: true, // identity-scoped sessions
 * })
 * // → every /chat request is authenticated before reaching the agent
 * ```
 */
export interface IdentityAdapter extends Plugin {
  /**
   * Resolve user identity from an incoming request.
   * Returns `null` if the request is unauthenticated or the credentials
   * are invalid.
   *
   * @param request — headers, query params, pre-parsed JWT claims
   * @returns UserContext or null
   */
  resolve(request: IncomingRequest): Promise<UserContext | null>;

  /**
   * Optional: refresh stale credentials.
   * Called when a session's stored credentials are near expiry.
   */
  refresh?(user: UserContext): Promise<UserContext | null>;
}

// ── Linter Rule Adapter ──────────────────────────────────────────────────────

/**
 * Linter Rule Adapter — extensible KB lint rule.
 *
 * YAAF's built-in `KBLinter` ships with 14 static checks (broken wikilinks,
 * missing fields, orphaned articles, etc.). `LinterRuleAdapter` lets you add
 * domain-specific or org-specific rules — terminology enforcement, style
 * guides, schema constraints — without modifying `linter/checks.ts`.
 *
 * **Framework wiring:** `KBLinter.lint()` calls `PluginHost.getLinterRules()`
 * after all built-in checks finish. Plugin rules run per-article in a
 * best-effort loop; a rule that throws is silently skipped. Issues are emitted
 * with codes in the `PLUGIN_<ruleId>` namespace (e.g., `PLUGIN_T001`).
 *
 * @example
 * ```ts
 * class TerminologyRule extends PluginBase implements LinterRuleAdapter {
 * readonly name = 'terminology-rule'
 * readonly version = '1.0.0'
 * readonly capabilities = ['linter_rule'] as const
 * readonly ruleId = 'T001'
 * readonly description = 'Enforce standard product terminology'
 * readonly severity = 'warning' as const
 *
 * check(docId: string, content: string): LinterRuleIssue[] {
 * const issues: LinterRuleIssue[] = []
 * if (/\bfrontend\b/i.test(content)) {
 * issues.push({
 * message: 'Use "front-end" (hyphenated), not "frontend"',
 * fix: 'Replace all occurrences of "frontend" with "front-end"',
 * })
 * }
 * return issues
 * }
 * }
 *
 * const linter = new KBLinter(ontology, registry, compiledDir, rawDir, pluginHost)
 * const report = await linter.lint()
 * // → report.issues includes PLUGIN_T001 entries
 * ```
 */
export interface LinterRuleAdapter extends Plugin {
  /** Short identifier used as the `PLUGIN_<ruleId>` lint code. */
  readonly ruleId: string;
  /** Human-readable description of what this rule checks. */
  readonly description: string;
  /** Severity level for issues this rule produces. Defaults to `'warning'`. */
  readonly severity?: "error" | "warning" | "info";
  /**
   * Check a single compiled article for violations.
   *
   * @param docId - The article's canonical document ID
   * @param content - The full markdown body of the compiled article
   * @returns Array of issues (empty = article passes this rule)
   */
  check(docId: string, content: string): LinterRuleIssue[] | Promise<LinterRuleIssue[]>;
}

/** An individual violation found by a `LinterRuleAdapter`. */
export type LinterRuleIssue = {
  /** Human-readable description of the problem. */
  message: string;
  /** Line number in the article where the issue occurs (optional). */
  line?: number;
  /** Suggested auto-fix description (shown in the lint report). */
  fix?: string;
};

// ── Plugin Host ──────────────────────────────────────────────────────────────

/**
 * PluginHost — the central registry and capability index for all plugins.
 *
 * Plugins are registered once (via `register()`) and are then discoverable
 * by capability. The host routes all adapter lookups to the correct plugin
 * without callers needing to know which concrete class is registered.
 *
 * **Typical workflow:**
 *
 * ```ts
 * import { PluginHost } from 'yaaf'
 * import { HonchoPlugin } from 'yaaf/honcho'
 * import { CamoufoxPlugin } from 'yaaf/camoufox'
 *
 * const host = new PluginHost()
 *
 * // ── Register plugins ──────────────────────────────────────────────────────
 * await host.register(new HonchoPlugin({ apiKey: process.env.HONCHO_KEY! }))
 * await host.register(new CamoufoxPlugin({ headless: true }))
 * await host.register(new AgentFSPlugin())
 *
 * // ── Core lookups ──────────────────────────────────────────────────────────
 * const memory = host.getAdapter<MemoryAdapter>('memory') // first match
 * const browser = host.getAdapter<BrowserAdapter>('browser') // first match
 * const tools = host.getAllTools() // merged from all ToolProviders
 * const ctx = await host.gatherContext('Fix the auth bug') // from all ContextProviders
 *
 * // ── extension point accessors ───────────────────────────────────
 * // CompactionAdapter — override Agent's default truncation/LLM compaction
 * const compactor = host.getCompactionAdapter() // → CompactionAdapter | null
 *
 * // SkillProviderAdapter — merge plugin skills with config.skills
 * const skills = await host.getAllSkills() // → Skill[]
 *
 * // SessionAdapter — swap JSONL filesystem backend for Redis / Postgres / etc.
 * const session = host.getSessionAdapter() // → SessionAdapter | null
 *
 * // LinterRuleAdapter — run custom KB lint rules alongside built-in checks
 * const rules = host.getLinterRules() // → LinterRuleAdapter[]
 *
 * // Lookup a plugin by name (returns undefined if not registered)
 * const plugin = host.getPlugin<HonchoPlugin>('honcho')
 *
 * // ── Lifecycle ─────────────────────────────────────────────────────────────
 * const health = await host.healthCheckAll() // → Map<name, boolean>
 * await host.destroyAll() // graceful shutdown
 * ```
 *
 * **Passing to Agent:**
 *
 * The preferred way is to pass plugins via `AgentConfig.plugins`; the Agent
 * builds its own PluginHost internally. You only need to construct a
 * `PluginHost` manually when sharing one across multiple agents:
 *
 * ```ts
 * // Shared host across agents
 * const host = new PluginHost()
 * await host.register(sharedMemoryPlugin)
 *
 * const a1 = new Agent({ model: 'gpt-4o', plugins: host.list() })
 * const a2 = new Agent({ model: 'claude-sonnet-4', plugins: host.list() })
 * ```
 */
export class PluginHost {
  private plugins = new Map<string, Plugin>();
  private adaptersByCapability = new Map<PluginCapability, Plugin[]>();
  /**
   * S1-D FIX: Optional TrustPolicy for automatic plugin verification.
   *
   * - `'warn'` — log a console warning for unverified plugins, then register (default-safe, non-breaking)
   * - `'strict'` — throw for unverified or unknown plugins (production hardens)
   * - `TrustPolicy` instance — delegate to its `verifyPlugin()` method
   *
   * @example
   * ```ts
   * // Recommended: warn in dev, strict in production
   * const host = new PluginHost({
   * trustPolicy: process.env.NODE_ENV === 'production' ? 'strict' : 'warn'
   * })
   * ```
   */
  private readonly _trustPolicy?: TrustPolicy | "warn" | "strict";

  constructor(opts?: { trustPolicy?: TrustPolicy | "warn" | "strict" }) {
    this._trustPolicy = opts?.trustPolicy;
  }

  /**
   * Register a plugin. Calls plugin.initialize() if defined.
   * Throws if a plugin with the same name is already registered.
   * S1-D: Calls TrustPolicy.verifyPlugin() when a trust policy is configured.
   */
  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }

    // S1-D FIX: Synchronous trust check — runs before entering any async boundary
    // so the microtask queue ordering for initialize() is preserved (A1 invariant).
    this._checkTrust(plugin.name);

    // Initialize the plugin
    if (plugin.initialize) {
      await plugin.initialize();
    }

    this.indexPlugin(plugin);
  }

  /**
   * Register a plugin synchronously — skips `plugin.initialize()`.
   *
   * Use this when plugins are already initialized (e.g. `Agent.create()` calls
   * `initialize()` upfront, then passes plugins to the sync `Agent` constructor).
   * Avoids the `as unknown as { private fields }` hack in sync code paths.
   *
   * Throws if a plugin with the same name is already registered.
   * S1-D: Calls TrustPolicy.verifyPlugin() when a trust policy is configured.
   */
  registerSync(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    // S1-D FIX: Trust check (sync path — verifyPlugin is synchronous for 'warn'/'strict' modes)
    this._checkTrustSync(plugin.name);
    this.indexPlugin(plugin);
  }

  /** S1-D: Sync trust verification — zero microtask overhead for warn/strict modes. */
  private _checkTrust(pluginName: string): void {
    if (!this._trustPolicy) return;
    if (this._trustPolicy === "warn") {
      console.warn(
        `[YAAF] Plugin "${pluginName}" registered without integrity verification. ` +
          "Configure a TrustPolicy with sha256 hashes to verify plugin integrity.",
      );
      return;
    }
    if (this._trustPolicy === "strict") {
      throw new Error(
        `[YAAF] Plugin "${pluginName}" blocked: PluginHost is in strict trust mode. ` +
          "Register an explicit TrustPolicy with a sha256 entry for this plugin.",
      );
    }
    // Full TrustPolicy instance — call verifyPlugin() synchronously as a best-effort
    // check. verifyPlugin() may be async; we fire it and let it reject the promise
    // returned by register() if it rejects.
    void (this._trustPolicy as TrustPolicy).verifyPlugin(pluginName);
  }

  /** S1-D: Sync trust check — used by registerSync(). */
  private _checkTrustSync(pluginName: string): void {
    if (!this._trustPolicy) return;
    if (this._trustPolicy === "warn") {
      console.warn(
        `[YAAF] Plugin "${pluginName}" registered without integrity verification. ` +
          "Configure a TrustPolicy with sha256 hashes to verify plugin integrity.",
      );
      return;
    }
    if (this._trustPolicy === "strict") {
      throw new Error(
        `[YAAF] Plugin "${pluginName}" blocked: PluginHost is in strict trust mode. ` +
          "Register an explicit TrustPolicy with a sha256 entry for this plugin.",
      );
    }
    // Full TrustPolicy — would need verifyPlugin to be sync. warn instead.
    console.warn(
      `[YAAF] Plugin "${pluginName}" registered via registerSync() — TrustPolicy.verifyPlugin() skipped. ` +
        "Use async register() to enable full integrity verification.",
    );
  }

  /** Shared indexing logic for register() and registerSync(). */
  private indexPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
    for (const cap of plugin.capabilities) {
      if (!this.adaptersByCapability.has(cap)) {
        this.adaptersByCapability.set(cap, []);
      }
      this.adaptersByCapability.get(cap)!.push(plugin);
    }
  }

  /**
   * Unregister a plugin. Calls plugin.destroy() if defined.
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return;

    // Remove from the registry first so any re-entrant capability lookup
    // does not see this plugin even if destroy() is slow or throws.
    this.plugins.delete(pluginName);
    for (const cap of plugin.capabilities) {
      const plugins = this.adaptersByCapability.get(cap);
      if (plugins) {
        const idx = plugins.indexOf(plugin);
        if (idx >= 0) plugins.splice(idx, 1);
      }
    }

    // Now call destroy() — if it throws, we let it propagate but the plugin
    // is already de-indexed so the host is in a consistent state.
    if (plugin.destroy) {
      await plugin.destroy();
    }
  }

  /**
   * Get the first adapter for a capability.
   * Returns null if no plugin provides this capability.
   */
  getAdapter<T extends Plugin>(capability: PluginCapability): T | null {
    const plugins = this.adaptersByCapability.get(capability);
    return (plugins?.[0] as T) ?? null;
  }

  /**
   * Get ALL adapters for a capability (when multiple plugins provide it).
   * Useful for fan-out queries (e.g., search across multiple memory backends).
   */
  getAdapters<T extends Plugin>(capability: PluginCapability): T[] {
    return (this.adaptersByCapability.get(capability) ?? []) as T[];
  }

  /** Get a plugin by name */
  getPlugin<T extends Plugin>(name: string): T | null {
    return (this.plugins.get(name) as T) ?? null;
  }

  /** Check if a capability is available */
  hasCapability(capability: PluginCapability): boolean {
    const plugins = this.adaptersByCapability.get(capability);
    return !!plugins && plugins.length > 0;
  }

  /** List all registered plugins */
  listPlugins(): Array<{
    name: string;
    version: string;
    capabilities: readonly PluginCapability[];
  }> {
    return [...this.plugins.values()].map((p) => ({
      name: p.name,
      version: p.version,
      capabilities: p.capabilities,
    }));
  }

  /**
   * Collect all tools from all registered ToolProviders.
   *
   * MCP adapters are automatically included because they implement
   * `ToolProvider` (capabilities includes `'tool_provider'`).
   */
  getAllTools(): import("../tools/tool.js").Tool[] {
    const providers = this.getAdapters<ToolProvider>("tool_provider");
    const tools: import("../tools/tool.js").Tool[] = [];
    for (const provider of providers) {
      tools.push(...provider.getTools());
    }
    return tools;
  }

  /**
   * Compose all registered SecurityAdapters into a pair of hook functions.
   *
   * Adapters are sorted by `priority` (ascending — lowest runs first).
   * Returns `{ beforeLLM, afterLLM }` ready to be merged into `Hooks`.
   * Returns `{}` if no security adapters are registered.
   */
  buildSecurityHooks(): {
    beforeLLM?: (messages: ChatMessage[]) => Promise<ChatMessage[] | undefined>;
    afterLLM?: (response: ChatResult, iteration: number) => Promise<SecurityHookResult | undefined>;
  } {
    const adapters = this.getAdapters<SecurityAdapter>("security")
      .slice()
      .sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));

    if (adapters.length === 0) return {};

    const inputAdapters = adapters.filter((a) => a.phase === "input" || a.phase === "both");
    const outputAdapters = adapters.filter((a) => a.phase === "output" || a.phase === "both");

    const result: {
      beforeLLM?: (messages: ChatMessage[]) => Promise<ChatMessage[] | undefined>;
      afterLLM?: (
        response: ChatResult,
        iteration: number,
      ) => Promise<SecurityHookResult | undefined>;
    } = {};

    if (inputAdapters.length > 0) {
      result.beforeLLM = async (messages: ChatMessage[]) => {
        let current = messages;
        let modified = false;
        for (const adapter of inputAdapters) {
          if (adapter.beforeLLM) {
            const result = await adapter.beforeLLM(current);
            if (result) { current = result; modified = true; }
          }
        }
        return modified ? current : undefined;
      };
    }

    if (outputAdapters.length > 0) {
      result.afterLLM = async (response: ChatResult, iteration: number) => {
        let currentResponse = response;
        let finalResult: SecurityHookResult | undefined;
        for (const adapter of outputAdapters) {
          if (adapter.afterLLM) {
            const hookResult = await adapter.afterLLM(currentResponse, iteration);
            if (hookResult) {
              finalResult = hookResult;
              if (hookResult.action === "override") {
                currentResponse = { ...currentResponse, content: hookResult.content };
              } else if (hookResult.action === "stop") {
                return hookResult;
              }
            }
          }
        }
        return finalResult;
      };
    }

    return result;
  }

  /**
   * Fan-out a notification to all registered NotificationAdapters.
   * Errors in individual adapters are swallowed (best-effort delivery).
   */
  async notify(notification: PluginNotification): Promise<void> {
    const adapters = this.getAdapters<NotificationAdapter>("notification");
    const filled: PluginNotification = {
      ...notification,
      timestamp: notification.timestamp ?? new Date().toISOString(),
    };
    await Promise.allSettled(
      adapters.map((a) => {
        try {
          return a.notify(filled);
        } catch {
          return Promise.resolve();
        }
      }),
    );
  }

  /**
   * Fan-out a log entry to all registered ObservabilityAdapters.
   * Errors are swallowed — logging must not crash the agent.
   */
  emitLog(entry: LogEntry): void {
    const adapters = this.getAdapters<ObservabilityAdapter>("observability");
    for (const adapter of adapters) {
      try {
        adapter.log?.(entry);
      } catch {
        /* swallow */
      }
    }
  }

  /**
   * Fan-out a completed span to all registered ObservabilityAdapters.
   */
  emitSpan(span: SpanData): void {
    const adapters = this.getAdapters<ObservabilityAdapter>("observability");
    for (const adapter of adapters) {
      try {
        adapter.span?.(span);
      } catch {
        /* swallow */
      }
    }
  }

  /**
   * Fan-out a metric to all registered ObservabilityAdapters.
   */
  emitMetric(name: string, value: number, labels?: Record<string, string>): void {
    const adapters = this.getAdapters<ObservabilityAdapter>("observability");
    for (const adapter of adapters) {
      try {
        adapter.metric?.(name, value, labels);
      } catch {
        /* swallow */
      }
    }
  }

  /**
   * Collect pricing from all registered LLMAdapters.
   * Returns a map of `modelId → pricing` for use by CostTracker.
   */
  getLLMPricing(): Record<string, LLMPricing> {
    const adapters = this.getAdapters<LLMAdapter>("llm");
    const pricing: Record<string, LLMPricing> = {};
    for (const adapter of adapters) {
      if (adapter.pricing) {
        pricing[adapter.model] = adapter.pricing;
      }
    }
    return pricing;
  }

  /**
   * Get all registered IngesterAdapters.
   * Used by the KB compiler to build a dynamic extension→ingester dispatch table.
   */
  getIngesters(): IngesterAdapter[] {
    return this.getAdapters<IngesterAdapter>("ingester");
  }

  /**
   * Return the raw Plugin array (used internally, e.g. for plugin forwarding).
   * @internal
   */
  listPluginsRaw(): Plugin[] {
    return [...this.plugins.values()];
  }

  /**
   * Get all tools from MCP adapters specifically.
   * Useful when you need to distinguish MCP tools from native tools.
   */
  getMcpTools(): import("../tools/tool.js").Tool[] {
    const adapters = this.getAdapters<McpAdapter>("mcp");
    const tools: import("../tools/tool.js").Tool[] = [];
    for (const adapter of adapters) {
      tools.push(...adapter.getTools());
    }
    return tools;
  }

  /**
   * Get status snapshots from all registered MCP adapters.
   * Useful for health dashboards and `/status` endpoints.
   */
  getMcpServers(): McpServerInfo[] {
    const adapters = this.getAdapters<McpAdapter>("mcp");
    const servers: McpServerInfo[] = [];
    for (const adapter of adapters) {
      servers.push(...adapter.listServers());
    }
    return servers;
  }

  /**
   * Get the registered LLM adapter as a `ChatModel` — ready to pass directly
   * to `new AgentRunner({ model: host.getLLMAdapter() })`.
   *
   * Returns null if no `LLMAdapter` is registered.
   */
  getLLMAdapter(): LLMAdapter | null {
    return this.getAdapter<LLMAdapter>("llm") ?? null;
  }

  /**
   * Gather context from all registered ContextProviders.
   */
  async gatherContext(
    query: string,
    existingContext?: Record<string, string>,
  ): Promise<ContextSection[]> {
    const providers = this.getAdapters<ContextProvider>("context_provider");
    const sections: ContextSection[] = [];
    for (const provider of providers) {
      // Wrap each provider individually so a failing provider
      // (e.g. an offline knowledge base) does not discard sections already
      // collected from providers that ran successfully before it.
      // A single outer .catch(() => []) at the call site (agent.ts) would silently
      // discard all partial results; per-provider isolation preserves them.
      try {
        const providerSections = await provider.getContextSections(query, existingContext);
        sections.push(...providerSections);
      } catch {
        // Non-fatal: continue with sections collected so far.
        // The caller may add observability or circuit-breaker logic if needed.
      }
    }
    return sections.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Run health checks on all plugins.
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    for (const [name, plugin] of this.plugins) {
      if (plugin.healthCheck) {
        try {
          results.set(name, await plugin.healthCheck());
        } catch {
          results.set(name, false);
        }
      } else {
        results.set(name, true); // No healthCheck = assume healthy
      }
    }
    return results;
  }

  /**
   * Gracefully shut down all plugins.
   */
  async destroyAll(): Promise<void> {
    const destroyPromises = [...this.plugins.values()]
      .filter((p) => p.destroy)
      .map((p) => p.destroy!());
    await Promise.allSettled(destroyPromises);
    this.plugins.clear();
    this.adaptersByCapability.clear();
  }

  // ── Extension Point Accessors ──────────────────────────────────────
  //
  // These methods surface the four Phase 2 adapter types introduced to make
  // every remaining YAAF subsystem fully extensible via plugins:
  //
  // getCompactionAdapter() — consumed by Agent constructor (contextManager:'auto')
  // getAllSkills() — consumed by Agent.create() before system-prompt assembly
  // getSessionAdapter() — available for Session implementation to consult
  // getIdentityAdapter() — consumed by createServer() for request authentication
  // getLinterRules() — consumed by KBLinter.lint() after built-in checks
  //
  // All Phase 2 methods follow the safe fan-out convention: failures in individual
  // plugins are silently skipped so a broken plugin can never crash the core agent.

  /**
   * Get the first registered `CompactionAdapter`, or `null` if none.
   *
   * **Consumed by:** `Agent` constructor when `contextManager: 'auto'` is set.
   * The adapter is passed as `strategy` to `ContextManager`, replacing the default
   * `'truncate'` fallback with custom logic (semantic dedup, vector-based, etc.).
   *
   * Only the **first** registered compaction adapter is used; multiple registrations
   * are ignored (use `CompositeStrategy` inside a single adapter to chain strategies).
   *
   * @returns The first `CompactionAdapter`, or `null` if no compaction plugin is registered.
   */
  getCompactionAdapter(): CompactionAdapter | null {
    return this.getAdapter<CompactionAdapter>("compaction") ?? null;
  }

  /**
   * Collect skills from all registered `SkillProviderAdapter` plugins.
   *
   * **Consumed by:** `Agent.create()` before assembling the system prompt.
   * Plugin-contributed skills are merged with `AgentConfig.skills` so the
   * agent's prompt includes them without any manual configuration.
   *
   * Fan-out is best-effort: a plugin that throws from `getSkills()` is silently
   * skipped rather than aborting the agent creation flow.
   *
   * @returns Flat array of `Skill` objects from all registered providers.
   */
  async getAllSkills(): Promise<Skill[]> {
    const providers = this.getAdapters<SkillProviderAdapter>("skill_provider");
    const allSkills: Skill[] = [];
    for (const provider of providers) {
      try {
        const skills = await provider.getSkills();
        allSkills.push(...skills);
      } catch {
        /* best-effort: skip failing skill providers */
      }
    }
    return allSkills;
  }

  /**
   * Get the first registered `SessionAdapter`, or `null` if none.
   *
   * **Consumed by:** `Session` implementation to swap the built-in JSONL
   * filesystem store for a network-backed backend (Redis, Postgres, DynamoDB…).
   * When this returns `null`, the built-in file-based session store is used.
   *
   * @returns The first `SessionAdapter`, or `null` if no session plugin is registered.
   */
  getSessionAdapter(): SessionAdapter | null {
    return this.getAdapter<SessionAdapter>("session") ?? null;
  }

  /**
   * Get all registered `LinterRuleAdapter` plugins.
   *
   * **Consumed by:** `KBLinter.lint()` after all built-in static checks have run.
   * Plugin rules execute per-article in the same parallel pass and produce
   * `LintIssue` entries with codes in the `PLUGIN_<ruleId>` namespace.
   *
   * Fan-out is best-effort: a rule that throws is silently skipped.
   *
   * @returns All registered linter rule adapters, in registration order.
   */
  getLinterRules(): LinterRuleAdapter[] {
    return this.getAdapters<LinterRuleAdapter>("linter_rule");
  }

  /**
   * Get the first registered `IdentityAdapter`, or `null` if none.
   *
   * **Consumed by:** `createServer()` to authenticate incoming HTTP requests.
   * When present, every request's `Authorization` header (or custom credentials)
   * is resolved to a `UserContext` before the agent processes it. Unauthenticated
   * requests receive 401.
   *
   * Falls back to `AccessPolicy.identityProvider` (non-plugin) if no adapter
   * is registered — the plugin takes priority when both are configured.
   *
   * @returns The first `IdentityAdapter`, or `null` if no identity plugin is registered.
   */
  getIdentityAdapter(): IdentityAdapter | null {
    return this.getAdapter<IdentityAdapter>("identity") ?? null;
  }
}
