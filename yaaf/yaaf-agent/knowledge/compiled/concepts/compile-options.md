---
summary: Configuration options for the compilation process, including `skipDocIds` which is utilized by differential compilation to skip clean articles.
title: CompileOptions
entity_type: concept
related_subsystems:
 - subsystems/differential-compilation-engine
see_also:
 - concepts/differential-compilation-engine
 - concepts/doc-id
search_terms:
 - skip compilation
 - differential compilation options
 - how to skip clean articles
 - skipDocIds
 - incremental build configuration
 - knowledge base build optimization
 - reduce LLM calls during compilation
 - compiler settings
 - selective article synthesis
 - recompile only changed files
 - compiler flags
 - build parameters
stub: false
compiled_at: 2026-04-25T00:17:14.966Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/differential.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

`CompileOptions` is a configuration object that provides parameters to control the behavior of the YAAF knowledge base compilation pipeline. Its primary purpose is to enable optimizations by allowing parts of the compilation process to be selectively skipped.

This concept is central to implementing efficient, incremental builds of the knowledge base. By specifying which articles are already up-to-date, developers can avoid redundant processing and expensive [LLM](./llm.md) calls, significantly speeding up compilation times and reducing operational costs.

## How It Works in YAAF

The `CompileOptions` object is passed to the main compiler entry point. While it can contain various settings, its most prominent property is `skipDocIds`.

The `skipDocIds` property is an array of [document IDs](./doc-id.md) corresponding to articles that should be excluded from the synthesis step. The synthesizer component of the compiler checks this list and will not invoke an [LLM](./llm.md) for any article whose [docId](./doc-id.md) is present.

This mechanism is utilized by the [Differential Compilation Engine](../subsystems/differential-compilation-engine.md) subsystem to perform true article-level differential compilation [Source 1]. The process is as follows:

1.  The [DifferentialEngine](../apis/differential-engine.md) compares the hashes of current raw source files against a stored manifest to identify which files have changed.
2.  It then determines which compiled articles are "clean," meaning none of their contributing source files have been modified.
3.  The [docId](./doc-id.md)s of these clean articles are collected into a list.
4.  This list is then used to populate the `skipDocIds` property of the `CompileOptions` object for the current compilation run.

By using `CompileOptions.skipDocIds`, the system ensures that the synthesizer only spends resources on articles that are stale (changed) or new, while leaving clean articles untouched [Source 1].

## Configuration

A developer typically does not construct the `CompileOptions` object manually. Instead, it is populated by higher-level systems like the [Differential Compilation Engine](../subsystems/differential-compilation-engine.md). The following conceptual example illustrates how the output of the differential engine is used to create the options object that is then passed to the compiler.

```typescript
// Conceptual example of using DifferentialEngine to populate CompileOptions

import { DifferentialEngine } from 'path/to/differential';
import { compileKnowledgeBase, CompileOptions } from 'path/to/compiler';

const kbDir = './kb';
const rawDir = './kb/raw';
const compiledDir = './kb/compiled';

// 1. Initialize the differential engine
const diffEngine = await DifferentialEngine.create(kbDir, rawDir, compiledDir);

// 2. Compute the compilation plan to find clean, stale, and orphan articles
const plan = await diffEngine.computePlan();
// plan.cleanDocIds contains the list of articles to skip

// 3. Create CompileOptions with the list of clean docIds
const options: CompileOptions = {
  skipDocIds: plan.cleanDocIds,
  // ... other potential compile options
};

// 4. Pass the options to the main compilation function
await compileKnowledgeBase({
  // ... other compiler config
  compileOptions: options,
});

// 5. Persist the new source hashes for the next run
await diffEngine.save();
```

## See Also

*   [Differential Compilation Engine](../subsystems/differential-compilation-engine.md): The subsystem that calculates which articles to skip and populates `CompileOptions`.
*   [docId](./doc-id.md): The unique identifier for articles, used within the `skipDocIds` array.

## Sources

[Source 1] `src/knowledge/compiler/differential.ts`