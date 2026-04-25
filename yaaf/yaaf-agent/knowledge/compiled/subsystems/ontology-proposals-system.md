---
summary: A subsystem responsible for analyzing compiled knowledge base state and generating suggestions for ontology evolution.
primary_files:
 - src/knowledge/compiler/ontologyProposals.ts
title: Ontology Proposals System
entity_type: subsystem
exports:
 - generateOntologyProposals
 - loadProposals
 - OntologyProposal
 - ProposalGeneratorOptions
 - ProposalResult
search_terms:
 - ontology evolution
 - knowledge base schema suggestions
 - automatic ontology improvement
 - how to update KB schema
 - suggesting new entity types
 - vocabulary expansion
 - finding new relationships
 - discovering new frontmatter fields
 - .kb-ontology-proposals.json
 - "--auto-evolve flag"
 - ontology feedback loop
 - knowledge base maintenance
 - schema drift detection
stub: false
compiled_at: 2026-04-24T18:17:17.535Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ontologyProposals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The [Ontology](../concepts/ontology.md) Proposals System is a component of the [Knowledge Base Compiler](./knowledge-base-compiler.md) that provides a feedback loop for ontology evolution [Source 1]. After each compilation of the knowledge base, this subsystem analyzes the resulting state to identify patterns and suggest improvements to the underlying ontology. This helps maintain and evolve the knowledge base schema over time as new content is added [Source 1].

## Architecture

The system operates as a post-compilation analysis step. It takes the compiled `KBOntology` and `ConceptRegistry` as input and generates a list of `OntologyProposal` objects [Source 1].

The analysis focuses on four key areas for potential improvement [Source 1]:
1.  **New [Entity Type](../concepts/entity-type.md)s**: It identifies clusters of concepts that do not fit into any existing Entity Type, suggesting a new type might be needed.
2.  **New [Vocabulary](../concepts/vocabulary.md) Entries**: It detects terms that appear frequently across articles but are not yet part of the official vocabulary.
3.  **New Relationships**: It discovers potential new relationships by analyzing cross-type links found in [Wikilinks](../concepts/wikilinks.md) between articles.
4.  **New Fields**: It finds [Frontmatter](../concepts/frontmatter.md) fields that are used in articles but are not defined in the official ontology schema for that entity type.

Each proposal is assigned a `confidence` score between 0 and 1 and includes a `reason` explaining the suggestion [Source 1]. The generated proposals are written to a file named `.kb-ontology-proposals.json` in the knowledge base directory for human review [Source 1].

A security measure is in place [when](../apis/when.md) loading proposals from this file. The `loadProposals` function validates the structure of each proposal, silently dropping any that are malformed, have invalid confidence scores, unknown kinds, or contain potentially harmful keys (e.g., for prototype pollution) [Source 1].

## Integration Points

The Ontology Proposals System is tightly integrated with the knowledge base compilation process. It is invoked after the main compilation stages are complete, using the final `KBOntology` and `ConceptRegistry` as its primary inputs [Source 1].

The output of this system, the `.kb-ontology-proposals.json` file, serves as an integration point for human knowledge curators. It can also be used for automated evolution; if the `autoEvolve` option is enabled, high-confidence proposals can be automatically applied back to the ontology in a subsequent compilation run [Source 1].

## Key APIs

### `generateOntologyProposals()`

This is the main function of the subsystem. It takes the knowledge base directory, the current ontology, the [Concept Registry](./concept-registry.md), and configuration options as arguments. It performs the analysis and returns a `ProposalResult` object containing the list of generated proposals, a list of any proposals that were auto-applied, and the path to the output file [Source 1].

### `loadProposals()`

This function reads and parses the `.kb-ontology-proposals.json` file from disk. It performs validation on each proposal before returning an array of valid `OntologyProposal` objects [Source 1].

### `OntologyProposal`

A type that defines the structure for a single ontology suggestion. Key fields include [Source 1]:
*   `kind`: The type of proposal (`add_entity_type`, `add_vocabulary`, `add_relationship`, `add_field`).
*   `confidence`: A number from 0 to 1 indicating the system's confidence in the suggestion.
*   `reason`: A human-readable string explaining why the proposal was generated.
*   Additional fields (`entityType`, `term`, `from`, `to`, `details`) provide specific data for the proposal kind.

## Configuration

The behavior of the proposal generation can be configured via the `ProposalGeneratorOptions` object passed to `generateOntologyProposals` [Source 1].

*   `minConceptsForNewType`: The minimum number of unclassified concept occurrences required to suggest a new entity type. Defaults to 3.
*   `minMentionsForVocab`: The minimum number of times a term must be mentioned to be suggested for the vocabulary. Defaults to 2.
*   `autoEvolve`: A boolean that, when `true`, allows the system to automatically apply high-confidence proposals. This can also be controlled via a command-line flag, `--auto-evolve`. Defaults to `false`.

## Sources

[Source 1]: src/knowledge/compiler/ontologyProposals.ts