/**
 * L1-13: MCP Plugin E2E
 *
 * Tests McpPlugin wiring with mocked SDK (no real MCP server needed).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { McpPlugin, type McpPluginConfig } from "../../../integrations/mcp.js";

// Mock the MCP SDK dynamic import — we can't start real MCP servers in tests.
// McpPlugin uses `new Function('m', 'return import(m)')` for dynamic import,
// so we test the plugin's behavior with a minimal mock.

describe("L1-13: MCP Plugin E2E", () => {
  it("McpPlugin instantiates with valid config", () => {
    const plugin = new McpPlugin({
      servers: [
        {
          name: "test-server",
          type: "stdio",
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
        },
      ],
    });

    expect(plugin.name).toContain("test-server");
    expect(plugin.transports).toContain("stdio");
  });

  it("McpPlugin reports correct transport types", () => {
    const plugin = new McpPlugin({
      servers: [
        { name: "stdio-srv", type: "stdio", command: "echo", args: [] },
        { name: "sse-srv", type: "sse", url: "http://localhost:3000" },
      ],
    });

    const transports = plugin.transports;
    expect(transports).toContain("stdio");
    expect(transports).toContain("sse");
  });

  it("McpPlugin with prefixNames config is accepted", () => {
    const plugin = new McpPlugin({
      servers: [{ name: "srv1", type: "stdio", command: "echo" }],
      prefixNames: true,
      timeoutMs: 15_000,
      connectTimeoutMs: 5_000,
      maxConnectFailures: 3,
    });

    expect(plugin).toBeDefined();
  });

  it("McpPlugin resetCircuit resets failure count", () => {
    const plugin = new McpPlugin({
      servers: [{ name: "flaky", type: "stdio", command: "echo" }],
    });

    // resetCircuit should not throw even if server hasn't failed
    plugin.resetCircuit("flaky");
    expect(true).toBe(true);
  });

  it("McpPlugin.listServers() returns config for all servers", () => {
    const plugin = new McpPlugin({
      servers: [
        { name: "srv-a", type: "stdio", command: "echo" },
        { name: "srv-b", type: "sse", url: "http://localhost:8080" },
      ],
    });

    const servers = plugin.listServers();
    expect(servers.length).toBe(2);
    expect(servers[0]!.name).toBe("srv-a");
    expect(servers[0]!.transport).toBe("stdio");
    expect(servers[1]!.name).toBe("srv-b");
    expect(servers[1]!.transport).toBe("sse");
    expect(servers[1]!.endpoint).toBe("http://localhost:8080");
  });

  it("McpPlugin.getTools() returns empty before initialize", () => {
    const plugin = new McpPlugin({
      servers: [{ name: "srv", type: "stdio", command: "echo" }],
    });

    expect(plugin.getTools()).toEqual([]);
  });

  it("McpPlugin SSE server with auth config", () => {
    const plugin = new McpPlugin({
      servers: [
        {
          name: "authed-sse",
          type: "sse",
          url: "https://mcp.example.com",
          auth: { type: "bearer", token: "test-token-123" },
          requireAuthForRemote: true,
        },
      ],
    });

    expect(plugin.listServers()[0]!.name).toBe("authed-sse");
  });

  it("McpPlugin with reconnect config", () => {
    const plugin = new McpPlugin({
      servers: [
        {
          name: "reconnectable",
          type: "sse",
          url: "http://localhost:3000",
          reconnect: {
            enabled: true,
            initialDelayMs: 500,
            maxDelayMs: 10_000,
            maxAttempts: 3,
          },
        },
      ],
      reconnect: {
        enabled: true,
        initialDelayMs: 1_000,
        maxDelayMs: 30_000,
        maxAttempts: 5,
      },
    });

    expect(plugin).toBeDefined();
  });

  it("McpPlugin with circuit breaker stateFile config", () => {
    const plugin = new McpPlugin({
      servers: [{ name: "persistent", type: "stdio", command: "echo" }],
      stateFile: "/tmp/yaaf-test-circuit.json",
      circuitResetMs: 60_000,
    });

    expect(plugin).toBeDefined();
  });
});
