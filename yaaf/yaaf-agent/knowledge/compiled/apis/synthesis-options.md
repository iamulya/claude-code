---
title: SynthesisOptions
entity_type: api
summary: Specifies configuration parameters for controlling the behavior of the Knowledge Synthesizer.
export_name: SynthesisOptions
source_file: src/knowledge/compiler/synthesizer/types.ts
category: type
search_terms:
 - knowledge synthesizer configuration
 - how to configure synthesis
 - synthesis concurrency
 - dry run synthesis
 - incremental compilation
 - skip articles during synthesis
 - synthesis progress callback
 - checkpoint and resume synthesis
 - stub article threshold
 - differential compilation options
 - onProgress callback
 - onArticleComplete hook
stub: false
compiled_at: 2026-04-24T17:42:48.326Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `SynthesisOptions` type defines a configuration object passed to the [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md) to control its behavior during a compilation run [Source 2]. It allows for customization of performance, output, incremental builds, and lifecycle callbacks [Source 2].

These options are used to manage aspects such as the number of concurrent [LLM](../concepts/llm.md) calls, whether to perform a "dry run" without writing files, and how to handle unchanged articles in an incremental build process [Source 2].

## Signature

`SynthesisOptions` is a TypeScript type alias for an object with the following properties [Source 2]:

```typescript
export type SynthesisOptions = {
  /**
   * Maximum number of articles to synthesize concurrently.
   * Higher = faster but uses more API quota. Default: 3.
   */
  concurrency?: number;

  /**
   * If true, don't write any files — return the plan + generated content
   * but don't touch the disk. Useful for previewing before a real run.
   */
  dryRun?: boolean;

  /**
   * Minimum confidence required to create a stub article for a
   * candidateNewConcept. Default: 0.7
   */
  stubConfidenceThreshold?: number;

  /**
   * Progress callback — called after each article is written.
   */
  onProgress?: (event: SynthesisProgressEvent) => void;

  /**
   * Per-article completion callback for checkpoint/resume support.
   *
   * Called immediately after each article is successfully written to disk
   * (action = 'created' | 'updated'). The compiler uses this to update a
   * crash-recovery checkpoint file so that a re-run after process death can
   * skip already-completed articles rather than re-synthesizing from scratch.
   *
   * The callback may be async (returns a Promise) or fire-and-forget (void).
   */
  onArticleComplete?: (docId: string) => void | Promise<void>;

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

## Examples

The following example demonstrates how to create a `SynthesisOptions` object to configure a synthesis run.

```typescript
import { KnowledgeSynthesizer, SynthesisOptions, SynthesisProgressEvent } from 'yaaf';

// Assume `synthesizer` is an instance of KnowledgeSynthesizer
// and `compilationPlan` is a valid plan object.

const options: SynthesisOptions = {
  // Process up to 5 articles in parallel
  concurrency: 5,

  // Do not write files to disk for this run
  dryRun: true,

  // Enable incremental mode to skip unchanged articles
  incrementalMode: true,

  // Provide a set of articles to skip explicitly
  skipDocIds: new Set(['concepts/deprecated-api.md']),

  // Log progress as each article starts
  onProgress: (event: SynthesisProgressEvent) => {
    if (event.type === 'article:started') {
      console.log(`[${event.action}] Synthesizing "${event.title}"...`);
    }
  },

  // Implement a callback for crash recovery checkpointing
  onArticleComplete: async (docId: string) => {
    console.log(`Finished writing ${docId}. Updating checkpoint.`);
    // In a real implementation, this would atomically update a progress file.
    // await updateCheckpointFile(docId);
  },
};

// const result = await synthesizer.synthesize(compilationPlan, options);
// console.log(`Synthesis preview complete in ${result.durationMs}ms.`);
```

## Sources

[Source 1]: src/knowledge/compiler/synthesizer/index.ts
[Source 2]: src/knowledge/compiler/synthesizer/types.ts