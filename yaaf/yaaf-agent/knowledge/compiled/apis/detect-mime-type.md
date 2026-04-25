---
summary: A utility function to detect the MIME type of a file based on its path.
export_name: detectMimeType
source_file: src/knowledge/compiler/ingester/types.ts
category: function
title: detectMimeType
entity_type: api
search_terms:
 - get file mime type
 - determine content type from filename
 - file extension to mime type
 - mime type detection
 - ingester file type
 - knowledge compiler utilities
 - how to identify file format
 - content-type lookup
 - file path analysis
 - YAAF file utilities
 - check file type
stub: false
compiled_at: 2026-04-24T17:01:49.701Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `detectMimeType` function is a utility that determines the MIME type of a file based on its file path, typically by inspecting the file extension [Source 1].

This function is primarily used within the [Knowledge Ingestion Pipeline](../concepts/knowledge-ingestion-pipeline.md). An `[[[[[[[[Ingester]]]]]]]]` implementation can use `detectMimeType` to quickly identify if a given file is of a format it supports. The resulting MIME type is also a required field in the `IngestedContent` object, which is the standardized output of any Ingester [Source 1].

## Signature

```typescript
export function detectMimeType(filePath: string): string;
```

**Parameters:**

*   `filePath` (string): The path to the file whose MIME type is to be determined.

**Returns:**

*   `string`: The detected MIME type, such as `text/markdown`, `application/pdf`, or `image/png`.

## Examples

The following example demonstrates how to use `detectMimeType` to identify the content type of different files.

```typescript
import { detectMimeType } from 'yaaf';

const markdownFile = 'docs/getting-started.md';
const pdfFile = 'papers/attention-is-all-you-need.pdf';
const imageFile = 'assets/logo.svg';

const markdownMime = detectMimeType(markdownFile);
const pdfMime = detectMimeType(pdfFile);
const imageMime = detectMimeType(imageFile);

console.log(`${markdownFile}: ${markdownMime}`);
// Expected output: docs/getting-started.md: text/markdown

console.log(`${pdfFile}: ${pdfMime}`);
// Expected output: papers/attention-is-all-you-need.pdf: application/pdf

console.log(`${imageFile}: ${imageMime}`);
// Expected output: assets/logo.svg: image/svg+xml
```

## See Also

*   `Ingester`: The interface for format-specific content extractors which use this function.
*   `IngestedContent`: The normalized data structure produced by an `Ingester`, which includes a `mimeType` field.
*   `isImageMimeType`: A related utility to check if a MIME type corresponds to an image format.

## Sources

[Source 1] src/knowledge/compiler/ingester/types.ts