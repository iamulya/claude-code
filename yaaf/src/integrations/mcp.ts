/**
 * MCP Plugin — Model Context Protocol as a first-class YAAF plugin.
 *
 * Connects to MCP-compatible tool servers (stdio or SSE transports) and
 * exposes their tools as native YAAF tools. This gives any Agent access
 * to the entire MCP ecosystem: filesystem, GitHub, Slack, Linear, databases,
 * and hundreds of community servers.
 *
 * ## Plugin integration
 *
 * `McpPlugin` implements the `McpAdapter` interface, which extends `ToolProvider`.
 * This means:
 * - Registering it with `PluginHost.register()` automatically makes its tools
 * available via `PluginHost.getAllTools()` — no extra wiring needed.
 * - `PluginHost.getMcpTools()` isolates just MCP-sourced tools.
 * - `PluginHost.getMcpServers()` gives connection status for all servers.
 * - `PluginHost.healthCheckAll()` includes MCP connectivity.
 * - `PluginHost.destroyAll()` cleanly disconnects all MCP servers.
 *
 * ## Peer dependency
 *
 * `@modelcontextprotocol/sdk` is a PEER DEPENDENCY — install only if you use MCP:
 *
 * npm install @modelcontextprotocol/sdk
 *
 * @example
 * ```ts
 * // Using with PluginHost (recommended — full lifecycle management)
 * const host = new PluginHost();
 * await host.register(new McpPlugin({
 * servers: [
 * { name: 'filesystem', type: 'stdio',
 * command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'] },
 * { name: 'github', type: 'sse',
 * url: 'https://mcp.github.com',
 * headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } },
 * ],
 * }));
 *
 * // MCP tools appear automatically in getAllTools()
 * const tools = host.getAllTools(); // → [...nativeTools, ...mcpTools]
 *
 * // MCP-specific introspection
 * const servers = host.getMcpServers();
 * // → [{ name: 'filesystem', transport: 'stdio', connected: true, toolCount: 12 }, ...]
 *
 * // Standalone (no PluginHost)
 * const plugin = new McpPlugin({ servers: [...] });
 * await plugin.initialize();
 * const tools = plugin.getTools(); // ready to use
 * ```
 */

import { buildTool } from "../tools/tool.js";
import type { Tool } from "../tools/tool.js";
import type { McpAdapter, McpServerInfo, PluginCapability } from "../plugin/types.js";
import { PluginBase } from "../plugin/base.js";
import { readFile, writeFile } from "node:fs/promises";

// ── Config types ──────────────────────────────────────────────────────────────

export type McpStdioServer = {
  name: string;
  type: "stdio";
  /** Command to run (e.g. 'npx', 'node', 'python') */
  command: string;
  /** Arguments to the command */
  args?: string[];
  /** Environment variables to pass to the process */
  env?: Record<string, string>;
};

export type McpSseServer = {
  name: string;
  type: "sse";
  /** URL of the MCP SSE server */
  url: string;
  /** Additional HTTP headers (e.g. Authorization) */
  headers?: Record<string, string>;
  /**
   * Structured auth for the SSE endpoint.
   * Merged into headers as `Authorization: Bearer <token>` before connecting.
   * Prefer this over manually setting `headers.Authorization`.
   */
  auth?: {
    type: "bearer";
    token: string;
  };
  /**
   * When true (default), warn if the SSE URL is not localhost/127.0.0.1
   * and no auth is configured. Set to false only on trusted internal networks.
   */
  requireAuthForRemote?: boolean;
  /**
   * Per-server SSE reconnect settings.
   * When the SSE connection drops, the plugin will retry with exponential backoff.
   *
   * Default: inherits `McpPluginConfig.reconnect` settings.
   */
  reconnect?: McpReconnectConfig;
  /**
   * Per-server tool call timeout (ms). Overrides the plugin-level `timeoutMs`.
   * Useful when one server is reliably faster or slower than others.
   */
  toolTimeoutMs?: number;
};

export type McpServerConfig = McpStdioServer | McpSseServer;

/**
 * SSE reconnect configuration.
 * When an SSE connection drops, the plugin retries with exponential backoff.
 */
