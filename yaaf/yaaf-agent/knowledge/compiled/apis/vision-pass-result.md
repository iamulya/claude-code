---
export_name: VisionPassResult
source_file: src/knowledge/compiler/vision.ts
category: type
summary: Encapsulates the outcome of a Vision Pass run, including counts of described, skipped, and failed images, and total duration.
title: VisionPassResult
entity_type: api
search_terms:
 - vision pass output
 - image description results
 - knowledge base compilation stats
 - alt-text generation summary
 - how to check vision pass status
 - C3 vision pass result type
 - image processing metrics
 - LLM vision call summary
 - runVisionPass return type
 - vision pass details
 - failed image processing
 - skipped image count
stub: false
compiled_at: 2026-04-24T17:48:39.415Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/vision.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `VisionPassResult` type is a data structure that represents the complete outcome of a `runVisionPass` operation [Source 1]. The [Vision Pass](../subsystems/vision-pass.md) is a compile-time process that automatically generates descriptive alt-text for images in a knowledge base, making them accessible to text-only [LLM](../concepts/llm.md) agents [Source 1].

This type provides a high-level summary of the pass, including counters for successfully described, skipped, and failed images. It also contains a detailed breakdown of the action taken for each individual image processed, along with the total time elapsed for the operation [Source 1]. It is the return type of the `runVisionPass` function and is primarily used for logging, monitoring, and debugging the knowledge base compilation process.

## Signature

`VisionPassResult` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type VisionPassResult = {
  /** Images that got new alt-text */
  described: number;
  /** Images skipped (already have good alt-text, too small, etc.) */
  skipped: number;
  /** Images that failed (unreadable, LLM error) */
  failed: number;
  /** Number of vision [[[[[[[[LLM Call]]]]]]]]s made */
  llmCalls: number;
  /** Per-image details */
  details: VisionDetail[];
  /** Total elapsed time (ms) */
  durationMs: number;
};
```

### Properties

*   `described: number`
    The total number of images for which new alt-text was successfully generated and applied [Source 1].

*   `skipped: number`
    The total number of images that were skipped. Reasons for skipping include the image already having sufficient alt-text or being smaller than the configured `minImageBytes` threshold [Source 1].

*   `failed: number`
    The total number of images that could not be processed due to an error, such as the file being unreadable or an error occurring during the LLM Call [Source 1].

*   `llmCalls: number`
    The total number of calls made to the vision-capable LLM during the pass [Source 1].

*   `details: VisionDetail[]`
    An array containing detailed information about each image that was processed. Each object in the array conforms to the `VisionDetail` type [Source 1].

*   `durationMs: number`
    The total duration of the `runVisionPass` operation, measured in milliseconds [Source 1].

### Related Types

#### `VisionDetail`

The `VisionDetail` type provides specific information about the outcome for a single image [Source 1].

```typescript
export type VisionDetail = {
  /** Article docId containing the image */
  docId: string;
  /** Image path/reference */
  imagePath: string;
  /** Action taken */
  action: "described" | "skipped" | "failed";
  /** Alt-text (if described) */
  altText?: string;
  /** Reason for skip/failure */
  message?: string;
};
```

## Examples

### Basic Usage

The following example shows how to execute `runVisionPass` and inspect the `VisionPassResult` to log a summary of the operation [Source 1].

```typescript
import { runVisionPass, makeKBVisionClient } from 'yaaf/knowledge';

const vision = makeKBVisionClient(); // Assumes a configured vision client
const compiledDir = './kb/compiled';

const result = await runVisionPass(vision, compiledDir);

console.log(`Vision Pass complete in ${result.durationMs}ms.`);
console.log(`- Described: ${result.described}`);
console.log(`- Skipped:   ${result.skipped}`);
console.log(`- Failed:    ${result.failed}`);
```

### Inspecting Details

This example demonstrates how to iterate through the `details` array to find and log information about images that failed processing.

```typescript
import { runVisionPass, makeKBVisionClient, VisionPassResult } from 'yaaf/knowledge';

async function processImages() {
  const vision = makeKBVisionClient();
  const compiledDir = './kb/compiled';
  const result: VisionPassResult = await runVisionPass(vision, compiledDir);

  if (result.failed > 0) {
    console.error('Some images failed to process:');
    const failedImages = result.details.filter(d => d.action === 'failed');
    
    for (const detail of failedImages) {
      console.error(
        `  - Image: ${detail.imagePath} in doc ${detail.docId}`
      );
      console.error(`    Reason: ${detail.message}`);
    }
  }
}

processImages();
```

## Sources

[Source 1] `src/knowledge/compiler/vision.ts`