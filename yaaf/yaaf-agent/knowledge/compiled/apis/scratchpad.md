---
title: Scratchpad
entity_type: api
summary: A class providing a managed temporary directory for cross-agent collaboration and durable knowledge sharing.
export_name: Scratchpad
source_file: src/agents/scratchpad.ts
category: class
stub: false
compiled_at: 2026-04-16T14:14:10.854Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/scratchpad.ts
confidence: 1
---

## Overview
The `Scratchpad` class provides a managed temporary directory designed for cross-agent collaboration. It allows multiple agents to read and write files within a shared space without requiring explicit permission prompts for each operation. This enables durable knowledge sharing across different workers or agent instances during a session.

The implementation is inspired by coordinator scratchpads and is typically used to store research findings, intermediate data, or shared state that needs to persist across the lifecycle of multiple agent tasks.

## Signature / Constructor

### Constructor
```typescript
constructor(config?: ScratchpadConfig)
```

### ScratchpadConfig
The configuration object for initializing a scratchpad:

| Property | Type | Description |
| :--- | :--- | :--- |
| `baseDir` | `string` | (Optional) The base directory for scratchpad files. Defaults to the OS temporary directory with a random suffix. |
| `maxTotalBytes` | `number` | (Optional) The maximum total size of the scratchpad in bytes. Defaults to 50MB. |
| `maxFiles` | `number` | (Optional) The maximum number of files allowed in the scratchpad. Defaults to 100. |

## Methods & Properties

### write()
```typescript
write(filename: string, content: string): Promise<void>
```
Writes content to a file within the scratchpad directory.

### read()
```typescript
read(filename: string): Promise<string>
```
Reads the contents of a file from the scratchpad directory.

### list()
```typescript
list(): Promise<ScratchpadEntry[]>
```
Returns a list of all files currently stored in the scratchpad. Each entry includes:
* `name`: The filename.
* `size`: The file size in bytes.
* `lastModified`: A `Date` object representing the last modification time.

### destroy()
```typescript
destroy(): Promise<void>
```
Cleans up the scratchpad by removing the directory and all contained files. This is typically called at the end of a session.

## Examples

### Basic Usage
This example demonstrates how two different agents might use a shared scratchpad to communicate findings.

```typescript
import { Scratchpad } from 'yaaf';

const scratch = new Scratchpad({ baseDir: '/tmp/yaaf-scratch' });

// Agent A writes research findings:
await scratch.write('research.md', '## Auth Bug\nFound a race condition in the login flow.');

// Agent B reads the findings:
const findings = await scratch.read('research.md');
console.log(findings);

// List all files in the scratchpad:
const files = await scratch.list();
files.forEach(file => {
  console.log(`${file.name} (${file.size} bytes)`);
});

// Cleanup on session end:
await scratch.destroy();
```