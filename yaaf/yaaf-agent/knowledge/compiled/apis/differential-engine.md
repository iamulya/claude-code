---
summary: The primary class for performing article-level differential compilation, computing which articles need recompilation, deletion, or can be skipped.
export_name: DifferentialEngine
source_file: src/knowledge/compiler/differential.ts
category: class
title: DifferentialEngine
entity_type: api
search_terms:
 - differential compilation
 - incremental build
 - skip recompiling articles
 - how to speed up knowledge base compilation
 - source hash manifest
 - stale article detection
 - orphan article cleanup
 - kb-source-hashes.json
 - computePlan
 - only compile changed files
 - knowledge base optimization
 - avoid unnecessary LLM calls
stub: false
compiled_at: 2026-04-24T17:02:06.606Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/differential.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `DifferentialEngine` class implements article-level differential compilation for the YAAF knowledge base [Source 1]. Its primary purpose is to determine which articles can be skipped during a build, which need to be recompiled, and which should be deleted, thereby optimizing the compilation process and reducing unnecessary [LLM](../concepts/llm.md) calls [Source 1].

This engine provides a more granular approach than file-level incremental checks. While file-level checks determine which source files to re-ingest, `DifferentialEngine` operates at the article level, ensuring that only articles affected by source changes are actually synthesized [Source 1].

The differential algorithm works as follows [Source 1]:
1.  It hashes all current raw source files.
2.  It compares these hashes against a stored manifest (`.kb-source-hashes.json`) to identify which files have been added, changed, or deleted.
3.  It scans the `compiled_from` [Frontmatter](../concepts/frontmatter.md) field in existing compiled articles to build a map of which source files contribute to each article.
4.  Based on this information, it categorizes articles:
    *   **STALE**: An article is marked stale if any of its source files have changed. These articles must be recompiled.
    *   **ORPHAN**: An article is marked as an orphan if all of its source files have been deleted. These compiled articles should be removed.
    *   **CLEAN**: All other articles are considered clean and can be skipped during synthesis.

The output of this process can be used to populate `CompileOptions.skipDocIds`, preventing the synthesizer from processing articles that have not changed [Source 1].

## Signature / Constructor

The `DifferentialEngine` is instantiated via the static `create` factory method [Source 1].

```typescript
class DifferentialEngine {
  /**
   * Creates a new instance of the DifferentialEngine.
   * @param kbDir - The root directory of the knowledge base.
   * @param rawDir - The directory containing raw source files.
   * @param compiledDir - The directory where compiled articles are stored.
   */
  static async create(
    kbDir: string,
    rawDir: string,
    compiledDir: string
  ): Promise<DifferentialEngine>;
}
```

## Methods & Properties

### computePlan()

Computes the differential compilation plan by comparing current source file hashes with the last known state [Source 1].

```typescript
interface CompilationPlan {
  staleDocIds: string[];
  cleanDocIds: string[];
  orphanDocIds: string[];
}

async computePlan(): Promise<CompilationPlan>;
```

**Returns:** A `Promise` that resolves to an object containing arrays of document IDs categorized as `stale`, `clean`, or `orphan` [Source 1].

### save()

Persists the newly computed source hash manifest to disk, typically in a file named `.kb-source-hashes.json` [Source 1]. This should be called after a successful compilation to update the baseline for the next run.

```typescript
async save(): Promise<void>;
```

## Examples

The following example demonstrates the standard [workflow](../concepts/workflow.md) for using `DifferentialEngine` to get a compilation plan and then persisting the new state [Source 1].

```typescript
// Assuming kbDir, rawDir, and compiledDir are defined
const diff = await DifferentialEngine.create(kbDir, rawDir, compiledDir);

// Compute which articles to recompile, skip, or delete
const plan = await diff.computePlan();

console.log('Articles to recompile:', plan.staleDocIds);
console.log('Articles to skip:', plan.cleanDocIds);
console.log('Articles to delete:', plan.orphanDocIds);

// After compilation, save the new manifest for the next run
await diff.save();
```

## Sources

[Source 1] src/knowledge/compiler/differential.ts