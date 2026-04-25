---
summary: Manages the lifecycle and historical versions of compiled knowledge articles, preventing data loss and enabling rollbacks through content hashing, backups, and version pruning.
primary_files:
 - src/knowledge/compiler/versioning.ts
 - src/knowledge/compiler/atomicWrite.js
title: Knowledge Versioning
entity_type: subsystem
exports:
 - writeWithVersioning
 - listVersions
 - rollbackToVersion
 - ArticleVersion
 - WriteResult
search_terms:
 - article history
 - knowledge base rollback
 - version control for articles
 - preventing LLM data loss
 - how to restore old article version
 - compiled article backup
 - content hashing for changes
 - pruning old versions
 - SHA-256 content check
 - atomic file writes
 - document version management
 - knowledge base snapshots
stub: false
compiled_at: 2026-04-25T00:29:27.649Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/versioning.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Purpose

The Knowledge Versioning subsystem provides a safety mechanism to prevent data loss when a compiled knowledge article is overwritten [Source 1]. When an [LLM](../concepts/llm.md) regenerates an article, there is a risk that the new version may be degraded or incorrect. This subsystem mitigates that risk by creating a historical record of each article's content over time, enabling developers to review changes and roll back to a previous state if necessary [Source 1].

Its primary responsibilities include:
1.  Detecting if new article content is identical to the existing version to avoid unnecessary writes.
2.  Creating a timestamped backup of the current article before writing a new version.
3.  Atomically writing the new article content to its destination.
4.  Automatically pruning the oldest versions to manage disk space [Source 1].

## Architecture

The subsystem's architecture is centered around file system operations that occur just before a compiled article is written to disk. The process is as follows:

1.  **Content Hashing**: Before any write operation, the subsystem calculates a SHA-256 hash of the new content. This hash is compared against the hash of the existing file on disk (if one exists) [Source 1]. If the hashes match, the write is skipped, and the operation is marked as "unchanged".
2.  **Backup**: If the content has changed, the existing article is copied to a dedicated backup directory. The backup is stored in a path structure like `.versions/{docId}/{timestamp}.md`, where `{docId}` corresponds to the article's unique identifier and `{timestamp}` is the time of the backup [Source 1].
3.  **Atomic Write**: The new content is written to its final destination using the [atomicWriteFile](../apis/atomic-write-file.md) utility. This ensures that the write operation is completed fully or not at all, preventing file corruption from partial writes.
4.  **Pruning**: After a new version is successfully written, the subsystem checks the backup directory for that article and deletes the oldest versions if the total number of backups exceeds a configured `maxVersions` limit [Source 1].

This entire lifecycle is managed through a set of exported functions that operate on file paths and content strings.

## Integration Points

The Knowledge Versioning subsystem is a core utility within the [Knowledge Compilation System](./knowledge-compilation-system.md).

*   **[Knowledge Synthesizer](./knowledge-synthesizer.md)**: This is the primary consumer of the versioning subsystem. After synthesizing new article content, the synthesizer calls `writeWithVersioning` to save the result to the `compiled/` directory, ensuring that the previous version is safely backed up [Source 1].
*   **[Core Utilities](./core-utilities.md)**: It relies on the [atomicWriteFile](../apis/atomic-write-file.md) function for safe file writing operations [Source 1].
*   **Developer Tools / [CLI](./cli.md)**: The `listVersions` and `rollbackToVersion` functions can be exposed through developer-facing tools to allow for manual inspection and management of an article's history.

## Key APIs

The public API for this subsystem consists of several functions and interfaces for managing article versions.

*   **`writeWithVersioning(outputPath, newContent, versionsDir, compiledDir, maxVersions)`**: The main entry point for writing an article. It orchestrates the hashing, backup, atomic write, and pruning logic. It returns a [WriteResult](../apis/write-result.md) object indicating whether the article was `created`, `updated`, or `unchanged` [Source 1].
*   **`listVersions(outputPath, versionsDir, compiledDir)`**: Retrieves a sorted list of all saved versions for a specific article. Each version is represented by an [ArticleVersion](../apis/article-version.md) object containing its hash, timestamp, word count, and size [Source 1].
*   **`rollbackToVersion(outputPath, versionsDir, compiledDir, timestamp)`**: Reverts an article to a specific historical version identified by its timestamp. Before performing the rollback, it saves the current version as a new backup to prevent data loss [Source 1].
*   **[ArticleVersion](../apis/article-version.md)**: An interface describing a single historical version, including its content hash, timestamp, and metadata like word count and file size [Source 1].
*   **[WriteResult](../apis/write-result.md)**: An interface describing the outcome of a `writeWithVersioning` operation, including the action taken and the content hashes involved [Source 1].

## Configuration

Configuration for this subsystem is managed by its consumers, typically the [Knowledge Synthesizer](./knowledge-synthesizer.md), by passing arguments to its functions:

*   **`versionsDir`**: The path to the root directory where all version backups are stored.
*   **`compiledDir`**: The path to the root directory for compiled articles. This is required to resolve relative paths correctly [Source 1].
*   **`maxVersions`**: An optional number that specifies the maximum number of historical versions to retain for any single article. Older versions are pruned automatically [Source 1].

## Sources

[Source 1] `src/knowledge/compiler/versioning.ts`