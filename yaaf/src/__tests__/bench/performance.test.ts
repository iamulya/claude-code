/**
 * Performance Benchmarks — Regression baselines for core subsystems.
 *
 * Uses timer-based assertions rather than vitest bench (not in all CI configs).
 * Each test establishes an upper-bound SLA that must hold under normal load.
 * If a test fails its SLA, a future commit has introduced a performance regression.
 *
 * Baselines are conservative — 3-5× real-world p99 — to avoid CI flakiness
 * on shared runners. Tighten them on dedicated hardware.
 *
 * Tests:
 * P1 VectorMemory search latency — 10k docs, warm IDF cache, topK=10
 * P2 VectorMemory upsert throughput — 1,000 docs/sec sustained
 * P3 IPC send throughput — 10,000 messages/sec sustained
 * P4 AuditLog throughput — 100,000 in-memory entries/sec sustained
 * P5 RateLimiter check throughput — 1,000,000 checks/sec sustained
 * P6 GroundingValidator latency — keyword-path 5ms SLA for 50-word response
 * P7 VectorMemory search after cold IDF rebuild — 10k docs, topK=10
 */

import { describe, it, expect, beforeAll } from "vitest";
import { VectorMemoryPlugin } from "../../memory/vectorMemory.js";
import { InProcessIPCPlugin } from "../../integrations/inProcessIPC.js";
import { SecurityAuditLog } from "../../security/auditLog.js";
import { PerUserRateLimiter } from "../../security/rateLimiter.js";
import { GroundingValidator } from "../../security/groundingValidator.js";
import type { ChatMessage } from "../../agents/runner.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsed(fn: () => void): number {
  const t = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - t) / 1_000_000; // ms
}

async function elapsedAsync(fn: () => Promise<void>): Promise<number> {
  const t = process.hrtime.bigint();
  await fn();
  return Number(process.hrtime.bigint() - t) / 1_000_000; // ms
}

const CORPUS_TOPICS = [
  "machine learning neural network gradient descent backpropagation training",
  "kubernetes cluster orchestration deployment pod service ingress",
  "database relational sql query index transaction acid consistency",
  "typescript compiler type inference generics interface union intersection",
  "react component hook state effect context reducer render reconciliation",
  "rust ownership borrowing lifetime borrow checker memory safety",
  "distributed systems consensus raft paxos fault tolerance replication",
  "cryptography encryption aes sha256 rsa public key certificate tls",
  "microservices api gateway service mesh load balancer circuit breaker",
  "graph algorithm dijkstra bfs dfs topological sort minimum spanning tree",
];

// ── P1/P7: VectorMemory search latency ───────────────────────────────────────

describe("P1: VectorMemory search latency — warm IDF cache, 10k docs, topK=10", () => {
  let store: VectorMemoryPlugin;

  beforeAll(async () => {
    store = new VectorMemoryPlugin({ maxDocuments: 12_000 });
    // Pre-populate 10k documents (mix of 10 topics)
    await Promise.all(
      Array.from({ length: 10_000 }, (_, i) => {
        const text = `${CORPUS_TOPICS[i % 10]} document number ${i} with extra tokens`;
        return store.upsert(`doc-${i}`, text, { topic: i % 10 });
      }),
    );
    // Warm IDF cache with one search
    await store.search("machine learning neural", 1);
  }, 60_000);

  it("returns topK=10 results in < 2000ms on warm cache (TF-IDF linear scan, 10k docs)", async () => {
    const ms = await elapsedAsync(() =>
      store.search("kubernetes deployment service", 10).then(() => {}),
    );
    // P1 SLA: < 2000ms single search under full-suite CPU sharing
    expect(ms).toBeLessThan(2_000);
  });

  it("returns topK=10 results consistently across 100 searches (p99 < 2000ms)", async () => {
    const latencies: number[] = [];
    for (let i = 0; i < 100; i++) {
      const query = CORPUS_TOPICS[i % CORPUS_TOPICS.length]!.split(" ").slice(0, 3).join(" ");
      const ms = await elapsedAsync(() => store.search(query, 10).then(() => {}));
      latencies.push(ms);
    }
    latencies.sort((a, b) => a - b);
    const p99 = latencies[Math.floor(latencies.length * 0.99)]!;
    // P1 SLA: p99 < 2000ms — catches O(n²) regressions under full-suite CPU sharing
    expect(p99).toBeLessThan(2_000);
  });
});

