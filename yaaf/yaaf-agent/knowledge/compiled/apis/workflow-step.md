---
title: WorkflowStep
entity_type: api
summary: An interface for any entity that can participate in a workflow, including raw AgentRunners or nested WorkflowAgents.
export_name: WorkflowStep
source_file: src/agents/workflow.ts
category: type
stub: false
compiled_at: 2026-04-16T14:15:22.880Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/workflow.ts
confidence: 1
---

## Overview
`WorkflowStep` is the fundamental unit of composition in YAAF's declarative multi-agent orchestration. It defines a common interface that allows different types of execution units—such as individual agents, nested workflows, or data transformers—to be used interchangeably within a workflow pipeline.

By adhering to this interface, components can be passed into orchestration functions like `sequential`, `parallel`, or `loop`. This functional approach allows for building complex multi-agent systems without relying on heavy class hierarchies or LLM-based routing.

## Signature / Constructor
```typescript
export type WorkflowStep = {
  run(input: string, signal?: AbortSignal): Promise<string>
}
```

## Methods & Properties
### run()
The primary execution method for the step.
- **Parameters**:
  - `input`: `string` — The text input or prompt for the step. In a sequential workflow, this is typically the output of the previous step.
  - `signal`: `AbortSignal` (optional) — An optional signal to cancel the execution.
- **Returns**: `Promise<string>` — A promise that resolves to the output text of the step.

## Examples

### Using AgentRunners as Steps
Because `AgentRunner` implements the `run` method, it satisfies the `WorkflowStep` interface automatically.
```typescript
const researcher: WorkflowStep = new AgentRunner({ /* ... */ });
const writer: WorkflowStep = new AgentRunner({ /* ... */ });

const pipeline = sequential([researcher, writer]);
```

### Creating a Transformation Step
The `transform` helper creates a `WorkflowStep` that modifies data between agents without calling an LLM.
```typescript
const pipeline = sequential([
  researcher,
  transform(output => `Please review this research:\n${output}`),
  reviewer,
]);
```

### Conditional Routing
The `conditional` helper creates a `WorkflowStep` that dynamically selects which agent to run based on the input.
```typescript
const router = conditional(input => {
  if (input.includes('code')) return codeAgent;
  return generalAgent;
});

const result = await router.run("Write a Python script for data analysis");
```

## See Also
- `WorkflowAgent`
- `AgentRunner`
- `sequential`
- `parallel`
- `loop`