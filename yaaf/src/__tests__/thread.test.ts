/**
 * AgentThread / step() / resume() — Test Suite
 *
 * Tests the stateless reducer pattern:
 * - createThread / forkThread / serialize-deserialize
 * - agent.step() basic loop
 * - Suspension on requiresApproval tools
 * - Suspension on request_human_input tool
 * - resume() with approved / rejected / human_input
 * - runToCompletion() throws on suspension
 * - Multi-step loop convergence
 */

import { describe, it, expect, vi } from "vitest";
import { AgentRunner, type AgentRunnerConfig, type ChatResult } from "../agents/runner.js";
import {
  createThread,
  forkThread,
  serializeThread,
  deserializeThread,
  type AgentThread,
} from "../agents/thread.js";
import { buildTool } from "../tools/tool.js";
import type { ChatModel } from "../agents/runner.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a mock ChatModel from a sequence of responses */
function mockModel(responses: ChatResult[]): ChatModel {
  let i = 0;
  return {
    model: "mock-model",
    async complete() {
      const r = responses[i++];
      if (!r) throw new Error(`Mock model exhausted after ${i - 1} calls`);
      return r;
    },
  };
}

/** Simple text response */
function textResponse(content: string): ChatResult {
  return { content, finishReason: "stop" };
}

/** Tool call response */
function toolCallResponse(name: string, args: Record<string, unknown> = {}): ChatResult {
  return {
    finishReason: "tool_calls",
    toolCalls: [{ id: `tc_${name}`, name, arguments: JSON.stringify(args) }],
  };
}

/** Build a minimal AgentRunner with provided model and tools */
function makeRunner(model: ChatModel, tools = [] as ReturnType<typeof buildTool>[]): AgentRunner {
  return new AgentRunner({
    model,
    tools,
    systemPrompt: "You are a test agent.",
  });
}

// ── Thread helpers ────────────────────────────────────────────────────────────

describe("createThread", () => {
  it("creates a thread with the user message", () => {
    const thread = createThread("Hello world");
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0]).toEqual({ role: "user", content: "Hello world" });
    expect(thread.done).toBe(false);
    expect(thread.step).toBe(0);
    expect(thread.id).toBeTruthy();
  });

  it("accepts optional metadata", () => {
    const thread = createThread("msg", { env: "test" });
    expect(thread.metadata).toEqual({ env: "test" });
  });

  it("generates unique IDs", () => {
    const a = createThread("a");
    const b = createThread("b");
    expect(a.id).not.toBe(b.id);
  });
});

describe("forkThread", () => {
  it("creates a new thread with same messages", () => {
    const original = createThread("hello");
    const forked = forkThread(original);
    expect(forked.id).not.toBe(original.id);
    expect(forked.messages).toHaveLength(original.messages.length);
    expect(forked.metadata?.forkedFrom).toBe(original.id);
  });

  it("mutations to fork do not affect original", () => {
    const original = createThread("hello");
    const forked = forkThread(original);
    forked.messages.push({ role: "user", content: "extra" });
    expect(original.messages).toHaveLength(1);
  });
});

describe("serialize / deserialize", () => {
  it("round-trips a thread", () => {
    const thread = createThread("test message", { key: "value" });
    const json = serializeThread(thread);
    const restored = deserializeThread(json);
    expect(restored.id).toBe(thread.id);
    expect(restored.messages).toEqual(thread.messages);
    expect(restored.metadata).toEqual(thread.metadata);
  });

  it("handles threads with suspended state", () => {
    const thread: AgentThread = {
      ...createThread("deploy"),
      suspended: {
        type: "awaiting_approval",
        pendingToolCall: { id: "tc_1", name: "deploy", arguments: "{}" },
        args: {},
        message: "Needs approval",
      },
    };
    const restored = deserializeThread(serializeThread(thread));
    expect(restored.suspended?.type).toBe("awaiting_approval");
  });
});

// ── agent.step() ──────────────────────────────────────────────────────────────