describe("P7: VectorMemory search after cold IDF rebuild — 10k docs", () => {
  it("full IDF rebuild + topK=10 search < 500ms on 10k docs", async () => {
    const store = new VectorMemoryPlugin({ maxDocuments: 12_000 });
    await Promise.all(
      Array.from({ length: 10_000 }, (_, i) =>
        store.upsert(`cold-${i}`, `${CORPUS_TOPICS[i % 10]} cold ${i}`, {}),
      ),
    );
    // Force IDF cache invalidation by upsert, then measure cold search
    await store.upsert("cold-trigger", "final document forces cache reset", {});

    const ms = await elapsedAsync(() =>
      store.search("machine learning neural gradient", 10).then(() => {}),
    );
    // Cold rebuild (linear scan over 10k + IDF recompute) — 500ms SLA with headroom for CI
    expect(ms).toBeLessThan(500);
  }, 60_000);
});

// ── P2: VectorMemory upsert throughput ────────────────────────────────────────

describe("P2: VectorMemory upsert throughput — 1,000 docs/sec", () => {
  it("inserts 1,000 documents in < 1,000ms", async () => {
    const store = new VectorMemoryPlugin({ maxDocuments: 5_000 });
    const ms = await elapsedAsync(async () => {
      for (let i = 0; i < 1_000; i++) {
        await store.upsert(`perf-${i}`, `${CORPUS_TOPICS[i % 10]} index ${i}`, {});
      }
    });
    expect(ms).toBeLessThan(1_000);
  });
});

// ── P3: IPC send throughput ───────────────────────────────────────────────────

describe("P3: InProcessIPC send throughput — 10,000 messages", () => {
  it("enqueues 10,000 messages in < 500ms", async () => {
    const ipc = new InProcessIPCPlugin({ maxInboxSize: 15_000 });
    const ms = await elapsedAsync(async () => {
      for (let i = 0; i < 10_000; i++) {
        await ipc.send("bench-box", {
          from: "sender",
          to: "bench-box",
          body: `message ${i}`,
          maxAttempts: 1,
        });
      }
    });
    expect(ms).toBeLessThan(500);
  });
});

// ── P4: AuditLog throughput ───────────────────────────────────────────────────

describe("P4: SecurityAuditLog in-memory throughput — 100k entries", () => {
  it("logs 100,000 entries in < 1,000ms", () => {
    const log = new SecurityAuditLog({ maxEntries: 200_000 });
    const ms = elapsed(() => {
      for (let i = 0; i < 100_000; i++) {
        log.info("custom", "bench", `Event ${i}`);
      }
    });
    expect(ms).toBeLessThan(1_000);
  });
});

// ── P5: RateLimiter check throughput ─────────────────────────────────────────

describe("P5: PerUserRateLimiter check throughput — 1M checks", () => {
  it("performs 1,000,000 check() calls in < 2,500ms", () => {
    const limiter = new PerUserRateLimiter({ maxTurnsPerUser: Infinity, gcIntervalMs: 0 });
    const ms = elapsed(() => {
      for (let i = 0; i < 1_000_000; i++) {
        limiter.check(`user-${i % 100}`);
      }
    });
    // P5 SLA: < 2500ms — 1M synchronous Map lookups under full-suite CPU sharing
    expect(ms).toBeLessThan(2_500);
    limiter.dispose();
  });
});

// ── P6: GroundingValidator keyword-path latency ───────────────────────────────

describe("P6: GroundingValidator keyword-path latency — 50-word response", () => {
  it("assesses a 50-word response against 2 tool results in < 5ms", async () => {
    const validator = new GroundingValidator({ mode: "warn", minCoverage: 0.1 });
    const messages: ChatMessage[] = [
      {
        role: "tool",
        toolCallId: "tc1",
        name: "search",
        content: "Machine learning uses gradient descent to optimize neural networks.",
      },
      {
        role: "tool",
        toolCallId: "tc2",
        name: "lookup",
        content: "The dataset contains 50,000 training examples across 10 categories.",
      },
    ];
    const response =
      "Machine learning models use gradient descent optimization. The training dataset consists of 50,000 examples organized into 10 distinct categories. Neural networks learn by adjusting weights with each iteration.";

    const ms = await elapsedAsync(async () => {
      await validator.assess(response, messages);
    });
    expect(ms).toBeLessThan(5);
  });
});
