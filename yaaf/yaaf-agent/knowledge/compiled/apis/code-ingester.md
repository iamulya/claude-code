---
summary: Ingester for source code files, extracting docstrings/comments and wrapping content in fenced code blocks.
export_name: codeIngester
source_file: src/knowledge/compiler/ingester/text.ts
category: constant
title: codeIngester
entity_type: api
search_terms:
 - ingest source code
 - parse code files
 - extract docstrings
 - JSDoc extraction
 - python docstring parser
 - knowledge base from code
 - file ingester for ts
 - javascript file processing
 - code to text
 - source file truncation
 - handle large source files
 - supported code languages
 - code file reader
stub: false
compiled_at: 2026-04-24T16:55:49.748Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/text.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `code[[[[[[[[Ingester]]]]]]]]` is a constant object that implements the `Ingester` interface, designed to process source code files from various programming languages. Its primary function is to read a source file, extract meaningful metadata, and format its content for inclusion in a knowledge base [Source 1].

Key features of the `codeIngester` include:

*   **Content Wrapping**: It wraps the entire source code content within a Markdown fenced code block, with the language identifier automatically determined from the file extension [Source 1].
*   **Docstring Extraction**: It attempts to find and extract file-level docstrings or JSDoc comments from the top of the file. This extracted text is used as a summary prepended to the content and its first line is used as the document title [Source 1]. It supports JSDoc-style block comments (`/** ... */`) and Python-style docstrings (`"""..."""`) [Source 1].
*   **Comment Fallback**: If no docstring is found, it looks for a leading single-line comment (`//` or `#`) to use as the title [Source 1].
*   **File Size Limit**: To prevent out-of-[Memory](../concepts/memory.md) errors [when](./when.md) processing large files like minified bundles, the Ingester truncates files larger than 500KB. It reads only the first 500KB and appends a notice about the truncation [Source 1].
*   **Broad Language Support**: It supports a wide range of common programming languages, including TypeScript, JavaScript, Python, Go, Rust, Java, C++, C, and shell scripts [Source 1].

This ingester is useful for building knowledge bases directly from a codebase, allowing agents to reason about the implementation details of software.

## Signature

The `codeIngester` is a constant of type `Ingester`. The `Ingester` interface is defined as follows:

```typescript
interface Ingester {
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  requiresOptionalDeps: boolean;
  ingest(filePath: string, options?: IngesterOptions): Promise<IngestedContent>;
}

interface IngesterOptions {
  sourceUrl?: string;
}

interface IngestedContent {
  text: string;
  images: Buffer[];
  mimeType: string;
  sourceFile: string;
  title?: string;
  metadata: Record<string, unknown>;
  lossy: boolean;
  sourceUrl?: string;
}
```

## Properties

The `codeIngester` object has the following properties:

### `supportedMimeTypes`

A list of MIME types that this ingester can handle.

*   **Type**: `string[]`
*   **Value**: `["text/typescript", "text/javascript", "text/x-python", "text/x-go", "text/x-rust", "text/x-java", "text/x-c++", "text/x-c", "text/x-sh"]` [Source 1]

### `supportedExtensions`

A list of file extensions that this ingester can handle.

*   **Type**: `string[]`
*   **Value**: `["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "cpp", "c", "sh"]` [Source 1]

### `requiresOptionalDeps`

Indicates whether the ingester requires any [Optional Dependencies](../concepts/optional-dependencies.md) to be installed.

*   **Type**: `boolean`
*   **Value**: `false` [Source 1]

### `ingest()`

An asynchronous method that reads and processes a source code file.

*   **Signature**: `async (filePath: string, options: IngesterOptions = {}): Promise<IngestedContent>`
*   **Parameters**:
    *   `filePath` (`string`): The absolute or relative path to the source code file.
    *   `options` (`IngesterOptions`): Optional parameters, such as a `sourceUrl`.
*   **Returns**: `Promise<IngestedContent>`: A promise that resolves to an `IngestedContent` object containing the formatted text, extracted title, and metadata [Source 1].

## Examples

### Ingesting a TypeScript file with JSDoc

Given a file `src/utils/math.ts` with the following content:

```typescript
// src/utils/math.ts

/**
 * A collection of mathematical utility functions.
 * This module provides simple arithmetic operations.
 */

export function add(a: number, b: number): number {
  return a + b;
}
```

The `codeIngester` can be used to process it:

```typescript
import { codeIngester } from 'yaaf/knowledge';
import { promises as fs } from 'fs';

// Assume the file 'src/utils/math.ts' exists with the content above.

async function runIngestion() {
  const filePath = 'src/utils/math.ts';
  const ingestedData = await codeIngester.ingest(filePath);

  console.log('Title:', ingestedData.title);
  console.log('---');
  console.log('Text:', ingestedData.text);
}

runIngestion();
```

**Output:**

```
Title: A collection of mathematical utility functions.
---
Text: A collection of mathematical utility functions.
This module provides simple arithmetic operations.

```typescript
/**
 * A collection of mathematical utility functions.
 * This module provides simple arithmetic operations.
 */

export function add(a: number, b: number): number {
  return a + b;
}
```
```

The ingester correctly identifies the JSDoc block, uses its first line as the `title`, and includes the full docstring as a summary above the fenced code block in the `text` property.

## Sources

[Source 1]: src/knowledge/compiler/ingester/text.ts