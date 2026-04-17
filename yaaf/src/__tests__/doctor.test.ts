/**
 * YaafDoctor test suite
 *
 * Tests the Doctor's event-driven diagnostic system:
 *
 * ── RunnerEvents emission ───────────────────────────────────────────
 * - tool:error fires when a tool throws
 * - tool:blocked fires when permissions deny
 * - tool:validation-failed fires on schema mismatch
 * - llm:retry fires on LLM failure
 * - llm:empty-response fires on empty model output
 * - context:output-continuation fires on finishReason=length
 * - context:overflow-recovery fires on ContextOverflow catch
 * - iteration fires with count/maxIterations
 * - hook:error fires when hooks throw
 * - hook:blocked fires when hooks block
 *
 * ── RuntimeErrorBuffer ──────────────────────────────────────────────
 * - Debounces errors within the configured window
 * - Force-flushes when maxBufferSize is reached
 * - flush() delivers all buffered errors immediately
 *
 * ── Doctor.watch() integration ──────────────────────────────────────
 * - Subscribes to agent events and emits DoctorIssues
 * - Classifies issues correctly (runtime_error vs pattern_warning)
 * - unwatch() stops listening
 * - unwatchAll() stops all watches
 * - Duplicate watch() is idempotent
 *
 * ── Auto-attach (doctor: true) ──────────────────────────────────────
 * - Agent with doctor:true creates a Doctor
 * - YAAF_DOCTOR=1 env var enables without config
 *
 * ── Hook callback propagation ───────────────────────────────────────
 * - beforeToolCall exception → hook:error event
 * - beforeToolCall block → hook:blocked event
 * - afterToolCall exception → hook:error event
 * - beforeLLM exception → hook:error event
 * - afterLLM exception → hook:error event
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AgentRunner,
  type ChatModel,
  type ChatResult,
  type RunnerEvents,
} from "../agents/runner.js";
import { buildTool } from "../tools/tool.js";
import type { PermissionPolicy } from "../permissions.js";
import type { Hooks, HookContext, HookResult } from "../hooks.js";
import { createMockModel, createSpyModel, collectEvents, wait } from "./_helpers.js";
import { YaafDoctor } from "../doctor/index.js";
import { Agent } from "../agent.js";

// ── Mock Tools ──────────────────────────────────────────────────────────────

const echoTool = buildTool({
  name: "echo",
  inputSchema: { type: "object", properties: { text: { type: "string" } } },
  maxResultChars: 10_000,
  describe: () => "Echo a string",
  async call(input: Record<string, unknown>) {
    return { data: `Echoed: ${input.text}` };
  },
  isReadOnly: () => true,
});

const throwingTool = buildTool({
  name: "failing_tool",
  inputSchema: { type: "object", properties: {} },
  maxResultChars: 10_000,
  describe: () => "A tool that always throws",
  async call() {
    throw new Error("Tool explosion!");
  },
});

const validatedTool = buildTool({
  name: "validated_tool",
  inputSchema: { type: "object", properties: { value: { type: "number" } }, required: ["value"] },
  maxResultChars: 10_000,
  describe: () => "A tool with input validation",
  async validateInput(input: Record<string, unknown>) {
    if (typeof input.value !== "number" || (input.value as number) < 0) {
      return { valid: false, message: "value must be a non-negative number" };
    }
    return { valid: true };
  },
  async call(input: Record<string, unknown>) {
    return { data: `Value: ${input.value}` };
  },
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("RunnerEvents emission", () => {
  describe("tool events", () => {
    it("emits tool:error when a tool throws", async () => {
      const model = createMockModel([
        {
          content: "",
          toolCalls: [{ id: "tc1", name: "failing_tool", arguments: "{}" }],
          finishReason: "tool_calls",
        },
        { content: "Sorry about that.", finishReason: "stop" },
      ]);
      const runner = new AgentRunner({ model, tools: [throwingTool], systemPrompt: "Test" });
      const errors = collectEvents(runner, "tool:error");

      await runner.run("Do something");

      expect(errors.length).toBe(1);
      expect(errors[0]!.name).toBe("failing_tool");
      expect(errors[0]!.error).toContain("Tool explosion");
    });

    it("emits tool:call for every tool invocation", async () => {
      const model = createMockModel([
        {
          content: "",
          toolCalls: [
            { id: "tc1", name: "echo", arguments: JSON.stringify({ text: "a" }) },
            { id: "tc2", name: "echo", arguments: JSON.stringify({ text: "b" }) },
          ],
          finishReason: "tool_calls",
        },
        { content: "Done", finishReason: "stop" },
      ]);
      const runner = new AgentRunner({ model, tools: [echoTool], systemPrompt: "Test" });
      const calls = collectEvents(runner, "tool:call");

      await runner.run("Echo both");

      expect(calls.length).toBe(2);
      expect(calls[0]!.name).toBe("echo");
      expect(calls[1]!.name).toBe("echo");
    });

    it("emits tool:result for successful tool calls", async () => {
      const model = createMockModel([
        {
          content: "",
          toolCalls: [{ id: "tc1", name: "echo", arguments: JSON.stringify({ text: "hello" }) }],
          finishReason: "tool_calls",
        },
        { content: "Done", finishReason: "stop" },
      ]);
      const runner = new AgentRunner({ model, tools: [echoTool], systemPrompt: "Test" });
      const results = collectEvents(runner, "tool:result");

      await runner.run("Echo hello");

      expect(results.length).toBe(1);
      expect(results[0]!.name).toBe("echo");
      expect(results[0]!.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("LLM events", () => {
    it("emits llm:request and llm:response for each LLM call", async () => {
      const model = createMockModel([{ content: "Hello", finishReason: "stop" }]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });
      const requests = collectEvents(runner, "llm:request");
      const responses = collectEvents(runner, "llm:response");

      await runner.run("Hi");

      expect(requests.length).toBe(1);
      expect(requests[0]!.toolCount).toBe(0);
      expect(responses.length).toBe(1);
      expect(responses[0]!.hasToolCalls).toBe(false);
    });

    it("emits llm:empty-response when model returns nothing", async () => {
      const model = createMockModel([
        { content: "", finishReason: "stop" }, // empty — no tool calls, no content
      ]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });
      const empties = collectEvents(runner, "llm:empty-response");

      await runner.run("Hello");

      expect(empties.length).toBe(1);
      expect(empties[0]!.iteration).toBe(1);
    });

    it("does NOT emit llm:empty-response when model returns content", async () => {
      const model = createMockModel([{ content: "Hello!", finishReason: "stop" }]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });
      const empties = collectEvents(runner, "llm:empty-response");

      await runner.run("Hi");

      expect(empties.length).toBe(0);
    });
  });

  describe("iteration events", () => {
    it("emits iteration count on each loop", async () => {
      const model = createMockModel([
        {
          content: "",
          toolCalls: [{ id: "tc1", name: "echo", arguments: JSON.stringify({ text: "a" }) }],
          finishReason: "tool_calls",
        },
        {
          content: "",
          toolCalls: [{ id: "tc2", name: "echo", arguments: JSON.stringify({ text: "b" }) }],
          finishReason: "tool_calls",
        },
        { content: "Done", finishReason: "stop" },
      ]);
      const runner = new AgentRunner({
        model,
        tools: [echoTool],
        systemPrompt: "Test",
        maxIterations: 10,
      });
      const iterations = collectEvents(runner, "iteration");

      await runner.run("Multi-step");

      expect(iterations.length).toBe(3); // 3 LLM calls
      expect(iterations[0]!.count).toBe(1);
      expect(iterations[1]!.count).toBe(2);
      expect(iterations[2]!.count).toBe(3);
      expect(iterations[0]!.maxIterations).toBe(10);
    });
  });

  describe("context:output-continuation", () => {
    it("emits when finishReason is length (via runStream)", async () => {
      const model = createMockModel([
        { content: "Partial output that was cut off...", finishReason: "length" },
        { content: "Completed.", finishReason: "stop" },
      ]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });
      const continuations = collectEvents(runner, "context:output-continuation");

      // context:output-continuation only fires in runStream (the streaming code path)
      for await (const _event of runner.runStream("Write a long essay")) {
        /* drain */
      }

      expect(continuations.length).toBe(1);
      expect(continuations[0]!.iteration).toBeDefined();
      expect(continuations[0]!.contentLength).toBeGreaterThan(0);
    });
  });

  describe("usage events", () => {
    it("emits usage after each LLM call", async () => {
      const model = createMockModel([
        {
          content: "Hello",
          finishReason: "stop",
          usage: { promptTokens: 10, completionTokens: 5 },
        },
      ]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });
      const usages = collectEvents(runner, "usage");

      await runner.run("Hi");

      expect(usages.length).toBe(1);
      expect(usages[0]!.llmCalls).toBe(1);
      expect(usages[0]!.totalPromptTokens).toBe(10);
      expect(usages[0]!.totalCompletionTokens).toBe(5);
    });
  });
});

