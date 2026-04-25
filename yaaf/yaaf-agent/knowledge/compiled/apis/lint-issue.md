---
title: LintIssue
entity_type: api
summary: Represents a single detected linting issue, including its code, severity, message, and location.
export_name: LintIssue
source_file: src/knowledge/compiler/linter/types.ts
category: type
search_terms:
 - linter problem
 - knowledge base validation
 - article error
 - linting report item
 - broken link detection
 - orphaned article check
 - how to represent a lint error
 - data structure for lint issues
 - auto-fixable errors
 - lint issue properties
 - KB linter types
 - LintCode
 - LintSeverity
stub: false
compiled_at: 2026-04-24T17:17:33.943Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `LintIssue` type defines the data structure for a single problem identified by the YAAF Knowledge Base (KB) [Linter](../concepts/linter.md). Each `LintIssue` object contains detailed information about a specific error, warning, or informational point concerning a compiled article, such as a broken link, a missing [Frontmatter](../concepts/frontmatter.md) field, or an orphaned page. This structure is used to generate reports for developers and to provide the necessary data for automatic fixing of certain issues [Source 2].

## Signature

`LintIssue` is a TypeScript type object. Its definition and the related types it depends on are as follows [Source 2]:

```typescript
export type LintIssue = {
  /** Classification of this issue */
  code: LintCode;

  /** Human-readable description of the specific problem */
  message: string;

  severity: LintSeverity;

  /** The docId of the article that has this issue */
  docId: string;

  /** Frontmatter field name (for MISSING_REQUIRED_FIELD, INVALID_FIELD_VALUE) */
  field?: string;

  /**
   * For link issues: the target docId or wikilink text involved.
   */
  relatedTarget?: string;

  /** What to do to fix this issue */
  suggestion?: string;

  /**
   * Whether this issue can be fixed automatically by `KBLinter.fix()`.
   */
  autoFixable: boolean;

  /**
   * For UNLINKED_MENTION and NON_CANONICAL_WIKILINK:
   * The exact text to find in the article and its replacement.
   */
  fix?: {
    findText: string;
    replaceWith: string;
    /** Only replace the first occurrence (true for UNLINKED_MENTION) */
    firstOccurrenceOnly: boolean;
  };
};
```

### Related Types

The `LintIssue` type relies on the following enumerations for `code` and `severity` [Source 2]:

```typescript
/**
 * Every lint issue has a code that identifies the class of problem.
 */
export type LintCode =
  // Structural issues (error severity)
  | "BROKEN_WIKILINK"
  | "MISSING_REQUIRED_FIELD"
  | "UNKNOWN_ENTITY_TYPE"
  | "MISSING_ENTITY_TYPE"
  | "INVALID_FIELD_VALUE"
  // Linking issues (warning severity)
  | "ORPHANED_ARTICLE"
  | "NON_CANONICAL_WIKILINK"
  | "UNLINKED_MENTION"
  | "MISSING_RECIPROCAL_LINK"
  // Quality issues (info/warning severity)
  | "STUB_WITH_SOURCES"
  | "LOW_ARTICLE_QUALITY"
  | "BROKEN_SOURCE_REF"
  | "DUPLICATE_CANDIDATE"
  | "CONTRADICTORY_CLAIMS"
  // Plugin-defined rules
  | `PLUGIN_${string}`;

export type LintSeverity = "error" | "warning" | "info";
```

## Properties

- **`code`**: `LintCode`
  A machine-readable code that classifies the issue. Examples include `BROKEN_WIKILINK`, `ORPHANED_ARTICLE`, and `MISSING_REQUIRED_FIELD` [Source 2].

- **`message`**: `string`
  A human-readable description of the specific problem found [Source 2].

- **`severity`**: `LintSeverity`
  The severity level of the issue, which can be `"error"`, `"warning"`, or `"info"` [Source 2].

- **`docId`**: `string`
  The unique document identifier of the article that contains the issue [Source 2].

- **`field`**: `string` (optional)
  For issues related to frontmatter, this property holds the name of the field in question (e.g., for `MISSING_REQUIRED_FIELD` or `INVALID_FIELD_VALUE`) [Source 2].

- **`relatedTarget`**: `string` (optional)
  For linking-related issues, this specifies the target involved. Its meaning varies by the issue `code`:
  - `BROKEN_WIKILINK`: The target text that could not be resolved.
  - `NON_CANONICAL_WIKILINK`: The canonical `docId` that should have been used.
  - `MISSING_RECIPROCAL_LINK`: The `docId` of the article that should link back [Source 2].

- **`suggestion`**: `string` (optional)
  A human-readable string suggesting how to resolve the issue [Source 2].

- **`autoFixable`**: `boolean`
  A boolean flag indicating if the issue can be fixed automatically. Issues like `NON_CANONICAL_WIKILINK` and `UNLINKED_MENTION` are typically auto-fixable, while `BROKEN_WIKILINK` or `DUPLICATE_CANDIDATE` require human intervention [Source 2].

- **`fix`**: `object` (optional)
  An object containing the necessary information for an auto-fixer to perform a text replacement. It includes:
  - `findText`: The exact string to find in the article body.
  - `replaceWith`: The string to replace `findText` with.
  - `firstOccurrenceOnly`: A boolean indicating if only the first match should be replaced [Source 2].

## Examples

### Example 1: Broken Wikilink

This `LintIssue` represents a wikilink in the article `AgentArchitecture` that points to a non-existent article `MemoryComponent`.

```typescript
const brokenLinkIssue: LintIssue = {
  code: "BROKEN_WIKILINK",
  message: "Wikilink 'MemoryComponent' could not be resolved to a known article.",
  severity: "error",
  docId: "AgentArchitecture",
  relatedTarget: "MemoryComponent",
  suggestion: "Create the 'MemoryComponent' article or update the link to point to an existing article.",
  autoFixable: false,
};
```

### Example 2: Orphaned Article

This issue indicates that no other articles in the knowledge base link to the `RarePluginAPI` article.

```typescript
const orphanedArticleIssue: LintIssue = {
  code: "ORPHANED_ARTICLE",
  message: "Article 'RarePluginAPI' is not linked to from any other article.",
  severity: "warning",
  docId: "RarePluginAPI",
  suggestion: "Find relevant articles and add a wikilink to RarePluginAPI to improve discoverability.",
  autoFixable: false,
};
```

### Example 3: Auto-fixable Non-Canonical Wikilink

This issue flags the use of an alias `AgentLoop` [when](./when.md) the canonical title is `AgentRunLoop`. It includes a `fix` object to allow for automatic correction.

```typescript
const nonCanonicalLinkIssue: LintIssue = {
  code: "NON_CANONICAL_WIKILINK",
  message: "Used non-canonical wikilink 'AgentLoop' which redirects to 'AgentRunLoop'.",
  severity: "warning",
  docId: "CoreConcepts",
  relatedTarget: "AgentRunLoop", // The canonical docId
  suggestion: "Update the link to use the canonical form: AgentRunLoop.",
  autoFixable: true,
  fix: {
    findText: "AgentLoop",
    replaceWith: "AgentRunLoop",
    firstOccurrenceOnly: false,
  },
};
```

## Sources

[Source 1]: src/knowledge/compiler/linter/index.ts
[Source 2]: src/knowledge/compiler/linter/types.ts