---
title: Clean Article
summary: An article identified by the differential compilation engine as unchanged, allowing its LLM synthesis phase to be skipped entirely.
entity_type: concept
related_subsystems:
 - subsystems/differential-compilation-engine
see_also:
 - apis/differential-engine
 - subsystems/differential-compilation-engine
 - concepts/llm-call
 - concepts/compile-options
search_terms:
 - skip LLM synthesis
 - differential compilation
 - incremental build for agents
 - how to speed up knowledge base compilation
 - avoid re-compiling unchanged articles
 - stale article detection
 - orphan article detection
 - source file hashing
 - CompileOptions.skipDocIds
 - what is a clean docId
 - optimizing LLM calls
 - true article-level differential compilation
 - unchanged source files
stub: false
compiled_at: 2026-04-25T00:17:10.485Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/differential.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A **Clean Article** is a compiled knowledge base article whose underlying source files have not changed since the last compilation run [Source 1]. This concept is central to YAAF's [Differential Compilation Engine](../subsystems/differential-compilation-engine.md), which optimizes the knowledge base build process by avoiding redundant work. By identifying articles as "clean," the framework can skip the resource-intensive synthesis step, which involves making an [LLM Call](./llm-call.md), thereby saving time and computational cost [Source 1].

This mechanism provides true article-level differential compilation, an improvement over methods that only check for changed raw files but still propose all articles for synthesis [Source 1].

## How It Works in YAAF

The [Differential Compilation Engine](../subsystems/differential-compilation-engine.md) determines if an article is clean through a diffing algorithm that compares the current state of raw source files against a manifest from the previous run [Source 1].

The process is as follows:

1.  **Hashing:** The engine calculates the SHA-256 hash of every raw source file in the knowledge base's source directory [Source 1].
2.  **Comparison:** These new hashes are compared against a stored manifest, `.kb-source-hashes.json`, to identify which files have been added, changed, or deleted [Source 1].
3.  **Source Mapping:** The engine reads the `compiled_from:` field in the [Frontmatter](./frontmatter.md) of each existing compiled article. This builds a reverse map that links each compiled article to the specific raw source files that contributed to its content [Source 1].
4.  **Classification:**
    *   An article is marked **STALE** if any of its contributing source files are in the set of changed files.
    *   An article is marked **ORPHAN** if all of its contributing source files have been deleted.
    *   An article that is neither STALE nor ORPHAN is classified as **CLEAN** [Source 1].
5.  **Skipping Synthesis:** The `docId`s of all clean articles are collected into a list. This list is then passed to the synthesizer via the `CompileOptions.skipDocIds` property. The synthesizer uses this list to bypass the [LLM Call](./llm-call.md) for every clean article, effectively leaving the existing compiled file untouched [Source 1].

This entire process is managed by the `DifferentialEngine` class, whose `computePlan()` method produces the lists of stale, clean, and orphan article IDs [Source 1].

## See Also

*   [CompileOptions](./compile-options.md)
*   [Differential Compilation Engine](../subsystems/differential-compilation-engine.md)
*   [DifferentialEngine](../apis/differential-engine.md)
*   [LLM Call](./llm-call.md)

## Sources

*   [Source 1]: src/knowledge/compiler/differential.ts