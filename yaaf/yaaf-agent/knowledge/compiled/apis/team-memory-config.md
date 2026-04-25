---
title: TeamMemoryConfig
entity_type: api
summary: Configuration options for initializing TeamMemory, specifying shared and private directories and the agent's ID.
export_name: TeamMemoryConfig
source_file: src/memory/teamMemory.ts
category: type
search_terms:
 - shared agent memory config
 - multi-agent memory setup
 - team memory initialization
 - configure shared directory
 - private agent memory path
 - agentId for memory
 - TeamMemory constructor options
 - swarm memory configuration
 - collaborative agent memory
 - memory isolation settings
 - sharedDir property
 - privateDir property
stub: false
compiled_at: 2026-04-25T00:15:03.090Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/teamMemory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview
`TeamMemoryConfig` is a type alias for the configuration object required to initialize a `[[TeamMemory]]` instance. It defines the file system paths for both shared (team-wide) and private (agent-specific) memory stores, which is essential for multi-agent systems where agents need to collaborate while also maintaining their own private state [Source 1].

This configuration allows YAAF to manage a two-directory memory model, routing memory operations to the correct location based on the specified scope (`team` or `private`) [Source 1].

## Signature
The `TeamMemoryConfig` type is defined as follows [Source 1]:

```typescript
export type TeamMemoryConfig = {
  /** Directory for shared team memory (readable by all agents). */
  sharedDir: string;

  /** This agent's unique identifier. Used for private memory isolation. */
  agentId: string;

  /** Directory for this agent's private memory. Default: `<sharedDir>/.private/<agentId>` */
  privateDir?: string;
};
```

### Properties

- **`sharedDir`**: `string` (required)
  The path to the directory that will be used for shared team memory. All agents using the same `sharedDir` can read and write to this location when the memory scope is set to `'team'` [Source 1].

- **`agentId`**: `string` (required)
  A unique identifier for the current agent. This ID is used to create an isolated namespace for the agent's private memory [Source 1].

- **`privateDir`**: `string` (optional)
  The path to the directory for this agent's private memory. If not provided, it defaults to a subdirectory within the shared directory, structured as `<sharedDir>/.private/<agentId>` [Source 1].

## Examples
Here is a typical usage pattern for configuring two different agents to use the same shared memory space while maintaining separate private memories [Source 1].

```typescript
import { TeamMemory, TeamMemoryConfig } from 'yaaf';

const sharedDirectory = '.yaaf/team-memory';

// Configuration for the first agent
const worker1Config: TeamMemoryConfig = {
  sharedDir: sharedDirectory,
  agentId: 'worker-1',
};
const memoryForWorker1 = new TeamMemory(worker1Config);

// Configuration for the second agent
const worker2Config: TeamMemoryConfig = {
  sharedDir: sharedDirectory,
  agentId: 'worker-2',
};
const memoryForWorker2 = new TeamMemory(worker2Config);

// Example with an explicit private directory
const specialWorkerConfig: TeamMemoryConfig = {
  sharedDir: sharedDirectory,
  agentId: 'special-worker',
  privateDir: '/var/tmp/yaaf/private/special-worker'
};
const memoryForSpecialWorker = new TeamMemory(specialWorkerConfig);
```

## See Also
- [TeamMemory](./team-memory.md): The class that uses this configuration object for initialization.

## Sources
[Source 1]: src/memory/teamMemory.ts