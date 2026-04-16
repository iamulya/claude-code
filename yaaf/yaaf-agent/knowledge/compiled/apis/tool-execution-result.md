---
export_name: ToolExecutionResult
source_file: src/agents/streamingExecutor.ts
category: type
title: ToolExecutionResult
entity_type: api
summary: Represents the final output and metadata of a tool execution within the streaming executor.
stub: false
compiled_at: 2026-04-16T14:14:36.557Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/streamingExecutor.ts
confidence: 1
---

## Overview
`ToolExecutionResult` is a TypeScript type that defines the structure of the data returned after a tool has been processed by the `StreamingToolExecutor`. It encapsulates the tool's output, identification metadata, and execution metrics such as duration. This type is used to provide a standardized format for tool outputs, whether they succeeded or failed, ensuring that the agent runner can correctly integrate the results back into the conversation history.

## Signature / Constructor

```typescript
export type ToolExecutionResult = {
  toolCallId: string
  name: string
  content: string
  error?: boolean
  durationMs: number
}
```

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `toolCallId` | `string` | The unique identifier associated with the specific tool call request, typically provided by the LLM. |
| `name` | `string` | The name of the tool that was executed. |
| `content` | `string` | The result content or return value of the tool, formatted as a string. |
| `error` | `boolean` | (Optional) A flag indicating if the tool execution failed or encountered an exception. |
| `durationMs` | `number` | The total time taken to execute the tool, measured in milliseconds. |

## Examples

### Standard Execution Result
```typescript
const result: ToolExecutionResult = {
  toolCallId: "call_98765",
  name: "calculate_sum",
  content: "42",
  durationMs: 12,
  error: false
};
```

### Error Execution Result
```typescript
const errorResult: ToolExecutionResult = {
  toolCallId: "call_abc123",
  name: "fetch_url",
  content: "Error: 404 Not Found",
  durationMs: 150,
  error: true
};
```

## See Also
* `StreamingToolExecutor`