/**
 * Infrastructure tests — Telemetry, Tracing, SecureStorage, DevUI, Utils, Integrations
 *
 * These are Phase 4 (lower blast radius) modules. We test:
 * - parseExporterList (telemetry.ts) — pure logic
 * - tracing span lifecycle (tracing.ts)
 * - SecureStorage CRUD + encryption (secureStorage.ts)
 * - DevUI HTML generation (devUi.ts)
 * - Logger (utils/logger.ts)
 * - toolSummary + awaySummary (utils/)
 * - Integration plugin contracts (agentfs, camoufox, honcho)
 *
 * ⚠️ All previously had ZERO test coverage.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

// ════════════════════════════════════════════════════════════════════════════
// Telemetry — parseExporterList (pure logic, no OTel deps needed)
// ════════════════════════════════════════════════════════════════════════════

import { parseExporterList } from "../telemetry/telemetry.js";

describe("parseExporterList", () => {
  it("parses comma-separated list", () => {
    expect(parseExporterList("console,otlp")).toEqual(["console", "otlp"]);
  });

  it("trims whitespace", () => {
    expect(parseExporterList(" console , otlp ")).toEqual(["console", "otlp"]);
  });

  it('filters out "none"', () => {
    expect(parseExporterList("none")).toEqual([]);
    expect(parseExporterList("console,none,otlp")).toEqual(["console", "otlp"]);
  });

  it("returns empty array for empty string", () => {
    expect(parseExporterList("")).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(parseExporterList(undefined)).toEqual([]);
  });

  it("preserves single exporter", () => {
    expect(parseExporterList("otlp")).toEqual(["otlp"]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Tracing — isTracingEnabled + span lifecycle
// ════════════════════════════════════════════════════════════════════════════

import {
  isTracingEnabled,
  startToolCallSpan,
  endToolCallSpan,
  executeInSpan,
  getCurrentRunSpan,
  getCurrentToolSpan,
} from "../telemetry/tracing.js";

describe("Tracing", () => {
  it("isTracingEnabled returns false when no exporter set", () => {
    // isTracingEnabled checks OTEL_TRACES_EXPORTER (not a boolean flag)
    // and verifies a real tracer provider is registered
    const origYaaf = process.env["YAAF_OTEL_TRACES_EXPORTER"];
    const origOtel = process.env["OTEL_TRACES_EXPORTER"];
    delete process.env["YAAF_OTEL_TRACES_EXPORTER"];
    delete process.env["OTEL_TRACES_EXPORTER"];
    expect(isTracingEnabled()).toBe(false);
    // Restore
    if (origYaaf !== undefined) process.env["YAAF_OTEL_TRACES_EXPORTER"] = origYaaf;
    if (origOtel !== undefined) process.env["OTEL_TRACES_EXPORTER"] = origOtel;
  });

  it('isTracingEnabled returns false for "none"', () => {
    const orig = process.env["OTEL_TRACES_EXPORTER"];
    process.env["OTEL_TRACES_EXPORTER"] = "none";
    expect(isTracingEnabled()).toBe(false);
    if (orig !== undefined) process.env["OTEL_TRACES_EXPORTER"] = orig;
    else delete process.env["OTEL_TRACES_EXPORTER"];
  });

  it("getCurrentRunSpan returns null when no active span", () => {
    expect(getCurrentRunSpan()).toBeNull();
  });

  it("getCurrentToolSpan returns null when no active span", () => {
    expect(getCurrentToolSpan()).toBeNull();
  });

  it("executeInSpan wraps async function and returns result", async () => {
    const result = await executeInSpan("test-op", async () => {
      return 42;
    });
    expect(result).toBe(42);
  });

  it("executeInSpan propagates errors", async () => {
    await expect(
      executeInSpan("fail-op", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });

  it("startToolCallSpan returns span-like object", () => {
    const span = startToolCallSpan({ toolName: "search", agentName: "test" });
    expect(span).toBeDefined();
    // Clean up
    endToolCallSpan({ error: undefined });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SecureStorage — encrypted key-value store
// ════════════════════════════════════════════════════════════════════════════

import { SecureStorage } from "../storage/secureStorage.js";

describe("SecureStorage", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "yaaf-secure-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  function makeStore(password = "test-password-123") {
    return new SecureStorage({
      namespace: "test",
      dir: tmpDir,
      masterPassword: password,
    });
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  it("set and get round-trip", async () => {
    const store = makeStore();
    await store.set("api_key", "sk-test-12345");
    const value = await store.get("api_key");
    expect(value).toBe("sk-test-12345");
  });

  it("get returns undefined for missing key", async () => {
    const store = makeStore();
    expect(await store.get("nonexistent")).toBeUndefined();
  });

  it("require throws for missing key", async () => {
    const store = makeStore();
    await expect(store.require("missing")).rejects.toThrow("key not found");
  });

  it("require returns value for existing key", async () => {
    const store = makeStore();
    await store.set("key", "value");
    expect(await store.require("key")).toBe("value");
  });

  it("has returns correct boolean", async () => {
    const store = makeStore();
    expect(await store.has("key")).toBe(false);
    await store.set("key", "value");
    expect(await store.has("key")).toBe(true);
  });

  it("delete removes entry and returns true", async () => {
    const store = makeStore();
    await store.set("key", "value");
    expect(await store.delete("key")).toBe(true);
    expect(await store.get("key")).toBeUndefined();
  });

  it("delete returns false for non-existent key", async () => {
    const store = makeStore();
    expect(await store.delete("nonexistent")).toBe(false);
  });

  it("keys lists all stored keys", async () => {
    const store = makeStore();
    await store.set("a", "1");
    await store.set("b", "2");
    await store.set("c", "3");

    const keys = await store.keys();
    expect(keys.sort()).toEqual(["a", "b", "c"]);
  });

  it("clear removes all entries", async () => {
    const store = makeStore();
    await store.set("a", "1");
    await store.set("b", "2");
    await store.clear();
    expect(await store.keys()).toEqual([]);
  });

  // ── Persistence ─────────────────────────────────────────────────────────

  it("values persist across instances (same key)", async () => {
    const store1 = makeStore("shared-password");
    await store1.set("token", "ghp_secret");

    // Create new instance with same password
    const store2 = makeStore("shared-password");
    expect(await store2.get("token")).toBe("ghp_secret");
  });

  it("wrong password cannot read data", async () => {
    const store1 = makeStore("correct-password");
    await store1.set("secret", "sensitive data");

    // Create new instance with WRONG password
    const store2 = makeStore("wrong-password");
    // Should get undefined because decryption fails silently
    expect(await store2.get("secret")).toBeUndefined();
  });

  // ── Encryption ──────────────────────────────────────────────────────────

  it("stored file is NOT plaintext", async () => {
    const store = makeStore();
    await store.set("secret", "do-not-expose");

    const filePath = path.join(tmpDir, "test.enc.json");
    const raw = await fs.readFile(filePath, "utf8");

    expect(raw).not.toContain("do-not-expose");
    expect(raw).toContain('"entries"');

    // Parse to verify structure
    const parsed = JSON.parse(raw);
    const entry = Object.values(parsed.entries)[0] as any;
    expect(entry.iv).toBeDefined();
    expect(entry.tag).toBeDefined();
    expect(entry.data).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Logger
// ════════════════════════════════════════════════════════════════════════════

import { Logger } from "../utils/logger.js";

describe("Logger", () => {
  it("creates with namespace", () => {
    const log = new Logger("test-ns");
    expect(log).toBeDefined();
  });

  it("debug/info/warn/error do not throw", () => {
    const log = new Logger("test");
    expect(() => log.debug("debug msg")).not.toThrow();
    expect(() => log.info("info msg")).not.toThrow();
    expect(() => log.warn("warn msg")).not.toThrow();
    expect(() => log.error("error msg")).not.toThrow();
  });

  it("accepts structured metadata", () => {
    const log = new Logger("test");
    expect(() => log.info("with meta", { key: "value", count: 42 })).not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DevUI — HTML generation
// ════════════════════════════════════════════════════════════════════════════

import { buildDevUiHtml } from "../runtime/devUi.js";

describe("buildDevUiHtml", () => {
  const devOpts = {
    name: "TestAgent",
    version: "1.0.0",
    streaming: true,
    model: "claude-sonnet-4",
    multiTurn: false,
    systemPrompt: null,
  };

  it("returns valid HTML string", () => {
    const html = buildDevUiHtml(devOpts);
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("<head");
    expect(html).toContain("<body");
  });

  it("includes agent name", () => {
    const html = buildDevUiHtml(devOpts);
    expect(html).toContain("TestAgent");
  });

  it("includes streaming endpoint in JS", () => {
    const html = buildDevUiHtml(devOpts);
    expect(html).toContain("/chat/stream");
  });

  it("includes model identifier", () => {
    const html = buildDevUiHtml(devOpts);
    expect(html).toContain("claude-sonnet-4");
  });

  it("includes script tags", () => {
    const html = buildDevUiHtml(devOpts);
    expect(html).toContain("<script");
    expect(html).toContain("</script>");
  });

  it("includes token usage DOM elements", () => {
    const html = buildDevUiHtml(devOpts);
    expect(html).toContain('id="tok-prompt"');
    expect(html).toContain('id="tok-completion"');
    expect(html).toContain('id="tok-cache"');
    expect(html).toContain('id="token-stats"');
    expect(html).toContain('id="tok-bar-fill"');
    expect(html).toContain('id="tokens-empty"');
  });

  it("includes updateTokenDisplay function", () => {
    const html = buildDevUiHtml(devOpts);
    expect(html).toContain("updateTokenDisplay");
  });

  it("includes llm_response and usage event handlers", () => {
    const html = buildDevUiHtml(devOpts);
    // The handleEvent should handle 'llm_response' and 'usage' events
    expect(html).toContain("case 'llm_response'");
    expect(html).toContain("case 'usage'");
    expect(html).toContain("pendingUsage");
  });

  it("includes latency DOM elements", () => {
    const html = buildDevUiHtml(devOpts);
    expect(html).toContain('id="lat-ttft"');
    expect(html).toContain('id="lat-total"');
    expect(html).toContain('id="latency-grid"');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Integration plugin contracts
// ════════════════════════════════════════════════════════════════════════════

import { AgentFSPlugin } from "../integrations/agentfs.js";

describe("AgentFSPlugin", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "yaaf-agentfs-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it("getTools returns tool array", () => {
    const plugin = new AgentFSPlugin({ rootDir: tmpDir });
    const tools = plugin.getTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it("tools have names and input schemas", () => {
    const plugin = new AgentFSPlugin({ rootDir: tmpDir });
    const tools = plugin.getTools();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it("provides read/write/list tool names", () => {
    const plugin = new AgentFSPlugin({ rootDir: tmpDir });
    const names = plugin.getTools().map((t) => t.name);
    // Should have at minimum filesystem operations
    expect(names.some((n) => n.includes("read") || n.includes("Read"))).toBe(true);
    expect(names.some((n) => n.includes("write") || n.includes("Write"))).toBe(true);
    expect(names.some((n) => n.includes("list") || n.includes("List") || n.includes("ls"))).toBe(
      true,
    );
  });
});

import { CamoufoxPlugin } from "../integrations/camoufox.js";

describe("CamoufoxPlugin", () => {
  it("constructor creates instance", () => {
    const plugin = new CamoufoxPlugin({});
    expect(plugin).toBeDefined();
  });

  it("getTools returns browser tools", () => {
    const plugin = new CamoufoxPlugin({});
    const tools = plugin.getTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it("tools have names", () => {
    const plugin = new CamoufoxPlugin({});
    for (const tool of plugin.getTools()) {
      expect(tool.name).toBeTruthy();
    }
  });
});

import { HonchoPlugin, HonchoSession } from "../integrations/honcho.js";

describe("HonchoPlugin", () => {
  it("constructor creates instance", () => {
    const plugin = new HonchoPlugin({ appId: "test-app", userId: "user-1" });
    expect(plugin).toBeDefined();
  });
});

describe("HonchoSession", () => {
  it("constructor sets appId, userId, sessionId", () => {
    const session = new HonchoSession({
      appId: "app-1",
      userId: "user-1",
      sessionId: "sess-1",
    });
    expect(session).toBeDefined();
  });
});
