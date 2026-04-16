---
export_name: Session
source_file: src/session.ts
category: class
title: Session
entity_type: api
summary: Manages conversation state persistence, allowing agents to resume interactions across restarts.
stub: false
compiled_at: 2026-04-16T14:05:08.020Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/agent.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/security.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agent.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/session.ts
confidence: 1
---

## Overview
The `Session` class provides conversation persistence and crash recovery for LLM agents. It serializes the full conversation history to a `.jsonl` file on disk, where each line represents a single message object. By attaching a session to an `Agent`, the agent can automatically load prior messages upon initialization and save new interactions after every execution turn.

Sessions are stored by default in a `.sessions/` directory, organized by session ID. Each session directory contains a `messages.jsonl` file for the append-only message log and a `metadata.json` file for session-specific configuration and state.

## Signature / Constructor

The `Session` class is typically instantiated via static factory methods rather than a direct constructor to handle asynchronous file I/O during initialization.

### Factory Methods

```typescript
static async create(id: string, options?: SessionOptions): Promise<Session>
static async resume(id: string, options?: SessionOptions): Promise<Session>
static async resumeOrCreate(id: string, options?: SessionOptions): Promise<Session>
```

### SessionOptions
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `dir` | `string` | `'./.sessions'` | The root directory where session data is stored. |

## Methods & Properties

### Instance Methods
- **`append(messages: ChatMessage[])`**: Appends new messages to the session history and persists them to the `.jsonl` file.
- **`getMessages()`**: Returns an array of all `ChatMessage` objects currently stored in the session.
- **`clear()`**: Deletes the session history from both memory and disk.

### Static Utility Methods
- **`listSessions(dir: string)`**: Returns a list of all available sessions in the specified directory, including metadata such as `messageCount` and `lastModified`.
- **`pruneOldSessions(dir: string, options: { olderThanDays: number })`**: Deletes session directories that have not been modified within the specified timeframe. Returns the count of removed sessions.

## Examples

### Basic Persistence with an Agent
This example demonstrates the standard pattern for maintaining a persistent conversation across process restarts.

```typescript
import { Agent, Session } from 'yaaf';

// Resume an existing session or create a new one if it doesn't exist
const session = await Session.resumeOrCreate('coding-assistant-v1', {
  dir: './data/sessions'
});

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  session, // Agent will auto-save to this session after each run()
});

const response = await agent.run('What did we talk about last time?');
```

### Manual Session Management
Sessions can be manipulated independently of an agent for auditing or manual history injection.

```typescript
import { Session, listSessions } from 'yaaf';

const session = await Session.resume('my-bot');

// Manually add messages
await session.append([
  { role: 'user', content: 'Manual injection' },
  { role: 'assistant', content: 'Acknowledged.' }
]);

// Inspect history
const history = session.getMessages();
console.log(`Session has ${history.length} messages.`);

// List all sessions on disk
const allSessions = await listSessions('./.sessions');
allSessions.forEach(s => {
  console.log(`${s.id}: ${s.messageCount} messages (Last active: ${s.lastModified})`);
});
```

## See Also
- [[Agent]] — The primary class that utilizes `Session` for state management.
- [[SecureStorage]] — For persisting sensitive credentials rather than conversation history.