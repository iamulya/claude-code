---
title: Source Hash Manifest
summary: A file (`.kb-source-hashes.json`) that maps raw source files to their SHA-256 hashes, used by the differential compilation engine to detect changes.
entity_type: concept
related_subsystems:
 - subsystems/differential-compilation-engine
see_also:
 - concept:Differential Compilation Engine
 - api:DifferentialEngine
 - api:SourceHashManifestSchema
search_terms:
 - differential compilation
 - incremental build
 - how to detect file changes
 - SHA-256 file hash
 - .kb-source-hashes.json
 - what is a source hash manifest
 - YAAF compiler optimization
 - skip recompiling articles
 - stale article detection
 - orphan article detection
 - fast knowledge base builds
 - file content checksum
stub: false
compiled_at: 2026-04-25T00:24:25.963Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/differential.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The Source Hash Manifest is a JSON file, named `.kb-source-hashes.json`, that serves as a persistent record of the state of raw source files at the time of the last knowledge base compilation [Source 1]. It contains a mapping of every raw source file's path to its corresponding SHA-256 content hash [Source 1].

This manifest is a core component of the [Differential Compilation Engine](../subsystems/differential-compilation-engine.md), enabling true article-level differential compilation. By comparing the current state of source files against the stored hashes, the engine can efficiently determine which files have been added, changed, or deleted, thus identifying which specific articles need to be recompiled, deleted, or can be skipped entirely [Source 1]. This avoids the need to re-process every file and re-synthesize every article on each build, saving significant time and reducing LLM calls [Source 1].

## How It Works in YAAF

The Source Hash Manifest is created, read, and updated by the [DifferentialEngine](../apis/differential-engine.md) class as part of its diffing algorithm [Source 1]. The process is as follows:

1.  **Hashing Current Files:** The [DifferentialEngine](../apis/differential-engine.md) computes the SHA-256 hash for all current files in the raw source directory [Source 1].
2.  **Comparison:** It then loads the existing `.kb-source-hashes.json` manifest and compares the newly computed hashes against the stored ones. This comparison identifies the set of changed, added, and deleted source files [Source 1].
3.  **Stale/Orphan Detection:** Using the `compiled_from:` frontmatter field in each compiled article, the engine determines which articles depend on the modified source files. An article is marked `STALE` if any of its sources have changed, or `ORPHAN` if all of its source files have been deleted [Source 1]. Articles whose sources are unchanged are marked `CLEAN`.
4.  **Persistence:** After a compilation plan is computed, the [DifferentialEngine](../apis/differential-engine.md) updates the manifest with the new set of file hashes and saves it back to disk as `.kb-source-hashes.json` for the next run [Source 1].

The data structure of the manifest file is formally defined by the [SourceHashManifestSchema](../apis/source-hash-manifest-schema.md) [Source 1].

## See Also

*   [Differential Compilation Engine](../subsystems/differential-compilation-engine.md): The subsystem that utilizes the manifest to perform incremental builds.
*   [DifferentialEngine](../apis/differential-engine.md): The API class responsible for creating, reading, and updating the manifest.
*   [SourceHashManifestSchema](../apis/source-hash-manifest-schema.md): The schema that defines the structure of the manifest file.

## Sources

[Source 1] src/knowledge/compiler/differential.ts