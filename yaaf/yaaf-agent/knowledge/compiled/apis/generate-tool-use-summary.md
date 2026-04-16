---
title: generateToolUseSummary
entity_type: api
summary: Generates a human-readable one-line summary of completed tool executions using a chat model.
export_name: generateToolUseSummary
source_file: src/utils/toolSummary.ts
category: function
stub: false
compiled_at: 2026-04-16T14:40:37.979Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/toolSummary.ts
confidence: 1
---

## Overview
`generateToolUseSummary` is a utility function designed to produce concise, human-readable descriptions of actions performed by an agent during a tool-use phase. It processes a batch of executed tools and their results, using a provided chat model to synthesize a single-line summary (e.g., "Fixed NPE in UserService" or "Read config.json").

This function is typically used to provide user-facing feedback or to create clean logs of agent activity without exposing the raw JSON input and output of every tool call. It is recommended to use a small, fast model for this task to minimize latency.

## Signature / Constructor

### Function Signature
```typescript
export async function generateToolUseSummary(
  config: ToolSummaryConfig,
): Promise<string | null>
```

### Supporting Types

#### ToolSummaryConfig
The configuration object for the summary generation.
| Property | Type | Description |
| :--- | :--- | :--- |
| `tools` | `ToolInfo[]` | An array of tools executed in the current batch. |
| `model` | `ChatModel` | The LLM provider used to generate the summary. |
| `signal` | `AbortSignal` | (Optional) An abort signal to cancel the request. |
| `lastAssistantText` | `string` | (Optional) The most recent text from the assistant to provide context for the summary. |

#### ToolInfo
Represents the state of an individual tool execution.
| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The name of the tool that was called. |
| `input` | `unknown` | The arguments passed to the tool. |
| `output` | `unknown` | The result returned by the tool. |

## Examples

### Basic Usage
This example demonstrates how to generate a summary for a batch of file operations.

```typescript
import { generateToolUseSummary } from 'yaaf';

const summary = await generateToolUseSummary({
  tools: [
    { 
      name: 'read_file', 
      input: { path: 'src/auth.ts' }, 
      output: 'export const validate = ...' 
    },
    { 
      name: 'edit_file', 
      input: { path: 'src/auth.ts', content: '...' }, 
      output: 'OK' 
    },
  ],
  model: smallModel, // A ChatModel instance
});

console.log(summary); 
// Output: "Fixed auth validation in auth.ts"
```