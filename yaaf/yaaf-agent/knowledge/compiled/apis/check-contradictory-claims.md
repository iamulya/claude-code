---
export_name: checkContradictoryClaims
source_file: src/knowledge/compiler/linter/checks.ts
category: function
title: checkContradictoryClaims
entity_type: api
summary: Detects factual contradictions between articles, specifically focusing on numeric disagreements in subject-predicate-object claims.
stub: false
compiled_at: 2026-04-16T14:24:59.182Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/checks.ts
confidence: 0.95
---

## Overview
`checkContradictoryClaims` is a deterministic linting function used by the YAAF knowledge base compiler to maintain factual consistency across a corpus of articles. It identifies instances where different articles make conflicting statements about the same subject.

The function utilizes pattern matching to identify claims in the form of "X is/has/uses N" (where N is a numeric value). It flags a linting issue when multiple articles provide different numeric values for the same subject-predicate relationship. As a static check, it does not require an LLM and is designed to run efficiently during the `kb lint` process.

## Signature
```typescript
export function checkContradictoryClaims(
  articles: ParsedCompiledArticle[],
  _registry: ConceptRegistry,
): LintIssue[]
```

### Parameters
*   `articles`: An array of `ParsedCompiledArticle` objects representing the full set of compiled knowledge base content.
*   `_registry`: The `ConceptRegistry` containing the ontology and entity definitions for the knowledge base.

### Returns
*   `LintIssue[]`: An array of objects describing the detected contradictions, including the location of the conflict and the nature of the discrepancy.

## Examples

### Basic Usage
This example demonstrates how to invoke the check within a linting pipeline.

```typescript
import { checkContradictoryClaims } from 'src/knowledge/compiler/linter/checks';

// Assuming articles have been parsed and the registry is initialized
const contradictions = checkContradictoryClaims(allArticles, conceptRegistry);

if (contradictions.length > 0) {
  contradictions.forEach(issue => {
    console.error(`Factual conflict detected: ${issue.message}`);
  });
}
```

## See Also
* `checkDuplicateCandidates`
* `checkLowArticleQuality`