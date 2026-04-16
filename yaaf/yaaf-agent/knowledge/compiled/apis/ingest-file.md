---
export_name: ingestFile
source_file: src/knowledge/compiler/ingester/index.ts
category: function
summary: Automatically selects the appropriate ingester and processes a file into IngestedContent based on its extension or MIME type.
title: ingestFile
entity_type: api
stub: false
compiled_at: 2026-04-16T14:24:01.145Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/index.ts
confidence: 1
---

## Overview
`ingestFile` is a central dispatch function within the YAAF knowledge compiler. It automates the process of converting raw files into a standardized `IngestedContent` format. The function identifies the appropriate ingester for a given file by first checking its file extension and then its MIME type.

This function is typically used during the Knowledge Base (KB) compilation phase to prepare diverse data sources for indexing or LLM consumption.

## Signature / Constructor

```typescript
export async function ingestFile(
  filePath: string,
  options?: IngesterOptions,
): Promise<IngestedContent>
```

### Parameters
- `filePath`: The absolute path to the source file on the local filesystem.
- `options`: (Optional) An object of type `IngesterOptions` to configure the ingestion behavior.

### Supported Formats
The function delegates to specific ingesters based on the following priority:

| Format | Extensions | Dependencies | Notes |
| :--- | :--- | :--- | :--- |
| **Markdown** | `.md`, `.mdx` | None | Primary path for OWC output. |
| **HTML** | `.html`, `.htm` | `@mozilla/readability`, `jsdom`, `turndown` | Performs readability extraction. |
| **Plain text** | `.txt`, `.csv`, `.tsv` | None | Processed as-is. |
| **JSON / YAML** | `.json`, `.yaml`, `.yml` | None | Pretty-printed to maintain structure. |
| **Source code** | `.ts`, `.js`, `.py`, `.go`, etc. | None | Wrapped in fenced blocks with docstrings. |
| **PDF** | `.pdf` | Varies | Uses specialized PDF extractors. |

## Examples

### Basic File Ingestion
This example demonstrates how to ingest a Markdown file using the default options.

```typescript
import { ingestFile } from 'yaaf/knowledge';

async function processDocument(path: string) {
  try {
    const content = await ingestFile(path);
    console.log('Ingested Title:', content.title);
    console.log('Markdown Body:', content.content);
  } catch (error) {
    console.error('Failed to ingest file:', error);
  }
}
```

### Handling HTML with Optional Dependencies
Ingesting HTML files requires specific peer dependencies. If they are missing, the function will throw an error.

```typescript
import { ingestFile } from 'yaaf/knowledge';

async function ingestWebPage(htmlPath: string) {
  // Ensure @mozilla/readability, jsdom, and turndown are installed
  const content = await ingestFile(htmlPath, {
    // Ingester-specific options can be passed here
  });
  
  return content;
}
```

## See Also
- `resolveIngester`: The internal function used to determine which ingester to apply.
- `canIngest`: A utility to check if a file format is supported before attempting ingestion.
- `requiresOptionalDeps`: A utility to check if a file requires additional NPM packages (like `jsdom`) to be processed.