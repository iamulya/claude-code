---
title: Concept Registry
entity_type: subsystem
summary: A live, in-memory index of every entity that has a compiled KB article, serving as the framework's 'known universe' for compilation and linking.
primary_files:
  - src/knowledge/ontology/registry.ts
exports:
  - buildConceptRegistry
  - findByWikilink
  - findByEntityType
  - upsertRegistryEntry
  - removeRegistryEntry
  - serializeRegistry
  - deserializeRegistry
stub: false
compiled_at: 2026-04-16T14:28:36.737Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/registry.ts
confidence: 1
---

## Purpose
The Concept Registry serves as the central authority for all known entities within the YAAF knowledge base. It maintains a live, in-memory index of every entity that possesses a compiled article, effectively defining the "known universe" for the framework's compilation pipeline.

The subsystem solves several critical architectural challenges:
*   **Entity Discovery:** Allows the Concept Extractor to determine which entities already have existing documentation.
*   **Duplicate Prevention:** Enables the Knowledge Synthesizer to avoid creating redundant articles for the same concept.
*   **Link Resolution:** Provides the necessary mapping for the Backlink Resolver to transform `[[wikilinks]]` into valid document identifiers (`docIds`).
*   **Validation:** Supports the Linter in detecting orphaned articles or references to missing content.

## Architecture
The registry is constructed by recursively scanning the `compiled/` directory at startup. It expects each Markdown file to contain YAML frontmatter defining at least a canonical `title` and an `entity_type`.

### Internal Components
*   **Registry Entries:** Each entry in the registry (`ConceptRegistryEntry`) represents a single compiled article, tracking its location, title, type, and aliases.
*   **Alias Index:** A reverse lookup map (lowercase alias to `docId`) used for high-performance link resolution.
*   **Persistence Layer:** To optimize startup times, the registry can be serialized into a compact JSON file (`.kb-registry.json`) located in the KB root, preventing the need for a full file system rescan on every execution.

## Integration Points
The Concept Registry interacts with several other components in the knowledge pipeline:
*   **Ontology System:** Uses the loaded `KBOntology` to validate that entity types found in Markdown frontmatter are valid.
*   **Compiler Pipeline:** The registry is updated via `upsertRegistryEntry` after every successful compilation run to ensure the in-memory state remains synchronized with the file system.
*   **Backlink Resolver:** Utilizes the registry's lookup functions to map human-readable wikilink targets to internal document paths.

## Key APIs

### buildConceptRegistry
Scans a directory and populates the registry. It validates entity types against the provided ontology and reports issues found during the scan.
```typescript
export async function buildConceptRegistry(
  compiledDir: string,
  ontology: KBOntology,
): Promise<{ registry: ConceptRegistry; issues: RegistryIssue[] }>
```

### findByWikilink
Resolves a string target to a registry entry using a three-tier priority system:
1.  Exact `docId` match (e.g., `concepts/attention-mechanism`).
2.  Canonical title match (case-insensitive).
3.  Alias match (case-insensitive).
```typescript
export function findByWikilink(
  target: string,
  registry: ConceptRegistry,
): ConceptRegistryEntry | undefined
```

### upsertRegistryEntry
Adds or updates an entry in the registry. This is typically called after a compilation run to keep the registry current without requiring a full rescan.
```typescript
export function upsertRegistryEntry(
  registry: ConceptRegistry,
  entry: ConceptRegistryEntry,
): void
```

### serializeRegistry / deserializeRegistry
Handles the conversion of the registry to and from JSON for caching purposes.
```typescript
export function serializeRegistry(registry: ConceptRegistry): string
export function deserializeRegistry(json: string): ConceptRegistry
```

## Configuration
The registry is primarily configured through the initialization of the knowledge base, requiring:
*   An absolute path to the `compiled/` directory.
*   A loaded `KBOntology` instance for type validation.

## Extension Points
While the registry's core logic is fixed, its behavior is influenced by:
*   **Vocabulary/Aliases:** The registry uses `buildAliasIndex` to incorporate synonyms and alternative titles defined in article frontmatter, extending the reach of the `findByWikilink` resolution logic.
*   **Ontology Definitions:** By modifying the `KBOntology`, developers change the validation rules for what constitutes a valid `entity_type` within the registry.