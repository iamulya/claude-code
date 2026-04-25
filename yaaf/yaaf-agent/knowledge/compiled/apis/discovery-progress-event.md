---
title: DiscoveryProgressEvent
entity_type: api
summary: A type representing progress events emitted during the knowledge base discovery process.
export_name: DiscoveryProgressEvent
source_file: src/knowledge/compiler/discovery.ts
category: type
search_terms:
 - knowledge base analysis progress
 - onProgress callback event
 - discoverGaps events
 - linter discovery mode updates
 - how to monitor discovery
 - discovery:start event
 - KB gap analysis status
 - LLM-powered linter events
 - knowledge base compilation events
 - tracking discovery progress
 - gap analysis callback
stub: false
compiled_at: 2026-04-24T17:02:25.379Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/discovery.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`[[[[[[[[Discovery]]]]]]]]ProgressEvent` is a TypeScript type that defines the structure of events emitted during the [LLM](../concepts/llm.md)-powered knowledge base analysis performed by the `discoverGaps` function [Source 1].

This type is used by the optional `onProgress` callback in the `DiscoveryOptions` object. By providing an `onProgress` function, consumers can monitor the lifecycle of the Discovery process, such as [when](./when.md) it starts and how many articles it will process [Source 1].

It is defined as a discriminated union, allowing for different types of progress events to be added in the future. Currently, it includes the `discovery:start` event [Source 1].

## Signature

`DiscoveryProgressEvent` is a discriminated union type. The specific event type is determined by the `type` property [Source 1].

```typescript
export type DiscoveryProgressEvent =
  | { type: "discovery:start"; articleCount: number };
```

### Event Types

*   **`{ type: "discovery:start"; articleCount: number }`**
    *   `type`: The literal string `"discovery:start"`, indicating the beginning of the analysis.
    *   `articleCount`: A `number` representing the total count of articles that will be scanned during the discovery process.

## Examples

The following example demonstrates how to use the `onProgress` callback with the `discoverGaps` function to listen for `DiscoveryProgressEvent`s.

```typescript
import { discoverGaps, DiscoveryProgressEvent } from 'yaaf';
import { makeKBLLMClient } from './somewhere';
import { registry, ontology } from './kb-data';

const llm = makeKBLLMClient();
const compiledDir = './compiled-kb';

const handleProgress = (event: DiscoveryProgressEvent) => {
  switch (event.type) {
    case 'discovery:start':
      console.log(
        `Discovery process started. Analyzing ${event.articleCount} articles.`
      );
      break;
    // Handle other event types here in the future
  }
};

const result = await discoverGaps(llm, compiledDir, registry, ontology, {
  onProgress: handleProgress,
});

console.log('Discovery complete.');
```

## Sources

[Source 1]: src/knowledge/compiler/discovery.ts