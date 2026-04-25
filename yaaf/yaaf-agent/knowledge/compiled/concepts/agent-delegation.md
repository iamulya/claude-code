---
title: Agent Delegation
entity_type: concept
summary: The pattern where a leader agent assigns specific tasks or roles to specialized delegate agents.
related_subsystems:
 - Multi-Agent
search_terms:
 - multi-agent systems
 - agent swarms
 - leader agent
 - worker agent
 - task assignment for agents
 - how to coordinate multiple agents
 - specialized agents
 - agent hierarchy
 - orchestrating LLM agents
 - YAAF orchestrator
 - delegating work to another agent
 - agent collaboration
 - agent teams
stub: false
compiled_at: 2026-04-24T17:51:20.782Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
compiled_from_quality: documentation
confidence: 0.98
---

## What It Is

Agent Delegation is a design pattern in YAAF for Building [Multi-Agent Systems](./multi-agent-systems.md), often called "agent swarms." In this pattern, a primary "leader" agent breaks down a complex goal into smaller, specific sub-tasks and assigns them to a team of specialized "delegate" agents [Source 1]. Each delegate agent is designed for a particular function, such as research, writing, or data analysis, and is equipped with the appropriate [Tools](../subsystems/tools.md) for its role [Source 1].

This approach allows for more sophisticated problem-solving by composing simple, single-purpose agents into a collaborative team. It enhances modularity, scalability, and robustness, as individual agents can operate and potentially fail independently without halting the entire system [Source 1].

## How It Works in YAAF

Agent Delegation is primarily managed by the `AgentOrchestrator` subsystem, which is responsible for spawning and coordinating multiple agents. The core components that enable this pattern are:

*   **AgentOrchestrator**: This is the central coordinator. It manages the lifecycle of a single `leader` agent and a pool of `delegate` agents. The orchestrator initiates the overall task, which the leader then decomposes and delegates [Source 1].
*   **Leader Agent**: A standard YAAF `Agent` configured with a [System Prompt](./system-prompt.md) for coordination and tools specifically for delegating tasks to other agents (e.g., a `delegateTool`) [Source 1].
*   **Delegate Agents**: These are specialized agents defined within the orchestrator's configuration. Each type of delegate has a `factory` function to create new instances and a `maxInstances` property to control pooling and concurrency [Source 1].
*   **Mailbox IPC**: Agents do not communicate through direct method calls. Instead, they use a file-based `Mailbox` system for asynchronous [Inter-Process Communication](./inter-process-communication.md) (IPC). This ensures loose coupling and state isolation. A researcher agent, for example, would send its findings to a writer agent via a mailbox message [Source 1].
*   **TaskManager**: A persistent, stateful system for tracking the lifecycle of tasks. [when](../apis/when.md) a leader delegates a task, it can be created in the `TaskManager`, which then tracks its state from `pending` through `in_progress` to `completed` or `failed`. This provides [Observability](./observability.md) and state management for delegated work [Source 1].
*   **Agent Independence**: Each agent spawned by the orchestrator runs in isolation. It has its own `AbortController`, its own state, and crash isolation. This ensures that a failing delegate agent does not bring down the leader or other members of the team [Source 1].

The process begins when a high-level task is passed to the `AgentOrchestrator`. The leader agent analyzes the task and uses its delegation tools to create and assign sub-tasks to appropriate delegates via the `TaskManager`. The delegates execute their tasks, communicating results and status updates through the `Mailbox` system, until the final goal is achieved [Source 1].

## Configuration

A developer configures an agent team using the `AgentOrchestrator` constructor. The configuration defines the leader agent and the available delegate agents, including their factory functions and instance limits.

The following example shows an orchestrator configured with a `Leader` agent and two types of delegates: `Researcher` and `Writer` [Source 1].

```typescript
import { AgentOrchestrator, Agent } from 'yaaf';

const orchestrator = new AgentOrchestrator({
  leader: new Agent({
    name: 'Leader',
    systemPrompt: 'Coordinate research tasks between team members.',
    tools: [delegateTool], // A tool for assigning tasks to delegates
  }),
  delegates: {
    researcher: {
      factory: () => new Agent({
        name: 'Researcher',
        systemPrompt: 'You research topics thoroughly.',
        tools: [searchTool],
      }),
      maxInstances: 3,
    },
    writer: {
      factory: () => new Agent({
        name: 'Writer',
        systemPrompt: 'You write clear, well-structured content.',
        tools: [writeTool],
      }),
      maxInstances: 1,
    },
  },
});

// The orchestrator can now run a complex task using the configured team.
const result = await orchestrator.run('Write a report on quantum computing');
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md