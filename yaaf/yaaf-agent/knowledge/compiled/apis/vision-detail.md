---
export_name: VisionDetail
source_file: src/knowledge/compiler/vision.ts
category: type
summary: Provides detailed information for a single image processed during the Vision Pass, including its document ID, path, action taken, and generated alt-text.
title: VisionDetail
entity_type: api
search_terms:
 - image processing details
 - vision pass results
 - alt-text generation log
 - image description status
 - what happened to an image
 - runVisionPass output
 - VisionPassResult details
 - knowledge base image compilation
 - image captioning report
 - failed image processing reason
 - skipped image reason
 - per-image vision log
stub: false
compiled_at: 2026-04-24T17:48:34.289Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/vision.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `VisionDetail` type is a data structure that represents the outcome of processing a single image during the knowledge base's [Vision Pass](../subsystems/vision-pass.md). The Vision Pass is a compile-time process that automatically generates descriptive alt-text for images that lack it [Source 1].

An array of `VisionDetail` objects is returned as the `details` property of the `VisionPassResult` object from the `runVisionPass` function. Each `VisionDetail` object serves as a log entry, providing a granular report on whether an image was successfully described, skipped for a specific reason, or failed to process. This allows for detailed inspection and debugging of the image captioning process [Source 1].

## Signature

`VisionDetail` is a TypeScript type alias.

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

### Properties

- **`docId: string`**: The document ID of the compiled article that contains the reference to the image [Source 1].
- **`imagePath: string`**: The path or reference to the image file as it appears in the article markdown [Source 1].
- **`action: "described" | "skipped" | "failed"`**: A string literal indicating the result of the operation on this image [Source 1].
  - `"described"`: New alt-text was successfully generated and applied.
  - `"skipped"`: The image was intentionally skipped (e.g., it already had good alt-text, or it was too small).
  - `"failed"`: An error occurred while processing the image (e.g., file not found, [LLM](../concepts/llm.md) error).
- **`altText?: string`**: If the `action` is `"described"`, this property contains the newly generated alt-text from the vision model. It is `undefined` otherwise [Source 1].
- **`message?: string`**: If the `action` is `"skipped"` or `"failed"`, this property provides a human-readable reason. It is `undefined` otherwise [Source 1].

## Examples

The primary use of `VisionDetail` is to inspect the results of a `runVisionPass` execution. The following example demonstrates how to iterate through the `details` array of a `VisionPassResult` to log the outcome for each processed image.

```typescript
import { runVisionPass, VisionPassResult, VisionDetail, VisionCallFn } from 'yaaf';
import { join } from 'path';

// Assume visionFn is a configured function that calls a vision LLM
declare const visionFn: VisionCallFn;
const compiledDir = join(process.cwd(), 'kb', 'compiled');

async function processAndLogImages() {
  const result: VisionPassResult = await runVisionPass(visionFn, compiledDir);

  console.log(`Vision pass complete. Total duration: ${result.durationMs}ms`);
  console.log(`Described: ${result.described}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
  console.log('--- Per-Image Details ---');

  // Iterate through the details to log what happened to each image
  for (const detail of result.details) {
    logImageDetail(detail);
  }
}

function logImageDetail(detail: VisionDetail) {
  const imageId = `'${detail.imagePath}' in '${detail.docId}'`;
  switch (detail.action) {
    case 'described':
      console.log(`[SUCCESS] Described ${imageId}. New alt-text: "${detail.altText}"`);
      break;
    case 'skipped':
      console.log(`[SKIPPED] Skipped ${imageId}. Reason: ${detail.message}`);
      break;
    case 'failed':
      console.log(`[FAILED]  Failed to process ${imageId}. Reason: ${detail.message}`);
      break;
  }
}

processAndLogImages();
```

## See Also

- `runVisionPass`: The function that executes the Vision Pass and returns a `VisionPassResult`.
- `VisionPassResult`: The object returned by `runVisionPass`, which contains the `details` array of `VisionDetail` objects.

## Sources

[Source 1]: src/knowledge/compiler/vision.ts