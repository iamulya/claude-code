/**
 * Agent Registry — Versioned agent configuration management (Gap #5)
 *
 * Stores named agent configurations by version, enabling:
 * - Registering new versions of an agent config
 * - Resolving a specific version or latest
 * - Creating Agent instances from registered configs
 * - Pinning sessions to specific agent versions
 *
 * @example
 * ```ts
 * const registry = new AgentRegistry();
 *
 * registry.register('support-agent', {
 *   systemPrompt: 'You are a v1 support agent.',
 *   tools: [searchTool],
 * });
 *
 * registry.register('support-agent', {
 *   systemPrompt: 'You are a v2 support agent (improved).',
 *   tools: [searchTool, escalateTool],
 * });
 *
 * // Create latest version
 * const agent = await registry.createAgent('support-agent');
 *
 * // Pin to v1
 * const v1Agent = await registry.createAgent('support-agent', 1);
 * ```
 *
 * @module agents/registry
 */

import type { AgentConfig } from "../agent.js";

// ── Types ────────────────────────────────────────────────────────────────────

/** An agent config annotated with version metadata */
export type VersionedAgentConfig = AgentConfig & {
  /** Version number (monotonically increasing, starting at 1) */
  version: number;
  /** ISO timestamp of when this version was registered */
  registeredAt: string;
  /** Optional description of what changed in this version */
  changeDescription?: string;
};

/** Summary of a registered agent */
export type AgentRegistryEntry = {
  name: string;
  versions: number;
  latestVersion: number;
  registeredAt: string;
};

// ── AgentRegistry ────────────────────────────────────────────────────────────

/**
 * In-memory registry for versioned agent configurations.
 *
 * Agents are registered by name, and each registration creates a new
 * version. Sessions can be pinned to specific versions for staged
 * rollouts or A/B testing.
 */
export class AgentRegistry {
  private configs = new Map<string, VersionedAgentConfig[]>();

  /**
   * Register a new version of an agent configuration.
   *
   * Each call creates a new version number (monotonically increasing).
   * The config is stored immutably — modifications to the original
   * config object after registration have no effect.
   *
   * @param name Unique agent name (e.g., 'support-agent')
   * @param config The agent configuration for this version
   * @param changeDescription Optional description of what changed
   * @returns The versioned config with assigned version number
   */
  register(
    name: string,
    config: AgentConfig,
    changeDescription?: string,
  ): VersionedAgentConfig {
    // Validate name
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error(
        `Invalid agent name "${name}": must contain only letters, digits, hyphens, and underscores`,
      );
    }

    const versions = this.configs.get(name) ?? [];
    const version = versions.length + 1;

    const versioned: VersionedAgentConfig = {
      // Deep-copy to prevent external mutation
      ...structuredClone({
        ...config,
        // These can't be structuredCloned (functions/classes), pass through
        chatModel: undefined,
        tools: undefined,
        plugins: undefined,
        permissions: undefined,
        accessPolicy: undefined,
        hooks: undefined,
        sandbox: undefined,
        session: undefined,
        contextManager: undefined,
        memoryStrategy: undefined,
        memory: undefined,
        systemPromptProvider: undefined,
      }),
      // Restore non-cloneable references
      chatModel: config.chatModel,
      tools: config.tools ? [...config.tools] : undefined,
      plugins: config.plugins ? [...config.plugins] : undefined,
      permissions: config.permissions,
      accessPolicy: config.accessPolicy,
      hooks: config.hooks,
      sandbox: config.sandbox,
      session: config.session,
      contextManager: config.contextManager,
      memoryStrategy: config.memoryStrategy,
      memory: config.memory,
      systemPromptProvider: config.systemPromptProvider,
      // Version metadata
      name,
      version,
      registeredAt: new Date().toISOString(),
      changeDescription,
    };

    versions.push(versioned);
    this.configs.set(name, versions);
    return versioned;
  }

  /**
   * Resolve a specific version of an agent config.
   *
   * @param name Agent name
   * @param version Version number (omit for latest)
   * @returns The versioned config, or undefined if not found
   */
  resolve(name: string, version?: number): VersionedAgentConfig | undefined {
    const versions = this.configs.get(name);
    if (!versions?.length) return undefined;

    if (version !== undefined) {
      return versions.find((v) => v.version === version);
    }
    // Return latest
    return versions[versions.length - 1];
  }

  /**
   * Create an Agent instance from a registered config.
   *
   * @param name Agent name
   * @param version Version number (omit for latest)
   * @returns A new Agent instance
   * @throws If the agent name/version is not found
   */
  async createAgent(
    name: string,
    version?: number,
  ): Promise<import("../agent.js").Agent> {
    const config = this.resolve(name, version);
    if (!config) {
      throw new Error(
        `Agent "${name}" v${version ?? "latest"} not found in registry`,
      );
    }

    // Import Agent dynamically to avoid circular dependency
    const { Agent } = await import("../agent.js");
    return Agent.create(config);
  }

  /**
   * List all registered agents with version counts.
   */
  list(): AgentRegistryEntry[] {
    const entries: AgentRegistryEntry[] = [];
    for (const [name, versions] of this.configs) {
      if (versions.length > 0) {
        entries.push({
          name,
          versions: versions.length,
          latestVersion: versions.length,
          registeredAt: versions[versions.length - 1]!.registeredAt,
        });
      }
    }
    return entries;
  }

  /**
   * Get the full version history of an agent.
   *
   * @param name Agent name
   * @returns Array of all versioned configs, or empty array if not found
   */
  getHistory(name: string): readonly VersionedAgentConfig[] {
    return this.configs.get(name) ?? [];
  }

  /**
   * Remove an agent (all versions) from the registry.
   *
   * @param name Agent name to remove
   * @returns true if the agent was found and removed
   */
  remove(name: string): boolean {
    return this.configs.delete(name);
  }

  /** Total number of registered agent names */
  get size(): number {
    return this.configs.size;
  }
}
