/**
 * Shared tool definitions for E2E tests.
 */

import { buildTool, type Tool } from "../../../tools/tool.js";

// ── Echo Tool ────────────────────────────────────────────────────────────────

export const echoTool = buildTool({
  name: "echo",
  inputSchema: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  maxResultChars: 10_000,
  describe: (input: Record<string, unknown>) => `Echo: ${input.text}`,
  async call(input: Record<string, unknown>) {
    return { data: `Echoed: ${input.text}` };
  },
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
});

// ── Fail Tool (always throws) ────────────────────────────────────────────────

export const failTool = buildTool({
  name: "fail",
  inputSchema: { type: "object", properties: {} },
  maxResultChars: 1_000,
  describe: () => "A tool that always fails",
  async call() {
    throw new Error("deliberate failure");
  },
});

// ── Counter Tool (stateful) ──────────────────────────────────────────────────

export function counterTool(counter: { value: number }): Tool {
  return buildTool({
    name: "counter",
    inputSchema: { type: "object", properties: {} },
    maxResultChars: 1_000,
    describe: () => "Increment counter",
    async call() {
      counter.value++;
      return { data: `count=${counter.value}` };
    },
  });
}

// ── Search Tool (deterministic) ──────────────────────────────────────────────

export function searchTool(
  results: Record<string, string>,
): Tool {
  return buildTool({
    name: "search",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    maxResultChars: 50_000,
    describe: () => "Search for information",
    async call(input: Record<string, unknown>) {
      const query = String(input.query ?? "");
      return { data: results[query] ?? `No results for: ${query}` };
    },
    isConcurrencySafe: () => true,
    isReadOnly: () => true,
  });
}

// ── Large Output Tool ────────────────────────────────────────────────────────

export function largeOutputTool(sizeChars: number): Tool {
  return buildTool({
    name: "large_output",
    inputSchema: { type: "object", properties: {} },
    maxResultChars: sizeChars + 1000,
    describe: () => "Returns a very large output",
    async call() {
      return { data: "x".repeat(sizeChars) };
    },
  });
}

// ── Validated Tool ───────────────────────────────────────────────────────────

export const validatedTool = buildTool({
  name: "validated",
  inputSchema: {
    type: "object",
    properties: { value: { type: "number" } },
    required: ["value"],
  },
  maxResultChars: 1_000,
  describe: () => "A tool with input validation",
  async validateInput(input: Record<string, unknown>) {
    if (typeof input.value !== "number")
      return { valid: false, message: "value must be a number" };
    if ((input.value as number) < 0)
      return { valid: false, message: "value must be non-negative" };
    return { valid: true };
  },
  async call(input: Record<string, unknown>) {
    return { data: `Value: ${input.value}` };
  },
});

// ── Slow Tool (for timeout tests) ────────────────────────────────────────────

export function slowTool(delayMs: number): Tool {
  return buildTool({
    name: "slow",
    inputSchema: { type: "object", properties: {} },
    maxResultChars: 1_000,
    describe: () => `A tool that takes ${delayMs}ms`,
    async call() {
      await new Promise((r) => setTimeout(r, delayMs));
      return { data: "slow result" };
    },
  });
}

// ── Write Tool (actually writes to a key-value store) ────────────────────────

export function writeTool(
  store: Map<string, string>,
): Tool {
  return buildTool({
    name: "write",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string" },
        value: { type: "string" },
      },
      required: ["key", "value"],
    },
    maxResultChars: 1_000,
    describe: () => "Write a key-value pair",
    async call(input: Record<string, unknown>) {
      store.set(String(input.key), String(input.value));
      return { data: `Wrote ${input.key}` };
    },
    isReadOnly: () => false,
  });
}
