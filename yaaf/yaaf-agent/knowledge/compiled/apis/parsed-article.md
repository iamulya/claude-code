---
title: ParsedArticle
entity_type: api
summary: Represents a source document that has been parsed into its constituent parts before synthesis.
export_name: ParsedArticle
source_file: src/knowledge/compiler/synthesizer/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:27:10.878Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/index.ts
confidence: 0.9
---

## Overview
`ParsedArticle` is a TypeScript type used within the YAAF knowledge compiler's synthesis pipeline. It represents the intermediate state of a source document after it has been processed by a parser but before it is transformed into a final article. This type encapsulates the constituent parts of a document—such as its metadata and raw content—allowing the synthesizer to perform validation and structural adjustments during the compilation process.

## Signature
```typescript
export type ParsedArticle = {
  // Internal structure representing the constituent parts of a parsed document
};
```

## Examples
The `ParsedArticle` type is primarily used internally by the synthesizer to handle documents that have been decomposed into structured data.

```typescript
import type { ParsedArticle } from 'yaaf/knowledge';

/**
 * ParsedArticle is used to manage document components 
 * during the synthesis phase of knowledge compilation.
 */
```

## See Also
- `SynthesisResult`
- `ArticleSynthesisResult`