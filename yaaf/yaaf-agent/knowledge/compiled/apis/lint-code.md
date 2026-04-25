---
title: LintCode
entity_type: api
summary: Defines the specific codes for different types of linting issues found in knowledge base articles.
export_name: LintCode
source_file: src/knowledge/compiler/linter/types.ts
category: type
search_terms:
 - linting error codes
 - knowledge base validation
 - article issue types
 - broken link detection
 - orphaned page check
 - non-canonical link
 - unlinked entity mention
 - structural linting rules
 - quality linting rules
 - linking issue codes
 - plugin lint rules
 - how to identify KB problems
 - list of lint issues
stub: false
compiled_at: 2026-04-24T17:17:17.014Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `LintCode` type is a string literal type that enumerates all possible identifiers for issues detected by the YAAF knowledge base [Linter](../concepts/linter.md) [Source 2]. Each code represents a specific class of problem, allowing for programmatic identification and handling of different [Linting](../concepts/linting.md) issues [Source 2].

These codes are used as the `code` property within a `[[[[[[[[LintIssue]]]]]]]]` object. They are categorized into structural issues, linking issues, quality issues, and plugin-defined rules. The codes generally follow a naming convention of `NOUN_VERB` or `ADJECTIVE_NOUN` [Source 2].

## Signature

`LintCode` is a type alias for a set of string literals [Source 2].

```typescript
export type LintCode =
  // Structural issues (typically error severity)
  | "BROKEN_WIKILINK"
  | "MISSING_REQUIRED_FIELD"
  | "UNKNOWN_ENTITY_TYPE"
  | "MISSING_ENTITY_TYPE"
  | "INVALID_FIELD_VALUE"
  
  // Linking issues (typically warning severity)
  | "ORPHANED_ARTICLE"
  | "NON_CANONICAL_WIKILINK"
  | "UNLINKED_MENTION"
  | "MISSING_RECIPROCAL_LINK"
  
  // Quality issues (typically info or warning severity)
  | "STUB_WITH_SOURCES"
  | "LOW_ARTICLE_QUALITY"
  | "BROKEN_SOURCE_REF"
  | "DUPLICATE_CANDIDATE"
  | "CONTRADICTORY_CLAIMS"
  
  // Plugin-defined rules
  | `PLUGIN_${string}`;
```

### Code Descriptions

The following table describes each lint code based on the source documentation [Source 2].

| Category | Code | Description |
| --- | --- | --- |
| **Structural** | `BROKEN_WIKILINK` | A `wikilink` target was not found in the knowledge base registry. |
| | `MISSING_REQUIRED_FIELD` | A required [Frontmatter](../concepts/frontmatter.md) field is absent from an article. |
| | `UNKNOWN_ENTITY_TYPE` | The `entity_type` field has a value that is not a known [Entity Type](../concepts/entity-type.md). |
| | `MISSING_ENTITY_TYPE` | The `entity_type` frontmatter field is missing entirely. |
| | `INVALID_FIELD_VALUE` | A frontmatter field has a value that violates its type constraints (e.g., wrong enum value). |
| **Linking** | `ORPHANED_ARTICLE` | No other article contains a wikilink pointing to this one. |
| | `NON_CANONICAL_WIKILINK` | A wikilink uses an alias (`alias`) instead of the target's canonical title. |
| | `UNLINKED_MENTION` | The text mentions a known knowledge base entity by name, but does not use a `wikilink`. |
| | `MISSING_RECIPROCAL_LINK` | Article A links to Article B, but B does not link back to A, for relationships that should be reciprocal. |
| **Quality** | `STUB_WITH_SOURCES` | An article is marked as a stub but has available source material that could be used to expand it. |
| | `LOW_ARTICLE_QUALITY` | The article body is very short and is not explicitly marked as a stub. |
| | `BROKEN_SOURCE_REF` | The `compiled_from` path in an article's metadata points to a file that does not exist. |
| | `DUPLICATE_CANDIDATE` | Two or more articles have very similar titles, suggesting they might be duplicates. |
| | `CONTRADICTORY_CLAIMS` | Two or more articles make contradictory statements about the same entity. |
| **Plugin** | `PLUGIN_${string}` | A pattern for custom linting rules defined by plugins. The rule ID follows the `PLUGIN_` prefix. |

## Examples

### Using a LintCode in a LintIssue

`LintCode` is a required property of the `LintIssue` type. This example shows a `LintIssue` for a broken wikilink.

```typescript
import type { LintIssue, LintCode } from 'yaaf';

const brokenLinkIssue: LintIssue = {
  code: 'BROKEN_WIKILINK',
  message: "Wikilink 'NonExistentArticle' could not be resolved.",
  severity: 'error',
  docId: 'article-about-something',
  relatedTarget: 'NonExistentArticle',
  suggestion: 'Check if "NonExistentArticle" exists or correct the link.',
  autoFixable: false,
};
```

### Handling Different LintCodes

A function or a switch statement can be used to process lint issues based on their `LintCode`.

```typescript
import type { LintIssue, LintCode } from 'yaaf';

function getIssuePriority(code: LintCode): number {
  switch (code) {
    case 'BROKEN_WIKILINK':
    case 'MISSING_REQUIRED_FIELD':
      return 1; // Highest priority
    case 'ORPHANED_ARTICLE':
    case 'NON_CANONICAL_WIKILINK':
      return 2; // Medium priority
    case 'LOW_ARTICLE_QUALITY':
      return 3; // Low priority
    default:
      return 4; // Lowest priority
  }
}

const issue: LintIssue = { /* ... */ code: 'ORPHANED_ARTICLE' /* ... */ };
const priority = getIssuePriority(issue.code);
console.log(`Issue priority: ${priority}`); // Output: Issue priority: 2
```

## Sources

[Source 1]: src/knowledge/compiler/linter/index.ts
[Source 2]: src/knowledge/compiler/linter/types.ts