---
title: Agent Swarms
entity_type: concept
summary: An architectural pattern where multiple specialized agents collaborate to solve complex tasks through delegation and communication.
stub: false
compiled_at: 2026-04-16T14:09:43.893Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/multi-agent.md
confidence: 0.9
---

---
title: "Agent Swarms"
entity_type: "concept"
summary: "An architectural pattern where multiple specialized agents collaborate to solve complex tasks through delegation and communication."
related_subsystems: ["AgentOrchestrator", "Mailbox", "TaskManager", "TeamMemory"]

## What It Is
Agent Swarms are a multi-agent architectural pattern in YAAF used to decompose complex, multi-step objectives into smaller, specialized tasks. Rather than relying on a single monolithic agent, a swarm distributes work across a collective of agents with specific system prompts, toolsets, and responsibilities.

This pattern solves the limitations of single-agent systems, such as context window saturation and the "jack of all trades, master of none" problem. By isolating concerns, YAAF ensures that each agent remains focused on its specific domain (e.g., research, writing, or coding) while a central authority manages the high-level execution flow.

## How It Works in YAAF
YAAF implements agent swarms through a combination of orchestration, asynchronous messaging, and shared state management.

### Orchestration and Delegation
The `AgentOrchestrator` class serves as the primary entry point for swarm management. It follows a "Leader-Delegate" model:
*   **Leader**: A central agent responsible for interpreting the high-level goal and delegating sub-tasks to specialized workers.
*   **Delegates**: Specialized agents created via factories. The orchestrator manages their lifecycle, including the maximum number of concurrent instances allowed for each worker type.

### Communication (Mailbox IPC)
Agents in a swarm do not interact via direct method calls. Instead, YAAF uses a file-based Inter-Agent Communication (IPC) system called `Mailbox`. This ensures that agents remain decoupled and can operate across different processes or execution contexts. 

Messages follow a standardized `MailboxMessage` format:
*   **Metadata**: Includes `id`, `from`, `to`, `timestamp`, and optional `priority`.
*   **TTL**: An optional "Time To Live" in milliseconds for auto-expiring messages.
*   **Payload**: The `type` and `data` fields contain the actual instruction or information being shared.

### Task Management
The `TaskManager` acts as a persistent state machine for the swarm's workload. It tracks the lifecycle of tasks through specific states: `pending`, `in_progress`, `completed`, `failed`, and `cancelled`. This allows the leader to query the status of work across the entire swarm and reassign tasks if necessary.

### Team Memory
Swarm intelligence is supported by `TeamMemory`, which provides two layers of persistence:
1.  **Shared Namespace**: A common directory accessible by all agents in the swarm for global context.
2.  **Private Namespace**: Agent-specific storage for internal notes and intermediate reasoning that should not clutter the global context.

### Agent Independence and Isolation
YAAF enforces strict isolation between agents in a swarm to ensure production-grade reliability:
*   **Crash Isolation**: A failure in a delegate agent does not terminate the leader or other workers.
*   **Independent Cancellation**: Each agent is assigned its own `AbortController`, allowing the orchestrator to cancel specific sub-tasks without affecting the rest of the swarm.
*   **No Shared Mutable State**: Agents communicate strictly through messages and shared memory interfaces, preventing race conditions.

## Configuration

### Orchestrator Setup
Developers configure a swarm by defining the leader and the delegate factories within the `AgentOrchestrator`.

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
  },
});
```

### Task Lifecycle
Tasks are managed through the `TaskManager`, which persists state to a specified directory.

```typescript
import { TaskManager } from 'yaaf';

const tasks = new TaskManager({
  dir: './.tasks',
});

// Create and transition tasks
const task = await tasks.create({
  type: 'research',
  description: 'Research quantum computing advances',
  assignee: 'researcher-1',
});

await tasks.transition(task.id, 'in_progress');
```

### Shared Memory
`TeamMemory` is configured with separate directories for shared and private data.

```typescript
import { TeamMemory } from 'yaaf';

const memory = new TeamMemory({
  sharedDir: './.team-memory',
  privateDir: './.agent-memory',
  agentId: 'researcher-1',
});

await memory.save({
  key: 'project-context',
  content: 'Global context data',
  namespace: 'team',
});
```