---
summary: The normalized data structure representing content extracted by an `Ingester`, ready for further processing in the knowledge pipeline.
export_name: IngestedContent
source_file: src/knowledge/compiler/ingester/types.ts
category: type
title: IngestedContent
entity_type: api
search_terms:
 - normalized knowledge format
 - ingester output
 - data structure for extracted content
 - what does an ingester return
 - knowledge pipeline data
 - source document representation
 - ImageRef type
 - SourceTrustLevel
 - lossy extraction flag
 - metadata from ingestion
 - how to represent images
 - content extraction result
 - document ingestion schema
stub: false
compiled_at: 2026-04-24T17:13:48.213Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/html.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/ingestCache.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/markdown.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/text.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`IngestedContent` is a TypeScript type that defines the standardized, normalized data structure for content extracted from a source file by an `[[[[[[[[Ingester]]]]]]]]` [Source 5]. It serves as the common interchange format within the YAAF knowledge pipeline, decoupling the specifics of source file formats (like HTML, Markdown, or PDF) from the downstream processing stages, such as concept extraction and knowledge synthesis [Source 5].

Every `Ingester`, regardless of the file type it handles, must return a promise that resolves to an `IngestedContent` object [Source 5]. This object encapsulates the core textual content, references to any associated images (which are resolved to local paths), format-specific metadata, and provenance information like the source file path and original URL [Source 1, Source 3, Source 5].

This standardized structure allows the rest of the [Knowledge Compiler](../subsystems/knowledge-compiler.md) to operate on a consistent data model. The full `IngestedContent` object is also serialized to a JSON file [when](./when.md) the ingestion cache is used, speeding up incremental builds [Source 2].

## Signature

`IngestedContent` is a type alias for an object with the following properties [Source 5]:

```typescript
export type IngestedContent = {
  /** Extracted text content (may be markdown or plain text — synthesizer handles both) */
  text: string;
  /** All images found in the source, with local paths resolved */
  images: ImageRef[];
  /** Detected MIME type of the source file */
  mimeType: string;
  /** Absolute path to the source file */
  sourceFile: string;
  /** Extracted document title (from HTML <title>, PDF metadata, or first H1) */
  title?: string;
  /** Format-specific metadata (e.g., PDF author, HTML og:description) */
  metadata?: Record<string, unknown>;
  /**
   * Whether the Ingester performed lossy extraction.
   * true = some content may have been lost (HTML noise removal, PDF layout)
   * false = lossless (markdown, plain text, JSON)
   */
  lossy: boolean;
  /**
   * Source of the original content (for citation in the compiled article).
   * For local files this is the file path; for clipped URLs it's the original URL.
   */
  sourceUrl?: string;
  /**
   * C4/A1: Source trust level — how credible is this source?
   * Default: 'unknown'
   */
  sourceTrust?: SourceTrustLevel;
};
```

### Key Properties

*   **`text`**: The main textual content extracted from the source. This may be plain text or Markdown, which the downstream synthesizer is equipped to handle [Source 5].
*   **`images`**: An array of `ImageRef` objects. Each `ImageRef` contains the original image source URL, the absolute path to the locally downloaded or resolved file, alt text, MIME type, and file size [Source 5].
*   **`mimeType`**: The detected MIME type of the original source file, e.g., `text/html` or `text/markdown` [Source 1, Source 3].
*   **`sourceFile`**: The absolute path to the raw file on disk from which this content was ingested [Source 5].
*   **`title`**: The document's title, extracted from sources like an HTML `<title>` tag, Markdown [Frontmatter](../concepts/frontmatter.md), or the first H1 heading [Source 1, Source 3, Source 5].
*   **`metadata`**: An open-ended object for format-specific metadata. For example, the HTML Ingester includes fields like `readability_excerpt` and `readability_byline` [Source 1], while the Markdown ingester includes all YAML frontmatter fields [Source 3].
*   **`lossy`**: A boolean flag indicating if the ingestion process might have discarded some of the original content. HTML ingestion using Mozilla Readability is considered `lossy` because it strips out navigation, ads, and other non-article content. Ingesting plain text or Markdown is lossless (`lossy: false`) [Source 1, Source 3, Source 4, Source 5].
*   **`sourceUrl`**: The original URL of the content, if it was clipped from the web. This is used for citation purposes [Source 5].
*   **`sourceTrust`**: A `SourceTrustLevel` classification (`'academic'`, `'documentation'`, `'web'`, or `'unknown'`) that indicates the credibility of the source. This can be set by the ingester based on heuristics (e.g., URL or directory path) and influences [Grounding Score](../concepts/grounding-score.md) weighting [Source 5].

