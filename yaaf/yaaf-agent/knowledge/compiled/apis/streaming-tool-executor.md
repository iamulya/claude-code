---
summary: An executor that can run multiple concurrency-safe tools in parallel to improve agent efficiency.
export_name: StreamingToolExecutor
source_file: src/tool-executor.ts
category: class
title: StreamingToolExecutor
entity_type: api
search_terms:
 - concurrent tool execution
 - parallel tool calls
 - how to run tools at the same time
 - speed up agent tools
 - StreamingToolExecutor configuration
 - tool concurrency
 - agent performance optimization
 - isConcurrencySafe tools
 - tool executor
 - batch tool execution
 - asynchronous tool calls
stub: false
compiled_at: 2026-04-25T00:14:29.850Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md
compiled_from_quality: documentation
confidence: 1
---

## Overview

The `StreamingToolExecutor` is a class responsible for executing multiple tool calls in parallel. It is designed to improve agent performance by running tools that are marked as concurrency-safe simultaneously, rather than sequentially [Source 1].

This executor is particularly useful in scenarios where an agent needs to perform several independent, long-running tasks, such as making multiple API calls for data gathering. The YAAF [AgentRunner](./agent-runner.md) automatically utilizes this executor when the tools provided to it are flagged with `isConcurrencySafe: () => true` [Source 1].

## Constructor

The `StreamingToolExecutor` is instantiated with a configuration object that specifies the available tools and the maximum level of concurrency.

```typescript
interface StreamingToolExecutorConfig {
  /**
   * An array of tool definitions available to the executor.
   */
  tools: Tool[];

  /**
   * The maximum number of tools to execute in parallel.
   */
  concurrency?: number;
}

constructor(config: StreamingToolExecutorConfig);
```

### Parameters

-   `config` (`StreamingToolExecutorConfig`): The configuration for the executor.
    -   `tools` (`Tool[]`): An array of tool objects that the executor can run.
    -   `concurrency` (`number`, optional): The maximum number of tools that can be run in parallel. Defaults to a reasonable number if not specified.

## Examples

The following example demonstrates how to create an instance of `StreamingToolExecutor` with a set of tools and a specified concurrency level.

```typescript
import { StreamingToolExecutor, buildTool } from 'yaaf';

// Assume searchTool, weatherTool, and calendarTool are defined
// using buildTool and are marked as concurrency-safe.
const searchTool = buildTool({ /* ... */ isConcurrencySafe: () => true });
const weatherTool = buildTool({ /* ... */ isConcurrencySafe: () => true });
const calendarTool = buildTool({ /* ... */ isConcurrencySafe: () => true });

const executor = new StreamingToolExecutor({
  tools: [searchTool, weatherTool, calendarTool],
  concurrency: 3,
});

// This executor can now run up to 3 of these tools in parallel.
// AgentRunner uses this automatically when tools are concurrency-safe.
```
[Source 1]

## See Also

-   [Tool Execution](../concepts/tool-execution.md): The core concept of how agents use tools.
-   [Tools](../subsystems/tools.md): The subsystem for defining and managing agent capabilities.
-   [AgentRunner](./agent-runner.md): The primary class for running agents, which uses `StreamingToolExecutor` internally.
-   [buildTool](./build-tool.md): The factory function for creating tool definitions, including the `isConcurrencySafe` flag.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md