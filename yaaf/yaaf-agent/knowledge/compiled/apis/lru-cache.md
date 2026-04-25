---
title: LRUCache
entity_type: api
summary: A simple, zero-dependency Least-Recently-Used (LRU) cache built on `Map` iteration order, primarily used by `KBStore` for lazy document loading.
export_name: LRUCache
source_file: src/knowledge/store/lruCache.ts
category: class
search_terms:
 - least recently used cache
 - cache eviction policy
 - in-memory caching
 - KBStore document cache
 - lazy loading documents
 - Map-based cache
 - simple LRU implementation
 - memory management for knowledge base
 - how to cache documents
 - zero-dependency cache
 - cache capacity
 - eviction strategy
stub: false
compiled_at: 2026-04-24T17:20:06.176Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/lruCache.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `LRUCache` class provides a simple, zero-dependency implementation of a Least-Recently-Used (LRU) eviction cache [Source 1]. It is designed to store a fixed number of items, and [when](./when.md) the cache is full, it automatically evicts the item that has not been accessed for the longest time to make space for a new one.

This implementation leverages the fact that ES2015+ `Map` objects maintain insertion order. The oldest entry is always the first in the map's iteration order. When an item is accessed via the `get()` method, it is removed and re-inserted, effectively moving it to the end of the insertion order and marking it as the most recently used [Source 1].

Within the YAAF framework, `LRUCache` is primarily used by the `KBStore` subsystem for lazy document loading. It caches the full bodies of documents, while only the smaller [Frontmatter](../concepts/frontmatter.md) metadata is held permanently in [Memory](../concepts/memory.md). This pattern helps manage memory usage efficiently when dealing with a large number of knowledge base documents [Source 1].

## Constructor

The `LRUCache` is a generic class that takes a key type `K` and a value type `V`. The constructor accepts a single argument to define the maximum capacity of the cache.

```typescript
export class LRUCache<K, V> {
  constructor(capacity: number);
}
```

**Parameters:**

*   `capacity` (`number`): The maximum number of items the cache can hold.

## Methods & Properties

Based on the source documentation, the class exposes the following primary methods for interaction:

### get()

Retrieves an item from the cache by its key. This action marks the item as "recently used," moving it to the end of the eviction queue.

```typescript
get(key: K): V | undefined;
```

**Parameters:**

*   `key` (`K`): The key of the item to retrieve.

**Returns:**

*   `V | undefined`: The value associated with the key, or `undefined` if the key is not in the cache.

### set()

Adds a key-value pair to the cache. If the key already exists, its value is updated. If the cache is at capacity, the least recently used item is evicted before the new item is added.

```typescript
set(key: K, value: V): void;
```

**Parameters:**

*   `key` (`K`): The key of the item to add or update.
*   `value` (`V`): The value to store.

## Examples

The following example demonstrates creating a cache, adding an item, and retrieving it.

```typescript
// Assuming CompiledDocument is an imported type
import { CompiledDocument } from '...';

// Create a cache that can hold up to 100 documents
const cache = new LRUCache<string, CompiledDocument>(100);

// Add a document to the cache
const doc: CompiledDocument = { /* ... document data ... */ };
cache.set('concepts/attention', doc);

// Retrieve the document. This action also marks it as the most recently used.
const cachedDoc = cache.get('concepts/attention');
```
[Source 1]

## See Also

*   `KBStore`: The primary consumer of `LRUCache` for managing lazy-loaded document content.

## Sources

*   [Source 1]: `src/knowledge/store/lruCache.ts`