---
summary: Configuration options for the ContextEngine, including the base prompt and maximum character budget.
export_name: ContextEngineConfig
source_file: src/agents/contextEngine.ts
category: type
title: ContextEngineConfig
entity_type: api
search_terms:
 - context engine setup
 - configure agent prompt
 - set max prompt size
 - base prompt configuration
 - system prompt budget
 - character limit for context
 - droppable context sections
 - prompt engineering settings
 - agent instruction configuration
 - ContextEngine options
 - how to limit prompt length
 - YAAF agent config
stub: false
compiled_at: 2026-04-24T16:57:49.792Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`ContextEngineConfig` is a type alias for the configuration object required by the `ContextEngine` class. It defines the fundamental instructions for an agent and sets constraints on the total size of the generated [System Prompt](../concepts/system-prompt.md) [Source 1].

This configuration is essential for managing the complexity and length of the context provided to a Large Language Model ([LLM](../concepts/llm.md)). The `basePrompt` property ensures that core instructions are always present, while the optional `maxChars` property enables a budget-based system where less critical information can be automatically omitted to prevent exceeding token limits [Source 1].

## Signature

`ContextEngineConfig` is a TypeScript type alias for an object with the following properties [Source 1]:

```typescript
export type ContextEngineConfig = {
  /** Base task instructions (always included) */
  basePrompt: string;
  /**
   * Maximum total character budget for the system prompt.
   * If set, droppable sections are removed lowest-priority-first to fit.
   */
  maxChars?: number;
};
```

### Properties

| Property     | Type     | Description                                                                                                                            |
|--------------|----------|----------------------------------------------------------------------------------------------------------------------------------------|
| `basePrompt` | `string` | **Required.** The core instructions for the agent's task. This content is always included in the final system prompt and is never dropped [Source 1]. |
| `maxChars`   | `number` | **Optional.** The maximum total number of characters allowed for the entire system prompt. If the combined length of the base prompt and all context sections exceeds this value, the `ContextEngine` will begin removing sections marked as `droppable`, starting with the lowest priority, until the budget is met [Source 1]. |

## Examples

### Basic Configuration

This example shows a minimal configuration with only the required `basePrompt`.

```typescript
import { ContextEngineConfig } from 'yaaf';

const config: ContextEngineConfig = {
  basePrompt: 'You are a helpful assistant that answers questions about geography.',
};
```

### Configuration with a Character Budget

This example demonstrates setting a maximum character limit for the entire system prompt. The `ContextEngine` using this configuration will ensure the final prompt does not exceed 5000 characters.

```typescript
import { ContextEngineConfig } from 'yaaf';

const configWithBudget: ContextEngineConfig = {
  basePrompt: 'You are a helpful assistant. Your goal is to summarize provided text.',
  maxChars: 5000,
};
```

## See Also

*   `ContextEngine`: The class that uses this configuration to manage and build the system prompt.
*   `ContextSection`: The type for individual pieces of context managed by the `ContextEngine`.

## Sources

[Source 1]: src/agents/contextEngine.ts