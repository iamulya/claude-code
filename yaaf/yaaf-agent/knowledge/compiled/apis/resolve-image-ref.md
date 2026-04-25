---
export_name: resolveImageRef
source_file: src/knowledge/compiler/ingester/images.ts
category: function
title: resolveImageRef
entity_type: api
summary: Resolves a markdown image reference to a local file path by checking local paths and downloading remote URLs.
search_terms:
 - markdown image processing
 - handle local images in markdown
 - download remote images for knowledge base
 - resolve relative image paths
 - ingest images from markdown
 - convert image URL to local file
 - knowledge compiler image handling
 - absolute path for images
 - IngesterOptions imageOutputDir
 - RawImageRef to ImageRef
 - find image file from src
stub: false
compiled_at: 2026-04-24T17:32:45.466Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/images.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `resolveImageRef` function is an asynchronous utility used within the YAAF knowledge [Ingester](./ingester.md) pipeline to resolve an image reference extracted from a markdown document. It takes a raw image reference (`RawImageRef`) and attempts to locate the corresponding image file, returning a structured `ImageRef` object upon success or `null` if the image cannot be found or processed. [Source 1]

This function is a core part of making markdown documents self-contained within the knowledge base by ensuring all referenced images are locally available. It employs a specific resolution strategy [Source 1]:

1.  **Absolute Path**: If the `src` is an absolute file path that exists on the local filesystem, it is used directly.
2.  **Relative Path**: If the `src` is a relative path, it is resolved relative to the directory containing the source markdown document (`documentPath`).
3.  **URL**: If the `src` is a URL, the function attempts to download the image and save it to the directory specified by `options.imageOutputDir`.

## Signature

```typescript
export async function resolveImageRef(
  rawRef: RawImageRef,
  documentPath: string,
  options?: IngesterOptions
): Promise<ImageRef | null>;
```

### Parameters

*   **`rawRef`** (`RawImageRef`): An object representing the image reference as parsed from markdown. It includes the `src`, `altText`, and original markdown string. [Source 1]
    ```typescript
    type RawImageRef = {
      altText: string;
      src: string;
      /** Character offset in the markdown text where this ref is found */
      offset: number;
      /** The full original markdown string: ![alt](src) */
      fullMatch: string;
    };
    ```
*   **`documentPath`** (`string`): The absolute path to the markdown document from which the `rawRef` was extracted. This is essential for resolving relative image paths. [Source 1]
*   **`options`** (`IngesterOptions`, optional): Configuration for the ingester pipeline. The `imageOutputDir` property is used to determine where to save downloaded images. [Source 1]

### Return Value

The function returns a `Promise` that resolves to:

*   An `ImageRef` object if the image is successfully located or downloaded. This object contains the absolute path to the local image file and other metadata.
*   `null` if the image cannot be resolved (e.g., the file doesn't exist, the URL is invalid, or the download fails). [Source 1]

## Examples

### Resolving a Relative Image Path

This example shows how to resolve an image located in a subdirectory relative to the markdown file.

```typescript
import { resolveImageRef } from 'yaaf/knowledge';
import type { RawImageRef, IngesterOptions } from 'yaaf/knowledge';

const rawRef: RawImageRef = {
  altText: 'System Architecture',
  src: '../assets/architecture.png',
  offset: 123,
  fullMatch: '![System Architecture](../assets/architecture.png)',
};

const documentPath = '/project/docs/guides/getting-started.md';

const resolvedImage = await resolveImageRef(rawRef, documentPath);

if (resolvedImage) {
  console.log('Image resolved to:', resolvedImage.absolutePath);
  // Expected output (assuming file exists):
  // Image resolved to: /project/docs/assets/architecture.png
} else {
  console.log('Could not resolve image.');
}
```

### Downloading and Resolving a Remote Image

This example demonstrates resolving an image from a URL. The image will be downloaded to the specified `imageOutputDir`.

```typescript
import { resolveImageRef } from 'yaaf/knowledge';
import type { RawImageRef, IngesterOptions } from 'yaaf/knowledge';

const rawRef: RawImageRef = {
  altText: 'YAAF Logo',
  src: 'https://example.com/yaaf-logo.svg',
  offset: 45,
  fullMatch: '![YAAF Logo](https://example.com/yaaf-logo.svg)',
};

const documentPath = '/project/docs/index.md';
const options: IngesterOptions = {
  imageOutputDir: '/project/dist/kb-images',
};

const resolvedImage = await resolveImageRef(rawRef, documentPath, options);

if (resolvedImage) {
  console.log('Image downloaded to:', resolvedImage.absolutePath);
  // Expected output (assuming download succeeds):
  // Image downloaded to: /project/dist/kb-images/yaaf-logo.svg
} else {
  console.log('Could not download or resolve image.');
}
```

### Handling a Failed Resolution

If the image source cannot be found, the function returns `null`.

```typescript
import { resolveImageRef } from 'yaaf/knowledge';
import type { RawImageRef } from 'yaaf/knowledge';

const rawRef: RawImageRef = {
  altText: 'Missing Diagram',
  src: './non-existent-diagram.jpg',
  offset: 99,
  fullMatch: '![Missing Diagram](./non-existent-diagram.jpg)',
};

const documentPath = '/project/docs/main.md';

const resolvedImage = await resolveImageRef(rawRef, documentPath);

if (resolvedImage === null) {
  console.log(`Warning: Failed to resolve image: ${rawRef.src}`);
}
```

## See Also

*   `extractMarkdownImageRefs`: The function used to parse `RawImageRef` objects from markdown text.
*   `resolveAllMarkdownImages`: A higher-level function that uses `resolveImageRef` to process all images in a document.
*   `ImageRef` (type): The resolved image object returned by this function.
*   `IngesterOptions` (type): The configuration object that can control this function's behavior.

## Sources

[Source 1]: src/knowledge/compiler/ingester/images.ts