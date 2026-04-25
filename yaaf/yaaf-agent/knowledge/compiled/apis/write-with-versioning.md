---
summary: Asynchronously writes an article to disk with versioning, checking for content identity, backing up existing files, and pruning old versions.
export_name: writeWithVersioning
source_file: src/knowledge/compiler/versioning.ts
category: function
title: writeWithVersioning
entity_type: api
search_terms:
 - save article with history
 - version control for compiled documents
 - prevent data loss on write
 - backup file before overwrite
 - prune old file versions
 - atomic write with backup
 - content-aware file writing
 - SHA-256 content check
 - how to version compiled articles
 - knowledge base versioning
 - file write idempotency
 - safe file update
stub: false
compiled_at: 2026-04-25T00:16:35.672Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/versioning.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `writeWithVersioning` function provides a safe mechanism for writing compiled knowledge base articles to the filesystem. It is designed to prevent data loss that might occur if an [LLM](../concepts/llm.md) generates a degraded or incorrect version of an article [Source 1].

Before writing, the function performs several checks and operations:
1.  It calculates the SHA-256 hash of the `newContent`.
2.  If a file already exists at `outputPath`, it compares the new hash with the hash of the existing file's content. If they are identical, the write is skipped, and the function returns a result with an `action` of `'unchanged'`.
3.  If the content is different, the existing file is copied to a versioning directory (e.g., `.versions/{docId}/{timestamp}.md`) as a backup.
4.  The new content is then written to the `outputPath` using an atomic operation to prevent partial writes.
5.  Finally, it prunes the version history for that article, removing the oldest versions to ensure no more than `maxVersions` are stored.

This process ensures that every change is versioned and that writes are idempotent for identical content, providing a robust history and rollback capability for compiled documents [Source 1].

## Signature

The function has the following signature:

```typescript
export async function writeWithVersioning(
  outputPath: string,
  newContent: string,
  versionsDir: string,
  compiledDir: string,
  maxVersions?: number,
): Promise<WriteResult>;
```

**Parameters:**

| Parameter     | Type     | Description                                                                                                                            |
| :------------ | :------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `outputPath`  | `string` | The absolute or relative path where the new article content should be written.                                                         |
| `newContent`  | `string` | The string content of the article to be written.                                                                                       |
| `versionsDir` | `string` | The path to the root directory where version backups are stored.                                                                       |
| `compiledDir` | `string` | The root directory for all compiled articles. This is used to correctly resolve relative paths for versioning subdirectories [Source 1]. |
| `maxVersions` | `number` | (Optional) The maximum number of old versions to retain. Defaults to an internal constant `DEFAULT_MAX_VERSIONS` [Source 1].            |

**Returns:**

A `Promise` that resolves to a [WriteResult](./write-result.md) object, indicating the outcome of the operation (`'created'`, `'updated'`, or `'unchanged'`) and including content hashes [Source 1].

## Examples

The following example demonstrates how to use `writeWithVersioning` to update a knowledge base article.

```typescript
import { writeWithVersioning } from 'yaaf';
import * as path from 'path';
import * as fs from 'fs/promises';

async function updateArticle() {
  const compiledDir = 'dist/kb';
  const versionsDir = path.join(compiledDir, '.versions');
  const articlePath = path.join(compiledDir, 'concepts/agent.md');
  const newContent = '# Agent\nAn agent is an autonomous entity that perceives its environment...';

  // Ensure directories exist
  await fs.mkdir(path.dirname(articlePath), { recursive: true });
  await fs.mkdir(versionsDir, { recursive: true });

  try {
    const result = await writeWithVersioning(
      articlePath,
      newContent,
      versionsDir,
      compiledDir,
      10 // Keep up to 10 old versions
    );

    console.log(`Write operation completed with status: ${result.action}`);
    // Example output: "Write operation completed with status: updated"

    if (result.action === 'updated') {
      console.log(`Previous hash: ${result.previousHash}`);
      console.log(`Current hash: ${result.currentHash}`);
    } else if (result.action === 'unchanged') {
      console.log(`Content is unchanged. Hash: ${result.currentHash}`);
    }

  } catch (error) {
    console.error('Failed to write article with versioning:', error);
  }
}

updateArticle();
```

## See Also

-   [WriteResult](./write-result.md): The return type of this function.
-   [atomicWriteFile](./atomic-write-file.md): The underlying utility used for safe file writes.
-   [docId](../concepts/doc-id.md): The concept of a unique document identifier, used implicitly in the versioning path structure.
-   `listVersions`: A related function for listing all saved versions of an article.
-   `rollbackToVersion`: A related function for restoring an article to a previous version.

## Sources

[Source 1] src/knowledge/compiler/versioning.ts