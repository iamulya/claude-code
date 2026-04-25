---
summary: The process of transforming raw, unstructured data from various sources into a structured, queryable format for the knowledge base.
title: Content Ingestion
entity_type: concept
related_subsystems:
 - knowledge_compiler
search_terms:
 - data ingestion
 - knowledge base population
 - how to add data to YAAF
 - importing documents
 - processing raw files
 - HTML to markdown conversion
 - web clipping
 - Mozilla Readability in YAAF
 - Turndown for YAAF
 - JSDOM usage
 - KBClipper
 - ingesting unstructured data
 - data transformation pipeline
stub: false
compiled_at: 2026-04-24T17:53:36.710Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/html.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Content Ingestion is the YAAF process responsible for taking raw data from various sources, such as local files or web URLs, and converting it into a clean, structured format suitable for use in an agent's knowledge base [Source 1]. This process solves the problem of handling unstructured or semi-structured content, like HTML web pages, by extracting the core information, stripping away irrelevant noise (e.g., advertisements, navigation bars), and standardizing it into a consistent format like Markdown [Source 1]. This is a critical first step in populating a knowledge base with high-quality, relevant information that the agent can effectively query and reason about.

## How It Works in YAAF

YAAF's [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) uses a system of format-specific "[Ingester](../apis/ingester.md)s" to handle different types of content. The `htmlIngester` provides a clear example of the ingestion pipeline for web content [Source 1].

The process for handling HTML files (`.html`, `.htm`) and direct URL clips involves several distinct steps:

1.  **Parsing**: The raw HTML content is first parsed into a Document Object Model (DOM) using the `jsdom` library. This creates a structured representation of the page that can be programmatically manipulated [Source 1].
2.  **Content Extraction**: The core article content is extracted from the DOM using Mozilla's `@mozilla/readability` library. This is the same algorithm that powers the Firefox "Reader Mode," and it is highly effective at removing extraneous elements like ads, sidebars, and cookie banners [Source 1]. If Readability fails to find a main article, the Ingester has a fallback mechanism that strips all HTML tags to extract the raw text content of the page [Source 1].
3.  **HTML to Markdown Conversion**: The cleaned HTML output from Readability is then converted into Markdown using the `turndown` library. This produces a clean, semantic, and [LLM](./llm.md)-friendly text format [Source 1].
4.  **Image Handling**: The ingester processes images found within the extracted content. It can handle external URLs (which are downloaded), local file paths (which are resolved), and embedded Base64 data URIs. All images are saved locally to an assets directory, and references to them are maintained [Source 1].
5.  **Metadata Extraction**: Before content extraction (which can strip metadata tags), the ingester parses the raw HTML for metadata like the page title. After extraction, it combines this with metadata provided by Readability, such as the author, site name, and excerpt [Source 1].
6.  **Output**: The final output is an `IngestedContent` object containing the Markdown text, a list of local image references, extracted metadata, and flags indicating if the process was `lossy` (i.e., if information was deliberately discarded, as is the case with Readability) [Source 1].

This entire process is encapsulated within implementations of the `Ingester` interface. For programmatic web clipping, YAAF provides a `KBClipper` class that fetches a URL and runs it through this ingestion pipeline, saving the resulting Markdown and assets in a structured directory, similar to the Obsidian Web Clipper browser extension [Source 1].

The HTML ingestion pipeline relies on several optional peer dependencies: `@mozilla/readability`, `jsdom`, and `turndown`. If these libraries are not installed in the user's project, the `htmlIngester` will throw a clear error message specifying which packages need to be installed, rather than failing with a cryptic module resolution error [Source 1].

## Configuration

While the ingestion process is largely automated, some aspects can be configured on a per-call basis via the `IngesterOptions` object passed to the `ingest` method. These options include:

*   `imageOutputDir`: Specifies the directory where downloaded and extracted images should be saved. It defaults to an `assets` folder within the source document's directory [Source 1].
*   `sourceUrl`: Provides the original URL of the content, which helps `jsdom` correctly resolve relative links within the HTML document [Source 1].

```typescript
// Example of passing options to an ingester
// (Conceptual; direct invocation may vary)

const content = await htmlIngester.ingest('/path/to/source.html', {
  imageOutputDir: '/path/to/kb/assets/images',
  sourceUrl: 'https://example.com/article'
});
```

## Sources
[Source 1]: src/knowledge/compiler/ingester/html.ts