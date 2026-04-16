---
summary: Orchestrates post-synthesis processing steps including wikilink resolution and article segmentation.
export_name: postProcessCompiledArticles
source_file: src/knowledge/compiler/postprocess.ts
category: function
title: postProcessCompiledArticles
entity_type: api
stub: false
compiled_at: 2026-04-16T14:26:03.953Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/postprocess.ts
confidence: 1
---

## Overview
`postProcessCompiledArticles` is a core utility in the YAAF knowledge compiler. It orchestrates the transformation of raw synthesized markdown into a structured, interlinked knowledge base. This function is designed to run after the LLM authoring step and before the final linting phase.

The function performs two primary compile-time transforms:
1.  **Wikilink Resolution**: Converts internal `[[Term]]` syntax into standard Markdown relative links using a provided registry.
2.  **Article Segmentation**: Splits oversized articles that exceed a defined token budget into multiple linked sub-articles at H2 section boundaries.

## Signature / Constructor

```typescript
export async function postProcessCompiledArticles(
  compiledDir: string,
  registry: ConceptRegistry,
  options: PostProcessOptions = {
    tokenBudget: 15000,
    resolveLinks: true,
    segmentArticles: true
  }
): Promise<PostProcessResult>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `compiledDir` | `string` | The filesystem path to the directory containing compiled markdown articles. |
| `registry` | `ConceptRegistry` | The ontology registry used to map wikilink targets to their respective document IDs and paths. |
| `options` | `PostProcessOptions` | Configuration for the post-processing pipeline. |

### Configuration Types

#### PostProcessOptions
```typescript
export type PostProcessOptions = {
  /** Token budget per article. Default: 15000 */
  tokenBudget?: number
  /** Whether to resolve wikilinks. Default: true */
  resolveLinks?: boolean
  /** Whether to segment oversized articles. Default: true */
  segmentArticles?: boolean
}
```

#### PostProcessResult
```typescript
export type PostProcessResult = {
  wikilinks: { 
    resolved: number; 
    unresolved: number 
  }
  segmentation: SegmentResult | null
}
```

## Methods & Properties

### Wikilink Resolution Logic
The resolution step processes every synthesized article to convert wikilinks:
- `[[Attention Mechanism]]` becomes `[Attention Mechanism](../concepts/attention-mechanism.md)`
- `[[Attention|custom text]]` becomes `[custom text](../concepts/attention-mechanism.md)`
- If a target is not found in the `ConceptRegistry`, the wikilink is left as-is for the linter to flag as a broken reference.

### Article Segmentation Logic
If an article's token count exceeds the `tokenBudget`, the function splits the file at H2 (`##`) boundaries. Each resulting part becomes a standalone article with injected navigation headers:
- **Part 1**: Retains the original filename (e.g., `docId.md`) and includes a "Next" link.
- **Intermediate Parts**: Named `docId-part-N.md` with "Previous" and "Next" links.
- **Final Part**: Includes a "Previous" link.

## Examples

### Basic Usage
This example demonstrates running the post-processor on a directory of compiled articles.

```typescript
import { postProcessCompiledArticles } from 'yaaf/knowledge/compiler';
import { registry } from './my-ontology';

const result = await postProcessCompiledArticles(
  './dist/knowledge',
  registry,
  {
    tokenBudget: 10000,
    resolveLinks: true,
    segmentArticles: true
  }
);

console.log(`Resolved ${result.wikilinks.resolved} links.`);
if (result.segmentation) {
  console.log('Segmentation complete.');
}
```

## See Also
(No related articles available in the current knowledge base)