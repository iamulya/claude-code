/**
 * L1-06: PluginHost E2E
 *
 * Tests real wiring between PluginHost, PluginBase, and adapter interfaces.
 */

import { describe, it, expect } from "vitest";
import { PluginHost, type PluginCapability } from "../../../plugin/types.js";
import { PluginBase } from "../../../plugin/base.js";
import { buildTool, type Tool } from "../../../tools/tool.js";

// ── Test Plugins ─────────────────────────────────────────────────────────────

class TestToolPlugin extends PluginBase {
  private tools: Tool[] = [];

  constructor(name: string, toolName: string) {
    super(name, ["tool_provider"]);
    this.tools = [
      buildTool({
        name: toolName,
        inputSchema: { type: "object", properties: {} },
        describe: () => `${toolName} from ${name}`,
        async call() {
          return { data: `result from ${toolName}` };
        },
      }),
    ];
  }

  getTools(): Tool[] {
    return this.tools;
  }
}

class HealthyPlugin extends PluginBase {
  constructor() {
    super("healthy-plugin", []);
  }

  override async healthCheck(): Promise<boolean> {
    return true;
  }
}

class UnhealthyPlugin extends PluginBase {
  constructor() {
    super("unhealthy-plugin", []);
  }

  override async healthCheck(): Promise<boolean> {
    return false;
  }
}

class StatefulPlugin extends PluginBase {
  destroyed = false;
  initialized = false;

  constructor() {
    super("stateful-plugin", []);
  }

  override async initialize(): Promise<void> {
    this.initialized = true;
  }

  override async destroy(): Promise<void> {
    this.destroyed = true;
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("L1-06: PluginHost E2E", () => {
  it("PluginHost.register() → plugin.initialize() called", async () => {
    const host = new PluginHost();
    const plugin = new StatefulPlugin();

    await host.register(plugin);
    expect(plugin.initialized).toBe(true);
  });

  it("PluginHost.getAllTools() merges tool provider tools", async () => {
    const host = new PluginHost();
    const pluginA = new TestToolPlugin("plugin-a", "tool_a");
    const pluginB = new TestToolPlugin("plugin-b", "tool_b");

    await host.register(pluginA);
    await host.register(pluginB);

    const tools = host.getAllTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("tool_a");
    expect(names).toContain("tool_b");
  });

  it("PluginHost.healthCheckAll() returns Map of health status", async () => {
    const host = new PluginHost();
    await host.register(new HealthyPlugin());

    const health = await host.healthCheckAll();
    // healthCheckAll returns Map<string, boolean>
    expect(health instanceof Map).toBe(true);
    expect(health.get("healthy-plugin")).toBe(true);
  });

  it("PluginHost.healthCheckAll() shows unhealthy plugin", async () => {
    const host = new PluginHost();
    await host.register(new HealthyPlugin());
    await host.register(new UnhealthyPlugin());

    const health = await host.healthCheckAll();
    expect(health.get("healthy-plugin")).toBe(true);
    expect(health.get("unhealthy-plugin")).toBe(false);
  });

  it("PluginHost.destroyAll() → all plugins destroyed", async () => {
    const host = new PluginHost();
    const stateful1 = new StatefulPlugin();
    // Use a different name for the second plugin
    class StatefulPlugin2 extends PluginBase {
      destroyed = false;
      initialized = false;
      constructor() {
        super("stateful-plugin-2", []);
      }
      override async initialize(): Promise<void> {
        this.initialized = true;
      }
      override async destroy(): Promise<void> {
        this.destroyed = true;
      }
    }
    const stateful2 = new StatefulPlugin2();

    await host.register(stateful1);
    await host.register(stateful2);

    await host.destroyAll();
    expect(stateful1.destroyed).toBe(true);
    expect(stateful2.destroyed).toBe(true);
  });

  it("PluginHost.hasCapability() returns correct result", async () => {
    const host = new PluginHost();
    const toolPlugin = new TestToolPlugin("tool-plugin", "my_tool");

    await host.register(toolPlugin);

    expect(host.hasCapability("tool_provider")).toBe(true);
    expect(host.hasCapability("browser")).toBe(false);
  });
});