export type McpReconnectConfig = {
  /**
   * Whether to auto-reconnect when the SSE connection drops.
   * Default: true.
   */
  enabled?: boolean;
  /**
   * Base delay for the first reconnect attempt (ms).
   * Subsequent attempts use `initialDelayMs * 2^attempt` with jitter.
   * Default: 1_000.
   */
  initialDelayMs?: number;
  /**
   * Maximum delay between reconnect attempts (ms).
   * Default: 30_000.
   */
  maxDelayMs?: number;
  /**
   * Maximum number of reconnect attempts before giving up.
   * After exhaustion, the circuit opens and `healthCheck()` returns false.
   * Default: 5.
   */
  maxAttempts?: number;
};

export type McpPluginConfig = {
  servers: McpServerConfig[];
  /**
   * Explicit plugin name. If omitted, derived from server names.
   */
  name?: string;
  /**
   * Timeout for tool calls (ms). Default: 30_000.
   */
  timeoutMs?: number;
  /**
   * When true, prefix tool names with the server name to avoid collisions.
   * Default: false (only prefix on collision).
   */
  prefixNames?: boolean;
  /**
   * Timeout for the initial server connection + tool discovery (ms).
   * If a server does not respond within this window, `initialize()` marks it
   * as disconnected and continues with other servers.
   * Default: 10_000.
   */
  connectTimeoutMs?: number;
  /**
   * Number of consecutive connection failures before a server's circuit
   * is opened. When open, healthCheck() returns false for that server and
   * reconnect attempts are skipped until `resetCircuit(serverName)` is called.
   * Default: 3.
   */
  maxConnectFailures?: number;

  /**
   * M3: Path to a JSON file where circuit breaker state is persisted.
   *
   * When set, a server that trips its circuit has its trip timestamp persisted
   * to this file. On the next `initialize()` call (e.g. after a process restart),
   * the persisted state is read and servers whose circuit was tripped within
   * `circuitResetMs` milliseconds of the restart are skipped without a connection
   * attempt, preventing restart-storm cascades against persistently bad servers.
   *
   * When `resetCircuit(serverName)` is called, the server's state is removed
   * from the file so the next `initialize()` treats it as a fresh server.
   *
   * Default: undefined (in-memory only — circuit state is lost on restart).
   *
   * @example
   * ```ts
   * const plugin = new McpPlugin({
   * servers: [{ name: 'my-server', type: 'sse', url: 'https://mcp.example.com' }],
   * stateFile: '/var/cache/yaaf/mcp-circuit.json',
   * circuitResetMs: 10 * 60_000, // 10 minutes
   * })
   * ```
   */
  stateFile?: string;

  /**
   * M3: How long a persisted open circuit stays open across process restarts (ms).
   * After this period, the circuit is treated as auto-reset and a reconnect is attempted.
   * Default: 300_000 (5 minutes).
   */
  circuitResetMs?: number;

  /**
   * Default SSE reconnect configuration for all SSE servers.
   * Can be overridden per-server via `McpSseServer.reconnect`.
   */
  reconnect?: McpReconnectConfig;
};

// ── Internal types ────────────────────────────────────────────────────────────

/** Dynamically loaded MCP SDK client. */
type McpClient = {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<Array<{ name: string; description?: string; inputSchema: unknown }>>;
  callTool(
    name: string,
    args: unknown,
  ): Promise<{ content: Array<{ type: string; text?: string }> }>;
};

type ServerState = {
  cfg: McpServerConfig;
  client: McpClient;
  tools: Tool[];
  connected: boolean;
  /** consecutive connection failures for circuit-breaker logic */
  connectFailures: number;
  /** SSE reconnect timer handle — cleared on destroy() */
  reconnectTimer?: ReturnType<typeof setTimeout>;
  /** Number of SSE reconnect attempts for this server this session */
  reconnectAttempts?: number;
};

// ── McpPlugin ─────────────────────────────────────────────────────────────────

/**
 * McpPlugin — a YAAF plugin that connects to MCP servers.
 *
 * Implements `McpAdapter` (and thus `ToolProvider` + `Plugin`) so it
 * participates fully in the PluginHost lifecycle.
 */
