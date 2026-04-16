---
summary: A logical subsystem of the YAAF knowledge compiler that identifies images in articles and enriches them with LLM-generated alt-text.
primary_files:
  - src/knowledge/compiler/vision.ts
title: Knowledge Compiler Vision Pass
entity_type: subsystem
exports:
  - runVisionPass
  - VisionPassOptions
  - VisionPassResult
  - VisionDetail
stub: false
compiled_at: 2026-04-16T14:27:42.706Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/vision.ts
confidence: 0.98
---

## Purpose
The Knowledge Compiler Vision Pass (designated as "C3") is a post-synthesis compile-time step designed to enhance the accessibility and utility of knowledge base articles. Its primary objective is to ensure that images, diagrams, and figures referenced within articles are understandable by LLMs that may lack native vision capabilities. 

By identifying image references with missing or generic alt-text and replacing them with descriptive, LLM-generated captions, the subsystem allows text-only models to process the visual context of a document.

## Architecture
The Vision Pass operates as a sequential pipeline that processes compiled articles after they have been synthesized. The internal workflow follows a four-step pattern:

1.  **Pattern Matching**: The system parses article bodies to identify Markdown image patterns (`![alt](path)`).
2.  **Heuristic Filtering**: It evaluates existing alt-text. If the text is missing or deemed generic, and the image file meets specific criteria (such as minimum file size), it proceeds to enrichment.
3.  **Vision Analysis**: The subsystem reads the image from the local file system and transmits it to a vision-capable LLM via a provided `VisionCallFn`.
4.  **Content Rewriting**: The original image reference in the article is updated with the new, descriptive alt-text.

## Key APIs
The subsystem's primary entry point is the `runVisionPass` function, which orchestrates the analysis across a directory of compiled articles.

### runVisionPass
This function executes the vision enrichment process. It requires a vision-capable LLM client and the path to the compiled articles directory.

```typescript
const vision = makeKBVisionClient();
const result = await runVisionPass(vision, compiledDir, {
  maxImages: 100,
  dryRun: false
});
console.log(`Described ${result.described} images`);
```

### VisionPassResult
The execution returns a result object containing metrics and granular details about the pass:
*   **described**: Number of images successfully enriched.
*   **skipped**: Number of images ignored (due to existing alt-text, small file size, etc.).
*   **failed**: Number of images that could not be processed due to read errors or LLM failures.
*   **llmCalls**: Total number of requests made to the vision provider.
*   **details**: An array of `VisionDetail` objects mapping specific document IDs to the actions taken and the resulting alt-text.

## Configuration
The behavior of the Vision Pass is controlled via the `VisionPassOptions` object:

| Property | Type | Description |
| :--- | :--- | :--- |
| `maxImages` | `number` | The maximum number of images to process in a single run (Default: 50). |
| `minImageBytes` | `number` | Minimum file size threshold to avoid processing tiny icons or spacers (Default: 1024 bytes). |
| `dryRun` | `boolean` | If true, the system identifies and describes images but does not write changes to disk. |
| `onProgress` | `function` | A callback for monitoring the progress of the vision pass. |

## Extension Points
The subsystem is provider-agnostic regarding the vision model used. Developers extend the functionality by providing a custom implementation of the `VisionCallFn`. This function acts as the bridge between the Vision Pass subsystem and specific LLM providers (e.g., OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet).