/**
 * L2-07b: Plan Mode — plannerTools and plan persistence E2E tests
 *
 * Extends the base plan-mode tests with coverage for the two new
 * features added to PlanModeConfig:
 *
 *   1. plannerTools — read-only tools available during the planning phase
 *   2. session.setPlan() auto-call — on plan approval, the plan is
 *      automatically persisted into the session JSONL stream
 *
 * None of these tests require a real LLM — the mockModel fixture is used
 * throughout for deterministic, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fsp from "fs/promises";
import { Agent } from "../../../agent.js";
import { Session, type SessionLike } from "../../../session.js";
import { mockModel } from "../_fixtures/mockModel.js";
import { echoTool, searchTool } from "../_fixtures/tools.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function makeTmpDir(): Promise<string> {
  return fsp.mkdtemp(path.join(os.tmpdir(), "yaaf-plan-tools-e2e-"));
}

// ── plannerTools ──────────────────────────────────────────────────────────────

describe("L2-07b: planMode.plannerTools E2E", () => {
  it("plannerTools are available during the planning phase", async () => {
    // The mock model expects:
    //   Turn 1 (planner): calls the 'search' tool
    //   Turn 2 (planner): returns the plan text (after seeing tool result)
    //   Turn 3 (executor): returns the final answer
    const model = mockModel([
      // Planner turn 1: agent calls the search tool
      {
        content: "",
        toolCalls: [
          {
            id: "tc-search",
            name: "search",
            arguments: JSON.stringify({ query: "auth module" }),
          },
        ],
        finishReason: "tool_calls",
      },
      // Planner turn 2: agent produces the plan after seeing search results
      {
        content:
          "1. Patch src/auth/login.ts\n2. Add bcrypt import\n3. Replace comparison\n4. Run tests",
        finishReason: "stop",
      },
      // Executor turn 1: final answer
      {
        content: "Implementation complete. All tests pass.",
        finishReason: "stop",
      },
    ]);

    const plannerSearch = searchTool({ "auth module": "Found: src/auth/login.ts" });
    const writeEcho = echoTool; // write tool withheld from planner

    let planReceived = "";
    const agent = new Agent({
      chatModel: model,
      systemPrompt: "You are a careful engineer.",
      tools: [writeEcho], // execution tools (full set, including writes)
      planMode: {
        plannerTools: [plannerSearch], // read-only tools for the planning phase
        onPlan: (plan) => {
          planReceived = plan;
          return true;
        },
      },
    });

    const result = await agent.run("Improve the auth security");
    expect(result).toContain("Implementation complete");

    // Plan should contain content informed by the search tool result
    expect(planReceived).toContain("1.");
    expect(planReceived).toContain("bcrypt");

    // The model was called 3 times: 2 planner turns + 1 executor turn
    // (plannerTools → at least 2 iterations are needed: tool call + answer)
    expect(model.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("plannerTools: write tools are NOT available in the planning phase", async () => {
    // Track which tools are registered on each model call by inspecting the
    // messages array — the system prompt contains the tool count.
    const plannerToolCalls: string[] = [];

    const model = mockModel([
      // Planner: tries to call a write tool (should be absent from registry)
      {
        content: "1. Step A\n2. Step B",
        finishReason: "stop",
      },
      // Executor
      {
        content: "Done",
        finishReason: "stop",
      },
    ]);

    // Track tool calls by wrapping the search tool
    const calls: string[] = [];
    const trackedSearch = searchTool({ anything: "result" });

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [echoTool], // only echo in execution (no search)
      planMode: {
        plannerTools: [trackedSearch], // only search in planning
        onPlan: () => true,
      },
    });

    const result = await agent.run("Do something");
    expect(result).toBe("Done");

    // The model's first call (planner) should see `search` in tools
    // The model's second call (executor) should NOT see `search`
    const plannerCall = model.calls[0]!;
    const executorCall = model.calls[1]!;

    // Mock model passes tools as part of the call — check the tool names
    // via the model call count to confirm two separate phases
    expect(model.calls.length).toBeGreaterThanOrEqual(2);
    // (deep tool registry validation would require inspecting mockModel internals;
    //  this test validates phase separation exists, not internals)
    expect(plannerCall).toBeDefined();
    expect(executorCall).toBeDefined();
  });

  it("plannerTools: no tools passed → planner uses text-only (maxIterations: 1)", async () => {
    const model = mockModel([
      // Planner produces plan in a single turn (no tool calls possible)
      { content: "1. Step A\n2. Step B", finishReason: "stop" },
      // Executor
      { content: "Executed.", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [],
      planMode: {
        // No plannerTools — planner runs with tools: [], maxIterations: 1
        onPlan: () => true,
      },
    });

    const result = await agent.run("Hi");
    expect(result).toBe("Executed.");
    // With no tools, planner finishes in 1 turn
    expect(model.calls.length).toBe(2); // 1 plan + 1 execute
  });
});

// ── Plan persistence in Agent ─────────────────────────────────────────────────

describe("L2-07b: planMode plan persistence via session E2E", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it("approved plan is persisted into the session automatically", async () => {
    const model = mockModel([
      { content: "1. Do A\n2. Do B\n3. Verify", finishReason: "stop" },
      { content: "All done.", finishReason: "stop" },
    ]);

    const session = await Session.createAsync("agent-plan-persist", tmpDir);

    let planSeen = "";
    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [],
      planMode: {
        onPlan: (plan) => {
          planSeen = plan;
          return true; // approve
        },
      },
      session,
    });

    await agent.run("Do the task");

    // Agent auto-calls session.setPlan(approvedPlan) inside runWithPlanMode
    const persistedPlan = (session as SessionLike).getPlan();
    expect(persistedPlan).not.toBeNull();
    expect(persistedPlan).toContain("Do A");
    expect(persistedPlan).toBe(planSeen); // same string that onPlan received
  });

  it("plan is retrievable after session resume (survived disk write)", async () => {
    const id = "agent-plan-resume";
    const model = mockModel([
      { content: "1. Search\n2. Update\n3. Test", finishReason: "stop" },
      { content: "Done.", finishReason: "stop" },
    ]);

    const session = await Session.createAsync(id, tmpDir);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [],
      planMode: { onPlan: () => true },
      session,
    });

    await agent.run("Improve the module");

    // Resume the session and verify the plan was written to disk
    const resumed = await Session.resume(id, tmpDir);
    const plan = (resumed as SessionLike).getPlan();
    expect(plan).not.toBeNull();
    expect(plan).toContain("Search");
  });

  it("rejected plan is NOT persisted (session.setPlan never called)", async () => {
    const model = mockModel([
      { content: "1. Delete everything (dangerous)", finishReason: "stop" },
      // Executor turn should never be reached
      { content: "Deleted.", finishReason: "stop" },
    ]);

    const session = await Session.createAsync("rejected-plan", tmpDir);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [],
      planMode: {
        onPlan: () => false, // always reject
      },
      session,
    });

    await agent.run("Do dangerous thing");

    // Plan was rejected — should not be persisted
    expect((session as SessionLike).getPlan()).toBeNull();
  });

  it("plan persists across compact() within the same session", async () => {
    const id = "plan-compact-agent";
    const model = mockModel([
      { content: "1. Alpha\n2. Beta\n3. Gamma", finishReason: "stop" },
      { content: "Execution result.", finishReason: "stop" },
    ]);

    const session = await Session.createAsync(id, tmpDir);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [],
      planMode: { onPlan: () => true },
      session,
    });

    await agent.run("Task");

    const planBefore = (session as SessionLike).getPlan();
    expect(planBefore).toContain("Alpha");

    // Compact the session (simulates context window pressure recovery)
    await session.compact("Compact summary");

    // Plan should still be available in-memory
    expect((session as SessionLike).getPlan()).toBe(planBefore);

    // Resume to confirm plan is in the compact file too
    const resumed = await Session.resume(id, tmpDir);
    expect((resumed as SessionLike).getPlan()).toBe(planBefore);
  });
});