export class McpPlugin extends PluginBase implements McpAdapter {
  /**
   * Declares both 'mcp' (for MCP-specific queries) and 'tool_provider'
   * (so getAllTools() includes MCP tools automatically).
   */
  override readonly capabilities: readonly PluginCapability[] = ["mcp", "tool_provider"];

  // ── McpAdapter ─────────────────────────────────────────────────────────────

  get transports(): ReadonlyArray<"stdio" | "sse"> {
    const types = new Set(this.config.servers.map((s) => s.type));
    return [...types] as Array<"stdio" | "sse">;
  }

  // ── State ──────────────────────────────────────────────────────────────────

  private readonly config: Required<Omit<McpPluginConfig, "name" | "stateFile">> & {
    stateFile?: string;
  };
  private serverStates: Map<string, ServerState> = new Map();
  private _allTools: Tool[] = [];

  private readonly _sdk: Promise<{
    Client: new (info: unknown, options: unknown) => unknown;
    StdioClientTransport: new (config: unknown) => unknown;
    SSEClientTransport: new (url: URL, options?: unknown) => unknown;
  } | null>;

  constructor(config: McpPluginConfig) {
    const derivedName = config.name ?? `mcp:${config.servers.map((s) => s.name).join("+")}`;
    super(derivedName, ["mcp", "tool_provider"]);
    this.config = {
      timeoutMs: 30_000,
      prefixNames: false,
      connectTimeoutMs: 10_000,
      maxConnectFailures: 3,
      stateFile: undefined,
      circuitResetMs: 300_000,
      reconnect: { enabled: true },
      ...config,
    };
    // Pre-load SDK so reconnect attempts don't need to re-import
    this._sdk = (async () => {
      try {
        const dynamicImport = new Function("m", "return import(m)") as (
          m: string,
        ) => Promise<unknown>;
        return (await dynamicImport("@modelcontextprotocol/sdk/client/index.js")) as {
          Client: new (info: unknown, options: unknown) => unknown;
          StdioClientTransport: new (config: unknown) => unknown;
          SSEClientTransport: new (url: URL, options?: unknown) => unknown;
        };
      } catch {
        return null;
      }
    })();
  }

  // ── Plugin lifecycle (called by PluginHost) ───────────────────────────────

  /**
   * Connect to all configured MCP servers and discover their tools.
   * Called automatically by PluginHost.register().
   */
  async initialize(): Promise<void> {
    // M3: Restore persisted circuit state before attempting connections
    const persistedCircuit = await this.restoreCircuitState();

    // Load (or await pre-loaded) SDK
    const sdk = await this._sdk;
    if (!sdk) {
      throw new Error(
        "[McpPlugin] @modelcontextprotocol/sdk is not installed.\n" +
          "Install it: npm install @modelcontextprotocol/sdk",
      );
    }

    const toolIndex = new Map<string, string>(); // toolName → serverName (collision detection)
    const allTools: Tool[] = [];

    for (const serverCfg of this.config.servers) {
      try {
        // Skip servers whose circuit is open (in-memory OR persisted)
        const existingState = this.serverStates.get(serverCfg.name);
        const persistedFailures = persistedCircuit[serverCfg.name];
        const isCircuitOpen =
          (existingState && existingState.connectFailures >= this.config.maxConnectFailures) ||
          (persistedFailures !== undefined &&
            persistedFailures.trippedAt + this.config.circuitResetMs > Date.now());

        if (isCircuitOpen) {
          // Circuit is open — skip connection attempt
          continue;
        }

        const client = await this.createClient(sdk, serverCfg);

        // Wrap connect() with a configurable timeout
        await Promise.race([
          client.connect(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `MCP server "${serverCfg.name}" connection timed out after ${this.config.connectTimeoutMs}ms`,
                  ),
                ),
              this.config.connectTimeoutMs,
            ),
          ),
        ]);