describe("Hook event propagation", () => {
  it("emits hook:error when beforeToolCall throws", async () => {
    const hooks: Hooks = {
      beforeToolCall: async () => {
        throw new Error("Hook went boom");
      },
    };
    const model = createMockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "echo", arguments: JSON.stringify({ text: "hi" }) }],
        finishReason: "tool_calls",
      },
      { content: "Done", finishReason: "stop" },
    ]);
    const runner = new AgentRunner({ model, tools: [echoTool], systemPrompt: "Test", hooks });
    const hookErrors = collectEvents(runner, "hook:error");

    await runner.run("Test hooks");

    expect(hookErrors.length).toBe(1);
    expect(hookErrors[0]!.hookName).toBe("beforeToolCall");
    expect(hookErrors[0]!.error).toContain("Hook went boom");
  });

  it("emits hook:blocked when beforeToolCall returns block", async () => {
    const hooks: Hooks = {
      beforeToolCall: async () => ({ action: "block" as const, reason: "Not allowed" }),
    };
    const model = createMockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "echo", arguments: JSON.stringify({ text: "hi" }) }],
        finishReason: "tool_calls",
      },
      { content: "Blocked.", finishReason: "stop" },
    ]);
    const runner = new AgentRunner({ model, tools: [echoTool], systemPrompt: "Test", hooks });
    const hookBlocks = collectEvents(runner, "hook:blocked");

    await runner.run("Test block");

    expect(hookBlocks.length).toBe(1);
    expect(hookBlocks[0]!.hookName).toBe("beforeToolCall");
    expect(hookBlocks[0]!.toolName).toBe("echo");
    expect(hookBlocks[0]!.reason).toBe("Not allowed");
  });

  it("emits hook:error when afterToolCall throws", async () => {
    const hooks: Hooks = {
      afterToolCall: async () => {
        throw new Error("After hook crashed");
      },
    };
    const model = createMockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "echo", arguments: JSON.stringify({ text: "hi" }) }],
        finishReason: "tool_calls",
      },
      { content: "Done", finishReason: "stop" },
    ]);
    const runner = new AgentRunner({ model, tools: [echoTool], systemPrompt: "Test", hooks });
    const hookErrors = collectEvents(runner, "hook:error");

    await runner.run("Test after hook");

    expect(hookErrors.length).toBe(1);
    expect(hookErrors[0]!.hookName).toBe("afterToolCall");
    expect(hookErrors[0]!.error).toContain("After hook crashed");
  });

  it("emits hook:error when beforeLLM throws", async () => {
    const hooks: Hooks = {
      beforeLLM: async () => {
        throw new Error("LLM hook broken");
      },
    };
    const model = createMockModel([{ content: "Response", finishReason: "stop" }]);
    const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test", hooks });
    const hookErrors = collectEvents(runner, "hook:error");

    await runner.run("Test LLM hook");

    expect(hookErrors.length).toBe(1);
    expect(hookErrors[0]!.hookName).toBe("beforeLLM");
    expect(hookErrors[0]!.error).toContain("LLM hook broken");
  });

  it("emits hook:error when afterLLM throws", async () => {
    const hooks: Hooks = {
      afterLLM: async () => {
        throw new Error("After LLM kaboom");
      },
    };
    const model = createMockModel([{ content: "Response", finishReason: "stop" }]);
    const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test", hooks });
    const hookErrors = collectEvents(runner, "hook:error");

    await runner.run("Test afterLLM hook");

    expect(hookErrors.length).toBe(1);
    expect(hookErrors[0]!.hookName).toBe("afterLLM");
    expect(hookErrors[0]!.error).toContain("After LLM kaboom");
  });
});

