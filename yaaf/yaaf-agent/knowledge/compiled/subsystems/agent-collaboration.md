---
title: Agent Collaboration
entity_type: subsystem
summary: The subsystem responsible for enabling communication and shared state between multiple agents in YAAF via a managed shared workspace.
primary_files:
  - src/agents/scratchpad.ts
exports:
  - Scratchpad
  - ScratchpadConfig
  - ScratchpadEntry
stub: false
compiled_at: 2026-04-16T14:14:20.526Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/scratchpad.ts
confidence: 0.9
---

## Purpose
The Agent Collaboration subsystem provides the infrastructure necessary for multiple agents to share information, synchronize state, and exchange data during complex tasks. It solves the problem of cross-worker knowledge sharing by providing a durable, shared workspace that bypasses the need for constant permission prompts or complex messaging protocols between individual agent instances.

## Architecture
The subsystem is primarily architected around the concept of a **Scratchpad**, which serves as a managed temporary directory.

### Scratchpad
The `Scratchpad` class is the central component of this subsystem. It manages a specific area of the filesystem where agents can read and write files. This allows for:
- **Durable Knowledge Sharing**: Data written by one agent remains available for others even if the writing agent finishes its execution.
- **Managed Lifecycle**: The scratchpad can be initialized at the start of a multi-agent session and destroyed upon completion.
- **Resource Constraints**: The system enforces limits on file counts and total disk usage to prevent resource exhaustion.

## Key APIs
The primary interface for agent collaboration is the `Scratchpad` class.

### Scratchpad Methods
- `write(name: string, content: string)`: Writes a file to the shared directory. This is typically used by an agent to export findings or intermediate data.
- `read(name: string)`: Reads the contents of a file from the shared directory, allowing an agent to consume data produced by another.
- `list()`: Returns a list of `ScratchpadEntry` objects, providing metadata (name, size, and last modified date) for all files currently in the workspace.
- `destroy()`: Performs cleanup by removing the temporary directory and all its contents.

## Configuration
The collaboration environment is configured using the `ScratchpadConfig` object. This configuration allows developers to define the boundaries of the shared workspace:

| Property | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `baseDir` | `string` | The root directory for scratchpad files. | OS tmpdir + random suffix |
| `maxTotalBytes` | `number` | The maximum total size allowed for the scratchpad in bytes. | 50MB |
| `maxFiles` | `number` | The maximum number of files allowed in the scratchpad. | 100 |

## Extension Points
The subsystem is designed to be integrated into agent workflows where cross-agent communication is required. Developers can extend the collaboration patterns by:
- **Custom Base Directories**: Pointing the scratchpad to persistent network storage for long-running or distributed collaborations.
- **Structured Data Patterns**: Implementing higher-level protocols on top of the basic file read/write operations (e.g., using JSON files for structured state sharing).

### Example Implementation
```typescript
const scratch = new Scratchpad({ 
  baseDir: '/tmp/yaaf-scratch',
  maxTotalBytes: 1024 * 1024 * 10 // 10MB limit
});

// Agent A: Writing research findings
await scratch.write('research.md', '## Auth Bug\nFound a vulnerability in the login flow.');

// Agent B: Reading findings to perform a fix
const findings = await scratch.read('research.md');

// Cleanup
await scratch.destroy();
```