---
tags:
  - concurrency
  - streaming
  - performance
title: Concurrent Tool Execution
entity_type: concept
summary: A mechanism in YAAF that allows multiple tools to execute in parallel while maintaining result ordering and safety guarantees.
related_subsystems:
  - agents
  - tools
stub: false
compiled_at: 2026-04-16T14:14:46.333Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/streamingExecutor.ts
confidence: 0.95
---

## What It Is
Concurrent Tool Execution is a performance-oriented pattern in YAAF designed to reduce latency when a Large Language Model (LLM) requests multiple tool calls in a single turn. Instead of executing tools sequentially, YAAF can run multiple operations simultaneously while ensuring that the final output remains deterministic and safe. This concept is primarily implemented to handle tool calls as they arrive from a streaming LLM response, allowing the framework to begin execution before the LLM has finished generating its entire message.

## How It Works in YAAF
The mechanism is managed by the `StreamingToolExecutor` class within the `agents` subsystem. It coordinates the lifecycle of multiple tool calls using several key principles:

- **Concurrency Safety**: Tools are categorized based on an `isConcurrencySafe` flag. Tools marked as concurrency-safe can run in parallel with other safe tools.
- **Exclusive Access**: If a tool is not marked as concurrency-safe, the executor ensures it has exclusive access to the runtime, meaning no other tools run simultaneously with it.
- **Ordered Yielding**: Even if parallel tools finish out-of-order (e.g., a tool started second finishes before the first), the executor buffers and yields results in the original order requested by the LLM.
- **Sibling Abort**: The framework implements a fail-fast policy. If a tool execution results in an error, the executor automatically cancels its "sibling" tools that are currently running in the same batch.
- **Progress Updates**: The execution model supports incremental progress messages, allowing long-running tools to provide feedback before their final result is yielded.

## Configuration
Developers configure concurrency behavior at the tool definition level using the `Tool` interface.

```typescript
import { type Tool } from '../tools/tool.js'

export const mySearchTool: Tool = {
  name: 'web_search',
  // Enable parallel execution for this tool
  isConcurrencySafe: true, 
  execute: async (args, context) => {
    // Tool logic
  }
}
```

The `StreamingToolExecutor` handles the orchestration of these tools during the agent's run loop, processing `ToolCall` objects and returning `ToolExecutionResult` objects which include metadata such as `durationMs` and `toolCallId`.

## Sources
- `src/agents/streamingExecutor.ts`