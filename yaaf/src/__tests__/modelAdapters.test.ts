/**
 * Model Adapter tests — Anthropic + OpenAI
 *
 * These adapters parse raw HTTP/SSE from LLM providers. A parsing bug
 * causes tool calls to silently vanish, arguments to corrupt, or streaming
 * to hang. They use raw fetch (no SDK), so we mock globalThis.fetch.
 *
 * ⚠️ Previously had ZERO test coverage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ════════════════════════════════════════════════════════════════════════════
// Helpers for mock fetch
// ════════════════════════════════════════════════════════════════════════════

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

function mockFetchSSE(lines: string[], status = 200) {
  const body = lines.join("\n\n") + "\n\n";
  globalThis.fetch = vi.fn(
    async () =>
      new Response(body, {
        status,
        headers: { "Content-Type": "text/event-stream" },
      }),
  ) as unknown as typeof fetch;
}

function mockFetchError(status: number, body: string) {
  globalThis.fetch = vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch;
}

function mockFetchNetworkError(message: string) {
  globalThis.fetch = vi.fn(async () => {
    throw new Error(message);
  }) as unknown as typeof fetch;
}

// ════════════════════════════════════════════════════════════════════════════
// Anthropic
// ════════════════════════════════════════════════════════════════════════════

import { AnthropicChatModel } from "../models/anthropic.js";

describe("AnthropicChatModel", () => {
  const config = { apiKey: "test-key" };

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── Constructor ────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("defaults to claude-sonnet-4", () => {
      const m = new AnthropicChatModel(config);
      expect(m.model).toBe("claude-sonnet-4");
    });

    it("resolves contextWindow and maxOutput from registry", () => {
      const m = new AnthropicChatModel(config);
      expect(m.contextWindowTokens).toBeGreaterThan(0);
      expect(m.maxOutputTokens).toBeGreaterThan(0);
    });

    it("uses custom model name", () => {
      const m = new AnthropicChatModel({ ...config, model: "claude-opus-4" });
      expect(m.model).toBe("claude-opus-4");
    });
  });

  // ── complete() ─────────────────────────────────────────────────────────

  describe("complete()", () => {
    it("parses text-only response", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchJSON({
        content: [{ type: "text", text: "Hello world" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const result = await m.complete({
        messages: [{ role: "user", content: "hi" }],
      });

      expect(result.content).toBe("Hello world");
      expect(result.finishReason).toBe("stop");
      expect(result.usage?.promptTokens).toBe(10);
      expect(result.usage?.completionTokens).toBe(5);
    });

    it("parses tool_use blocks into toolCalls", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchJSON({
        content: [
          { type: "text", text: "Using tool." },
          { type: "tool_use", id: "call_1", name: "search", input: { q: "yaaf" } },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 20, output_tokens: 15 },
      });

      const result = await m.complete({
        messages: [{ role: "user", content: "search for yaaf" }],
      });

      expect(result.finishReason).toBe("tool_calls");
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls![0]!.id).toBe("call_1");
      expect(result.toolCalls![0]!.name).toBe("search");
      expect(JSON.parse(result.toolCalls![0]!.arguments)).toEqual({ q: "yaaf" });
    });

    it("maps max_tokens stop reason", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchJSON({
        content: [{ type: "text", text: "truncated" }],
        stop_reason: "max_tokens",
        usage: { input_tokens: 5, output_tokens: 5 },
      });

      const result = await m.complete({
        messages: [{ role: "user", content: "test" }],
      });
      expect(result.finishReason).toBe("length");
    });

    it("sends system messages as top-level system field", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchJSON({
        content: [{ type: "text", text: "ok" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 5, output_tokens: 2 },
      });

      await m.complete({
        messages: [
          { role: "system", content: "You are helpful." },
          { role: "user", content: "hi" },
        ],
      });

      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.system).toBe("You are helpful.");
      // System message should NOT appear in messages array
      expect(body.messages.every((m: any) => m.role !== "system")).toBe(true);
    });

    it("batches consecutive tool results into one user message", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchJSON({
        content: [{ type: "text", text: "ok" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 5, output_tokens: 2 },
      });

      await m.complete({
        messages: [
          { role: "user", content: "search" },
          {
            role: "assistant",
            content: "Using tools.",
            toolCalls: [
              { id: "c1", name: "a", arguments: "{}" },
              { id: "c2", name: "b", arguments: "{}" },
            ],
          },
          { role: "tool", content: "result1", toolCallId: "c1" },
          { role: "tool", content: "result2", toolCallId: "c2" },
        ],
      });

      const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      // The two tool results should be folded into a single user message
      const userWithToolResults = body.messages.filter(
        (m: any) =>
          m.role === "user" && Array.isArray(m.content) && m.content[0]?.type === "tool_result",
      );
      expect(userWithToolResults).toHaveLength(1);
      expect(userWithToolResults[0].content).toHaveLength(2);
    });

    it("converts tool schemas to Anthropic format", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchJSON({
        content: [{ type: "text", text: "ok" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 5, output_tokens: 2 },
      });

      await m.complete({
        messages: [{ role: "user", content: "hi" }],
        tools: [
          {
            type: "function",
            function: {
              name: "search",
              description: "Search the web",
              parameters: { type: "object", properties: { q: { type: "string" } } },
            },
          },
        ],
      });

      const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(body.tools[0].name).toBe("search");
      expect(body.tools[0].input_schema).toBeDefined();
      expect(body.tools[0].input_schema.type).toBe("object");
    });

    it("parses cache read tokens", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchJSON({
        content: [{ type: "text", text: "ok" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 8 },
      });

      const result = await m.complete({
        messages: [{ role: "user", content: "test" }],
      });
      expect(result.usage?.cacheReadTokens).toBe(8);
    });
  });

  // ── stream() ───────────────────────────────────────────────────────────

  describe("stream()", () => {
    it("yields text deltas from content_block_delta", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchSSE([
        'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":10,"output_tokens":0}}}',
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}',
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}',
        'event: message_stop\ndata: {"type":"message_stop"}',
      ]);

      const deltas: any[] = [];
      for await (const d of m.stream({
        messages: [{ role: "user", content: "hi" }],
      })) {
        deltas.push(d);
      }

      const textDeltas = deltas.filter((d) => d.content);
      expect(textDeltas.map((d) => d.content).join("")).toBe("Hello world");
    });

    it("accumulates tool call arguments from input_json_delta", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchSSE([
        'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":10,"output_tokens":0}}}',
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"call_1","name":"search"}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"q\\""}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":":\\"test\\"}"}}',
        'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}',
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":10}}',
      ]);

      const deltas: any[] = [];
      for await (const d of m.stream({
        messages: [{ role: "user", content: "search" }],
      })) {
        deltas.push(d);
      }

      const toolDeltas = deltas.filter((d) => d.toolCallDelta);
      expect(toolDeltas.length).toBeGreaterThan(0);
      expect(toolDeltas[0].toolCallDelta.name).toBe("search");
      expect(toolDeltas[0].toolCallDelta.id).toBe("call_1");
    });

    it("yields final usage from message_delta", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchSSE([
        'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":10,"output_tokens":0}}}',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}',
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}',
      ]);

      const deltas: any[] = [];
      for await (const d of m.stream({
        messages: [{ role: "user", content: "hi" }],
      })) {
        deltas.push(d);
      }

      const finalDelta = deltas.find((d) => d.usage);
      expect(finalDelta?.usage.promptTokens).toBe(10);
      expect(finalDelta?.usage.completionTokens).toBe(5);
    });

    it("handles empty/malformed SSE lines gracefully", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchSSE([
        "",
        "event: ping\ndata: {}",
        "data: not-json{{{",
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}',
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":1}}',
      ]);

      const deltas: any[] = [];
      for await (const d of m.stream({
        messages: [{ role: "user", content: "test" }],
      })) {
        deltas.push(d);
      }

      expect(deltas.some((d) => d.content === "ok")).toBe(true);
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────

  describe("error handling", () => {
    it("HTTP 401 → throws auth error", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchError(401, "Unauthorized");

      await expect(m.complete({ messages: [{ role: "user", content: "hi" }] })).rejects.toThrow();
    });

    it("HTTP 429 → throws rate limit error", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchError(429, "Rate limited");

      await expect(m.complete({ messages: [{ role: "user", content: "hi" }] })).rejects.toThrow();
    });

    it("network failure → throws connection error", async () => {
      const m = new AnthropicChatModel(config);
      mockFetchNetworkError("ECONNREFUSED");

      await expect(m.complete({ messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(
        /connect|ECONNREFUSED/i,
      );
    });

    it("sends correct auth headers", async () => {
      const m = new AnthropicChatModel({ ...config, headers: { "X-Custom": "test" } });
      mockFetchJSON({
        content: [{ type: "text", text: "ok" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 1 },
      });

      await m.complete({ messages: [{ role: "user", content: "hi" }] });

      const headers = (globalThis.fetch as any).mock.calls[0][1].headers;
      expect(headers["x-api-key"]).toBe("test-key");
      expect(headers["anthropic-version"]).toBe("2023-06-01");
      expect(headers["X-Custom"]).toBe("test");
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// OpenAI
// ════════════════════════════════════════════════════════════════════════════

import { OpenAIChatModel } from "../models/openai.js";

describe("OpenAIChatModel", () => {
  const config = { apiKey: "test-key" };

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── Constructor ────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("defaults to gpt-4o-mini", () => {
      const m = new OpenAIChatModel(config);
      expect(m.model).toBe("gpt-4o-mini");
    });

    it("resolves specs from registry", () => {
      const m = new OpenAIChatModel(config);
      expect(m.contextWindowTokens).toBeGreaterThan(0);
    });
  });

  // ── complete() ─────────────────────────────────────────────────────────

  describe("complete()", () => {
    it("parses text-only response", async () => {
      const m = new OpenAIChatModel(config);
      mockFetchJSON({
        choices: [{ message: { role: "assistant", content: "Hello!" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      });

      const result = await m.complete({
        messages: [{ role: "user", content: "hi" }],
      });

      expect(result.content).toBe("Hello!");
      expect(result.finishReason).toBe("stop");
      expect(result.usage?.promptTokens).toBe(5);
    });

    it("parses tool_calls in response", async () => {
      const m = new OpenAIChatModel(config);
      mockFetchJSON({
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "tc_1",
                  type: "function",
                  function: { name: "search", arguments: '{"q":"test"}' },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 8 },
      });

      const result = await m.complete({
        messages: [{ role: "user", content: "search" }],
      });

      expect(result.finishReason).toBe("tool_calls");
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls![0]!.name).toBe("search");
      expect(result.toolCalls![0]!.id).toBe("tc_1");
    });

    it("maps length finish reason", async () => {
      const m = new OpenAIChatModel(config);
      mockFetchJSON({
        choices: [{ message: { role: "assistant", content: "trunc" }, finish_reason: "length" }],
        usage: { prompt_tokens: 5, completion_tokens: 5 },
      });

      const result = await m.complete({
        messages: [{ role: "user", content: "hi" }],
      });
      expect(result.finishReason).toBe("length");
    });

    it("sends tool schemas in OpenAI format", async () => {
      const m = new OpenAIChatModel(config);
      mockFetchJSON({
        choices: [{ message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 2 },
      });

      await m.complete({
        messages: [{ role: "user", content: "hi" }],
        tools: [
          {
            type: "function",
            function: {
              name: "calc",
              description: "Calculate",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      });

      const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(body.tools).toBeDefined();
      expect(body.tools[0].function.name).toBe("calc");
    });
  });

  // ── stream() ───────────────────────────────────────────────────────

  describe("stream()", () => {
    it("yields text deltas", async () => {
      const m = new OpenAIChatModel(config);
      mockFetchSSE([
        'data: {"choices":[{"delta":{"content":"Hel"}}]}',
        'data: {"choices":[{"delta":{"content":"lo"}}]}',
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":2}}',
        "data: [DONE]",
      ]);

      const deltas: any[] = [];
      for await (const d of m.stream({
        messages: [{ role: "user", content: "hi" }],
      })) {
        deltas.push(d);
      }

      const text = deltas
        .filter((d) => d.content)
        .map((d) => d.content)
        .join("");
      expect(text).toBe("Hello");
    });

    it("streams tool call deltas", async () => {
      const m = new OpenAIChatModel(config);
      mockFetchSSE([
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"tc_1","function":{"name":"search","arguments":"{\\"q"}}]}}]}',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\": \\"test\\"}"}}]}}]}',
        'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
        "data: [DONE]",
      ]);

      const deltas: any[] = [];
      for await (const d of m.stream({
        messages: [{ role: "user", content: "search" }],
      })) {
        deltas.push(d);
      }

      const toolDeltas = deltas.filter((d) => d.toolCallDelta);
      expect(toolDeltas.length).toBeGreaterThan(0);
    });

    it("terminates on [DONE] sentinel", async () => {
      const m = new OpenAIChatModel(config);
      mockFetchSSE([
        'data: {"choices":[{"delta":{"content":"ok"}}]}',
        "data: [DONE]",
        'data: {"choices":[{"delta":{"content":"SHOULD NOT APPEAR"}}]}',
      ]);

      const deltas: any[] = [];
      for await (const d of m.stream({
        messages: [{ role: "user", content: "test" }],
      })) {
        deltas.push(d);
      }

      expect(deltas.some((d) => d.content === "SHOULD NOT APPEAR")).toBe(false);
    });
  });

  // ── Error handling ─────────────────────────────────────────────────

  describe("error handling", () => {
    it("HTTP 401 → throws", async () => {
      const m = new OpenAIChatModel(config);
      mockFetchError(401, "Invalid API key");
      await expect(m.complete({ messages: [{ role: "user", content: "hi" }] })).rejects.toThrow();
    });

    it("network error → throws", async () => {
      const m = new OpenAIChatModel(config);
      mockFetchNetworkError("ECONNREFUSED");
      await expect(m.complete({ messages: [{ role: "user", content: "hi" }] })).rejects.toThrow();
    });

    it("sends Authorization header", async () => {
      const m = new OpenAIChatModel(config);
      mockFetchJSON({
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      });

      await m.complete({ messages: [{ role: "user", content: "hi" }] });
      const headers = (globalThis.fetch as any).mock.calls[0][1].headers;
      expect(headers["Authorization"]).toBe("Bearer test-key");
    });
  });
});