        // Wrap listTools() with the same timeout
        const mcpTools = await Promise.race([
          client.listTools(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`MCP server "${serverCfg.name}" listTools() timed out`)),
              this.config.connectTimeoutMs,
            ),
          ),
        ]);

        const serverTools: Tool[] = [];

        for (const mcpTool of mcpTools) {
          // Sanitize tool name
          const rawName = mcpTool.name;
          const safeName = rawName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
          if (!safeName) {
            console.warn(
              `[McpPlugin] Skipping tool with empty/invalid name from "${serverCfg.name}": "${rawName}"`,
            );
            continue;
          }
          const baseName = safeName;
          const shouldPrefix = this.config.prefixNames || toolIndex.has(baseName);
          const finalName = shouldPrefix ? `${serverCfg.name}_${baseName}` : baseName;
          toolIndex.set(baseName, serverCfg.name);

          // Sanitize inputSchema before trusting it.
          const rawSchema = mcpTool.inputSchema as Record<string, unknown> | null | undefined;
          const safeSchema = sanitizeMcpSchema(rawSchema);

          // Per-server timeout: SSE servers can override the global toolTimeoutMs
          const effectiveTimeout =
            serverCfg.type === "sse" && serverCfg.toolTimeoutMs !== undefined
              ? serverCfg.toolTimeoutMs
              : this.config.timeoutMs;
          const capturedClient = client;
          const capturedName = mcpTool.name;
          const capturedTimeout = effectiveTimeout;

          const tool = buildTool({
            name: finalName,
            inputSchema: {
              type: "object",
              ...safeSchema,
            } as { type: "object"; properties?: Record<string, unknown> },
            maxResultChars: 20_000,
            describe: () => mcpTool.description ?? `MCP: ${capturedName}`,
            async call(args) {
              const result = await Promise.race([
                capturedClient.callTool(capturedName, args),
                new Promise<never>((_, reject) =>
                  setTimeout(
                    () => reject(new Error(`MCP tool "${capturedName}" timed out`)),
                    capturedTimeout,
                  ),
                ),
              ]);
              const text = (result as { content: Array<{ type: string; text?: string }> }).content
                .map((c) => c.text ?? "")
                .join("\n");
              return { data: text };
            },
          });

          serverTools.push(tool);
          allTools.push(tool);
        }

        this.serverStates.set(serverCfg.name, {
          cfg: serverCfg,
          client,
          tools: serverTools,
          connected: true,
          connectFailures: 0,
          reconnectAttempts: 0,
        });

        // Schedule SSE reconnect watcher for SSE servers
        if (serverCfg.type === "sse") {
          this._scheduleReconnectWatcher(serverCfg.name, sdk);
        }
      } catch (err) {
        console.warn(`[McpPlugin] Failed to connect to server "${serverCfg.name}":`, err);
        // Increment failure count (or start at 1 for a new server)
        const prev = this.serverStates.get(serverCfg.name);
        const connectFailures = (prev?.connectFailures ?? 0) + 1;
        if (connectFailures >= this.config.maxConnectFailures) {
          console.warn(
            `[McpPlugin] Circuit open for "${serverCfg.name}" after ${connectFailures} consecutive failures.`,
          );
          // M3: Persist circuit trip state
          await this.persistCircuitState(serverCfg.name, connectFailures);
        }
        this.serverStates.set(serverCfg.name, {
          cfg: serverCfg,
          client: null as unknown as McpClient,
          tools: [],
          connected: false,
          connectFailures,
        });
      }
    }

    this._allTools = allTools;
  }

  /**
   * Reset the circuit breaker for a named MCP server.
   * Also removes the server from persisted circuit state.
   *
   * After calling this, the next `initialize()` will attempt to reconnect
   * regardless of previous failures.
   */
  resetCircuit(serverName: string): void {
    const state = this.serverStates.get(serverName);
    if (state) state.connectFailures = 0;
    // Best-effort: clear from persisted state asynchronously
    this.clearPersistedCircuit(serverName).catch(() => {});
  }

  /**
   * M3: Persist circuit trip state to stateFile.
   * Best-effort: errors are swallowed (never blocks the reset).
   */
  private async persistCircuitState(serverName: string, connectFailures: number): Promise<void> {
    if (!this.config.stateFile) return;
    try {
      let state: Record<string, { trippedAt: number; connectFailures: number }> = {};
      try {
        state = JSON.parse(await readFile(this.config.stateFile, "utf8"));
      } catch {
        /* file doesn't exist yet */
      }
      state[serverName] = { trippedAt: Date.now(), connectFailures };

      // Atomic write: write to .tmp then rename — safe on process crash
      const tmpPath = this.config.stateFile + ".tmp";
      await writeFile(tmpPath, JSON.stringify(state, null, 2), "utf8");
      const { rename } = await import("node:fs/promises");
      await rename(tmpPath, this.config.stateFile);
    } catch {
      // Best-effort — circuit persistence failure must not affect plugin lifecycle
    }
  }

  /**
   * M3: Read persisted circuit state from stateFile.
   * Returns empty object if not configured or file doesn't exist.
   */
  private async restoreCircuitState(): Promise<
    Record<string, { trippedAt: number; connectFailures: number }>
  > {
    if (!this.config.stateFile) return {};
    try {
      return JSON.parse(await readFile(this.config.stateFile, "utf8"));
    } catch {
      return {};
    }
  }

  /**
   * M3: Remove a server from persisted circuit state after resetCircuit().
   */
  private async clearPersistedCircuit(serverName: string): Promise<void> {
    if (!this.config.stateFile) return;
    try {
      const state: Record<string, unknown> = JSON.parse(
        await readFile(this.config.stateFile, "utf8"),
      );
      delete state[serverName];
      // Atomic write on clear too
      const tmpPath = this.config.stateFile + ".tmp";
      const { rename } = await import("node:fs/promises");
      await writeFile(tmpPath, JSON.stringify(state, null, 2), "utf8");
      await rename(tmpPath, this.config.stateFile);
    } catch {
      /* best-effort */
    }
  }

  /**
   * Schedule a reconnect watcher for an SSE server.
   * The watcher polls `client.disconnect` / reconnect with exponential backoff
   * when the connection is detected as dropped.
   *
   * This uses a lazy-poll health check rather than EventEmitter hooks because
   * the MCP SSE client may not expose connection-drop callbacks.
   */
  private _scheduleReconnectWatcher(serverName: string, sdk: Awaited<McpPlugin["_sdk"]>): void {
    const cfg = this.config;
    const reconnectCfg = (() => {
      const serverCfg = this.serverStates.get(serverName)?.cfg;
      const perServer = serverCfg?.type === "sse" ? serverCfg.reconnect : undefined;
      const global = cfg.reconnect;
      return {
        enabled: perServer?.enabled ?? global?.enabled ?? true,
        initialDelayMs: perServer?.initialDelayMs ?? global?.initialDelayMs ?? 1_000,
        maxDelayMs: perServer?.maxDelayMs ?? global?.maxDelayMs ?? 30_000,
        maxAttempts: perServer?.maxAttempts ?? global?.maxAttempts ?? 5,
      };
    })();

    if (!reconnectCfg.enabled) return;

    // Poll every 5s to detect disconnection
    const POLL_MS = 5_000;
    const scheduleCheck = (attemptCount: number) => {
      const state = this.serverStates.get(serverName);
      if (!state || !sdk) return; // destroyed or SDK unavailable

      const handle = setTimeout(async () => {
        const current = this.serverStates.get(serverName);
        if (!current) return; // destroyed during wait
        if (!current.connected) {
          // Connection dropped — attempt reconnect with backoff
          const delay =
            Math.min(reconnectCfg.initialDelayMs * 2 ** attemptCount, reconnectCfg.maxDelayMs) *
            (0.8 + 0.4 * Math.random()); // ±20% jitter

          if (attemptCount >= reconnectCfg.maxAttempts) {
            console.warn(
              `[McpPlugin] SSE "${serverName}" reconnect exhausted after ${attemptCount} attempts. Circuit open.`,
            );
            current.connectFailures = cfg.maxConnectFailures;
            await this.persistCircuitState(serverName, current.connectFailures);
            return; // Stop retrying
          }

          console.info(
            `[McpPlugin] SSE "${serverName}" reconnecting (attempt ${attemptCount + 1}, delay ${Math.round(delay)}ms)...`,
          );
          await new Promise((r) => setTimeout(r, delay));

          try {
            const serverCfg = current.cfg;
            if (serverCfg.type !== "sse") return;
            const newClient = await this.createClient(sdk, serverCfg);
            await Promise.race([
              newClient.connect(),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("reconnect timeout")), cfg.connectTimeoutMs),
              ),
            ]);
            // Re-discover tools and update state
            const mcpTools = await newClient.listTools();
            const newState = this.serverStates.get(serverName);
            if (newState) {
              newState.client = newClient;
              newState.connected = true;
              newState.connectFailures = 0;
              newState.reconnectAttempts = 0;
            }
            console.info(`[McpPlugin] SSE "${serverName}" reconnected successfully.`);
            scheduleCheck(0); // reset attempt counter on success
            void mcpTools; // tools list acknowledged; in future could re-register
          } catch (err) {
            console.warn(
              `[McpPlugin] SSE "${serverName}" reconnect attempt ${attemptCount + 1} failed:`,
              err,
            );
            scheduleCheck(attemptCount + 1);
          }
        } else {
          scheduleCheck(0); // healthy — keep watching
        }
      }, POLL_MS);

      // Track handle so destroy() can clear it
      const s = this.serverStates.get(serverName);
      if (s) s.reconnectTimer = handle;
    };

    scheduleCheck(0);
  }

  /**
   * Disconnect from all MCP servers.
   * Called automatically by PluginHost.destroyAll() / PluginHost.unregister().
   */
  async destroy(): Promise<void> {
    for (const [name, state] of this.serverStates.entries()) {
      // Cancel any pending reconnect timer
      if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
      if (state.connected && state.client) {
        try {
          await state.client.disconnect();
        } catch {
          console.warn(`[McpPlugin] Error disconnecting from "${name}"`);
        }
      }
    }
    this.serverStates.clear();
    this._allTools = [];
  }

  /**
   * Returns true if at least one server is connected and its circuit is closed.
   * Servers whose circuit is open (connectFailures >= maxConnectFailures)
   * are excluded from this check.
   */
  async healthCheck(): Promise<boolean> {
    return (
      this.serverStates.size > 0 &&
      [...this.serverStates.values()].some(
        (s) => s.connected && s.connectFailures < this.config.maxConnectFailures,
      )
    );
  }

  // ── ToolProvider (McpAdapter extends ToolProvider) ────────────────────────

  /**
   * Returns all tools from all connected MCP servers.
   * Automatically included in PluginHost.getAllTools().
   */
  getTools(): Tool[] {
    return this._allTools;
  }

  // ── McpAdapter ────────────────────────────────────────────────────────────

  /**
   * List connection status for all configured MCP servers.
   */
  listServers(): McpServerInfo[] {
    return this.config.servers.map((cfg) => {
      const state = this.serverStates.get(cfg.name);
      return {
        name: cfg.name,
        transport: cfg.type,
        connected: state?.connected ?? false,
        toolCount: state?.tools.length ?? 0,
        endpoint:
          cfg.type === "sse" ? cfg.url : `${cfg.command} ${(cfg.args ?? []).join(" ")}`.trim(),
      };
    });
  }

  /**
   * Call a specific MCP tool directly, bypassing the Tool wrapper.
   * Optionally target a specific server when the tool name is ambiguous.
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    serverName?: string,
  ): Promise<string> {
    const candidates = [...this.serverStates.entries()].filter(
      ([name, state]) =>
        state.connected &&
        (!serverName || name === serverName) &&
        state.tools.some((t) => t.name === toolName || t.name === `${name}_${toolName}`),
    );

    if (candidates.length === 0) {
      throw new Error(`[McpPlugin] No connected server has tool "${toolName}"`);
    }

    const [, state] = candidates[0]!;
    // Strip prefix if present
    const rawName = toolName.startsWith(state.cfg.name + "_")
      ? toolName.slice(state.cfg.name.length + 1)
      : toolName;

    const result = await Promise.race([
      state.client.callTool(rawName, args),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`MCP tool "${rawName}" timed out`)),
          this.config.timeoutMs,
        ),
      ),
    ]);
    return (result as { content: Array<{ type: string; text?: string }> }).content
      .map((c) => c.text ?? "")
      .join("\n");
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async createClient(sdk: unknown, cfg: McpServerConfig): Promise<McpClient> {
    const { Client, StdioClientTransport, SSEClientTransport } = sdk as {
      Client: new (info: unknown, options: unknown) => McpClient;
      StdioClientTransport: new (cfg: unknown) => unknown;
      SSEClientTransport: new (url: URL, opts?: unknown) => unknown;
    };

    const client = new Client({ name: "yaaf", version: "1.0.0" }, { capabilities: { tools: {} } });

    let transport: unknown;
    if (cfg.type === "stdio") {
      transport = new StdioClientTransport({
        command: cfg.command,
        args: cfg.args,
        env: { ...process.env, ...(cfg.env ?? {}) },
      });
    } else {
      // Apply structured auth before connecting
      const mergedHeaders: Record<string, string> = { ...(cfg.headers ?? {}) };
      if (cfg.auth?.type === "bearer") {
        mergedHeaders["Authorization"] = `Bearer ${cfg.auth.token}`;
      }

      // Warn for remote SSE servers without any auth configured
      if (cfg.requireAuthForRemote !== false) {
        const url = new URL(cfg.url);
        const isLocal =
          url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
        if (!isLocal && !mergedHeaders["Authorization"]) {
          console.warn(
            `[McpPlugin] SSE server "${cfg.name}" at ${cfg.url} has no auth configured. ` +
              "Set auth.token or headers.Authorization, or set requireAuthForRemote: false to suppress this warning.",
          );
        }
      }

      transport = new SSEClientTransport(new URL(cfg.url), { headers: mergedHeaders });
    }

    // Monkey-patch connect to pass transport
    const originalConnect = client.connect.bind(client);
    client.connect = async () => {
      await (originalConnect as (t: unknown) => Promise<void>)(transport);
    };

    return client;
  }
}

// ── Factory helpers ───────────────────────────────────────────────────────────

/** Connect a single stdio MCP server. */
export function stdioMcp(name: string, command: string, args?: string[]): McpPlugin {
  return new McpPlugin({ servers: [{ name, type: "stdio", command, args }] });
}

