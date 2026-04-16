---
title: Multi-Agent Orchestration
entity_type: guide
summary: A guide to building collaborative agent systems using YAAF's orchestration and communication tools.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:09:45.018Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/multi-agent.md
confidence: 0.95
---

## Overview
Multi-agent orchestration in YAAF allows developers to build complex agent swarms where multiple specialized agents collaborate to solve tasks. This guide covers the implementation of the leader-delegate pattern, inter-agent communication via mailboxes, task lifecycle management, and shared team memory.

By the end of this guide, you will be able to coordinate multiple agents with isolated states, manage their communication asynchronously, and track complex task progress across a team.

## Prerequisites
- A TypeScript environment configured for YAAF.
- Basic understanding of the `Agent` class and tool definitions.
- Access to a file system for persistent mailbox and task storage.

## Step-by-Step

### 1. Setting up the AgentOrchestrator
The `AgentOrchestrator` is the central hub for managing a team of agents. It defines a "Leader" agent and a set of "Delegates" that can be spawned as needed.

```typescript
import { AgentOrchestrator, Agent } from 'yaaf';

const orchestrator = new AgentOrchestrator({
  leader: new Agent({
    name: 'Leader',
    systemPrompt: 'Coordinate research tasks between team members.',
    tools: [delegateTool], // Tool used by the leader to trigger delegate spawning
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

// Execute a high-level goal
const result = await orchestrator.run('Write a report on quantum computing');
```

### 2. Implementing Inter-Agent Communication (IPC)
Agents in YAAF communicate via a file-based `Mailbox` system rather than direct method calls. This ensures isolation and allows for asynchronous processing.

```typescript
import { Mailbox } from 'yaaf';

const mailbox = new Mailbox({
  dir: './.agent-mail',
  agentId: 'researcher-1',
});

// Sending a message to another agent
await mailbox.send('writer-1', {
  type: 'research-complete',
  data: { topic: 'quantum computing', findings: '...' },
});

// Receiving and acknowledging messages
const messages = await mailbox.receive();
for (const msg of messages) {
  console.log(`From: ${msg.from}, Type: ${msg.type}`);
  // Process message...
  
  // Acknowledge to remove from the queue
  await mailbox.ack(msg.id);
}
```

### 3. Managing Task Lifecycles
The `TaskManager` provides a state machine to track the progress of work assigned to different agents.

```typescript
import { TaskManager } from 'yaaf';

const tasks = new TaskManager({
  dir: './.tasks',
});

// Create a new task
const task = await tasks.create({
  type: 'research',
  description: 'Research quantum computing advances in 2024',
  assignee: 'researcher-1',
  priority: 'high',
});

// Transition through states
await tasks.transition(task.id, 'in_progress');
await tasks.transition(task.id, 'completed', {
  result: 'Research findings...',
});
```

### 4. Implementing Shared Team Memory
`TeamMemory` allows agents to maintain private notes while sharing critical context with the rest of the swarm.

```typescript
import { TeamMemory } from 'yaaf';

const memory = new TeamMemory({
  sharedDir: './.team-memory',
  privateDir: './.agent-memory',
  agentId: 'researcher-1',
});

// Save to the team namespace (visible to all agents)
await memory.save({
  key: 'project-context',
  content: '# Project Overview\n...',
  namespace: 'team',
});

// Search across both private and team namespaces
const results = await memory.search('API design patterns');
const context = memory.buildContext(results);
```

## Configuration Reference

### AgentOrchestrator Options
| Option | Type | Description |
| :--- | :--- | :--- |
| `leader` | `Agent` | The primary agent responsible for coordination. |
| `delegates` | `Record<string, DelegateConfig>` | Map of delegate types to their factory functions and limits. |

### MailboxMessage Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier for the message. |
| `from` | `string` | ID of the sending agent. |
| `to` | `string` | ID of the recipient agent. |
| `type` | `string` | Developer-defined message category. |
| `data` | `unknown` | The message payload. |
| `timestamp` | `number` | Creation time in milliseconds. |
| `ttl` | `number` | (Optional) Time-to-live in milliseconds. |
| `priority` | `number` | (Optional) Higher values indicate higher urgency. |

### Task States
The `TaskManager` enforces the following state transitions:
- `pending` → `in_progress` → `completed`
- `pending` → `in_progress` → `failed`
- `pending` → `cancelled`

## Common Mistakes
1.  **Direct Method Calls**: Attempting to call methods on one agent instance from another. Agents should remain isolated; use `Mailbox` for all interactions.
2.  **Forgetting Acknowledgments**: Failing to call `mailbox.ack(msg.id)` after processing a message. This results in the message remaining in the queue and being re-processed in the next `receive()` call.
3.  **Shared Mutable State**: Attempting to share global variables between agents. Use `TeamMemory` or the `TaskManager` to persist and share state safely.
4.  **Unbounded Spawning**: Not setting `maxInstances` in the orchestrator configuration, which can lead to resource exhaustion if the leader spawns too many delegates.

## Next Steps
- Explore advanced error handling by providing `onError` callbacks to the orchestrator's `spawn` method.
- Implement custom `AbortController` logic to cancel specific sub-tasks without stopping the entire swarm.

## Sources
- Source 1: `multi-agent.md` (YAAF Documentation)