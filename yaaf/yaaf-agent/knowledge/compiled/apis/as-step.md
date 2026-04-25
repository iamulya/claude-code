---
export_name: asStep
source_file: src/agents/workflow.ts
category: function
title: asStep
entity_type: api
summary: A helper function to explicitly wrap an AgentRunner as a WorkflowStep for use in workflow agents.
search_terms:
 - workflow step helper
 - convert agent to step
 - use AgentRunner in sequential
 - workflow agent composition
 - explicitly type as WorkflowStep
 - workflow agent input
 - how to add agent to pipeline
 - sequential agent steps
 - parallel agent steps
 - loop agent steps
 - make agent a workflow step
stub: false
compiled_at: 2026-04-24T16:50:35.892Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/workflow.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `asStep` function is a helper utility for use with YAAF's [workflow](../concepts/workflow.md) agents (`sequential`, `parallel`, `loop`). It wraps an `AgentRunner` instance, explicitly marking it as a `WorkflowStep`.

While an `AgentRunner` object already has a `run(message, signal)` method and thus structurally satisfies the `WorkflowStep` interface, using `asStep` makes the developer's intent clear. It signifies that the agent is being used as a component within a larger, declarative workflow. This function serves primarily as a code clarity and readability aid rather than a functional necessity [Source 1].

## Signature

```typescript
export function asStep(runner: AgentRunner): WorkflowStep;
```

**Parameters:**

*   `runner`: An `AgentRunner` instance to be wrapped as a workflow step.

**Returns:**

*   A `WorkflowStep` object, which is functionally identical to the input `AgentRunner` but explicitly typed for use in workflows.

## Examples

The following example demonstrates how `asStep` can be used to improve the clarity of a sequential workflow definition.

```typescript
import { AgentRunner, asStep, sequential, WorkflowAgent } from 'yaaf';

// Assume researcher and writer are pre-configured AgentRunner instances
declare const researcher: AgentRunner;
declare const writer: AgentRunner;

// Using asStep makes it explicit that these runners are steps in a workflow.
const explicitPipeline: WorkflowAgent = sequential([
  asStep(researcher),
  asStep(writer),
]);

// This is functionally identical, as AgentRunner already matches the
// WorkflowStep interface. `asStep` is purely for readability.
const implicitPipeline: WorkflowAgent = sequential([
  researcher,
  writer,
]);

async function main() {
  const result = await explicitPipeline.run('Write a summary of YAAF Workflow Agents.');
  console.log(result);
}
```

## See Also

*   `sequential`
*   `parallel`
*   `loop`
*   `transform`
*   `WorkflowStep` (type)
*   `AgentRunner` (class)

## Sources

[Source 1]: src/agents/workflow.ts