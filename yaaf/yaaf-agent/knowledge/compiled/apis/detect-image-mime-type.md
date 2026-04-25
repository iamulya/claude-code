---
export_name: detectImageMimeType
source_file: src/knowledge/compiler/ingester/images.ts
category: function
title: detectImageMimeType
entity_type: api
summary: Detects the MIME type of an image file by inspecting its magic bytes, with a fallback to using the file extension.
search_terms:
 - get image mime type
 - image file type detection
 - magic byte analysis
 - file header inspection
 - determine image format
 - content type from file
 - knowledge ingester image handling
 - mime type from extension
 - image processing utility
 - how to find image type
 - YAAF image utilities
 - file signature detection
stub: false
compiled_at: 2026-04-24T17:01:47.796Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/images.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `detectImageMimeType` function is an asynchronous utility used within the YAAF knowledge [Ingester](./ingester.md) pipeline to determine the MIME type of a local image file [Source 1].

Its primary method of detection is by reading the file's "magic bytes"—a sequence of bytes at the beginning of a file that uniquely identifies its format. This is a more reliable method than relying solely on file extensions, which can be incorrect or missing. If magic byte detection is inconclusive, the function falls back to inferring the MIME type from the file's extension [Source 1].

This function is crucial for correctly processing and embedding image assets referenced in source documents during the knowledge compilation process.

## Signature

```typescript
export async function detectImageMimeType(filePath: string): Promise<string>;
```

**Parameters:**

*   `filePath` (`string`): The absolute or relative path to the image file on the local filesystem.

**Returns:**

*   `Promise<string>`: A promise that resolves to a string containing the detected MIME type (e.g., `image/png`, `image/jpeg`).

## Examples

The following example demonstrates how to use `detectImageMimeType` to identify the MIME type of a local file.

```typescript
import { detectImageMimeType } from 'yaaf';
import { writeFileSync, unlinkSync } from 'fs';

// This example creates a dummy file with a valid PNG header (magic bytes).
// In a real application, 'path/to/your/image.png' would already exist.
const dummyPngPath = 'logo.png';
const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
writeFileSync(dummyPngPath, pngMagicBytes);

async function checkMimeType() {
  try {
    const mimeType = await detectImageMimeType(dummyPngPath);
    console.log(`The detected MIME type for ${dummyPngPath} is: ${mimeType}`);
    // Expected output: The detected MIME type for logo.png is: image/png
  } catch (error) {
    console.error('Failed to detect MIME type:', error);
  } finally {
    // Clean up the dummy file.
    unlinkSync(dummyPngPath);
  }
}

checkMimeType();
```

## See Also

*   `resolveImageRef`: A function for resolving an image reference from markdown to a local file path.
*   `extractMarkdownImageRefs`: A utility to parse all image references from a markdown string.

## Sources

[Source 1]: src/knowledge/compiler/ingester/images.ts