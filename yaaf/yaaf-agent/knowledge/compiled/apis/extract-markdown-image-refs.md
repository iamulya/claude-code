---
summary: Extracts all image references from a markdown document, supporting standard and reference-style syntax.
export_name: extractMarkdownImageRefs
source_file: src/knowledge/compiler/ingester/images.ts
category: function
title: extractMarkdownImageRefs
entity_type: api
stub: false
compiled_at: 2026-04-16T14:23:43.663Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/images.ts
confidence: 1
---

## Overview
`extractMarkdownImageRefs` is a utility function used within the YAAF Ingester pipeline to identify and extract image metadata from markdown content. It parses the provided markdown string to find image declarations, supporting both standard inline syntax (`![alt](src)`) and reference-style syntax (`![alt][id]`).

This function is typically used as the first step in image processing, providing the raw locations and source strings needed for subsequent resolution and downloading via functions like `resolveImageRef`.

## Signature / Constructor

```typescript
export function extractMarkdownImageRefs(markdown: string): RawImageRef[];
```

### Related Types

#### RawImageRef
The function returns an array of `RawImageRef` objects, which contain the raw data parsed from the markdown text.

```typescript
export type RawImageRef = {
  /** The alternative text provided for the image */
  altText: string;
  /** The source URL or file path, or the reference ID */
  src: string;
  /** Character offset in the markdown text where this reference was found */
  offset: number;
  /** The full original markdown string (e.g., "![alt](src)") */
  fullMatch: string;
};
```

## Examples

### Extracting Standard and Reference Images
This example demonstrates how the function identifies different markdown image syntaxes.

```typescript
import { extractMarkdownImageRefs } from 'yaaf/knowledge/compiler/ingester/images';

const markdown = `
# Document
Here is an inline image: ![Logo](assets/logo.png)

And a reference-style image: ![Icon][icon-ref]

[icon-ref]: https://example.com/icon.svg
`;

const refs = extractMarkdownImageRefs(markdown);

/*
refs will contain:
[
  {
    altText: "Logo",
    src: "assets/logo.png",
    offset: 35,
    fullMatch: "![Logo](assets/logo.png)"
  },
  {
    altText: "Icon",
    src: "icon-ref",
    offset: 88,
    fullMatch: "![Icon][icon-ref]"
  }
]
*/
```

## See Also
- `resolveImageRef`: Resolves the `RawImageRef` to a local file path or downloads remote assets.
- `resolveAllMarkdownImages`: A higher-level utility that extracts and resolves all images in a document in one pass.