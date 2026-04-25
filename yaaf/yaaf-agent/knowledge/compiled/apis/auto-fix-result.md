---
title: AutoFixResult
entity_type: api
summary: The outcome of an attempt to automatically fix linting issues.
export_name: AutoFixResult
source_file: src/knowledge/compiler/linter/types.ts
category: type
search_terms:
 - linting auto-fix report
 - result of fixing lint issues
 - KBLinter.fix() return value
 - knowledge base linter
 - automatic lint correction
 - fixed lint issues list
 - skipped lint fixes
 - linting summary
 - how to see what linter fixed
 - auto-fixable lint problems
 - linting process outcome
stub: false
compiled_at: 2026-04-24T16:52:04.945Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `AutoFixResult` type represents the report generated after an automatic [Linting](../concepts/linting.md) fix process is run on the knowledge base [Source 2]. It provides a summary of which issues were successfully corrected and which were skipped.

This object is typically the return value of a method like `KB[[[[[[[[Linter]]]]]]]].fix()`, which attempts to resolve issues marked as `autoFixable` [Source 2]. It allows developers to programmatically inspect the results of an auto-fix pass, log the changes, and identify issues that still require manual intervention.

## Signature

`AutoFixResult` is a TypeScript object type with the following structure [Source 2]:

```typescript
export type AutoFixResult = {
  /** The total number of issues that were successfully fixed. */
  fixedCount: number;

  /** An array detailing each issue that was corrected. */
  fixed: FixedIssue[];

  /** An array of issues that could not be fixed, along with the reason. */
  skipped: Array<{ issue: LintIssue; reason:string }>;
};
```

The `fixed` property contains an array of `FixedIssue` objects, which have the following shape [Source 2]:

```typescript
export type FixedIssue = {
  /** The document ID of the article that was modified. */
  docId: string;

  /** The classification code of the fixed issue. */
  code: LintCode;

  /** A human-readable description of the fix that was applied. */
  description: string;
};
```

The `skipped` property contains the original `LintIssue` object and a string explaining why the fix was not applied [Source 2].

## Examples

Below is an example of an `AutoFixResult` object returned after a linting fix process. In this scenario, one issue was fixed, and another was skipped because it requires manual review.

```typescript
const fixReport: AutoFixResult = {
  fixedCount: 1,
  fixed: [
    {
      docId: "api/Agent",
      code: "NON_CANONICAL_WIKILINK",
      description: "Replaced wikilink AgentClass with canonical form Agent."
    }
  ],
  skipped: [
    {
      issue: {
        code: "BROKEN_WIKILINK",
        message: "Wikilink OldPluginAPI does not exist.",
        severity: "error",
        docId: "guides/migrating-plugins",
        relatedTarget: "OldPluginAPI",
        autoFixable: false,
        suggestion: "Remove the link or point it to a valid article."
      },
      reason: "Issue is not auto-fixable and requires manual intervention."
    }
  ]
};

console.log(`Successfully fixed ${fixReport.fixedCount} lint issue(s).`);
// Output: Successfully fixed 1 lint issue(s).

if (fixReport.skipped.length > 0) {
  console.log(`Skipped ${fixReport.skipped.length} issue(s) requiring manual review.`);
  // Output: Skipped 1 issue(s) requiring manual review.
}
```

## Sources

[Source 1]: src/knowledge/compiler/Linter/index.ts
[Source 2]: src/knowledge/compiler/linter/types.ts