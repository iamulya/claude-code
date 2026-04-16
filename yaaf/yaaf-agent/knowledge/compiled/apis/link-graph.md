---
title: LinkGraph
entity_type: api
summary: A data structure representing the directed graph of links between articles in the knowledge base.
export_name: LinkGraph
source_file: src/knowledge/compiler/linter/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:25:11.082Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/index.ts
confidence: 0.9
---

## Overview
`LinkGraph` is a data structure used by the YAAF knowledge base compiler and linter to model the relationships between articles. It represents the knowledge base as a directed graph where nodes are articles and edges are the links between them. This structure is primarily used during the linting process to detect broken links, orphan articles, and other structural integrity issues within the documentation.

## Signature / Constructor
```typescript
export type LinkGraph = {
  // Internal structure defined in src/knowledge/compiler/linter/types.ts
};
```

## Examples
### Using LinkGraph in a Linter Context
The `LinkGraph` is typically consumed by linting functions to analyze the connectivity of the knowledge base.

```typescript
import type { LinkGraph, LintIssue } from 'yaaf';

/**
 * Example of a function that might consume a LinkGraph to 
 * find articles with no incoming links.
 */
function findOrphanArticles(graph: LinkGraph): LintIssue[] {
  const issues: LintIssue[] = [];
  // Logic to traverse the LinkGraph and identify orphans
  return issues;
}
```

## See Also
*   `LintIssue`
*   `LintReport`