/**
 * L2-05: Thread Suspend-Resume E2E
 *
 * Tests the stateless reducer pattern:
 *   createThread → step → suspend → serialize → deserialize → resume
 *
 * Probes cross-subsystem wiring:
 * - createThread creates proper initial thread state
 * - Agent.step() processes one loop iteration
 * - serializeThread/deserializeThread roundtrip
 * - HMAC integrity validation on serialized threads
 * - Thread state preservation across serialization
 * - forkThread creates independent copy
 */

import { describe, it, expect } from "vitest";
import { Agent } from "../../../agent.js";
import {
  createThread,
  serializeThread,
  deserializeThread,
  forkThread,
} from "../../../agents/thread.js";
import type { AgentThread } from "../../../agents/thread.js";
import { mockModel, toolCallingModel } from "../_fixtures/mockModel.js";
import { echoTool } from "../_fixtures/tools.js";

describe("L2-05: Thread Suspend-Resume E2E", () => {
  it("createThread → step → done (simple text response)", async () => {
    const model = mockModel([
      { content: "Hello! How can I help?", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "You are helpful.",
      tools: [],
    });

    let thread = createThread("Hello");

    // Step until done
    let stepCount = 0;
    while (!thread.done && stepCount < 10) {
      const result = await agent.step(thread);
      thread = result.thread;
      stepCount++;
    }

    expect(thread.done).toBe(true);
    expect(thread.finalResponse).toBe("Hello! How can I help?");
  });

  it("createThread → step with tool call → step again → done", async () => {
    const model = mockModel([
      {
        content: "",
        toolCalls: [
          { id: "tc_echo_1", name: "echo", arguments: JSON.stringify({ text: "ping" }) },
        ],
        finishReason: "tool_calls",
      },
      { content: "I echoed: ping", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [echoTool],
    });

    let thread = createThread("Echo ping");

    // Step 1: model requests tool call
    let result = await agent.step(thread);
    thread = result.thread;
    expect(thread.done).toBe(false);

    // Step 2: tool executes, model gives final response
    result = await agent.step(thread);
    thread = result.thread;

    // Should be done now
    if (!thread.done) {
      // One more step might be needed
      result = await agent.step(thread);
      thread = result.thread;
    }
    expect(thread.done).toBe(true);
    expect(thread.finalResponse).toContain("echoed");
  });

  it("serializeThread → deserializeThread roundtrip produces identical thread", () => {
    const thread = createThread("Test message");

    const json = serializeThread(thread);
    const restored = deserializeThread(json);

    expect(restored.id).toBe(thread.id);
    expect(restored.steps).toEqual(thread.steps);
    expect(restored.done).toBe(thread.done);
  });

  it("serializeThread with HMAC → deserializeThread with same secret succeeds", () => {
    const thread = createThread("Secure message");
    const secret = "test-hmac-secret-key";

    const json = serializeThread(thread, secret);
    const restored = deserializeThread(json, secret);

    expect(restored.id).toBe(thread.id);
  });

  it("serializeThread with HMAC → deserializeThread with wrong secret fails", () => {
    const thread = createThread("Secure message");
    const secret = "correct-secret";

    const json = serializeThread(thread, secret);

    // Attempting to deserialize with wrong secret should throw
    expect(() => deserializeThread(json, "wrong-secret")).toThrow();
  });

  it("serializeThread with HMAC → deserializeThread without secret fails", () => {
    const thread = createThread("Secure message");
    const secret = "my-secret";

    const json = serializeThread(thread, secret);

    // Deserializing HMAC-signed thread without any secret should throw
    expect(() => deserializeThread(json)).toThrow();
  });

  it("forkThread creates independent copy", () => {
    const original = createThread("Original");

    const forked = forkThread(original);

    // Different thread IDs
    expect(forked.id).not.toBe(original.id);

    // Same initial state
    expect(forked.messages.length).toBe(original.messages.length);
    expect(forked.done).toBe(original.done);

    // Mutating forked messages doesn't affect original
    forked.messages.push({
      role: "assistant",
      content: "Added to fork",
    });
    expect(forked.messages.length).toBe(original.messages.length + 1);
    expect(original.messages.length).toBe(1); // unchanged

    // Metadata includes forkedFrom
    expect(forked.metadata?.forkedFrom).toBe(original.id);
  });

  it("Thread metadata is preserved across serialization", () => {
    const thread = createThread("Test", { customField: "hello", priority: 5 });

    expect(thread.metadata?.customField).toBe("hello");
    expect(thread.metadata?.priority).toBe(5);

    const json = serializeThread(thread);
    const restored = deserializeThread(json);

    expect(restored.metadata?.customField).toBe("hello");
    expect(restored.metadata?.priority).toBe(5);
  });
});
