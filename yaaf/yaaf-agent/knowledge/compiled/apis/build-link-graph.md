---
export_name: buildLinkGraph
source_file: src/knowledge/compiler/linter/checks.ts
category: function
title: buildLinkGraph
entity_type: api
summary: Builds a bidirectional link graph from compiled articles to support linting checks like orphan detection and reciprocal link validation.
stub: false
compiled_at: 2026-04-16T14:24:53.352Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/checks.ts
confidence: 1
---

## Overview
`buildLinkGraph` is a utility function used within the YAAF knowledge base compiler's linting subsystem. It processes a collection of compiled articles and a concept registry to construct a bidirectional `LinkGraph`. 

This graph is a prerequisite for several static linting checks that require global knowledge of the relationships between articles, specifically:
*   **Orphan Detection**: Identifying articles that are not linked to by any other article.
*   **Reciprocal Link Validation**: Ensuring that if Article A links to Article B, and the ontology defines a reciprocal relationship, Article B also links back to Article A.

The function is designed to be deterministic and fast, suitable for execution during every invocation of the knowledge base linting process.

## Signature
```typescript
export function buildLinkGraph(
  articles: ParsedCompiledArticle[],
  registry: ConceptRegistry,
): LinkGraph
```

### Parameters
*   `articles`: An array of `ParsedCompiledArticle` objects representing the fully parsed and processed articles in the knowledge base.
*   `registry`: A `ConceptRegistry` containing the canonical list of entities and their metadata.

### Returns
*   `LinkGraph`: A data structure mapping the connections (incoming and outgoing wikilinks) between all articles in the provided set.

## Examples

### Basic Usage
This example demonstrates how to generate a link graph during a custom linting workflow.

```typescript
import { buildLinkGraph } from 'yaaf/knowledge/compiler/linter/checks';

// Assuming articles have been parsed and the registry is initialized
const articles = getParsedArticles();
const registry = getConceptRegistry();

// Construct the graph
const graph = buildLinkGraph(articles, registry);

// Use the graph to check for orphaned articles
articles.forEach(article => {
  const issue = checkOrphanedArticle(article, graph);
  if (issue) {
    console.warn(`Orphan found: ${article.frontmatter.title}`);
  }
});
```

## See Also
*   `checkOrphanedArticle`
*   `checkMissingReciprocalLinks`
*   `extractWikilinks`