---
title: AgentOrchestrator
entity_type: api
summary: A class for spawning, coordinating, and managing the lifecycle of multiple agents in a swarm.
export_name: AgentOrchestrator
source_file: src/agent-orchestrator.ts
category: class
search_terms:
 - multi-agent systems
 - agent swarm
 - leader-worker pattern
 - agent coordination
 - spawn multiple agents
 - agent lifecycle management
 - how to run agents in parallel
 - delegation between agents
 - agent team
 - agent hierarchy
 - inter-agent communication
 - YAAF swarm
 - run multiple agents
 - agent supervisor
stub: false
compiled_at: 2026-04-24T16:47:27.565Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/orchestrator.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `AgentOrchestrator` class is a core component of YAAF's multi-agent subsystem, designed to spawn, track, and coordinate groups of agents, often referred to as "swarms" or "teams" [Source 2]. It facilitates complex workflows where multiple specialized agents collaborate to achieve a goal, commonly using a leader-delegate (or leader-worker) architectural pattern [Source 1, Source 2].

In this pattern, a primary "leader" agent coordinates tasks and delegates work to one or more "worker" agents. The `AgentOrchestrator` manages the lifecycle of these agents, ensuring they operate with a degree of independence. Each spawned agent receives its own `AbortController`, providing crash isolation so that a failing worker does not bring down the entire system. Communication between agents is handled through a mailbox system, avoiding direct method calls and shared mutable state [Source 1].

Key architectural features enabled by the orchestrator include [Source 2]:
*   **[Leader/Worker Hierarchy](../concepts/leader-worker-hierarchy.md)**: A coordinator agent spawns and manages worker agents.
*   **[Task-based Work Distribution](../concepts/task-based-work-distribution.md)**: Workers can claim tasks from a shared list.
*   **Idle Loop**: Workers do not exit after completing a task; they wait for new work or a shutdown signal.
*   **[Permission Delegation](../concepts/permission-delegation.md)**: Workers can escalate permission requests to the leader via the mailbox.

## Signature / Constructor

The `AgentOrchestrator` is instantiated with configuration that defines the environment for the agent team, including communication channels and the core logic for running an agent.

```typescript
// Source: src/agents/orchestrator.ts [Source 2]

import type { Tool } from "../tools/tool.js";
import { Mailbox } from "./mailbox.js";

/**
 * The run function that the orchestrator calls to execute an agent.
 * Framework consumers provide this — it wraps their LLM query loop.
 */
export type AgentRunFn = (params: {
  identity: AgentIdentity;
  definition: AgentDefinition;
  prompt: string;
  tools: readonly Tool[];
  signal: AbortSignal;
  mailbox: Mailbox;
  /** Send a message back to the leader */
  sendToLeader: (text: string, summary?: string) => Promise<void>;
}) => Promise<{ success: boolean; error?: string }>;

// Constructor usage from example
const orchestrator = new AgentOrchestrator({
  mailboxDir: '/tmp/agent-teams',
  defaultTeam: 'my-team',
  tools: [grepTool, readTool, writeTool],
  runAgent: async ({ identity, prompt, tools, signal, sendToLeader }) => {
    // Your LLM agent loop here
    const result = await myAgentLoop(prompt, tools, signal);
    await sendToLeader(result.summary, 'Task complete');
    return { success: true };
  },
});
```

Another configuration pattern involves declaratively defining a leader and a pool of delegate agents [Source 1].

```typescript
// Source: docs/multi-agent.md [Source 1]

const orchestrator = new AgentOrchestrator({
  leader: new Agent({
    name: 'Leader',
    systemPrompt: 'Coordinate research tasks between team members.',
    tools: [delegateTool],
  }),
  delegates: {
    researcher: {
      factory: () => new Agent(/* ... */),
      maxInstances: 3,
    },
    writer: {
      factory: () => new Agent(/* ... */),
      maxInstances: 1,
    },
  },
});
```

