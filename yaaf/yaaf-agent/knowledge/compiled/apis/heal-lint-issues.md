---
title: healLintIssues
summary: Runs the LLM-powered Linter Heal Mode on a given lint report.
export_name: healLintIssues
source_file: src/knowledge/compiler/heal.ts
category: function
entity_type: api
search_terms:
 - linter heal mode
 - auto-fix lint errors
 - LLM-powered code repair
 - fix broken wikilinks
 - expand stub articles
 - improve article quality automatically
 - add crosslinks to orphaned articles
 - knowledge base self-healing
 - lint report healing
 - programmatic lint fixes
 - C1 Linter Heal Mode
 - how to use --heal flag
stub: false
compiled_at: 2026-04-24T17:11:00.743Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/heal.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `healLintIssues` function is the entry point for the YAAF [Knowledge Compiler](../subsystems/knowledge-compiler.md)'s "[Linter](../concepts/linter.md) [Heal](../concepts/heal.md) Mode" [Source 1]. This mode uses an [LLM](../concepts/llm.md) to programmatically repair complex [Linting](../concepts/linting.md) issues that cannot be fixed with simple text replacement. It is an opt-in feature, typically activated via a `--heal` command-line flag in the compiler [Source 1].

Heal mode is designed to address specific categories of content and structural problems [Source 1]:

*   **`BROKEN_WIKILINK`**: The LLM attempts to find the best-matching valid article for a broken link or removes the link if no suitable target exists.
*   **`STUB_WITH_SOURCES`**: Triggers a re-synthesis of a stub article into a full article using its associated source material.
*   **`LOW_ARTICLE_QUALITY`**: Instructs the LLM to expand sections that are too brief or lack sufficient detail.
*   **`ORPHANED_ARTICLE`**: Identifies related articles within the knowledge base and suggests adding crosslinks to integrate the orphaned content.

Certain issues are explicitly outside the scope of heal mode and are deferred to other processes, such as human review. These include missing articles (where no source material is available) and contradictory claims between articles [Source 1].

## Signature

The function takes an [LLM Client](../concepts/llm-client.md), a lint report, and other contextual information, and returns a promise that resolves to a `HealResult` object detailing the actions taken [Source 1].

```typescript
export async function healLintIssues(
  llm: LLMCallFn,
  report: LintReport,
  compiledDir: string,
  registry: ConceptRegistry,
  options?: HealOptions
): Promise<HealResult>;
```

### Parameters

*   `llm: LLMCallFn`: An LLM client function used to perform the healing operations [Source 1].
*   `report: LintReport`: The lint report object containing the issues to be addressed [Source 1].
*   `compiledDir: string`: The path to the directory containing the compiled knowledge base articles [Source 1].
*   `registry: ConceptRegistry`: The [Concept Registry](../subsystems/concept-registry.md), providing context about the knowledge base structure [Source 1].
*   `options?: HealOptions`: Optional configuration for the healing process [Source 1].

### Configuration (`HealOptions`)

The `options` object allows for customizing the behavior of the heal process [Source 1].

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

### Return Value (`HealResult`)

The function returns a `HealResult` object summarizing the outcome [Source 1].

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

export type HealDetail = {
  docId: string;
  code: string;
  action: "healed" | "skipped" | "failed";
  message: string;
};
```

## Events

If an `onProgress` callback is provided in the `HealOptions`, `healLintIssues` will emit progress events during its execution [Source 1].

*   **`heal:start`**: Fired once at the beginning of the process.
    *   **Payload**: `{ type: "heal:start"; totalIssues: number; healable: number }`

## Examples

The following example demonstrates how to run the linter and then pass its report to `healLintIssues` for automated repair [Source 1].

```typescript
import { makeKBLLMClient } from './llmClient';
import { compiler } from './compiler'; // Assuming a compiler instance
import { healLintIssues } from './heal';
import { registry } from './ontology'; // Assuming a registry instance

async function runHeal() {
  const llm = makeKBLLMClient();
  const compiledDir = './compiled';

  // 1. Run the linter to get a report
  const lintReport = await compiler.lint();

  // 2. Pass the report to the heal function
  const healResult = await healLintIssues(llm, lintReport, compiledDir, registry);

  console.log(`Healed ${healResult.healed} issues.`);
  console.log(healResult.details);
}
```

## Sources

[Source 1] `src/knowledge/compiler/heal.ts`