---
title: AgentOrchestrator
entity_type: api
summary: A class for spawning, tracking, and coordinating multi-agent swarms using a leader/worker hierarchy.
export_name: AgentOrchestrator
source_file: src/agents/orchestrator.ts
category: class
stub: false
compiled_at: 2026-04-16T14:09:23.314Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/multi-agent.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/orchestrator.ts
confidence: 1
---

## Overview
The `AgentOrchestrator` is the central component for managing multi-agent systems in YAAF. It implements a **Leader/Worker hierarchy** where a coordinator agent (the leader) manages the lifecycle, task distribution, and communication of multiple worker agents (delegates).

Key architectural features include:
*   **Crash Isolation**: A failure in a worker agent does not terminate the leader or other workers.
*   **Independent Lifecycle**: Each agent operates with its own `AbortController`, allowing individual agents to be cancelled or timed out independently.
*   **Mailbox-based IPC**: Agents do not use direct method calls; instead, they communicate via an asynchronous mailbox system.
*   **Task-based Distribution**: Workers can claim tasks from a shared list managed by a `TaskManager`.
*   **Permission Delegation**: Workers can escalate permission requests to the leader via the mailbox.

## Signature / Constructor

The provided source materials indicate two different patterns for initializing the `AgentOrchestrator`.

### Pattern 1: Leader/Delegate Configuration
This pattern uses a high-level configuration where the leader and worker factories are defined upfront.

```typescript
constructor(config: {
  leader: Agent;
  delegates: Record<string, {
    factory: () => Agent;
    maxInstances: number;
  }>;
})
```

### Pattern 2: Functional Run Configuration
This pattern provides a lower-level interface where the consumer defines the agent execution loop.

```typescript
constructor(config: {
  mailboxDir: string;
  defaultTeam?: string;
  tools?: readonly Tool[];
  runAgent: AgentRunFn;
})
```

### AgentRunFn Signature
```typescript
type AgentRunFn = (params: {
  identity: AgentIdentity;
  definition: AgentDefinition;
  prompt: string;
  tools: readonly Tool[];
  signal: AbortSignal;
  mailbox: Mailbox;
  sendToLeader: (text: string, summary?: string) => Promise<void>;
}) => Promise<{ success: boolean; error?: string }>;
```

## Methods & Properties

| Method | Description |
| :--- | :--- |
| `run(prompt: string)` | Executes the orchestration logic based on a high-level prompt. |
| `spawn(options)` | Manually spawns a new worker agent. Options include `name`, `teamName`, `prompt`, `definition`, `timeout`, and `onError`. |
| `waitForAll()` | Returns a promise that resolves when all currently active spawned agents have completed their tasks. |
| `kill(agentId: string)` | Immediately terminates a specific agent by triggering its `AbortSignal`. |

## Examples

### High-Level Orchestration
This example demonstrates setting up a leader agent with specialized researcher and writer delegates.

```typescript
import { AgentOrchestrator, Agent } from 'yaaf';

const orchestrator = new AgentOrchestrator({
  leader: new Agent({
    name: 'Leader',
    systemPrompt: 'Coordinate research tasks between team members.',
    tools: [delegateTool],
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
This example shows how to use the orchestrator to manually spawn agents and handle errors or timeouts.

```typescript
const orchestrator = new AgentOrchestrator({
  mailboxDir: '/tmp/agent-teams',
  runAgent: async ({ identity, prompt, tools, signal, sendToLeader }) => {
    // Custom LLM agent loop
    const result = await myAgentLoop(prompt, tools, signal);
    await sendToLeader(result.summary, 'Task complete');
    return { success: true };
  },
});

// Spawn with error isolation
const worker = await orchestrator.spawn({
  name: 'researcher-1',
  prompt: 'Find all TODO comments',
  timeout: 30_000,
  onError: (err) => {
    console.warn(`Worker failed: ${err.message}`);
  },
});

await orchestrator.waitForAll();
```

## See Also
*   `Mailbox`: The underlying inter-agent communication system.
*   `TaskManager`: The state machine used for managing task lifecycles within the swarm.
*   `TeamMemory`: Shared and private memory management for orchestrated agents.