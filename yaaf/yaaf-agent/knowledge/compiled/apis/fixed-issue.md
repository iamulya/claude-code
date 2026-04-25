---
title: FixedIssue
entity_type: api
summary: A type representing a record of a specific linting issue that was successfully autofixed.
export_name: FixedIssue
source_file: src/knowledge/compiler/linter/types.ts
category: type
search_terms:
 - autofix report
 - linting fix details
 - KBLinter fix result
 - what issues were fixed
 - AutoFixResult type
 - record of a fixed lint issue
 - linting summary
 - successful code correction
 - knowledge base linter
 - automatic correction log
 - docId of fixed article
stub: false
compiled_at: 2026-04-24T17:07:00.425Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `FixedIssue` type is a data structure that represents a single, successfully resolved [Linting](../concepts/linting.md) issue within the YAAF knowledge base [Source 2]. It serves as a log entry for an automatic fix operation, detailing which document was modified, what kind of issue was corrected, and a description of the change that was applied [Source 2].

`FixedIssue` objects are primarily used as elements in the `fixed` array property of the `AutoFixResult` type, which is the return value of an auto-fix process like `KB[[[[[[[[Linter]]]]]]]].fix()` [Source 2].

## Signature

`FixedIssue` is a TypeScript type alias for an object with the following properties [Source 2]:

```typescript
export type FixedIssue = {
  /** The unique identifier of the article that was modified. */
  docId: string;

  /** The classification code of the lint issue that was resolved. */
  code: LintCode;

  /** A human-readable description of the fix that was applied. */
  description: string;
};
```

## Examples

The following example shows an `AutoFixResult` object returned after an auto-fixer has run. The `fixed` array contains two `FixedIssue` objects, each detailing a successful correction.

```typescript
import type { AutoFixResult, FixedIssue } from 'yaaf';

const result: AutoFixResult = {
  fixedCount: 2,
  fixed: [
    {
      docId: 'api/Agent',
      code: 'NON_CANONICAL_WIKILINK',
      description: "Replaced non-canonical wikilink AgentClass with Agent."
    },
    {
      docId: 'guide/getting-started',
      code: 'UNLINKED_MENTION',
      description: "Added a wikilink to the first mention of 'AgentExecutor'."
    }
  ],
  skipped: [
    {
      issue: {
        docId: 'concept/memory',
        code: 'BROKEN_WIKILINK',
        message: "Wikilink ShortTermMemoryStore does not exist.",
        severity: 'error',
        relatedTarget: 'ShortTermMemoryStore',
        autoFixable: false,
      },
      reason: 'Issue is not auto-fixable and requires manual intervention.'
    }
  ]
};

console.log(`Successfully fixed ${result.fixedCount} issues.`);
result.fixed.forEach((fix: FixedIssue) => {
  console.log(`- [${fix.docId}] Fixed ${fix.code}: ${fix.description}`);
});
```

## See Also

*   `AutoFixResult`: The object returned by an auto-fix operation, which contains an array of `FixedIssue` objects.
*   `LintIssue`: The type representing a detected linting issue before it is fixed.
*   `LintCode`: The enum-like type for classifying different kinds of linting issues.

## Sources

[Source 1]: src/knowledge/compiler/Linter/index.ts
[Source 2]: src/knowledge/compiler/linter/types.ts