---
title: generateToolUseSummary
summary: Generates a human-readable one-line summary of completed tool executions using a language model.
export_name: generateToolUseSummary
source_file: src/utils/toolSummary.ts
category: function
entity_type: api
search_terms:
 - summarize tool calls
 - human-readable tool execution
 - tool use summary
 - generate labels for tool use
 - tool batch description
 - what tools were run
 - tool execution history
 - concise tool output
 - toolUseSummaryGenerator
 - how to label agent actions
 - tool info summary
 - agent step summary
stub: false
compiled_at: 2026-04-24T17:08:48.876Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/toolSummary.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `generateToolUseSummary` function uses a language model to generate a concise, human-readable, one-line summary for a batch of executed [Tools](../subsystems/tools.md) [Source 1]. This is useful for creating labels that describe an agent's actions, such as "Fixed NPE in UserService" or "Read config.json" [Source 1].

It is recommended to use a small and fast language model for this summarization task to ensure efficiency [Source 1]. The function takes a configuration object containing the list of executed tools, the model to use, and optional context like an [Abort Signal](../concepts/abort-signal.md) or the last assistant message [Source 1].

## Signature

The function is an `async` function that accepts a `ToolSummaryConfig` object and returns a `Promise` that resolves to a summary `string` or `null` if the generation fails [Source 1].

```typescript
export async function generateToolUseSummary(
  config: ToolSummaryConfig
): Promise<string | null>;
```

### Configuration

The `config` object has the following type definition:

```typescript
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

The `tools` property is an array of `ToolInfo` objects, defined as:

```typescript
export type ToolInfo = {
  name: string;
  input: unknown;
  output: unknown;
};
```

## Examples

The following example demonstrates how to generate a summary for a batch of two tool executions: reading a file and then editing it.

```typescript
import { generateToolUseSummary } from 'yaaf';
import { smallModel } from './my-models'; // Example model import

const summary = await generateToolUseSummary({
  tools: [
    { name: 'read_file', input: { path: 'src/auth.ts' }, output: '...' },
    { name: 'edit_file', input: { path: 'src/auth.ts', ... }, output: 'OK' },
  ],
  model: smallModel,
});

// Example output: "Fixed auth validation in auth.ts"
console.log(summary);
```
[Source 1]

## Sources

[Source 1]: src/utils/toolSummary.ts