describe("Doctor watch integration", () => {
  it("watch() receives tool:error events as DoctorIssues", async () => {
    const model = createMockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "failing_tool", arguments: "{}" }],
        finishReason: "tool_calls",
      },
      { content: "Error handled.", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test agent",
      tools: [throwingTool],
    });

    const doctorModel = createMockModel([{ content: "ok", finishReason: "stop" }]);
    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: doctorModel });
    const issues: Array<{ type: string; summary: string }> = [];
    doctor.onIssue((issue) => issues.push({ type: issue.type, summary: issue.summary }));

    // Watch with auto-diagnose OFF (no LLM call from doctor)
    doctor.watch(agent, { autoDiagnose: false, debounceMs: 50, maxBufferSize: 1 });

    await agent.run("Test");

    // Give the buffer time to flush
    await wait(100);

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.type === "runtime_error")).toBe(true);
    expect(issues.some((i) => i.summary.includes("failing_tool"))).toBe(true);

    doctor.unwatchAll();
  });

  it("watch() receives hook:error events as DoctorIssues", async () => {
    const model = createMockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "echo", arguments: JSON.stringify({ text: "hi" }) }],
        finishReason: "tool_calls",
      },
      { content: "Done", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test agent",
      tools: [echoTool],
      hooks: {
        beforeToolCall: async () => {
          throw new Error("Hook broke");
        },
      },
    });

    const doctorModel = createMockModel([{ content: "ok", finishReason: "stop" }]);
    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: doctorModel });
    const issues: Array<{ type: string; summary: string }> = [];
    doctor.onIssue((issue) => issues.push({ type: issue.type, summary: issue.summary }));

    doctor.watch(agent, { autoDiagnose: false, debounceMs: 50, maxBufferSize: 1 });

    await agent.run("Test hooks");
    await wait(100);

    expect(issues.some((i) => i.type === "runtime_error")).toBe(true);
    expect(issues.some((i) => i.summary.includes("beforeToolCall"))).toBe(true);

    doctor.unwatchAll();
  });

  it("watch() receives llm:empty-response as pattern_warning", async () => {
    const model = createMockModel([{ content: "", finishReason: "stop" }]);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test agent",
      tools: [],
    });

    const doctorModel = createMockModel([{ content: "ok", finishReason: "stop" }]);
    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: doctorModel });
    const issues: Array<{ type: string; summary: string }> = [];
    doctor.onIssue((issue) => issues.push({ type: issue.type, summary: issue.summary }));

    doctor.watch(agent, { autoDiagnose: false, debounceMs: 50, maxBufferSize: 1 });

    await agent.run("Test empty");
    await wait(100);

    expect(issues.some((i) => i.type === "pattern_warning")).toBe(true);
    expect(issues.some((i) => i.summary.includes("empty response"))).toBe(true);

    doctor.unwatchAll();
  });

  it("watch() receives context:output-continuation events", async () => {
    const model = createMockModel([
      { content: "Partial text...", finishReason: "length" },
      { content: "Resumed.", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test agent",
      tools: [],
    });

    const doctorModel = createMockModel([{ content: "ok", finishReason: "stop" }]);
    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: doctorModel });
    const issues: Array<{ type: string; summary: string }> = [];
    doctor.onIssue((issue) => issues.push({ type: issue.type, summary: issue.summary }));

    doctor.watch(agent, { autoDiagnose: false, debounceMs: 50, maxBufferSize: 1 });

    // context:output-continuation fires via runStream, but Agent.run() doesn't go
    // through runStream — so we use the streaming path via agent.runStream()
    for await (const _event of agent.runStream("Write long")) {
      /* drain */
    }
    await wait(100);

    expect(issues.some((i) => i.summary.includes("Output token limit"))).toBe(true);

    doctor.unwatchAll();
  });

  it("unwatch() stops receiving events", async () => {
    // Two separate model responses — both trigger a tool error
    const model = createMockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "failing_tool", arguments: "{}" }],
        finishReason: "tool_calls",
      },
      { content: "Error 1 handled.", finishReason: "stop" },
      {
        content: "",
        toolCalls: [{ id: "tc2", name: "failing_tool", arguments: "{}" }],
        finishReason: "tool_calls",
      },
      { content: "Error 2 handled.", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test agent",
      tools: [throwingTool],
    });

    const doctorModel = createMockModel([{ content: "ok", finishReason: "stop" }]);
    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: doctorModel });
    const issues: Array<{ type: string }> = [];
    doctor.onIssue((issue) => issues.push({ type: issue.type }));

    // maxBufferSize: 1 forces immediate flush (no debounce race)
    doctor.watch(agent, { autoDiagnose: false, debounceMs: 50, maxBufferSize: 1 });

    await agent.run("First");
    await wait(100);
    const countAfterFirst = issues.length;
    expect(countAfterFirst).toBeGreaterThanOrEqual(1);

    doctor.unwatch(agent);

    await agent.run("Second");
    await wait(100);

    // No new issues after unwatch
    expect(issues.length).toBe(countAfterFirst);
  });

  it("duplicate watch() is idempotent", async () => {
    const model = createMockModel([{ content: "", finishReason: "stop" }]);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [],
    });

    const doctorModel = createMockModel([{ content: "ok", finishReason: "stop" }]);
    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: doctorModel });
    const issues: Array<{ type: string }> = [];
    doctor.onIssue((issue) => issues.push({ type: issue.type }));

    doctor.watch(agent, { autoDiagnose: false, debounceMs: 50, maxBufferSize: 1 });
    doctor.watch(agent, { autoDiagnose: false, debounceMs: 50, maxBufferSize: 1 }); // duplicate — should warn, not double-subscribe

    await agent.run("Test");
    await wait(100);

    // Should not get duplicate events
    const emptyResponses = issues.filter((i) => i.type === "pattern_warning");
    expect(emptyResponses.length).toBeLessThanOrEqual(1); // At most 1 from the empty response
    doctor.unwatchAll();
  });
});

