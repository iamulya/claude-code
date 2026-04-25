---
summary: Interface defining the result of a versioned write operation, indicating if an article was created, updated, or remained unchanged.
export_name: WriteResult
source_file: src/knowledge/compiler/versioning.ts
category: interface
title: WriteResult
entity_type: api
search_terms:
 - versioned write result
 - file write status
 - created updated unchanged
 - knowledge compiler output
 - atomic write result
 - content hash comparison
 - article persistence status
 - writeWithVersioning return type
 - check if file changed
 - previous content hash
 - file write outcome
stub: false
compiled_at: 2026-04-25T00:16:33.992Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/versioning.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `WriteResult` interface represents the outcome of a versioned file write operation, typically used when persisting compiled knowledge articles. It provides a structured way to understand what happened during the write attempt: whether a new file was created, an existing file was updated with new content, or no change was made because the new content was identical to the existing content [Source 1].

This is returned by functions like `writeWithVersioning`, which uses SHA-256 hashing to compare content and avoid unnecessary writes or version history entries when an article has not changed [Source 1].

## Signature

The `WriteResult` interface is defined as follows [Source 1]:

```typescript
export interface WriteResult {
  action: "created" | "updated" | "unchanged";
  previousHash?: string;
  currentHash: string;
}
```

### Properties

- **`action`**: `"created" | "updated" | "unchanged"`
  - Describes the result of the write operation.
    - `"created"`: The file did not exist and was created.
    - `"updated"`: The file existed and its content was different, so it was updated.
    - `"unchanged"`: The file existed, but its content was identical to the new content, so no write occurred.

- **`previousHash`**: `string | undefined`
  - The SHA-256 hash of the previous file content. This property is only present if the `action` is `"updated"`.

- **`currentHash`**: `string`
  - The SHA-256 hash of the new content. For an `"unchanged"` action, this is the hash of the existing file.

## Examples

The following example demonstrates how to use the `WriteResult` returned by a versioned write function to log the outcome.

```typescript
import { writeWithVersioning } from 'yaaf'; // Assuming writeWithVersioning is exported
import type { WriteResult } from 'yaaf';

async function compileAndSaveArticle(path: string, content: string) {
  const result: WriteResult = await writeWithVersioning(
    path,
    content,
    './kb/.versions',
    './kb/compiled'
  );

  switch (result.action) {
    case 'created':
      console.log(`New article created at ${path} with hash ${result.currentHash}.`);
      break;
    case 'updated':
      console.log(`Article at ${path} updated from hash ${result.previousHash} to ${result.currentHash}.`);
      break;
    case 'unchanged':
      console.log(`Article at ${path} is already up-to-date (hash: ${result.currentHash}).`);
      break;
  }
}

// Example usage:
// await compileAndSaveArticle('./kb/compiled/example.md', 'New article content.');
```

## See Also

- The `writeWithVersioning` function, which returns a `Promise<WriteResult>`.
- [atomicWriteFile](./atomic-write-file.md), a utility for safely writing files to disk.

## Sources

[Source 1]: src/knowledge/compiler/versioning.ts