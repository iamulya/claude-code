---
summary: The core interface that all format-specific knowledge extractors must implement.
export_name: Ingester
source_file: src/knowledge/compiler/ingester/types.ts
category: interface
title: Ingester
entity_type: api
stub: false
compiled_at: 2026-04-16T14:23:23.246Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/index.ts
confidence: 1
---

## Overview
The `Ingester` interface defines the contract for components responsible for extracting raw content from various file formats into a standardized `IngestedContent` format. It serves as the initial stage in the knowledge compilation pipeline, transforming external data sources into a structured representation suitable for subsequent synthesis and analysis.

The framework provides a central registry that automatically dispatches files to the appropriate `Ingester` implementation based on file extensions or MIME types.

## Signature / Constructor
The `Ingester` interface is used by the `resolveIngester` factory and the `ingestFile` utility.

```typescript
export type Ingester = {
  ingest(filePath: string, options?: IngesterOptions): Promise<IngestedContent>;
};

// High-level entry point
export async function ingestFile(
  filePath: string,
  options?: IngesterOptions,
): Promise<IngestedContent>;
```

### Supported Formats
The framework includes built-in ingesters for the following formats:

| Format | Extensions | Notes |
| :--- | :--- | :--- |
| **Markdown** | `.md`, `.mdx` | Primary path for content. |
| **HTML** | `.html`, `.htm` | Uses Readability extraction; requires optional dependencies. |
| **Plain text** | `.txt`, `.csv`, `.tsv` | Extracted as-is. |
| **JSON / YAML** | `.json`, `.yaml`, `.yml` | Pretty-printed with structure preservation. |
| **Source code** | `.ts`, `.js`, `.py`, `.go`, etc. | Extracted with fenced blocks and docstrings. |
| **PDF** | `.pdf` | Handled via specialized PDF extractors. |

## Methods & Properties
While specific `Ingester` implementations are internal, the following public utility functions are used to interact with the ingestion subsystem:

| Function | Description |
| :--- | :--- |
| `resolveIngester(filePath: string)` | Returns the appropriate `Ingester` instance for a given file path. Throws if the format is unsupported. |
| `canIngest(filePath: string)` | Returns a boolean indicating if any registered ingester supports the file. |
| `requiresOptionalDeps(filePath: string)` | Checks if the specific file (e.g., HTML) requires additional npm packages to process. |
| `requiredOptionalDeps(filePaths: string[])` | Returns a list of missing optional dependencies needed for a set of files. |

## Examples

### Basic File Ingestion
The most common usage pattern is using the `ingestFile` wrapper, which handles resolution and execution automatically.

```typescript
import { ingestFile } from 'yaaf/knowledge/compiler/ingester';

const content = await ingestFile('./docs/architecture.md');
console.log(content.text);
```

### Manual Ingester Resolution
For more control, you can resolve the ingester manually before execution.

```typescript
import { resolveIngester, canIngest } from 'yaaf/knowledge/compiler/ingester';

const filePath = './data/config.yaml';

if (canIngest(filePath)) {
  const ingester = resolveIngester(filePath);
  const result = await ingester.ingest(filePath);
  
  console.log(`Ingested ${result.format} content`);
}
```

### Handling Optional Dependencies
Certain formats like HTML require external libraries (`@mozilla/readability`, `jsdom`, `turndown`).

```typescript
import { requiresOptionalDeps, requiredOptionalDeps } from 'yaaf/knowledge/compiler/ingester';

const files = ['./index.html', './about.html'];
const missing = requiredOptionalDeps(files);

if (missing.length > 0) {
  console.warn(`Please install optional dependencies: npm install ${missing.join(' ')}`);
}
```

## Sources
- `src/knowledge/compiler/index.ts`
- `src/knowledge/compiler/ingester/index.ts`