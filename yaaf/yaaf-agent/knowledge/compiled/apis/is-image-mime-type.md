---
summary: A utility function to determine if a given MIME type represents an image.
export_name: isImageMimeType
source_file: src/knowledge/compiler/ingester/types.ts
category: function
title: isImageMimeType
entity_type: api
search_terms:
 - check if MIME type is image
 - validate image MIME type
 - image type detection
 - MIME type utilities
 - content type checking
 - is it an image file
 - image/png
 - image/jpeg
 - image/gif
 - image/svg+xml
 - ingester helpers
 - file type validation
 - knowledge ingestion
stub: false
compiled_at: 2026-04-24T17:15:05.195Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `isImageMimeType` function is a simple boolean utility that checks if a given string represents an image MIME type [Source 1]. It performs this check by determining if the input string starts with the prefix `"image/"`.

This function is primarily used within the knowledge ingestion subsystem to identify image assets discovered in source documents. [Ingester](./ingester.md)s use it to correctly populate the `images` array of an `IngestedContent` object, which is a critical step for the [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md) to process and embed images into compiled articles [Source 1].

## Signature

The function takes a single string argument and returns a boolean value.

```typescript
export function isImageMimeType(mimeType: string): boolean;
```

**Parameters:**

*   `mimeType` (string): The MIME type string to evaluate (e.g., `"image/png"`, `"application/json"`).

**Returns:**

*   `boolean`: Returns `true` if the `mimeType` string begins with `"image/"`, otherwise returns `false`.

## Examples

The following examples demonstrate basic usage of the `isImageMimeType` function.

```typescript
import { isImageMimeType } from 'yaaf';

// Check a standard PNG MIME type
const isPngImage = isImageMimeType('image/png');
console.log(isPngImage);
//=> true

// Check an SVG MIME type
const isSvgImage = isImageMimeType('image/svg+xml');
console.log(isSvgImage);
//=> true

// Check a non-image MIME type
const isPdfImage = isImageMimeType('application/pdf');
console.log(isPdfImage);
//=> false

// Check an invalid or incomplete string
const isInvalid = isImageMimeType('image');
console.log(isInvalid);
//=> false
```

## See Also

*   `detectMimeType`: A related utility for determining the MIME type of a file.
*   `isSvg`: A more specific utility for checking if a MIME type is for an SVG image.
*   `ImageRef`: The type definition for an image reference within the ingestion pipeline.
*   `IngestedContent`: The normalized output of an Ingester, which uses this function to categorize content.

## Sources

[Source 1] src/knowledge/compiler/ingester/types.ts