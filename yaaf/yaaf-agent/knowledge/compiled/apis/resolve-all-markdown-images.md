---
export_name: resolveAllMarkdownImages
source_file: src/knowledge/compiler/ingester/images.ts
category: function
title: resolveAllMarkdownImages
entity_type: api
summary: Resolves all local and remote image references within a Markdown string to local file paths, returning both resolved images and a list of any that failed.
search_terms:
 - process markdown images
 - find images in markdown
 - download remote images from markdown
 - convert image paths to absolute
 - handle `![]()` syntax
 - ingest markdown with images
 - knowledge compiler image handling
 - local image resolution
 - URL image downloading
 - markdown image parsing
 - failed image resolution
 - IngesterOptions for images
stub: false
compiled_at: 2026-04-24T17:32:25.527Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/images.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `resolveAllMarkdownImages` function is a utility within the YAAF knowledge [Ingester](./ingester.md) pipeline responsible for processing all image references in a given Markdown document. It parses the Markdown text to find all image tags (`![alt](src)`) and attempts to resolve each image source (`src`).

This function handles multiple types of image sources:
- **Absolute local paths**: Verifies that the file exists at the specified path.
- **Relative local paths**: Resolves the path relative to the location of the source Markdown document.
- **Remote URLs**: Downloads the image to a specified output directory.

It is designed to be robust; if an image cannot be resolved (e.g., the file doesn't exist or a download fails), it is skipped with a warning rather than throwing an error. The function returns a tuple containing an array of successfully resolved image references and an array of source strings for the images that failed to resolve.

## Signature

```typescript
export async function resolveAllMarkdownImages(
  markdown: string,
  documentPath: string,
  options?: IngesterOptions
): Promise<[ImageRef[], string[]]>;
```

### Parameters

- **`markdown`** `string`: The raw Markdown content to be processed.
- **`documentPath`** `string`: The absolute path to the Markdown document. This is used as the base for resolving relative image paths.
- **`options`** `IngesterOptions` (optional): Configuration options for the ingestion process. This object typically includes `imageOutputDir` for specifying where to save downloaded images.

### Returns

`Promise<[ImageRef[], string[]]>`

A promise that resolves to a tuple:
- **`[0]`** `ImageRef[]`: An array of `ImageRef` objects for each successfully resolved image.
- **`[1]`** `string[]`: An array of `src` strings for each image reference that could not be resolved.

## Examples

### Basic Usage

Consider a Markdown file located at `/path/to/docs/document.md` with the following content:

```markdown
# My Document

Here is a local image:
![A local cat](./images/cat.jpg)

And a remote one:
![A remote dog](https://example.com/images/dog.png)

This one is broken:
![A broken link](./images/nonexistent.gif)
```

You can resolve these images using the function:

```typescript
import { resolveAllMarkdownImages } from 'yaaf/knowledge';
import { IngesterOptions } from 'yaaf/knowledge';

const markdownContent = `
# My Document

Here is a local image:
![A local cat](./images/cat.jpg)

And a remote one:
![A remote dog](https://example.com/images/dog.png)

This one is broken:
![A broken link](./images/nonexistent.gif)
`;

const documentPath = '/path/to/docs/document.md';
const options: IngesterOptions = {
  imageOutputDir: '/path/to/output/assets',
};

async function processImages() {
  // Assume cat.jpg exists and dog.png is downloadable
  const [resolvedImages, unresolvedSources] = await resolveAllMarkdownImages(
    markdownContent,
    documentPath,
    options
  );

  console.log('Resolved Images:', resolvedImages);
  // Expected output (paths will be absolute):
  // Resolved Images: [
  //   {
  //     altText: 'A local cat',
  //     originalSrc: './images/cat.jpg',
  //     resolvedPath: '/path/to/docs/images/cat.jpg',
  //     mimeType: 'image/jpeg',
  //     isSvg: false
  //   },
  //   {
  //     altText: 'A remote dog',
  //     originalSrc: 'https://example.com/images/dog.png',
  //     resolvedPath: '/path/to/output/assets/dog.png',
  //     mimeType: 'image/png',
  //     isSvg: false
  //   }
  // ]

  console.log('Unresolved Sources:', unresolvedSources);
  // Expected output:
  // Unresolved Sources: [ './images/nonexistent.gif' ]
}

processImages();
```

## See Also

- `resolveImageRef`: The underlying function used to resolve a single image reference.
- `extractMarkdownImageRefs`: The function used to parse all raw image references from a Markdown string.
- `IngesterOptions`: The type definition for configuration options passed to this function.
- `ImageRef`: The type definition for a successfully resolved image reference.

## Sources

[Source 1]: src/knowledge/compiler/ingester/images.ts