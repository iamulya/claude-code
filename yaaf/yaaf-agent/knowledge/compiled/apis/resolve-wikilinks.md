---
summary: Resolves `[[wikilinks]]` in a markdown string to proper relative links using the concept registry.
export_name: resolveWikilinks
source_file: src/knowledge/compiler/postprocess.ts
category: function
title: resolveWikilinks
entity_type: api
search_terms:
 - convert wikilinks to markdown links
 - knowledge base link resolution
 - how to link between articles
 - double bracket link syntax
 - "wikilink processing"
 - concept registry lookup
 - relative path generation for links
 - post-synthesis transforms
 - unresolved link handling
 - markdown post-processing
 - YAAF compiler link step
 - linking documents in YAAF
stub: false
compiled_at: 2026-04-24T17:33:12.615Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/postprocess.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `resolve[[[[[[[[Wikilinks]]]]]]]]` function is a utility used during the YAAF knowledge base compilation process. It scans a given markdown string for `wikilink` syntax and converts any recognized links into standard, relative markdown links [Source 1].

This function is a key part of the post-synthesis processing pipeline, which runs after an article has been authored by an [LLM](../concepts/llm.md) but before it is validated by the [Linter](../concepts/linter.md). Its purpose is to create a navigable, hyperlinked knowledge base from the plain-text `wikilink` references used during authoring [Source 1].

The function supports two common wikilink formats:
1.  `Target`: Creates a link where the link text is the same as the target article's title.
2.  `Custom display text`: Creates a link to the target article but uses the provided custom text for display [Source 1].

To resolve a link, `resolveWikilinks` looks up the `Target` in the provided `ConceptRegistry`. If a matching entry is found, it generates a relative file path from the current document to the target document. If the `Target` is not found in the registry, the `wikilink` is left unchanged in the text. This allows a subsequent [Linting](../concepts/linting.md) step to flag broken or unresolved links [Source 1].

## Signature

```typescript
export function resolveWikilinks(
  markdown: string,
  registry: ConceptRegistry,
  currentDocId: string,
): { 
  markdown: string;
  resolved: string[];
  unresolved: string[];
};
```

**Parameters:**

*   `markdown` (`string`): The full markdown content of the article to process, including [Frontmatter](../concepts/frontmatter.md).
*   `registry` (`ConceptRegistry`): An instance of the [Concept Registry](../subsystems/concept-registry.md) containing mappings from concept titles to their document metadata, which is used to find the target file path for a given wikilink.
*   `currentDocId` (`string`): The unique document ID of the article being processed. This is used to calculate the correct relative path for the generated links.

**Returns:**

An object containing the processed markdown and metadata about the link resolution process. While the source material does not specify the exact return type's shape, it returns at least the transformed markdown string [Source 1]. The broader post-processing context suggests it also returns data for dependency tracking.

## Examples

The following example demonstrates how to resolve different types of Wikilinks within a markdown document.

```typescript
import { resolveWikilinks } from 'yaaf';
import type { ConceptRegistry } from 'yaaf';

// 1. Define a mock concept registry.
// In a real scenario, this is built by the knowledge compiler.
const registry: ConceptRegistry = new Map([
  ['Agent', { docId: 'api/agent', entityType: 'api', title: 'Agent' }],
  ['Tool', { docId: 'concept/tool', entityType: 'concept', title: 'Tool' }],
]);

// 2. Define the source markdown and the ID of the current document.
const currentDocId = 'guide/getting-started';
const markdownInput = `
---
title: Getting Started
---
# Getting Started

A YAAF Agent can be equipped with a set of tools.

This guide does not cover the LLM concept, as it is not in the registry.
`;

// 3. Call the function to resolve links.
const { markdown: resolvedMarkdown } = resolveWikilinks(
  markdownInput,
  registry,
  currentDocId
);

// 4. The output contains standard markdown links with correct relative paths.
console.log(resolvedMarkdown);
/*
---
title: Getting Started
---
# Getting Started

A YAAF [Agent](../../api/agent.md) can be equipped with a [set of tools](../../concept/tool.md).

This guide does not cover the LLM concept, as it is not in the registry.
*/
```

In the output, `Agent` is resolved to a link pointing to `api/agent.md`, and `set of tools` is resolved to a link pointing to `concept/tool.md` with custom display text. The `LLM` link remains unresolved because it was not found in the registry.

## See Also

*   `postProcessCompiledArticles`: The higher-level function that orchestrates all post-synthesis steps, including [Wikilink Resolution](../concepts/wikilink-resolution.md) and [Article Segmentation](../concepts/article-segmentation.md).
*   `ConceptRegistry`: The data structure that serves as the source of truth for all known entities in the knowledge base, which `resolveWikilinks` queries to find link targets.

## Sources

[Source 1]: src/knowledge/compiler/postprocess.ts