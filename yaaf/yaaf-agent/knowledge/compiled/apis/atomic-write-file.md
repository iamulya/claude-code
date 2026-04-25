---
title: atomicWriteFile
summary: Writes content to a target path atomically, primarily used for YAAF's knowledge base metadata files, employing a write-then-rename strategy to prevent partial-write corruption.
export_name: atomicWriteFile
source_file: src/knowledge/compiler/atomicWrite.ts
category: function
entity_type: api
search_terms:
 - atomic file write
 - prevent partial write corruption
 - safe file saving
 - write-then-rename strategy
 - temporary file writing
 - how to write knowledge base files safely
 - filesystem helper
 - avoid race conditions file write
 - cross-device link error
 - EXDEV fallback
 - atomicWrite.ts
 - writing .kb-registry.json
stub: false
compiled_at: 2026-04-24T16:50:42.418Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/atomicWrite.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/postprocess.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `atomicWriteFile` function is a filesystem utility that writes content to a file atomically. Its primary purpose is to prevent partial-write corruption, which can occur if a process is interrupted while writing to a file. This is especially critical for metadata files within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md), such as `.kb-registry.json`, `.kb-lint-report.json`, `ontology.yaml`, and `.kb-source-hashes.json` [Source 1].

The function implements a "write-then-rename" strategy. It first writes the content to a unique temporary file and, only after the write is successful, renames the temporary file to the final target path. The temporary filename includes the process ID (PID) and a sequence number (`{targetPath}.{pid}-{seq}.tmp`), guaranteeing uniqueness both within a single process and across multiple concurrent processes [Source 1].

If the process crashes during the initial write, the original target file remains untouched, and only a harmless temporary file is left behind, which is ignored on subsequent runs. If an error occurs at any stage, the function attempts to clean up the temporary file before throwing [Source 1].

In cases where the temporary file and target path are on different filesystems (mount points), a `rename` operation can fail with an `EXDEV` (cross-device link) error. `atomicWriteFile` handles this by falling back to a non-atomic `copyFile` followed by `unlink`. While this fallback is not truly atomic, it is the best-effort solution for cross-device operations. The function also includes a single retry mechanism for `EPERM` errors on Windows, which often indicate transient file locks [Source 1].

## Signature

The function takes a target path and the content to write, returning a promise that resolves [when](./when.md) the operation is complete [Source 1].

```typescript
export async function atomicWriteFile(
  targetPath: string, 
  content: string
): Promise<void>;
```

**Parameters:**

*   `targetPath` (string): The absolute or relative path to the final destination file.
*   `content` (string): The string content to be written to the file.

**Returns:**

*   `Promise<void>`: A promise that resolves upon successful completion of the atomic write.

**Throws:**

*   An error is thrown if the file write, rename, or fallback copy operation fails. The temporary file is cleaned up on error [Source 1].

## Examples

The most common use case is writing serialized JSON data to a metadata file within the knowledge base compilation process [Source 1].

```typescript
import { atomicWriteFile } from 'yaaf/fs'; // Fictional import path for example

async function saveRegistry(registryData: object) {
  const targetPath = '/path/to/project/.kb-registry.json';
  const content = JSON.stringify(registryData, null, 2);

  try {
    await atomicWriteFile(targetPath, content);
    console.log(`Successfully wrote registry to ${targetPath}`);
  } catch (error) {
    console.error(`Failed to write registry file:`, error);
  }
}

const myRegistry = {
  version: 1,
  articles: {
    'agent-architecture': {
      path: 'compiled/concepts/agent-architecture.md',
      title: 'Agent Architecture',
    },
  },
};

saveRegistry(myRegistry);
```

## Sources

[Source 1]: `src/knowledge/compiler/atomicWrite.ts`
[Source 2]: `src/knowledge/compiler/postprocess.ts`