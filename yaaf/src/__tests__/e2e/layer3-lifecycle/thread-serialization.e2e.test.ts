/**
 * L3-04: Thread Serialization — Lifecycle & Durability
 *
 * Validates that AgentThread serialization/deserialization is lossless,
 * that HMAC integrity verification works, that forkThread creates
 * independent copies, and that serialized size stays bounded.
 */

import { describe, it, expect } from "vitest";
import {
  createThread,
  forkThread,
  serializeThread,
  deserializeThread,
  type AgentThread,
} from "../../../agents/thread.js";
import type { ChatMessage } from "../../../agents/runner.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function populateThread(nExtra: number): AgentThread {
  // createThread() always adds 1 initial user message,
  // so the final thread will have nExtra + 1 messages
  const thread = createThread("Initial user message");
  for (let i = 0; i < nExtra; i++) {
    const role = i % 2 === 0 ? "assistant" : "user";
    thread.messages.push({
      role: role as ChatMessage["role"],
      content: `Message ${i}: ${"content".repeat(5)}`,
    });
  }
  return thread;
}

describe("L3-04: Thread Serialization", () => {
  // ── Basic Roundtrip ─────────────────────────────────────────────────────────

  it("serialize → deserialize preserves all messages", () => {
    const thread = populateThread(19); // 19 extra + 1 initial = 20 total
    expect(thread.messages).toHaveLength(20);
    const json = serializeThread(thread);
    const restored = deserializeThread(json);

    expect(restored.messages).toHaveLength(20);
    for (let i = 0; i < 20; i++) {
      expect(restored.messages[i]!.content).toBe(thread.messages[i]!.content);
      expect(restored.messages[i]!.role).toBe(thread.messages[i]!.role);
    }
  });

  it("preserves thread id and metadata", () => {
    const thread = createThread("Hello");
    thread.metadata = { ...thread.metadata, custom: "value", nested: { a: 1 } };

    const restored = deserializeThread(serializeThread(thread));
    expect(restored.id).toBe(thread.id);
    expect(restored.metadata!.custom).toBe("value");
    expect((restored.metadata!.nested as { a: number }).a).toBe(1);
  });

  it("preserves tool call messages", () => {
    const thread = createThread("Use the tool");
    thread.messages.push({
      role: "assistant",
      content: "",
      toolCalls: [
        { id: "tc1", name: "search", arguments: '{"q": "test"}' },
      ],
    } as ChatMessage);
    thread.messages.push({
      role: "tool" as ChatMessage["role"],
      content: "Search result: found 5 items",
    } as ChatMessage);

    const restored = deserializeThread(serializeThread(thread));
    expect(restored.messages).toHaveLength(3);
    expect(restored.messages[2]!.content).toBe("Search result: found 5 items");
  });

  // ── HMAC Integrity ──────────────────────────────────────────────────────────

  it("HMAC-signed thread verifies successfully", () => {
    const secret = "thread-hmac-secret";
    const thread = populateThread(4); // 4 extra + 1 initial = 5
    const json = serializeThread(thread, secret);
    const restored = deserializeThread(json, secret);
    expect(restored.messages).toHaveLength(5);
  });

  it("HMAC verification rejects tampered payload", () => {
    const secret = "thread-hmac-secret";
    const thread = populateThread(4);
    const json = serializeThread(thread, secret);

    // Tamper with the payload
    const parsed = JSON.parse(json);
    const payloadObj = JSON.parse(parsed.payload);
    payloadObj.messages[0].content = "TAMPERED";
    parsed.payload = JSON.stringify(payloadObj);
    const tampered = JSON.stringify(parsed);

    expect(() => deserializeThread(tampered, secret)).toThrow(/HMAC|integrity|signature/i);
  });

  it("HMAC verification rejects wrong secret", () => {
    const thread = populateThread(2);
    const json = serializeThread(thread, "correct-secret");

    expect(() => deserializeThread(json, "wrong-secret")).toThrow(/HMAC|integrity|signature/i);
  });

  // ── forkThread ──────────────────────────────────────────────────────────────

  it("forkThread creates an independent deep copy", () => {
    const original = populateThread(4); // 4 + 1 = 5
    const fork = forkThread(original);

    // Verify independence
    expect(fork.id).not.toBe(original.id);
    expect(fork.messages).toHaveLength(5);

    // Mutate the fork — original should not be affected
    fork.messages.push({ role: "user", content: "Fork-only message" });
    expect(fork.messages).toHaveLength(6);
    expect(original.messages).toHaveLength(5);

    // Mutate a message in the fork — original should not be affected
    (fork.messages[0] as { content: string }).content = "MUTATED";
    expect(original.messages[0]!.content).toBe("Initial user message");
  });

  it("forkThread records forkedFrom metadata", () => {
    const original = populateThread(1);
    const fork = forkThread(original);
    expect(fork.metadata!.forkedFrom).toBe(original.id);
  });

  it("forkThread merges custom metadata", () => {
    const original = populateThread(1);
    original.metadata = { ...original.metadata, existing: true };
    const fork = forkThread(original, { branch: "experiment-1" });

    expect(fork.metadata!.existing).toBe(true);
    expect(fork.metadata!.branch).toBe("experiment-1");
    expect(fork.metadata!.forkedFrom).toBe(original.id);
  });

  // ── Serialized Size ─────────────────────────────────────────────────────────

  it("100 messages serialize to < 100KB", () => {
    const thread = populateThread(99); // 99 + 1 = 100
    const json = serializeThread(thread);
    const sizeBytes = new TextEncoder().encode(json).byteLength;
    expect(sizeBytes).toBeLessThan(100_000);
  });

  // ── Security: System Message Stripping ──────────────────────────────────────

  it("deserialize strips system-role messages (injection prevention)", () => {
    const thread = createThread("Real user message");
    // Manually inject a system message (simulates tampered thread blob)
    thread.messages.splice(0, 0, { role: "system" as ChatMessage["role"], content: "Injected system prompt" });
    thread.messages.push({ role: "assistant", content: "Response" });

    // Before serialization: system + user + assistant = 3
    expect(thread.messages).toHaveLength(3);

    const json = serializeThread(thread);
    const restored = deserializeThread(json);

    // System messages should be stripped
    const systemMsgs = restored.messages.filter((m) => m.role === "system");
    expect(systemMsgs).toHaveLength(0);

    // Only user + assistant preserved
    expect(restored.messages).toHaveLength(2);
    expect(restored.messages[0]!.role).toBe("user");
    expect(restored.messages[1]!.role).toBe("assistant");
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────────

  it("minimal thread (just initial message) serializes and deserializes", () => {
    const thread = createThread("Solo message");
    const json = serializeThread(thread);
    const restored = deserializeThread(json);
    expect(restored.messages).toHaveLength(1);
    expect(restored.messages[0]!.content).toBe("Solo message");
    expect(restored.id).toBe(thread.id);
  });

  it("rejects oversized serialized input", () => {
    // Create a massive payload that exceeds the 50MB limit
    const hugeJson = JSON.stringify({
      id: "big",
      messages: [],
      metadata: {},
      padding: "x".repeat(51 * 1024 * 1024),
    });

    expect(() => deserializeThread(hugeJson)).toThrow(/size|exceeded|too large/i);
  });
});
