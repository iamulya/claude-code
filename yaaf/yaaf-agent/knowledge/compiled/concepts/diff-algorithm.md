---
title: Diff Algorithm
summary: The process used by the Differential Compilation Engine to compare current source files against a manifest and determine the `STALE`, `ORPHAN`, or `CLEAN` status of articles.
entity_type: concept
related_subsystems:
 - Differential Compilation Engine
see_also:
 - "[Differential Compilation Engine](../subsystems/differential-compilation-engine.md)"
 - "[Frontmatter](./frontmatter.md)"
 - "[docId](./doc-id.md)"
search_terms:
 - differential compilation
 - incremental build
 - how to skip article synthesis
 - stale article detection
 - orphan article cleanup
 - source file hashing
 - kb-source-hashes.json
 - compiled_from frontmatter
 - fast knowledge base builds
 - optimizing compilation
 - what does STALE mean in compiler
 - what does ORPHAN mean in compiler
 - article-level differential compilation
stub: false
compiled_at: 2026-04-25T00:18:11.900Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/differential.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The Diff Algorithm is the core logic within the [Differential Compilation Engine](../subsystems/differential-compilation-engine.md) responsible for true article-level incremental compilation [Source 1]. Its primary purpose is to determine which knowledge base articles need to be re-synthesized, which can be skipped, and which should be deleted, based on changes to the raw source files.

This algorithm solves the problem of inefficiently recompiling an entire knowledge base when only a few source files have changed. By operating at the article level, it avoids unnecessary and costly LLM calls for articles whose underlying content is unchanged, leading to faster and more cost-effective builds [Source 1].

## How It Works in YAAF

The Diff Algorithm is implemented within the `DifferentialEngine` class and follows a multi-step process to create a compilation plan [Source 1].

1.  **Hashing Current Files**: The engine first calculates a SHA-256 hash for every raw source file currently present in the knowledge base source directory [Source 1].

2.  **Manifest Comparison**: These new hashes are compared against a stored manifest, typically a file named `.kb-source-hashes.json`. This comparison identifies which source files have been added, deleted, or modified since the last compilation [Source 1].

3.  **Reverse Mapping**: The engine scans the [Frontmatter](./frontmatter.md) of each already-compiled article. It reads the `compiled_from` field to build a reverse map that links each compiled article back to the specific raw source files that contributed to its content [Source 1].

4.  **Status Determination**: Using the information from the previous steps, the algorithm classifies each article:
    *   **`STALE`**: An article is marked as `STALE` if any of its contributing source files (as determined from the `compiled_from` field) were identified as changed or added in the manifest comparison. These articles must be re-synthesized [Source 1].
    *   **`ORPHAN`**: An article is marked as `ORPHAN` if all of its contributing source files have been deleted. These compiled articles are no longer valid and are flagged for deletion [Source 1].
    *   **`CLEAN`**: Any article that is not `STALE` or `ORPHAN` is considered `CLEAN`. The synthesis step, including the LLM call, is skipped entirely for these articles [Source 1].

The final output is a compilation plan containing lists of `staleDocIds`, `cleanDocIds`, and `orphanDocIds`. The list of clean [docIds](./doc-id.md) is passed to the synthesizer's `skipDocIds` option to prevent unnecessary work [Source 1].

## See Also

*   [Differential Compilation Engine](../subsystems/differential-compilation-engine.md): The subsystem that implements and executes this algorithm.
*   [Frontmatter](./frontmatter.md): The `compiled_from` field within an article's frontmatter is a critical input for the algorithm.
*   [docId](./doc-id.md): The unique identifier for articles, used by the algorithm's output to specify which articles to skip, recompile, or delete.

## Sources

[Source 1] src/knowledge/compiler/differential.ts