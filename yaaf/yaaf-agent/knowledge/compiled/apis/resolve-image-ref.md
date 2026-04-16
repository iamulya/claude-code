---
summary: Resolves a markdown image reference to a local file path or downloads it if it's a remote URL.
export_name: resolveImageRef
source_file: src/knowledge/compiler/ingester/images.ts
category: function
title: resolveImageRef
entity_type: api
stub: false
compiled_at: 2026-04-16T14:23:44.169Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/images.ts
confidence: 1
---

## Overview
`resolveImageRef` is a utility function used within the knowledge ingester pipeline to process image references found in Markdown documents. It converts raw image source strings (from `![]()` syntax) into validated local file paths or `ImageRef` objects.

The function follows a specific resolution order:
1. **Absolute Paths**: If the source is an absolute path that exists on the filesystem, it is used directly.
2. **Relative Paths**: If the source is a relative path, it is resolved relative to the directory containing the Markdown document.
3. **Remote URLs**: If the source is a URL, the function attempts to download the image to a specified output directory.

## Signature / Constructor

```typescript
export async function resolveImageRef(
  rawRef: RawImageRef,
  documentPath: string,
  options: IngesterOptions = {}
): Promise<ImageRef | null>
```

### Parameters
*   `rawRef`: A `RawImageRef` object containing the metadata extracted from the Markdown text.
*   `documentPath`: The absolute path to the Markdown document currently being processed.
*   `options`: An `IngesterOptions` object which typically includes the `imageOutputDir` for remote downloads and `sourceUrl` for context.

### Related Types
The function relies on the `RawImageRef` structure:

```typescript
export type RawImageRef = {
  altText: string;
  src: string;
  /** Character offset in the markdown text where this ref is found */
  offset: number;
  /** The full original markdown string: ![alt](src) */
  fullMatch: string;
}
```

## Examples

### Resolving a Relative Local Image
This example demonstrates resolving an image located in a subfolder relative to the Markdown file.

```typescript
import { resolveImageRef } from 'yaaf';

const rawRef = {
  altText: 'Architecture Diagram',
  src: './assets/arch.png',
  offset: 120,
  fullMatch: '![Architecture Diagram](./assets/arch.png)'
};

const resolved = await resolveImageRef(
  rawRef,
  '/Users/project/docs/README.md',
  { imageOutputDir: '/Users/project/dist/images' }
);

// Result: ImageRef pointing to /Users/project/docs/assets/arch.png
```

### Resolving a Remote URL
When a URL is provided, the function downloads the asset to the configured output directory.

```typescript
import { resolveImageRef } from 'yaaf';

const rawRef = {
  altText: 'External Logo',
  src: 'https://example.com/logo.svg',
  offset: 0,
  fullMatch: '![External Logo](https://example.com/logo.svg)'
};

const resolved = await resolveImageRef(
  rawRef,
  '/Users/project/docs/README.md',
  { imageOutputDir: '/Users/project/dist/images' }
);

// Result: ImageRef pointing to the downloaded file in /Users/project/dist/images
```

## See Also
* `extractMarkdownImageRefs`: Function used to find the `RawImageRef` objects within a string.
* `resolveAllMarkdownImages`: A bulk processing utility that uses `resolveImageRef` for all images in a document.
* `downloadImage`: The underlying utility used for remote URL resolution.