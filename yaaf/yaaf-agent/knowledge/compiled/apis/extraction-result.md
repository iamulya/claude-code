---
summary: A type representing the outcome or data produced by a memory extraction operation.
export_name: ExtractionResult
source_file: src/memory/strategies.js
category: type
title: ExtractionResult
entity_type: api
search_terms:
 - memory extraction result
 - what does memory extraction return
 - agent memory persistence
 - automatic knowledge extraction
 - memory strategy output
 - durable memory format
 - conversation summary result
 - onExtracted callback data
 - MemoryExtractionStrategy return type
 - auto memory extractor output
stub: false
compiled_at: 2026-04-24T17:06:06.206Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/autoExtract.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`ExtractionResult` is a type that represents the data returned by a [Memory](../concepts/memory.md) extraction process [Source 1]. It is the standard output type for a `MemoryExtractionStrategy`.

This type is primarily used as the payload for callbacks that fire after memories have been successfully extracted from a conversation history. For example, the `AutoMemoryExtractor` class uses this type in its `onExtracted` configuration option, allowing developers to inspect or act upon the newly created memories [Source 1].

## Signature

The provided source material does not define the internal structure of the `ExtractionResult` type. However, its usage is visible in the `AutoExtractorConfig` type, where it serves as the parameter for the `onExtracted` callback function [Source 1].

```typescript
import type { ExtractionResult } from "./strategies.js";

export type AutoExtractorConfig = {
  // ... other properties
  
  /** Called [[[[[[[[when]]]]]]]] memories are extracted. */
  onExtracted?: (result: ExtractionResult) => void;
  
  // ... other properties
};
```

## Examples

The following example shows how to use the `ExtractionResult` within the `onExtracted` callback when configuring an `AutoMemoryExtractor`.

```typescript
import { AutoMemoryExtractor, ExtractionResult } from 'yaaf';
import { myMemoryStrategy } from './my-strategy';

const extractor = new AutoMemoryExtractor({
  extractionStrategy: myMemoryStrategy,
  turnInterval: 2, // Extract every 2 turns
  
  // The 'result' parameter is of type ExtractionResult
  onExtracted: (result: ExtractionResult) => {
    console.log("Memories extracted successfully:", result);
    // You can now process the extracted data, e.g., log it or trigger other systems.
  },
  
  onError: (error: Error) => {
    console.error("Memory extraction failed:", error);
  },
});

// This extractor would then be hooked into an agent's lifecycle.
```

## Sources

[Source 1]: src/memory/autoExtract.ts