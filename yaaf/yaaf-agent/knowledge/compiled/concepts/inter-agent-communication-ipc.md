---
title: Inter-Agent Communication (IPC)
entity_type: concept
summary: The mechanisms and patterns for agents to exchange messages and coordinate actions within a multi-agent system.
related_subsystems:
 - Multi-Agent
search_terms:
 - agent to agent communication
 - multi-agent messaging
 - how do YAAF agents talk to each other
 - agent swarm communication
 - mailbox IPC
 - file-based messaging
 - agent coordination
 - delegating tasks between agents
 - shared memory for agents
 - agent message queue
 - asynchronous agent communication
 - YAAF IPC
stub: false
compiled_at: 2026-04-24T17:56:07.094Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
compiled_from_quality: documentation
confidence: 0.98
---

## What It Is

[Inter-Agent Communication](../subsystems/inter-agent-communication.md) (IPC) in YAAF refers to the set of mechanisms that allow independent, isolated agents to exchange information, delegate tasks, and coordinate their actions within a larger multi-agent system. YAAF's architecture is built on the principle of agent independence, where each agent has its own state, its own `AbortController` for cancellation, and experiences crash isolation from other agents [Source 1]. Consequently, agents do not use direct method calls or shared mutable state for interaction. Instead, they rely on explicit, asynchronous communication patterns provided by the framework, such as mailbox-based messaging, shared task lists, and team [Memory](./memory.md) [Source 1].

## How It Works in YAAF

YAAF provides several abstractions to facilitate communication and coordination between agents in a swarm.

### Mailbox-based Messaging

The primary mechanism for direct, asynchronous communication is the `Mailbox` class. This is a file-based messaging system that allows one agent to send a message to another's persistent inbox [Source 1].

An agent can send a message to a specific recipient by its ID. The recipient agent can then poll its mailbox to receive new messages, process them, and acknowledge them to remove them from the queue [Source 1].

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
  // ... process message ...
  // Acknowledge (removes from queue)
  await mailbox.ack(msg.id);
}
```

Messages have a defined structure, including metadata for routing, expiration (`ttl`), and prioritization [Source 1].

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

### Task Management

For more structured coordination, YAAF provides a `TaskManager`. This acts as a shared, persistent state machine for tasks that can be created, assigned, and transitioned through various states by different agents [Source 1]. This is a form of indirect communication where an agent's action (e.g., creating a task) signals work for another, and the assignee's action (e.g., completing the task) signals a result back to the system.

The lifecycle of a task follows a defined state machine: `pending` → `in_progress` → `completed` or `failed`, with a `cancelled` state also possible from `pending` [Source 1].

```typescript
import { TaskManager } from 'yaaf';

const tasks = new TaskManager({
  dir: './.tasks',
});

// Create and assign a task
const task = await tasks.create({
  type: 'research',
  description: 'Research quantum computing advances in 2024',
  assignee: 'researcher-1',
});

// Another agent can update the task state
await tasks.transition(task.id, 'in_progress');
await tasks.transition(task.id, 'completed', {
  result: 'Research findings...',
});
```

### Shared Memory

`TeamMemory` provides a mechanism for agents to share information in a persistent, queryable format without direct messaging. It functions as a shared knowledge base. Agents can write information to a common "team" namespace, which is accessible to all other agents, or to a "private" namespace visible only to themselves [Source 1]. This allows for broadcasting context or findings to the entire team asynchronously.

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

// Other agents can search across all accessible memories
const results = await memory.search('project overview');
```

## Configuration

The persistence layer for YAAF's IPC mechanisms is file-based and configured during instantiation. The developer must provide directory paths where mailboxes, task states, and shared memory will be stored on disk [Source 1].

**Mailbox Configuration:**
```typescript
const mailbox = new Mailbox({
  dir: './.agent-mail', // Directory for all mailboxes
  agentId: 'researcher-1',
});
```

**Task Manager Configuration:**
```typescript
const tasks = new TaskManager({
  dir: './.tasks', // Directory for task database
});
```

**Team Memory Configuration:**
```typescript
const memory = new TeamMemory({
  sharedDir: './.team-memory', // Directory for shared knowledge
  privateDir: './.agent-memory', // Directory for agent-specific memory
  agentId: 'researcher-1',
});
```

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md