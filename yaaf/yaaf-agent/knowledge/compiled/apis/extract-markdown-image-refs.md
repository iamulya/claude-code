---
export_name: extractMarkdownImageRefs
source_file: src/knowledge/compiler/ingester/images.ts
category: function
title: extractMarkdownImageRefs
entity_type: api
summary: Extracts all image references from a markdown document string.
search_terms:
 - parse markdown images
 - find images in markdown
 - extract image src from markdown
 - markdown image parsing
 - get all image tags
 - "![alt](src)"
 - reference-style images
 - "![alt][id]"
 - RawImageRef
 - knowledge ingester image extraction
 - how to find image paths in markdown
 - markdown pre-processing
stub: false
compiled_at: 2026-04-24T17:05:31.646Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/images.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `extractMarkdownImageRefs` function parses a string of markdown text and returns an array of all image references it contains [Source 1]. This function is a key part of the [Knowledge Ingestion Pipeline](../concepts/knowledge-ingestion-pipeline.md), serving as the first step in identifying images that need to be resolved, downloaded, and processed.

It supports both standard inline image syntax (`![alt](src)`) and reference-style image syntax (`![alt][id]`) [Source 1]. The output is an array of `RawImageRef` objects, each providing structured data about an image reference, including its alt text, source path or identifier, character offset within the original string, and the complete markdown match [Source 1].

## Signature

The function takes a single markdown string as input and returns an array of `RawImageRef` objects.

```typescript
export function extractMarkdownImageRefs(markdown: string): RawImageRef[];
```

### `RawImageRef` Type

The `RawImageRef` type describes the structure of the objects returned by this function [Source 1].

```typescript
export type RawImageRef = {
  /** The alternative text for the image. */
  altText: string;

  /** The source path, URL, or reference ID. */
  src: string;

  /** Character offset in the markdown text where this reference is found. */
  offset: number;

  /** The full original markdown string, e.g., "![alt text](path/to/image.png)". */
  fullMatch: string;
};
```

## Examples

### Basic Usage

The following example demonstrates how to extract both inline and reference-style image links from a markdown document.

```typescript
import { extractMarkdownImageRefs } from 'yaaf';

const markdownContent = `
# My Document

Here is an inline image: ![A cute cat](./images/cat.jpg).

And here is a reference-style image: ![A happy dog][dog-ref].

[dog-ref]: /assets/dog.png "A Happy Dog"
`;

const imageRefs = extractMarkdownImageRefs(markdownContent);

console.log(imageRefs);
/*
[
  {
    altText: 'A cute cat',
    src: './images/cat.jpg',
    offset: 45,
    fullMatch: '![A cute cat](./images/cat.jpg)'
  },
  {
    altText: 'A happy dog',
    src: 'dog-ref',
    offset: 119,
    fullMatch: '![A happy dog][dog-ref]'
  }
]
*/
```

## See Also

- `resolveImageRef`: A function to resolve a single `RawImageRef` to a local file path or downloaded asset.
- `resolveAllMarkdownImages`: A higher-level function that uses `extractMarkdownImageRefs` and `resolveImageRef` to process all images in a document.

## Sources

[Source 1]: src/knowledge/compiler/[Ingester](./ingester.md)/images.ts