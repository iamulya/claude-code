---
title: LintSeverity
entity_type: api
summary: Specifies the severity level (e.g., error, warning, info) of a linting issue.
export_name: LintSeverity
source_file: src/knowledge/compiler/linter/types.ts
category: type
search_terms:
 - linting levels
 - issue severity
 - error warning info
 - knowledge base linter
 - lint issue classification
 - compiler error levels
 - what are the lint severities
 - how to classify lint issues
 - LintIssue severity property
 - knowledge base quality control
 - KB validation levels
stub: false
compiled_at: 2026-04-24T17:17:45.327Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`LintSeverity` is a TypeScript string literal type that defines the possible severity levels for a [Linting](../concepts/linting.md) issue identified by the YAAF Knowledge Base (KB) [Linter](../concepts/linter.md) [Source 2]. It is a core component of the `LintIssue` type, classifying each issue as an "error", "warning", or "info" [Source 2].

This classification helps developers and automated systems prioritize and handle KB quality problems. For example:
-   **`error`**: Typically used for structural or critical issues that can break KB functionality, such as a broken wikilink or a missing required [Frontmatter](../concepts/frontmatter.md) field [Source 2].
-   **`warning`**: Used for problems that degrade KB quality or violate best practices but do not break functionality, such as an orphaned article or the use of a non-canonical wikilink [Source 2].
-   **`info`**: Used for suggestions or minor quality issues, such as an article being a stub that could be expanded [Source 2].

## Signature

The type is a union of three possible string literals [Source 2].

```typescript
export type LintSeverity = "error" | "warning" | "info";
```

## Examples

`LintSeverity` is used as the type for the `severity` property within a `LintIssue` object.

```typescript
import type { LintIssue, LintSeverity } from 'yaaf';

// Example of an 'error' severity issue
const brokenLinkIssue: LintIssue = {
  code: 'BROKEN_WIKILINK',
  message: "Wikilink 'NonExistentArticle' does not resolve to a known article.",
  severity: 'error', // <-- Usage
  docId: 'some-article',
  relatedTarget: 'NonExistentArticle',
  autoFixable: false,
};

// Example of a 'warning' severity issue
const orphanedArticleIssue: LintIssue = {
  code: 'ORPHANED_ARTICLE',
  message: "Article 'some-article' is not linked to from any other article.",
  severity: 'warning', // <-- Usage
  docId: 'some-article',
  autoFixable: false,
};

// Example of an 'info' severity issue
const lowQualityIssue: LintIssue = {
  code: 'LOW_ARTICLE_QUALITY',
  message: "Article body is very short and not marked as a stub.",
  severity: 'info', // <-- Usage
  docId: 'another-article',
  autoFixable: false,
};
```

## See Also

-   `LintIssue`: The interface that describes a single linting problem, which includes a `severity` property of type `LintSeverity`.
-   `LintCode`: The type that defines the specific machine-readable code for a linting issue.

## Sources

[Source 1] src/knowledge/compiler/linter/index.ts
[Source 2] src/knowledge/compiler/linter/types.ts