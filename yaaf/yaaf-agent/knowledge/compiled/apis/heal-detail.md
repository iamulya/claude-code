---
title: HealDetail
summary: Provides detailed information for each issue processed by the Linter Heal Mode.
export_name: HealDetail
source_file: src/knowledge/compiler/heal.ts
category: type
entity_type: api
search_terms:
 - linter heal report
 - heal issue details
 - automatic code repair status
 - LLM code fix results
 - HealResult details property
 - what does healLintIssues return
 - lint issue outcome
 - healed skipped failed action
 - knowledge compiler repair
 - docId in heal detail
 - heal process logging
stub: false
compiled_at: 2026-04-24T17:11:01.860Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/heal.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `[[[[[[[[Heal]]]]]]]]Detail` type is a data structure that represents the outcome of an attempt to automatically fix a single [Linting](../concepts/linting.md) issue using the [LLM](../concepts/llm.md)-powered [[]] Heal Mode]] [Source 1].

An array of `HealDetail` objects is a key part of the `HealResult` object, which is returned by the `healLintIssues` function. Each `HealDetail` object provides a granular report on a specific issue, indicating whether it was successfully healed, skipped, or failed, along with a descriptive message [Source 1]. This allows for detailed logging and analysis of the healing process.

## Signature

`HealDetail` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type HealDetail = {
  /** The unique identifier of the document containing the issue. */
  docId: string;

  /** The specific lint issue code, e.g., "BROKEN_WIKILINK". */
  code: string;

  /** The result of the heal attempt. */
  action: "healed" | "skipped" | "failed";

  /** A human-readable message describing the outcome. */
  message: string;
};
```

### Properties

- **`docId`**: `string`
  - The identifier for the document where the lint issue was found.

- **`code`**: `string`
  - The string code identifying the type of lint issue, such as `BROKEN_WIKILINK` or `STUB_WITH_SOURCES`.

- **`action`**: `"healed" | "skipped" | "failed"`
  - A string literal indicating the final status of the heal attempt for this specific issue.
    - `healed`: The issue was successfully fixed by the LLM.
    - `skipped`: No action was taken, often because the issue type is not healable.
    - `failed`: An error occurred during the attempt to fix the issue.

- **`message`**: `string`
  - A message providing more context about the action taken. For example, it might explain why an issue was skipped or provide details on the fix that was applied.

## Examples

The primary way to interact with `HealDetail` objects is by processing the `details` array within a `HealResult` returned from `healLintIssues`.

The following example demonstrates how to iterate through the results of a heal operation and log the details for each processed issue.

```typescript
import { healLintIssues, HealResult, HealDetail } from 'yaaf';
// Assume llm, lintReport, compiledDir, and registry are already defined.

async function processHealResults() {
  const healResult: HealResult = await healLintIssues(
    llm,
    lintReport,
    compiledDir,
    registry
  );

  console.log(`Heal operation completed in ${healResult.durationMs}ms.`);
  console.log(`Healed: ${healResult.healed}, Skipped: ${healResult.skipped}`);
  console.log("--- Individual Issue Details ---");

  for (const detail of healResult.details) {
    logDetail(detail);
  }
}

function logDetail(detail: HealDetail) {
  const { docId, code, action, message } = detail;
  // Example output: "[HEALED] core/agent.ts (BROKEN_WIKILINK): Renamed link to Agent"
  console.log(`[${action.toUpperCase()}] ${docId} (${code}): ${message}`);
}

// Example of what a HealResult might contain:
const exampleHealResult: HealResult = {
  healed: 1,
  skipped: 1,
  llmCalls: 1,
  durationMs: 5432,
  details: [
    {
      docId: "core/agent.ts",
      code: "BROKEN_WIKILINK",
      action: "healed",
      message: "Renamed link OldAgentClass to Agent",
    },
    {
      docId: "plugins/new-plugin.ts",
      code: "LOW_ARTICLE_QUALITY",
      action: "failed",
      message: "LLM call failed due to rate limiting.",
    },
    {
      docId: "concepts/runtime.ts",
      code: "CONTRADICTORY_CLAIMS",
      action: "skipped",
      message: "This issue type requires manual review and cannot be healed automatically.",
    },
  ],
};
```

## See Also

- `HealResult`: The object that contains an array of `HealDetail` objects.
- `healLintIssues`: The function that performs the heal operation and returns a `HealResult`.

## Sources

[Source 1]: src/knowledge/compiler/heal.ts