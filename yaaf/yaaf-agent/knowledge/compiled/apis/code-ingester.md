---
summary: A source code ingester that handles multiple programming languages, extracting docstrings and wrapping code in fenced blocks.
export_name: codeIngester
source_file: src/knowledge/compiler/ingester/text.ts
category: const
title: codeIngester
entity_type: api
stub: false
compiled_at: 2026-04-16T14:24:39.891Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/text.ts
confidence: 1
---

## Overview
The `codeIngester` is a specialized utility designed to process source code files for inclusion in a knowledge base. It supports a wide variety of programming languages and focuses on preparing code for LLM consumption by extracting descriptive metadata and formatting the content into Markdown fenced code blocks.

It automatically detects the programming language based on the file extension and attempts to extract file-level documentation (such as JSDoc or Python docstrings) to serve as the document's title and summary.

## Signature / Constructor
The `codeIngester` implements the `Ingester` interface.

```typescript
export const codeIngester: Ingester = {
  supportedMimeTypes: [
    'text/typescript', 'text/javascript', 'text/x-python',
    'text/x-go', 'text/x-rust', 'text/x-java', 'text/x-c++',
    'text/x-c', 'text/x-sh',
  ],
  supportedExtensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c', 'sh'],
  requiresOptionalDeps: false,
  ingest: async (filePath: string, options: IngesterOptions = {}): Promise<IngestedContent> => {
    // ... implementation
  }
}
```

## Methods & Properties

### supportedMimeTypes
An array of MIME types that this ingester can handle, covering TypeScript, JavaScript, Python, Go, Rust, Java, C++, C, and Shell scripts.

### supportedExtensions
An array of file extensions supported by the ingester: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`, `.cpp`, `.c`, and `.sh`.

### requiresOptionalDeps
Set to `false`. This ingester relies only on built-in Node.js modules (like `fs/promises`).

### ingest()
The primary method for processing a file.
*   **Parameters**:
    *   `filePath`: The absolute or relative path to the source file.
    *   `options`: An `IngesterOptions` object (optional), which may include a `sourceUrl`.
*   **Behavior**:
    1.  Reads the file content as UTF-8.
    2.  Maps the file extension to a Markdown-compatible language identifier.
    3.  **Docstring Extraction**:
        *   For JavaScript/TypeScript: Searches for a JSDoc block (`/** ... */`) at the top of the file.
        *   For Python: Searches for a triple-quote docstring (`""" ... """`) at the top of the file.
        *   For others: Falls back to the first single-line comment (`//` or `#`).
    4.  **Formatting**: Constructs a text string containing the extracted docstring (if found) followed by the raw code wrapped in a fenced block (e.g., ` ```typescript ... ``` `).
*   **Returns**: A `Promise<IngestedContent>` containing the formatted text, detected language in metadata, and the extracted title.

## Examples

### Basic Usage
```typescript
import { codeIngester } from './src/knowledge/compiler/ingester/text';

const result = await codeIngester.ingest('src/agent.ts');

console.log(result.title);    // Extracted from JSDoc
console.log(result.metadata); // { language: 'typescript' }
console.log(result.text);     // "Docstring content... \n\n ```typescript\n...code...\n```"
```

### Processing a Python File
If a Python file starts with a docstring, `codeIngester` extracts it as the summary.

```python
"""
Agent Controller
Handles the main loop for the agent.
"""
def run():
    pass
```

The resulting `IngestedContent.text` would be:
```markdown
Agent Controller
Handles the main loop for the agent.

```python
"""
Agent Controller
Handles the main loop for the agent.
"""
def run():
    pass
```
```