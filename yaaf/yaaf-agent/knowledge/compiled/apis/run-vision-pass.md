---
export_name: runVisionPass
source_file: src/knowledge/compiler/vision.ts
category: function
summary: Asynchronously runs the vision pass over all compiled articles in a specified directory, generating alt-text for images using a vision-capable LLM.
title: runVisionPass
entity_type: api
search_terms:
 - generate image alt text
 - vision model for documentation
 - image description generation
 - how to add alt text to markdown images
 - knowledge base image processing
 - C3 vision pass
 - make images accessible to LLMs
 - auto-caption images
 - VisionPassOptions
 - VisionPassResult
 - VisionCallFn
 - process images in compiled articles
stub: false
compiled_at: 2026-04-24T17:34:30.264Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/vision.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `runVisionPass` function is a compile-time utility that automatically generates descriptive alt-text for images referenced in compiled knowledge base articles [Source 1]. This process, known as the "C3 — [Vision Pass](../subsystems/vision-pass.md)," enhances the accessibility of visual content for agents that rely on text-only models [Source 1].

The function operates by scanning the content of articles in a specified directory for Markdown image syntax (`![alt](path)`). For each image found, it checks if the existing alt-text is missing or generic. If so, it reads the image file from disk, sends it to a provided vision-capable [LLM](../concepts/llm.md), and uses the LLM's response to rewrite the image reference with a rich, descriptive alt-text [Source 1].

This is primarily used after the synthesis step of the knowledge base compilation process to ensure that diagrams, figures, and other visual information can be understood by language models that cannot process images directly [Source 1].

## Signature

The function is asynchronous and returns a promise that resolves to a `VisionPassResult` object detailing the outcome of the operation [Source 1].

```typescript
export async function runVisionPass(
  visionFn: VisionCallFn,
  compiledDir: string,
  options?: VisionPassOptions
): Promise<VisionPassResult>;
```

### Parameters

-   **`visionFn: VisionCallFn`**: A function that handles the call to a vision-capable LLM. The framework provides clients for this purpose [Source 1].
-   **`compiledDir: string`**: The path to the directory containing the compiled articles to be processed [Source 1].
-   **`options?: VisionPassOptions`**: An optional configuration object to customize the pass [Source 1].

### Configuration (`VisionPassOptions`)

The `options` object allows for fine-tuning the vision pass [Source 1]:

```typescript
export type VisionPassOptions = {
  /** Max images to process per run. Default: 50 */
  maxImages?: number;
  /** Skip images smaller than this (bytes). Default: 1024 (skip tiny icons) */
  minImageBytes?: number;
  /** Only process, don't write changes. Default: false */
  dryRun?: boolean;
  /** Progress callback */
  onProgress?: (event: VisionProgressEvent) => void;
};
```

### Return Value (`VisionPassResult`)

The function returns a `VisionPassResult` object summarizing the run [Source 1]:

```typescript
export type VisionPassResult = {
  /** Images that got new alt-text */
  described: number;
  /** Images skipped (already have good alt-text, too small, etc.) */
  skipped: number;
  /** Images that failed (unreadable, LLM error) */
  failed: number;
  /** Number of vision LLM calls made */
  llmCalls: number;
  /** Per-image details */
  details: VisionDetail[];
  /** Total elapsed time (ms) */
  durationMs: number;
};
```

The `details` array contains `VisionDetail` objects for each processed image [Source 1]:

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

## Events

Progress can be monitored by providing an `onProgress` callback in the `options` object. This callback receives `VisionProgressEvent` objects [Source 1].

-   **`vision:start`**: Fired once at the beginning of the process.
    -   **Payload**: `{ type: "vision:start"; totalImages: number }`

## Examples

The following example demonstrates how to run the vision pass on a directory of compiled articles and log the results [Source 1].

```typescript
// Assumes `makeKBVisionClient` is a helper to create a vision function
// and `compiledDir` is the path to your compiled articles.
import { runVisionPass } from 'yaaf';
import { makeKBVisionClient } from './llmClient.js'; // Example import

const compiledDir = './kb/compiled';
const vision = makeKBVisionClient();

async function processImages() {
  const result = await runVisionPass(vision, compiledDir, {
    maxImages: 100,
    dryRun: false,
  });

  console.log(`Vision pass complete in ${result.durationMs}ms.`);
  console.log(`- Described: ${result.described}`);
  console.log(`- Skipped:   ${result.skipped}`);
  console.log(`- Failed:    ${result.failed}`);
}

processImages();
```

## Sources

[Source 1]: src/knowledge/compiler/vision.ts