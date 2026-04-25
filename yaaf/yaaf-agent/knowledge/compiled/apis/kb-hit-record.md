---
summary: Defines the structure for a single knowledge base document access or search hit record, including timestamp, document ID, query, score, and optional namespace.
export_name: KBHitRecord
source_file: src/knowledge/store/analytics.ts
category: type
title: KBHitRecord
entity_type: api
search_terms:
 - knowledge base analytics
 - document access record
 - search hit structure
 - KB analytics data type
 - logging document fetches
 - tracking KB usage
 - relevance score logging
 - federated KB access
 - what is a hit record
 - compiler discovery phase data
 - kb-analytics.jsonl format
 - document retrieval log
stub: false
compiled_at: 2026-04-24T17:16:17.593Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/analytics.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `KBHitRecord` type defines the data structure for a single knowledge base access event. It is used by the `KBAnalytics` class to log every time a document is fetched directly or returned as part of a search result [Source 1].

Each record captures essential details about the access, such as [when](./when.md) it occurred, which document was accessed, the query that led to the access, and a relevance score. This information is written to an analytics file (`.kb-analytics.jsonl`) which can be consumed by the YAAF compiler's [Discovery](../concepts/discovery.md) phase. The compiler uses this data to identify frequently accessed documents that may be candidates for re-synthesis, creating a feedback loop for knowledge base optimization [Source 1].

## Signature

`KBHitRecord` is a TypeScript type alias with the following structure [Source 1]:

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

## Examples

### Direct Document Fetch

When a document is fetched directly by its ID, the `query` is an empty string and the `score` is `1.0`.

```typescript
import { KBHitRecord } from 'yaaf';

const directFetchRecord: KBHitRecord = {
  ts: 1678886400000,
  docId: 'user-manual/section-4.2',
  query: '',
  score: 1.0,
};
```

### Search Result Hit

When a document is returned from a search query, the `query` field is populated and the `score` reflects its relevance as determined by the search adapter.

```typescript
import { KBHitRecord } from 'yaaf';

const searchHitRecord: KBHitRecord = {
  ts: 1678886435000,
  docId: 'api-docs/authentication',
  query: 'how to log in via API',
  score: 0.92,
};
```

### Federated Search Hit

For knowledge bases that access multiple sources, the optional `namespace` field can be used to identify the origin of the document.

```typescript
import { KBHitRecord } from 'yaaf';

const federatedHitRecord: KBHitRecord = {
  ts: 1678886489000,
  docId: 'billing-faq/common-issues',
  query: 'invoice questions',
  score: 0.85,
  namespace: 'support_kb',
};
```

## See Also

*   `KBAnalytics`: The class that creates and logs `KBHitRecord` objects.

## Sources

[Source 1]: src/knowledge/store/analytics.ts