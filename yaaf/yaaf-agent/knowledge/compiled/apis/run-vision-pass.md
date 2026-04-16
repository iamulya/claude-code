---
summary: The primary function for executing the vision pass over compiled articles to generate image descriptions.
export_name: runVisionPass
source_file: src/knowledge/compiler/vision.ts
category: function
title: runVisionPass
entity_type: api
stub: false
compiled_at: 2026-04-16T14:27:45.839Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/vision.ts
confidence: 1
---

## Overview
The `runVisionPass` function executes the "C3 — Vision Pass" stage of the knowledge base compilation process. It is designed to auto-generate alt-text and captions for images referenced in compiled articles that lack meaningful descriptions.

The function operates by:
1. Parsing `![alt](path)` patterns from compiled Markdown article bodies.
2. Identifying images where alt-text is missing or generic.
3. Reading the identified images from the local file system.
4. Utilizing a vision-capable LLM to generate a descriptive text for the image.
5. Rewriting the image reference in the article with the newly generated alt-text.

This process ensures that agents using text-only models can interpret the content of diagrams, figures, and other visual assets through rich text descriptions.

## Signature / Constructor

```typescript
export async function runVisionPass(
  visionFn: VisionCallFn,
  compiledDir: string,
  options: VisionPassOptions = {}
): Promise<VisionPassResult>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `visionFn` | `VisionCallFn` | The LLM client function used to perform vision-to-text inference. |
| `compiledDir` | `string` | The directory path containing the compiled articles to be processed. |
| `options` | `VisionPassOptions` | Configuration settings for the vision pass execution. |

### Configuration Types

#### VisionPassOptions
| Property | Type | Description |
| :--- | :--- | :--- |
| `maxImages` | `number` | Maximum number of images to process in a single run. Defaults to `50`. |
| `minImageBytes` | `number` | Minimum file size in bytes required to process an image. Smaller images (e.g., tiny icons) are skipped. Defaults to `1024`. |
| `dryRun` | `boolean` | If `true`, the function identifies and processes images but does not write changes back to the files. Defaults to `false`. |
| `onProgress` | `(event: VisionProgressEvent) => void` | Optional callback function to track the progress of the vision pass. |

## Methods & Properties

### VisionPassResult
The function returns a promise that resolves to a `VisionPassResult` object containing the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `described` | `number` | The number of images that successfully received new alt-text. |
| `skipped` | `number` | The number of images skipped (e.g., already had descriptions or were too small). |
| `failed` | `number` | The number of images that failed to process due to errors. |
| `llmCalls` | `number` | The total number of calls made to the vision LLM. |
| `details` | `VisionDetail[]` | An array of detailed results for every image encountered. |
| `durationMs` | `number` | The total elapsed time of the operation in milliseconds. |

### VisionDetail
Each entry in the `details` array contains:
*   `docId`: The ID of the article document containing the image.
*   `imagePath`: The path or reference to the image file.
*   `action`: The outcome for this image (`'described'`, `'skipped'`, or `'failed'`).
*   `altText`: The generated description (if successful).
*   `message`: A reason for skipping or a description of the failure (if applicable).

## Events
The `onProgress` callback receives `VisionProgressEvent` objects:

| Event Type | Payload | Description |
| :--- | :--- | :--- |
| `vision:start` | `{ totalImages: number }` | Emitted when the vision pass begins, indicating the total number of images found. |

## Examples

### Basic Usage
This example demonstrates how to initialize a vision client and run the pass over a directory of compiled articles.

```typescript
import { runVisionPass } from 'yaaf';
import { makeKBVisionClient } from './llm-provider';

const vision = makeKBVisionClient();
const compiledDir = './dist/knowledge';

const result = await runVisionPass(vision, compiledDir, {
  maxImages: 20,
  minImageBytes: 2048
});

console.log(`Described ${result.described} images in ${result.durationMs}ms`);
```

### Dry Run
Performing a dry run to see which images would be processed without modifying the source files.

```typescript
const result = await runVisionPass(vision, compiledDir, {
  dryRun: true
});

result.details.forEach(detail => {
  if (detail.action === 'described') {
    console.log(`Would describe: ${detail.imagePath}`);
  }
});
```