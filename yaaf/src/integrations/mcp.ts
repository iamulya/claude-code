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
 *   - Registering it with `PluginHost.register()` automatically makes its tools
 *     available via `PluginHost.getAllTools()` — no extra wiring needed.
 *   - `PluginHost.getMcpTools()` isolates just MCP-sourced tools.
 *   - `PluginHost.getMcpServers()` gives connection status for all servers.
 *   - `PluginHost.healthCheckAll()` includes MCP connectivity.
 *   - `PluginHost.destroyAll()` cleanly disconnects all MCP servers.
 *
 * ## Peer dependency
 *
 * `@modelcontextprotocol/sdk` is a PEER DEPENDENCY — install only if you use MCP:
 *
 *   npm install @modelcontextprotocol/sdk
 *
 * @example
 * ```ts
 * // Using with PluginHost (recommended — full lifecycle management)
 * const host = new PluginHost();
 * await host.register(new McpPlugin({
 *   servers: [
 *     { name: 'filesystem', type: 'stdio',
 *       command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'] },
 *     { name: 'github', type: 'sse',
 *       url: 'https://mcp.github.com',
 *       headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } },
 *   ],
 * }));
 *
 * // MCP tools appear automatically in getAllTools()
 * const tools = host.getAllTools();  // → [...nativeTools, ...mcpTools]
 *
 * // MCP-specific introspection
 * const servers = host.getMcpServers();
 * // → [{ name: 'filesystem', transport: 'stdio', connected: true, toolCount: 12 }, ...]
 *
 * // Standalone (no PluginHost)
 * const plugin = new McpPlugin({ servers: [...] });
 * await plugin.initialize();
 * const tools = plugin.getTools();  // ready to use
 * ```
 */

import { buildTool } from '../tools/tool.js'
import type { Tool } from '../tools/tool.js'
import type { McpAdapter, McpServerInfo, PluginCapability } from '../plugin/types.js'
import { PluginBase } from '../plugin/base.js'

// ── Config types ──────────────────────────────────────────────────────────────

export type McpStdioServer = {
  name: string
  type: 'stdio'
  /** Command to run (e.g. 'npx', 'node', 'python') */
  command: string
  /** Arguments to the command */
  args?: string[]
  /** Environment variables to pass to the process */
  env?: Record<string, string>
}

export type McpSseServer = {
  name: string
  type: 'sse'
  /** URL of the MCP SSE server */
  url: string
  /** Additional HTTP headers (e.g. Authorization) */
  headers?: Record<string, string>
}

export type McpServerConfig = McpStdioServer | McpSseServer

export type McpPluginConfig = {
  servers: McpServerConfig[]
  /**
   * Explicit plugin name. If omitted, derived from server names.
   * Set this when registering multiple McpPlugin instances with overlapping
   * server names to avoid collisions in PluginHost.
   */
  name?: string
  /**
   * Timeout for tool calls (ms). Default: 30_000.
   */
  timeoutMs?: number
  /**
   * When true, prefix tool names with the server name to avoid collisions:
   * `filesystem_read_file` instead of `read_file`.
   * Default: false (only prefix on collision).
   */
  prefixNames?: boolean
}

// ── Internal types ────────────────────────────────────────────────────────────

/** Dynamically loaded MCP SDK client. */
type McpClient = {
  connect(): Promise<void>
  disconnect(): Promise<void>
  listTools(): Promise<Array<{ name: string; description?: string; inputSchema: unknown }>>
  callTool(name: string, args: unknown): Promise<{ content: Array<{ type: string; text?: string }> }>
}

