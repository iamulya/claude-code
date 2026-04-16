---
export_name: markdownIngester
source_file: src/knowledge/compiler/ingester/markdown.ts
category: constant
summary: The primary ingester for Markdown and MDX files, supporting frontmatter extraction and local image resolution.
title: markdownIngester
entity_type: api
stub: false
compiled_at: 2026-04-16T14:24:02.357Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/markdown.ts
confidence: 1
---

## Overview
The `markdownIngester` is the primary ingestion engine for Markdown (`.md`) and MDX (`.mdx`) files within the YAAF knowledge subsystem. It is designed as the highest-fidelity ingestion path, specifically optimized for content produced by tools like the Obsidian Web Clipper or Joplin Web Clipper.

The ingester performs several automated tasks during the ingestion process:
1.  **Frontmatter Extraction**: Parses YAML frontmatter to populate metadata.
2.  **Title Resolution**: Determines the document title by checking frontmatter first, then falling back to the first H1 header found in the body.
3.  **Image Resolution**: Identifies image references within the markdown and resolves them to local absolute paths, optionally moving them to a designated output directory.
4.  **Metadata Mapping**: Merges all frontmatter fields into the resulting metadata object and tracks any unresolved image references.

This ingester has zero optional dependencies and is considered a core component of the YAAF compiler pipeline.

## Signature
```typescript
export const markdownIngester: Ingester;
```

### Implementation Details
The `markdownIngester` implements the `Ingester` interface. It is configured with the following static properties:
*   **supportedMimeTypes**: `['text/markdown']`
*   **supportedExtensions**: `['md', 'mdx']`
*   **requiresOptionalDeps**: `false`

## Methods & Properties

### ingest()
The primary method for processing a file.

**Signature:**
```typescript
async ingest(filePath: string, options: IngesterOptions = {}): Promise<IngestedContent>
```

**Parameters:**
*   `filePath`: The absolute or relative path to the markdown file on disk.
*   `options`: An optional `IngesterOptions` object.
    *   `imageOutputDir`: (Optional) The directory where resolved images should be referenced. Defaults to an `assets` folder relative to the source file.
    *   `sourceUrl`: (Optional) Explicit source URL for the content. If not provided, the ingester attempts to extract this from frontmatter fields `source` or `url`.

**Returns:**
A `Promise<IngestedContent>` containing:
*   `text`: The markdown body (excluding frontmatter).
*   `images`: An array of resolved local image paths.
*   `mimeType`: Always `text/markdown`.
*   `sourceFile`: The original file path.
*   `title`: The extracted title.
*   `metadata`: A record containing all frontmatter and a list of `_unresolved_images` if any resolution failed.
*   `lossy`: Always `false`.
*   `sourceUrl`: The resolved origin URL.

## Examples

### Basic Ingestion
```typescript
import { markdownIngester } from 'yaaf/knowledge';

const content = await markdownIngester.ingest('./notes/research.md');

console.log(content.title);
console.log(content.metadata.tags); // Access frontmatter fields
```

### Custom Image Output
```typescript
import { markdownIngester } from 'yaaf/knowledge';

const content = await markdownIngester.ingest('./notes/research.md', {
  imageOutputDir: './dist/static/images'
});
```

## Sources
*   `src/knowledge/compiler/ingester/markdown.ts`