The source materials suggest two different constructor signatures or configuration patterns. One is a lower-level setup requiring a `runAgent` function, while the other is a higher-level pattern defining a `leader` and `delegates` [Source 1, Source 2].

## Methods & Properties

Based on usage in the source material, the `AgentOrchestrator` class exposes the following methods.

### run

Executes a top-level task using the configured agent team, typically starting with the leader agent.

**Signature**
```typescript
run(prompt: string): Promise<any>
```

**Parameters**
*   `prompt`: `string` - The initial prompt or task to be executed by the agent team.

**Returns**
*   `Promise<any>`: A promise that resolves with the final result from the team's execution.

### spawn

Spawns a new worker agent and adds it to the team.

**Signature**
```typescript
spawn(config: SpawnConfig): Promise<AgentHandle>
```
*Note: `SpawnConfig` and `AgentHandle` types are inferred from examples.*

**Parameters**
*   `config`: An object containing the configuration for the new agent, such as its name, prompt, and definition [Source 2]. It can also include lifecycle options like `timeout` and an `onError` handler [Source 1].

**Returns**
*   `Promise<AgentHandle>`: A promise that resolves with a handle to the newly spawned agent, which may include its `agentId` [Source 2].

### waitForAll

Waits for all currently running agents spawned by the orchestrator to complete their tasks.

**Signature**
```typescript
waitForAll(): Promise<void>
```

**Returns**
*   `Promise<void>`: A promise that resolves [when](./when.md) all agents have finished.

### kill

Terminates a specific agent by its ID.

**Signature**
```typescript
kill(agentId: string): void
```

**Parameters**
*   `agentId`: `string` - The unique identifier of the agent to terminate.

## Examples

### Leader-Delegate Pattern

This example demonstrates a high-level pattern where a leader agent coordinates a team of specialized delegates (researchers and a writer) to fulfill a request [Source 1].

```typescript
import { AgentOrchestrator, Agent } from 'yaaf';

const orchestrator = new AgentOrchestrator({
  leader: new Agent({
    name: 'Leader',
    systemPrompt: 'Coordinate research tasks between team members.',
    tools: [delegateTool], // A tool to delegate tasks to workers
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

const result = await orchestrator.run('Write a report on quantum computing');
```

### Manual Spawning and Lifecycle Management

This example shows a lower-level approach where the user provides a custom `runAgent` function and manually spawns, monitors, and terminates agents [Source 2].

```typescript
const orchestrator = new AgentOrchestrator({
  mailboxDir: '/tmp/agent-teams',
  defaultTeam: 'my-team',
  tools: [grepTool, readTool, writeTool],
  runAgent: async ({ identity, prompt, tools, signal, sendToLeader }) => {
    // Your custom LLM agent loop here
    const result = await myAgentLoop(prompt, tools, signal);
    await sendToLeader(result.summary, 'Task complete');
    return { success: true };
  },
});

// Spawn workers for specific tasks
const researcherAgent = await orchestrator.spawn({
  name: 'researcher',
  teamName: 'my-team',
  prompt: 'Find all TODO comments in the codebase',
  definition: { type: 'Researcher' },
});

const coderAgent = await orchestrator.spawn({
  name: 'coder',
  teamName: 'my-team',
  prompt: 'Implement the payment webhook handler',
  definition: { type: 'Coder' },
});

// Wait for all agents to finish their work
await orchestrator.waitForAll();

// Alternatively, terminate a specific agent
orchestrator.kill(researcherAgent.agentId);
```

## See Also

*   Mailbox: For file-based, [Inter-Agent Communication](../subsystems/inter-agent-communication.md).
*   TaskManager: A state machine for managing the lifecycle of tasks distributed among agents.
*   Team[Memory](../concepts/memory.md): A mechanism for sharing Memory and context across multiple agents in a team.

## Sources
*   [Source 1]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md`
*   [Source 2]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/orchestrator.ts`