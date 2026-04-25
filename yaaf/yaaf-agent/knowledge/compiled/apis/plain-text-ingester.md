---
summary: Ingester for plain text, CSV, and TSV files.
export_name: plainTextIngester
source_file: src/knowledge/compiler/ingester/text.ts
category: constant
title: plainTextIngester
entity_type: api
search_terms:
 - ingest text files
 - process CSV data
 - load TSV files
 - read plain text knowledge
 - file ingester
 - knowledge base text source
 - how to add txt files to knowledge
 - YAAF ingester interface
 - zero dependency ingester
 - handle .txt files
 - parse .csv files
 - text content extraction
stub: false
compiled_at: 2026-04-24T17:28:21.003Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/text.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `plainText[[[[[[[[Ingester]]]]]]]]` is a constant that provides an implementation of the `Ingester` interface for handling plain text files [Source 1]. It is designed to process files with the extensions `.txt`, `.csv`, and `.tsv`, corresponding to the MIME types `text/plain` and `text/csv` [Source 1].

This Ingester reads the entire content of a file into a single text string. It automatically attempts to derive a title for the content by using the first non-empty line from the file, truncated to 80 characters. A key feature of this ingester is that it has no [Optional Dependencies](../concepts/optional-dependencies.md), making it a lightweight, built-in component for basic text ingestion [Source 1].

## Signature

The `plainTextIngester` is a constant object that conforms to the `Ingester` interface.

```typescript
import type { Ingester } from "./types.js";

export const plainTextIngester: Ingester = {
  supportedMimeTypes: ["text/plain", "text/csv"],
  supportedExtensions: ["txt", "csv", "tsv"],
  requiresOptionalDeps: false,
  ingest: (filePath: string, options?: IngesterOptions) => Promise<IngestedContent>,
};
```
[Source 1]

## Properties

The `plainTextIngester` object has the following properties:

### supportedMimeTypes
- **Type**: `string[]`
- **Value**: `["text/plain", "text/csv"]`

An array of MIME types that this ingester can handle [Source 1].

### supportedExtensions
- **Type**: `string[]`
- **Value**: `["txt", "csv", "tsv"]`

An array of file extensions that this ingester can handle [Source 1].

### requiresOptionalDeps
- **Type**: `boolean`
- **Value**: `false`

Indicates that this ingester does not require any optional dependencies to be installed [Source 1].

### ingest
- **Signature**: `async (filePath: string, options: IngesterOptions = {}): Promise<IngestedContent>`

The core method that reads and processes a file.

**Parameters:**
- `filePath` (`string`): The absolute or relative path to the file to ingest.
- `options` (`IngesterOptions`): Optional parameters. The `sourceUrl` property is passed through to the output.

**Returns:** `Promise<IngestedContent>`
A promise that resolves to an `IngestedContent` object with the following structure:
- `text`: The full content of the file as a UTF-8 string.
- `images`: An empty array (`[]`).
- `mimeType`: Always `"text/plain"`.
- `sourceFile`: The `filePath` provided as input.
- `title`: The first non-empty line of the file, trimmed and sliced to a maximum of 80 characters. `undefined` if the file is empty.
- `metadata`: An empty object (`{}`).
- `lossy`: Always `false`, as no information is lost.
- `sourceUrl`: The value of `options.sourceUrl`, if provided.

[Source 1]

## Examples

### Basic Ingestion

Given a file `notes.txt` with the following content:
```text
Project Phoenix - Meeting Notes

- Discussed Q3 roadmap.
- Finalized budget for new server hardware.
- Alice to follow up on marketing collateral.
```

The `ingest` method can be called to process it:

```typescript
import { plainTextIngester } from 'yaaf/knowledge';
import { promises as fs } from 'fs';

// Assume notes.txt exists in the current directory
const filePath = './notes.txt';

async function runIngestion() {
  const ingestedData = await plainTextIngester.ingest(filePath);
  console.log(ingestedData);
}

runIngestion();

/*
Expected output:
{
  text: 'Project Phoenix - Meeting Notes\n' +
    '\n' +
    '- Discussed Q3 roadmap.\n' +
    '- Finalized budget for new server hardware.\n' +
    '- Alice to follow up on marketing collateral.',
  images: [],
  mimeType: 'text/plain',
  sourceFile: './notes.txt',
  title: 'Project Phoenix - Meeting Notes',
  metadata: {},
  lossy: false,
  sourceUrl: undefined
}
*/
```

## Sources
[Source 1]: src/knowledge/compiler/ingester/text.ts