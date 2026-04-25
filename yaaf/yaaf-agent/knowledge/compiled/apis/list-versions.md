---
summary: Asynchronously lists all saved versions of an article, ordered from newest to oldest.
export_name: listVersions
source_file: src/knowledge/compiler/versioning.ts
category: function
title: listVersions
entity_type: api
search_terms:
 - get article history
 - view previous versions
 - list article backups
 - version control for articles
 - how to see old article content
 - knowledge base versioning
 - retrieve version list
 - article rollback history
 - find all versions of a document
 - versioning API
 - document history
 - file version history
stub: false
compiled_at: 2026-04-25T00:08:42.503Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/versioning.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `listVersions` function is part of the YAAF knowledge base's article versioning system. It asynchronously retrieves a list of all previously saved versions for a specific compiled article. The versions are returned as an array of [ArticleVersion](./article-version.md) objects, sorted with the most recent version first.

This function is essential for inspecting the history of an article, which can be used to build user interfaces for version comparison, or to identify a specific version to restore using the `rollbackToVersion` function. The versioning system is designed to prevent data loss when an LLM generates a lower-quality or degraded version of an article [Source 1].

## Signature

```typescript
export async function listVersions(
  outputPath: string,
  versionsDir: string,
  compiledDir: string,
): Promise<ArticleVersion[]>;
```

### Parameters

| Name          | Type     | Description                                                                                                                            |
|---------------|----------|----------------------------------------------------------------------------------------------------------------------------------------|
| `outputPath`  | `string` | The full path to the compiled article file whose versions are to be listed.                                                            |
| `versionsDir` | `string` | The path to the root directory where all article versions are stored (e.g., `.versions/`).                                             |
| `compiledDir` | `string` | The path to the root directory where all compiled articles are stored (e.g., `compiled/`). This is required for correct path resolution. |

### Returns

A `Promise` that resolves to an array of [ArticleVersion](./article-version.md) objects, ordered from newest to oldest. Each object contains metadata about a specific version, such as its hash, timestamp, and size [Source 1].

## Examples

The following example demonstrates how to list the version history for a given article and print the details to the console.

```typescript
import { listVersions } from 'yaaf';
import * as path from 'path';

const KB_ROOT = '/path/to/your/knowledge-base';
const COMPILED_DIR = path.join(KB_ROOT, 'compiled');
const VERSIONS_DIR = path.join(KB_ROOT, '.versions');

async function showArticleHistory(articleRelativePath: string) {
  const articleFullPath = path.join(COMPILED_DIR, articleRelativePath);

  try {
    const versions = await listVersions(articleFullPath, VERSIONS_DIR, COMPILED_DIR);

    if (versions.length === 0) {
      console.log(`No previous versions found for ${articleRelativePath}`);
      return;
    }

    console.log(`Version history for ${articleRelativePath} (newest first):`);
    for (const version of versions) {
      const versionDate = new Date(version.timestamp).toISOString();
      console.log(
        `- Date: ${versionDate}\n` +
        `  Hash: ${version.hash}\n` +
        `  Size: ${version.sizeBytes} bytes\n` +
        `  Words: ${version.wordCount}`
      );
    }
  } catch (error) {
    console.error(`Error listing versions for ${articleRelativePath}:`, error);
  }
}

// Example usage:
showArticleHistory('concepts/agent.md');
```

## See Also

- [ArticleVersion](./article-version.md): The type definition for the objects returned by this function.
- `writeWithVersioning`: The function used to save new article versions.
- `rollbackToVersion`: The function used to restore an article to a previous version.

## Sources

[Source 1]: src/knowledge/compiler/versioning.ts