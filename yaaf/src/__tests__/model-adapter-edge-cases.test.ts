/**
 * Edge-case regression tests
 *
 * Each test in this file targets a specific bug that was discovered
 * during the code audit and has now been fixed. They serve as regression
 * guards to prevent these issues from recurring.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

// ── Helpers ────────────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

function mockFetchJSON(data: unknown, status = 200) {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  ) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ════════════════════════════════════════════════════════════════════════════
// FIX #1: Anthropic consecutive user messages merged
// ════════════════════════════════════════════════════════════════════════════

import { AnthropicChatModel } from "../models/anthropic.js";

describe("Anthropic — message alternation (FIXED)", () => {
  const config = { apiKey: "test-key" };

  it("merges consecutive user messages to preserve alternation", async () => {
    const m = new AnthropicChatModel(config);
    mockFetchJSON({
      content: [{ type: "text", text: "ok" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 5, output_tokens: 2 },
    });

    await m.complete({
      messages: [
        { role: "user", content: "message 1" },
        { role: "user", content: "message 2" },
      ],
    });

    const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    const userMsgs = body.messages.filter((m: any) => m.role === "user");
    // Two consecutive user messages should be merged into one
    expect(userMsgs).toHaveLength(1);
    expect(userMsgs[0].content).toContain("message 1");
    expect(userMsgs[0].content).toContain("message 2");
  });

  it("empty assistant message emits placeholder to preserve alternation", async () => {
    const m = new AnthropicChatModel(config);
    mockFetchJSON({
      content: [{ type: "text", text: "ok" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 5, output_tokens: 2 },
    });

    await m.complete({
      messages: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "" },
        { role: "user", content: "hello again" },
      ],
    });

    const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    const roles = body.messages.map((m: any) => m.role);
    // Must alternate: user → assistant → user (no consecutive same-role)
    expect(roles).toEqual(["user", "assistant", "user"]);
  });

  it("three consecutive user messages all merge into one", async () => {
    const m = new AnthropicChatModel(config);
    mockFetchJSON({
      content: [{ type: "text", text: "ok" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    await m.complete({
      messages: [
        { role: "user", content: "a" },
        { role: "user", content: "b" },
        { role: "user", content: "c" },
      ],
    });

    const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toContain("a");
    expect(body.messages[0].content).toContain("c");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FIX #2: Missing toolCallId guarded
// ════════════════════════════════════════════════════════════════════════════

describe("Anthropic — toolCallId fallback (FIXED)", () => {
  const config = { apiKey: "test-key" };

  it("missing toolCallId falls back to empty string (not undefined)", async () => {
    const m = new AnthropicChatModel(config);
    mockFetchJSON({
      content: [{ type: "text", text: "ok" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 5, output_tokens: 2 },
    });

    await m.complete({
      messages: [
        { role: "user", content: "test" },
        {
          role: "assistant",
          content: "using tool",
          toolCalls: [{ id: "c1", name: "t", arguments: "{}" }],
        },
        { role: "tool", content: "result" } as any, // no toolCallId
      ],
    });

    const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    const toolResult = body.messages.find(
      (m: any) => Array.isArray(m.content) && m.content[0]?.type === "tool_result",
    );
    // Should be empty string, not undefined
    expect(toolResult.content[0].tool_use_id).toBe("");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FIX #3: OpenAI now processes ALL tool_calls per delta
// ════════════════════════════════════════════════════════════════════════════

import { OpenAIChatModel } from "../models/openai.js";

describe("OpenAI — parallel tool call streaming (FIXED)", () => {
  const config = { apiKey: "test-key" };

  it("processes all tool_calls in a single delta, not just [0]", async () => {
    const m = new OpenAIChatModel(config);

    const sseBody =
      [
        'data: {"choices":[{"delta":{"tool_calls":[' +
          '{"index":0,"id":"tc_1","function":{"name":"search","arguments":"{\\"q\\":\\"a\\"}"}}, ' +
          '{"index":1,"id":"tc_2","function":{"name":"fetch","arguments":"{\\"url\\":\\"b\\"}"}}' +
          "]}}]}",
        'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
        "data: [DONE]",
      ].join("\n\n") + "\n\n";

    globalThis.fetch = vi.fn(
      async () =>
        new Response(sseBody, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    ) as unknown as typeof fetch;

    const deltas: any[] = [];
    for await (const d of m.stream({
      messages: [{ role: "user", content: "test" }],
    })) {
      deltas.push(d);
    }

    const toolDeltas = deltas.filter((d) => d.toolCallDelta);
    // BOTH tool calls should be captured
    expect(toolDeltas).toHaveLength(2);
    // Extra tool calls (index 1+) are yielded first, then the main delta carries index 0
    expect(toolDeltas[0].toolCallDelta.name).toBe("fetch");
    expect(toolDeltas[0].toolCallDelta.id).toBe("tc_2");
    expect(toolDeltas[1].toolCallDelta.name).toBe("search");
    expect(toolDeltas[1].toolCallDelta.id).toBe("tc_1");
  });

  it("single tool call per delta still works (most common case)", async () => {
    const m = new OpenAIChatModel(config);

    const sseBody =
      [
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"tc_1","function":{"name":"search","arguments":"{\\"q\\":\\"test\\"}"}}]}}]}',
        'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
        "data: [DONE]",
      ].join("\n\n") + "\n\n";

    globalThis.fetch = vi.fn(
      async () =>
        new Response(sseBody, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    ) as unknown as typeof fetch;

    const deltas: any[] = [];
    for await (const d of m.stream({
      messages: [{ role: "user", content: "test" }],
    })) {
      deltas.push(d);
    }

    const toolDeltas = deltas.filter((d) => d.toolCallDelta);
    expect(toolDeltas).toHaveLength(1);
    expect(toolDeltas[0].toolCallDelta.name).toBe("search");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FIX #4: AutoExtract cursor survives compaction
// ════════════════════════════════════════════════════════════════════════════

import { AutoMemoryExtractor } from "../memory/autoExtract.js";

describe("AutoMemoryExtractor — cursor after compaction (FIXED)", () => {
  it("extraction triggers after messages array is truncated by compaction", async () => {
    const strategy = {
      shouldExtract: vi.fn(async () => true),
      extract: vi.fn(async () => ({ extracted: true, memories: [] })),
    };

    const extractor = new AutoMemoryExtractor({
      extractionStrategy: strategy,
      turnInterval: 1,
      minNewMessages: 1,
    });

    // Turn 1: 10 messages → advances cursor to 10
    const msgs10 = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg ${i}`,
    }));
    await extractor.forceExtract(msgs10, "force");

    // Simulate compaction: messages array is now only 4 messages
    const msgs4 = msgs10.slice(-4);

    // Turn 2: new messages added to the compacted array (total 6)
    const msgs6 = [
      ...msgs4,
      { role: "user" as const, content: "new1" },
      { role: "assistant" as const, content: "new2" },
    ];

    strategy.shouldExtract.mockClear();
    extractor.onTurnComplete(msgs6, "query2");
    await extractor.drain();

    // Cursor was at 10, array is 6 → cursor should reset to 0
    // and extraction SHOULD trigger (not silently stop)
    expect(strategy.shouldExtract).toHaveBeenCalledOnce();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FIX #5: AuditLog returns null for filtered entries
// ════════════════════════════════════════════════════════════════════════════

import { SecurityAuditLog } from "../security/auditLog.js";

describe("SecurityAuditLog — minSeverity returns null (FIXED)", () => {
  it("log() returns null when severity is below minSeverity", () => {
    const audit = new SecurityAuditLog({ minSeverity: "critical" });
    const result = audit.log("info", "custom", "test", "filtered event");

    // Returns null — caller knows it was not stored
    expect(result).toBeNull();
    expect(audit.count).toBe(0);
  });

  it("log() returns entry when severity meets threshold", () => {
    const audit = new SecurityAuditLog({ minSeverity: "warning" });
    const result = audit.log("warning", "custom", "test", "stored event");

    expect(result).not.toBeNull();
    expect(result!.severity).toBe("warning");
    expect(audit.count).toBe(1);
  });

  it("info shorthand returns null when minSeverity is higher", () => {
    const audit = new SecurityAuditLog({ minSeverity: "critical" });
    expect(audit.info("custom", "test", "event")).toBeNull();
    expect(audit.warn("custom", "test", "event")).toBeNull();
  });

  it("critical shorthand still works with high minSeverity", () => {
    const audit = new SecurityAuditLog({ minSeverity: "critical" });
    expect(audit.critical("custom", "test", "event")).not.toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Preserved: malformed tool arguments → silent fallback (design choice)
// ════════════════════════════════════════════════════════════════════════════

describe("Anthropic — malformed tool arguments (documented behavior)", () => {
  const config = { apiKey: "test-key" };

  it("unparseable arguments silently become {}", async () => {
    /**
     * This is a deliberate defensive design choice — unparseable JSON
     * arguments are silently replaced with {}.
     * Documented here as a known behavior, not a bug to fix.
     */
    const m = new AnthropicChatModel(config);
    mockFetchJSON({
      content: [{ type: "text", text: "ok" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 5, output_tokens: 2 },
    });

    await m.complete({
      messages: [
        { role: "user", content: "test" },
        {
          role: "assistant",
          content: "",
          toolCalls: [{ id: "c1", name: "search", arguments: "THIS IS NOT JSON" }],
        },
      ],
    });

    const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    const assistantMsg = body.messages.find((m: any) => m.role === "assistant");
    const toolUseBlock = (Array.isArray(assistantMsg.content) ? assistantMsg.content : []).find(
      (b: any) => b.type === "tool_use",
    );
    expect(toolUseBlock.input).toEqual({});
  });
});
