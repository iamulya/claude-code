---
title: Conversation Persistence
entity_type: concept
summary: The mechanism of maintaining agent state and message history across different execution cycles to ensure continuity and crash recovery.
related_subsystems:
  - Session Management
stub: false
compiled_at: 2026-04-16T14:35:53.672Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/session.ts
confidence: 0.9
---

## What It Is
Conversation Persistence is the architectural pattern in YAAF that allows an agent to maintain its internal state and message history across multiple execution cycles. By persisting the dialogue context to non-volatile storage, YAAF ensures that agents can resume interactions exactly where they left off following a process restart, deployment, or system crash. This mechanism is critical for production-grade agents that require long-running state or reliable recovery.

## How It Works in YAAF
Persistence is primarily managed through the `Session` class. The framework serializes the full conversation history into a transcript file using the `.jsonl` (JSON Lines) format. In this format, each message or state change is stored as a single JSON object on a new line, which facilitates efficient appending and robust parsing.

The lifecycle of a persisted conversation typically involves two states:
1.  **Creation**: A new session is initialized with a unique identifier.
2.  **Resumption**: The `Session.resume()` method reads the existing `.jsonl` file from disk, reconstructs the message history, and populates the agent's internal state.

When an agent is initialized with a resumed session, its message count and context window are restored to their previous values before the first new interaction occurs.

## Configuration
Developers implement persistence by creating or resuming a `Session` and passing it to the `Agent` configuration.

```typescript
import { Session, Agent } from 'yaaf';

// Scenario 1: Starting a new persisted session
const newSession = Session.create('unique-agent-id');
const agentA = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  session: newSession,
});

// Scenario 2: Resuming an existing session after a restart
const existingSession = await Session.resume('unique-agent-id');
const agentB = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  session: existingSession,
});

// agentB now contains all messages previously handled by agentA
```

The underlying storage logic for the `.jsonl` transcripts is handled by internal utilities, ensuring that the serialization process remains transparent to the high-level Agent API.