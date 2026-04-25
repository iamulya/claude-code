---
export_name: VisionProgressEvent
source_file: src/knowledge/compiler/vision.ts
category: type
summary: Represents a progress update event emitted during the Vision Pass execution, indicating the start of processing.
title: VisionProgressEvent
entity_type: api
search_terms:
 - vision pass progress
 - image processing callback
 - onProgress event type
 - knowledge base compilation events
 - alt-text generation status
 - how to monitor vision pass
 - C3 vision pass
 - runVisionPass callback
 - vision:start event
 - total images to process
stub: false
compiled_at: 2026-04-24T17:48:52.692Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/vision.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

`VisionProgressEvent` is a TypeScript type that defines the shape of progress events emitted during the [Vision Pass](../subsystems/vision-pass.md), a compile-time process that generates alt-text for images [Source 1].

This event type is used by the `onProgress` callback function, which can be provided in the `VisionPassOptions` [when](./when.md) calling `runVisionPass`. It allows consumers to monitor the status of the image description process, which can be long-running. Currently, the only defined event is `vision:start`, which is emitted once at the beginning of the pass to signal how many total images have been identified for potential processing [Source 1].

## Signature

`VisionProgressEvent` is a discriminated union type. The following event shape is currently defined [Source 1]:

```typescript
export type VisionProgressEvent =
  | { type: "vision:start"; totalImages: number };
```

### Properties

*   `type`: A string literal `'vision:start'` that identifies the event.
*   `totalImages`: A `number` indicating the total count of images found that will be considered for description.

## Examples

The primary use of `VisionProgressEvent` is to handle progress updates from the `runVisionPass` function.

```typescript
import { runVisionPass, VisionCallFn, VisionProgressEvent } from 'yaaf';
import { join } from 'path';

// A mock vision function for demonstration
const mockVisionFn: VisionCallFn = async (imageBuffer: Buffer) => {
  return { description: 'A mock description.' };
};

const compiledKnowledgeDir = './out/compiled';

async function monitorVisionPass() {
  console.log('Starting Vision Pass...');

  const handleProgress = (event: VisionProgressEvent) => {
    switch (event.type) {
      case 'vision:start':
        console.log(`Vision Pass started. Found ${event.totalImages} images to process.`);
        break;
      // Future event types would be handled here
    }
  };

  const result = await runVisionPass(mockVisionFn, compiledKnowledgeDir, {
    onProgress: handleProgress,
  });

  console.log(`Vision Pass complete. Described ${result.described} images.`);
}

monitorVisionPass();
```

In this example, the `handleProgress` function is typed with `VisionProgressEvent` and logs a message when the `vision:start` event is received [Source 1].

## See Also

*   `runVisionPass`: The function that executes the Vision Pass and emits these events.
*   `VisionPassOptions`: The configuration object for `runVisionPass`, which includes the `onProgress` callback.

## Sources

[Source 1]: src/knowledge/compiler/vision.ts