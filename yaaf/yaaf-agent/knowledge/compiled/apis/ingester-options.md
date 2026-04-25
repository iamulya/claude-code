---
summary: A type defining configuration options for the `ingest` method of an `Ingester`.
export_name: IngesterOptions
source_file: src/knowledge/compiler/ingester/types.ts
category: type
title: IngesterOptions
entity_type: api
search_terms:
 - ingester configuration
 - how to set image output directory
 - ingest method options
 - specify source URL for ingestion
 - image download location
 - control image resizing during ingest
 - pass options to ingester
 - knowledge base ingestion settings
 - citation URL for clipped content
 - configure image assets folder
 - maxImageDimension setting
 - sourceUrl for citation
stub: false
compiled_at: 2026-04-24T17:13:48.849Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/html.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/images.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/markdown.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/text.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`[[[[[[[[Ingester]]]]]]]]Options` is a TypeScript type that defines a configuration object for an `Ingester`'s `ingest` method. It allows callers to customize the ingestion process for a specific file [Source 5].

This options object is used by various Ingesters, including `htmlIngester`, `markdownIngester`, `plainTextIngester`, and `codeIngester`, to control aspects of content processing [Source 1, Source 3, Source 4]. Common use cases include:

-   Specifying a custom directory for saving downloaded or resolved images (`imageOutputDir`).
-   Providing the original web URL of a clipped document for citation purposes (`sourceUrl`).
-   Setting a maximum dimension for images, which will trigger resizing for larger images (`maxImageDimension`).

Not all options are used by every Ingester. For example, `plainTextIngester` only uses `sourceUrl` as it does not process images [Source 4].

## Signature

The `IngesterOptions` type is defined as follows [Source 5]:

```typescript
export type IngesterOptions = {
  /**
   * Directory where downloaded images should be saved.
   * Defaults to a sibling `assets/` directory of the source file.
   */
  imageOutputDir?: string;

  /**
   * Maximum image dimension (width or height) in pixels.
   * Images exceeding this will be resized at download time.
   * Default: 1024
   */
  maxImageDimension?: number;

  /**
   * The original URL this content was fetched from (for citation).
   */
  sourceUrl?: string;
};
```

### Properties

-   **`imageOutputDir?: string`**
    The directory where images found in the source document should be saved. This applies to images downloaded from URLs (e.g., in HTML or Markdown) or resolved from relative paths. If not provided, it defaults to an `assets` directory located in the same directory as the source file being ingested [Source 1, Source 3, Source 5].

-   **`maxImageDimension?: number`**
    The maximum width or height for an image, in pixels. If an image's dimensions exceed this value, it will be resized during the download and saving process. The default value is 1024 [Source 5].

-   **`sourceUrl?: string`**
    The original URL from which the content was obtained. This is crucial for web-clipped content to ensure proper citation in the compiled knowledge base articles. It is passed through to the `sourceUrl` field of the final `IngestedContent` object [Source 1, Source 3, Source 4, Source 5].

## Examples

The following example demonstrates how to use `IngesterOptions` [when](./when.md) calling the `ingest` method of the `markdownIngester`.

```typescript
import { markdownIngester } from "./ingesters/markdown";
import type { IngesterOptions } from "./ingesters/types";

async function ingestMyDocument() {
  const filePath = "/path/to/my/notes/web-clip.md";

  // Define options to control the ingestion process
  const options: IngesterOptions = {
    // Save all images to a centralized assets folder
    imageOutputDir: "/path/to/my/kb/assets/images",
    // Provide the original source URL for the clipped article
    sourceUrl: "https://example.com/blog/my-favorite-article",
  };

  // Pass the options to the ingest method
  const ingestedContent = await markdownIngester.ingest(filePath, options);

  console.log(`Ingested document: ${ingestedContent.title}`);
  console.log(`Original source: ${ingestedContent.sourceUrl}`);
  console.log(`Found ${ingestedContent.images.length} images.`);
}

ingestMyDocument();
```

## Sources

[Source 1] `src/knowledge/compiler/ingester/html.ts`
[Source 2] `src/knowledge/compiler/ingester/images.ts`
[Source 3] `src/knowledge/compiler/ingester/markdown.ts`
[Source 4] `src/knowledge/compiler/ingester/text.ts`
[Source 5] `src/knowledge/compiler/ingester/types.ts`