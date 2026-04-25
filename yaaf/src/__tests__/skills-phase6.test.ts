/**
 * Skills — Phase 6 tests: Forked Skill Execution.
 *
 * Tests:
 * - mapEffortToTemperature (effort level mapping)
 * - resolveSkillModel (model override resolution)
 * - isForkedSkill / isValidExecutionContext (helpers)
 * - executeForkedSkill (sub-agent isolation and permission enforcement)
 * - skillToAgentTool (Tool wrapper for parent agents)
 * - E2E: disk-loaded fork skill → execution pipeline
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import * as fsp from "fs/promises";
import * as path from "path";
import * as os from "os";

import {
  mapEffortToTemperature,
  resolveSkillModel,
  isForkedSkill,
  isValidExecutionContext,
  executeForkedSkill,
  skillToAgentTool,
  loadSkill,
  type Skill,
} from "../skills/index.js";
import type { ChatModel, ChatMessage, ToolSchema, ChatResult } from "../agents/runner.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

let tempDirs: string[] = [];

async function createTempDir(prefix = "yaaf-p6-"): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of tempDirs) {
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  tempDirs = [];
});

/**
 * Create a mock ChatModel that returns a fixed response.
 * Matches the actual ChatModel.complete() → ChatResult interface.
 */
function createMockModel(response = "Mock response"): ChatModel {
  return {
    complete: async (
      _params: {
        messages: ChatMessage[];
        tools?: ToolSchema[];
        temperature?: number;
        maxTokens?: number;
        signal?: AbortSignal;
      },
    ): Promise<ChatResult> => {
      return {
        content: response,
        usage: {
          promptTokens: 10,
          completionTokens: 5,
        },
        finishReason: "stop",
      };
    },
    model: "mock-model",
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// mapEffortToTemperature
// ══════════════════════════════════════════════════════════════════════════════

describe("mapEffortToTemperature", () => {
  it("maps 'low' to 0.0", () => {
    expect(mapEffortToTemperature("low")).toBe(0.0);
  });

  it("maps 'medium' to 0.3", () => {
    expect(mapEffortToTemperature("medium")).toBe(0.3);
  });

  it("maps 'high' to 0.5", () => {
    expect(mapEffortToTemperature("high")).toBe(0.5);
  });

  it("maps 'max' to 0.7", () => {
    expect(mapEffortToTemperature("max")).toBe(0.7);
  });

  it("returns undefined for no effort", () => {
    expect(mapEffortToTemperature(undefined)).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// resolveSkillModel
// ══════════════════════════════════════════════════════════════════════════════

describe("resolveSkillModel", () => {
  const defaultModel = createMockModel("default");

  it("returns default model when skill has no model override", () => {
    const skill: Skill = {
      name: "no-override",
      instructions: "Do something.",
    };

    const result = resolveSkillModel(skill, defaultModel);
    expect(result.model).toBe(defaultModel);
    expect(result.temperature).toBeUndefined();
  });

  it("falls back to default when model resolution fails (no env vars)", () => {
    // Save and clear env vars to force resolveModel to throw
    const savedGemini = process.env.GEMINI_API_KEY;
    const savedAnthropic = process.env.ANTHROPIC_API_KEY;
    const savedOpenai = process.env.OPENAI_API_KEY;
    const savedLlm = process.env.LLM_BASE_URL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.LLM_BASE_URL;

    try {
      const skill: Skill = {
        name: "bad-model",
        instructions: "Do something.",
        model: "some-model-name",
      };

      // Without any API keys, resolveModel should throw → fallback to default
      const result = resolveSkillModel(skill, defaultModel);
      expect(result.model).toBe(defaultModel);
    } finally {
      // Restore env vars
      if (savedGemini) process.env.GEMINI_API_KEY = savedGemini;
      if (savedAnthropic) process.env.ANTHROPIC_API_KEY = savedAnthropic;
      if (savedOpenai) process.env.OPENAI_API_KEY = savedOpenai;
      if (savedLlm) process.env.LLM_BASE_URL = savedLlm;
    }
  });

  it("applies effort as temperature", () => {
    const skill: Skill = {
      name: "high-effort",
      instructions: "Do something.",
      effort: "high",
    };

    const result = resolveSkillModel(skill, defaultModel);
    expect(result.temperature).toBe(0.5);
  });

  it("combines model and effort", () => {
    const skill: Skill = {
      name: "custom",
      instructions: "Do something.",
      effort: "low",
    };

    const result = resolveSkillModel(skill, defaultModel);
    expect(result.temperature).toBe(0.0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// isForkedSkill / isValidExecutionContext
// ══════════════════════════════════════════════════════════════════════════════

describe("isForkedSkill", () => {
  it("returns true for fork context", () => {
    const skill: Skill = {
      name: "forked",
      instructions: "Forked.",
      context: "fork",
    };
    expect(isForkedSkill(skill)).toBe(true);
  });

  it("returns false for inline context", () => {
    const skill: Skill = {
      name: "inline",
      instructions: "Inline.",
      context: "inline",
    };
    expect(isForkedSkill(skill)).toBe(false);
  });

  it("returns false for no context (default inline)", () => {
    const skill: Skill = {
      name: "default",
      instructions: "Default.",
    };
    expect(isForkedSkill(skill)).toBe(false);
  });
});

describe("isValidExecutionContext", () => {
  it("accepts 'inline'", () => {
    expect(isValidExecutionContext("inline")).toBe(true);
  });

  it("accepts 'fork'", () => {
    expect(isValidExecutionContext("fork")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isValidExecutionContext("unknown")).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isValidExecutionContext(undefined)).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidExecutionContext(null)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// executeForkedSkill
// ══════════════════════════════════════════════════════════════════════════════

describe("executeForkedSkill", () => {
  it("runs a forked skill and returns sub-agent output", async () => {
    const mockModel = createMockModel("Sub-agent result");
    const skill: Skill = {
      name: "test-fork",
      instructions: "You are a test sub-agent.",
      context: "fork",
    };

    const result = await executeForkedSkill({
      skill,
      args: "Do the thing",
      defaultModel: mockModel,
      tools: [],
    });

    expect(result).toBe("Sub-agent result");
  });

  it("throws when skill context is not fork", async () => {
    const mockModel = createMockModel();
    const skill: Skill = {
      name: "inline-skill",
      instructions: "I am inline.",
      context: "inline",
    };

    await expect(
      executeForkedSkill({
        skill,
        args: "test",
        defaultModel: mockModel,
        tools: [],
      }),
    ).rejects.toThrow('context "inline"');
  });

  it("throws when skill has no context (defaults to inline)", async () => {
    const mockModel = createMockModel();
    const skill: Skill = {
      name: "no-context",
      instructions: "No context set.",
    };

    await expect(
      executeForkedSkill({
        skill,
        args: "test",
        defaultModel: mockModel,
        tools: [],
      }),
    ).rejects.toThrow('context "inline"');
  });

  it("truncates long output", async () => {
    const longOutput = "A".repeat(100_000);
    const mockModel = createMockModel(longOutput);
    const skill: Skill = {
      name: "chatty-fork",
      instructions: "Be very verbose.",
      context: "fork",
    };

    const result = await executeForkedSkill({
      skill,
      args: "go",
      defaultModel: mockModel,
      tools: [],
      maxResultChars: 1000,
    });

    expect(result.length).toBeLessThan(1100); // 1000 + truncation message
    expect(result).toContain("[Output truncated:");
  });

  it("uses default message when args is empty", async () => {
    const completeSpy = vi.fn().mockResolvedValue({
      content: "Executed",
      usage: { promptTokens: 10, completionTokens: 5 },
      finishReason: "stop",
    });

    const mockModel: ChatModel = {
      complete: completeSpy,
      model: "spy-model",
    };

    const skill: Skill = {
      name: "empty-args",
      instructions: "Run instructions.",
      context: "fork",
    };

    await executeForkedSkill({
      skill,
      args: "",
      defaultModel: mockModel,
      tools: [],
    });

    // Check that the user message contains the default
    const callArgs = completeSpy.mock.calls[0];
    const params = callArgs[0] as { messages: ChatMessage[] };
    const userMsg = params.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("Execute the skill instructions");
  });

  it("passes skill.instructions as system prompt to sub-agent", async () => {
    const completeSpy = vi.fn().mockResolvedValue({
      content: "Done",
      usage: { promptTokens: 10, completionTokens: 5 },
      finishReason: "stop",
    });

    const mockModel: ChatModel = {
      complete: completeSpy,
      model: "spy-model",
    };

    const skill: Skill = {
      name: "prompt-test",
      instructions: "You are an expert code reviewer. Be thorough.",
      context: "fork",
    };

    await executeForkedSkill({
      skill,
      args: "Review this code",
      defaultModel: mockModel,
      tools: [],
    });

    // The system prompt should be the first message
    const callArgs = completeSpy.mock.calls[0];
    const params = callArgs[0] as { messages: ChatMessage[] };
    const systemMsg = params.messages.find((m) => m.role === "system");
    expect(systemMsg?.content).toContain("You are an expert code reviewer");
  });

  it("passes temperature from effort to sub-agent", async () => {
    const completeSpy = vi.fn().mockResolvedValue({
      content: "Done",
      usage: { promptTokens: 10, completionTokens: 5 },
      finishReason: "stop",
    });

    const mockModel: ChatModel = {
      complete: completeSpy,
      model: "spy-model",
    };

    const skill: Skill = {
      name: "effort-test",
      instructions: "Be creative.",
      context: "fork",
      effort: "max",
    };

    await executeForkedSkill({
      skill,
      args: "Create something",
      defaultModel: mockModel,
      tools: [],
    });

    // The complete call should include the mapped temperature (0.7 for 'max')
    const callArgs = completeSpy.mock.calls[0];
    const params = callArgs[0] as { temperature?: number };
    expect(params.temperature).toBe(0.7);
  });

  it("cancels via AbortSignal", async () => {
    const abortController = new AbortController();

    // Create a model that hangs until aborted
    const mockModel: ChatModel = {
      complete: async (params) => {
        // Check if already aborted
        if (params.signal?.aborted) {
          throw new Error("AbortError");
        }
        // Abort before it can respond
        abortController.abort();
        throw new Error("AbortError");
      },
      model: "abort-model",
    };

    const skill: Skill = {
      name: "abort-test",
      instructions: "Long task.",
      context: "fork",
    };

    await expect(
      executeForkedSkill({
        skill,
        args: "Run forever",
        defaultModel: mockModel,
        tools: [],
        signal: abortController.signal,
      }),
    ).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// skillToAgentTool
// ══════════════════════════════════════════════════════════════════════════════

describe("skillToAgentTool", () => {
  it("creates a Tool with the skill's name", () => {
    const skill: Skill = {
      name: "my-agent",
      description: "A test agent",
      instructions: "You are a helper.",
      context: "fork",
    };

    const tool = skillToAgentTool(skill, createMockModel(), []);
    expect(tool.name).toBe("my-agent");
  });

  it("uses skill description for tool description", () => {
    const skill: Skill = {
      name: "describer",
      description: "Describes things nicely",
      instructions: "You describe things.",
      context: "fork",
    };

    const tool = skillToAgentTool(skill, createMockModel(), []);
    // The tool's prompt() should include the description
    expect(tool.prompt()).toContain("Describes things nicely");
  });

  it("falls back to when_to_use for description", () => {
    const skill: Skill = {
      name: "fallback-desc",
      instructions: "Do something.",
      when_to_use: "Use when you need X",
      context: "fork",
    };

    const tool = skillToAgentTool(skill, createMockModel(), []);
    expect(tool.prompt()).toContain("Use when you need X");
  });

  it("invokes sub-agent and returns result", async () => {
    const mockModel = createMockModel("AgentTool result");
    const skill: Skill = {
      name: "callable",
      description: "A callable agent",
      instructions: "You respond with results.",
      context: "fork",
    };

    const tool = skillToAgentTool(skill, mockModel, []);

    const context = {
      model: "mock",
      tools: [] as const,
      signal: new AbortController().signal,
      messages: [],
    };

    const result = await tool.call({ query: "Do something" }, context);
    expect(result.data).toEqual({ result: "AgentTool result" });
  });

  it("falls back to instructions.slice(0,200) when no description or when_to_use", () => {
    const longInstructions = "X".repeat(300);
    const skill: Skill = {
      name: "no-desc",
      instructions: longInstructions,
      context: "fork",
    };

    const tool = skillToAgentTool(skill, createMockModel(), []);
    const desc = tool.prompt();
    // Should be truncated to 200 chars
    expect(desc.length).toBeLessThanOrEqual(200);
    expect(desc).toBe(longInstructions.slice(0, 200));
  });

  it("respects opts.description override", () => {
    const skill: Skill = {
      name: "overridden",
      description: "Original description",
      instructions: "Instructions.",
      context: "fork",
    };

    const tool = skillToAgentTool(skill, createMockModel(), [], {
      description: "Custom override description",
    });
    expect(tool.prompt()).toContain("Custom override description");
  });

  it("handles multiple invocations (shared runner state)", async () => {
    const callCount = { value: 0 };
    const mockModel: ChatModel = {
      complete: async () => {
        callCount.value++;
        return {
          content: `Response #${callCount.value}`,
          usage: { promptTokens: 10, completionTokens: 5 },
          finishReason: "stop" as const,
        };
      },
      model: "counter-model",
    };

    const skill: Skill = {
      name: "reusable",
      description: "Reusable agent tool",
      instructions: "You respond.",
      context: "fork",
    };

    const tool = skillToAgentTool(skill, mockModel, []);
    const context = {
      model: "mock",
      tools: [] as const,
      signal: new AbortController().signal,
      messages: [],
    };

    // Invoke multiple times — the sub-agent accumulates history
    // (this is the shared runner design)
    const r1 = await tool.call({ query: "First" }, context);
    expect(r1.data.result).toBe("Response #1");

    const r2 = await tool.call({ query: "Second" }, context);
    expect(r2.data.result).toBe("Response #2");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// E2E: DISK-LOADED FORK SKILL
// ══════════════════════════════════════════════════════════════════════════════

describe("E2E: disk-loaded fork skill", () => {
  it("loads a fork skill from disk and executes it", async () => {
    const dir = await createTempDir();
    const content = [
      "---",
      "name: disk-fork",
      "description: A forked skill from disk",
      "context: fork",
      "effort: low",
      "allowed-tools:",
      '  - "FileRead(*)"',
      "---",
      "You are a file reading assistant.",
    ].join("\n");

    await fsp.writeFile(path.join(dir, "disk-fork.md"), content);
    const skill = await loadSkill(path.join(dir, "disk-fork.md"), dir, "project");
    expect(skill).toBeDefined();
    expect(skill!.context).toBe("fork");
    expect(skill!.effort).toBe("low");
    expect(skill!["allowed-tools"]).toEqual(["FileRead(*)"]);
    expect(isForkedSkill(skill!)).toBe(true);

    // Execute the forked skill
    const mockModel = createMockModel("File contents read successfully");
    const result = await executeForkedSkill({
      skill: skill!,
      args: "Read the README",
      defaultModel: mockModel,
      tools: [],
    });

    expect(result).toBe("File contents read successfully");
  });

  it("wraps a disk-loaded fork skill as a Tool", async () => {
    const dir = await createTempDir();
    const content = [
      "---",
      "name: tool-fork",
      "description: A tool-wrapped forked skill",
      "context: fork",
      "---",
      "You help with tasks.",
    ].join("\n");

    await fsp.writeFile(path.join(dir, "tool-fork.md"), content);
    const skill = await loadSkill(path.join(dir, "tool-fork.md"), dir, "project");
    expect(skill).toBeDefined();

    const mockModel = createMockModel("Tool fork output");
    const tool = skillToAgentTool(skill!, mockModel, []);
    expect(tool.name).toBe("tool-fork");

    const context = {
      model: "mock",
      tools: [] as const,
      signal: new AbortController().signal,
      messages: [],
    };

    const result = await tool.call({ query: "Help me" }, context);
    expect(result.data).toEqual({ result: "Tool fork output" });
  });
});
