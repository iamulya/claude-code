---
title: KBStoreOptions
entity_type: api
summary: A type definition for the configuration object used when creating a Knowledge Base store.
export_name: KBStoreOptions
source_file: src/knowledge/store/store.js
category: type
search_terms:
 - knowledge base configuration
 - configure KB store
 - KB storage settings
 - knowledge base indexing options
 - vector store setup
 - document storage parameters
 - how to create a knowledge base
 - KB initialization
 - knowledge store parameters
 - YAAF knowledge base setup
 - setting up document search
stub: false
compiled_at: 2026-04-25T00:08:26.823Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`KBStoreOptions` is a TypeScript type that defines the shape of the configuration object for a [Knowledge Base](../subsystems/knowledge-base.md) store. This object is used to specify settings related to storage, indexing, and other behaviors when initializing a new store instance, typically with the `[[createStore]]` factory function.

## Signature

The `KBStoreOptions` type is exported from `src/knowledge/store/store.js`. The specific properties of this type are not detailed in the provided source material but it serves as the configuration contract for the KB store.

```typescript
// Exported from src/knowledge/store/index.ts
export type { KBStoreOptions } from "./store.js";
```

## Examples

The following example illustrates how `KBStoreOptions` would be used to configure and create a [Knowledge Base](../subsystems/knowledge-base.md) store.

```typescript
import { createStore, KBStoreOptions } from 'yaaf';

// Note: The specific properties of KBStoreOptions are not detailed
// in the provided source material. This example is illustrative of its usage.
const options: KBStoreOptions = {
  // Hypothetical options would be placed here, such as:
  // tokenizer: new EnglishTokenizer(),
  // storagePath: './my-kb-data',
};

// The options object is passed to the factory function.
const kbStore = createStore(options);

console.log('Knowledge Base store created.');
```

## See Also

- [Knowledge Base](../subsystems/knowledge-base.md): The subsystem that manages document storage, indexing, and retrieval.
- [createStore](./create-store.md): The factory function used to create an instance of a [Knowledge Base](../subsystems/knowledge-base.md) store, which accepts `KBStoreOptions`.

## Sources

[Source 1]: src/knowledge/store/index.ts