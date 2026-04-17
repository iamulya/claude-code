/**
 * TrustPolicy — Plugin & MCP Integrity Verification
 *
 * Verifies the integrity of plugins and MCP servers before they are loaded:
 *
 * - **Plugin hash verification** — SHA-256 checksum of plugin entry files
 * - **MCP tool allowlist/blocklist** — restrict which tools an MCP server can expose
 * - **Version constraints** — verify plugin version matches expected range
 * - **Audit logging** — logs every verification result
 *
 * Operates in two modes:
 * - `strict` — fail on any verification mismatch (default)
 * - `warn` — log warnings but allow loading
 *
 * @example
 * ```ts
 * import { TrustPolicy } from 'yaaf';
 *
 * const trust = new TrustPolicy({
 * plugins: {
 * 'my-plugin': { sha256: 'abc123...' },
 * },
 * mcpServers: {
 * 'github': { allowedTools: ['search_repos', 'get_issue'] },
 * },
 * });
 * ```
 *
 * @module security/trustPolicy
 */

import { createHash } from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type TrustPolicyMode = "strict" | "warn";

export type PluginTrust = {
  /** Expected SHA-256 hash of the plugin entry module content */
  sha256?: string;
  /** Semver version constraint (e.g., '>=1.0.0', '^2.3.0') */
  version?: string;
  /** Whether this plugin is explicitly trusted (bypasses hash check) */
  trusted?: boolean;
};

export type McpServerTrust = {
  /** If set, only these tools are allowed from this server */
  allowedTools?: string[];
  /** If set, these tools are explicitly blocked from this server */
  blockTools?: string[];
  /** Whether this server is explicitly trusted (bypasses tool filtering) */
  trusted?: boolean;
};

export type TrustPolicyConfig = {
  /**
   * Plugin trust declarations, keyed by plugin name.
   */
  plugins?: Record<string, PluginTrust>;

  /**
   * MCP server trust declarations, keyed by server name.
   */
  mcpServers?: Record<string, McpServerTrust>;

  /**
   * Verification mode:
   * - `strict` — fail on mismatch (default)
   * - `warn` — log warning, allow loading
   */
  mode?: TrustPolicyMode;

  /**
   * What to do with unregistered plugins/servers (not in the manifest):
   * - `allow` — permit unknown plugins (default in warn mode)
   * - `deny` — block unknown plugins (default in strict mode)
   */
  unknownPolicy?: "allow" | "deny";

  /**
   * Called on every verification event.
   */
  onVerification?: (event: TrustVerificationEvent) => void;
};

export type TrustVerificationEvent = {
  /** What was verified */
  target: "plugin" | "mcp_server" | "mcp_tool";
  /** Name of the entity */
  name: string;
  /** Result of verification */
  result: "trusted" | "verified" | "warning" | "blocked" | "unknown";
  /** Reason for the result */
  reason: string;
  /** Timestamp */
  timestamp: Date;
};

export type PluginVerificationResult = {
  allowed: boolean;
  reason: string;
  event: TrustVerificationEvent;
};

export type McpToolFilterResult = {
  /** Tools that passed the filter */
  allowed: Array<{ name: string; description?: string; inputSchema: unknown }>;
  /** Tools that were blocked */
  blocked: string[];
  /** Verification events */
  events: TrustVerificationEvent[];
};

// ── TrustPolicy ──────────────────────────────────────────────────────────────

export class TrustPolicy {
  readonly name = "trust-policy";
  private readonly plugins: Record<string, PluginTrust>;
  private readonly mcpServers: Record<string, McpServerTrust>;
  private readonly mode: TrustPolicyMode;
  private readonly unknownPolicy: "allow" | "deny";
  private readonly onVerification?: (event: TrustVerificationEvent) => void;

  constructor(config: TrustPolicyConfig = {}) {
    this.plugins = config.plugins ?? {};
    this.mcpServers = config.mcpServers ?? {};
    this.mode = config.mode ?? "strict";
    this.unknownPolicy = config.unknownPolicy ?? (this.mode === "strict" ? "deny" : "allow");
    this.onVerification = config.onVerification;
  }

  // ── Plugin Verification ─────────────────────────────────────────────────

  /**
   * Verify a plugin before loading.
   *
   * @param pluginName - The plugin's registered name
   * @param content - The plugin's source content (for hash verification)
   * @param version - The plugin's version string
   */
  verifyPlugin(
    pluginName: string,
    content?: string | Buffer,
    version?: string,
  ): PluginVerificationResult {
    const trust = this.plugins[pluginName];

    // Unknown plugin
    if (!trust) {
      const event = this.createEvent(
        "plugin",
        pluginName,
        this.unknownPolicy === "allow" ? "unknown" : "blocked",
        `Plugin "${pluginName}" is not in the trust manifest`,
      );
      return {
        allowed: this.unknownPolicy === "allow",
        reason: event.reason,
        event,
      };
    }

    // Explicitly trusted
    if (trust.trusted) {
      const event = this.createEvent("plugin", pluginName, "trusted", "Explicitly trusted");
      return { allowed: true, reason: event.reason, event };
    }

    // SHA-256 hash verification
    if (trust.sha256 && content) {
      const actualHash = computeSha256(content);
      if (actualHash !== trust.sha256) {
        const event = this.createEvent(
          "plugin",
          pluginName,
          this.mode === "strict" ? "blocked" : "warning",
          `Hash mismatch: expected ${trust.sha256.slice(0, 12)}..., got ${actualHash.slice(0, 12)}...`,
        );
        return {
          allowed: this.mode !== "strict",
          reason: event.reason,
          event,
        };
      }
    }

    // Version constraint check
    if (trust.version && version) {
      if (!satisfiesVersion(version, trust.version)) {
        const event = this.createEvent(
          "plugin",
          pluginName,
          this.mode === "strict" ? "blocked" : "warning",
          `Version mismatch: ${version} does not satisfy ${trust.version}`,
        );
        return {
          allowed: this.mode !== "strict",
          reason: event.reason,
          event,
        };
      }
    }

    // All checks passed
    const event = this.createEvent("plugin", pluginName, "verified", "All integrity checks passed");
    return { allowed: true, reason: event.reason, event };
  }

