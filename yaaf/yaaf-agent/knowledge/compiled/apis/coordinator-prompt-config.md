---
summary: Configuration interface for building the coordinator's system prompt.
export_name: CoordinatorPromptConfig
source_file: src/agents/coordinator.ts
category: type
title: CoordinatorPromptConfig
entity_type: api
search_terms:
 - coordinator prompt configuration
 - how to configure coordinator agent
 - multi-agent system prompt
 - worker agent capabilities
 - delegate tasks to agents
 - configure agent delegation
 - buildCoordinatorPrompt config
 - coordinator-worker pattern
 - agent orchestration prompt
 - synthesis guidance for agents
 - define worker agents
 - agent team setup
stub: false
compiled_at: 2026-04-25T00:06:06.737Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/coordinator.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`CoordinatorPromptConfig` is a type that defines the configuration object required by the [buildCoordinatorPrompt](./build-coordinator-prompt.md) function. This configuration provides all the necessary information to construct a detailed system prompt for a coordinator agent in a multi-agent system [Source 1].

The primary purpose of this configuration is to inform the coordinator agent about the available worker agents it can delegate tasks to. It includes details about each worker's identity, its specific capabilities (described in natural language), and the tools it has access to. The resulting system prompt guides the coordinator on how to decompose problems, assign sub-tasks to the appropriate workers, and synthesize their results to fulfill the user's request [Source 1].

This configuration is a key component of the coordinator-worker pattern in YAAF, enabling the creation of sophisticated, hierarchical agent systems.

## Signature

The source material does not provide an explicit definition for the `CoordinatorPromptConfig` type. However, based on the context of the [buildCoordinatorPrompt](./build-coordinator-prompt.md) function and related APIs like `createCoordinator`, the configuration is expected to contain a description of the worker agents available to the coordinator [Source 1].

The following is an illustrative structure based on this context:

```typescript
import type { Tool } from "../tools/tool.js";

export type CoordinatorPromptConfig = {
  /**
   * An array of worker agent configurations that the coordinator can delegate tasks to.
   */
  workers: {
    /** A unique identifier for the worker agent. */
    id: string;

    /** A natural language description of the worker's purpose and capabilities. */
    description: string;

    /** The collection of tools available to this worker agent. */
    tools: Tool[];
  }[];

  // Other properties related to concurrency rules and synthesis guidance may also be included.
};
```

## Examples

While `CoordinatorPromptConfig` is used directly by [buildCoordinatorPrompt](./build-coordinator-prompt.md), a common use case is to provide a similar configuration to the [createCoordinator](./create-coordinator.md) factory function, which then uses it internally to build the coordinator's prompt.

The example below shows a configuration object for `createCoordinator` that contains the necessary information for a `CoordinatorPromptConfig` [Source 1].

```typescript
import { createCoordinator, agentTool, Tool } from 'yaaf';
import { model } from './my-llm-provider'; // Assume a model is imported

// Mock tools for demonstration purposes
const searchTool: Tool = {
  name: 'search',
  description: 'Searches the web for information.',
  input_schema: { type: 'object', properties: { query: { type: 'string' } } },
  execute: async () => ({ success: true, result: 'Search results...' }),
};

const readTool: Tool = {
  name: 'read',
  description: 'Reads the content of a file.',
  input_schema: { type: 'object', properties: { path: { type: 'string' } } },
  execute: async () => ({ success: true, result: 'File content...' }),
};

const editTool: Tool = {
  name: 'edit',
  description: 'Edits a file with new content.',
  input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } },
  execute: async () => ({ success: true, result: 'File edited successfully.' }),
};

// This configuration object contains the details that would be used to
// construct the CoordinatorPromptConfig internally.
const coordinatorSetup = {
  model,
  workers: [
    {
      id: 'researcher',
      tools: [searchTool, readTool],
      description: 'An agent that can search the web and read file contents.'
    },
    {
      id: 'implementer',
      tools: [editTool],
      description: 'An agent that can edit files to implement changes.'
    },
  ],
};

// The createCoordinator function uses this configuration to call buildCoordinatorPrompt
// and set up the coordinator agent with knowledge of its workers.
const coordinator = createCoordinator(coordinatorSetup);

// const result = await coordinator.run('Research the YAAF framework and update the README.md');
```

## See Also

- [buildCoordinatorPrompt](./build-coordinator-prompt.md): The function that consumes this configuration to generate a system prompt.
- [createCoordinator](./create-coordinator.md): A factory function for creating a coordinator agent, which uses this configuration pattern.
- [Agent](./agent.md): The base class for all agents, including coordinators and workers.

## Sources

[Source 1]: src/agents/coordinator.ts