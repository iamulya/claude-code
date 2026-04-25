---
summary: Provides a shared, temporary file system for agents to exchange data and coordinate actions, enabling durable cross-worker knowledge sharing.
primary_files:
 - src/agents/scratchpad.ts
title: Agent Collaboration
entity_type: subsystem
exports:
 - Scratchpad
 - ScratchpadConfig
 - ScratchpadEntry
search_terms:
 - how agents share data
 - cross-agent communication
 - shared agent memory
 - agent scratchpad
 - temporary file storage for agents
 - multi-agent coordination
 - durable knowledge sharing
 - inter-agent file exchange
 - Scratchpad class
 - shared writable directory
 - coordinator scratchpad
stub: false
compiled_at: 2026-04-24T18:09:26.474Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/scratchpad.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Agent Collaboration subsystem provides a mechanism for multiple agents to share information and coordinate their activities [Source 1]. It solves the problem of [Inter-Agent Communication](./inter-agent-communication.md) by offering a durable, shared space where agents can exchange data. This is achieved through a managed temporary directory on the file system, which allows for "durable cross-worker knowledge sharing" without requiring special permissions for each file operation [Source 1].

## Architecture

The core of this subsystem is the `Scratchpad` class, which abstracts a temporary directory on the host's file system [Source 1]. This component is inspired by the "coordinator scratchpad" concept from a related project [Source 1].

Each instance of `Scratchpad` manages a specific directory. Agents interact with this shared space by creating, reading, and listing files. This file-based approach provides a simple yet effective method for agents to pass artifacts, research findings, or state information to one another during a collaborative session [Source 1]. The `Scratchpad` also enforces configurable limits on the total size and number of files to prevent resource exhaustion [Source 1].

## Integration Points

Agents are the primary consumers of the Agent Collaboration subsystem. An agent would be instantiated with or given access to a `Scratchpad` instance. It would then use the `Scratchpad` API to write its outputs (e.g., research notes, generated code) to a file, and other agents in the same session could read that file to continue the work. The lifecycle of the scratchpad is typically tied to a collaborative session, with a cleanup operation to remove the temporary directory and its contents upon completion [Source 1].

## Key APIs

The public API for this subsystem is exposed through the `Scratchpad` class [Source 1].

- **`new Scratchpad(config: ScratchpadConfig)`**: Creates and initializes a new shared directory.
- **`write(fileName: string, content: string): Promise<void>`**: Writes data to a specified file within the scratchpad.
- **`read(fileName: string): Promise<string>`**: Reads the content of a specified file.
- **`list(): Promise<ScratchpadEntry[]>`**: Returns a list of all files in the scratchpad, including their name, size, and modification date.
- **`destroy(): Promise<void>`**: Deletes the scratchpad directory and all its contents.

The following example demonstrates the basic usage pattern for collaboration between two agents [Source 1]:

```typescript
const scratch = new Scratchpad({ baseDir: '/tmp/yaaf-scratch' });

// Agent A writes research findings:
await scratch.write('research.md', '## Auth Bug\n...');

// Agent B reads them:
const findings = await scratch.read('research.md');

// List all files:
const files = await scratch.list();

// Cleanup on session end:
await scratch.destroy();
```

## Configuration

The behavior of a `Scratchpad` instance is configured via the `ScratchpadConfig` object passed to its constructor. The available options are [Source 1]:

- **`baseDir`**: A string specifying the path to the base directory for the scratchpad. If not provided, a directory is created within the operating system's default temporary directory with a random suffix.
- **`maxTotalBytes`**: A number defining the maximum total size of all files in the scratchpad, in bytes. The default is 50MB.
- **`maxFiles`**: A number setting the maximum number of files allowed in the scratchpad. The default is 100.

## Sources

[Source 1]: src/agents/scratchpad.ts