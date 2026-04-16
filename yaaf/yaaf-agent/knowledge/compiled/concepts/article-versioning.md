---
summary: A safety mechanism that tracks changes to knowledge base articles using SHA-256 hashes and timestamped backups to prevent data loss during automated compilation.
title: Article Versioning
entity_type: concept
related_subsystems:
  - Knowledge Base Compiler
stub: false
compiled_at: 2026-04-16T14:27:28.453Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/versioning.ts
confidence: 1
---

## What It Is
Article Versioning is a Phase 1A safety mechanism within the YAAF knowledge base compiler. It is designed to prevent data loss that may occur when Large Language Models (LLMs) produce degraded or incomplete content during automated compilation passes. By maintaining a history of article states, the framework ensures that developers can recover previous iterations of documentation if an automated update results in a loss of quality.

## How It Works in YAAF
The versioning logic is implemented in `src/knowledge/compiler/versioning.ts` and follows a strict four-step lifecycle during the write process:

1.  **Content Comparison**: The system generates a SHA-256 hash of the new content and compares it against the hash of the existing file. If the hashes match, the write operation is skipped to save I/O and prevent redundant versioning.
2.  **Archival**: If the content has changed, the existing article is copied to a backup location before the new version is written. Backups are stored using the naming convention: `.versions/{docId}/{timestamp}.md`.
3.  **Commit**: The new version of the article is written to the primary output path.
4.  **Pruning**: The system checks the number of stored versions against a `maxVersions` threshold and deletes the oldest files to manage disk space.

### Data Structures
The framework tracks version metadata using the `ArticleVersion` interface:

```typescript
export interface ArticleVersion {
  hash: string
  timestamp: number
  wordCount: number
  sizeBytes: number
}
```

### Core Operations
The versioning subsystem provides three primary functions:
*   `writeWithVersioning`: Handles the conditional logic of hashing, backing up, and writing new content.
*   `listVersions`: Retrieves a list of all saved versions for a specific article, sorted newest first.
*   `rollbackToVersion`: Replaces the current article with a specific timestamped backup. Before performing a rollback, the system saves the current (potentially degraded) version as a new backup to ensure no state is permanently lost.

## Configuration
Developers can control the retention policy by adjusting the `maxVersions` parameter when calling the versioning functions. If not specified, the system defaults to a predefined framework constant.

```typescript
/**
 * Example of writing an article with a custom retention policy
 */
await writeWithVersioning(
  outputPath,
  newContent,
  versionsDir,
  10 // Keep only the 10 most recent versions
);
```

## Sources
* `src/knowledge/compiler/versioning.ts`