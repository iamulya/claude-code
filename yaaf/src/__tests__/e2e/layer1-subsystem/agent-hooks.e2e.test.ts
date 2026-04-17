/**
 * L1-04: Agent + Hooks E2E
 *
 * Tests real wiring between Agent, AgentRunner, and the Hooks system.
 */

import { describe, it, expect } from "vitest";
import { Agent } from "../../../agent.js";
import { AgentRunner } from "../../../agents/runner.js";
import type { Hooks, LLMHookResult, HookResult } from "../../../hooks.js";
import { mockModel, toolCallingModel, textModel } from "../_fixtures/mockModel.js";
import { echoTool } from "../_fixtures/tools.js";

describe("L1-04: Agent + Hooks E2E", () => {
  it("beforeLLM hook mutates messages before LLM call", async () => {
    const model = textModel("I see the injected context.");

    const hooks: Hooks = {
      beforeLLM: (messages) => {
        // Inject a user message
        return [
          ...messages,
          { role: "user" as const, content: "[INJECTED] Extra context for you." },
        ];
      },
    };

    const runner = new AgentRunner({
      model,
      tools: [],
      systemPrompt: "Test",
      hooks,
    });

    const result = await runner.run("Hello");
    expect(result).toBe("I see the injected context.");

    // Model should have received the injected message
    const msgs = model.calls[0]!.messages;
    expect(msgs.some((m) => m.role === "user" && m.content?.includes("[INJECTED]"))).toBe(true);
  });

  it("afterLLM hook with action: override replaces response", async () => {
    const model = textModel("Original response from model.");

    const hooks: Hooks = {
      afterLLM: () => ({
        action: "override" as const,
        content: "Overridden by hook!",
      }),
    };

    const runner = new AgentRunner({
      model,
      tools: [],
      systemPrompt: "Test",
      hooks,
    });

    const result = await runner.run("Hello");
    // Agent.run() should return the overridden content
    expect(result).toBe("Overridden by hook!");
  });

  it("afterLLM hook with action: stop halts execution", async () => {
    const model = textModel("This should not be seen.");

    const hooks: Hooks = {
      afterLLM: () => ({
        action: "stop" as const,
        reason: "Stopped by security hook",
      }),
    };

    const runner = new AgentRunner({
      model,
      tools: [],
      systemPrompt: "Test",
      hooks,
    });

    const result = await runner.run("Hello");
    expect(result).toContain("Stopped by security hook");
  });

  it("beforeToolCall hook blocks tool execution", async () => {
    const model = toolCallingModel("echo", { text: "blocked" }, "Tool was blocked.");

    const hooks: Hooks = {
      beforeToolCall: (ctx) => {
        if (ctx.toolName === "echo") {
          return { action: "block" as const, reason: "Blocked by policy" };
        }
        return { action: "continue" as const };
      },
    };

    const runner = new AgentRunner({
      model,
      tools: [echoTool],
      systemPrompt: "Test",
      hooks,
    });

    const result = await runner.run("Echo something");
    expect(result).toBe("Tool was blocked.");

    // Tool result message should contain the block reason
    const toolMsg = model.calls[1]!.messages.find((m) => m.role === "tool");
    expect(toolMsg!.content).toContain("Blocked");
  });

  it("beforeToolCall hook modifies arguments", async () => {
    const model = toolCallingModel("echo", { text: "original" }, "Done.");

    const hooks: Hooks = {
      beforeToolCall: (ctx) => {
        return {
          action: "modify" as const,
          arguments: { text: "modified by hook" },
        };
      },
    };

    const runner = new AgentRunner({
      model,
      tools: [echoTool],
      systemPrompt: "Test",
      hooks,
    });

    const result = await runner.run("Echo");
    expect(result).toBe("Done.");

    // Tool result should contain modified text
    const toolMsg = model.calls[1]!.messages.find((m) => m.role === "tool");
    expect(toolMsg!.content).toContain("modified by hook");
  });

  it("afterToolCall hook observes tool result", async () => {
    const model = toolCallingModel("echo", { text: "test" }, "Done.");
    const observed: { toolName: string; result: unknown }[] = [];

    const hooks: Hooks = {
      afterToolCall: (ctx, result) => {
        observed.push({ toolName: ctx.toolName, result });
        return { action: "continue" as const };
      },
    };

    const runner = new AgentRunner({
      model,
      tools: [echoTool],
      systemPrompt: "Test",
      hooks,
    });

    await runner.run("Echo test");
    expect(observed.length).toBe(1);
    expect(observed[0]!.toolName).toBe("echo");
  });

  it("Hooks fire in correct order: beforeLLM → model → afterLLM", async () => {
    const order: string[] = [];
    const model = textModel("Response");

    // Wrap model to track call order
    const wrappedModel = {
      ...model,
      async complete(params: Parameters<typeof model.complete>[0]) {
        order.push("model");
        return model.complete(params);
      },
    };

    const hooks: Hooks = {
      beforeLLM: (messages) => {
        order.push("beforeLLM");
        return undefined;
      },
      afterLLM: () => {
        order.push("afterLLM");
        return { action: "continue" as const };
      },
    };

    const runner = new AgentRunner({
      model: wrappedModel,
      tools: [],
      systemPrompt: "Test",
      hooks,
    });

    await runner.run("Hello");
    expect(order).toEqual(["beforeLLM", "model", "afterLLM"]);
  });
});
