---
summary: A utility function to build an alias index from an ontology for efficient lookup of entities by their aliases.
title: buildAliasIndex
entity_type: api
export_name: buildAliasIndex
source_file: src/knowledge/ontology/index.js
category: function
search_terms:
 - ontology alias lookup
 - entity name mapping
 - knowledge base indexing
 - find entity by synonym
 - create alias map
 - canonical name resolution
 - ontology indexing
 - map aliases to canonical names
 - KBOntology processing
 - entity resolution
stub: false
compiled_at: 2026-04-25T00:05:05.129Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/linter.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview
`buildAliasIndex` is a utility function that constructs an [AliasIndex](./alias-index.md) from a [KBOntology](./kb-ontology.md) object. This index serves as a fast lookup table, mapping all known aliases of an entity back to its canonical name.

This is a crucial preprocessing step for various [Knowledge Base](../subsystems/knowledge-base.md) operations, such as linting and content analysis. By creating a comprehensive index, components like the `KBLinter` can efficiently resolve different names for the same concept, ensuring consistency and accuracy when processing documents.

## Signature
The function signature is not fully detailed in the provided source material [Source 1]. Based on its name and usage context, it is inferred to accept a [KBOntology](./kb-ontology.md) object and return an [AliasIndex](./alias-index.md).

```typescript
import type { KBOntology } from "../../ontology/index.js";
import type { AliasIndex } from "./types.js"; // Inferred path

export declare function buildAliasIndex(ontology: KBOntology): AliasIndex;
```

## Examples
No examples are available in the provided source material.

## See Also
*   [AliasIndex](./alias-index.md): The data structure returned by this function.
*   [KBOntology](./kb-ontology.md): The data structure that serves as input to this function.
*   [Ontology](../concepts/ontology.md): The core concept this function operates on.
*   [Knowledge Base](../subsystems/knowledge-base.md): The subsystem where this function is used for indexing and maintenance.

## Sources
[Source 1]: src/knowledge/compiler/linter/linter.ts