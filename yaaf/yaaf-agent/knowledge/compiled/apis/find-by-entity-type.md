---
summary: Retrieves all concept registry entries of a specified entity type.
export_name: findByEntityType
source_file: src/knowledge/ontology/registry.ts
category: function
title: findByEntityType
entity_type: api
search_terms:
 - find concepts by type
 - get all plugins from registry
 - list all API articles
 - filter concept registry
 - query knowledge base by entity type
 - concept registry search
 - ontology entity lookup
 - retrieve articles of a certain kind
 - group concepts by type
 - knowledge base filtering
 - registry query
 - get entries by category
stub: false
compiled_at: 2026-04-24T17:06:41.764Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/registry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `findByEntityType` function is a utility for querying the in-[Memory](../concepts/memory.md) [Concept Registry](../subsystems/concept-registry.md). It filters the registry to find and return all entries that match a specific [Entity Type](../concepts/entity-type.md), such as `api`, `plugin`, or `concept` [Source 1].

This function is typically used [when](./when.md) an operation needs to act on a subset of knowledge base articles based on their kind. For example, it could be used to generate a list of all available plugins or to perform validation on all API documentation articles. It provides a direct way to access categorized groups of concepts within the framework's "known universe" of compiled documentation [Source 1].

## Signature

The function takes an entity type string and a `ConceptRegistry` instance, and returns an array of matching entries [Source 1].

```typescript
export function findByEntityType(
  entityType: string,
  registry: ConceptRegistry,
): ConceptRegistryEntry[];
```

**Parameters:**

*   `entityType: string`: The entity type to search for (e.g., `"plugin"`, `"api"`). This value is matched against the `entity_type` field in each registry entry's [Frontmatter](../concepts/frontmatter.md).
*   `registry: ConceptRegistry`: The `ConceptRegistry` instance to search within.

**Returns:**

*   `ConceptRegistryEntry[]`: An array containing all `ConceptRegistryEntry` objects that match the specified `entityType`. If no entries match, an empty array is returned.

## Examples

The following example demonstrates how to use `findByEntityType` to retrieve all entries of the `plugin` type from a sample concept registry.

```typescript
import { findByEntityType } from 'yaaf';
import type { ConceptRegistry, ConceptRegistryEntry } from 'yaaf';

// Assume a ConceptRegistry has been built or deserialized.
// For demonstration, we create a mock registry.
const mockRegistry: ConceptRegistry = {
  entries: new Map<string, ConceptRegistryEntry>([
    ['api/Agent', {
      docId: 'api/Agent',
      title: 'Agent',
      entity_type: 'api',
      sourcePath: 'src/agent.ts',
      aliases: [],
    }],
    ['plugin/Calculator', {
      docId: 'plugin/Calculator',
      title: 'Calculator Plugin',
      entity_type: 'plugin',
      sourcePath: 'src/plugins/calculator.ts',
      aliases: ['math tool'],
    }],
    ['concept/AgentLoop', {
      docId: 'concept/AgentLoop',
      title: 'Agent Loop',
      entity_type: 'concept',
      sourcePath: 'docs/concepts/agent-loop.md',
      aliases: [],
    }],
    ['plugin/WebSearch', {
      docId: 'plugin/WebSearch',
      title: 'Web Search Plugin',
      entity_type: 'plugin',
      sourcePath: 'src/plugins/web-search.ts',
      aliases: ['search tool', 'google'],
    }],
  ]),
  // Other registry properties would be here
};

// Find all entries with the entity type 'plugin'
const pluginEntries = findByEntityType('plugin', mockRegistry);

console.log(pluginEntries);
/*
[
  {
    docId: 'plugin/Calculator',
    title: 'Calculator Plugin',
    entity_type: 'plugin',
    sourcePath: 'src/plugins/calculator.ts',
    aliases: [ 'math tool' ]
  },
  {
    docId: 'plugin/WebSearch',
    title: 'Web Search Plugin',
    entity_type: 'plugin',
    sourcePath: 'src/plugins/web-search.ts',
    aliases: [ 'search tool', 'google' ]
  }
]
*/

// Searching for a type with no entries returns an empty array
const guideEntries = findByEntityType('guide', mockRegistry);
console.log(guideEntries); // []
```

## See Also

*   `buildConceptRegistry`: The function used to create the `ConceptRegistry` from source files.
*   `findByWikilink`: Another function for querying the registry, used for resolving [Wikilinks](../concepts/wikilinks.md).
*   `ConceptRegistry` (type): The main data structure representing the in-memory knowledge base index.
*   `ConceptRegistryEntry` (type): The data structure for a single entry within the registry.

## Sources

[Source 1]: src/knowledge/[Ontology](../concepts/ontology.md)/registry.ts