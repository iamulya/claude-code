---
export_name: LintCode
source_file: src/knowledge/compiler/linter/types.ts
category: type
summary: A union type defining the set of error, warning, and info codes used by the Knowledge Base Linter.
title: LintCode
entity_type: api
stub: false
compiled_at: 2026-04-16T14:25:41.284Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/types.ts
confidence: 0.98
---

## Overview
`LintCode` is a union type representing the unique identifiers for issues detected by the Knowledge Base Linter. Each code identifies a specific class of problem, ranging from structural errors that prevent compilation to quality warnings and informational suggestions. 

The codes follow specific naming patterns:
- Standard rules use `NOUN_VERB` or `ADJECTIVE_NOUN` patterns.
- Plugin-defined rules use the `PLUGIN_<RuleId>` pattern.

## Signature / Constructor

```typescript
export type LintCode =
  // Structural issues (error severity)
  | 'BROKEN_WIKILINK'
  | 'MISSING_REQUIRED_FIELD'
  | 'UNKNOWN_ENTITY_TYPE'
  | 'MISSING_ENTITY_TYPE'
  | 'INVALID_FIELD_VALUE'
  // Linking issues (warning severity)
  | 'ORPHANED_ARTICLE'
  | 'NON_CANONICAL_WIKILINK'
  | 'UNLINKED_MENTION'
  | 'MISSING_RECIPROCAL_LINK'
  // Quality issues (info/warning severity)
  | 'STUB_WITH_SOURCES'
  | 'LOW_ARTICLE_QUALITY'
  | 'BROKEN_SOURCE_REF'
  | 'DUPLICATE_CANDIDATE'
  | 'CONTRADICTORY_CLAIMS'
  // Plugin-defined rules
  | `PLUGIN_${string}`;
```

## Members

### Structural Issues (Error Severity)
These codes represent critical failures in the article structure or metadata.
- `BROKEN_WIKILINK`: A wikilink target was not found in the registry.
- `MISSING_REQUIRED_FIELD`: A required frontmatter field is absent.
- `UNKNOWN_ENTITY_TYPE`: The `entity_type` provided is not defined in the ontology.
- `MISSING_ENTITY_TYPE`: The `entity_type` frontmatter field is missing entirely.
- `INVALID_FIELD_VALUE`: A field contains an enum violation or type mismatch.

### Linking Issues (Warning Severity)
These codes represent problems with the connectivity of the knowledge graph.
- `ORPHANED_ARTICLE`: No other articles link to this article.
- `NON_CANONICAL_WIKILINK`: An alias was used in a wikilink instead of the canonical term.
- `UNLINKED_MENTION`: A known entity is mentioned in the text without using a wikilink.
- `MISSING_RECIPROCAL_LINK`: Article A links to B, but B does not link back to A for a relationship defined as reciprocal.

### Quality Issues (Info/Warning Severity)
These codes represent suggestions for improving content depth or consistency.
- `STUB_WITH_SOURCES`: An article marked as a stub has enough source material to be expanded.
- `LOW_ARTICLE_QUALITY`: The article body is very short but is not marked as a stub.
- `BROKEN_SOURCE_REF`: The path in the `compiled_from` field does not exist on disk.
- `DUPLICATE_CANDIDATE`: Two articles have very similar titles, suggesting a potential merge.
- `CONTRADICTORY_CLAIMS`: Different articles make contradictory claims about the same entity.

### Plugin Rules
- `PLUGIN_${string}`: Custom rules defined by external plugins.

## Examples

### Filtering Lint Issues
This example demonstrates how to filter a list of issues to find only broken links.

```typescript
import { LintIssue, LintCode } from './types';

function getBrokenLinks(issues: LintIssue[]): LintIssue[] {
  return issues.filter(issue => issue.code === 'BROKEN_WIKILINK');
}
```

### Handling Plugin Codes
This example shows how to identify if a code originated from a plugin.

```typescript
function isPluginIssue(code: LintCode): boolean {
  return code.startsWith('PLUGIN_');
}
```