---
title: Agent Orchestration System
summary: The Agent Orchestration System provides the architecture and mechanisms for managing multi-agent teams, including spawning, coordination, and lifecycle management.
primary_files:
 - src/agents/orchestrator.ts
 - src/agents/mailbox.js
 - src/agents/taskManager.js
entity_type: subsystem
exports:
 - AgentOrchestrator
 - AgentRunFn
search_terms:
 - multi-agent systems
 - agent swarms
 - coordinating multiple agents
 - leader-worker pattern
 - agent lifecycle management
 - spawning agents
 - agent communication
 - task distribution for agents
 - how to run multiple agents
 - agent teams
 - hierarchical agents
 - YAAF orchestrator
stub: false
compiled_at: 2026-04-24T18:09:30.465Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/orchestrator.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Agent Orchestration System is responsible for the spawning, coordination, and lifecycle management of multiple autonomous agents within the YAAF framework [Source 1]. It enables the creation of agent teams, often referred to as "swarms," where different agents can collaborate on complex tasks. This subsystem provides the foundational components for building sophisticated multi-agent applications [Source 1].

## Architecture

The system is designed around a hierarchical Leader/Worker pattern, where a primary coordinator agent spawns and manages a team of specialized worker agents [Source 1].

```
┌─────────────────────┐
│ Leader Agent        │
│ (Coordinator)       │
└─────────┬───────────┘
          │
┌─────────┼───────────┐
│         │           │
┌──────▼──────┐ ┌──▼─────┐ ┌────▼─────┐
│ Worker #1   │ │Worker #2│ │Worker #3 │
│ (Researcher)│ │(Coder)  │ │(Reviewer)│
└─────────────┘ └────────┘ └──────────┘
```

This architecture is supported by several key design patterns [Source 1]:

1.  **[Leader/Worker Hierarchy](../concepts/leader-worker-hierarchy.md)**: A central coordinator agent is responsible for spawning worker agents to perform specific sub-tasks.
2.  **[Independent AbortControllers](../concepts/independent-abort-controllers.md)**: Each worker agent has its own `AbortSignal`. This ensures that workers can continue their tasks even if the leader agent is interrupted, promoting resilience.
3.  **[Task-based Work Distribution](../concepts/task-based-work-distribution.md)**: Worker agents claim tasks from a shared list, managed by the `TaskManager` component. This decouples the leader from direct task assignment.
4.  **Idle Loop**: After completing a task, a worker agent does not exit. Instead, it enters an idle state, waiting for new work to become available or for a shutdown signal from the orchestrator.
5.  **[Permission Delegation](../concepts/permission-delegation.md)**: Worker agents can escalate permission requests to the leader agent. This is facilitated by the `Mailbox` component, which allows for [Inter-Agent Communication](./inter-agent-communication.md).

The core components of this subsystem are the `AgentOrchestrator`, which manages the agent lifecycles, the `TaskManager` for work distribution, and the `Mailbox` for communication [Source 1].

## Integration Points

The primary integration point for developers is the `AgentRunFn`. This function, provided by the framework consumer during the orchestrator's configuration, contains the core logic of an individual agent, such as its [LLM](../concepts/llm.md) query loop. The orchestrator invokes this function [when](../apis/when.md) it runs an agent, passing in necessary resources like [Tools](./tools.md), a mailbox connection, and an [Abort Signal](../concepts/abort-signal.md) [Source 1].

The system also integrates with the framework's Tool and Plugin systems. Tools are passed to the orchestrator and made available to the agents it spawns [Source 1].

## Key APIs

### `AgentOrchestrator`

This is the main class for managing [Multi-Agent Systems](../concepts/multi-agent-systems.md). It provides methods to spawn, track, coordinate, and terminate agents in a team [Source 1]. Its responsibilities include:
*   Spawning new worker agents with specific prompts and definitions (`spawn`).
*   Waiting for all agents in a team to complete their work (`waitForAll`).
*   Terminating a specific agent by its ID (`kill`).

### `AgentRunFn`

A type definition for the function that executes an agent's main logic loop. Developers must provide a function matching this signature when configuring the `AgentOrchestrator`. The function receives a parameter object containing everything an agent needs to run, including its identity, prompt, available tools, an `AbortSignal` for cancellation, a `Mailbox` for communication, and a `sendToLeader` helper function [Source 1].

## Configuration

The `AgentOrchestrator` is configured upon instantiation via a constructor options object. Key configuration properties include [Source 1]:

*   `mailboxDir`: The directory path for persistent inter-agent communication mailboxes.
*   `defaultTeam`: The default team name to use for spawned agents.
*   `tools`: An array of `Tool` instances available to all agents managed by the orchestrator.
*   `runAgent`: The developer-provided `AgentRunFn` that implements the core agent logic.

Example configuration:
```typescript
const orchestrator = new AgentOrchestrator({
  mailboxDir: '/tmp/agent-teams',
  defaultTeam: 'my-team',
  tools: [grepTool, readTool, writeTool],
  runAgent: async ({ identity, prompt, tools, signal, sendToLeader }) => {
    // Custom LLM agent loop
    const result = await myAgentLoop(prompt, tools, signal);
    await sendToLeader(result.summary, 'Task complete');
    return { success: true };
  },
});
```

## Extension Points

The primary mechanism for extending the Agent Orchestration System is by providing a custom `AgentRunFn`. This function encapsulates the unique behavior of an agent, allowing developers to implement any kind of LLM-powered logic, from simple prompt-response loops to complex, stateful reasoning processes, while leveraging the lifecycle and coordination features provided by the orchestrator [Source 1].

## Sources

[Source 1]: src/agents/orchestrator.ts