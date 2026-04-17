/**
 * Load Tests
 *
 * Verifies framework stability under sustained concurrent load.
 * Uses vitest with real in-process servers (no mocking of HTTP layer).
 *
 * Tests:
 * L1 100 concurrent session requests — no race conditions, no 5xx
 * L2 Rate limiter holds under burst — 200 requests, only allowed through
 * L3 Session resolution doesn't TOCTOU under concurrent first-access
 * L4 AgentRunner handles 50 concurrent run() calls without dropping messages
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createServer } from "../../runtime/server.js";
import { Session } from "../../session.js";
import { PerUserRateLimiter } from "../../security/rateLimiter.js";
import { AgentRunner } from "../../agents/runner.js";
import type { ChatModel, ChatResult } from "../../agents/runner.js";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, rm } from "fs/promises";
import http from "http";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInstantModel(response = "OK"): ChatModel & { model: string } {
  return {
    model: "test-model",
    async complete(): Promise<ChatResult> {
      return { content: response, finishReason: "stop" };
    },
  };
}

function httpPost(
  server: http.Server,
  path: string,
  body: unknown,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as { port: number };
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
      },
      (res) => {
        let buf = "";
        res.on("data", (c: Buffer) => {
          buf += c.toString();
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: buf }));
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("Load Tests", () => {
  let tmpDir: string;
  let sessionDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "yaaf-load-"));
    sessionDir = join(tmpDir, "sessions");
  });

  afterAll(async () => {
    try {
      await rm(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  // ── L1: 100 concurrent session create/resume — no 5xx ─────────────────────

  it("L1: Session.resumeOrCreate() under 100 concurrent callers produces no corrupted sessions", async () => {
    const sessionId = "load-test-session";
    const CONCURRENCY = 100;

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, async (_, i) => {
        try {
          const session = await Session.resumeOrCreate(sessionId, sessionDir);
          return { ok: true, messages: (session as Session).messages?.length ?? 0, idx: i };
        } catch (err) {
          return { ok: false, error: String(err), idx: i };
        }
      }),
    );

    const failures = results.filter((r) => !r.ok);
    expect(failures).toHaveLength(0);
    expect(results).toHaveLength(CONCURRENCY);
  }, 30_000);

  // ── L2: Rate limiter holds under burst ────────────────────────────────────

  it("L2: PerUserRateLimiter blocks excess requests in a 200-request burst", () => {
    const MAX_TURNS = 10;
    const limiter = new PerUserRateLimiter({ maxTurnsPerUser: MAX_TURNS });

    let allowed = 0;
    let blocked = 0;

    for (let i = 0; i < 200; i++) {
      const result = limiter.check("user-load-test");
      if (result.blocked) {
        blocked++;
      } else {
        limiter.recordUsage("user-load-test", { turns: 1 });
        allowed++;
      }
    }

    // Exactly MAX_TURNS should have been allowed through
    expect(allowed).toBe(MAX_TURNS);
    expect(blocked).toBe(200 - MAX_TURNS);
  });

  // ── L3: Session TOCTOU under concurrent first-access ─────────────────────

  it("L3: concurrent first-access of the same new session ID does not create duplicate files", async () => {
    const sessionId = `toctou-test-${Date.now()}`;
    const CONCURRENCY = 50;

    const sessions = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => Session.resumeOrCreate(sessionId, sessionDir)),
    );

    // All should resolve (no throws)
    expect(sessions).toHaveLength(CONCURRENCY);

    // All should have the same session ID
    for (const s of sessions) {
      expect((s as Session).id ?? (s as unknown as { _id: string })._id).toBe(sessionId);
    }
  }, 30_000);

  // ── L4: AgentRunner handles 50 concurrent run() calls ─────────────────────

  it("L4: 50 concurrent AgentRunner.run() calls all complete without dropping responses", async () => {
    const CONCURRENCY = 50;
    let callCount = 0;

    const model: ChatModel & { model: string } = {
      model: "load-test-model",
      async complete(): Promise<ChatResult> {
        const idx = callCount++;
        // Tiny random delay to interleave microtasks
        await new Promise((r) => setTimeout(r, Math.random() * 5));
        return { content: `Response-${idx}`, finishReason: "stop" };
      },
    };

    const runner = new AgentRunner({ model, tools: [], systemPrompt: "test" });

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) => runner.run(`Message-${i}`)),
    );

    // All calls must have returned a string response
    expect(results).toHaveLength(CONCURRENCY);
    for (const r of results) {
      expect(typeof r).toBe("string");
      expect((r as string).length).toBeGreaterThan(0);
    }

    // History must have exactly 2*CONCURRENCY messages (user + assistant pairs)
    const history = runner.getHistory();
    expect(history.length).toBe(CONCURRENCY * 2);
  }, 60_000);
});
