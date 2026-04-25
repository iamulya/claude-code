---
summary: Represents a fully compiled Knowledge Base document, including its body and metadata.
export_name: CompiledDocument
source_file: src/knowledge/store/store.ts
category: type
title: CompiledDocument
entity_type: api
search_terms:
 - knowledge base document structure
 - compiled article format
 - KB document type
 - document body and metadata
 - what is a compiled document
 - knowledge base article properties
 - docId
 - tokenEstimate
 - frontmatter data
 - full document content
 - KBStore document object
 - article body
stub: false
compiled_at: 2026-04-24T16:56:37.226Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `CompiledDocument` type represents the complete, in-[Memory](../concepts/memory.md) structure of a single document from a YAAF Knowledge Base [Source 1]. It contains the full markdown body of the article as well as all its associated metadata, such as the title, word count, and raw [Frontmatter](../concepts/frontmatter.md) values [Source 1].

This type is used [when](./when.md) the entire content of a document is needed, for example, when retrieving a document from the `KBStore` to be used in an [LLM](../concepts/llm.md) prompt. It is distinct from the more lightweight `DocumentMeta` type, which omits the `body` to conserve memory when only metadata is required for operations like indexing or listing documents [Source 1].

## Signature

`CompiledDocument` is a TypeScript `type` alias with the following structure [Source 1]:

```typescript
export type CompiledDocument = {
  /** Unique document identifier (e.g. "concepts/attention-mechanism") */
  docId: string;

  /** Canonical article title */
  title: string;

  /** Entity type from ontology */
  entityType: string;

  /** Full markdown body (without frontmatter) */
  body: string;

  /** Whether this is a stub article */
  isStub: boolean;

  /** Word count of the body */
  wordCount: number;

  /** Estimated token count */
  tokenEstimate: number;

  /** Raw frontmatter key-value pairs */
  frontmatter: Record<string, unknown>;
};
```

## Examples

The following example shows a sample object conforming to the `CompiledDocument` type.

```typescript
import type { CompiledDocument } from 'yaaf';

const agentDocument: CompiledDocument = {
  docId: 'concepts/agent',
  title: 'Agent',
  entityType: 'concept',
  body: 'An agent is an autonomous entity that perceives its environment...',
  isStub: false,
  wordCount: 152,
  tokenEstimate: 200,
  frontmatter: {
    title: 'Agent',
    entity_type: 'concept',
    summary: 'An autonomous entity that perceives and acts in an environment.',
    search_terms: ['what is an agent', 'autonomous systems']
  }
};
```

## See Also

*   `KBStore`: The runtime class that loads and provides access to `CompiledDocument` objects.
*   `DocumentMeta`: A lightweight version of this type that excludes the `body` for memory efficiency.

## Sources

[Source 1]: src/knowledge/store/store.ts