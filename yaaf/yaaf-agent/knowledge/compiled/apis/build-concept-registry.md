---
title: buildConceptRegistry
entity_type: api
summary: Scans a compiled directory recursively to build the concept registry from Markdown frontmatter.
export_name: buildConceptRegistry
source_file: src/knowledge/ontology/registry.ts
category: function
stub: false
compiled_at: 2026-04-16T14:28:37.403Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/registry.ts
confidence: 1
---

## Overview
`buildConceptRegistry` is a core utility in the YAAF knowledge subsystem used to generate a live, in-memory index of all entities that have compiled articles. It serves as the "known universe" for the framework's compiler operations.

The registry created by this function is essential for several framework processes:
- **Concept Extraction**: Identifying which entities already possess existing articles.
- **Knowledge Synthesis**: Preventing the creation of duplicate articles.
- **Backlink Resolution**: Mapping `[[wikilinks]]` to specific document IDs.
- **Linting**: Detecting orphaned or missing articles within the knowledge base.

The function operates by recursively scanning a target directory for `.md` files and parsing their YAML frontmatter.

## Signature
```typescript
export async function buildConceptRegistry(
  compiledDir: string,
  ontology: KBOntology,
): Promise<{
  registry: ConceptRegistry;
  issues: any[];
}>
```

### Parameters
- `compiledDir`: The absolute path to the directory containing compiled Markdown articles.
- `ontology`: A loaded `KBOntology` object used to validate that the `entity_type` defined in an article's frontmatter is valid.

### Requirements
For a file to be successfully indexed, it must:
1. Have a `.md` extension.
2. Contain YAML frontmatter with a `title` field (the canonical article title).
3. Contain YAML frontmatter with an `entity_type` field that matches a type defined in the provided ontology.

Files missing these fields are skipped, and a warning is generated in the returned issues list.

## Examples

### Basic Usage
This example demonstrates how to initialize the registry by scanning a compiled knowledge base directory.

```typescript
import { buildConceptRegistry } from 'yaaf/knowledge';
import { loadOntology } from 'yaaf/ontology';

const ontology = await loadOntology('./schema/ontology.yaml');
const compiledPath = '/path/to/project/knowledge/compiled';

const { registry, issues } = await buildConceptRegistry(
  compiledPath,
  ontology
);

if (issues.length > 0) {
  console.warn('Registry built with issues:', issues);
}

console.log(`Indexed ${Object.keys(registry).length} concepts.`);
```

## See Also
- `findByWikilink`: A utility to query the registry produced by this function.
- `upsertRegistryEntry`: Used to update the registry in-memory after a compilation run.
- `serializeRegistry`: Used to cache the registry to disk to avoid full rescans on startup.