---
summary: Scans a compiled directory to build the in-memory concept registry.
export_name: buildConceptRegistry
source_file: src/knowledge/ontology/registry.ts
category: function
title: buildConceptRegistry
entity_type: api
search_terms:
 - create concept index
 - scan compiled articles
 - load knowledge base
 - initialize KB registry
 - parse frontmatter from files
 - build in-memory KB index
 - how to populate the concept registry
 - knowledge base startup process
 - read all markdown files
 - validate entity types from ontology
 - registry construction
 - knowledge base indexing
stub: false
compiled_at: 2026-04-24T16:53:02.185Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/registry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `buildConceptRegistry` function recursively scans a directory of compiled knowledge base articles to build the `ConceptRegistry`, an in-[Memory](../concepts/memory.md) index of every known entity [Source 1]. This function is typically called at application startup to create a live representation of the knowledge base's "known universe" [Source 1].

The registry created by this function is critical for several other YAAF subsystems [Source 1]:
- The [Concept Extractor](../subsystems/concept-extractor.md) uses it to identify entities that already have articles.
- The [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md) checks it to avoid creating duplicate articles.
- The [Backlink Resolver](../subsystems/backlink-resolver.md) uses it to resolve `wikilinks` to their corresponding document IDs.
- The [Linter](../concepts/linter.md) relies on it to detect orphaned or missing articles.

`buildConceptRegistry` expects each `.md` file within the target directory to contain a YAML [Frontmatter](../concepts/frontmatter.md) block. For a file to be included in the registry, its frontmatter must have at least a `title` (the canonical article title) and an `entity_type`. The `entity_type` must correspond to a valid type defined in the provided `KB[[Ontology]]`. Files that are missing these required fields are skipped, and a warning is issued [Source 1].

## Signature

```typescript
export async function buildConceptRegistry(
  compiledDir: string,
  Ontology: KBOntology,
): Promise<{
  registry: ConceptRegistry;
  issues: ScanIssue[]; // Type inferred from context
}>
```

### Parameters

- **`compiledDir`** `string`: The absolute path to the `compiled/` directory containing the markdown knowledge base articles to be scanned [Source 1].
- **`[[Ontology]]`** `KBOntology`: The loaded [Knowledge Base Ontology](../subsystems/knowledge-base-ontology.md), which is used to validate the `entity_type` found in each article's frontmatter [Source 1].

### Returns

`Promise<{ registry: ConceptRegistry; issues: ScanIssue[] }>`

A promise that resolves to an object containing:
- `registry`: The populated `ConceptRegistry` object.
- `issues`: An array of any issues or warnings encountered during the scan, such as files with missing frontmatter.

## Examples

The following example demonstrates how to use `buildConceptRegistry` to scan a directory and initialize the [Concept Registry](../subsystems/concept-registry.md).

```typescript
import { buildConceptRegistry } from 'yaaf';
import { loadOntology } from './[[Ontology]]-loader'; // A hypothetical [[Ontology]] loader
import path from 'path';

// Assume an ontology has been loaded
const ontology = await loadOntology('./kb/ontology.json');

// Define the path to the compiled knowledge base articles
const compiledKbPath = path.resolve('./kb/compiled');

async function initializeRegistry() {
  try {
    const { registry, issues } = await buildConceptRegistry(compiledKbPath, ontology);

    console.log(`Registry built with ${Object.keys(registry).length} entries.`);

    if (issues.length > 0) {
      console.warn('Issues found during scan:');
      issues.forEach(issue => console.warn(`- ${issue.message}`));
    }

    // The registry can now be used by other parts of the application
    // for lookups, validation, etc.

  } catch (error) {
    console.error('Failed to build concept registry:', error);
  }
}

initializeRegistry();
```

## See Also

The `buildConceptRegistry` function is the primary way to create the `ConceptRegistry`. The following related functions from the same module are used to interact with the registry after it has been created [Source 1]:

- `findByWikilink`: Finds a registry entry by its title or alias.
- `findByEntityType`: Finds all entries of a specific type.
- `upsertRegistryEntry`: Adds or updates a single entry.
- `removeRegistryEntry`: Removes an entry.
- `serializeRegistry`: Converts the registry to a JSON string for caching.
- `deserializeRegistry`: Rehydrates a registry from a JSON string.

## Sources

[Source 1]: src/knowledge/ontology/registry.ts