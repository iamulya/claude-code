---
summary: Resolves internal wikilinks into proper relative markdown links using the concept registry.
export_name: resolveWikilinks
source_file: src/knowledge/compiler/postprocess.ts
category: function
title: resolveWikilinks
entity_type: api
stub: false
compiled_at: 2026-04-16T14:26:12.059Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/postprocess.ts
confidence: 1
---

## Overview
`resolveWikilinks` is a post-synthesis processing utility used to transform internal `[[wikilink]]` syntax into standard Markdown relative links. It is executed after an article has been authored by the LLM but before the final linting phase.

The function performs two primary transformations:
1.  **Standard Resolution**: Converts `[[Term]]` into a relative link to the corresponding document (e.g., `[Term](../category/doc-id.md)`).
2.  **Aliased Resolution**: Converts `[[Term|custom text]]` into a link using the provided display text (e.g., `[custom text](../category/doc-id.md)`).

If a wikilink target cannot be found within the provided registry, the function leaves the wikilink in its original `[[Target]]` format. This allows subsequent linting steps to flag the unresolved link as an error.

## Signature
```typescript
export function resolveWikilinks(
  markdown: string,
  registry: ConceptRegistry,
  currentDocId: string,
): { /* ... */ }
```

### Parameters
*   `markdown`: The full content of the article, including frontmatter and body text.
*   `registry`: The `ConceptRegistry` containing the mapping of all known entities, their types, and their document IDs.
*   `currentDocId`: The unique identifier of the article currently being processed. This is used to calculate the correct relative path from the current file to the link target.

### Return Value
The source documentation indicates this function returns the markdown string with resolved wikilinks. Note that while the JSDoc specifies a string return, the TypeScript signature in the source extract indicates an object return type; this typically contains the processed markdown along with metadata regarding the number of resolved and unresolved links.

## Examples

### Basic Usage
This example demonstrates how the function converts a standard wikilink into a relative path based on the registry.

```typescript
const markdown = "See the [[Agent]] class for implementation details.";
const registry = getRegistry(); // Assume registry contains Agent -> api/agent.md

const resolved = resolveWikilinks(markdown, registry, "quick-start");
// Result: "See the [Agent](../api/agent.md) class for implementation details."
```

### Aliased Wikilinks
This example demonstrates using custom display text for a link.

```typescript
const markdown = "Learn more about [[Agent|agent architecture]].";
const registry = getRegistry();

const resolved = resolveWikilinks(markdown, registry, "quick-start");
// Result: "Learn more about [agent architecture](../api/agent.md)."
```

## See Also
* `postProcessCompiledArticles`: The high-level runner that invokes wikilink resolution.
* `segmentOversizedArticles`: A sibling post-processing step that splits large documents.