# Multi-Agent

Build agent swarms with orchestrators, mailbox-based IPC, task management, and delegation.

## AgentOrchestrator

Spawn and coordinate multiple agents:

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

## Mailbox IPC

File-based inter-agent messaging:

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
await mailbox.ack(messages[0].id);
```

### Message Format

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

## TaskManager

State machine for task lifecycle:

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

### Task States

```
pending → in_progress → completed
                      → failed
pending → cancelled
```

## Team Memory

Shared memory across multiple agents:

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

## Agent Independence

Each spawned agent gets:
- Its own `AbortController` — can be cancelled independently
- Its own state — no shared mutable state
- Mailbox communication only — no direct method calls
- Crash isolation — a failed worker can't take down the leader

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
