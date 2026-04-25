---
summary: Loads a previously persisted citation index from a file.
export_name: loadCitationIndex
source_file: src/knowledge/compiler/citationIndex.ts
category: function
title: loadCitationIndex
entity_type: api
search_terms:
 - read citation index
 - load knowledge base index
 - deserialize citation data
 - how to load source to article mapping
 - get compiled article sources
 - find which sources an article uses
 - knowledge base compilation
 - citation index file
 - .kb-citation-index.json
 - retrieve persisted index
 - load source attribution
 - offline citation query
stub: false
compiled_at: 2026-04-24T17:18:47.467Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/citationIndex.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `loadCitationIndex` function reads a previously generated citation index from the file system [Source 1]. It is designed to load the `.kb-citation-index.json` file, which is typically created by the `writeCitationIndex` function during the knowledge base compilation process [Source 1].

This function provides a way to access the bidirectional mapping between source files and compiled articles for offline querying without needing to re-scan all compiled article files. If the index file does not exist in the specified directory, the function returns `null` [Source 1]. The loaded index can then be passed to other utility functions, such as `articlesAffectedBySource`, to analyze source-article relationships [Source 1].

## Signature

The function signature is as follows [Source 1]:

```typescript
export async function loadCitationIndex(kbDir: string): Promise<CitationIndex | null>;
```

### Parameters

-   `kbDir` (string): The path to the root directory of the knowledge base where the `.kb-citation-index.json` file is expected to be located.

### Returns

-   `Promise<CitationIndex | null>`: A promise that resolves to the parsed `CitationIndex` object if the file is found and read successfully, or `null` if the file does not exist [Source 1].

## Examples

The following example demonstrates how to load a citation index and check if it was found.

```typescript
import { loadCitationIndex, articlesAffectedBySource } from 'yaaf';

const knowledgeBaseDir = './my-kb';

async function checkSourceImpact(sourcePath: string) {
  const index = await loadCitationIndex(knowledgeBaseDir);

  if (!index) {
    console.log('Citation index not found. Please build it first.');
    return;
  }

  const affected = articlesAffectedBySource(index, sourcePath);

  console.log(`Source "${sourcePath}" affects the following articles:`);
  console.log(affected);
}

checkSourceImpact('sources/research/paper-01.pdf');
```

## See Also

-   `writeCitationIndex`: The function used to build and persist the citation index file.
-   `buildCitationIndex`: The core function that scans articles to create the index in [Memory](../concepts/memory.md).
-   `articlesAffectedBySource`: A utility function that uses a loaded index to find articles impacted by a specific source.
-   `CitationIndex`: The type definition for the index object returned by this function.

## Sources

[Source 1] `src/knowledge/compiler/citationIndex.ts`