---
export_name: RawImageRef
source_file: src/knowledge/compiler/ingester/images.ts
category: type
title: RawImageRef
entity_type: api
summary: A type representing an unprocessed image reference extracted directly from a markdown document.
search_terms:
 - markdown image parsing
 - unresolved image reference
 - extract images from markdown
 - image alt text
 - image source path
 - markdown image syntax
 - raw image data structure
 - ingester image type
 - image offset in text
 - full markdown image match
 - pre-processing image links
stub: false
compiled_at: 2026-04-24T17:31:29.970Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/images.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`RawImageRef` is a TypeScript type that represents an image reference as it is first parsed from a markdown document, before any resolution or processing has occurred. It serves as an intermediate data structure within the knowledge [Ingester](./ingester.md) pipeline.

This type is primarily used as the output of the `extractMarkdownImageRefs` function. Each `RawImageRef` object contains the essential components of a markdown image tag—the alternative text, the source path or URL, and metadata about its position and original syntax within the source document. This allows subsequent processing steps, like `resolveImageRef`, to locate, validate, and transform the image reference into a final, resolved `ImageRef`.

## Signature

`RawImageRef` is a type alias for an object with the following properties:

```typescript
export type RawImageRef = {
  /**
   * The alternative text for the image, extracted from the `![alt]` portion
   * of the markdown syntax.
   */
  altText: string;

  /**
   * The source path or URL for the image, from the `(src)` portion.
   * This can be a relative path, an absolute path, or a full URL.
   */
  src: string;

  /**
   * The zero-based character offset in the source markdown string where the
   * image reference begins.
   */
  offset: number;

  /**
   * The complete, original markdown string that was matched,
   * e.g., `![A cute cat](./cat.png)`.
   */
  fullMatch: string;
};
```

## Examples

The most common use case is to receive an array of `RawImageRef` objects from `extractMarkdownImageRefs` after parsing a markdown string.

```typescript
import { extractMarkdownImageRefs } from 'yaaf';
import type { RawImageRef } from 'yaaf';

const markdownContent = `
# My Document

Here is an image: ![A cute cat](./images/cat.png)
And another one.
`;

const imageRefs: RawImageRef[] = extractMarkdownImageRefs(markdownContent);

if (imageRefs.length > 0) {
  const firstImage = imageRefs[0];
  console.log(firstImage);
}

/*
Expected Console Output:
{
  altText: 'A cute cat',
  src: './images/cat.png',
  offset: 21, // The exact offset depends on the input string
  fullMatch: '![A cute cat](./images/cat.png)'
}
*/
```

## See Also

- `extractMarkdownImageRefs`: The function that parses markdown and produces `RawImageRef` objects.
- `resolveImageRef`: The function that takes a `RawImageRef` and attempts to resolve its `src` to a local or downloaded file.
- `ImageRef`: The type representing a fully resolved and processed image reference.

## Sources

[Source 1]: src/knowledge/compiler/ingester/images.ts