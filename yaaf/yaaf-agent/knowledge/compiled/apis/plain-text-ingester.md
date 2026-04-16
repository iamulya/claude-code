---
summary: An ingester implementation for plain text, CSV, and TSV files with zero optional dependencies.
export_name: plainTextIngester
source_file: src/knowledge/compiler/ingester/text.ts
category: const
title: plainTextIngester
entity_type: api
stub: false
compiled_at: 2026-04-16T14:24:32.612Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/text.ts
confidence: 1
---

## Overview
The `plainTextIngester` is a built-in utility within the YAAF knowledge subsystem designed to process unstructured or semi-structured text files. It provides a lightweight, dependency-free implementation for converting `.txt`, `.csv`, and `.tsv` files into a standardized `IngestedContent` format. 

This ingester is typically used by the knowledge compiler to prepare raw text data for indexing or LLM context windows. It performs basic metadata extraction, such as identifying a document title from the first non-empty line of the file.

## Signature / Constructor
The `plainTextIngester` implements the `Ingester` interface.

```typescript
export const plainTextIngester: Ingester = {
  supportedMimeTypes: ['text/plain', 'text/csv'],
  supportedExtensions: ['txt', 'csv', 'tsv'],
  requiresOptionalDeps: false,
  ingest: (filePath: string, options?: IngesterOptions) => Promise<IngestedContent>
};
```

## Methods & Properties

### supportedMimeTypes
*   **Type**: `string[]`
*   **Value**: `['text/plain', 'text/csv']`
*   Identifies the MIME types the ingester is capable of processing.

### supportedExtensions
*   **Type**: `string[]`
*   **Value**: `['txt', 'csv', 'tsv']`
*   Identifies the file extensions the ingester is capable of processing.

### requiresOptionalDeps
*   **Type**: `boolean`
*   **Value**: `false`
*   Indicates that this ingester does not require any external peer dependencies or binary tools to function.

### ingest()
*   **Signature**: `ingest(filePath: string, options: IngesterOptions = {}): Promise<IngestedContent>`
*   **Description**: Reads a file from the local filesystem and transforms it into an `IngestedContent` object.
*   **Behavior**:
    *   Reads the file using UTF-8 encoding.
    *   Extracts the `title` by locating the first non-empty line in the file and truncating it to a maximum of 80 characters.
    *   Sets `lossy` to `false` as it performs a direct read of the text content.
    *   Returns an object containing the full text, source file path, and any provided source URL.

## Examples

### Basic Usage
This example demonstrates how to manually use the ingester to process a text file.

```typescript
import { plainTextIngester } from 'yaaf';

async function processFile() {
  const content = await plainTextIngester.ingest('./notes.txt', {
    sourceUrl: 'https://example.com/files/notes.txt'
  });

  console.log('Title:', content.title);
  console.log('Content:', content.text);
  console.log('Source:', content.sourceFile);
}
```

### CSV Processing
While the ingester supports CSV and TSV extensions, it treats them as plain text without structural parsing.

```typescript
import { plainTextIngester } from 'yaaf';

const csvData = await plainTextIngester.ingest('./data.csv');
// content.text will contain the raw CSV string
// content.title will be the header row (first line)
```