---
title: conditional
entity_type: api
summary: Creates a conditional step that routes to different agents based on the input.
export_name: conditional
source_file: src/agents/workflow.ts
category: function
stub: false
compiled_at: 2026-04-16T14:16:09.314Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/workflow.ts
confidence: 1
---

## Overview
The `conditional` function is a workflow utility that enables dynamic routing within an agentic pipeline. It allows developers to define logic that selects a specific agent or sub-workflow at runtime based on the input string, facilitating branching paths in complex multi-agent systems. This programmatic approach provides a deterministic alternative to LLM-based routing.

## Signature / Constructor
```typescript
export function conditional(
  selector: (input: string) => WorkflowStep | Promise<WorkflowStep>,
): WorkflowStep
```

### Parameters
- `selector`: A callback function (synchronous or asynchronous) that receives the current input string and returns a `WorkflowStep`.

### Return Value
Returns a `WorkflowStep` object. A `WorkflowStep` is defined as:
```typescript
export type WorkflowStep = {
  run(input: string, signal?: AbortSignal): Promise<string>
}
```

## Methods & Properties
The object returned by `conditional` implements the `WorkflowStep` interface:

- `run(input: string, signal?: AbortSignal)`: When called, this method executes the `selector` function to determine the target step, then executes that step's `run` method with the provided input and abort signal