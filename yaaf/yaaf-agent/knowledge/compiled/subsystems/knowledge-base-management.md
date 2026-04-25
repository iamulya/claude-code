---
title: Knowledge Base Management
summary: Provides robust, atomic file writing capabilities to prevent data corruption in knowledge base metadata files during compilation and updates.
primary_files:
 - src/knowledge/compiler/atomicWrite.ts
entity_type: subsystem
exports:
 - atomicWriteFile
search_terms:
 - atomic file write
 - prevent partial writes
 - knowledge base corruption
 - write-then-rename strategy
 - safe file saving
 - how to write KB files safely
 - .kb-registry.json update
 - transactional file operations
 - cross-device file move
 - EXDEV error handling
 - YAAF knowledge base integrity
 - crash-safe file operations
stub: false
compiled_at: 2026-04-24T18:14:41.466Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/atomicWrite.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Knowledge Base Management subsystem is responsible for ensuring the integrity and consistency of knowledge base artifacts on the filesystem. Its primary function is to prevent data corruption that can occur from partial writes if a process terminates unexpectedly while updating critical metadata files [Source 1]. This is crucial for files such as `.kb-registry.json`, `.kb-lint-report.json`, `ontology.yaml`, and `.kb-source-hashes.json`, which are essential for the correct operation of the [Knowledge Base Compiler](./knowledge-base-compiler.md) and runtime [Source 1].

## Architecture

The core of this subsystem is a "write-then-rename" strategy for file operations, which guarantees atomicity [Source 1].

The process is as follows:
1.  A temporary file is created with a unique name, typically by appending the process ID (PID) and a sequence number to the target filename (e.g., `{targetPath}.{pid}-{seq}.tmp`). This naming convention prevents collisions both within a single process and across multiple concurrent processes [Source 1].
2.  The new content is written completely to this temporary file.
3.  Once the write operation succeeds, the temporary file is atomically renamed to the final target path.

This approach ensures that if the process crashes at any point before the final rename, the original target file remains intact and unmodified. The leftover temporary file is harmless and will be ignored on subsequent runs [Source 1].

The system also includes fallback logic for specific filesystem edge cases. If a `rename` operation fails with an `EXDEV` error, which indicates the source and destination are on different mount points, the system falls back to a non-atomic `copyFile` followed by an `unlink` operation. While not truly atomic, this is a best-effort solution for cross-device moves. Additionally, it includes a single retry mechanism for `EPERM` errors on Windows, which often signify a transient file lock [Source 1].

## Integration Points

Other subsystems within YAAF, particularly the knowledge base compiler, rely on this subsystem to safely write and update metadata files. Any component that modifies the state of the knowledge base on disk uses these atomic operations to guarantee data consistency.

## Key APIs

The primary public API provided by this subsystem is the `[[[[[[[[atomicWriteFile]]]]]]]]` function.

### atomicWriteFile

`async function atomicWriteFile(targetPath: string, content: string): Promise<void>`

This function writes string `content` to a file at `targetPath` using the atomic write-then-rename strategy. It handles the creation, writing, and renaming of temporary files, as well as cleanup in case of an error [Source 1].

**Example Usage:**

```typescript
import { atomicWriteFile } from '...'; // path to atomicWrite.ts

const registryData = { /* ... */ };
const content = JSON.stringify(registryData, null, 2);

await atomicWriteFile('/path/to/.kb-registry.json', content);
```
[Source 1]

## Sources

[Source 1] `src/knowledge/compiler/atomicWrite.ts`