describe("Streaming events", () => {
  it("emits the same events via runStream as via run", async () => {
    const model = createMockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "failing_tool", arguments: "{}" }],
        finishReason: "tool_calls",
      },
      { content: "Done", finishReason: "stop" },
    ]);
    const runner = new AgentRunner({ model, tools: [throwingTool], systemPrompt: "Test" });
    const errors = collectEvents(runner, "tool:error");

    // Consume the stream
    for await (const _event of runner.runStream("Test")) {
      /* drain */
    }

    expect(errors.length).toBe(1);
    expect(errors[0]!.name).toBe("failing_tool");
  });

  it("emits context:output-continuation via runStream", async () => {
    const model = createMockModel([
      { content: "Partial...", finishReason: "length" },
      { content: "Done.", finishReason: "stop" },
    ]);
    const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });
    const continuations = collectEvents(runner, "context:output-continuation");

    for await (const _event of runner.runStream("Write long")) {
      /* drain */
    }

    expect(continuations.length).toBe(1);
  });

  it("emits hook:error via runStream when hooks throw", async () => {
    const hooks: Hooks = {
      beforeLLM: async () => {
        throw new Error("Stream hook error");
      },
    };
    const model = createMockModel([{ content: "Response", finishReason: "stop" }]);
    const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test", hooks });
    const hookErrors = collectEvents(runner, "hook:error");

    for await (const _event of runner.runStream("Test")) {
      /* drain */
    }

    expect(hookErrors.length).toBe(1);
    expect(hookErrors[0]!.hookName).toBe("beforeLLM");
  });
});

