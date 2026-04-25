---
title: Differential Compiler
entity_type: concept
summary: A mechanism within the YAAF knowledge compiler that identifies unchanged articles to avoid unnecessary and costly resynthesis.
related_subsystems:
 - knowledge_compilation_and_synthesis
search_terms:
 - incremental compilation
 - how to speed up knowledge base builds
 - avoid re-compiling unchanged files
 - differential engine
 - skip clean articles
 - mtime based compilation
 - source file change detection
 - optimizing synthesis
 - what is skipDocIds
 - incrementalMode option
 - YAAF compiler performance
 - fast knowledge base updates
stub: false
compiled_at: 2026-04-25T00:18:15.525Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
compiled_from_quality: unknown
confidence: 0.8
---

## What It Is

The Differential Compiler is an optimization mechanism within the YAAF knowledge compilation and synthesis subsystem. Its primary purpose is to improve performance and reduce costs by preventing the unnecessary recompilation of articles whose underlying source materials have not changed.

Re-synthesizing every article from scratch on each compilation run can be time-consuming and expensive, as it often involves numerous calls to LLM providers. The Differential Compiler addresses this by identifying which articles are "clean" (i.e., their sources are unchanged since the last compilation) and skipping the synthesis step for them. This enables fast, incremental updates to the knowledge base.

## How It Works in YAAF

The differential compilation logic is integrated into the Knowledge Synthesizer component. It determines which articles to skip based on options provided during the synthesis process. The results of this process are tracked in the `SynthesisResult` object, which contains a `skipped` count for articles that were bypassed by the "differential engine" [Source 1].

There are two primary methods used to identify unchanged articles:

1.  **Modification Time Comparison**: When the `incrementalMode` option is enabled, the synthesizer compares the file modification times (`mtime`) of an article's source files with the `mtime` of its corresponding compiled output file. If none of the source files are newer than the compiled article, the synthesis process for that article is skipped [Source 1].

2.  **Explicit Skip List**: The synthesizer accepts a `skipDocIds` option, which is a `Set` of `docId` strings. The component responsible for change detection (the "differential compiler") populates this set with the IDs of articles that are determined to be clean. The synthesizer then iterates through its compilation plan and skips any article whose `docId` is present in this set. For these articles, no LLM calls are made and no files are written to disk [Source 1].

## Configuration

A developer can control the differential compilation behavior through the `SynthesisOptions` object passed to the synthesizer.

The following TypeScript type definition illustrates the key configuration properties:

```typescript
export type SynthesisOptions = {
  // ... other options

  /**
   * If true, skip synthesis for articles whose source files are older than
   * the current compiled article (based on mtime). Default: false.
   */
  incrementalMode?: boolean;

  /**
   * Set of article docIds to skip entirely (no LLM call, no disk write).
   * Used by the differential compiler to bypass clean (unchanged) articles.
   * Articles in this set are counted as `skipped` in SynthesisResult.
   */
  skipDocIds?: Set<string>;
};
```
[Source 1]

-   Setting `incrementalMode: true` enables the file modification time check.
-   Providing a `Set` of article IDs to `skipDocIds` allows for a more explicit and potentially more complex change detection logic to be implemented upstream of the synthesizer.

## Sources

[Source 1] `src/knowledge/compiler/synthesizer/types.ts`