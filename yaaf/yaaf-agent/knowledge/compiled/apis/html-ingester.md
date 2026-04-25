---
summary: An `Ingester` implementation for processing HTML content, extracting articles, and converting them to Markdown.
export_name: htmlIngester
source_file: src/knowledge/compiler/ingester/html.ts
category: constant
title: htmlIngester
entity_type: api
search_terms:
 - process HTML files
 - convert HTML to markdown
 - extract article from webpage
 - Mozilla Readability ingester
 - web page clipping
 - ingest .html files
 - turndown HTML conversion
 - JSDOM parsing
 - download images from HTML
 - handle web content
 - URL ingester
 - Firefox Reader Mode algorithm
 - clean up webpage for LLM
 - strip ads and navigation
stub: false
compiled_at: 2026-04-24T17:12:36.146Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/html.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `html[[[[[[[[Ingester]]]]]]]]` is a constant that provides an implementation of the `Ingester` interface for handling HTML content. It is designed to process `.html` and `.htm` files, as well as content fetched directly from URLs by [Utilities](../subsystems/utilities.md) like `KBClipper` [Source 1].

Its primary function is to extract the core article content from a potentially noisy webpage, removing elements like navigation bars, advertisements, and sidebars. It then converts this cleaned content into Markdown format, making it suitable for inclusion in a knowledge base [Source 1].

The process involves several steps:
1.  The HTML is parsed into a Document Object Model (DOM) using `jsdom`.
2.  Mozilla's `Readability` library, the same algorithm used in Firefox's Reader Mode, is applied to the DOM to extract the main article content.
3.  Images referenced in the extracted article are processed. External images are downloaded, data URIs are saved to files, and local file paths are resolved.
4.  The cleaned HTML article is converted to Markdown using the `Turndown` library.
5.  The final output is an `IngestedContent` object containing the Markdown text, image references, and extracted metadata [Source 1].

If `Readability` fails to extract an article, `htmlIngester` provides a fallback mechanism. It attempts to extract the text content of the entire document body or, failing that, strips all HTML tags from the raw input. In this case, the resulting `IngestedContent` is marked with `lossy: true` and includes a `_readability_failed: true` flag in its metadata [Source 1].

Usage of `htmlIngester` requires the installation of three optional peer dependencies: `@mozilla/readability`, `jsdom`, and `turndown`. If these packages are not present in the user's project, the Ingester will throw a descriptive error explaining which packages need to be installed [Source 1].

## Signature / Constructor

`htmlIngester` is a constant object conforming to the `Ingester` interface.

```typescript
import type { Ingester } from "./types.js";

export const htmlIngester: Ingester = {
  supportedMimeTypes: ["text/html"],
  supportedExtensions: ["html", "htm"],
  requiresOptionalDeps: true,
  optionalDeps: ["@mozilla/readability", "jsdom", "turndown"],

  async ingest(
    filePath: string,
    options?: IngesterOptions
  ): Promise<IngestedContent> {
    // ... implementation
  },
};
```

## Methods & Properties

The `htmlIngester` object has the following properties:

### Properties

*   **`supportedMimeTypes: string[]`**
    An array of MIME types this ingester can handle. Value: `["text/html"]` [Source 1].

*   **`supportedExtensions: string[]`**
    An array of file extensions this ingester can handle. Value: `["html", "htm"]` [Source 1].

*   **`requiresOptionalDeps: boolean`**
    A flag indicating that this ingester requires optional peer dependencies to function. Value: `true` [Source 1].

*   **`optionalDeps: string[]`**
    A list of the required optional peer dependencies. Value: `["@mozilla/readability", "jsdom", "turndown"]` [Source 1].

### Methods

*   **`ingest(filePath: string, options: IngesterOptions = {}): Promise<IngestedContent>`**
    Processes an HTML file from the given path.

    **Parameters:**
    *   `filePath: string`: The absolute or relative path to the local HTML file to ingest.
    *   `options: IngesterOptions` (optional): An object for configuration.
        *   `imageOutputDir?: string`: The directory where extracted and downloaded images should be saved. Defaults to an `assets` subdirectory within the same directory as the source `filePath`.
        *   `sourceUrl?: string`: The original URL of the HTML page. This is used to correctly resolve relative URLs within the document. Defaults to a `file://` URL derived from `filePath`.

    **Returns:**
    A `Promise` that resolves to an `IngestedContent` object containing the extracted Markdown text, image references, and metadata [Source 1].

## Examples

The following example demonstrates how to use `htmlIngester` to process a local HTML file. This assumes the required peer dependencies (`@mozilla/readability`, `jsdom`, `turndown`) are installed.

```typescript
import { htmlIngester } from 'yaaf';
import type { IngesterOptions } from 'yaaf';
import { promises as fs } from 'fs';
import path from 'path';

// Create a dummy HTML file for the example
const setupExample = async () => {
  const dir = './temp-html-ingest';
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, 'article.html');
  const content = `
    <!DOCTYPE html>
    <html>
    <head><title>Example Article</title></head>
    <body>
      <nav>Home</nav>
      <main>
        <h1>An Important Article</h1>
        <p>This is the main content.</p>
      </main>
      <footer>Copyright</footer>
    </body>
    </html>
  `;
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
};

async function processHtmlFile() {
  const filePath = await setupExample();

  const options: IngesterOptions = {
    imageOutputDir: path.join(path.dirname(filePath), 'images'),
    sourceUrl: 'https://example.com/important-article'
  };

  try {
    const ingestedContent = await htmlIngester.ingest(filePath, options);

    console.log('Title:', ingestedContent.title);
    // Expected output: Title: An Important Article

    console.log('Markdown Content:', ingestedContent.text.trim());
    // Expected output: Markdown Content: # An Important Article
    //
    // This is the main content.

    console.log('Lossy Conversion:', ingestedContent.lossy);
    // Expected output: Lossy Conversion: true (Readability is lossy by design)

  } catch (error) {
    console.error("Failed to ingest HTML:", error);
    // This block would catch errors, including missing optional dependencies.
  } finally {
    // Clean up the dummy file and directory
    await fs.rm('./temp-html-ingest', { recursive: true, force: true });
  }
}

processHtmlFile();
```

## See Also

*   **`KBClipper`**: A class that uses `htmlIngester` internally to fetch and process content directly from URLs, mimicking a web clipper browser extension [Source 1].
*   **`markdownIngester`**: An ingester for processing files that are already in Markdown format, such as those created by the Obsidian Web Clipper [Source 1].
*   **`Ingester`**: The interface that `htmlIngester` implements, defining the contract for all ingester types.
*   **`IngestedContent`**: The structured object returned by the `ingest` method.

## Sources

[Source 1]: src/knowledge/compiler/ingester/html.ts