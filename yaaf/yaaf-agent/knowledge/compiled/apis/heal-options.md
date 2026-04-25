---
title: HealOptions
summary: Defines configuration options for the Linter Heal Mode.
export_name: HealOptions
source_file: src/knowledge/compiler/heal.ts
category: type
entity_type: api
search_terms:
 - linter repair configuration
 - auto-fix lint issues
 - LLM-powered code healing
 - configure heal mode
 - dry run lint fixes
 - limit LLM calls during healing
 - progress callback for healing
 - how to configure healLintIssues
 - automatic knowledge base repair
 - linting options
 - auto-correct broken wikilinks
 - expand stub articles automatically
stub: false
compiled_at: 2026-04-24T17:11:15.572Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/heal.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `[[[[[[[[Heal]]]]]]]]Options` type defines a configuration object for the [[]] Heal Mode]], an [LLM](../concepts/llm.md)-powered feature that automatically repairs complex [Linting](../concepts/linting.md) issues [Source 1]. These options are passed to the `healLintIssues` function to control its behavior, such as preventing file modifications or limiting resource usage [Source 1].

Heal Mode is an opt-in feature designed to fix issues that require more than simple text replacement, including [Source 1]:
- `BROKEN_WIKILINK`: Finds the best matching article or removes a broken link.
- `STUB_WITH_SOURCES`: Re-synthesizes a stub article into a full one.
- `LOW_ARTICLE_QUALITY`: Uses an LLM to expand thin sections with more detail.
- `ORPHANED_ARTICLE`: Identifies related articles and suggests cross-links.

## Signature

`HealOptions` is a type alias for an object with the following properties:

```typescript
export type HealOptions = {
  /** Maximum LLM calls per heal run. Default: 20 */
  maxCalls?: number;
  /** Only report what would be healed — don't write changes. Default: false */
  dryRun?: boolean;
  /** Progress callback */
  onProgress?: (event: HealProgressEvent) => void;
};
```

### Properties

- **`maxCalls?: number`**
  - Specifies the maximum number of LLM calls that can be made during a single heal run.
  - This acts as a safeguard to prevent excessive API usage and cost.
  - The default value is `20` [Source 1].

- **`dryRun?: boolean`**
  - If set to `true`, the heal process will run and report the changes it would have made without actually writing any modifications to disk.
  - This is useful for previewing the results of a heal operation.
  - The default value is `false` [Source 1].

- **`onProgress?: (event: HealProgressEvent) => void`**
  - An optional callback function that receives progress updates during the heal process.
  - The function is invoked with a `HealProgressEvent` object, which provides information about the state of the operation, such as [when](./when.md) it starts and the number of issues being processed [Source 1].

## Examples

The following example demonstrates how to configure and use `HealOptions` when calling the `healLintIssues` function. It enables a dry run, sets a custom limit on LLM calls, and logs progress to the console.

```typescript
import {
  healLintIssues,
  makeKBLLMClient,
  // Assuming these are available from your compiler setup
  compiler,
  compiledDir,
  registry
} from 'yaaf';
import type { HealOptions, HealProgressEvent } from 'yaaf';

async function runHeal() {
  const llm = makeKBLLMClient();
  const lintReport = await compiler.lint();

  const options: HealOptions = {
    dryRun: true,
    maxCalls: 10,
    onProgress: (event: HealProgressEvent) => {
      if (event.type === 'heal:start') {
        console.log(
          `[Dry Run] Healing ${event.healable} of ${event.totalIssues} issues...`
        );
      }
    }
  };

  const healResult = await healLintIssues(
    llm,
    lintReport,
    compiledDir,
    registry,
    options
  );

  console.log(`Heal process complete. LLM calls: ${healResult.llmCalls}`);
  console.log('Details:', healResult.details);
}

runHeal();
```

## See Also

- `healLintIssues`: The function that consumes `HealOptions` to perform LLM-powered lint issue repairs.
- `HealProgressEvent`: The type for events passed to the `onProgress` callback.
- `HealResult`: The type for the object returned by `healLintIssues`.

## Sources

[Source 1] `src/knowledge/compiler/heal.ts`