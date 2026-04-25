---
title: ContextManager
entity_type: api
summary: An API responsible for managing the agent's conversational context, including token budgeting and compaction strategies.
export_name: ContextManager
source_file: src/context-manager.ts
category: class
search_terms:
 - token budget management
 - conversation history compaction
 - LLM context window
 - handling token overflow
 - automatic context summarization
 - managing agent memory
 - context length limits
 - how to shorten agent history
 - context window strategy
 - preventing context overflow errors
 - YAAF memory management
 - context:overflow-recovery event
 - context:compaction-triggered event
stub: false
compiled_at: 2026-04-24T16:58:16.541Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
compiled_from_quality: documentation
confidence: 0.8
---

## Overview

The `ContextManager` is a core primitive within the YAAF framework responsible for managing an agent's conversational context [Source 1]. Its primary function is to prevent the context from exceeding the token limits of the underlying language model. It achieves this through automated strategies such as [Context Compaction](../concepts/context-compaction.md) [Source 1].

The `ContextManager` is integral to the framework's stability and error recovery capabilities. It can trigger emergency compaction if a token overflow occurs, inject synthetic continuations if an output token limit is hit, and emit warnings as the context size approaches its configured budget threshold [Source 1]. Its importance is highlighted by its use in the framework's internal `YaafDoctor` agent, which relies on it for its own operation [Source 1].

## Signature / Constructor

The provided source material does not include the specific TypeScript signature or constructor for the `ContextManager` class. However, a TypeScript error example from the source confirms that `ContextManager` is a distinct type within the framework [Source 1].

```typescript
// Example TypeScript error showing the ContextManager type
// src/agent.ts(42,5): error TS2322: Type 'string' is not assignable to type 'ContextManager'.
```

## Events

The `ContextManager` is associated with several events that provide visibility into its operations. These events can be monitored, for example by the `YaafDoctor`, to diagnose runtime issues related to [Context Management](../subsystems/context-management.md) [Source 1].

| Event | Description |
|-------|-------------|
| `context:budget-warning` | Emitted [when](./when.md) the context size is approaching its compaction threshold [Source 1]. |
| `context:compaction-triggered` | Emitted when the `ContextManager` performs an automatic compaction of the conversation history. The event includes before-and-after statistics [Source 1]. |
| `context:output-continuation` | Emitted when the model's output token limit is reached, and a synthetic continuation has been injected to handle it [Source 1]. |
| `context:overflow-recovery` | Emitted when an emergency compaction is triggered (or fails) in response to a token overflow [Source 1]. |

## Examples

The source material does not provide a direct code example of how to instantiate or use the `ContextManager`. Its usage is implied as a core component configured as part of an `Agent`'s lifecycle.

## See Also

The `ContextManager` is a fundamental component used by other high-level entities in the YAAF framework, such as the `Agent` class and the built-in `YaafDoctor` diagnostic tool [Source 1].

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md