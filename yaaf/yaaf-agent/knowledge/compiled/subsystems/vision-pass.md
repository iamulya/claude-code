---
title: Vision Pass
entity_type: subsystem
summary: Auto-generates descriptive alt-text for images in compiled knowledge articles using a vision-capable LLM.
primary_files:
 - src/knowledge/compiler/vision.ts
exports:
 - runVisionPass
 - VisionPassOptions
 - VisionPassResult
 - VisionDetail
 - VisionProgressEvent
search_terms:
 - image alt text generation
 - automatic image description
 - vision model for documentation
 - how to describe images for LLMs
 - making images accessible to text models
 - compile-time image processing
 - C3 vision pass
 - image captioning
 - markdown image alt text
 - LLM vision API
 - accessibility for agents
 - understanding diagrams in text
 - image to text
stub: false
compiled_at: 2026-04-24T18:21:37.864Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/vision.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Vision Pass is a compile-time subsystem responsible for making visual content, such as diagrams and figures, accessible to text-only language models [Source 1]. It operates on compiled knowledge articles, automatically generating descriptive alt-text for images that have missing or generic descriptions. This ensures that agents relying on these articles can understand the content of referenced images, even without direct vision capabilities [Source 1].

Internally referred to as "C3 — Vision Pass," it runs after the main knowledge synthesis phase of the compilation process [Source 1].

## Architecture

The Vision Pass operates as a post-processing step on a directory of compiled markdown articles. Its [workflow](../concepts/workflow.md) for each article is as follows [Source 1]:

1.  **Parsing**: It scans the article's content for markdown image references, specifically `![alt](path)` patterns.
2.  **Filtering**: For each image found, it checks if the existing alt-text is missing or too generic to be useful. It also skips images that are too small, such as tiny icons, based on a configurable byte threshold.
3.  **Image Processing**: If an image requires description, the system reads the image file from the disk.
4.  **[LLM](../concepts/llm.md) Invocation**: The image data is sent to an external, vision-capable LLM via a provided function handle (`VisionCallFn`).
5.  **Article Rewriting**: The LLM's generated description is then used to rewrite the markdown image reference in the article file, replacing the original alt-text.

This process is orchestrated by the `[[[[[[[[runVisionPass]]]]]]]]` function, which iterates over all articles in a specified directory and aggregates the results [Source 1].

## Integration Points

The Vision Pass integrates with the broader knowledge compilation pipeline in several ways:

*   **[Knowledge Compiler](./knowledge-compiler.md)**: It is a distinct pass within the compiler, designed to run after articles have been synthesized and written to a compiled directory [Source 1].
*   **[LLM Client](../concepts/llm-client.md)**: It is decoupled from any specific LLM provider. The subsystem requires a `VisionCallFn` to be injected, which abstracts the call to a vision-[Capable Model](../concepts/capable-model.md). This allows developers to use any compatible service [Source 1].
*   **File System**: It directly reads and writes files within the compiled knowledge directory, modifying markdown articles in place to update image references [Source 1].

## Key APIs

The primary interface to this subsystem is the `runVisionPass` function and its associated data structures [Source 1].

### runVisionPass()

This asynchronous function executes the Vision Pass over a directory of compiled articles.

```typescript
export async function runVisionPass(
  visionFn: VisionCallFn,
  compiledDir: string,
  options: VisionPassOptions = { /* ... */ }
): Promise<[[[[[[[[VisionPassResult]]]]]]]]>
```

*   **`visionFn`**: A function that takes image data and returns a text description from a vision LLM.
*   **`compiledDir`**: The path to the directory containing the compiled markdown articles to process.
*   **`options`**: A `VisionPassOptions` object for configuring the run.

**Example Usage:**

```ts
const vision = makeKBVisionClient()
const result = await runVisionPass(vision, compiledDir)
console.log(`Described ${result.described} images`)
```
[Source 1]

### VisionPassResult

The `runVisionPass` function returns a `VisionPassResult` object, which provides a summary of the operation [Source 1].

*   **`described`**: The number of images that received new alt-text.
*   **`skipped`**: The number of images skipped because they already had descriptions, were too small, or for other reasons.
*   **`failed`**: The number of images that could not be processed due to file errors or LLM failures.
*   **`llmCalls`**: The total number of calls made to the vision LLM.
*   **`details`**: An array of `VisionDetail` objects, providing per-image status.
*   **`durationMs`**: The total time taken for the pass in milliseconds.

## Configuration

The behavior of the Vision Pass can be customized through the `VisionPassOptions` object passed to `runVisionPass` [Source 1].

*   **`maxImages`**: The maximum number of images to process in a single run. Defaults to `50`.
*   **`minImageBytes`**: Skips processing for images smaller than this size in bytes. This is used to avoid processing small icons. Defaults to `1024`.
*   **`dryRun`**: If `true`, the pass will run and report what it would have changed, but will not write any modifications to disk. Defaults to `false`.
*   **`onProgress`**: An optional callback function that receives `VisionProgressEvent` updates during the run.

## Extension Points

The primary extension point for the Vision Pass is its provider-agnostic design. By implementing and providing a custom `VisionCallFn`, developers can integrate any vision-capable LLM backend to perform the image description task [Source 1]. This allows for flexibility in choosing models based on cost, performance, or specific capabilities.

## Sources

[Source 1]: src/knowledge/compiler/vision.ts