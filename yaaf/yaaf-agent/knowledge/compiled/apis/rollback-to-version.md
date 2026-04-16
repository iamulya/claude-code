---
export_name: rollbackToVersion
source_file: src/knowledge/compiler/versioning.ts
category: function
summary: Reverts a knowledge article to a previous state using a specified version timestamp.
title: rollbackToVersion
entity_type: api
stub: false
compiled_at: 2026-04-16T14:27:35.857Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/versioning.ts
confidence: 1
---

## Overview
`rollbackToVersion` is a utility function within the YAAF knowledge compiler's versioning system. It allows for the restoration of a compiled article to a specific historical state identified by a timestamp. 

This function is designed to prevent data loss in LLM-powered workflows, specifically in cases where a newly generated article is degraded or lower in quality than a previous version. To maintain a complete audit trail, the function saves the current state of the article as a new version before performing the rollback operation.

## Signature
```typescript
export async function rollbackToVersion(
  outputPath: string,
  versionsDir: string,
  timestamp: number,
): Promise<boolean>
```

### Parameters
- `outputPath`: The filesystem path to the active article that will be overwritten.
- `versionsDir`: The directory where historical versions are stored (typically organized by document ID).
- `timestamp`: The unique Unix timestamp identifying the specific version to be restored.

### Returns
- `Promise<boolean>`: Returns `true` if the rollback was successful.

## Examples

### Reverting an Article
This example demonstrates how to revert a specific article to a known good state using a timestamp retrieved from a version list.

```typescript
import { rollbackToVersion } from 'yaaf/knowledge/compiler/versioning';

const outputPath = 'dist/knowledge/agents.md';
const versionsDir = 'dist/knowledge/.versions/agents';
const targetTimestamp = 1715342400000; // Example timestamp

async function handleRollback() {
  const success = await rollbackToVersion(
    outputPath,
    versionsDir,
    targetTimestamp
  );

  if (success) {
    console.log('Article successfully reverted to version:', targetTimestamp);
  } else {
    console.error('Failed to perform rollback.');
  }
}
```

## See Also
- `writeWithVersioning`: The primary function for writing articles and creating backups.
- `listVersions`: Used to retrieve the available timestamps for a specific article.