---
title: Leader/Worker Hierarchy
entity_type: concept
summary: An architectural pattern where a coordinator agent (leader) spawns and manages specialized worker agents to perform tasks.
stub: false
compiled_at: 2026-04-16T14:13:48.383Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/orchestrator.ts
confidence: 0.9
---

---
title: "Leader/Worker Hierarchy"
entity_type: "concept"
summary: "An architectural pattern where a coordinator agent (leader) spawns and manages specialized worker agents to perform tasks."
related_subsystems:
  - "AgentOrchestrator"
  - "TaskManager"
  - "Mailbox"

## What It Is
The Leader/Worker Hierarchy is an architectural pattern in YAAF used to coordinate multi-agent systems. In this model, a central "Leader" or "Coordinator" agent is responsible for high-level planning and the delegation of specific sub-tasks to "Worker" agents. 

This pattern solves the problem of complexity scaling in LLM-powered systems. Rather than a single agent attempting to handle every aspect of a complex workflow (such as researching, coding, and reviewing), the work is distributed among specialized workers. This allows for parallel execution, specialized prompting for different roles, and more robust error handling.

## How It Works in YAAF
The hierarchy is primarily managed by the `AgentOrchestrator` class, which handles the spawning, tracking, and lifecycle management of agent swarms.

### Key Mechanisms
*   **Agent Spawning:** The orchestrator uses a `spawn` method to initialize worker agents. Each worker is assigned an identity, a specific prompt, and a set of tools.
*   **Independent Lifecycle:** Workers utilize independent `AbortControllers`. This design ensures that workers can survive leader interrupts or continue processing even if the coordinator's immediate state changes.
*   **Task-Based Distribution:** Workers do not operate in a vacuum; they claim tasks from a shared list managed by a `TaskManager`. This allows for dynamic work allocation based on worker availability.
*   **Idle Loops:** Unlike simple scripts, YAAF workers do not necessarily exit after completing a single task. They enter an idle loop where they wait for new work assignments or a formal shutdown request from the orchestrator.
*   **Permission Delegation:** Workers can escalate requests (such as permission to execute a sensitive tool) to the leader via a `Mailbox` system. This ensures that the leader maintains oversight of the swarm's actions.

### Communication
Communication between the leader and workers is facilitated through the `Mailbox` and `AgentRunFn`. Workers can send updates or summaries back to the leader using a `sendToLeader` callback, allowing the leader to aggregate results and make informed decisions about the next steps in a project.

## Configuration
Developers implement the Leader/Worker Hierarchy by configuring an `AgentOrchestrator` and defining the `AgentRunFn` that wraps the LLM query loop.

```typescript
const orchestrator = new AgentOrchestrator({
  mailboxDir: '/tmp/agent-teams',
  defaultTeam: 'engineering-team',
  tools: [readTool, writeTool],
  runAgent: async ({ identity, prompt, tools, signal, sendToLeader }) => {
    // Implementation of the agent's LLM loop
    const result = await executeAgentLoop(prompt, tools, signal);
    
    // Report back to the leader
    await sendToLeader(result.summary, 'Task complete');
    return { success: true };
  },
});

// Spawning specialized workers
await orchestrator.spawn({
  name: 'researcher',
  teamName: 'engineering-team',
  prompt: 'Analyze the codebase for security vulnerabilities',
  definition: { type: 'Researcher' },
  color: 'blue',
});

await orchestrator.spawn({
  name: 'coder',
  teamName: 'engineering-team',
  prompt: 'Fix identified vulnerabilities in the auth module',
  definition: { type: 'Coder', permissionMode: 'plan' },
  color: 'green',
});
```

### Lifecycle Management
The orchestrator provides methods to manage the collective state of the workers:
*   `waitForAll()`: Blocks until all active workers have completed their tasks.
*   `kill(agentId)`: Forcefully terminates a specific worker agent.

## Sources
* `src/agents/orchestrator.ts`