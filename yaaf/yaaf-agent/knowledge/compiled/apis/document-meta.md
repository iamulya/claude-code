---
summary: Defines the lightweight metadata structure for a Knowledge Base document, excluding its body.
export_name: DocumentMeta
source_file: src/knowledge/store/store.ts
category: type
title: DocumentMeta
entity_type: api
search_terms:
 - knowledge base document metadata
 - document frontmatter
 - KB article properties
 - in-memory document representation
 - what is DocumentMeta
 - document id
 - token count estimate
 - article summary
 - KBStore memory model
 - lightweight document info
 - document stub status
 - entity type
stub: false
compiled_at: 2026-04-24T17:03:38.070Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `DocumentMeta` type defines the lightweight metadata structure for a single document within a YAAF Knowledge Base. It includes all essential information about a document *except* for its full body text [Source 1].

This type is a key component of the `KBStore`'s [Memory](../concepts/memory.md) optimization strategy. The `KBStore` loads and holds a `DocumentMeta` object in memory for every document in the Knowledge Base upon initialization. By excluding the full document body, this approach significantly reduces the steady-state memory footprint, allowing the system to manage large knowledge bases efficiently. The full document content is loaded from disk on-demand [when](./when.md) requested [Source 1].

## Signature

`DocumentMeta` is a TypeScript type alias with the following structure:

```typescript
export type DocumentMeta = {
  /** Unique document identifier (e.g. "concepts/attention-mechanism") */
  docId: string;

  /** Canonical article title */
  title: string;

  /** Entity type from [[[[[[[[Ontology]]]]]]]] */
  entityType: string;

  /** Whether this is a stub article */
  isStub: boolean;

  /** Word count of the body */
  wordCount: number;

  /** Estimated token count */
  tokenEstimate: number;

  /** Raw Frontmatter key-value pairs */
  Frontmatter: Record<string, unknown>;

  /** First sentence of the body — stored for index summaries */
  summary: string;
};
```
[Source 1]

### Fields

| Field         | Type                     | Description                                                                                             |
|---------------|--------------------------|---------------------------------------------------------------------------------------------------------|
| `docId`       | `string`                 | A unique identifier for the document, typically derived from its file path.                             |
| `title`       | `string`                 | The canonical title of the article, usually from the [Frontmatter](../concepts/frontmatter.md).                                       |
| `entityType`  | `string`                 | The document's type as defined in the project's Ontology (e.g., "concept", "api", "guide").             |
| `isStub`      | `boolean`                | A flag indicating if the document is a placeholder with minimal content.                                |
| `wordCount`   | `number`                 | The total number of words in the document's body.                                                       |
| `tokenEstimate`| `number`                | An estimate of the number of [LLM](../concepts/llm.md) tokens the document's body contains.                                   |
| `frontmatter` | `Record<string, unknown>`| An object containing all key-value pairs parsed from the document's YAML frontmatter block.             |
| `summary`     | `string`                 | The first sentence of the document's body, used for previews and search result summaries [Source 1].    |

## Examples

The following is an example of a `DocumentMeta` object for a hypothetical API documentation article.

```typescript
import type { DocumentMeta } from 'yaaf';

const agentMeta: DocumentMeta = {
  docId: 'api/Agent',
  title: 'Agent',
  entityType: 'api',
  isStub: false,
  wordCount: 850,
  tokenEstimate: 1100,
  frontmatter: {
    title: 'Agent',
    entity_type: 'api',
    summary: 'The core class for creating and running LLM-powered agents.',
    export_name: 'Agent',
    source_file: 'src/agent.ts',
    category: 'class'
  },
  summary: 'The Agent class is the central component of YAAF, responsible for orchestrating tools, memory, and LLM interactions to achieve a goal.'
};
```

## See Also

*   `KBStore`: The class that manages and provides access to `DocumentMeta` and `CompiledDocument` objects.
*   `CompiledDocument`: A related type that includes the full `body` of the document in addition to the metadata.

## Sources

[Source 1]: src/knowledge/store/store.ts