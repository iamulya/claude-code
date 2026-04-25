---
title: Building Multi-Agent Systems
entity_type: guide
summary: A guide to building agent swarms with orchestrators, mailbox-based IPC, task management, and delegation in YAAF.
difficulty: intermediate
search_terms:
 - agent swarms
 - multi-agent collaboration
 - how to make agents talk to each other
 - YAAF orchestrator
 - agent communication
 - inter-process communication for agents
 - IPC for agents
 - agent task delegation
 - shared memory for agents
 - YAAF mailbox
 - YAAF task manager
 - coordinating multiple LLM agents
 - agent leader worker pattern
 - building a team of agents
stub: false
compiled_at: 2026-04-24T18:05:47.962Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
compiled_from_quality: documentation
confidence: 0.98
---

## Overview

This guide provides a step-by-step walkthrough for constructing [Multi-Agent Systems](../concepts/multi-agent-systems.md), or "agent swarms," using YAAF. The reader will learn how to use the core components for coordinating multiple agents, including the `AgentOrchestrator` for spawning and managing agents, the `Mailbox` for [Inter-Agent Communication](../subsystems/inter-agent-communication.md), the `TaskManager` for stateful task management, and `Team[[[[[[[[Memory]]]]]]]]` for sharing knowledge across a team of agents [Source 1].

## Step-by-Step

### Step 1: Orchestrate Agents with `AgentOrchestrator`

The `AgentOrchestrator` is the central component for spawning and coordinating a team of agents. It manages a `leader` agent and a pool of `delegates` that can be instantiated on demand [Source 1].

Define an orchestrator with a leader agent responsible for coordination and delegate agents specialized for specific tasks, such as research or writing. The configuration specifies a factory function for creating delegate instances and the maximum number of concurrent instances allowed for each type [Source 1].

```typescript
import { AgentOrchestrator, Agent } from 'yaaf';

// Assume delegateTool, searchTool, and writeTool are defined elsewhere
// const delegateTool = ...;
// const searchTool = ...;
// const writeTool = ...;

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

### Step 2: Enable Inter-Agent Communication with `Mailbox`

Agents in a YAAF multi-agent system communicate asynchronously through a file-based `Mailbox` system, avoiding direct method calls [Source 1]. Each agent has its own mailbox, identified by its `agentId`.

To send a message, an agent uses the `mailbox.send()` method, specifying the recipient's agent ID and the message payload. To check for new messages, an agent calls `mailbox.receive()`. After processing a message, it must be acknowledged with `mailbox.ack()` to remove it from the queue [Source 1].

```typescript
import { Mailbox } from 'yaaf';

const mailbox = new Mailbox({
  dir: './.agent-mail',
  agentId: 'researcher-1',
});

// Send a message to another agent
await mailbox.send('writer-1', {
  type: 'research-complete',
  data: { topic: 'quantum computing', findings: '...' },
});

// Receive messages
const messages = await mailbox.receive();
for (const msg of messages) {
  console.log(`From: ${msg.from}, Type: ${msg.type}`);
  console.log(msg.data);
}

// Acknowledge (removes from queue)
if (messages.length > 0) {
  await mailbox.ack(messages[0].id);
}
```

Messages follow a defined structure, which includes fields for routing, typing, and optional metadata like `ttl` (time-to-live) and `priority` [Source 1].

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

### Step 3: Manage Task Lifecycles with `TaskManager`

The `TaskManager` provides a persistent, state-machine-based system for tracking the lifecycle of tasks assigned to agents. It uses a directory for storage [Source 1].

Create a task with a description, assignee, and priority. The task's state can be updated using `tasks.transition()`. The system supports querying tasks by their status or assignee [Source 1].

```typescript
import { TaskManager, type TaskState } from 'yaaf';

const tasks = new TaskManager({
  dir: './.tasks',
});

// Create a task
const task = await tasks.create({
  type: 'research',
  description: 'Research quantum computing advances in 2024',
  assignee: 'researcher-1',
  priority: 'high',
});

// Update task state
await tasks.transition(task.id, 'in_progress');
await tasks.transition(task.id, 'completed', {
  result: 'Research findings...',
});

// Query tasks
const pending = await tasks.findByStatus('pending');
const mine = await tasks.findByAssignee('researcher-1');
```

Tasks progress through a defined set of states [Source 1]:
*   `pending` → `in_progress` → `completed`
*   `pending` → `in_progress` → `failed`
*   `pending` → `cancelled`

### Step 4: Share Knowledge with `TeamMemory`

`TeamMemory` allows agents to share information in a common space while also maintaining their own private Memory. It uses separate directories for shared and private data [Source 1].

Agents can save information to a `team` namespace, which is accessible to all agents, or a `private` namespace, which is only accessible to the agent that saved it. The `search()` method queries across all memories accessible to the agent [Source 1].

```typescript
import { TeamMemory } from 'yaaf';

const memory = new TeamMemory({
  sharedDir: './.team-memory',
  privateDir: './.agent-memory',
  agentId: 'researcher-1',
});

// Save to team namespace (all agents can see)
await memory.save({
  key: 'project-context',
  content: '# Project Overview\n...',
  namespace: 'team',
});

// Save to private namespace (only this agent)
await memory.save({
  key: 'my-notes',
  content: 'Internal research notes...',
  namespace: 'private',
});

// Search across all accessible memories
const results = await memory.search('API design patterns');
const context = memory.buildContext(results);
```

### Step 5: Ensure Agent Independence and Isolation

A key architectural principle in YAAF multi-agent systems is agent independence, which enhances robustness [Source 1]. Each agent spawned by the orchestrator is isolated in several ways:
*   **Independent Cancellation**: Each agent gets its own `AbortController`.
*   **State Isolation**: Agents do not share mutable state.
*   **Communication Protocol**: All interaction happens via the `Mailbox`, not direct method calls.
*   **Crash Isolation**: A failure in a delegate agent will not crash the leader or other delegates.

The orchestrator's `spawn` method can be configured with options like `timeout` and an `onError` handler to manage the lifecycle and potential failures of delegate agents gracefully [Source 1].

```typescript
// Spawn with timeout and error isolation
const result = await orchestrator.spawn('researcher', {
  timeout: 30_000,
  onError: (err) => {
    console.warn(`Worker failed: ${err.message}`);
    // Leader continues with other workers
  },
});
```

## Sources
[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md