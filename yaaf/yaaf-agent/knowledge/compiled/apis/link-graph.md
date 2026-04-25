---
title: LinkGraph
entity_type: api
summary: A type alias representing the graph structure of inter-article links within the knowledge base, used for validation.
export_name: LinkGraph
source_file: src/knowledge/compiler/linter/types.ts
category: type
search_terms:
 - knowledge base validation
 - broken link checking
 - article graph
 - wiki link structure
 - linting links
 - knowledge graph
 - content dependency graph
 - cross-reference validation
 - inter-article linking
 - link validation type
 - knowledge linter
stub: false
compiled_at: 2026-04-24T17:17:07.485Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`LinkGraph` is a type alias used within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md)'s [Linter](../concepts/linter.md) subsystem. It defines the data structure for representing the complete network of [Wikilinks](../concepts/wikilinks.md) between all articles in the knowledge base. This graph representation is primarily used by the linter to perform validation checks, such as identifying broken links that point to non-existent articles [Source 1].

## Signature

The `LinkGraph` type is defined in `src/knowledge/compiler/linter/types.ts` and re-exported from the linter's main entry point [Source 1]. The specific definition of this type alias was not available in the provided source material.

```typescript
// Re-exported from src/knowledge/compiler/linter/index.ts
export type { LinkGraph } from "./types.js";
```

## Examples

No usage examples are available in the provided source material.

## Sources

[Source 1] src/knowledge/compiler/linter/index.ts