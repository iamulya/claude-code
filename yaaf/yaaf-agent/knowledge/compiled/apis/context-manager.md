---
summary: A class that monitors token usage and triggers compaction strategies when thresholds are met.
export_name: ContextManager
source_file: src/context/contextManager.ts
category: class
title: ContextManager
entity_type: api
stub: false
compiled_at: 2026-04-16T14:06:36.174Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/compaction.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agent.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/contextManager.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/index.ts
confidence: 1
---

## Overview
The `ContextManager` is a core subsystem responsible for managing the lifecycle of the data presented to a Large Language Model (LLM). It tracks conversation history, system-level context sections, and user-specific data while monitoring total token usage against the model's context window.

When token usage exceeds a calculated threshold, the `ContextManager` triggers **compaction**—a process that reduces the size of the conversation history using pluggable strategies (such as summarization or truncation) to prevent context overflow errors.

The auto-compaction threshold is calculated as:
$$\text{threshold} = \text{contextWindowTokens} - \text{maxOutputTokens} - \text{autoCompactBuffer}$$

## Signature / Constructor

```typescript
constructor(config: ContextManagerConfig)
```

### ContextManagerConfig
| Property | Type | Description |
| :--- | :--- | :--- |
| `contextWindowTokens` | `number` | The model's total context window size in tokens. |
| `maxOutputTokens` | `number` | Maximum tokens reserved for the model's response. |
| `autoCompactBuffer` | `number` | Buffer tokens below the threshold. Default: `13_000`. |