## Examples

### From a Markdown File

An `IngestedContent` object produced by the `markdownIngester` from a file with YAML frontmatter and local images. Ingestion is lossless [Source 3].

```typescript
// Result of ingesting a local .md file
const ingestedFromMarkdown: IngestedContent = {
  text: "# My Article\n\nHere is some content with an image.\n\n![A diagram](./images/diagram.png)",
  images: [
    {
      originalSrc: "./images/diagram.png",
      localPath: "/path/to/kb/raw/notes/images/diagram.png",
      altText: "A diagram",
      mimeType: "image/png",
      sizeBytes: 12345,
    },
  ],
  mimeType: "text/markdown",
  sourceFile: "/path/to/kb/raw/notes/my-article.md",
  title: "My Article Title From Frontmatter",
  metadata: {
    tags: ["yaaf", "knowledge-base"],
    author: "Jane Doe",
    source: "https://example.com/original-article"
  },
  lossy: false,
  sourceUrl: "https://example.com/original-article",
  sourceTrust: "web",
};
```

### From a Clipped HTML Page

An `IngestedContent` object from the `htmlIngester` after processing a web page. The text is converted to Markdown, and the process is `lossy` because non-article content is removed [Source 1].

```typescript
// Result of ingesting a clipped .html file
const ingestedFromHtml: IngestedContent = {
  text: "## YAAF Framework\n\nThis is the main content of the article, converted to Markdown. All navigation, ads, and sidebars have been removed.",
  images: [
    {
      originalSrc: "https://example.com/images/architecture.jpg",
      localPath: "/path/to/kb/raw/web-clips/yaaf-framework/assets/architecture.jpg",
      altText: "YAAF Architecture Diagram",
      mimeType: "image/jpeg",
      sizeBytes: 67890,
    },
  ],
  mimeType: "text/html",
  sourceFile: "/path/to/kb/raw/web-clips/yaaf-framework/index.html",
  title: "YAAF Framework Deep Dive",
  metadata: {
    og_title: "YAAF Framework Deep Dive",
    og_description: "An in-depth look at the YAAF agent framework.",
    readability_excerpt: "This is the main content of the article...",
    readability_site_name: "TechBlog",
    _readability_failed: false,
  },
  lossy: true,
  sourceUrl: "https://example.com/yaaf-framework-deep-dive",
  sourceTrust: "web",
};
```

### From a Plain Text File

A simple `IngestedContent` object from the `plainTextIngester`. It has no images and minimal metadata [Source 4].

```typescript
// Result of ingesting a .txt file
const ingestedFromText: IngestedContent = {
  text: "This is a plain text file.\n\nThe first line is used as the title.\n",
  images: [],
  mimeType: "text/plain",
  sourceFile: "/path/to/kb/raw/notes/plain.txt",
  title: "This is a plain text file.",
  metadata: {},
  lossy: false,
  sourceUrl: undefined,
  sourceTrust: "unknown",
};
```

## See Also

*   `Ingester`: The interface for plugins that produce `IngestedContent`.
*   `ImageRef`: The data structure for representing resolved images within `IngestedContent`.
*   `SourceTrustLevel`: The type used to classify the credibility of a source.
*   Knowledge Compiler: The subsystem that orchestrates the ingestion process and consumes `IngestedContent` objects.

## Sources
[Source 1]: src/knowledge/compiler/ingester/html.ts
[Source 2]: src/knowledge/compiler/ingester/ingestCache.ts
[Source 3]: src/knowledge/compiler/ingester/markdown.ts
[Source 4]: src/knowledge/compiler/ingester/text.ts
[Source 5]: src/knowledge/compiler/ingester/types.ts