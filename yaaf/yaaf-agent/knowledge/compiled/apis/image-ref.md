---
summary: A type defining a reference to an image found in a source document, including its local path and metadata.
export_name: ImageRef
source_file: src/knowledge/compiler/ingester/types.ts
category: type
title: ImageRef
entity_type: api
search_terms:
 - image metadata type
 - ingested image reference
 - how to handle images in knowledge base
 - local image path
 - original image source
 - image alt text
 - image MIME type
 - downloaded image properties
 - resolved image path
 - image file size
 - IngestedContent images property
 - knowledge base asset management
 - asset ingestion
stub: false
compiled_at: 2026-04-24T17:13:18.272Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/html.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/images.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `ImageRef` type is a data structure that represents a reference to an image discovered within a source document during the ingestion process [Source 3]. [when](./when.md) an [Ingester](./ingester.md), such as the `htmlIngester`, processes a file, it identifies all images, whether they are remote URLs, local relative paths, or embedded data URIs [Source 1].

For each image found, the ingester creates an `ImageRef` object. This object normalizes the image reference by ensuring it has an absolute local file path. If the image is remote, it is downloaded; if it is local, its path is resolved to be absolute. This process guarantees that by the end of ingestion, all images are available on the local filesystem [Source 1, Source 2].

`ImageRef` objects are collected in the `images` array of the `[[[[[[[[IngestedContent]]]]]]]]` type, which is the standardized output of all ingesters. This array is later used by the [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md) to embed image metadata into the [Frontmatter](../concepts/frontmatter.md) of the final compiled knowledge base article [Source 3].

## Signature

The `ImageRef` type is defined as an object with the following properties [Source 3]:

```typescript
export type ImageRef = {
  /** The original src/href as it appeared in the source (may be relative or absolute URL) */
  originalSrc: string;
  /** Absolute path to the local image file (already downloaded/resolved) */
  localPath: string;
  /** Alt text from the source, or filename if none */
  altText: string;
  /** Image MIME type (image/png, image/jpeg, image/svg+xml, etc.) */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
};
```

## Examples

### Example 1: Image from a Web URL

When the `htmlIngester` processes a web page, it downloads external images and creates `ImageRef` objects for them.

```typescript
// An ImageRef for an image downloaded from a URL
const downloadedImageRef: ImageRef = {
  originalSrc: "https://example.com/path/to/architecture-diagram.png",
  localPath: "/path/to/kb/raw/web-clips/my-article/assets/architecture-diagram.png",
  altText: "System architecture diagram",
  mimeType: "image/png",
  sizeBytes: 157286,
};
```

### Example 2: Image from a Local Markdown File

When processing a local markdown file with a relative image path, the ingester resolves the path to an absolute one.

```typescript
// An ImageRef for a local image referenced in a markdown file
const localImageRef: ImageRef = {
  originalSrc: "../assets/photo.jpg",
  localPath: "/path/to/kb/raw/notes/assets/photo.jpg",
  altText: "Team photo from the offsite",
  mimeType: "image/jpeg",
  sizeBytes: 834521,
};
```

### Example 3: Usage within IngestedContent

The `ImageRef` objects are part of the `IngestedContent` returned by an ingester.

```typescript
import type { IngestedContent, ImageRef } from "yaaf";

const image1: ImageRef = { /* ... */ };
const image2: ImageRef = { /* ... */ };

const ingestedArticle: IngestedContent = {
  text: "This is the article text. It references two images.",
  images: [image1, image2],
  mimeType: "text/html",
  sourceFile: "/path/to/kb/raw/web-clips/my-article/index.html",
  title: "My Awesome Article",
  lossy: true,
  // ... other properties
};
```

## See Also

- `IngestedContent`: The standardized data structure produced by ingesters, which contains an array of `ImageRef` objects.
- `Ingester`: The interface for plugins that parse source files and produce `IngestedContent`.

## Sources

[Source 1]: src/knowledge/compiler/ingester/html.ts
[Source 2]: src/knowledge/compiler/ingester/images.ts
[Source 3]: src/knowledge/compiler/ingester/types.ts