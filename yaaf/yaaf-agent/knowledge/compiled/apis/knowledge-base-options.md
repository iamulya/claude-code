---
title: KnowledgeBaseOptions
entity_type: api
summary: Configuration options for the top-level KnowledgeBase class.
export_name: KnowledgeBaseOptions
source_file: src/knowledge/store/knowledgeBase.js
category: type
search_terms:
 - knowledge base configuration
 - KB setup options
 - how to configure KnowledgeBase
 - KnowledgeBase constructor parameters
 - vector store options
 - embedding model settings
 - KB store configuration
 - knowledge base initialization
 - YAAF KB settings
 - configure knowledge retrieval
 - knowledge base parameters
stub: false
compiled_at: 2026-04-25T00:08:34.645Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `KnowledgeBaseOptions` type defines the configuration object used to initialize an instance of the `KnowledgeBase` class. This object encapsulates all the necessary settings for the knowledge base, such as the underlying storage mechanism, embedding models, and other operational parameters.

This type is typically passed to the `KnowledgeBase` constructor to customize its behavior.

## Signature

The provided source material is a barrel file that re-exports `KnowledgeBaseOptions` from its original module. The full definition of the type is not available in the source, but its export signature is as follows [Source 1]:

```typescript
// As exported from src/knowledge/store/index.ts, originating in ./knowledgeBase.js
export type { KnowledgeBaseOptions } from "./knowledgeBase.js";
```

## Examples

No code examples are available in the provided source material.

## See Also

*   [Knowledge Base](../subsystems/knowledge-base.md): The subsystem that this type is used to configure.

## Sources

[Source 1]: src/knowledge/store/index.ts