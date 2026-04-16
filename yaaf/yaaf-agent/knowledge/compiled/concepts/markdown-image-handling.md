---
summary: The process of identifying, locating, and localizing image assets referenced within markdown documentation during the ingestion pipeline.
title: Markdown Image Handling
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:23:51.952Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/images.ts
confidence: 0.9
---

---
title: Markdown Image Handling
entity_type: concept
summary: The process of identifying, locating, and localizing image assets referenced within markdown documentation during the ingestion pipeline.
related_subsystems:
  - Ingester
  - Knowledge Compiler

## What It Is
Markdown Image Handling is a core process within the YAAF Ingester pipeline designed to manage image assets referenced in documentation. It ensures that images—whether referenced via local relative paths, absolute paths, or remote URLs—are correctly identified, validated, and localized for use by the framework. This process prevents broken image links in processed documentation and allows the framework to treat images as structured `ImageRef` entities.

## How It Works in YAAF
The image handling logic is primarily implemented in the `src/knowledge/compiler/ingester/images.ts` utility suite. The pipeline follows a specific sequence: extraction, resolution, and localization.

### Extraction
The framework uses `extractMarkdownImageRefs` to scan markdown text for image syntax. It supports two primary formats:
*   **Inline images:** `![alt text](image-url)`
*   **Reference-style images:** `![alt text][id]`

### Resolution Logic
Once extracted, each `RawImageRef` is processed by `resolveImageRef`. The resolution follows a strict priority order:
1.  **Absolute Paths:** If the source is an absolute path that exists on the local filesystem, it is used directly.
2.  **Relative Paths:** If the source is relative, the framework attempts to resolve it relative to the directory containing the markdown document.
3.  **Remote URLs:** If the source is a URL, the framework attempts to download the asset to a local directory defined in the configuration.

### MIME Type Detection
YAAF identifies image types using `detectImageMimeType`. This utility prioritizes "magic bytes" in the file header to determine the actual file format, falling back to file extension-based detection if header analysis is unavailable. SVGs are specifically identified via `isSvg` and are often treated as text-based placeholders within the `ImageRef` structure.

### Localization and Error Handling
Remote images are fetched using Node.js built-in fetch capabilities (Node 18+) via the `downloadImage` function. The resulting files are stored in the `imageOutputDir`. 

The high-level coordinator, `resolveAllMarkdownImages`, aggregates all references in a document. It is designed to be resilient; if an image cannot be resolved or downloaded, the framework logs a warning and skips the asset rather than terminating the ingestion process.

## Configuration
Developers configure image handling behavior through the `IngesterOptions` object passed to the compiler.

```typescript
import { resolveAllMarkdownImages } from './ingester/images';

const options = {
  imageOutputDir: './dist/assets/images', // Where downloaded/localized images are stored
  sourceUrl: 'https://github.com/org/repo/raw/main/docs' // Base URL for resolving relative remote assets
};

const [resolvedImages, unresolved] = await resolveAllMarkdownImages(
  markdownContent,
  absoluteDocPath,
  options
);
```

## Sources
* `src/knowledge/compiler/ingester/images.ts`---