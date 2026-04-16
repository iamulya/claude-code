---
summary: An ingester for JSON and YAML files that extracts structural metadata and provides pretty-printed summaries.
export_name: jsonIngester
source_file: src/knowledge/compiler/ingester/text.ts
category: const
title: jsonIngester
entity_type: api
stub: false
compiled_at: 2026-04-16T14:24:35.628Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/text.ts
confidence: 1
---

## Overview
The `jsonIngester` is a specialized component within the YAAF knowledge compiler system designed to process structured data files. It supports both JSON and YAML formats, transforming raw structured data into a format optimized for LLM consumption. 

The ingester performs three primary functions:
1.  **Title Extraction**: It attempts to identify a document title by looking for common fields such as `title`, `name`, or `id` within the root of the data structure.
2.  **Structural Summarization**: It generates a human-readable header that lists the top-level keys present in the document.
3.  **Markdown Formatting**: It wraps the content in a fenced JSON code block to preserve structure while providing context to the model.

## Signature / Constructor
The `jsonIngester` is a constant that implements the `Ingester` interface.

```typescript
export const jsonIngester: Ingester = {
  supportedMimeTypes: ['application/json', 'application/yaml'],
  supportedExtensions: ['json', 'yaml', 'yml'],
  requiresOptionalDeps: false,
  async ingest(filePath: string, options: IngesterOptions = {}): Promise<IngestedContent> {
    // ... implementation ...
  },
}
```

## Methods & Properties

### Properties
*   **supportedMimeTypes**: `['application/json', 'application/yaml']`.
*   **supportedExtensions**: `['json', 'yaml', 'yml']`.
*   **requiresOptionalDeps**: `false`. This ingester relies on standard Node.js and TypeScript capabilities and does not require external heavy dependencies.

### ingest(filePath, options)
The primary method for processing a file.
*   **Parameters**:
    *   `filePath`: `string` - The path to the file on the local filesystem.
    *   `options`: `IngesterOptions` (optional) - Configuration for the ingestion process, including an optional `sourceUrl`.
*   **Returns**: `Promise<IngestedContent>`
*   **Behavior**:
    *   Reads the file content as a UTF-8 string.
    *   Attempts to parse the content using `JSON.parse()`.
    *   If parsing is successful:
        *   Extracts a title from the root object (checking `title`, `name`, or `id`).
        *   Identifies top-level keys to create a "Top-level fields" summary.
        *   Constructs a text representation containing the summary and the pretty-printed JSON inside a markdown code block.
    *   If parsing fails (e.g., the file is YAML or malformed JSON):
        *   The raw content is returned as the text without structural summarization.

## Examples

### Basic Usage
The ingester is typically used by the knowledge compiler to process data files.

```typescript
import { jsonIngester } from 'src/knowledge/compiler/ingester/text';

const filePath = './data/config.json';
const content = await jsonIngester.ingest(filePath);

console.log(content.title); // Extracts from 'title', 'name', or 'id' fields
console.log(content.text); 
/* 
Output format:
# [Title or JSON Document]

Top-level fields: key1, key2, ...

```json
{
  "key1": "value",
  ...
}
```
*/
```

### Handling YAML
While the ingester lists YAML as a supported extension, the current implementation treats it as raw text if it cannot be parsed by `JSON.parse`.

```typescript
const yamlContent = await jsonIngester.ingest('settings.yaml');
// Returns IngestedContent where 'text' is the raw YAML string.
```

## See Also
* `plainTextIngester`
* `codeIngester`