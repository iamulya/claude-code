---
summary: Defines the configuration options for the AutoMemoryExtractor class.
export_name: AutoExtractorConfig
source_file: src/memory/autoExtract.ts
category: type
title: AutoExtractorConfig
entity_type: api
search_terms:
 - configure memory extraction
 - AutoMemoryExtractor settings
 - memory extraction strategy
 - how to throttle memory extraction
 - set turn interval for extraction
 - minimum messages for extraction
 - memory extraction callbacks
 - onExtracted handler
 - onError handler for memory
 - background memory processing config
 - automatic knowledge extraction options
 - MemoryExtractionStrategy configuration
stub: false
compiled_at: 2026-04-24T16:51:57.909Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/autoExtract.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`AutoExtractorConfig` is a TypeScript type alias that defines the configuration object for the `Auto[[[[[[[[Memory]]]]]]]]Extractor` class [Source 1]. This object allows developers to customize the behavior of the automatic, background Memory extraction process.

Key configuration aspects include specifying the storage strategy for extracted memories, throttling the extraction frequency to run only every N turns, setting a minimum threshold of new messages to process, and providing callback functions for handling successful extractions or errors [Source 1].

## Signature

`AutoExtractorConfig` is a type alias for an object with the following properties:

```typescript
export type AutoExtractorConfig = {
  /** The extraction strategy to use for storing extracted memories. */
  extractionStrategy: MemoryExtractionStrategy;
  /** Only extract every N turns. Default: 1 (every turn). */
  turnInterval?: number;
  /** Only process messages if there are at least N new messages. Default: 3. */
  minNewMessages?: number;
  /** Called when memories are extracted. */
  onExtracted?: (result: ExtractionResult) => void;
  /** Called on extraction error. */
  onError?: (error: Error) => void;
};
```

### Properties

- **`extractionStrategy`**: `MemoryExtractionStrategy` (required)
  - The strategy instance that defines how and where extracted memories are stored [Source 1].
- **`turnInterval`**: `number` (optional)
  - Specifies that extraction should only run every `N` agent turns.
  - Defaults to `1`, meaning extraction runs after every turn [Source 1].
- **`minNewMessages`**: `number` (optional)
  - The minimum number of new messages since the last extraction required to trigger a new extraction pass.
  - Defaults to `3` [Source 1].
- **`onExtracted`**: `(result: ExtractionResult) => void` (optional)
  - A callback function that is invoked upon the successful extraction of memories [Source 1]. It receives the `ExtractionResult` as an argument.
- **`onError`**: `(error: Error) => void` (optional)
  - A callback function that is invoked if an error occurs during the extraction process [Source 1]. It receives the `Error` object as an argument.

## Examples

The following example demonstrates how to create an `AutoExtractorConfig` object and use it to instantiate an `AutoMemoryExtractor`.

```typescript
import { 
  AutoExtractorConfig, 
  AutoMemoryExtractor, 
  MemoryExtractionStrategy, 
  ExtractionResult 
} from 'yaaf';

// A hypothetical memory strategy implementation
const myMemoryStrategy: MemoryExtractionStrategy = {
  async store(context, memories) {
    // Logic to save memories to a database or file
    console.log(`Storing ${memories.length} memories.`);
    return { memories };
  },
  // ... other strategy methods
};

// Define the configuration for the memory extractor
const extractorConfig: AutoExtractorConfig = {
  extractionStrategy: myMemoryStrategy,
  turnInterval: 2, // Extract memories every 2 turns
  minNewMessages: 4, // Only if there are at least 4 new messages
  onExtracted: (result: ExtractionResult) => {
    console.log(`Successfully extracted ${result.memories.length} memories.`);
  },
  onError: (error: Error) => {
    console.error('Memory extraction failed:', error);
  },
};

// Use the configuration to create an extractor instance
const extractor = new AutoMemoryExtractor(extractorConfig);

// This extractor would then be hooked into an agent's lifecycle,
// for example, by calling extractor.onTurnComplete().
```

## See Also

- `AutoMemoryExtractor`: The class that uses this configuration object to perform automatic memory extraction.

## Sources

[Source 1]: src/memory/autoExtract.ts