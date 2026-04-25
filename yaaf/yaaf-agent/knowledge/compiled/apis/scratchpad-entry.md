---
export_name: ScratchpadEntry
source_file: src/agents/scratchpad.ts
category: type
summary: Represents metadata for a file stored within a Scratchpad, including its name, size, and last modification timestamp.
title: ScratchpadEntry
entity_type: api
search_terms:
 - scratchpad file metadata
 - list scratchpad files
 - file info in scratchpad
 - scratchpad file properties
 - file name size last modified
 - what does scratchpad list return
 - agent file sharing info
 - temporary file attributes
 - cross-agent file details
 - Scratchpad.list return type
 - file entry type
stub: false
compiled_at: 2026-04-24T17:35:46.149Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/scratchpad.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`ScratchpadEntry` is a TypeScript type that defines the structure for metadata about a single file stored within a `Scratchpad` instance. It provides essential information like the file's name, its size in bytes, and its last modification timestamp.

This type is primarily used as the return type for methods that list the contents of a scratchpad, such as `Scratchpad.list()`. It allows an agent to inspect the files available in the shared directory without needing to read their contents.

## Signature

The `ScratchpadEntry` type is defined as an object with the following properties [Source 1]:

```typescript
export type ScratchpadEntry = {
  name: string;
  size: number;
  lastModified: Date;
};
```

## Properties

- **`name`**: `string`
  The name of the file, including its extension.

- **`size`**: `number`
  The size of the file in bytes.

- **`lastModified`**: `Date`
  A JavaScript `Date` object representing the time the file was last modified.

## Examples

The most common use of `ScratchpadEntry` is processing the results of the `Scratchpad.list()` method.

```typescript
import { Scratchpad, ScratchpadEntry } from 'yaaf';
import * as path from 'path';
import * as os from 'os';

async function main() {
  const scratchpadDir = path.join(os.tmpdir(), 'yaaf-docs-example');
  const scratch = new Scratchpad({ baseDir: scratchpadDir });

  // Agent A writes a file
  await scratch.write('analysis.txt', 'Initial findings...');

  // Agent B lists the files in the scratchpad
  const files: ScratchpadEntry[] = await scratch.list();

  // The 'files' array will contain ScratchpadEntry objects
  for (const file of files) {
    console.log(`File: ${file.name}`);
    console.log(`Size: ${file.size} bytes`);
    console.log(`Last Modified: ${file.lastModified.toISOString()}`);
  }
  /*
  Example Output:
  File: analysis.txt
  Size: 18 bytes
  Last Modified: 2023-10-27T10:00:00.000Z
  */

  await scratch.destroy();
}

main();
```

## See Also

- `Scratchpad`: The class that manages the shared directory and produces `ScratchpadEntry` objects.

## Sources

[Source 1] src/agents/scratchpad.ts