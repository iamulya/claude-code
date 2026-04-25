---
summary: A process within YAAF's knowledge system where compiled articles and extracted concepts are analyzed to suggest improvements and evolutions to the knowledge base ontology.
title: Ontology Feedback Loop
entity_type: concept
related_subsystems:
 - knowledge
search_terms:
 - ontology evolution
 - knowledge base schema suggestions
 - auto-evolve ontology
 - how to improve KB schema
 - ontology proposals
 - O7 process
 - suggest new entity types
 - suggest new vocabulary
 - suggest new relationships
 - suggest new frontmatter fields
 - knowledge base maintenance
 - schema drift detection
stub: false
compiled_at: 2026-04-24T17:59:43.519Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ontologyProposals.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The [Ontology](./ontology.md) Feedback Loop is a process within the YAAF knowledge subsystem that automates the evolution of the knowledge base's ontology (its schema) [Source 1]. After each compilation of the knowledge base, this process analyzes the newly compiled articles and extracted concepts to identify patterns and discrepancies. Based on this analysis, it generates formal proposals for improving the ontology, such as adding new Entity Types, [Vocabulary](./vocabulary.md) terms, or relationships. This mechanism allows the knowledge base schema to adapt and grow organically as new information is added, rather than requiring manual, top-down schema design [Source 1].

## How It Works in YAAF

The feedback loop is implemented in the `knowledge/compiler/ontologyProposals` module and is triggered after the main knowledge compilation step [Source 1]. The primary function, `generateOntologyProposals`, takes the current ontology and the compiled [Concept Registry](../subsystems/concept-registry.md) as input to produce a set of suggestions [Source 1].

The analysis generates four main kinds of `OntologyProposal` objects:

1.  **New Entity Types (`add_entity_type`)**: Proposed [when](../apis/when.md) a significant number of concepts do not fit into any of the existing Entity Types defined in the ontology [Source 1].
2.  **New Vocabulary Entries (`add_vocabulary`)**: Proposed when specific terms appear frequently across articles but are not yet part of the official knowledge base vocabulary [Source 1].
3.  **New Relationships (`add_relationship`)**: Proposed when analysis of [Wikilinks](./wikilinks.md) reveals consistent, recurring links between different [Entity Type](./entity-type.md)s that are not yet formally defined as a relationship in the ontology [Source 1].
4.  **New Fields (`add_field`)**: Proposed when [Frontmatter](./frontmatter.md) fields are consistently used in articles but are not defined in the official schema for that entity type [Source 1].

Each proposal includes a `kind`, a `confidence` score between 0 and 1, and a human-readable `reason` for the suggestion [Source 1].

By default, these proposals are written to a `.kb-ontology-proposals.json` file in the knowledge base directory for a human developer to review and apply [Source 1]. However, if the `autoEvolve` option is enabled, proposals with high confidence scores can be applied to the ontology automatically [Source 1].

To ensure security, especially when auto-applying changes, the `loadProposals` function validates each proposal read from the file. It silently discards any malformed, tampered, or potentially malicious proposals (e.g., those with invalid confidence scores or unknown kinds) to prevent them from being applied to the ontology [Source 1].

## Configuration

The behavior of the proposal generation process can be configured via the `ProposalGeneratorOptions` object passed to the `generateOntologyProposals` function.

```typescript
// Example configuration for ontology proposal generation
export type ProposalGeneratorOptions = {
  /**
   * Minimum number of concept occurrences to suggest a new entity type.
   * Default: 3
   */
  minConceptsForNewType?: number;

  /**
   * Minimum number of mentions for a term to suggest adding it to vocabulary.
   * Default: 2
   */
  minMentionsForVocab?: number;

  /**
   * Whether to auto-apply high-confidence proposals.
   * Default: false (write proposals file only)
   */
  autoEvolve?: boolean;
};
```
[Source 1]

Key configuration parameters include:
*   `minConceptsForNewType`: Sets the threshold for how many unclassified concepts must exist before suggesting a new entity type. The default is 3 [Source 1].
*   `minMentionsForVocab`: Defines the minimum frequency for a term to be suggested for the vocabulary. The default is 2 [Source 1].
*   `autoEvolve`: A boolean flag that, when `true`, enables the automatic application of high-confidence proposals. The default is `false` [Source 1].

## Sources
[Source 1]: `src/knowledge/compiler/ontologyProposals.ts`