describe("AgentRunner.step()", () => {
  it("returns done=true on a plain text response", async () => {
    const runner = makeRunner(mockModel([textResponse("Hello!")]));
    const thread = createThread("hi");
    const result = await runner.step(thread);

    expect(result.done).toBe(true);
    expect(result.response).toBe("Hello!");
    expect(result.thread.finalResponse).toBe("Hello!");
    expect(result.thread.messages.at(-1)).toEqual({ role: "assistant", content: "Hello!" });
  });

  it("increments step counter", async () => {
    const runner = makeRunner(mockModel([textResponse("done")]));
    const thread = createThread("go");
    const result = await runner.step(thread);
    expect(result.thread.step).toBe(1);
  });

  it("returns done=false when a normal tool is called", async () => {
    const echoTool = buildTool({
      name: "echo",
      description: "Echoes input",
      inputSchema: { type: "object", properties: { msg: { type: "string" } } },
      async call({ msg }) {
        return { echo: msg };
      },
    });
    const runner = makeRunner(
      mockModel([toolCallResponse("echo", { msg: "test" }), textResponse("done")]),
      [echoTool],
    );
    const thread = createThread("echo test");
    const result = await runner.step(thread);

    expect(result.done).toBe(false);
    expect(result.suspended).toBeUndefined();
    // Thread messages should include: user, assistant(tool_call), tool_result
    expect(result.thread.messages.some((m) => m.role === "tool")).toBe(true);
  });

  it("multi-step loop converges to done", async () => {
    const searchTool = buildTool({
      name: "search",
      description: "Search",
      inputSchema: { type: "object", properties: { q: { type: "string" } } },
      async call({ q }) {
        return `Results for ${q}`;
      },
    });
    const runner = makeRunner(
      mockModel([toolCallResponse("search", { q: "test" }), textResponse("Final answer")]),
      [searchTool],
    );

    let thread = createThread("research topic");
    let iterations = 0;
    while (!thread.done && !thread.suspended && iterations < 10) {
      const result = await runner.step(thread);
      thread = result.thread;
      iterations++;
    }

    expect(thread.done).toBe(true);
    expect(thread.finalResponse).toBe("Final answer");
    expect(iterations).toBe(2); // step 1: tool call + result | step 2: final
  });
});

// ── Suspension: requiresApproval ──────────────────────────────────────────────

describe("step() suspension — requiresApproval", () => {
  it("suspends when a tool has requiresApproval: true", async () => {
    const deployTool = buildTool({
      name: "deploy",
      description: "Deploy to production",
      inputSchema: { type: "object", properties: { version: { type: "string" } } },
      async call({ version }) {
        return `Deployed ${version}`;
      },
      requiresApproval: true,
    } as Parameters<typeof buildTool>[0] & { requiresApproval: boolean });

    const runner = makeRunner(mockModel([toolCallResponse("deploy", { version: "v1.2.3" })]), [
      deployTool,
    ]);
    const thread = createThread("deploy v1.2.3");
    const result = await runner.step(thread);

    expect(result.done).toBe(false);
    expect(result.suspended?.type).toBe("awaiting_approval");
    if (result.suspended?.type === "awaiting_approval") {
      expect(result.suspended.pendingToolCall.name).toBe("deploy");
      expect(result.suspended.args).toEqual({ version: "v1.2.3" });
    }
  });

  it("suspends when a tool has requiresApproval as a function returning true", async () => {
    const deleteTool = buildTool({
      name: "delete_file",
      description: "Delete a file",
      inputSchema: { type: "object", properties: { path: { type: "string" } } },
      async call({ path }) {
        return `Deleted ${path}`;
      },
      requiresApproval: (args: Record<string, unknown>) =>
        (args.path as string)?.startsWith("/prod"),
    } as Parameters<typeof buildTool>[0] & {
      requiresApproval: (args: Record<string, unknown>) => boolean;
    });

    const runner = makeRunner(
      mockModel([toolCallResponse("delete_file", { path: "/prod/data.json" })]),
      [deleteTool],
    );
    const thread = createThread("delete prod file");
    const result = await runner.step(thread);
    expect(result.suspended?.type).toBe("awaiting_approval");
  });

  it("does NOT suspend when requiresApproval function returns false", async () => {
    const deleteTool = buildTool({
      name: "delete_file",
      description: "Delete a file",
      inputSchema: { type: "object", properties: { path: { type: "string" } } },
      async call({ path }) {
        return `Deleted ${path}`;
      },
      requiresApproval: (args: Record<string, unknown>) =>
        (args.path as string)?.startsWith("/prod"),
    } as Parameters<typeof buildTool>[0] & {
      requiresApproval: (args: Record<string, unknown>) => boolean;
    });

    const runner = makeRunner(
      mockModel([
        toolCallResponse("delete_file", { path: "/tmp/data.json" }),
        textResponse("done"),
      ]),
      [deleteTool],
    );
    const thread = createThread("delete tmp file");
    const result = await runner.step(thread);
    expect(result.suspended).toBeUndefined();
    expect(result.done).toBe(false); // tool executed, not yet final
  });
});

