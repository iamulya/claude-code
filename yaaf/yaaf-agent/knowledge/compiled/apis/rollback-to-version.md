---
summary: Asynchronously rolls back an article to a specified previous version, saving the current version as a new entry before the rollback.
export_name: rollbackToVersion
source_file: src/knowledge/compiler/versioning.ts
category: function
title: rollbackToVersion
entity_type: api
search_terms:
 - revert article changes
 - restore previous document version
 - undo article compilation
 - knowledge base version control
 - article history management
 - how to roll back a document
 - versioning system API
 - restore from backup
 - document rollback
 - revert to timestamp
 - article versioning
stub: false
compiled_at: 2026-04-25T00:12:28.708Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/versioning.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `rollbackToVersion` function is part of the article versioning system in YAAF's knowledge base compiler [Source 1]. It allows for reverting a compiled article to a specific, previously saved version. The target version is identified by its unique timestamp.

A key feature of this function is that it preserves the current state of the article before performing the rollback. It does this by saving the current content as a new version entry. This ensures that no data is lost and the rollback operation itself is a versioned change [Source 1]. This is particularly useful for recovering from undesirable article updates, such as those produced by a degraded LLM output.

## Signature

The function has the following signature:

```typescript
export async function rollbackToVersion(
  outputPath: string,
  versionsDir: string,
  compiledDir: string,
  timestamp: number,
): Promise<boolean>;
```

**Parameters:**

| Parameter     | Type     | Description                                                                                                                            |
|---------------|----------|----------------------------------------------------------------------------------------------------------------------------------------|
| `outputPath`  | `string` | The full path to the compiled article file that needs to be rolled back.                                                               |
| `versionsDir` | `string` | The path to the root directory where all article versions are stored.                                                                  |
| `compiledDir` | `string` | The path to the root directory containing all compiled articles. This is used for resolving version subdirectory paths correctly [Source 1]. |
| `timestamp`   | `number` | The Unix timestamp (in milliseconds) of the version to which the article should be reverted.                                           |

**Returns:**

A `Promise<boolean>` that resolves to `true` if the rollback was successful, and `false` otherwise.

## Examples

The following example demonstrates how to list available versions for an article and then roll it back to the second-most-recent version.

```typescript
import { listVersions, rollbackToVersion } from 'yaaf';
import path from 'path';

const compiledDir = 'dist/kb/compiled';
const versionsDir = 'dist/kb/.versions';
const articlePath = path.join(compiledDir, 'concepts/agent.md');

async function revertAgentArticle() {
  try {
    // First, list available versions to find the one we want to roll back to.
    const versions = await listVersions(articlePath, versionsDir, compiledDir);

    if (versions.length < 2) {
      console.log('Not enough versions to roll back.');
      return;
    }

    // Roll back to the second most recent version.
    // The listVersions function returns versions sorted newest first.
    const targetVersion = versions[1];
    console.log(`Rolling back to version from timestamp: ${targetVersion.timestamp}`);

    const success = await rollbackToVersion(
      articlePath,
      versionsDir,
      compiledDir,
      targetVersion.timestamp
    );

    if (success) {
      console.log(`Successfully rolled back '${articlePath}' to version from ${new Date(targetVersion.timestamp).toISOString()}.`);
    } else {
      console.error('Rollback failed.');
    }
  } catch (error) {
    console.error('An error occurred during rollback:', error);
  }
}

revertAgentArticle();
```

## See Also

- `listVersions`: To retrieve a list of available versions and their timestamps for a given article.
- `writeWithVersioning`: The function responsible for creating new article versions upon content changes.
- `ArticleVersion`: The interface describing the metadata for a single article version.

## Sources

[Source 1]: src/knowledge/compiler/versioning.ts