  // ── MCP Tool Filtering ──────────────────────────────────────────────────

  /**
   * Filter tools from an MCP server based on the trust policy.
   *
   * @param serverName - The MCP server's name
   * @param tools - Tools reported by the server
   * @returns Filtered tool list and blocked tool names
   */
  filterMcpTools(
    serverName: string,
    tools: Array<{ name: string; description?: string; inputSchema: unknown }>,
  ): McpToolFilterResult {
    const trust = this.mcpServers[serverName];
    const events: TrustVerificationEvent[] = [];

    // Unknown server
    if (!trust) {
      if (this.unknownPolicy === "deny") {
        const event = this.createEvent(
          "mcp_server",
          serverName,
          "blocked",
          `MCP server "${serverName}" is not in the trust manifest`,
        );
        events.push(event);
        return { allowed: [], blocked: tools.map((t) => t.name), events };
      }
      // Allow all tools from unknown servers in warn mode
      const event = this.createEvent(
        "mcp_server",
        serverName,
        "unknown",
        `MCP server "${serverName}" is not in the manifest — all tools allowed`,
      );
      events.push(event);
      return { allowed: tools, blocked: [], events };
    }

    // Explicitly trusted — allow all
    if (trust.trusted) {
      const event = this.createEvent(
        "mcp_server",
        serverName,
        "trusted",
        "Server is explicitly trusted",
      );
      events.push(event);
      return { allowed: tools, blocked: [], events };
    }

    const allowed: typeof tools = [];
    const blocked: string[] = [];

    for (const tool of tools) {
      let isAllowed = true;

      // Allowlist check (if set, only these tools are permitted)
      if (trust.allowedTools && !trust.allowedTools.includes(tool.name)) {
        isAllowed = false;
      }

      // Blocklist check (explicitly blocked tools)
      if (trust.blockTools && trust.blockTools.includes(tool.name)) {
        isAllowed = false;
      }

      if (isAllowed) {
        allowed.push(tool);
        events.push(
          this.createEvent(
            "mcp_tool",
            `${serverName}/${tool.name}`,
            "verified",
            `Tool "${tool.name}" allowed by trust policy`,
          ),
        );
      } else {
        blocked.push(tool.name);
        events.push(
          this.createEvent(
            "mcp_tool",
            `${serverName}/${tool.name}`,
            "blocked",
            `Tool "${tool.name}" blocked by trust policy for server "${serverName}"`,
          ),
        );
      }
    }

    return { allowed, blocked, events };
  }

  // ── Utility ─────────────────────────────────────────────────────────────

  /**
   * Compute SHA-256 hash of a file/string. Utility for generating manifest entries.
   */
  static hash(content: string | Buffer): string {
    return computeSha256(content);
  }

  private createEvent(
    target: TrustVerificationEvent["target"],
    name: string,
    result: TrustVerificationEvent["result"],
    reason: string,
  ): TrustVerificationEvent {
    const event: TrustVerificationEvent = { target, name, result, reason, timestamp: new Date() };
    this.onVerification?.(event);
    return event;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeSha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Simplified semver check — supports ^, ~, >=, <=, = prefixes */
function satisfiesVersion(actual: string, constraint: string): boolean {
  const parseVersion = (v: string): number[] =>
    v
      .replace(/^[v^~>=<]+/, "")
      .split(".")
      .map(Number);

  const [aMajor = 0, aMinor = 0, aPatch = 0] = parseVersion(actual);
  const [cMajor = 0, cMinor = 0, cPatch = 0] = parseVersion(constraint);

  // Treat malformed version components as non-matching.
  // Without this, "1.x.0" maps to NaN which compares as false to everything,
  // silently passing the constraint check (NaN >= 0 is false but NaN === 0 is
  // also false, so the exact-match fallthrough returns true incorrectly).
  if ([aMajor, aMinor, aPatch, cMajor, cMinor, cPatch].some(isNaN)) return false;

  if (constraint.startsWith(">=")) {
    return (
      aMajor > cMajor ||
      (aMajor === cMajor && aMinor > cMinor) ||
      (aMajor === cMajor && aMinor === cMinor && aPatch >= cPatch)
    );
  }

  if (constraint.startsWith("^")) {
    // ^1.2.3 means >=1.2.3, <2.0.0
    if (aMajor !== cMajor) return false;
    return aMinor > cMinor || (aMinor === cMinor && aPatch >= cPatch);
  }

  if (constraint.startsWith("~")) {
    // ~1.2.3 means >=1.2.3, <1.3.0
    if (aMajor !== cMajor || aMinor !== cMinor) return false;
    return aPatch >= cPatch;
  }

  // Exact match
  return aMajor === cMajor && aMinor === cMinor && aPatch === cPatch;
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a trust policy with sensible defaults.
 */
export function trustPolicy(config?: TrustPolicyConfig): TrustPolicy {
  return new TrustPolicy(config);
}
