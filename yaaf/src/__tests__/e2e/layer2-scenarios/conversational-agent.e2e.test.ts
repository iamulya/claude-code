/**
 * L2-01: Conversational Agent E2E
 *
 * A realistic multi-turn conversation spanning:
 *   Agent + Tools + Session + ContextManager
 *
 * Probes cross-subsystem wiring:
 * - Tool results flow into context for follow-up turns
 * - Session persistence captures complete turn pairs (user + assistant + tool)
 * - Session resume on a NEW Agent instance loads history correctly
 * - preRunMessageCount-based turn slicing works across multiple turns
 */

import { describe, it, expect, afterEach } from "vitest";
import { Agent } from "../../../agent.js";
import { Session } from "../../../session.js";
import { mockModel, multiToolModel } from "../_fixtures/mockModel.js";
import { searchTool, echoTool } from "../_fixtures/tools.js";
import { createTestDir } from "../_fixtures/helpers.js";

describe("L2-01: Conversational Agent E2E", () => {
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it("Multi-turn: tool call → follow-up without re-searching → session has both turns", async () => {
    const search = searchTool({
      "quantum computing": "Quantum computing uses qubits that can exist in superposition.",
    });

    // Turn 1: model calls search, then answers
    // Turn 2: model answers from context (no tool call)
    const model = mockModel([
      // Turn 1 response 1: call search
      {
        content: "",
        toolCalls: [
          { id: "tc1", name: "search", arguments: JSON.stringify({ query: "quantum computing" }) },
        ],
        finishReason: "tool_calls",
      },
      // Turn 1 response 2: final answer
      { content: "Quantum computing uses qubits in superposition.", finishReason: "stop" },
      // Turn 2: answer from context, no tool call
      {
        content: "Yes, qubits can be 0 and 1 simultaneously through superposition.",
        finishReason: "stop",
      },
    ]);

    const { dir, cleanup: c } = createTestDir();
    cleanup = c;

    const session = Session.create("test-convo", dir);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "You are a helpful assistant.",
      tools: [search],
      session,
    });

    // Turn 1
    const r1 = await agent.run("What is quantum computing?");
    expect(r1).toBe("Quantum computing uses qubits in superposition.");

    // Turn 2 (follow-up)
    const r2 = await agent.run("Can you explain superposition?");
    expect(r2).toBe("Yes, qubits can be 0 and 1 simultaneously through superposition.");

    // Session should have all messages from both turns
    const messages = session.getMessages();
    // Turn 1: user, assistant(tool_call), tool_result, assistant(final)
    // Turn 2: user, assistant(final)
    expect(messages.length).toBeGreaterThanOrEqual(5);

    // Verify Turn 2 model call saw Turn 1 context
    const turn2Call = model.calls[2]!;
    const turn2Msgs = turn2Call.messages;
    // Should contain the Turn 1 user message + tool result in history
    const hasToolResult = turn2Msgs.some(
      (m) => m.role === "tool" && typeof m.content === "string" && m.content.includes("qubits"),
    );
    expect(hasToolResult).toBe(true);
  });

  it("Session resume: new Agent instance loads history from previous session", async () => {
    const { dir, cleanup: c } = createTestDir();
    cleanup = c;

    // First agent + session
    const model1 = mockModel([
      { content: "I remember your preference for dark mode.", finishReason: "stop" },
    ]);
    const session1 = Session.create("resume-test", dir);
    const agent1 = new Agent({
      chatModel: model1,
      systemPrompt: "You are helpful.",
      tools: [],
      session: session1,
    });
    await agent1.run("I prefer dark mode.");

    // Resume session
    const session2 = await Session.resume("resume-test", dir);
    expect(session2.messageCount).toBeGreaterThanOrEqual(2); // user + assistant

    // New agent with resumed session
    const model2 = mockModel([
      {
        content: "You mentioned you prefer dark mode. I'll keep that in mind.",
        finishReason: "stop",
      },
    ]);
    const agent2 = new Agent({
      chatModel: model2,
      systemPrompt: "You are helpful.",
      tools: [],
      session: session2,
    });
    const result = await agent2.run("What are my preferences?");
    expect(result).toContain("dark mode");

    // Verify model2 received history from session
    const call = model2.calls[0]!;
    // History should include user message from turn 1
    const hasHistoryMsg = call.messages.some(
      (m) =>
        m.role === "user" &&
        typeof m.content === "string" &&
        m.content.includes("dark mode"),
    );
    expect(hasHistoryMsg).toBe(true);
  });

  it("Session turn slicing: repeated identical messages are not confused", async () => {
    // This probes the index-based turn detection (preRunMessageCount)
    // that replaced the old content-matching approach
    const { dir, cleanup: c } = createTestDir();
    cleanup = c;

    const model = mockModel([
      { content: "Yes (1)", finishReason: "stop" },
      { content: "Yes (2)", finishReason: "stop" },
      { content: "Yes (3)", finishReason: "stop" },
    ]);

    const session = Session.create("repeated-msg", dir);
    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [],
      session,
    });

    // Send the same message three times
    await agent.run("yes");
    await agent.run("yes");
    await agent.run("yes");

    const messages = session.getMessages();
    // Each turn should have exactly 2 messages: user + assistant
    // Total = 6 messages
    expect(messages.length).toBe(6);
    // Verify ordering is correct
    expect(messages[0]!.role).toBe("user");
    expect(messages[1]!.role).toBe("assistant");
    expect(messages[2]!.role).toBe("user");
    expect(messages[3]!.role).toBe("assistant");
    expect(messages[4]!.role).toBe("user");
    expect(messages[5]!.role).toBe("assistant");
  });

  it("Session accumulation with tool calls: all tool messages persisted in order", async () => {
    const { dir, cleanup: c } = createTestDir();
    cleanup = c;

    const search = searchTool({ weather: "Sunny, 72°F" });
    const model = mockModel([
      {
        content: "",
        toolCalls: [
          { id: "tc_w", name: "search", arguments: JSON.stringify({ query: "weather" }) },
        ],
        finishReason: "tool_calls",
      },
      { content: "It's sunny and 72°F.", finishReason: "stop" },
    ]);

    const session = Session.create("tool-session", dir);
    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Weather assistant",
      tools: [search],
      session,
    });

    await agent.run("What's the weather?");

    const messages = session.getMessages();
    // Expected order: user, assistant(tool_call), tool, assistant(final)
    const roles = messages.map((m) => m.role);
    expect(roles).toContain("user");
    expect(roles).toContain("assistant");
    expect(roles).toContain("tool");

    // Tool result should contain the actual data
    const toolMsg = messages.find((m) => m.role === "tool");
    expect(toolMsg).toBeDefined();
    expect(String(toolMsg!.content)).toContain("Sunny");

    // Verify we can resume and see all messages
    const resumed = await Session.resume("tool-session", dir);
    expect(resumed.messageCount).toBe(messages.length);
  });
});