// ── Suspension: request_human_input ──────────────────────────────────────────

describe("step() suspension — request_human_input", () => {
  it("suspends on request_human_input tool call", async () => {
    const runner = makeRunner(
      mockModel([
        toolCallResponse("request_human_input", {
          question: "Which environment to deploy to?",
          urgency: "high",
        }),
      ]),
      [],
    );
    const thread = createThread("deploy");
    const result = await runner.step(thread);

    expect(result.suspended?.type).toBe("awaiting_human_input");
    if (result.suspended?.type === "awaiting_human_input") {
      expect(result.suspended.question).toBe("Which environment to deploy to?");
      expect(result.suspended.urgency).toBe("high");
    }
  });

  it("suspends on ask_human tool call", async () => {
    const runner = makeRunner(
      mockModel([toolCallResponse("ask_human", { question: "Confirm?" })]),
      [],
    );
    const thread = createThread("do something");
    const result = await runner.step(thread);
    expect(result.suspended?.type).toBe("awaiting_human_input");
  });
});

// ── resume() ──────────────────────────────────────────────────────────────────

describe("AgentRunner.resume()", () => {
  it("throws when thread is not suspended", async () => {
    const runner = makeRunner(mockModel([]));
    const thread: AgentThread = { ...createThread("hi"), suspended: undefined };
    await expect(runner.resume(thread, { type: "approved" })).rejects.toThrow(
      "Cannot resume a thread that is not suspended",
    );
  });

  it("resumes with approved — executes the tool and continues", async () => {
    const deployTool = buildTool({
      name: "deploy",
      description: "Deploy",
      inputSchema: { type: "object", properties: { version: { type: "string" } } },
      async call({ version }) {
        return `Deployed ${version}`;
      },
      requiresApproval: true,
    } as Parameters<typeof buildTool>[0] & { requiresApproval: boolean });

    // Step 1: triggers suspension
    const runner = makeRunner(
      mockModel([
        toolCallResponse("deploy", { version: "v1.0.0" }), // → suspended
        textResponse("Deployment complete!"), // → after resume
      ]),
      [deployTool],
    );

    let thread = createThread("deploy v1.0.0");
    const suspendResult = await runner.step(thread);
    expect(suspendResult.suspended?.type).toBe("awaiting_approval");

    // Resume with approval
    const resumeResult = await runner.resume(suspendResult.thread, { type: "approved" });
    expect(resumeResult.done).toBe(true);
    expect(resumeResult.response).toBe("Deployment complete!");
    // Tool result message should be present
    expect(resumeResult.thread.messages.some((m) => m.role === "tool" && m.name === "deploy")).toBe(
      true,
    );
  });

  it("resumes with rejected — injects error tool result and continues", async () => {
    const deployTool = buildTool({
      name: "deploy",
      description: "Deploy",
      inputSchema: { type: "object" },
      async call() {
        return "ok";
      },
      requiresApproval: true,
    } as Parameters<typeof buildTool>[0] & { requiresApproval: boolean });

    const runner = makeRunner(
      mockModel([toolCallResponse("deploy"), textResponse("OK, I will not deploy.")]),
      [deployTool],
    );

    let thread = createThread("deploy now");
    const suspendResult = await runner.step(thread);

    const resumeResult = await runner.resume(suspendResult.thread, {
      type: "rejected",
      reason: "Not yet reviewed",
    });
    expect(resumeResult.done).toBe(true);
    // Rejected tool result should be in messages
    const toolMsg = resumeResult.thread.messages.find((m) => m.role === "tool");
    expect(toolMsg?.content).toContain("APPROVAL_REJECTED");
    expect(toolMsg?.content).toContain("Not yet reviewed");
  });

  it("resumes with human_input — injects user message and continues", async () => {
    const runner = makeRunner(
      mockModel([
        toolCallResponse("request_human_input", { question: "Staging or prod?" }),
        textResponse("Deploying to staging as requested."),
      ]),
      [],
    );

    let thread = createThread("deploy somewhere");
    const suspendResult = await runner.step(thread);
    expect(suspendResult.suspended?.type).toBe("awaiting_human_input");

    const resumeResult = await runner.resume(suspendResult.thread, {
      type: "human_input",
      response: "staging please",
    });
    expect(resumeResult.done).toBe(true);
    expect(resumeResult.response).toBe("Deploying to staging as requested.");
    // Human response should appear as user message
    expect(
      resumeResult.thread.messages.some((m) => m.role === "user" && m.content === "staging please"),
    ).toBe(true);
  });

  it("throws on wrong resolution type for awaiting_approval", async () => {
    const thread: AgentThread = {
      ...createThread("test"),
      suspended: {
        type: "awaiting_approval",
        pendingToolCall: { id: "tc_1", name: "deploy", arguments: "{}" },
        args: {},
        message: "Needs approval",
      },
    };
    const runner = makeRunner(mockModel([]));
    await expect(runner.resume(thread, { type: "human_input", response: "oops" })).rejects.toThrow(
      "Invalid resolution type",
    );
  });

  it("throws on wrong resolution type for awaiting_human_input", async () => {
    const thread: AgentThread = {
      ...createThread("test"),
      suspended: {
        type: "awaiting_human_input",
        question: "What to do?",
      },
    };
    const runner = makeRunner(mockModel([]));
    await expect(runner.resume(thread, { type: "approved" })).rejects.toThrow(
      'Expected resolution type "human_input"',
    );
  });
});

