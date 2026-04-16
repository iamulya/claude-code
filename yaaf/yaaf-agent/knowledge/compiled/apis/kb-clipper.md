---
export_name: KBClipper
source_file: src/knowledge/compiler/ingester/html.ts
category: class
title: KBClipper
entity_type: api
summary: A programmatic utility for fetching URLs, extracting article content using Mozilla Readability, and saving them as Markdown files.
stub: false
compiled_at: 2026-04-16T14:23:55.492Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/html.ts
confidence: 1
---

## Overview
`KBClipper` is a programmatic implementation of the Obsidian Web Clipper browser extension logic. It is designed to ingest web content into a Knowledge Base (KB) by fetching a URL, applying noise-reduction algorithms to extract the primary article content, and persisting the result as a Markdown file.

The class internally utilizes the `htmlIngester` logic, which leverages:
- **Mozilla Readability**: For production-grade article extraction (stripping navigation, ads, and sidebars).
- **JSDOM**: For Node.js-based HTML parsing.
- **Turndown**: For converting cleaned HTML into structured Markdown.

`KBClipper` saves content using a directory structure compatible with the Obsidian Web Clipper (e.g., `article-title/index.md`), allowing the YAAF markdown ingester to process the results with zero overhead.

## Signature / Constructor

```typescript
class KBClipper {
  /**
   * @param outputDir The base directory where web clips should be saved (typically within the KB raw/ directory).
   */
  constructor(outputDir: string)
}
```

### Peer Dependencies
`KBClipper` requires the following optional peer dependencies to be installed in