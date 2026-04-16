---
title: Agent Utilities
entity_type: subsystem
summary: A collection of helper functions and utility classes for agent operations, including observability and formatting.
primary_files:
  - src/utils/toolSummary.ts
exports:
  - generateToolUseSummary
  - ToolInfo
  - ToolSummaryConfig
stub: false
compiled_at: 2026-04-16T14:40:42.561Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/toolSummary.ts
confidence: 0.9
---

## Purpose
The Agent Utilities subsystem provides auxiliary functions and helper classes that support the core agent runtime. Its primary role is to handle non-core logic such as observability, data transformation, and human-readable formatting of agent activities. By offloading these tasks to a dedicated utility layer, the framework maintains a clean separation between agent execution logic and presentation or logging concerns.

## Architecture
The subsystem is designed as a collection of stateless utility modules. The current implementation focuses on tool-use summarization, which allows the framework to translate technical tool execution data into concise natural language descriptions.

### Tool-Use Summary Generator
The `toolSummary` module provides the capability to generate human-readable summaries of tool batches. This is particularly useful for user interfaces or logs where a technical trace of tool inputs and outputs would be too verbose. It utilizes a "small/fast" model pattern, where a lightweight LLM is tasked with synthesizing a one-line label for a set of completed actions.

## Key APIs
The most significant API within this subsystem is the tool summarization function.

### generateToolUseSummary
This asynchronous function processes a batch of tool execution results and returns a brief summary string.

```typescript
export async function generateToolUseSummary(
  config: ToolSummaryConfig,
): Promise<string | null>
```

**Parameters:**
- `config`: A `ToolSummaryConfig` object containing:
    - `tools`: An array of `ToolInfo` (name, input, and output).
    - `model`: A `ChatModel` instance used to generate the summary.
    - `signal`: An optional `AbortSignal`.
    - `lastAssistantText`: Optional context from the most recent assistant response to improve summary accuracy.

## Configuration
The utilities are configured at the call site via configuration objects. For tool summarization, the `ToolSummaryConfig` defines the operational parameters:

```typescript
export type ToolSummaryConfig = {
  tools: ToolInfo[]
  model: ChatModel
  signal?: AbortSignal
  lastAssistantText?: string
}
```

Developers typically use a faster, lower-cost model for these utility tasks to minimize latency and token usage while maintaining observability.