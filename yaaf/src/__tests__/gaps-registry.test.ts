/**
 * Tests for Gap #5 (Agent Versioning) — AgentRegistry
 */

import { describe, it, expect } from "vitest";
import { AgentRegistry } from "../agents/registry.js";
import type { AgentConfig } from "../agent.js";

function makeConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    systemPrompt: "Test agent",
    name: "test-agent",
    ...overrides,
  } as AgentConfig;
}

describe("Gap #5: AgentRegistry", () => {
  it("register() assigns incrementing version numbers", () => {
    const registry = new AgentRegistry();

    const v1 = registry.register("my-agent", makeConfig({ systemPrompt: "v1" }));
    expect(v1.version).toBe(1);
    expect(v1.registeredAt).toBeDefined();

    const v2 = registry.register("my-agent", makeConfig({ systemPrompt: "v2" }));
    expect(v2.version).toBe(2);

    const v3 = registry.register("my-agent", makeConfig({ systemPrompt: "v3" }));
    expect(v3.version).toBe(3);
  });

  it("resolve() returns latest version by default", () => {
    const registry = new AgentRegistry();
    registry.register("agent-a", makeConfig({ systemPrompt: "v1" }));
    registry.register("agent-a", makeConfig({ systemPrompt: "v2" }));
    registry.register("agent-a", makeConfig({ systemPrompt: "v3" }));

    const latest = registry.resolve("agent-a");
    expect(latest).toBeDefined();
    expect(latest!.version).toBe(3);
    expect(latest!.systemPrompt).toBe("v3");
  });

  it("resolve() returns specific version when requested", () => {
    const registry = new AgentRegistry();
    registry.register("agent-b", makeConfig({ systemPrompt: "first" }));
    registry.register("agent-b", makeConfig({ systemPrompt: "second" }));

    const v1 = registry.resolve("agent-b", 1);
    expect(v1).toBeDefined();
    expect(v1!.systemPrompt).toBe("first");

    const v2 = registry.resolve("agent-b", 2);
    expect(v2).toBeDefined();
    expect(v2!.systemPrompt).toBe("second");
  });

  it("resolve() returns undefined for unknown agent", () => {
    const registry = new AgentRegistry();
    expect(registry.resolve("unknown")).toBeUndefined();
  });

  it("resolve() returns undefined for unknown version", () => {
    const registry = new AgentRegistry();
    registry.register("agent-c", makeConfig());
    expect(registry.resolve("agent-c", 99)).toBeUndefined();
  });

  it("list() returns summary of all registered agents", () => {
    const registry = new AgentRegistry();
    registry.register("agent-x", makeConfig());
    registry.register("agent-x", makeConfig());
    registry.register("agent-y", makeConfig());

    const list = registry.list();
    expect(list.length).toBe(2);

    const agentX = list.find((e) => e.name === "agent-x");
    expect(agentX).toBeDefined();
    expect(agentX!.versions).toBe(2);
    expect(agentX!.latestVersion).toBe(2);

    const agentY = list.find((e) => e.name === "agent-y");
    expect(agentY).toBeDefined();
    expect(agentY!.versions).toBe(1);
  });

  it("getHistory() returns all versions of an agent", () => {
    const registry = new AgentRegistry();
    registry.register("agent-h", makeConfig({ systemPrompt: "v1" }));
    registry.register("agent-h", makeConfig({ systemPrompt: "v2" }));

    const history = registry.getHistory("agent-h");
    expect(history.length).toBe(2);
    expect(history[0]!.version).toBe(1);
    expect(history[1]!.version).toBe(2);
  });

  it("remove() deletes an agent from the registry", () => {
    const registry = new AgentRegistry();
    registry.register("agent-r", makeConfig());
    expect(registry.size).toBe(1);

    const removed = registry.remove("agent-r");
    expect(removed).toBe(true);
    expect(registry.size).toBe(0);
    expect(registry.resolve("agent-r")).toBeUndefined();
  });

  it("register() rejects invalid agent names", () => {
    const registry = new AgentRegistry();

    expect(() => registry.register("", makeConfig())).toThrow("Invalid agent name");
    expect(() => registry.register("my/agent", makeConfig())).toThrow("Invalid agent name");
    expect(() => registry.register("my agent", makeConfig())).toThrow("Invalid agent name");
  });

  it("changeDescription is stored", () => {
    const registry = new AgentRegistry();
    const v1 = registry.register("agent-d", makeConfig(), "Initial version");
    expect(v1.changeDescription).toBe("Initial version");

    const v2 = registry.register("agent-d", makeConfig(), "Added new tools");
    expect(v2.changeDescription).toBe("Added new tools");
  });

  it("registered configs are isolated from external mutation", () => {
    const registry = new AgentRegistry();
    const config = makeConfig({ systemPrompt: "original" });
    registry.register("agent-iso", config);

    // Mutate the original config object
    config.systemPrompt = "mutated";

    // Registry should still have the original
    const resolved = registry.resolve("agent-iso");
    expect(resolved!.systemPrompt).toBe("original");
  });
});
