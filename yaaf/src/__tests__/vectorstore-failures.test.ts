/**
 * VectorMemoryPlugin — Failure-Path Tests ()
 *
 * V1 search() on empty corpus → [] (no throw)
 * V2 search() with filter that matches nothing → []
 * V3 search() with topK=0 → []
 * V4 delete() for an id that was never upserted → no throw
 * V5 upsert() same id twice → overwrites, count stays at 1
 * V6 search() after clear() → [] (no throw)
 * V7 search() on 1-doc corpus returns that doc if relevant
 * V8 search() returns results in descending score order
 * V9 maxDocuments=3: 4th upsert evicts oldest (insertion order)
 * V10 After eviction IDF cache is correctly rebuilt (search still works)
 * V11 onSearch callback fires with correct timing and result count
 * V12 upsert()-overwrite does not count as new for eviction purposes
 */

import { describe, it, expect } from "vitest";
import { VectorMemoryPlugin } from "../memory/vectorMemory.js";

// ── V1: Empty corpus search → [] ─────────────────────────────────────────────

describe("V1: search() on empty corpus returns [] not throws", () => {
  it("returns an empty array when the store is empty", async () => {
    const store = new VectorMemoryPlugin();
    const results = await store.search("what is RAG?", 5);
    expect(results).toEqual([]);
  });
});

// ── V2: Filter matches nothing → [] ──────────────────────────────────────────

describe("V2: search() with non-matching filter returns []", () => {
  it("returns empty when metadata filter excludes all documents", async () => {
    const store = new VectorMemoryPlugin();
    await store.upsert("doc-1", "vector databases store embeddings", { type: "technical" });
    await store.upsert("doc-2", "machine learning needs data", { type: "technical" });

    // Filter that matches nothing
    const results = await store.search("embeddings", 5, { type: "marketing" });
    expect(results).toEqual([]);
  });

  it("returns results when filter matches", async () => {
    const store = new VectorMemoryPlugin();
    await store.upsert("doc-1", "embeddings and vector search", { type: "technical" });
    await store.upsert("doc-2", "buy our product now", { type: "marketing" });

    const results = await store.search("embeddings vector", 5, { type: "technical" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.metadata?.type).toBe("technical");
  });
});

// ── V3: topK=0 → [] ──────────────────────────────────────────────────────────

describe("V3: search() with topK=0 returns []", () => {
  it("returns no results when topK is 0", async () => {
    const store = new VectorMemoryPlugin();
    await store.upsert("doc-1", "machine learning embeddings semantic search", {});

    const results = await store.search("machine learning", 0);
    expect(results).toEqual([]);
  });
});

// ── V4: delete() for unknown id → no throw ───────────────────────────────────

describe("V4: delete() for a non-existent id does not throw", () => {
  it("deletes a non-existent id silently", async () => {
    const store = new VectorMemoryPlugin();
    await expect(store.delete("never-existed")).resolves.toBeUndefined();
    expect(store.size()).toBe(0);
  });
});

// ── V5: upsert() same id twice → overwrites ──────────────────────────────────

describe("V5: upsert() with an existing id overwrites the document", () => {
  it("replaces the document with the same id and keeps size at 1", async () => {
    const store = new VectorMemoryPlugin();

    await store.upsert("doc-a", "original content about cats", { version: 1 });
    expect(store.size()).toBe(1);

    await store.upsert("doc-a", "completely different content about dogs", { version: 2 });
    expect(store.size()).toBe(1); // Still 1, not 2

    // Search for new content should work
    const results = await store.search("dogs", 1);
    expect(results[0]?.id).toBe("doc-a");

    // Old content should not dominate
    const catResults = await store.search("cats", 1);
    // 'cats' is no longer in the doc — score should be 0 or absent
    if (catResults.length > 0) {
      expect(catResults[0]!.score).toBe(0);
    }
  });
});

// ── V6: search() after clear() → [] ─────────────────────────────────────────

describe("V6: search() after clear() returns []", () => {
  it("clears all documents and returns empty results", async () => {
    const store = new VectorMemoryPlugin();
    await store.upsert("doc-1", "neural networks deep learning", {});
    await store.upsert("doc-2", "transformers attention mechanism", {});
    expect(store.size()).toBe(2);

    await store.clear();
    expect(store.size()).toBe(0);

    const results = await store.search("neural networks", 5);
    expect(results).toEqual([]);
  });
});

// ── V7: 1-doc corpus returns doc if relevant ──────────────────────────────────

describe("V7: search() on a single-document corpus returns the doc when relevant", () => {
  it("returns the only document when it shares tokens with the query", async () => {
    const store = new VectorMemoryPlugin();
    await store.upsert("only-doc", "yaaf agent framework plugin system", { label: "yaaf" });

    const results = await store.search("yaaf plugin", 5);
    expect(results.length).toBe(1);
    expect(results[0]!.id).toBe("only-doc");
    expect(results[0]!.score).toBeGreaterThan(0);
  });

  it("returns [] when the query shares no tokens with the single document", async () => {
    const store = new VectorMemoryPlugin();
    await store.upsert("only-doc", "quantum computing qubits superposition", {});

    const results = await store.search("cats dogs pets", 5);
    expect(results).toHaveLength(0);
  });
});

// ── V8: Results in descending score order ─────────────────────────────────────

describe("V8: search() results are ordered by score descending", () => {
  it("returns the most-relevant document first", async () => {
    const store = new VectorMemoryPlugin();

    // doc-strong has many shared tokens with the query
    await store.upsert(
      "doc-strong",
      "machine learning neural networks deep learning transformers training",
      {},
    );
    // doc-weak has very few shared tokens
    await store.upsert("doc-weak", "cooking recipes pasta sauce vegetables", {});
    // doc-medium has some shared tokens
    await store.upsert("doc-medium", "machine learning basics introduction", {});

    const results = await store.search("machine learning neural networks transformers", 10);

    // Must be sorted descending by score
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }

    // cooking/recipes doc must score 0 or not appear
    const weakResult = results.find((r) => r.id === "doc-weak");
    if (weakResult) {
      expect(weakResult.score).toBe(0);
    }

    // Strong doc must score higher than medium doc
    const strongIdx = results.findIndex((r) => r.id === "doc-strong");
    const medIdx = results.findIndex((r) => r.id === "doc-medium");
    if (strongIdx !== -1 && medIdx !== -1) {
      expect(strongIdx).toBeLessThan(medIdx);
    }
  });
});
// ── V9: maxDocuments evicts oldest by insertion order ───────────────────────────

