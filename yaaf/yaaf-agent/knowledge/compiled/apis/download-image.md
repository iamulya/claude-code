---
export_name: downloadImage
source_file: src/knowledge/compiler/ingester/images.ts
category: function
title: downloadImage
entity_type: api
summary: Downloads an image from a URL to a specified local directory.
search_terms:
 - fetch image from url
 - save remote image locally
 - image ingester utility
 - download remote assets
 - knowledge base image processing
 - handle external images in markdown
 - URL to local file
 - ssrf safe fetch
 - ImageRef creation
 - image output directory
 - node.js fetch image
 - remote resource downloader
stub: false
compiled_at: 2026-04-24T17:03:49.855Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/images.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `downloadImage` function is a utility used within the YAAF knowledge [Ingester](./ingester.md) pipeline to fetch an image from a remote URL and save it to a local directory [Source 1]. It is a key part of resolving image references in source documents, particularly [when](./when.md) markdown files link to external images.

This function uses the built-in Node.js `fetch` API (available in Node.js 18 and later) to perform the download. The imports in the source file indicate that it leverages security [Utilities](../subsystems/utilities.md) like `ssrfSafeFetch` to prevent Server-Side Request Forgery (SSRF) vulnerabilities [Source 1].

Upon successful download, the function returns an `ImageRef` object, which is a structured representation of the downloaded image. If the download fails for any reason (e.g., network error, invalid URL, non-2xx response), it returns `null` instead of throwing an error [Source 1]. The filename for the saved image is derived from the path component of the source URL.

## Signature

```typescript
export async function downloadImage(
  url: string,
  altText: string,
  imageOutputDir: string,
): Promise<ImageRef | null>
```

**Parameters:**

*   `url: string`
    The full URL of the image to download.
*   `altText: string`
    The alternative text for the image, typically extracted from the markdown `![alt](src)`.
*   `imageOutputDir: string`
    The absolute path to the local directory where the downloaded image should be saved.

**Returns:**

*   `Promise<ImageRef | null>`
    A promise that resolves to an `ImageRef` object if the download is successful, or `null` if it fails. The `ImageRef` type is defined in `./types.js` and contains metadata about the resolved image [Source 1].

## Examples

The following example demonstrates how to use `downloadImage` to fetch a remote image and save it to a local `downloads` directory.

```typescript
import { downloadImage } from 'yaaf'; // Assuming 'yaaf' is the package name
import { mkdir } from 'fs/promises';
import { join } from 'path';

async function fetchRemoteImage() {
  const outputDir = join(process.cwd(), 'downloads');
  await mkdir(outputDir, { recursive: true });

  const imageUrl = 'https://yaaf.dev/assets/logo.png';
  const altText = 'YAAF Framework Logo';

  console.log(`Attempting to download from ${imageUrl}...`);

  const imageRef = await downloadImage(imageUrl, altText, outputDir);

  if (imageRef) {
    console.log('Image downloaded successfully!');
    console.log('ImageRef:', imageRef);
    // Example output:
    // ImageRef: {
    //   altText: 'YAAF Framework Logo',
    //   originalSrc: 'https://yaaf.dev/assets/logo.png',
    //   absolutePath: '/path/to/project/downloads/logo.png',
    //   mimeType: 'image/png',
    //   isSvg: false
    // }
  } else {
    console.error('Failed to download the image.');
  }
}

fetchRemoteImage();
```

## See Also

*   `resolveImageRef`: A higher-level function that uses `downloadImage` as part of its strategy to resolve local and remote image references.
*   `resolveAllMarkdownImages`: A function that orchestrates the resolution of all image references within a given markdown document.

## Sources

[Source 1] src/knowledge/compiler/ingester/images.ts