/** Connect a single SSE MCP server. */
export function sseMcp(name: string, url: string, headers?: Record<string, string>): McpPlugin {
  return new McpPlugin({ servers: [{ name, type: "sse", url, headers }] });
}

/** Connect to the official filesystem MCP server for a given directory. */
export function filesystemMcp(dir: string): McpPlugin {
  return stdioMcp("filesystem", "npx", ["-y", "@modelcontextprotocol/server-filesystem", dir]);
}

// ── W8-03 Helper: MCP Schema Sanitizer ────────────────────────────────────────

/**
 * Sanitize a raw MCP tool inputSchema before trusting it.
 *
 * Guards against:
 * - __proto__ / constructor keys (prototype pollution)
 * - Extremely deep nesting (stack overflow in JSON schema validators)
 * - Oversized schemas (memory exhaustion)
 * - $ref cycles (validator infinite loop)
 *
 * Returns a safe schema with only known-good top-level JSON Schema keywords.
 */
function sanitizeMcpSchema(
  raw: Record<string, unknown> | null | undefined,
  maxDepth = 8,
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};

  // Dangerous prototype keys — reject the entire schema if found at top level.
  const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  for (const key of Object.keys(raw)) {
    if (DANGEROUS_KEYS.has(key)) {
      console.warn(`[McpPlugin] Rejecting tool schema containing dangerous key: "${key}"`);
      return {};
    }
  }

  // Deep-clone with depth cap to bound CPU + stack usage.
  function clamp(value: unknown, depth: number): unknown {
    if (depth <= 0) return "[truncated]";
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) {
      return value.slice(0, 50).map((v) => clamp(v, depth - 1));
    }
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (DANGEROUS_KEYS.has(k)) continue; // strip dangerous keys at any depth
      if (k === "$ref") continue; // strip $ref to prevent external resolution
      result[k] = clamp(v, depth - 1);
    }
    return result;
  }

  return clamp(raw, maxDepth) as Record<string, unknown>;
}
