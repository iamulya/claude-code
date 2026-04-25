---
title: "`MessageLike`"
entity_type: api
summary: A general-purpose type representing a message in a conversation, with variations for different subsystems like history management and memory extraction.
export_name: MessageLike
source_file: src/context/historySnip.ts
category: type
search_terms:
 - conversation message type
 - chat history structure
 - agent message format
 - role and content
 - tool call message
 - message with tool id
 - generic message interface
 - LLM message object
 - what is a message in yaaf
 - message id property
 - toolName in message
stub: false
compiled_at: 2026-04-24T17:22:14.570Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/historySnip.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/autoExtract.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`MessageLike` is a type alias representing a generic message object within a conversation history. It provides a common structure for different parts of the YAAF framework to operate on conversational data. The core of the type consists of a `role` and `content` property.

Different YAAF subsystems define slightly different versions of `MessageLike` to include fields relevant to their specific functionality. For example, the version used for [History Snipping](../concepts/history-snipping.md) includes tool-related properties [Source 1], while the version used for [Memory](../concepts/memory.md) extraction includes a generic message `id` [Source 2]. This allows functions to be typed against a minimal message contract while accommodating subsystem-specific metadata.

## Signature

The `MessageLike` type has multiple definitions across the framework. The following are the definitions found in the source material.

### Definition in `src/context/historySnip.ts`

This version is used by history management [Utilities](../subsystems/utilities.md) like `snipHistory` and includes optional fields for identifying messages related to tool usage [Source 1].

```typescript
export type MessageLike = {
  role: string;
  content: string;
  toolName?: string;
  toolCallId?: string;
};
```

**Properties:**

*   `role: string`: The role of the message author (e.g., `user`, `assistant`, `tool`).
*   `content: string`: The textual content of the message.
*   `toolName?: string`: (Optional) The name of the tool that was called or whose result this message represents.
*   `toolCallId?: string`: (Optional) A unique identifier for the specific tool call associated with this message.

### Definition in `src/memory/autoExtract.ts`

This version is used by the memory extraction subsystem and includes an optional `id` field for tracking individual messages [Source 2].

```typescript
export type MessageLike = {
  role: string;
  content: string;
  id?: string;
};
```

**Properties:**

*   `role: string`: The role of the message author.
*   `content: string`: The textual content of the message.
*   `id?: string`: (Optional) A unique identifier for the message.

## Examples

### Example 1: Tool Result Message

This example shows a message object that conforms to the `MessageLike` type as defined in `src/context/historySnip.ts`. It represents the output of a tool call.

```typescript
import { MessageLike } from 'yaaf'; // Assuming a unified export

const toolResultMessage: MessageLike = {
  role: 'tool',
  content: '{"status": "success", "data": "file.txt has been written."}',
  toolName: 'writeFile',
  toolCallId: 'tool_call_12345',
};
```

### Example 2: User Message with ID

This example shows a message object that conforms to the `MessageLike` type as defined in `src/memory/autoExtract.ts`. It represents a user's turn in the conversation and has a unique ID.

```typescript
import { MessageLike } from 'yaaf'; // Assuming a unified export

const userMessage: MessageLike = {
  id: 'msg_abcde',
  role: 'user',
  content: 'What is the capital of France?',
};
```

## Sources

[Source 1]: src/context/historySnip.ts
[Source 2]: src/memory/autoExtract.ts