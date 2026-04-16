---
export_name: listVersions
source_file: src/knowledge/compiler/versioning.ts
category: function
summary: Retrieves a chronological list of all saved versions for a specific knowledge article.
title: listVersions
entity_type: api
stub: false
compiled_at: 2026-04-16T14:27:34.692Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/versioning.ts
confidence: 1
---

## Overview
`listVersions` is a utility function within the YAAF knowledge compiler's versioning system. It retrieves a history of previously saved versions for a specific article, allowing for auditing or identifying targets for restoration. 

The function scans the specified versions directory for metadata associated with the article's path and returns an array of version descriptors sorted in descending chronological order (newest first). This is part of the framework's "Phase 1A" versioning strategy, designed to prevent data loss when an LLM produces a degraded or incorrect version of a knowledge article.

## Signature / Constructor

```typescript
export async function listVersions(
  outputPath: string,
  versionsDir: string,
): Promise<ArticleVersion[]>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `outputPath` | `string` | The file path to the current active version of the article. |
| `versionsDir` | `string` | The directory where historical versions and metadata are stored. |

### Return Type
The function returns a `Promise` that resolves to an array of `ArticleVersion` objects:

```typescript
export interface ArticleVersion {
  hash: string;        // SHA-256 hash of the article content
  timestamp: number;   // Unix timestamp of when the version was created
  wordCount: number;   // Number of words in the article
  sizeBytes: number;   // Size of the file in bytes
}
```

## Examples

### Retrieving Article History
This example demonstrates how to list all available versions for a specific compiled article to display a history log.

```typescript
import { listVersions } from 'yaaf/knowledge/compiler/versioning';

async function printArticleHistory(articlePath: string, versionsPath: string) {
  try {
    const versions = await listVersions(articlePath, versionsPath);
    
    console.log(`History for ${articlePath}:`);
    versions.forEach((version) => {
      const date = new Date(version.timestamp).toLocaleString();
      console.log(`[${date}] Hash: ${version.hash.substring(0, 8)}... (${version.sizeBytes} bytes)`);
    });
  } catch (error) {
    console.error('Failed to retrieve versions:', error);
  }
}
```

## See Also
- `writeWithVersioning`
- `rollbackToVersion`