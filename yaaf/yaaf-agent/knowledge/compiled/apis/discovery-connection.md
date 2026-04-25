---
title: DiscoveryConnection
entity_type: api
summary: A data structure representing a suggested link between two existing articles in the knowledge base, identified by the discovery process.
export_name: DiscoveryConnection
source_file: src/knowledge/compiler/discovery.ts
category: type
search_terms:
 - knowledge base analysis
 - find missing links
 - weak connections between articles
 - identify cross-reference gaps
 - knowledge graph linter
 - discoverGaps result type
 - how to improve article linking
 - KB structural analysis
 - content gap discovery
 - linking suggestions
 - article relationship discovery
 - fromDocId
 - toDocId
stub: false
compiled_at: 2026-04-24T17:02:20.739Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/discovery.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `[[Discovery]]Connection` type is a data structure that represents a "weak connection" found during the [Knowledge Base Discovery](../subsystems/knowledge-base-discovery.md) process. This process uses an [LLM](../concepts/llm.md) to analyze the entire knowledge base and identify structural gaps [Source 1].

A `DiscoveryConnection` object is a specific suggestion that two existing articles should cross-reference each other, but currently do not. It includes the document IDs of the source and target articles and a text-based reason explaining why the connection is recommended. These objects are returned within the `weakConnections` array of the `DiscoveryResult` object produced by the `discoverGaps` function [Source 1].

## Signature

`DiscoveryConnection` is a TypeScript type with the following structure [Source 1]:

```typescript
export type DiscoveryConnection = {
  /** Source article docId */
  fromDocId: string;
  /** Target article docId */
  toDocId: string;
  /** Why these should be connected */
  reason: string;
};
```

### Properties

| Property    | Type     | Description                                     |
|-------------|----------|-------------------------------------------------|
| `fromDocId` | `string` | The document ID of the source article.          |
| `toDocId`   | `string` | The document ID of the target article.          |
| `reason`    | `string` | An LLM-generated explanation for the connection. |

## Examples

The primary way to obtain `DiscoveryConnection` objects is by calling the `discoverGaps` function and accessing the `weakConnections` property of the result. The following example shows how to iterate over these suggestions and print them [Source 1].

```typescript
import { discoverGaps, DiscoveryConnection, LLMCallFn } from 'yaaf';
import type { ConceptRegistry, KBOntology } from 'yaaf';

// Assume llm, compiledDir, registry, and ontology are configured
declare const llm: LLMCallFn;
declare const compiledDir: string;
declare const registry: ConceptRegistry;
declare const ontology: KBOntology;

async function findWeakLinks() {
  const result = await discoverGaps(llm, compiledDir, registry, ontology);

  console.log('Found weak connections that should be linked:');
  for (const connection of result.weakConnections) {
    console.log(
      `- Connect '${connection.fromDocId}' and '${connection.toDocId}'. Reason: ${connection.reason}`
    );
  }
}

findWeakLinks();
```

## See Also

- `discoverGaps`: The function that performs the knowledge base analysis and returns `DiscoveryResult`.
- `DiscoveryResult`: The main result object from the [Discovery](../concepts/discovery.md) process, which contains the `weakConnections` array of `DiscoveryConnection` objects.

## Sources

[Source 1]: src/knowledge/compiler/discovery.ts