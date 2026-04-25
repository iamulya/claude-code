---
title: ChatModel
summary: Represents an interface for a chat-oriented language model used by the agent for various tasks.
export_name: ChatModel
source_file: src/agents/runner.ts
category: type
entity_type: api
search_terms:
 - language model interface
 - LLM abstraction
 - chat model type
 - how to use a model with an agent
 - provider-agnostic model
 - YAAF model type
 - agent model configuration
 - passing a model to a function
 - what is ChatModel
 - LLM provider integration
stub: false
compiled_at: 2026-04-24T16:54:46.650Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/toolSummary.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `ChatModel` type is a generic interface that represents a chat-oriented large language model ([LLM](../concepts/llm.md)) within the YAAF framework. It serves as a standardized contract, allowing different components of the framework, such as agents and utility functions, to interact with various underlying LLM providers without being coupled to a specific implementation. This abstraction is central to YAAF's provider-agnostic architecture.

Components that require LLM capabilities, such as the `generateToolUseSummary` function, accept an object conforming to the `ChatModel` type to perform their operations [Source 1].

## Signature

The provided source material does not include the full definition of the `ChatModel` type itself. However, its usage as a type annotation in other components illustrates its role. For example, the `ToolSummaryConfig` type requires a `model` property of type `ChatModel` [Source 1].

```typescript
// From src/utils/toolSummary.ts

import type { ChatModel } from "../agents/runner.js";

export type ToolSummaryConfig = {
  /** Tools executed in this batch. */
  tools: ToolInfo[];
  /** The model to use for summarization (small/fast recommended). */
  model: ChatModel;
  /** Abort signal. */
  signal?: AbortSignal;
  /** Most recent assistant text for context. */
  lastAssistantText?: string;
};
```

## Examples

The following example demonstrates how an object conforming to the `ChatModel` interface is passed to a utility function. A `smallModel` variable, which is assumed to be an instance of a `ChatModel`, is provided in the configuration for `generateToolUseSummary` [Source 1].

```typescript
import { generateToolUseSummary } from './utils/toolSummary';
import type { ChatModel } from './agents/runner';

// Assume 'smallModel' is an initialized object that conforms to the ChatModel interface.
declare const smallModel: ChatModel;

async function summarizeToolExecution() {
  const summary = await generateToolUseSummary({
    tools: [
      { name: 'read_file', input: { path: 'src/auth.ts' }, output: '...' },
      { name: 'edit_file', input: { path: 'src/auth.ts', changes: '...' }, output: 'OK' },
    ],
    model: smallModel, // Passing the ChatModel instance
  });

  console.log(summary);
  // Expected output: "Fixed auth validation in auth.ts"
}
```

## Sources

[Source 1]: src/utils/toolSummary.ts