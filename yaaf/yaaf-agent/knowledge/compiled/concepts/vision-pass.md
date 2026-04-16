---
summary: A compile-time process that ensures agents using text-only models can understand diagram and figure content via rich, auto-generated descriptions.
title: Vision Pass
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:27:39.806Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/vision.ts
confidence: 0.95
---

---
title: Vision Pass
entity_type: concept
summary: A compile-time process that ensures agents using text-only models can understand diagram and figure content via rich, auto-generated descriptions.
related_subsystems:
  - Knowledge Compiler

## What It Is
The Vision Pass (designated as **C3** in the compilation pipeline) is a specialized stage in the YAAF knowledge compilation process. It automatically generates descriptive alt-text and captions for images referenced within compiled articles that lack meaningful descriptions.

The primary purpose of the Vision Pass is to bridge the gap between multimodal content and text-only Large Language Models (LLMs). By converting visual information—such as diagrams, flowcharts, and figures—into rich textual descriptions, the framework ensures that agents without native vision capabilities can still reason about the visual components of the knowledge base.

## How It Works in YAAF
The Vision Pass runs at compile time after the initial synthesis of articles. The process follows a specific execution flow:

1.  **Pattern Matching**: The compiler parses article bodies to identify Markdown image patterns in the format `![alt](path)`.
2.  **Heuristic Filtering**: It evaluates existing alt-text. If the text is missing or deemed generic, the image is flagged for processing.
3.  **Resource Retrieval**: The compiler reads the flagged image files from the local disk.
4.  **Vision Analysis**: The image is sent to a vision-capable LLM via a `VisionCallFn`. The LLM generates a detailed description of the image content.
5.  **Content Rewriting**: The compiler updates the original article body, replacing the missing or generic alt-text with the LLM-generated description.

The implementation is centered around the `runVisionPass` function, which returns a `VisionPassResult` containing metrics on how many images were described, skipped, or failed, along with the total duration of the pass.

## Configuration
The Vision Pass is configured using the `VisionPassOptions` object. This allows developers to control the scope and constraints of the vision analysis to manage costs and processing time.

```typescript
export type VisionPassOptions = {
  /** Max images to process per run. Default: 50 */
  maxImages?: number
  /** Skip images smaller than this (bytes). Default: 1024 (skip tiny icons) */
  minImageBytes?: number
  /** Only process, don't write changes. Default: false */
  dryRun?: boolean
  /** Progress callback */
  onProgress?: (event: VisionProgressEvent) => void
}
```

### Example Usage
To execute the pass, a developer provides a vision-capable client and the directory of compiled articles:

```ts
const vision = makeKBVisionClient()
const result = await runVisionPass(vision, compiledDir, {
  maxImages: 100,
  minImageBytes: 2048 // Skip files smaller than 2KB
})
console.log(`Described ${result.described} images`)
```

## Sources
- `src/knowledge/compiler/vision.ts`