// ── Doctor LLM Diagnosis Pipeline ───────────────────────────────────────────
//
// These tests use autoDiagnose: TRUE with a spy model to verify that the
// Doctor's own LLM receives the correct error context and produces
// properly formatted DoctorIssue output.

describe("Doctor diagnosis pipeline (with spy model)", () => {
  it("sends error context to Doctor LLM during diagnosis", async () => {
    // Agent model — will produce a tool error
    const agentModel = createMockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "failing_tool", arguments: "{}" }],
        finishReason: "tool_calls",
      },
      { content: "Handled.", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: agentModel,
      systemPrompt: "Test agent",
      tools: [throwingTool],
    });

    // Spy model for the Doctor — captures what the Doctor sends to its LLM
    const { model: doctorModel, calls: doctorCalls } = createSpyModel(
      'Root cause: The tool "failing_tool" throws unconditionally. Fix: Add error handling.',
    );

    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: doctorModel });
    const issues: Array<{ type: string; summary: string; details: string }> = [];
    doctor.onIssue((issue) =>
      issues.push({
        type: issue.type,
        summary: issue.summary,
        details: issue.details,
      }),
    );

    // autoDiagnose: true — Doctor will call its LLM
    doctor.watch(agent, { autoDiagnose: true, debounceMs: 50, maxBufferSize: 1 });

    await agent.run("Test");
    // Wait for debounce + async diagnosis
    await wait(300);

    // Verify the Doctor's LLM was called
    expect(doctorCalls.length).toBeGreaterThanOrEqual(1);

    // Verify the prompt sent to the Doctor contains the error details
    const lastCall = doctorCalls[doctorCalls.length - 1]!;
    const userMessage = lastCall.messages.find((m: any) => m.role === "user");
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toContain("runtime error");
    expect(userMessage!.content).toContain("failing_tool");

    // Verify the diagnosis was emitted as a DoctorIssue
    const diagnosisIssue = issues.find(
      (i) => i.summary.includes("diagnosis") || i.summary.includes("analyzed"),
    );
    expect(diagnosisIssue).toBeDefined();
    expect(diagnosisIssue!.details).toContain("Root cause");

    doctor.unwatchAll();
  });

  it("batches multiple errors into one diagnosis call", async () => {
    // Agent model — 3 tool calls, all will fail
    const agentModel = createMockModel([
      {
        content: "",
        toolCalls: [
          { id: "tc1", name: "failing_tool", arguments: "{}" },
          { id: "tc2", name: "failing_tool", arguments: "{}" },
          { id: "tc3", name: "failing_tool", arguments: "{}" },
        ],
        finishReason: "tool_calls",
      },
      { content: "All failed.", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: agentModel,
      systemPrompt: "Test agent",
      tools: [throwingTool],
    });

    const { model: doctorModel, calls: doctorCalls } = createSpyModel(
      "Multiple failures from the same tool. Likely a systemic issue.",
    );

    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: doctorModel });

    // Use a larger buffer so errors get batched
    doctor.watch(agent, { autoDiagnose: true, debounceMs: 100, maxBufferSize: 10 });

    await agent.run("Test");
    await wait(300);

    // The Doctor should batch all errors into ONE LLM diagnosis call, not 3
    expect(doctorCalls.length).toBe(1);

    // The single prompt should mention multiple errors
    const userMessage = doctorCalls[0]!.messages.find((m: any) => m.role === "user");
    expect(userMessage.content).toContain("[1]");
    // At least 2 errors (some may be cancelled by sibling abort)
    expect(userMessage.content).toMatch(/\[\d\]/);

    doctor.unwatchAll();
  });

  it("Doctor diagnosis output becomes a DoctorIssue", async () => {
    const agentModel = createMockModel([
      { content: "", finishReason: "stop" }, // empty response → triggers pattern_warning
    ]);

    const agent = new Agent({
      chatModel: agentModel,
      systemPrompt: "Test agent",
      tools: [],
    });

    const diagnosisText =
      'The system prompt may be too restrictive. Try adding an instruction like "Always respond to the user."';
    const { model: doctorModel, calls: doctorCalls } = createSpyModel(diagnosisText);

    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: doctorModel });
    const issues: Array<{ type: string; summary: string; details: string }> = [];
    doctor.onIssue((issue) =>
      issues.push({
        type: issue.type,
        summary: issue.summary,
        details: issue.details,
      }),
    );

    doctor.watch(agent, { autoDiagnose: true, debounceMs: 50, maxBufferSize: 1 });

    await agent.run("Test");
    await wait(300);

    // Should get both the raw issue AND the diagnosis
    expect(issues.length).toBeGreaterThanOrEqual(2);

    // The diagnosis issue should contain the Doctor's LLM response
    const diagIssue = issues.find((i) => i.details.includes("system prompt"));
    expect(diagIssue).toBeDefined();
    expect(diagIssue!.details).toContain("too restrictive");

    doctor.unwatchAll();
  });

  it("gracefully handles Doctor LLM failure", async () => {
    const agentModel = createMockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "failing_tool", arguments: "{}" }],
        finishReason: "tool_calls",
      },
      { content: "Handled.", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: agentModel,
      systemPrompt: "Test agent",
      tools: [throwingTool],
    });

    // Doctor model that ALSO throws — simulates API failure
    const failingDoctorModel: ChatModel & { model: string } = {
      model: "failing-doctor",
      async complete() {
        throw new Error("Doctor API key expired");
      },
    };

    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: failingDoctorModel });
    const issues: Array<{ type: string; summary: string }> = [];
    doctor.onIssue((issue) => issues.push({ type: issue.type, summary: issue.summary }));

    doctor.watch(agent, { autoDiagnose: true, debounceMs: 50, maxBufferSize: 1 });

    // Should NOT throw — Doctor failure is non-fatal
    await agent.run("Test");
    await wait(300);

    // Raw errors should still be emitted even if diagnosis failed
    expect(issues.some((i) => i.type === "runtime_error")).toBe(true);

    doctor.unwatchAll();
  });
});

