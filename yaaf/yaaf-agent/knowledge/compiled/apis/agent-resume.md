---
summary: Injects a resolution (approval, rejection, or input) into a suspended thread to continue execution.
export_name: Agent
source_file: src/agent.ts
category: function
title: Agent.resume
entity_type: api
stub: false
compiled_at: 2026-04-16T14:08:32.141Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/human-in-the-loop.md
confidence: 0.95
---

## Overview
`Agent.resume` is a core method in the YAAF "stateless reducer" pattern, used to handle Human-in-the-Loop (HITL) interactions. When an agent's execution is suspended—typically because a tool requires human approval, the agent has requested human input, or it is waiting for an asynchronous result—`resume` is used to provide the necessary resolution and continue the agent's execution.

Because YAAF threads are plain JSON objects, `resume` can be called in a different process or serverless execution environment than the original `step` call, provided the thread state has been persisted and restored.

## Signature / Constructor
```typescript
async resume(
  thread: AgentThread,
  resolution: Resolution,
  options?: StepOptions
): Promise<StepResult>
```

### Parameters
- `thread`: An `AgentThread` object that is currently in a suspended state.
- `resolution`: An object containing the human or external response.
- `options`: Optional configuration for the execution step.

### Resolution Types
The `resolution` parameter must match the type of suspension present in the thread:

| Resolution type | When to use |
|----------------|-------------|
| `{ type: 'approved',