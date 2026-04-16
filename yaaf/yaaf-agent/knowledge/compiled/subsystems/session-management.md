---
title: Session Management
entity_type: subsystem
summary: A logical subsystem responsible for the lifecycle of agent sessions, including serialization to .jsonl and state restoration.
primary_files:
  - src/session.ts
  - src/utils/sessionStorage.ts
exports:
  - Session
stub: false
compiled_at: 2026-04-16T14:35:59.976Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/session.ts
confidence: 0.95
---

## Purpose
The Session Management subsystem provides conversation persistence and crash recovery for agents. Its primary role is to ensure that an agent's interaction history is preserved across different execution lifecycles. By serializing the state to disk, the subsystem allows agents to resume long-running tasks exactly where they left off after a restart or an unexpected failure.

## Architecture
The subsystem is centered around the `Session` class, which manages the serialization and deserialization of agent interactions.

### Persistence Mechanism
Sessions are persisted to the local filesystem using a `.jsonl` (JSON Lines) format. In this format, each message or state update is stored as a single JSON object on a new line. This append-only approach facilitates efficient logging of conversation history. The subsystem utilizes `fs/promises` for asynchronous file operations and `path` for managing storage locations.

### Data Structures
The subsystem primarily handles `ChatMessage` objects, which represent the individual turns in a conversation. These objects are serialized into the session transcript and reloaded during session restoration.

## Integration Points
The Session Management subsystem integrates with the agent runner. A `Session` instance is typically provided to an agent during instantiation. The agent uses this instance to track its message history and ensure that every interaction is recorded to the underlying storage.

## Key APIs

### Session.create(id: string)
Creates a new session instance for a specified identifier. This is used when starting a new conversation that requires persistence.

### Session.resume(id: string)
An asynchronous method that attempts to load an existing session from disk based on the provided identifier. If a session file exists, it restores the message history, allowing the agent to continue the conversation with its previous context intact.

```typescript
// First run — creates a new session
const session = Session.create('my-agent');

const agent = new Agent({
  systemPrompt: '...',
  session,
});

// Later run — resumes from disk
const session = await Session.resume('my-agent');
// agent.messageCount > 0 — history is restored
```

## Configuration
Sessions are primarily configured by their unique identifier (e.g., `'my-agent'`), which determines the filename used for the `.jsonl` transcript on disk. The specific formatting of these transcripts is handled by internal utilities in `src/utils/sessionStorage.ts`.