---
summary: A raw-file level mechanism that decides which source files to re-ingest, preceding article-level differential compilation.
title: filterIncremental
entity_type: concept
related_subsystems:
 - subsystems/differential-compilation-engine
see_also:
 - concept:Differential Compilation Engine
 - api:DifferentialEngine
 - concept:Knowledge Ingestion Pipeline
search_terms:
 - incremental compilation
 - file-level diffing
 - source file re-ingestion
 - optimizing knowledge base builds
 - what is filterIncremental
 - differential compilation vs filterIncremental
 - skipping file ingestion
 - raw file filtering
 - knowledge ingestion optimization
 - pre-compilation filtering
stub: false
compiled_at: 2026-04-25T00:19:25.673Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/differential.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

`filterIncremental` is a mechanism within the YAAF [Knowledge Ingestion Pipeline](./knowledge-ingestion-pipeline.md) that operates at the raw source file level. Its purpose is to provide a preliminary optimization by determining which source files need to be re-ingested during a compilation process [Source 1]. It serves as a coarse-grained filter to avoid re-processing every source file on every build.

This concept is a precursor to the more advanced, article-level differential compilation performed by the [Differential Compilation Engine](../subsystems/differential-compilation-engine.md) [Source 1].

## How It Works in YAAF

The `filterIncremental` mechanism functions as an initial step in the compilation workflow. It inspects raw source files and decides which ones should be passed to the next stage of ingestion and extraction.

However, its optimization is limited. While it can prevent the re-ingestion of unchanged files, it does not prevent the articles derived from the ingested files from being proposed for synthesis. According to source documentation, even with `filterIncremental`, the extractor still runs on every ingested file, and all resulting articles are proposed for synthesis. This means no article is actually skipped at the synthesis (LLM call) stage based on this mechanism alone [Source 1].

This contrasts with the more sophisticated [DifferentialEngine](../apis/differential-engine.md), which implements true article-level differential compilation. The [DifferentialEngine](../apis/differential-engine.md) uses a manifest of source file hashes to identify which compiled articles are stale, clean, or orphaned, allowing the synthesizer to completely skip LLM calls for clean articles [Source 1]. Therefore, `filterIncremental` is a less efficient, file-level predecessor to the more effective article-level logic in the [Differential Compilation Engine](../subsystems/differential-compilation-engine.md).

## See Also

- [Differential Compilation Engine](../subsystems/differential-compilation-engine.md): The subsystem that provides true article-level differential compilation.
- [DifferentialEngine](../apis/differential-engine.md): The class that implements the advanced diffing logic.
- [Knowledge Ingestion Pipeline](./knowledge-ingestion-pipeline.md): The broader process in which `filterIncremental` operates.

## Sources

[Source 1]: src/knowledge/compiler/differential.ts