---
title: Multi-Agent System
entity_type: subsystem
summary: A framework for coordinating multiple autonomous agents through orchestration, messaging, and shared task management.
primary_files:
  - src/orchestrator.ts
  - src/mailbox.ts
  - src/task-manager.ts
  - src/team-memory.ts
exports:
  - AgentOrchestrator
  - Mailbox
  - TaskManager
  - TeamMemory
stub: false
compiled_at: 2026-04-16T14:09:23.027Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/multi-agent.md
confidence: 0.95
---

## Purpose
The Multi-Agent System subsystem provides the infrastructure required to build and manage agent swarms. It solves the complexity of coordinating multiple autonomous entities by providing standardized mechanisms for task delegation, inter-agent communication (IPC), shared state management, and lifecycle orchestration. It is designed to scale from simple leader-follower pairs to complex teams with specialized roles.

## Architecture
The subsystem is built on a foundation of agent independence and isolation. Each agent in a multi-agent configuration operates with its own state and control flow to ensure system resilience.

### Core Components
*   **AgentOrchestrator**: The central coordination hub that manages a "Leader" agent and a set of "Delegate" agents. It handles the spawning of workers and the high-level execution flow.
*   **Mailbox IPC**: A file-based messaging system that allows agents to communicate asynchronously without direct method calls or shared memory.
*   **TaskManager**: A persistent state machine that tracks the lifecycle of work units assigned to agents.
*   **TeamMemory**: A hierarchical memory system providing both private namespaces for individual agents and shared namespaces for the entire team.

### Design Principles
*   **Isolation**: Each agent is assigned its own `AbortController` for independent cancellation.
*   **No Shared Mutable State**: Agents interact only through defined communication channels (Mailboxes) or shared memory abstractions.
*   **Crash Isolation**: Failures in worker agents are isolated; a worker crash does not terminate the leader or other delegates.
*   **Factory-based Spawning**: Delegates are instantiated via factory functions, allowing for dynamic scaling up to defined `maxInstances` limits.

## Key APIs

### AgentOrchestrator
The primary interface for managing agent teams.

*   `run(input: string)`: Executes a high-level task by coordinating the leader and delegates.
*   `spawn(role: string, options: SpawnOptions)`: Manually instantiates a delegate agent with specific error handling and timeouts.

### Mailbox
Handles asynchronous inter-agent communication.

*   `send(to: string, message: MailboxMessage)`: Dispatches a message to another agent's mailbox.
*   `receive()`: Retrieves pending messages for the current agent.
*   `ack(id: string)`: Acknowledges and removes a message from the queue.

**Message Format:**
```typescript
type MailboxMessage = {
  id: string;
  from: string;
  to: string;
  type: string;
  data: unknown;
  timestamp: number;
  ttl?: number;       // Auto-expire in ms
  priority?: number;  // Higher = more urgent
}
```

### TaskManager
Manages the state of distributed work.

*   `create(task: TaskDefinition)`: Initializes a new task in the `pending` state.
*   `transition(id: string, state: TaskState, result?: any)`: Moves a task through its lifecycle.

**Task States:**
*   `pending` → `in_progress` → `completed` | `failed`
*   `pending` → `cancelled`

### TeamMemory
Provides scoped storage for agent knowledge.

*   `save(options: { key: string, content: string, namespace: 'team' | 'private' })`: Persists data to the specified scope.
*   `search(query: string)`: Performs a search across all accessible memory namespaces.

## Configuration
The Multi-Agent System is configured primarily through the `AgentOrchestrator` constructor and directory-based settings for persistence layers.

### Orchestrator Configuration
```typescript
const orchestrator = new AgentOrchestrator({
  leader: new Agent({ /* ... */ }),
  delegates: {
    roleName: {
      factory: () => new Agent({ /* ... */ }),
      maxInstances: number,
    },
  },
});
```

### Persistence Configuration
Components like `Mailbox`, `TaskManager`, and `TeamMemory` require directory paths for file-based persistence:
*   **Mailbox**: Requires a `dir` for message storage.
*   **TaskManager**: Requires a `dir` for task state tracking.
*   **TeamMemory**: Requires `sharedDir` and `privateDir` to separate scoped knowledge.

## Extension Points
*   **Delegate Factories**: Developers can provide custom logic within the `factory` property of a delegate configuration to dynamically configure agents based on runtime context.
*   **Tool-Based Delegation**: Agents can be equipped with tools (e.g., a `delegateTool`) that allow the LLM to programmatically trigger the `AgentOrchestrator` to assign tasks to other roles.
*   **Error Handlers**: The `spawn` method accepts an `onError` callback, allowing custom recovery logic when a delegate fails.