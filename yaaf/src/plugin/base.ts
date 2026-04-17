/**
 * PluginBase — shared base class for all YAAF plugins.
 *
 * Provides the boilerplate `version`, `capabilities`, `name`, and a default
 * `healthCheck()` so concrete plugin classes only implement what's unique.
 *
 * @example
 * ```ts
 * export class MyPlugin extends PluginBase implements MemoryAdapter {
 * constructor() {
 * super('my-plugin', ['memory'])
 * }
 * // implement MemoryAdapter methods...
 * }
 * ```
 */

import type { Plugin, PluginCapability } from "./types.js";

export abstract class PluginBase implements Plugin {
  readonly name: string;
  readonly version = "1.0.0";
  readonly capabilities: readonly PluginCapability[];

  constructor(name: string, capabilities: PluginCapability[]) {
    this.name = name;
    this.capabilities = capabilities;
  }

  /**
   * Default healthCheck — returns true (alive by assumption).
   * Override to probe real connectivity (HTTP ping, DB query, etc).
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Default initialize — no-op. Override for async setup.
   */
  async initialize(): Promise<void> {}

  /**
   * Default destroy — no-op. Override for graceful teardown.
   */
  async destroy(): Promise<void> {}
}
