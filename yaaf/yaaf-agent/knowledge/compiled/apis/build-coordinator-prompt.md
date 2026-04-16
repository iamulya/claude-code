---
summary: Generates the system prompt for a coordinator agent, including worker capabilities and synthesis guidance.
export_name: buildCoordinatorPrompt
source_file: src/agents/coordinator.ts
category: function
title: buildCoordinatorPrompt
entity_type: api
stub: false
compiled_at: 2026-04-16T14:13:17.805Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/coordinator.ts
confidence: 1
---

## Overview
`buildCoordinatorPrompt` is a utility function used to generate the system instructions for a coordinator agent within the YAAF multi-agent architecture. It is a core component of "Coordinator Mode," a pattern where a central agent delegates tasks to specialized workers, manages their lifecycle, and synthesizes their outputs into a final response for the user.

The function produces a prompt that incorporates:
*   **Worker Capabilities**: Descriptions of available worker agents and their specific tools.
*   **Concurrency Rules**: Guidance on how the coordinator should manage simultaneous or sequential task execution.
*   **Synthesis Guidance**: Instructions on how to aggregate results from multiple workers into a coherent final answer.

This implementation is a distilled adaptation of battle-tested coordinator prompt engineering patterns, designed to ensure effective delegation and structured communication between agents.

## Signature / Constructor
```typescript
export function buildCoordinatorPrompt(config: CoordinatorPromptConfig): string
```

### Parameters
*   `config`: A `CoordinatorPromptConfig` object containing the definitions of workers, their descriptions, and operational constraints for the coordinator.

## Examples
While `buildCoordinatorPrompt` is often called internally by higher-level factory functions, it can be used independently to prepare a system message for an LLM.

```typescript
import { buildCoordinatorPrompt } from 'yaaf';

const systemPrompt = buildCoordinatorPrompt({
  workers: [
    { 
      id: 'researcher', 
      description: 'Specializes in searching documentation and gathering requirements.' 
    },
    { 
      id: 'architect', 
      description: 'Specializes in designing system components and API surfaces.' 
    }
  ]
});

// The resulting string can be passed to an LLM as the system message
console.log(systemPrompt);
```

## See Also
*   `TaskNotification`: The structured format used by workers to report results back to the coordinator.
*   `buildWorkerResult`: A utility to format worker outputs for injection into the coordinator's context.