type ServerState = {
  cfg: McpServerConfig
  client: McpClient
  tools: Tool[]
  connected: boolean
}

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
  override readonly capabilities: readonly PluginCapability[] = ['mcp', 'tool_provider']

  // ── McpAdapter ─────────────────────────────────────────────────────────────

  get transports(): ReadonlyArray<'stdio' | 'sse'> {
    const types = new Set(this.config.servers.map(s => s.type))
    return [...types] as Array<'stdio' | 'sse'>
  }

  // ── State ──────────────────────────────────────────────────────────────────

  private readonly config: Required<Omit<McpPluginConfig, 'name'>>
  private serverStates: Map<string, ServerState> = new Map()
  private _allTools: Tool[] = []

  constructor(config: McpPluginConfig) {
    const derivedName = config.name ?? `mcp:${config.servers.map(s => s.name).join('+')}`
    super(derivedName, ['mcp', 'tool_provider'])
    this.config = { timeoutMs: 30_000, prefixNames: false, ...config }
  }

  // ── Plugin lifecycle (called by PluginHost) ───────────────────────────────

  /**
   * Connect to all configured MCP servers and discover their tools.
   * Called automatically by PluginHost.register().
   */
  async initialize(): Promise<void> {
    // Lazy import of peer dependency
    let sdk: {
      Client: new (info: unknown, options: unknown) => unknown
      StdioClientTransport: new (config: unknown) => unknown
      SSEClientTransport: new (url: URL, options?: unknown) => unknown
    }
    try {
      const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>
      sdk = await dynamicImport('@modelcontextprotocol/sdk/client/index.js') as typeof sdk
    } catch {
      throw new Error(
        '[McpPlugin] @modelcontextprotocol/sdk is not installed.\n' +
        'Install it: npm install @modelcontextprotocol/sdk',
      )
    }

    const toolIndex = new Map<string, string>() // toolName → serverName (collision detection)
    const allTools: Tool[] = []

    for (const serverCfg of this.config.servers) {
      try {
        const client = await this.createClient(sdk, serverCfg)
        await client.connect()

        const mcpTools = await client.listTools()
        const serverTools: Tool[] = []

        for (const mcpTool of mcpTools) {
          const baseName = mcpTool.name
          const shouldPrefix = this.config.prefixNames || toolIndex.has(baseName)
          const finalName = shouldPrefix ? `${serverCfg.name}_${baseName}` : baseName
          toolIndex.set(baseName, serverCfg.name)

          const capturedClient = client
          const capturedName = mcpTool.name
          const capturedTimeout = this.config.timeoutMs

          const tool = buildTool({
            name: finalName,
            inputSchema: {
              type: 'object',
              ...(mcpTool.inputSchema as Record<string, unknown> ?? {}),
            } as { type: 'object'; properties?: Record<string, unknown> },
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
              ])
              const text = (result as { content: Array<{ type: string; text?: string }> })
                .content.map((c) => c.text ?? '').join('\n')
              return { data: text }
            },
          })

          serverTools.push(tool)
          allTools.push(tool)
        }

        this.serverStates.set(serverCfg.name, {
          cfg: serverCfg,
          client,
          tools: serverTools,
          connected: true,
        })
      } catch (err) {
        console.warn(`[McpPlugin] Failed to connect to server "${serverCfg.name}":`, err)
        // Mark as disconnected but don't fail — other servers may be fine
        this.serverStates.set(serverCfg.name, {
          cfg: serverCfg,
          client: null as unknown as McpClient,
          tools: [],
          connected: false,
        })
      }
    }

    this._allTools = allTools
  }

  /**
   * Disconnect from all MCP servers.
   * Called automatically by PluginHost.destroyAll() / PluginHost.unregister().
   */
  async destroy(): Promise<void> {
    for (const [name, state] of this.serverStates.entries()) {
      if (state.connected && state.client) {
        try {
          await state.client.disconnect()
        } catch {
          console.warn(`[McpPlugin] Error disconnecting from "${name}"`)
        }
      }
    }
    this.serverStates.clear()
    this._allTools = []
  }

  /**
   * Returns true if at least one server is connected.
   */
  async healthCheck(): Promise<boolean> {
    return this.serverStates.size > 0 &&
      [...this.serverStates.values()].some(s => s.connected)
  }

  // ── ToolProvider (McpAdapter extends ToolProvider) ────────────────────────

  /**
   * Returns all tools from all connected MCP servers.
   * Automatically included in PluginHost.getAllTools().
   */
  getTools(): Tool[] {
    return this._allTools
  }

  // ── McpAdapter ────────────────────────────────────────────────────────────

  /**
   * List connection status for all configured MCP servers.
   */
  listServers(): McpServerInfo[] {
    return this.config.servers.map(cfg => {
      const state = this.serverStates.get(cfg.name)
      return {
        name: cfg.name,
        transport: cfg.type,
        connected: state?.connected ?? false,
        toolCount: state?.tools.length ?? 0,
        endpoint: cfg.type === 'sse' ? cfg.url : `${cfg.command} ${(cfg.args ?? []).join(' ')}`.trim(),
      }
    })
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
    const candidates = [...this.serverStates.entries()]
      .filter(([name, state]) =>
        state.connected &&
        (!serverName || name === serverName) &&
        state.tools.some(t => t.name === toolName || t.name === `${name}_${toolName}`),
      )

    if (candidates.length === 0) {
      throw new Error(`[McpPlugin] No connected server has tool "${toolName}"`)
    }

    const [, state] = candidates[0]!
    // Strip prefix if present
    const rawName = toolName.startsWith(state.cfg.name + '_')
      ? toolName.slice(state.cfg.name.length + 1)
      : toolName

    const result = await Promise.race([
      state.client.callTool(rawName, args),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`MCP tool "${rawName}" timed out`)),
          this.config.timeoutMs,
        ),
      ),
    ])
    return (result as { content: Array<{ type: string; text?: string }> })
      .content.map(c => c.text ?? '').join('\n')
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async createClient(sdk: unknown, cfg: McpServerConfig): Promise<McpClient> {
    const { Client, StdioClientTransport, SSEClientTransport } = sdk as {
      Client: new (info: unknown, options: unknown) => McpClient
      StdioClientTransport: new (cfg: unknown) => unknown
      SSEClientTransport: new (url: URL, opts?: unknown) => unknown
    }

    const client = new Client(
      { name: 'yaaf', version: '1.0.0' },
      { capabilities: { tools: {} } },
    )

    let transport: unknown
    if (cfg.type === 'stdio') {
      transport = new StdioClientTransport({
        command: cfg.command,
        args: cfg.args,
        env: { ...process.env, ...(cfg.env ?? {}) },
      })
    } else {
      transport = new SSEClientTransport(
        new URL(cfg.url),
        { headers: cfg.headers },
      )
    }

    // Monkey-patch connect to pass transport
    const originalConnect = client.connect.bind(client)
    client.connect = async () => { await (originalConnect as (t: unknown) => Promise<void>)(transport) }

    return client
  }
}

// ── Factory helpers ───────────────────────────────────────────────────────────

/** Connect a single stdio MCP server. */
export function stdioMcp(name: string, command: string, args?: string[]): McpPlugin {
  return new McpPlugin({ servers: [{ name, type: 'stdio', command, args }] })
}

/** Connect a single SSE MCP server. */
export function sseMcp(name: string, url: string, headers?: Record<string, string>): McpPlugin {
  return new McpPlugin({ servers: [{ name, type: 'sse', url, headers }] })
}

/** Connect to the official filesystem MCP server for a given directory. */
export function filesystemMcp(dir: string): McpPlugin {
  return stdioMcp('filesystem', 'npx', ['-y', '@modelcontextprotocol/server-filesystem', dir])
}
