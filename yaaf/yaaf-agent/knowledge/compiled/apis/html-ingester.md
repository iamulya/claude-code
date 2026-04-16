---
export_name: htmlIngester
source_file: src/knowledge/compiler/ingester/html.ts
category: constant
title: htmlIngester
entity_type: api
summary: An ingester that processes HTML files and URLs into cleaned Markdown using Mozilla Readability.
stub: false
compiled_at: 2026-04-16T14:23:27.227Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/html.ts
confidence: 1
---

## Overview
The `htmlIngester` is a specialized component designed to process `.html` and `.htm` files, as well as direct URL content, into a structured format suitable for LLM consumption. It employs a multi-stage pipeline to strip non-essential content (such as navigation bars, advertisements, and sidebars) and convert the remaining article text into Markdown.

The ingester follows a five-step architectural process:
1. **Parsing**: Uses `jsdom` to create a virtual DOM from raw HTML.
2. **Extraction**: Utilizes `@mozilla/readability` (the same algorithm powering Firefox Reader Mode) to identify and extract the primary article content.
3. **Image Processing**: Resolves image source attributes, downloads external images, and handles embedded Data URIs.
4. **Conversion**: Transforms the cleaned HTML into Markdown using `turndown`.
5. **Output**: Returns an `IngestedContent` object containing the Markdown text, metadata, and image references.

Because it intentionally removes "noise" from web pages, this ingester is classified as "lossy."

## Signature / Constructor
The `htmlIngester` implements the `Ingester` interface.

```typescript
export const htmlIngester: Ingester = {
  supportedMimeTypes: ['text/html'],
  supportedExtensions: ['html', 'htm'],
  requiresOptionalDeps: true,
  optionalDeps: ['@mozilla/readability', 'jsdom', 'turndown'],
  ingest: (filePath: string, options?: IngesterOptions) => Promise<IngestedContent>
};
```

### Peer Dependencies
This ingester requires the following optional peer dependencies to be installed in the host project:
*   `@mozilla/readability`: For article extraction and noise removal.
*   `jsdom`: For Node.js-based HTML parsing.
*   `turndown`: For HTML-to-Markdown conversion.

## Methods & Properties

### Properties
*   **supportedMimeTypes**: `['text/html']`.
*   **supportedExtensions**: `['html', 'htm']`.
*   **requiresOptionalDeps**: `true`. Indicates that the ingester will throw an error if the required peer dependencies are missing.
*   **optionalDeps**: `['@mozilla/readability', 'jsdom', 'turndown']`.

### ingest(filePath, options)
The primary execution method for processing an HTML file.

**Parameters:**
*   `filePath` (string): The path to the local HTML file to be processed.
*   `options` (IngesterOptions): Configuration for the ingestion process.
    *   `imageOutputDir` (string, optional): Directory where extracted images should be saved. Defaults to an `assets` folder relative to the source file.
    *   `sourceUrl` (string, optional): The original URL of the content, used to resolve relative links and populate metadata.

**Returns:**
*   `Promise<IngestedContent>`: An object containing the cleaned Markdown text, extracted metadata (including OpenGraph tags and Readability excerpts), and an array of `ImageRef` objects.

## Examples

### Basic Usage
```typescript
import { htmlIngester } from 'yaaf/knowledge';

const content = await htmlIngester.ingest('./raw/article.html', {
  imageOutputDir: './processed/images',
  sourceUrl: 'https://example.com/blog/article'
});

console.log(content.title);
console.log(content.text); // Cleaned Markdown
```

### Handling Metadata
The ingester extracts both standard HTML meta tags and Readability-specific metadata.

```typescript
const content = await htmlIngester.ingest('./raw/article.html');

// Accessing extracted metadata
const { 
  readability_excerpt, 
  readability_byline, 
  og_title 
} = content.metadata;
```

## See Also
*   `KBClipper`: A programmatic utility that wraps `htmlIngester` to fetch and process live URLs.
*   `markdownIngester`: Used for processing files that are already in Markdown format, such as those produced by the Obsidian Web Clipper.