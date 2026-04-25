---
summary: Defines configuration options for the post-synthesis processing steps, including token budget and feature toggles.
export_name: PostProcessOptions
source_file: src/knowledge/compiler/postprocess.ts
category: type
title: PostProcessOptions
entity_type: api
search_terms:
 - configure knowledge base compiler
 - article token limit
 - disable wikilink resolution
 - turn off article splitting
 - knowledge base post-processing
 - segmentation options
 - token budget setting
 - control article size
 - compiler feature flags
 - post-synthesis configuration
 - resolveLinks option
 - segmentArticles option
stub: false
compiled_at: 2026-04-24T17:29:20.327Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/postprocess.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `PostProcessOptions` type defines a configuration object for controlling the post-synthesis processing steps within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) [Source 1]. These steps are applied to every synthesized article after the [LLM](../concepts/llm.md) authoring phase but before the [Linting](../concepts/linting.md) phase [Source 1].

This configuration allows users to customize two key transforms:
1.  **[Wikilink Resolution](../concepts/wikilink-resolution.md)**: Converting `wikilink` syntax into valid relative markdown links.
2.  **[Article Segmentation](../concepts/article-segmentation.md)**: Splitting articles that exceed a specified [Token Budget](../concepts/token-budget.md) into smaller, linked sub-articles.

This object is passed to the `postProcessCompiledArticles` function to toggle these features or adjust their parameters [Source 1].

## Signature

`PostProcessOptions` is a TypeScript type with the following optional properties:

```typescript
export type PostProcessOptions = {
  /** 
   * Token budget per article. 
   * Default: 15000 
   */
  tokenBudget?: number;

  /** 
   * Whether to resolve wikilinks. 
   * Default: true 
   */
  resolveLinks?: boolean;

  /** 
   * Whether to segment oversized articles. 
   * Default: true 
   */
  segmentArticles?: boolean;
};
```
[Source 1]

### Properties

| Property          | Type      | Description                                                                                             |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `tokenBudget`     | `number`  | Optional. The maximum number of tokens an article can have before it is segmented. Defaults to `15000`.   |
| `resolveLinks`    | `boolean` | Optional. If `true`, `wikilinks` are resolved to relative paths. Defaults to `true`.                 |
| `segmentArticles` | `boolean` | Optional. If `true`, articles exceeding `tokenBudget` are split into multiple files. Defaults to `true`. |

## Examples

### Default Post-Processing

[when](./when.md) calling `postProcessCompiledArticles` without providing an options object, or with an empty object, the default values are used. [Wikilinks](../concepts/wikilinks.md) will be resolved, and articles will be segmented if they exceed 15,000 tokens.

```typescript
import { postProcessCompiledArticles, PostProcessOptions } from 'yaaf/knowledge';
import type { ConceptRegistry } from 'yaaf/knowledge';

async function runCompiler(compiledDir: string, registry: ConceptRegistry) {
  // Using default options
  const options: PostProcessOptions = {};
  
  await postProcessCompiledArticles(compiledDir, registry, options);
}
```

### Customizing the Token Budget

To change the threshold for article segmentation, set the `tokenBudget` property.

```typescript
import { postProcessCompiledArticles, PostProcessOptions } from 'yaaf/knowledge';
import type { ConceptRegistry } from 'yaaf/knowledge';

async function runCompiler(compiledDir: string, registry: ConceptRegistry) {
  // Increase the token budget to allow for larger articles
  const options: PostProcessOptions = {
    tokenBudget: 20000,
  };
  
  await postProcessCompiledArticles(compiledDir, registry, options);
}
```

### Disabling a Post-Processing Step

To disable a specific feature, such as article segmentation, set its corresponding flag to `false`.

```typescript
import { postProcessCompiledArticles, PostProcessOptions } from 'yaaf/knowledge';
import type { ConceptRegistry } from 'yaaf/knowledge';

async function runCompiler(compiledDir: string, registry: ConceptRegistry) {
  // Disable article segmentation but keep wikilink resolution enabled
  const options: PostProcessOptions = {
    segmentArticles: false,
  };
  
  await postProcessCompiledArticles(compiledDir, registry, options);
}
```

## See Also

*   `postProcessCompiledArticles`: The primary function that consumes `PostProcessOptions`.
*   `PostProcessResult`: The type returned by the post-processing function.
*   `segmentOversizedArticles`: The function responsible for splitting large articles, configured by `tokenBudget`.
*   `resolveWikilinks`: The function that resolves `wikilinks`.

## Sources

[Source 1] `src/knowledge/compiler/postprocess.ts`