// ── runToCompletion() ─────────────────────────────────────────────────────────

describe("AgentRunner.runToCompletion()", () => {
  it("returns final response for a non-suspending thread", async () => {
    const searchTool = buildTool({
      name: "search",
      description: "Search",
      inputSchema: { type: "object", properties: { q: { type: "string" } } },
      async call({ q }) {
        return `Results: ${q}`;
      },
    });

    const runner = makeRunner(
      mockModel([toolCallResponse("search", { q: "hello" }), textResponse("Summary done")]),
      [searchTool],
    );

    const { thread, response } = await runner.runToCompletion(createThread("search hello"));
    expect(response).toBe("Summary done");
    expect(thread.done).toBe(true);
  });

  it("throws if agent suspends mid-run", async () => {
    const deployTool = buildTool({
      name: "deploy",
      description: "Deploy",
      inputSchema: { type: "object" },
      async call() {
        return "ok";
      },
      requiresApproval: true,
    } as Parameters<typeof buildTool>[0] & { requiresApproval: boolean });

    const runner = makeRunner(mockModel([toolCallResponse("deploy")]), [deployTool]);

    await expect(runner.runToCompletion(createThread("go"))).rejects.toThrow("Agent suspended");
  });
});

// ── Thread immutability ───────────────────────────────────────────────────────

describe("Thread immutability", () => {
  it("step() does not mutate the input thread", async () => {
    const runner = makeRunner(mockModel([textResponse("hi")]));
    const thread = createThread("hello");
    const originalLength = thread.messages.length;
    await runner.step(thread);
    expect(thread.messages).toHaveLength(originalLength); // unchanged
  });

  it("resume() does not mutate the suspended thread", async () => {
    const runner = makeRunner(mockModel([textResponse("done")]), []);
    const thread: AgentThread = {
      ...createThread("test"),
      suspended: { type: "awaiting_human_input", question: "Y/N?" },
    };
    const msgsBefore = thread.messages.length;
    await runner.resume(thread, { type: "human_input", response: "yes" });
    expect(thread.messages).toHaveLength(msgsBefore);
    expect(thread.suspended).toBeDefined(); // original still suspended
  });
});
