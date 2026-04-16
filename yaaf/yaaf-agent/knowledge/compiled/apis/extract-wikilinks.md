---
export_name: extractWikilinks
source_file: src/knowledge/compiler/linter/checks.ts
category: function
title: extractWikilinks
entity_type: api
summary: Extracts wikilink targets from article body text, supporting both standard and piped syntax.
stub: false
compiled_at: 2026-04-16T14:24:58.521Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/checks.ts
confidence: 1
---

## Overview
`extractWikilinks` is a utility function used by the YAAF knowledge base compiler and linter to identify internal references within article content. It parses text for the wikilink pattern, which is used to create associations between different entities in the knowledge base.

The function is designed to handle two variations of wikilink syntax:
1.  **Standard links**: `[[Target]]`, where the target is the canonical title of the destination article.
2.  **Piped links**: `[[Target|Display Text]]`, where the target is separated from the visible text by a pipe character.

In both instances, `extractWikilinks` isolates the target portion (the text before any pipe) to facilitate link validation, link graph construction, and orphan detection. This function is a deterministic "Static Lint Check" and does not utilize an LLM for parsing.

## Signature
```typescript
export function extractWikilinks(body: string): Array<{ /* ... */ }>
```

### Parameters
*   `body`: The raw string content of an article body to be scanned for wikilinks.

### Return Value
Returns an array of objects representing the extracted links. According to the source documentation, the function specifically extracts the target portion of the link (the identifier appearing before any pipe character).

## Examples

### Extracting Targets
The following example demonstrates how the function processes both standard and piped wikilinks within a block of text.

```typescript
import { extractWikilinks } from 'src/knowledge/compiler/linter/checks';

const articleBody = "Please refer to [[Agent]] and [[Agent|the primary agent class]] for details.";
const links = extractWikilinks(articleBody);

/**
 * The resulting array contains the extracted targets.
 * Both matches return "Agent" as the target portion.
 */
```

## See Also
*   `buildLinkGraph`: A function that utilizes extracted links to create a bidirectional map of the knowledge base.
*   `checkBrokenWikilinks`: A linting check that validates the targets extracted by this function against the concept registry.