---
summary: The system for recording and utilizing runtime access and search patterns for knowledge base documents to inform compilation and optimization.
title: Knowledge Base Analytics
entity_type: concept
related_subsystems:
 - Knowledge Subsystem
 - Compiler
search_terms:
 - KB analytics
 - document access patterns
 - how to optimize knowledge base
 - GAP-1
 - runtime document hits
 - compile feedback loop
 - prioritize document synthesis
 - .kb-analytics.jsonl
 - asynchronous logging
 - federated knowledge access
 - document relevance score tracking
 - agent session logging
 - knowledge store performance
stub: false
compiled_at: 2026-04-24T17:56:55.507Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/analytics.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Knowledge Base Analytics is a YAAF system designed to record document access and search patterns within an agent's knowledge base during runtime [Source 1]. This mechanism serves as a feedback loop for the YAAF Compiler, providing empirical data on which documents are most frequently used by the agent. The primary problem it solves is enabling the compiler to make informed decisions about resource allocation, specifically by prioritizing the re-synthesis and updating of documents that are both frequently accessed and potentially stale [Source 1]. This process is part of a broader compile feedback strategy referred to as "GAP-1" [Source 1].

## How It Works in YAAF

The core implementation is the `KBAnalytics` class. This system records every time a document is fetched or returned as a search result during an [Agent Session](./agent-session.md) [Source 1]. To avoid impacting agent performance, these analytics are written asynchronously to a ring-buffer JSON Lines file (`.kb-analytics.jsonl`) located in the knowledge base directory. This ensures that the logging process never blocks the critical execution path of the agent [Source 1].

Each entry in the log file is a `KBHitRecord`, a JSON object with the following structure [Source 1]:
*   `ts`: A Unix timestamp in milliseconds indicating [when](../apis/when.md) the access occurred.
*   `docId`: The unique identifier of the document that was accessed.
*   `query`: The search query that resulted in the document hit. This is an empty string for direct fetches by `docId`.
*   `score`: The relevance score (from 0 to 1) provided by the search adapter. For direct fetches, this is 1.0.
*   `namespace`: An optional field indicating the namespace prefix if the access was part of a federated knowledge base query.

During the build process, the YAAF Compiler's [Discovery](./discovery.md) phase can consume the `.kb-analytics.jsonl` file. By analyzing the frequency and context of document hits, the compiler can identify high-value documents that should be prioritized for updates or re-synthesis [Source 1].

The analytics buffer is flushed to disk when the `destroy()` method is called, which is intended to be used during a graceful server shutdown to ensure all pending records are saved [Source 1].

## Configuration

To enable Knowledge Base Analytics, an instance of the `KBAnalytics` class must be created and associated with the [Knowledge Store](../apis/knowledge-store.md) instance.

```typescript
// Example of enabling KB Analytics
const analytics = new KBAnalytics(kbDir);
store.setAnalytics(analytics);

// ... agent session runs ...

// On server shutdown, flush any remaining records in the buffer
await analytics.destroy();
```
[Source 1]

## Sources

[Source 1] `src/knowledge/store/analytics.ts`