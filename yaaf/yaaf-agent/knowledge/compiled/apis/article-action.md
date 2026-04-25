---
summary: A type representing the intended operation for a knowledge base article within a compilation plan.
export_name: ArticleAction
source_file: src/knowledge/compiler/extractor/types.js
category: type
title: ArticleAction
entity_type: api
search_terms:
 - knowledge base compilation
 - article plan action
 - compilation plan operation
 - create or update article
 - concept extractor types
 - static analysis plan
 - knowledge compiler action
 - article lifecycle
 - what is ArticleAction
 - ArticlePlan action type
 - document generation plan
 - wiki build step
stub: false
compiled_at: 2026-04-24T16:49:45.677Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`ArticleAction` is a string literal type used within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) subsystem. It specifies the operation to be performed on a knowledge base article, such as creating a new article or updating an existing one [Source 1].

This type is a key property of the `ArticlePlan` type, which outlines the work required for a single article. A collection of `ArticlePlan` objects forms a `CompilationPlan`, which represents the complete set of changes to be applied to the knowledge base. `ArticleAction` thus provides the verb for each planned change.

## Signature

The `ArticleAction` type is exported from the main package index but is defined within the [Knowledge Compiler](../subsystems/knowledge-compiler.md)'s internal types [Source 1]. While the exact string literals are not detailed in the provided source, they represent discrete operations like `'create'` or `'update'`.

```typescript
// Re-exported from the main package index
export type { ArticleAction } from "./types.js";
```

## Examples

The following example illustrates how `ArticleAction` would be used within a hypothetical `ArticlePlan` object to signify whether an article needs to be created or updated.

```typescript
import type { ArticlePlan, ArticleAction } from 'yaaf';

// This is a hypothetical data structure for illustration purposes.

// A plan to create a new article for a newly detected API entity.
const planForNewArticle: ArticlePlan = {
  action: 'create', // ArticleAction: specifies creation
  entityType: 'api',
  exportName: 'MyNewFunction',
  sourceFile: 'src/modules/new-feature.ts',
  // ... other details for the new article
};

// A plan to update an existing article because its source code changed.
const planForExistingArticle: ArticlePlan = {
  action: 'update', // ArticleAction: specifies update
  entityType: 'concept',
  title: 'Core Concepts',
  // ... other details for the update
};
```

## See Also

*   `ArticlePlan`: A type that describes the planned action and metadata for a single knowledge base article.
*   `CompilationPlan`: A type representing the full set of `ArticlePlan` objects to be executed by the knowledge compiler.

## Sources

[Source 1]: src/knowledge/compiler/extractor/index.ts