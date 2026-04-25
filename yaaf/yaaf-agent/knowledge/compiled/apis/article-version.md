---
summary: Interface defining the structure of a saved article version, including its content hash, timestamp, word count, and size in bytes.
export_name: ArticleVersion
source_file: src/knowledge/compiler/versioning.ts
category: interface
title: ArticleVersion
entity_type: api
search_terms:
 - knowledge base versioning
 - article history
 - version control for documents
 - document snapshot
 - content hash
 - article metadata
 - rollback article
 - list article versions
 - file change detection
 - SHA-256 content check
 - document size tracking
 - versioning metadata
stub: false
compiled_at: 2026-04-25T00:04:39.825Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/versioning.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ArticleVersion` interface defines the metadata for a single, saved version of a compiled knowledge base article. It is a key component of the Knowledge Compiler's versioning system, which prevents data loss when an LLM produces a degraded or incorrect article update [Source 1].

Each time an article is written, the system checks if the new content's hash matches the existing version. If it differs, the old version is backed up, and metadata corresponding to the `ArticleVersion` interface is stored. This allows for tracking the history of an article and rolling back to previous states [Source 1].

This interface is primarily used as the return type for functions that interact with an article's history, such as `listVersions` [Source 1].

## Signature

The `ArticleVersion` interface is defined as follows [Source 1]:

```typescript
export interface ArticleVersion {
  hash: string;
  timestamp: number;
  wordCount: number;
  sizeBytes: number;
}
```

### Properties

- **`hash`**: `string`
  - A SHA-256 hash of the article's content. This is used to efficiently determine if an article's content has changed between writes [Source 1].

- **`timestamp`**: `number`
  - A Unix timestamp representing the time when this version was created and saved [Source 1].

- **`wordCount`**: `number`
  - The total number of words in the article for this specific version [Source 1].

- **`sizeBytes`**: `number`
  - The size of the article file in bytes for this specific version [Source 1].

## Examples

The most common use of `ArticleVersion` is to inspect the history of an article retrieved via the `listVersions` function.

```typescript
import { listVersions } from 'yaaf/knowledge';
import type { ArticleVersion } from 'yaaf/knowledge';

const articlePath = 'compiled/concepts/agent-architecture.md';
const versionsDir = '.kb-versions';
const compiledDir = 'compiled';

async function displayArticleHistory(articlePath: string) {
  try {
    // listVersions returns an array of ArticleVersion objects
    const versions: ArticleVersion[] = await listVersions(
      articlePath,
      versionsDir,
      compiledDir
    );

    if (versions.length === 0) {
      console.log(`No version history found for ${articlePath}`);
      return;
    }

    console.log(`Version history for ${articlePath}:`);
    versions.forEach((version, index) => {
      const date = new Date(version.timestamp).toLocaleString();
      console.log(
        `  [${index}] ${date} - ${version.wordCount} words, ${version.sizeBytes} bytes (hash: ${version.hash.substring(0, 8)}...)`
      );
    });
  } catch (error) {
    console.error('Failed to retrieve article versions:', error);
  }
}

displayArticleHistory(articlePath);
```

## See Also

- **Knowledge Compiler**: The subsystem responsible for article versioning.
- **`listVersions`**: A function that returns an array of `ArticleVersion` objects for a given article.
- **`writeWithVersioning`**: The function that creates new article versions.
- **`rollbackToVersion`**: A function that uses the `timestamp` from an `ArticleVersion` to restore a previous state of an article.

## Sources

[Source 1]: src/knowledge/compiler/versioning.ts