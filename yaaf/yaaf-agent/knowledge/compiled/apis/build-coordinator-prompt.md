---
summary: Builds the system prompt for the CoordinatorAgent based on a given configuration.
export_name: buildCoordinatorPrompt
source_file: src/agents/coordinator.ts
category: function
title: buildCoordinatorPrompt
entity_type: api
search_terms:
 - coordinator agent system prompt
 - how to configure coordinator agent
 - multi-agent system prompt
 - worker agent capabilities prompt
 - coordinator-worker pattern
 - generate coordinator instructions
 - task delegation prompt
 - synthesis guidance for LLM
 - define worker tools for coordinator
 - coordinator prompt engineering
 - system message for coordinator
 - multi-agent orchestration
stub: false
compiled_at: 2026-04-24T16:53:03.631Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/coordinator.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `buildCoordinatorPrompt` function constructs the [System Prompt](../concepts/system-prompt.md) string for a coordinator agent in a multi-agent system [Source 1]. This prompt provides the core instructions to the coordinator [LLM](../concepts/llm.md), defining its role, the capabilities of its available worker agents, and the rules for delegating tasks and synthesizing results.

This function is a key component of the YAAF coordinator-worker pattern. It is described as a simplified but faithful adaptation of a battle-tested, 370-line coordinator prompt, distilled to its most essential and effective patterns [Source 1]. Using this function ensures that the coordinator agent is properly configured with a high-quality set of instructions for orchestrating worker agents.

## Signature

```typescript
export function buildCoordinatorPrompt(config: CoordinatorPromptConfig): string;
```

### Parameters

*   **`config`** (`CoordinatorPromptConfig`): A configuration object that specifies the details needed to build the prompt, such as the list of available worker agents and their capabilities ([Tools](../subsystems/tools.md), descriptions, etc.). The source material does not provide an explicit definition for the `CoordinatorPromptConfig` type [Source 1].

### Returns

*   (`string`): A formatted string containing the complete system prompt for the coordinator agent.

## Examples

The source material does not provide a direct example of calling `buildCoordinatorPrompt`. However, its usage is implicit in the creation of a coordinator agent, where it would be called internally to generate the agent's system prompt based on the provided worker configuration.

The following example for creating a coordinator agent demonstrates the type of configuration that `buildCoordinatorPrompt` would consume [Source 1].

```typescript
const coordinator = createCoordinator({
  model,
  workers: [
    { id: 'researcher', tools: [searchTool, readTool], description: 'Research agent' },
    { id: 'implementer', tools: [editTool, writeTool], description: 'Implementation agent' },
  ],
});

// Internally, createCoordinator would call buildCoordinatorPrompt
// with a config derived from the 'workers' array.
```

## See Also

*   `buildWorkerResult`
*   `TaskNotification`

## Sources

*   [Source 1]: `src/agents/coordinator.ts`