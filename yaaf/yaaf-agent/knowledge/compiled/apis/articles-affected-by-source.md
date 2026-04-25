---
summary: Identifies all articles that depend on a given source file.
export_name: articlesAffectedBySource
source_file: src/knowledge/compiler/citationIndex.ts
category: function
title: articlesAffectedBySource
entity_type: api
search_terms:
 - find articles from source
 - source file dependencies
 - which articles use this source
 - knowledge base contamination
 - unreliable source impact
 - reverse citation lookup
 - source to article mapping
 - citation index query
 - impact of bad source
 - article source traceability
 - compiled from lookup
stub: false
compiled_at: 2026-04-24T16:50:22.436Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/citationIndex.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `articlesAffectedBySource` function is a utility for querying a `[[[[[[[[CitationIndex]]]]]]]]` to find all compiled articles that were generated from a specific source file [Source 1].

Its primary use case is to determine the "blast radius" of an unreliable or incorrect source file. By providing the path to a source, this function returns a list of all article document IDs that depend on it, effectively answering the question: "If this source is wrong, which articles are contaminated?" [Source 1].

This function operates on a pre-built `CitationIndex` object, which must be created or loaded beforehand [Source 1].

## Signature

```typescript
export function articlesAffectedBySource(
  index: CitationIndex,
  sourcePath: string,
): string[];
```

**Parameters:**

*   `index: CitationIndex`: An instance of the citation index, which contains the mapping from source files to the articles that cite them [Source 1].
*   `sourcePath: string`: The path to the source file to query [Source 1].

**Returns:**

*   `string[]`: An array of article `docId` strings. Each `docId` corresponds to an article that was compiled using the specified `sourcePath` [Source 1].

## Examples

The following example demonstrates how to load a citation index from disk and then use `articlesAffectedBySource` to find all articles affected by a potentially problematic source file.

```typescript
import { 
  loadCitationIndex, 
  articlesAffectedBySource, 
  CitationIndex 
} from 'yaaf/knowledge'; // Note: actual import path may vary

async function findContaminatedArticles(kbDir: string, badSourcePath: string) {
  // Load the pre-built index from the knowledge base directory
  const index: CitationIndex | null = await loadCitationIndex(kbDir);

  if (!index) {
    console.error("Citation index not found. Please run the build process first.");
    return;
  }

  // Find all articles that depend on the bad source file
  const affectedArticles = articlesAffectedBySource(index, badSourcePath);

  if (affectedArticles.length > 0) {
    console.log(`Source '${badSourcePath}' affects the following articles:`);
    affectedArticles.forEach(docId => console.log(`- ${docId}`));
  } else {
    console.log(`No articles were compiled from source '${badSourcePath}'.`);
  }
}

// Example usage:
// findContaminatedArticles(
//   './my-knowledge-base', 
//   'sources/internal-docs/project-alpha-specs.pdf'
// );
```

## See Also

*   `loadCitationIndex`: Function to load a persisted citation index from a file [Source 1].
*   `buildCitationIndex`: Function to generate a new citation index by scanning compiled articles [Source 1].
*   `articlesWithSharedSources`: A related function to find articles that share common sources with a given article [Source 1].
*   `CitationIndex`: The type definition for the index object used by this function [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/CitationIndex.ts