---
summary: A utility function to determine if a given MIME type represents an SVG image.
export_name: isSvg
source_file: src/knowledge/compiler/ingester/types.ts
category: function
title: isSvg
entity_type: api
search_terms:
 - check if mime type is svg
 - svg mime type validation
 - image/svg+xml check
 - scalable vector graphics mime
 - ingester utilities
 - content type svg
 - is file an svg
 - mime type helper
 - validate image format
 - svg content detection
 - image processing helpers
stub: false
compiled_at: 2026-04-24T17:15:21.156Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `isSvg` function is a type guard utility that checks if a given string corresponds to the MIME type for an SVG (Scalable Vector Graphics) image, which is typically `image/svg+xml` [Source 1].

This function is primarily used within the [Knowledge Ingestion Pipeline](../concepts/knowledge-ingestion-pipeline.md) to differentiate SVG images from other image formats like PNG or JPEG. This distinction is important because SVGs are vector-based and may be handled differently than raster images during processing, such as skipping resizing operations that apply to bitmap images.

## Signature

```typescript
export function isSvg(mimeType: string): boolean;
```

**Parameters:**

*   `mimeType` (string): The MIME type string to evaluate.

**Returns:**

*   `boolean`: Returns `true` if the `mimeType` is for an SVG image, otherwise `false`.

## Examples

### Basic Usage

The following example demonstrates how to use `isSvg` to check different MIME type strings.

```typescript
import { isSvg } from 'yaaf';

const svgMimeType = 'image/svg+xml';
const pngMimeType = 'image/png';
const textMimeType = 'text/plain';

console.log(`Is '${svgMimeType}' an SVG?`, isSvg(svgMimeType)); // true
console.log(`Is '${pngMimeType}' an SVG?`, isSvg(pngMimeType)); // false
console.log(`Is '${textMimeType}' an SVG?`, isSvg(textMimeType)); // false
```

### Processing Ingested Images

This example shows how `isSvg` might be used to conditionally process images that have been extracted by an [Ingester](./ingester.md).

```typescript
import { isSvg, type ImageRef } from 'yaaf';

function processImage(image: ImageRef) {
  console.log(`Processing ${image.localPath} (${image.mimeType})`);

  if (isSvg(image.mimeType)) {
    // Handle SVG-specific logic, e.g., sanitization or embedding directly
    console.log('This is an SVG. Skipping raster image resizing.');
  } else {
    // Handle raster image logic, e.g., resizing or compression
    console.log('This is a raster image. Applying standard processing.');
  }
}

const sampleSvgRef: ImageRef = {
  originalSrc: 'logo.svg',
  localPath: '/tmp/assets/logo.svg',
  altText: 'Company Logo',
  mimeType: 'image/svg+xml',
  sizeBytes: 15360,
};

const samplePngRef: ImageRef = {
  originalSrc: 'diagram.png',
  localPath: '/tmp/assets/diagram.png',
  altText: 'Architecture Diagram',
  mimeType: 'image/png',
  sizeBytes: 204800,
};

processImage(sampleSvgRef);
processImage(samplePngRef);
```

## See Also

*   `isImageMimeType`: A related utility to check if a MIME type is any kind of image.
*   `detectMimeType`: A function to determine the MIME type from a file path.
*   `ImageRef`: The type definition for an image reference, which contains the `mimeType` property this function operates on.

## Sources

[Source 1]: src/knowledge/compiler/ingester/types.ts