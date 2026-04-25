---
export_name: VisionPassOptions
source_file: src/knowledge/compiler/vision.ts
category: type
summary: Defines the configuration options for the Vision Pass, such as maximum images to process, minimum image size, and progress callbacks.
title: VisionPassOptions
entity_type: api
search_terms:
 - vision pass configuration
 - image processing options
 - configure alt-text generation
 - how to limit vision pass
 - dry run image description
 - vision progress callback
 - skip small images
 - max images to process
 - runVisionPass options
 - knowledge base image settings
 - C3 vision pass
 - auto-captioning settings
stub: false
compiled_at: 2026-04-24T17:48:38.026Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/vision.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `VisionPassOptions` type defines a configuration object used to customize the behavior of the `runVisionPass` function [Source 1]. The [Vision Pass](../subsystems/vision-pass.md) is a compile-time process (referred to as "C3 — Vision Pass") that automatically generates descriptive alt-text for images in a knowledge base that lack them. This ensures that agents using text-only models can understand the content of diagrams and figures [Source 1].

`VisionPassOptions` allows developers to control aspects of this process, such as setting limits on the number of images processed, establishing size thresholds to skip trivial images, enabling a "dry run" mode to preview changes, and subscribing to progress updates [Source 1].

## Signature

`VisionPassOptions` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type VisionPassOptions = {
  /** 
   * Max images to process per run. 
   * @default 50 
   */
  maxImages?: number;

  /** 
   * Skip images smaller than this (bytes). 
   * Useful for skipping tiny icons.
   * @default 1024 
   */
  minImageBytes?: number;

  /** 
   * If true, only process images but do not write changes to disk. 
   * @default false 
   */
  dryRun?: boolean;

  /** 
   * A callback function to receive progress events during the pass.
   */
  onProgress?: (event: VisionProgressEvent) => void;
};
```

### Properties

*   **`maxImages`** `number` (optional): The maximum number of images to process in a single run. The default is 50.
*   **`minImageBytes`** `number` (optional): The minimum size in bytes for an image to be processed. Images smaller than this value will be skipped. The default is 1024 bytes (1 KB), which helps avoid processing small icons.
*   **`dryRun`** `boolean` (optional): [when](./when.md) set to `true`, the Vision Pass will analyze images and determine what changes would be made, but it will not write the new alt-text to the article files. The default is `false`.
*   **`onProgress`** `(event: VisionProgressEvent) => void` (optional): A callback function that is invoked with progress events as the Vision Pass executes. See the Events section for payload details.

## Events

When an `onProgress` callback is provided, it receives `VisionProgressEvent` objects. The following event types are defined [Source 1]:

*   **`vision:start`**: Fired once at the beginning of the process.
    *   **Payload**: `{ type: "vision:start"; totalImages: number }`
    *   `totalImages`: The total number of images identified for potential processing.

## Examples

The following example demonstrates how to configure and use `VisionPassOptions` with the `runVisionPass` function. It sets a limit on the number of images, enables a dry run, and logs progress to the console.

```typescript
import { runVisionPass, VisionPassOptions } from 'yaaf';
import type { VisionCallFn } from 'yaaf'; // Assuming this is exported

// Assume visionFn is an initialized vision-capable LLM client
// and compiledDir is the path to the compiled knowledge base.
declare const visionFn: VisionCallFn;
const compiledDir = './dist/kb';

// Configure the Vision Pass to process a maximum of 20 images
// in a dry run and log the start event.
const options: VisionPassOptions = {
  maxImages: 20,
  dryRun: true,
  minImageBytes: 2048, // Skip images smaller than 2KB
  onProgress: (event) => {
    if (event.type === 'vision:start') {
      console.log(`[Vision Pass] Starting dry run. Found ${event.totalImages} images to check.`);
    }
    // Other progress events could be handled here.
  },
};

async function main() {
  const result = await runVisionPass(visionFn, compiledDir, options);

  console.log(`Dry run complete.`);
  console.log(` - Would have described: ${result.described} images`);
  console.log(` - Skipped: ${result.skipped} images`);
  console.log(` - Failed: ${result.failed} images`);
}

main();
```

## See Also

*   `runVisionPass`: The function that consumes `VisionPassOptions` to execute the image description process.
*   `VisionProgressEvent`: The type for events passed to the `onProgress` callback.
*   `VisionPassResult`: The return type of `runVisionPass`, summarizing the outcome.

## Sources

[Source 1] `src/knowledge/compiler/vision.ts`