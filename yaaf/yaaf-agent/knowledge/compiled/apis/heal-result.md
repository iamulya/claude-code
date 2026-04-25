---
title: HealResult
summary: Encapsulates the outcome and statistics of a Linter Heal Mode run.
export_name: HealResult
source_file: src/knowledge/compiler/heal.ts
category: type
entity_type: api
search_terms:
 - linter repair results
 - heal mode output
 - automatic article fixing
 - LLM-powered linting
 - lint issue statistics
 - how to check heal status
 - what does healLintIssues return
 - HealDetail type
 - knowledge base self-healing
 - compiler heal report
 - dry run results
 - lint fix summary
stub: false
compiled_at: 2026-04-24T17:11:19.751Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/heal.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `[[[[[[[[Heal]]]]]]]]Result` type represents the complete output of an [LLM](../concepts/llm.md)-powered "Heal" operation performed by the `healLintIssues` function. This operation attempts to automatically fix certain types of [Linting](../concepts/linting.md) issues that cannot be resolved by simple text replacement, such as broken [Wikilinks](../concepts/wikilinks.md) or stub articles [Source 1].

A `HealResult` object provides a high-level summary of the run, including the number of issues successfully healed, the number skipped, the total LLM calls made, and the total duration. It also contains a detailed, per-issue breakdown in the `details` array, allowing for precise reporting on the outcome for each attempted fix [Source 1].

## Signature

`HealResult` is a type alias for an object with the following structure [Source 1]:

```typescript
export type HealResult = {
  /** Number of issues successfully healed */
  healed: number;
  /** Number of issues skipped (no action possible) */
  skipped: number;
  /** Number of LLM calls made */
  llmCalls: number;
  /** Per-issue details */
  details: HealDetail[];
  /** Total elapsed time (ms) */
  durationMs: number;
};
```

The `details` property is an array of `HealDetail` objects, which have the following structure [Source 1]:

```typescript
export type HealDetail = {
  /** The unique identifier for the document containing the issue. */
  docId: string;
  /** The lint issue code (e.g., "BROKEN_WIKILINK"). */
  code: string;
  /** The final status of the heal attempt for this issue. */
  action: "healed" | "skipped" | "failed";
  /** A human-readable message describing the outcome. */
  message: string;
};
```

## Examples

The following example demonstrates how to invoke the heal process and then inspect the `HealResult` object to report on the outcome.

```typescript
import { healLintIssues, HealResult } from 'yaaf';
// Assume llm, lintReport, compiledDir, and registry are already configured.

async function runAndReportHeal() {
  console.log('Starting heal process...');

  const healResult: HealResult = await healLintIssues(
    llm,
    lintReport,
    compiledDir,
    registry
  );

  console.log(`\n--- Heal Complete ---`);
  console.log(`Duration: ${healResult.durationMs}ms`);
  console.log(`LLM Calls: ${healResult.llmCalls}`);
  console.log(`Successfully Healed: ${healResult.healed}`);
  console.log(`Skipped: ${healResult.skipped}`);

  const failedCount = healResult.details.filter(d => d.action === 'failed').length;
  if (failedCount > 0) {
    console.warn(`\nEncountered ${failedCount} failures:`);
    for (const detail of healResult.details) {
      if (detail.action === 'failed') {
        console.warn(`- [${detail.docId}] ${detail.code}: ${detail.message}`);
      }
    }
  }
  console.log('---------------------');
}

runAndReportHeal();
```

## See Also

- `healLintIssues`: The function that performs the heal operation and returns a `HealResult`.
- `HealOptions`: Configuration options for the `healLintIssues` function.
- `HealProgressEvent`: Events emitted during the heal process to report progress.

## Sources

[Source 1]: src/knowledge/compiler/heal.ts