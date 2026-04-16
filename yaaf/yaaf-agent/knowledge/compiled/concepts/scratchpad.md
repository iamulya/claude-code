---
title: Scratchpad
entity_type: concept
summary: A shared writable directory pattern enabling multiple agents to collaborate by reading and writing files without permission prompts.
stub: false
compiled_at: 2026-04-16T14:14:09.948Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/scratchpad.ts
confidence: 0.95
---

## What It Is
The Scratchpad is a core architectural pattern in YAAF designed to facilitate durable cross-agent collaboration. It provides a managed, shared writable directory where multiple agents can exchange information by reading and writing files. 

The primary purpose of the Scratchpad is to enable knowledge sharing between workers without the friction of repetitive permission prompts. It is particularly useful for complex tasks where one agent performs research or data gathering and subsequent agents must process or act upon those findings. This pattern is inspired by coordinator scratchpad implementations found in advanced agentic systems.

## How It Works in YAAF
The Scratchpad is implemented via the `Scratchpad` class, which manages a specific directory on the host filesystem. It abstracts file operations into a simplified API that agents use to persist and retrieve data.

Key operations provided by the `Scratchpad` class include:
- **write**: Persists data to a named file within the scratchpad directory.
- **read**: Retrieves the contents of a file previously written by any agent sharing the scratchpad.
- **list**: Returns a list of all files currently stored in the scratchpad, including metadata such as file size and last modified date via the `ScratchpadEntry` type.
- **destroy**: Cleans up the scratchpad directory and its contents, typically called at the end of a session.

By using a shared directory, YAAF agents can maintain state and context across different execution steps or between different specialized agent instances.

## Configuration
The behavior of a Scratchpad is defined by the `ScratchpadConfig` object. Developers can constrain the scratchpad's footprint on the system to prevent resource exhaustion.

```typescript
export type ScratchpadConfig = {
  /** Base directory for scratchpad files. Default: OS tmpdir + random suffix. */
  baseDir?: string
  /** Maximum total size in bytes. Default: 50MB. */
  maxTotalBytes?: number
  /** Maximum number of files. Default: 100. */
  maxFiles?: number
}
```

### Example Implementation
The following example demonstrates how to initialize a scratchpad and use it for inter-agent communication:

```ts
const scratch = new Scratchpad({ 
  baseDir: '/tmp/yaaf-scratch',
  maxTotalBytes: 1024 * 1024 * 10 // 10MB limit
});

// Agent A writes research findings:
await scratch.write('research.md', '## Auth Bug\nFound a race condition in the login flow.');

// Agent B reads the findings to generate a fix:
const findings = await scratch.read('research.md');

// List all files in the shared space:
const files = await scratch.list();

// Cleanup on session end:
await scratch.destroy();
```

## Sources
- `src/agents/scratchpad.ts`