---
title: DiscoveryOptions
entity_type: api
summary: A configuration object for customizing the behavior of the LLM-powered knowledge base discovery process.
export_name: DiscoveryOptions
source_file: src/knowledge/compiler/discovery.ts
category: type
search_terms:
 - knowledge base analysis options
 - configure discoverGaps
 - LLM linter settings
 - find KB gaps
 - limit LLM calls during discovery
 - discovery progress callback
 - onProgress event handler
 - maxCalls parameter
 - structural gap analysis
 - knowledge base linter
 - C2 discovery mode
stub: false
compiled_at: 2026-04-24T17:02:26.694Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/discovery.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`[[[[[[[[Discovery]]]]]]]]Options` is a TypeScript type that defines a configuration object used to customize the behavior of the `discoverGaps` function [Source 1]. The `discoverGaps` function performs an [LLM](../concepts/llm.md)-powered analysis on a compiled knowledge base to identify structural issues, such as missing articles, weak connections between existing articles, and imbalances in content depth [Source 1].

This options object allows developers to control resource consumption, specifically the number of LLM calls made, and to receive progress updates during the potentially long-running Discovery process [Source 1].

## Signature

`DiscoveryOptions` is a type alias for an object with the following optional properties:

```typescript
export type DiscoveryOptions = {
  /** Maximum LLM calls. Default: 5 (each covers a batch of articles) */
  maxCalls?: number;
  /** Progress callback */
  onProgress?: (event: DiscoveryProgressEvent) => void;
};
```

### Properties

*   **`maxCalls`** `?number`
    *   An optional number that specifies the maximum number of calls to the LLM during the analysis.
    *   The default value is 5. Each call typically processes a batch of articles [Source 1].
*   **`onProgress`** `?(event: DiscoveryProgressEvent) => void`
    *   An optional callback function that receives progress events during the discovery process.
    *   The event object, `DiscoveryProgressEvent`, provides information about the state of the analysis, such as [when](./when.md) it starts and the total number of articles being processed [Source 1]. The `DiscoveryProgressEvent` type is defined as:
        ```typescript
        export type DiscoveryProgressEvent =
          | { type: "discovery:start"; articleCount: number };
        ```

## Examples

The following example demonstrates how to use `DiscoveryOptions` to limit the number of LLM calls and log progress when calling the `discoverGaps` function.

```typescript
import { discoverGaps, DiscoveryOptions } from 'yaaf';
import { makeKBLLMClient } from './llm'; // Example LLM client
import { registry, ontology } from './kb'; // Example KB objects

const llm = makeKBLLMClient();
const compiledDir = './dist/kb';

// Define discovery options to limit API usage and track progress
const options: DiscoveryOptions = {
  maxCalls: 3, // Limit to a maximum of 3 LLM calls
  onProgress: (event) => {
    if (event.type === 'discovery:start') {
      console.log(`Discovery started for ${event.articleCount} articles.`);
    }
  },
};

async function runAnalysis() {
  console.log('Starting knowledge base gap analysis...');
  const result = await discoverGaps(llm, compiledDir, registry, ontology, options);

  console.log(`Analysis complete. Made ${result.llmCalls} LLM calls.`);
  for (const suggestion of result.missingArticles) {
    console.log(`Missing Article Suggestion: ${suggestion.title} (${suggestion.reason})`);
  }
}

runAnalysis();
```

## See Also

*   `discoverGaps` function: The primary consumer of the `DiscoveryOptions` object.

## Sources

[Source 1]: src/knowledge/compiler/discovery.ts