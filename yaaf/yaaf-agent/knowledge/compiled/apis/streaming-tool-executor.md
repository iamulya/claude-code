---
title: StreamingToolExecutor
entity_type: api
summary: An executor responsible for managing the parallel execution of multiple concurrency-safe tools.
export_name: StreamingToolExecutor
source_file: src/agents/streamingExecutor.ts
category: class
stub: false
compiled_at: 2026-04-16T14:12:04.282Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/tools.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/streamingExecutor.ts
confidence: 1
---

## Overview
The `StreamingToolExecutor` is a specialized class designed to manage the lifecycle of tool calls generated during a streaming LLM interaction. It is responsible for executing tools as they arrive from the model's response while maintaining strict execution and ordering guarantees.

The executor differentiates between tools based on their safety flags. Tools marked as `isConcurrencySafe` are executed in parallel, while non-concurrent tools are granted exclusive access, ensuring no other tools run simultaneously. Despite parallel execution, the `StreamingToolExecutor` ensures that results are yielded in the original order requested by the LLM. It also implements "sibling abort" logic, where an error in one tool call triggers the cancellation of other tools running in the same batch.

## Signature / Constructor

```typescript
export class StreamingToolExecutor {
  constructor(options: {
    tools: Tool[];
    concurrency?: number;
  })
}
```

### Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `tools` | `Tool[]` | An array of tool definitions available for execution. |
| `concurrency` | `number` | The maximum number of concurrency-safe tools allowed to run in parallel. |

### Associated Types
**ToolExecutionResult**
```typescript
export type ToolExecutionResult = {
  toolCallId: string;
  name: string;
  content: string;
  error?: boolean;
  durationMs: number;
}
```

## Methods & Properties
The `StreamingToolExecutor` provides internal mechanisms to:
*   **Identify Tools**: Uses `findToolByName` to match LLM requests to registered tool definitions.
*   **Manage Concurrency**: Orchestrates parallel execution for tools where `isConcurrencySafe` returns `true`.
*   **Handle Progress**: Supports yielding incremental updates or progress messages from tools during their execution.
*   **Enforce Ordering**: Buffers results to ensure they are returned to the agent in the sequence they were called, regardless of completion time.

## Examples

### Basic Initialization
The executor is typically initialized with a set of tools and a concurrency limit. It is used automatically by the framework's agent runners when tools are configured as concurrency-safe.

```typescript
import { StreamingToolExecutor } from 'yaaf';

const executor = new StreamingToolExecutor({
  tools: [searchTool, weatherTool, calendarTool],
  concurrency: 3,
});
```

### Defining a Concurrency-Safe Tool
For the `StreamingToolExecutor` to run tools in parallel, the tool definition must explicitly opt-in via the `isConcurrencySafe` flag.

```typescript
import { buildTool } from 'yaaf';

const weatherTool = buildTool({
  name: 'get_weather',
  description: 'Get current weather for a location.',
  inputSchema: {
    type: 'object',
    properties: {
      location: { type: 'string' },
    },
    required: ['location'],
  },
  async call({ location }) {
    const data = await fetchWeather(location);
    return { data: JSON.stringify(data) };
  },
  // Allows StreamingToolExecutor to run this in parallel with other safe tools
  isConcurrencySafe: () => true,
});
```

## See Also
* `Tool` (interface)
* `AgentRunner` (class)
* `ToolLoopDetector` (class)