describe("V9: maxDocuments cap evicts the oldest document (insertion order)", () => {
  it("removes the first inserted document when a 4th is inserted into a maxDocuments=3 store", async () => {
    const store = new VectorMemoryPlugin({ maxDocuments: 3 });

    await store.upsert("doc-first", "quantum computing qubits entanglement", {});
    await store.upsert("doc-second", "machine learning neural classification", {});
    await store.upsert("doc-third", "web development react components", {});
    expect(store.size()).toBe(3);

    // 4th upsert should evict 'doc-first' (oldest)
    await store.upsert("doc-fourth", "containerization kubernetes docker orchestration", {});
    expect(store.size()).toBe(3); // still 3

    // doc-first should be gone
    const quantum = await store.search("quantum qubits", 5);
    expect(quantum.every((r) => r.id !== "doc-first")).toBe(true);

    // doc-fourth should be present
    const docker = await store.search("kubernetes docker", 5);
    expect(docker.some((r) => r.id === "doc-fourth")).toBe(true);
  });
});

// ── V10: IDF cache correct after eviction ──────────────────────────────────────

describe("V10: search() after eviction returns correct results (IDF cache rebuilt)", () => {
  it("correctly scores remaining docs after eviction invalidated the IDF cache", async () => {
    const store = new VectorMemoryPlugin({ maxDocuments: 2 });

    await store.upsert("a", "artificial intelligence machine learning", {});
    await store.upsert("b", "deep learning neural networks backpropagation", {});

    // Evict 'a', add 'c'
    await store.upsert("c", "convolutional neural networks image recognition", {});

    // IDF cache should have been invalidated; search must still work
    const results = await store.search("neural networks", 5);
    expect(results.length).toBeGreaterThan(0);

    // All results should be from the surviving docs (b and c, not a)
    for (const r of results) {
      expect(r.id).not.toBe("a");
    }
  });
});

// ── V11: onSearch callback fires with timing ───────────────────────────────────

describe("V11: onSearch callback fires with correct event data", () => {
  it("calls onSearch with resultCount, topScore, and durationMs", async () => {
    const events: Array<{ resultCount: number; topScore: number; durationMs: number }> = [];

    const store = new VectorMemoryPlugin({
      onSearch: (ev) => events.push(ev),
    });

    await store.upsert("doc-a", "semantic search vector embedding retrieval", {});
    await store.upsert("doc-b", "cooking pasta recipes kitchen", {});

    await store.search("semantic vector search", 5);

    expect(events).toHaveLength(1);
    expect(events[0]!.resultCount).toBeGreaterThan(0); // at least 1 result
    expect(events[0]!.topScore).toBeGreaterThan(0); // top score > 0
    expect(events[0]!.durationMs).toBeGreaterThanOrEqual(0); // timing was recorded
    expect(typeof events[0]!.durationMs).toBe("number");
  });

  it("fires onSearch with resultCount=0 on empty results", async () => {
    const events: Array<{ resultCount: number }> = [];
    const store = new VectorMemoryPlugin({ onSearch: (ev) => events.push(ev) });

    await store.upsert("doc", "football soccer stadium fans crowd", {});
    await store.search("quantum computing", 5); // no overlap

    expect(events).toHaveLength(1);
    expect(events[0]!.resultCount).toBe(0);
  });
});

// ── V12: upsert-overwrite not counted as new for eviction ───────────────────────

describe("V12: re-upserting an existing id does not trigger eviction", () => {
  it("keeps size at maxDocuments when an existing id is updated", async () => {
    const store = new VectorMemoryPlugin({ maxDocuments: 2 });

    await store.upsert("doc-1", "original content machine learning", {});
    await store.upsert("doc-2", "another document about databases", {});
    expect(store.size()).toBe(2);

    // Overwrite doc-1 (same id) — should NOT evict any document
    await store.upsert("doc-1", "updated content artificial intelligence", {});
    expect(store.size()).toBe(2); // still 2, no eviction

    // doc-2 must still be present
    const dbResults = await store.search("databases", 5);
    expect(dbResults.some((r) => r.id === "doc-2")).toBe(true);
  });
});
