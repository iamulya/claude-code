---
title: LintIssue
entity_type: api
summary: Represents a specific problem found during the knowledge base linting process, including severity and auto-fix metadata.
export_name: LintIssue
source_file: src/knowledge/compiler/linter/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:25:15.381Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/types.ts
confidence: 0.98
---

## Overview
`LintIssue` is a TypeScript type that defines the structure of a problem identified during the knowledge base (KB) linting process. It provides the necessary metadata for reporting, filtering, and programmatically resolving issues within KB articles. 

The linter categorizes issues into structural errors (e.g., broken links, missing fields), linking warnings (e.g., orphaned articles), and quality indicators (e.g., low article quality). Some issues include specific instructions for the `KBLinter` to apply automatic fixes.

## Signature / Constructor

```typescript
export type LintIssue = {
  code: LintCode;
  message: string;
  severity: LintSeverity;
  docId: string;
  field?: string;
  relatedTarget?: string;
  suggestion?: string;
  autoFixable: boolean;
  fix?: {
    findText: string;
    replaceWith: string;
    firstOccurrenceOnly: boolean;
  };
};
```

## Methods & Properties

### Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `code` | `LintCode` | A classification code identifying the class of problem (e.g., `BROKEN_WIKILINK`, `MISSING_REQUIRED_FIELD`). |
| `message` | `string` | A human-readable description of the specific problem. |
| `severity` | `LintSeverity` | The importance of the issue: `'error'`, `'warning'`, or `'info'`. |
| `docId` | `string` | The unique identifier of the article where the issue was found. |
| `field` | `string` (optional) | The specific frontmatter field name associated with the issue, used for field-level validation errors. |
| `relatedTarget` | `string` (optional) | For link-related issues, this contains the target `docId` or wikilink text involved in the conflict or missing relationship. |
| `suggestion` | `string` (optional) | A descriptive hint on how a human editor might resolve the issue. |
| `autoFixable` | `boolean` | Indicates if the issue can be resolved automatically by the framework's auto-fixer. |
| `fix` | `object` (optional) | Metadata used by the auto-fixer to perform text replacement without requiring a full re-parse of the article. |

### The fix Object
When `autoFixable` is true, the `fix` property provides the following:
*   `findText`: The exact string to locate within the article source.
*   `replaceWith`: The string that should replace the found text.
*   `firstOccurrenceOnly`: A boolean indicating if only the first instance of `findText` should be replaced (common for unlinked mentions).

## Examples

### Structural Error Example
An issue representing a missing required frontmatter field.

```typescript
const issue: LintIssue = {
  code: 'MISSING_REQUIRED_FIELD',
  message: "Article is missing required field 'entity_type'",
  severity: 'error',
  docId: 'agent-framework-overview',
  field: 'entity_type',
  autoFixable: false,
  suggestion: "Add 'entity_type: concept' to the frontmatter."
};
```

### Auto-fixable Warning Example
An issue representing a non-canonical wikilink that can be automatically corrected.

```typescript
const issue: LintIssue = {
  code: 'NON_CANONICAL_WIKILINK',
  message: "Link [[Agent]] should use canonical title [[BaseAgent]]",
  severity: 'warning',
  docId: 'getting-started',
  relatedTarget: 'BaseAgent',
  autoFixable: true,
  fix: {
    findText: '[[Agent]]',
    replaceWith: '[[BaseAgent]]',
    firstOccurrenceOnly: false
  }
};
```

## See Also
* `LintCode`
* `LintSeverity`
* `KBLinter`