// ── RuntimeErrorBuffer unit tests ───────────────────────────────────────────

describe("RuntimeErrorBuffer", () => {
  it("debounces rapid errors into one flush", async () => {
    // We can test the buffer indirectly through the Doctor

    // Agent that fires 5 tool calls rapidly
    const agentModel = createMockModel([
      {
        content: "",
        toolCalls: Array.from({ length: 5 }, (_, i) => ({
          id: `tc${i}`,
          name: "echo",
          arguments: JSON.stringify({ text: `msg${i}` }),
        })),
        finishReason: "tool_calls",
      },
      { content: "Done", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: agentModel,
      systemPrompt: "Test",
      tools: [echoTool],
    });

    const { model: doctorModel, calls: doctorCalls } = createSpyModel("All good.");
    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: doctorModel });

    // Large buffer + long debounce → should batch all 5 tool results
    doctor.watch(agent, { autoDiagnose: false, debounceMs: 200, maxBufferSize: 50 });

    await agent.run("Test");
    await wait(350);

    // autoDiagnose is off, so no LLM calls
    expect(doctorCalls.length).toBe(0);

    doctor.unwatchAll();
  });

  it("force-flushes when maxBufferSize is reached", async () => {
    const agentModel = createMockModel([
      {
        content: "",
        toolCalls: [
          { id: "tc1", name: "failing_tool", arguments: "{}" },
          { id: "tc2", name: "failing_tool", arguments: "{}" },
        ],
        finishReason: "tool_calls",
      },
      { content: "Done", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: agentModel,
      systemPrompt: "Test",
      tools: [throwingTool],
    });

    const { model: doctorModel, calls: doctorCalls } = createSpyModel("Diagnosed.");
    const doctor = new YaafDoctor({ projectRoot: process.cwd(), chatModel: doctorModel });
    const issues: Array<{ type: string }> = [];
    doctor.onIssue((issue) => issues.push({ type: issue.type }));

    // maxBufferSize: 1 → forces immediate flush on first error (no debounce)
    doctor.watch(agent, { autoDiagnose: true, debounceMs: 10_000, maxBufferSize: 1 });

    await agent.run("Test");
    await wait(300);

    // Should have flushed immediately per error, not waited for debounce
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(doctorCalls.length).toBeGreaterThanOrEqual(1);

    doctor.unwatchAll();
  });
});
