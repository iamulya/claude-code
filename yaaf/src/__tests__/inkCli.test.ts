/**
 * Tests for the Ink-based CLI.
 *
 * Verifies module exports and component typing.
 * Full interactive tests require ink-testing-library
 * which is beyond the current scope.
 */

import { describe, it, expect } from "vitest";
import { createInkCLI, type InkCLIConfig, type InkCLITheme } from "../runtime/inkCli.js";
import type { StreamableAgent, RuntimeStreamEvent } from "../runtime/adapter.js";

describe("createInkCLI", () => {
  it("exports createInkCLI function", () => {
    expect(typeof createInkCLI).toBe("function");
  });

  it("InkCLIConfig type is well-formed", () => {
    const config: InkCLIConfig = {
      name: "test-bot",
      greeting: "Hello!",
      theme: {
        primary: "blue",
        secondary: "green",
      },
      beforeRun: async (input) => input.toUpperCase(),
      afterRun: async () => {},
    };

    expect(config.name).toBe("test-bot");
  });

  it("InkCLITheme has all expected properties", () => {
    const theme: InkCLITheme = {
      primary: "cyan",
      secondary: "magenta",
      accent: "green",
      error: "red",
      dim: "gray",
    };

    expect(Object.keys(theme)).toHaveLength(5);
  });

  it("StreamableAgent is compatible with InkCLI", () => {
    const agent: StreamableAgent = {
      run: async (input: string) => `Echo: ${input}`,
      async *runStream(input: string): AsyncIterable<RuntimeStreamEvent> {
        yield { type: "text_delta", text: "hello" };
        yield { type: "done", text: "hello" };
      },
    };

    expect(agent.run).toBeInstanceOf(Function);
    expect(agent.runStream).toBeInstanceOf(Function);
  });

  it("agent without runStream works (batch mode)", () => {
    // Batch-only agent should still be compatible
    const agent: StreamableAgent = {
      run: async (input: string) => `Echo: ${input}`,
      async *runStream(_input: string) {
        yield { type: "done" as const, text: "" };
      },
    };

    expect(agent.run).toBeInstanceOf(Function);
  });
});

describe("cli-ink barrel", () => {
  it("exports from yaaf/cli-ink entry point", async () => {
    const mod = await import("../cli-ink.js");

    expect(typeof mod.createInkCLI).toBe("function");
    expect(typeof mod.toStreamableAgent).toBe("function");
    expect(typeof mod.adaptStream).toBe("function");
  });
});
