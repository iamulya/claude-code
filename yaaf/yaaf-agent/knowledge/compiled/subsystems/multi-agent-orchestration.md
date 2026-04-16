---
summary: The subsystem responsible for managing interactions, task delegation, and communication between multiple agents.
primary_files:
  - src/agents/coordinator.ts
  - src/agents/orchestrator.ts
title: Multi-Agent Orchestration
entity_type: subsystem
exports:
  - AgentOrchestrator
  - CoordinatorAgent
  - WorkerAgent
  - buildCoordinatorPrompt
  - TaskNotification
stub: false
compiled_at: 2026-04-16T14:13:09.721Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/coordinator.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/orchestrator.ts
confidence: 0.95
---

## Purpose
The Multi-Agent Orchestration subsystem provides the infrastructure for building and managing teams of LLM-powered agents. It solves the complexity of task decomposition, parallel execution, and inter-agent communication by implementing a structured leader-worker hierarchy. This allows a primary "Coordinator" agent to delegate specialized sub-tasks to "Worker" agents, synthesize their results, and manage the overall lifecycle of the agent swarm.

## Architecture
The subsystem is built around a hierarchical model where a central authority manages the lifecycle and communication of distributed workers.

### Leader/Worker Hierarchy
The architecture distinguishes between two primary roles:
*   **Coordinator (Leader):** An agent responsible for interpreting high-level user goals, breaking them into discrete tasks, delegating those tasks to appropriate workers, and synthesizing the final output.
*   **Worker:** Specialized agents that execute specific tasks (e.g., research, coding, or review). Workers operate in an "idle loop," waiting for tasks from the leader rather than exiting immediately upon completion.

### Key Components
*   **AgentOrchestrator:** The central management class responsible for spawning, tracking, and killing agent instances. It manages the `AbortController` for each agent, ensuring that workers can survive leader interrupts or be terminated independently.
*   **Mailbox:** A communication mechanism that allows workers to send messages back to the leader, including status updates and permission escalation requests.
*   **TaskManager:** Handles task-based work distribution, allowing workers to claim tasks from a shared list.
*   **CoordinatorPromptBuilder:** A specialized utility that generates system prompts for the coordinator, incorporating worker capabilities, concurrency rules, and synthesis guidance.

## Integration Points
The orchestration subsystem interacts with several other framework components:
*   **Tools:** Both coordinators and workers are equipped with `Tool` sets to interact with external environments.
*   **EventBus:** Used for system-wide notifications, such as `worker:completed` events.
*   **PluginHost:** Allows for the injection of custom logic and extensions into the orchestration lifecycle.

## Key APIs

### AgentOrchestrator
The primary interface for managing agent swarms.

```typescript
const orchestrator = new AgentOrchestrator({
  mailboxDir: '/tmp/agent-teams',
  defaultTeam: 'my-team',
  tools: [grepTool, readTool, writeTool],
  runAgent: async ({ identity, prompt, tools, signal, sendToLeader }) => {
    // LLM agent loop implementation
    const result = await myAgentLoop(prompt, tools, signal);
    await sendToLeader(result.summary, 'Task complete');
    return { success: true };
  },
});

// Spawning a worker
const researcher = await orchestrator.spawn({
  name: 'researcher',
  teamName: 'my-team',
  prompt: 'Find all TODO comments in the codebase',
  definition: { type: 'Researcher' },
  color: 'blue',
});
```

### TaskNotification
A structured payload used by workers to report results back to the coordinator.

| Field | Type | Description |
| :--- | :--- | :--- |
| `taskId` | `string` | Unique identifier for the assigned task. |
| `status` | `TaskStatus` | One of `completed`, `failed`, or `killed`. |
| `summary` | `string` | A brief description of the work performed. |
| `result` | `string` (optional) | The detailed output or data produced. |
| `usage` | `object` (optional) | Metadata including `totalTokens`, `toolUses`, and `durationMs`. |

### buildCoordinatorPrompt
Generates the system instructions required for an LLM to function as a coordinator. It distills complex prompt engineering patterns into a configurable string that defines worker capabilities and synthesis rules.

## Configuration
Orchestration is configured through the `AgentOrchestrator` constructor and the `spawn` method. Key configuration parameters include:
*   **AgentDefinition:** Defines the type and permissions of an agent (e.g., `permissionMode: 'plan'`).
*   **AgentIdentity:** Provides metadata such as the agent's name and visual representation (color) for logging.
*   **CoordinatorPromptConfig:** Defines the available workers, their descriptions, and the tools they possess for the coordinator's situational awareness.

## Extension Points
*   **AgentRunFn:** Framework consumers provide this function to the `AgentOrchestrator`. it wraps the specific LLM query loop and defines how the agent processes prompts and uses tools.
*   **Mailbox System:** The communication protocol can be extended to handle custom message types between agents.
*   **Task Distribution:** Developers can implement custom strategies for how workers claim or are assigned tasks via the `TaskManager`.