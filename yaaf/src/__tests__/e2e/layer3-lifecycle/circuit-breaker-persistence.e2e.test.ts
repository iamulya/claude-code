/**
 * L3-05: Circuit Breaker Persistence — Lifecycle & Durability
 *
 * Validates that the MCP plugin's circuit breaker state persists to a
 * stateFile, survives process restarts, respects circuitResetMs, and
 * clears correctly on resetCircuit().
 *
 * Uses a mock MCP SDK to avoid real MCP server connections.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { McpPlugin } from "../../../integrations/mcp.js";
import { createTestDir } from "../_fixtures/helpers.js";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ── Mock MCP SDK ──────────────────────────────────────────────────────────────

// We need to mock the dynamic import of @modelcontextprotocol/sdk
// The McpPlugin uses `new Function("m", "return import(m)")` to import it

let connectShouldFail = false;
let connectCallCount = 0;

class MockClient {
  async connect() {
    connectCallCount++;
    if (connectShouldFail) {
      throw new Error("Connection refused");
    }
  }
  async disconnect() {}
  async listTools() {
    return [{ name: "test_tool", description: "A test tool", inputSchema: { type: "object" } }];
  }
  async callTool() {
    return { content: [{ type: "text", text: "result" }] };
  }
}

class MockStdioTransport {
  constructor(_config: unknown) {}
}

class MockSSETransport {
  constructor(_url: URL, _opts?: unknown) {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
  connectShouldFail = false;
  connectCallCount = 0;
  vi.restoreAllMocks();
});

function tmpDir() {
  const t = createTestDir("l3-circuit-");
  cleanups.push(t.cleanup);
  return t.dir;
}

function createPlugin(stateFile: string, opts?: { circuitResetMs?: number }) {
  const plugin = new McpPlugin({
    servers: [{ name: "test-server", type: "stdio", command: "echo", args: ["hello"] }],
    maxConnectFailures: 2,
    stateFile,
    circuitResetMs: opts?.circuitResetMs ?? 300_000,
    connectTimeoutMs: 1000,
  });

  // Inject mock SDK via the private _sdk promise
  const mockSdk = {
    Client: MockClient,
    StdioClientTransport: MockStdioTransport,
    SSEClientTransport: MockSSETransport,
  };
  (plugin as unknown as { _sdk: Promise<typeof mockSdk> })._sdk = Promise.resolve(mockSdk);

  return plugin;
}

describe("L3-05: Circuit Breaker Persistence", () => {
  // ── Circuit Trips and Persists ──────────────────────────────────────────────

  it("circuit trip writes state to stateFile", async () => {
    const dir = tmpDir();
    const stateFile = join(dir, "circuit.json");
    const plugin = createPlugin(stateFile);

    connectShouldFail = true;

    // First initialization — should fail twice (maxConnectFailures = 2)
    // and persist the circuit trip
    await plugin.initialize();
    expect(connectCallCount).toBe(1);

    // Second initialization — same server
    await plugin.initialize();
    expect(connectCallCount).toBe(2);

    // Now the circuit should be open — check the state file
    const raw = await readFile(stateFile, "utf8");
    const state = JSON.parse(raw);
    expect(state["test-server"]).toBeDefined();
    expect(state["test-server"].connectFailures).toBe(2);
    expect(state["test-server"].trippedAt).toBeGreaterThan(0);

    await plugin.destroy();
  });

  // ── New Plugin Reads Persisted State ────────────────────────────────────────

  it("new plugin instance reads stateFile and skips tripped servers", async () => {
    const dir = tmpDir();
    const stateFile = join(dir, "circuit.json");

    // Pre-write a circuit state as if a previous process had tripped it
    const state = {
      "test-server": {
        trippedAt: Date.now(), // within circuitResetMs
        connectFailures: 5,
      },
    };
    await writeFile(stateFile, JSON.stringify(state), "utf8");

    connectCallCount = 0;
    const plugin = createPlugin(stateFile);
    await plugin.initialize();

    // Should NOT have attempted to connect (circuit is open)
    expect(connectCallCount).toBe(0);

    // healthCheck should return false (no connected servers)
    expect(await plugin.healthCheck()).toBe(false);

    await plugin.destroy();
  });

  // ── resetCircuit Clears Persisted State ─────────────────────────────────────

  it("resetCircuit() removes server from persisted state", async () => {
    const dir = tmpDir();
    const stateFile = join(dir, "circuit.json");

    // Pre-write circuit state
    const state = {
      "test-server": { trippedAt: Date.now(), connectFailures: 3 },
      "other-server": { trippedAt: Date.now(), connectFailures: 5 },
    };
    await writeFile(stateFile, JSON.stringify(state), "utf8");

    const plugin = createPlugin(stateFile);
    // Initialize to populate serverStates
    await plugin.initialize();
    // Reset the circuit for test-server
    plugin.resetCircuit("test-server");

    // Wait for async file write
    await new Promise((r) => setTimeout(r, 100));

    // Verify the state file no longer has test-server
    const raw = await readFile(stateFile, "utf8");
    const updatedState = JSON.parse(raw);
    expect(updatedState["test-server"]).toBeUndefined();
    // other-server should still be there
    expect(updatedState["other-server"]).toBeDefined();

    await plugin.destroy();
  });

  // ── Circuit Auto-Resets After circuitResetMs ────────────────────────────────

  it("expired circuit trips are ignored on initialization", async () => {
    const dir = tmpDir();
    const stateFile = join(dir, "circuit.json");

    // Pre-write a circuit state that has expired (tripped 10 minutes ago)
    const state = {
      "test-server": {
        trippedAt: Date.now() - 600_000, // 10 minutes ago
        connectFailures: 5,
      },
    };
    await writeFile(stateFile, JSON.stringify(state), "utf8");

    connectShouldFail = false;
    connectCallCount = 0;
    const plugin = createPlugin(stateFile, { circuitResetMs: 300_000 }); // 5 min reset

    await plugin.initialize();

    // Should have attempted to connect (circuit has auto-reset)
    expect(connectCallCount).toBe(1);

    // healthCheck should return true (server is connected)
    expect(await plugin.healthCheck()).toBe(true);

    await plugin.destroy();
  });

  // ── No stateFile configured ─────────────────────────────────────────────────

  it("works without stateFile (in-memory only)", async () => {
    const plugin = new McpPlugin({
      servers: [{ name: "no-state-server", type: "stdio", command: "echo" }],
      maxConnectFailures: 2,
      // No stateFile
    });

    const mockSdk = {
      Client: MockClient,
      StdioClientTransport: MockStdioTransport,
      SSEClientTransport: MockSSETransport,
    };
    (plugin as unknown as { _sdk: Promise<typeof mockSdk> })._sdk = Promise.resolve(mockSdk);

    connectShouldFail = false;
    connectCallCount = 0;
    await plugin.initialize();

    expect(connectCallCount).toBe(1);
    expect(await plugin.healthCheck()).toBe(true);

    await plugin.destroy();
  });
});
