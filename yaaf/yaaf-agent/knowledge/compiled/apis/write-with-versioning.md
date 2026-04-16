---
export_name: writeWithVersioning
source_file: src/knowledge/compiler/versioning.ts
category: function
summary: Writes content to a file while automatically creating a timestamped backup if the content has changed.
title: writeWithVersioning
entity_type: api
stub: false
compiled_at: 2026-04-16T14:27:31.712Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/versioning.ts
confidence: 1
---

## Overview
`writeWithVersioning` is a utility function used during the knowledge compilation process to manage article persistence. It implements a "Phase 1A" versioning strategy designed to prevent data loss when an LLM produces degraded or incorrect content. 

The function performs the following steps:
1. Generates a SHA-256 hash of the new content.
2. Compares the new hash against the existing file (if it exists).
3. If the content is unchanged, it skips the write operation.
4. If the content has changed, it copies the existing file to a versioned backup directory (`.versions/{docId}/{timestamp}.md`).
5. Writes the new content to the target path.
6. Prunes older versions that exceed the specified `maxVersions` limit.

## Signature / Constructor

```typescript
export async function writeWithVersioning(
  outputPath: string,
  newContent: string,
  versionsDir: string,
  maxVersions: number = DEFAULT_MAX_VERSIONS,
): Promise<WriteResult>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `outputPath` | `string` | The destination path where the current version of the article should be written. |
| `newContent` | `string` | The raw string content to be written. |
| `versionsDir` | `string` | The directory where historical versions and backups are stored. |
| `maxVersions` | `number` | The maximum number of historical versions to retain before pruning. Defaults to `DEFAULT_MAX_VERSIONS`. |

### Related Types

#### WriteResult
The function returns a promise resolving to a `WriteResult` object:
```typescript
export interface WriteResult {
  action: 'created' | 'updated' | 'unchanged'
  previousHash?: string
  currentHash: string
}
```

#### ArticleVersion
Metadata for individual versions stored in the system:
```typescript
export interface ArticleVersion {
  hash: string
  timestamp: number
  wordCount: number
  sizeBytes: number
}
```

## Examples

### Basic Usage
This example demonstrates writing a new article and handling the result.

```typescript
import { writeWithVersioning } from 'src/knowledge/compiler/versioning';

const content = "# My Article\nThis is the content.";
const outputPath = "knowledge/articles/my-article.md";
const versionsDir = "knowledge/.versions";

const result = await writeWithVersioning(
  outputPath,
  content,
  versionsDir,
  5 // Keep 5 historical versions
);

if (result.action === 'updated') {
  console.log(`Article updated. Previous hash: ${result.previousHash}`);
} else if (result.action === 'unchanged') {
  console.log('No changes detected; file was not overwritten.');
}
```

## See Also
* `listVersions`: Retrieves the history of an article.
* `rollbackToVersion`: Restores a specific historical version to the main output path.