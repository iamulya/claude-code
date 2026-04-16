---
title: Agent Independence
entity_type: concept
summary: The principle of isolating agent state, execution, and error handling to ensure system robustness.
related_subsystems:
  - Multi-Agent
  - AgentOrchestrator
stub: false
compiled_at: 2026-04-16T14:09:42.707Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/multi-agent.md
confidence: 0.9
---

## What It Is
Agent Independence is a core architectural principle in YAAF designed to ensure the reliability and scalability of multi-agent systems. It dictates that every agent within a swarm or orchestrated environment operates as a self-contained unit. This isolation prevents a single agent's failure from destabilizing the entire system and ensures that state transitions are predictable and decoupled.

The principle addresses common issues in complex LLM-powered systems, such as cascading errors, race conditions in shared memory, and the inability to terminate specific long-running tasks without restarting the entire process.

## How It Works in YAAF
YAAF enforces Agent Independence through several technical mechanisms:

### Execution Isolation
Each agent spawned by the framework is assigned its own `AbortController`. This allows the system to cancel specific agent operations independently of others. If an agent exceeds its allocated time or is no longer needed, it can be terminated without affecting the execution flow of the leader or other delegates.

### State and Memory Isolation
Agents do not share mutable state. While agents can access shared data through `TeamMemory`, they maintain their own private namespaces for internal notes and state. This prevents side effects where one agent's internal logic inadvertently modifies the operational context of another.

### Communication via Mailbox IPC
To maintain decoupling, agents do not use direct method calls to interact. Instead, they communicate via a file-based Inter-Process Communication (IPC) system called the `Mailbox`. This asynchronous messaging pattern ensures that agents remain independent of each other's internal implementations and availability.

### Crash Isolation
The `AgentOrchestrator` manages the lifecycle of delegate agents. If a worker agent encounters a critical error or crashes, the failure is isolated. The orchestrator can catch these errors via specific handlers, allowing the leader agent to continue its task or reassign the work to a different instance.

## Configuration
Developers implement independence patterns when spawning agents through the `AgentOrchestrator`. Isolation parameters such as timeouts and error handlers are defined at the point of instantiation or during a dynamic spawn.

```typescript
// Spawn with timeout and error isolation
const result = await orchestrator.spawn('researcher', {
  timeout: 30_000, // Independent timeout
  onError: (err) => {
    console.warn(`Worker failed: ${err.message}`);
    // The system remains stable; the leader continues
  },
});
```

## Sources
- Source 1: Multi-Agent (docs/multi-agent.md)