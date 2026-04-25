---
summary: Ingester for JSON and YAML files, extracting metadata and pretty-printing content.
export_name: jsonIngester
source_file: src/knowledge/compiler/ingester/text.ts
category: constant
title: jsonIngester
entity_type: api
search_terms:
 - ingest JSON files
 - process YAML data
 - load structured data
 - knowledge base from JSON
 - YAAF ingester
 - file content processor
 - parse json for agent
 - extract title from json
 - pretty-print json
 - handle .yml files
 - structured data ingestion
 - Ingester interface
stub: false
compiled_at: 2026-04-24T17:15:35.762Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/text.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `json[[[[[[[[Ingester]]]]]]]]` is a constant that provides an implementation of the `Ingester` interface for handling structured data files like JSON and YAML [Source 1]. It is designed to read files with `.json`, `.yaml`, or `.yml` extensions, process their content, and return a standardized `IngestedContent` object.

[when](./when.md) processing a file, `jsonIngester` first attempts to parse it as JSON. If successful, it performs the following actions:
- **Title Extraction**: It attempts to find a title for the document by looking for common properties such as `title`, `name`, or `id` in the root of the JSON object.
- **Structural Summary**: It generates a brief summary listing the top-level keys of the JSON object.
- **Content Formatting**: The full JSON content is pretty-printed and embedded within a markdown `json` code block, prefixed by the structural summary.

If the file content cannot be parsed as JSON (which is expected for YAML files or malformed JSON), the Ingester falls back to treating the entire file content as raw text [Source 1].

This ingester has no [Optional Dependencies](../concepts/optional-dependencies.md) and is included by default in the YAAF framework.

## Signature

`jsonIngester` is a constant object that conforms to the `Ingester` interface.

```typescript
import type { Ingester } from "./types.js";

export const jsonIngester: Ingester;
```

The `Ingester` interface has the following structure:

```typescript
interface Ingester {
  // A list of supported MIME types, e.g., ["application/json"]
  supportedMimeTypes: string[];

  // A list of supported file extensions, e.g., ["json", "yaml"]
  supportedExtensions: string[];

  // Indicates if the ingester requires optional dependencies to be installed
  requiresOptionalDeps: boolean;

  // The function that processes the file
  ingest(filePath: string, options?: IngesterOptions): Promise<IngestedContent>;
}

// Options passed to the ingest method
interface IngesterOptions {
  sourceUrl?: string;
}

// The standardized output of an ingester
interface IngestedContent {
  text: string;
  images: string[];
  mimeType: string;
  sourceFile: string;
  title?: string;
  metadata: Record<string, unknown>;
  lossy: boolean;
  sourceUrl?: string;
}
```

## Properties

The `jsonIngester` object has the following properties:

- **`supportedMimeTypes`**: `string[]`
  An array of MIME types this ingester can handle.
  Value: `["application/json", "application/yaml"]` [Source 1].

- **`supportedExtensions`**: `string[]`
  An array of file extensions this ingester recognizes.
  Value: `["json", "yaml", "yml"]` [Source 1].

- **`requiresOptionalDeps`**: `boolean`
  Indicates whether the ingester requires optional dependencies.
  Value: `false` [Source 1].

- **`ingest`**: `(filePath: string, options?: IngesterOptions) => Promise<IngestedContent>`
  The core method that reads and processes the file at `filePath`. It returns a promise that resolves to an `IngestedContent` object.

## Examples

### Ingesting a JSON file

This example demonstrates how to use `jsonIngester` to process a simple JSON file.

```typescript
import { jsonIngester } from "yaaf/knowledge";
import { writeFile, unlink } from "fs/promises";

async function processJsonFile() {
  const filePath = "./package.json";
  const fileContent = JSON.stringify({
    name: "my-project",
    version: "1.0.0",
    description: "A sample project.",
  }, null, 2);

  // Create a dummy file for the example
  await writeFile(filePath, fileContent);

  try {
    const ingestedData = await jsonIngester.ingest(filePath);

    console.log("Title:", ingestedData.title);
    console.log("--- Content ---");
    console.log(ingestedData.text);
    /*
    Output:
    Title: my-project
    --- Content ---
    # my-project

    Top-level fields: name, version, description

    ```json
    {
      "name": "my-project",
      "version": "1.0.0",
      "description": "A sample project."
    }
    ```
    */
  } finally {
    // Clean up the dummy file
    await unlink(filePath);
  }
}

processJsonFile();
```

### Ingesting a YAML file

When a file that is not valid JSON (like a YAML file) is passed, `jsonIngester` treats it as plain text.

```typescript
import { jsonIngester } from "yaaf/knowledge";
import { writeFile, unlink } from "fs/promises";

async function processYamlFile() {
  const filePath = "./config.yml";
  const fileContent = `
apiVersion: v1
kind: Service
metadata:
  name: my-service
  `;

  await writeFile(filePath, fileContent);

  try {
    const ingestedData = await jsonIngester.ingest(filePath);

    console.log("Title:", ingestedData.title); // Will be undefined
    console.log("--- Content ---");
    console.log(ingestedData.text);
    /*
    Output:
    Title: undefined
    --- Content ---

    apiVersion: v1
    kind: Service
    metadata:
      name: my-service
    */
  } finally {
    await unlink(filePath);
  }
}

processYamlFile();
```

## Sources

[Source 1]: src/knowledge/compiler/ingester/text.ts