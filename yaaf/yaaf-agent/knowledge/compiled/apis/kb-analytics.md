---
summary: Records runtime document access and search analytics for knowledge base documents during agent sessions, writing asynchronously to a JSONL file.
export_name: KBAnalytics
source_file: src/knowledge/store/analytics.ts
category: class
title: KBAnalytics
entity_type: api
search_terms:
 - knowledge base analytics
 - document access tracking
 - agent session logging
 - JSONL analytics file
 - record document hits
 - search query logging
 - compiler feedback loop
 - GAP-1
 - prioritize document synthesis
 - asynchronous file writing
 - .kb-analytics.jsonl
 - how to track KB usage
 - runtime document fetch metrics
stub: false
compiled_at: 2026-04-24T17:15:37.444Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/analytics.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `KBAnalytics` class is responsible for recording runtime analytics about which knowledge base documents are fetched and searched during an agent's session [Source 1]. It captures this data as "hit records" and writes them asynchronously to a JSONL file named `.kb-analytics.jsonl` located in the knowledge base directory [Source 1].

This mechanism is designed to be non-blocking, using a ring-buffer approach to ensure that analytics logging does not interfere with the agent's critical path performance [Source 1].

The primary purpose of this data is to serve as a feedback mechanism for the YAAF compiler's "[Discovery](../concepts/discovery.md)" phase. By analyzing which documents are frequently accessed, the compiler can prioritize the re-synthesis of articles that are both popular and potentially stale [Source 1].

An instance of `KBAnalytics` is typically created and then passed to a `KBStore` instance, which handles the actual recording of document hits. It is important to call the `destroy()` method during application shutdown to ensure all buffered analytics data is flushed to disk [Source 1].

## Signature / Constructor

The `KBAnalytics` class is instantiated with the path to the knowledge base directory.

```typescript
export class KBAnalytics {
  constructor(kbDir: string);
  // ... other methods
}
```

The data recorded by `KBAnalytics` conforms to the `KBHitRecord` type:

```typescript
export type KBHitRecord = {
  /** Unix timestamp (ms) */
  ts: number;
  /** The docId that was accessed */
  docId: string;
  /** The search query that led to this hit (empty for direct fetch) */
  query: string;
  /** Relevance score from the search adapter (0–1), or 1.0 for direct fetch */
  score: number;
  /** Namespace prefix if this was a federated access */
  namespace?: string;
};
```

## Methods & Properties

### destroy()

Flushes any buffered analytics records to the JSONL file. This method should be called during a graceful server or application shutdown to prevent data loss [Source 1].

```typescript
public async destroy(): Promise<void>;
```

## Examples

The following example demonstrates the typical lifecycle of the `KBAnalytics` class: initialization, integration with a `KBStore`, and finalization on shutdown.

```typescript
import { KBAnalytics } from 'yaaf';
import { KBStore } from 'yaaf'; // Assuming KBStore is also exported

// Path to the compiled knowledge base directory
const kbDir = './my-kb';

// 1. Initialize the analytics recorder
const analytics = new KBAnalytics(kbDir);

// 2. Create a KBStore and attach the analytics instance
const store = new KBStore();
store.setAnalytics(analytics);
// await store.load(kbDir); // Load the KB

// 3. The agent runs, and KBStore internally records hits via the analytics instance
// ... agent session ...

// 4. On application shutdown, flush the analytics buffer
async function onShutdown() {
  await analytics.destroy();
  console.log('Analytics flushed.');
}

// Register the shutdown handler
process.on('SIGINT', onShutdown);
process.on('SIGTERM', onShutdown);
```

## Sources

[Source 1]: src/knowledge/store/analytics.ts
[Source 2]: src/knowledge/store/store.ts