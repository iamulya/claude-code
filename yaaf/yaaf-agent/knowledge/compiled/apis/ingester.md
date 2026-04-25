---
summary: An interface defining the contract for a format-specific content ingester, responsible for extracting and normalizing raw source data.
export_name: Ingester
source_file: src/knowledge/compiler/ingester/types.ts
category: interface
title: Ingester
entity_type: api
search_terms:
 - content extraction
 - data ingestion pipeline
 - parse different file types
 - how to add a new file type
 - normalize source data
 - file format parser
 - ingester contract
 - supported file formats
 - extract text from files
 - handle html markdown pdf
 - knowledge base compiler
 - source content processing
stub: false
compiled_at: 2026-04-24T17:13:43.033Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/html.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/markdown.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/text.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `Ingester` interface defines the contract for format-specific parsers within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) subsystem [Source 4]. Each ingester is responsible for reading a source file of a particular type (e.g., HTML, Markdown, source code), extracting its meaningful content, and normalizing it into a standard `IngestedContent` object. This normalized object serves as the input for the next stages of the knowledge compilation pipeline, such as concept extraction and synthesis [Source 4].

YAAF includes several built-in ingesters for common file formats:
*   `htmlIngester`: For `.html` and `.htm` files, using Mozilla's Readability algorithm to extract article content [Source 1].
*   `markdownIngester`: For `.md` and `.mdx` files, which is a high-fidelity, lossless path [Source 2].
*   `plainTextIngester`: For `.txt`, `.csv`, and `.tsv` files [Source 3].
*   `jsonIngester`: For `.json`, `.yaml`, and `.yml` files [Source 3].
*   `codeIngester`: For various source code files like `.ts`, `.py`, `.go`, etc., which wraps the code in a fenced block and extracts file-level comments [Source 3].

The `Ingester` interface allows developers to extend the Knowledge Base Compiler to support custom or proprietary file formats by creating a new object that satisfies the contract.

## Signature

The `Ingester` is a TypeScript interface. Implementations are expected to be objects that conform to this shape [Source 4].

```typescript
// Source: src/knowledge/compiler/ingester/types.ts

export interface Ingester {
  /** MIME types this ingester handles */
  readonly supportedMimeTypes: string[];
  /** File extensions this ingester handles (without leading dot) */
  readonly supportedExtensions: string[];
  /** Whether this ingester requires optional peer dependencies */
  readonly requiresOptionalDeps: boolean;
  /** Names of required optional packages (for error messages) */
  readonly optionalDeps?: string[];

  /**
   * Extract content from a source file.
   *
   * @param filePath - Absolute path to the source file
   * @param options - Ingestion options
   * @returns Normalized content ready for the synthesis pipeline
   */
  ingest(filePath: string, options?: IngesterOptions): Promise<IngestedContent>;
}
```

### Supporting Types

The `ingest` method uses the following types for its parameters and return value [Source 4]:

```typescript
// Source: src/knowledge/compiler/ingester/types.ts

/**
 * The normalized output of any format-specific ingester.
 */
export type IngestedContent = {
  text: string;
  images: ImageRef[];
  mimeType: string;
  sourceFile: string;
  title?: string;
  metadata?: Record<string, unknown>;
  lossy: boolean;
  sourceUrl?: string;
  sourceTrust?: "academic" | "documentation" | "web" | "unknown";
};

/**
 * Options passed to the ingest method.
 */
export type IngesterOptions = {
  imageOutputDir?: string;
  maxImageDimension?: number;
  sourceUrl?: string;
};

/**
 * A reference to an image found in the source document.
 */
export type ImageRef = {
  originalSrc: string;
  localPath: string;
  altText: string;
mimeType: string;
  sizeBytes: number;
};
```

## Methods & Properties

### Properties

*   `supportedMimeTypes: readonly string[]`
    An array of MIME type strings that this ingester can process. Example: `["text/html"]` [Source 1].

*   `supportedExtensions: readonly string[]`
    An array of file extensions (without the leading dot) that this ingester can process. Example: `["md", "mdx"]` [Source 2].

*   `requiresOptionalDeps: readonly boolean`
    A boolean flag indicating if the ingester relies on optional peer dependencies that the user must install separately. If `true`, the `optionalDeps` property should also be provided [Source 1].

*   `optionalDeps?: readonly string[]`
    An array of npm package names that are required for this ingester to function. This is used to provide clear error messages to the user if a required dependency is missing. Example: `["@mozilla/readability", "jsdom", "turndown"]` [Source 1].

### Methods

*   `ingest(filePath: string, options?: IngesterOptions): Promise<IngestedContent>`
    The core method of the ingester. It takes the absolute `filePath` to a source file and an optional `options` object. It asynchronously reads and parses the file, returning a `Promise` that resolves to a normalized `IngestedContent` object [Source 4].

## Examples

### Implementing a Custom Ingester

The following example shows a simplified implementation of an ingester for `.log` files. It reads the file, uses the first line as the title, and returns the content as plain text.

```typescript
import { readFile } from "fs/promises";
import type { Ingester, IngestedContent, IngesterOptions } from "yaaf";

export const logFileIngester: Ingester = {
  supportedMimeTypes: ["text/plain"],
  supportedExtensions: ["log"],
  requiresOptionalDeps: false,

  async ingest(filePath: string, options: IngesterOptions = {}): Promise<IngestedContent> {
    const text = await readFile(filePath, "utf-8");

    // Use the first non-empty line as the title
    const title = text
      .split("\n")
      .find((line) => line.trim().length > 0)
      ?.trim();

    return {
      text: `\`\`\`log\n${text}\n\`\`\``, // Wrap in a code block
      images: [], // Log files don't have images
      mimeType: "text/plain",
      sourceFile: filePath,
      title: title,
      metadata: {
        lineCount: text.split("\n").length,
      },
      lossy: false, // Ingestion is lossless
      sourceUrl: options.sourceUrl,
    };
  },
};
```

## Sources
[Source 1]: src/knowledge/compiler/ingester/html.ts
[Source 2]: src/knowledge/compiler/ingester/markdown.ts
[Source 3]: src/knowledge/compiler/ingester/text.ts
[Source 4]: src/knowledge/compiler/ingester/types.ts