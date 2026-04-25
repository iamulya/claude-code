---
title: Tool Use Summary System
summary: Provides functionality to generate concise, human-readable summaries of tool executions using a small language model.
primary_files:
 - src/utils/toolSummary.ts
entity_type: subsystem
exports:
 - generateToolUseSummary
 - ToolInfo
 - ToolSummaryConfig
search_terms:
 - summarize tool output
 - human-readable tool execution
 - generate tool labels
 - tool use summarization
 - small model for summaries
 - how to label tool runs
 - tool batch summary
 - concise tool descriptions
 - tool execution context
 - generateToolUseSummary function
 - what did the agent do
 - agent action summary
stub: false
compiled_at: 2026-04-24T18:20:58.372Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/toolSummary.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The [Tool Use](../concepts/tool-use.md) Summary System is responsible for generating concise, human-readable, one-line summaries for a batch of executed [Tools](./tools.md) [Source 1]. Instead of presenting raw tool names and parameters, this system uses a language model to create a natural language label that describes the outcome of the [Tool Execution](../concepts/tool-execution.md)s, such as "Fixed auth validation in auth.ts" or "Read config.json" [Source 1]. This functionality is intended to improve the [Observability](../concepts/observability.md) and user experience of agent operations by providing high-level descriptions of its actions.

## Architecture

The subsystem is architecturally simple, centered around a single asynchronous function, `generateToolUseSummary`. This function orchestrates the summarization process by invoking a language model with contextual information about the tools that were run [Source 1].

The key data structures are:
-   **`ToolInfo`**: A type that represents a single Tool Execution, containing its `name`, `input`, and `output` [Source 1].
-   **`ToolSummaryConfig`**: A configuration object that bundles all necessary information for the summarization task. This includes an array of `ToolInfo` objects, the language model to use, an optional `AbortSignal`, and optional context from the assistant's most recent message [Source 1].

The system is designed to use a small and fast language model for the summarization task to ensure efficiency [Source 1].

## Key APIs

The primary public API for this subsystem is the `generateToolUseSummary` function.

-   **`generateToolUseSummary(config: ToolSummaryConfig): Promise<string | null>`**
    Takes a `ToolSummaryConfig` object and returns a promise that resolves to a brief summary string. It returns `null` if the summary generation fails [Source 1].

    **Example Usage:**
    ```typescript
    const summary = await generateToolUseSummary({
      tools: [
        { name: 'read_file', input: { path: 'src/auth.ts' }, output: '...' },
        { name: 'edit_file', input: { path: 'src/auth.ts', ... }, output: 'OK' },
      ],
      model: smallModel,
    });
    // → "Fixed auth validation in auth.ts"
    ```
    [Source 1]

## Configuration

Configuration for the Tool Use Summary System is provided on a per-call basis through the `ToolSummaryConfig` object passed to the `generateToolUseSummary` function. The key properties of this object are:

-   `tools`: An array of `ToolInfo` objects detailing the tools that were executed in the batch [Source 1].
-   `model`: The `ChatModel` instance that will be used to generate the summary. The documentation recommends using a small, [Fast Model](../concepts/fast-model.md) for this purpose [Source 1].
-   `signal`: An optional `AbortSignal` to allow for cancellation of the generation process [Source 1].
-   `lastAssistantText`: An optional string containing the most recent text from the assistant, which can provide valuable context for generating a more accurate summary [Source 1].

## Sources

[Source 1]: src/utils/toolSummary.ts