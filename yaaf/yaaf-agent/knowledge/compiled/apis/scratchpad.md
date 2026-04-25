---
summary: A TypeScript class providing a managed temporary directory for cross-agent collaboration and durable knowledge sharing.
title: Scratchpad
entity_type: api
export_name: Scratchpad
source_file: src/agents/scratchpad.ts
category: class
search_terms:
 - shared agent storage
 - temporary file directory for agents
 - cross-agent communication
 - durable knowledge sharing
 - agent file system
 - how to save files between agents
 - managed temp directory
 - coordinator scratchpad
 - agent collaboration space
 - persistent agent memory
 - read and write files in agent
stub: false
compiled_at: 2026-04-24T17:35:38.586Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/scratchpad.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/compactionPrompts.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `Scratchpad` class provides a managed temporary directory on the file system, designed to facilitate collaboration and durable knowledge sharing between multiple agents [Source 1]. It allows different agent workers to read and write files to a common location without requiring explicit permission prompts for each operation [Source 1].

This component is inspired by the "coordinator scratchpad" concept from a related repository and serves as a foundational tool for building complex, [Multi-Agent Systems](../concepts/multi-agent-systems.md) where state or data needs to be passed durably between steps or agents [Source 1]. The `Scratchpad` instance manages the lifecycle of this temporary directory, including its creation and eventual cleanup [Source 1].

## Signature / Constructor

The `Scratchpad` is instantiated with an optional configuration object that defines its location and resource limits [Source 1].

```typescript
export class Scratchpad {
  constructor(config?: ScratchpadConfig);
  // ... methods
}
```

### Configuration

The constructor accepts a `ScratchpadConfig` object with the following properties:

```typescript
export type ScratchpadConfig = {
  /** 
   * Base directory for scratchpad files. 
   * Default: The operating system's temporary directory plus a random suffix. 
   */
  baseDir?: string;
  /** 
   * Maximum total size of all files in the scratchpad, in bytes. 
   * Default: 50MB. 
   */
  maxTotalBytes?: number;
  /** 
   * Maximum number of files allowed in the scratchpad. 
   * Default: 100. 
   */
  maxFiles?: number;
};
```

## Methods & Properties

While the source material does not provide full method implementations, the documentation and examples imply the following public API [Source 1].

### `write(path: string, content: string): Promise<void>`

Writes content to a file within the scratchpad's base directory.

### `read(path: string): Promise<string>`

Reads the content of a file from the scratchpad.

### `list(): Promise<ScratchpadEntry[]>`

Lists all files currently in the scratchpad, returning an array of `ScratchpadEntry` objects.

```typescript
export type ScratchpadEntry = {
  name: string;
  size: number;
  lastModified: Date;
};
```

### `destroy(): Promise<void>`

Removes the scratchpad directory and all its contents from the file system. This is intended for cleanup at the end of an [Agent Session](../concepts/agent-session.md).

## Examples

The following example demonstrates the typical lifecycle of a `Scratchpad`: creating it, having one agent write data, having another agent read it, listing the contents, and finally cleaning up the directory [Source 1].

```typescript
import { Scratchpad } from 'yaaf';

// Initialize the scratchpad.
// This could be done in a central coordinator.
const scratch = new Scratchpad({ baseDir: '/tmp/yaaf-scratch' });

// Agent A writes its research findings to a file.
await scratch.write('research.md', '## Auth Bug\nThere is a critical vulnerability in the login flow.');

// Agent B, in a separate process or step, reads the findings.
const findings = await scratch.read('research.md');
console.log(findings);
// Output: "## Auth Bug\nThere is a critical vulnerability in the login flow."

// An observer agent lists all files in the scratchpad.
const files = await scratch.list();
console.log(files);
// Output: [ { name: 'research.md', size: 68, lastModified: ... } ]

// At the end of the session, the coordinator cleans up.
await scratch.destroy();
```

## Sources

[Source 1]: src/agents/scratchpad.ts
[Source 2]: src/context/compactionPrompts.ts