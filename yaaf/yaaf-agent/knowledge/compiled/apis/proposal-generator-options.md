---
summary: Configuration options for the ontology proposal generation process, including thresholds for suggesting new entities or vocabulary.
export_name: ProposalGeneratorOptions
source_file: src/knowledge/compiler/ontologyProposals.ts
category: type
title: ProposalGeneratorOptions
entity_type: api
search_terms:
 - ontology evolution settings
 - configure ontology proposals
 - auto-evolve ontology
 - new entity type threshold
 - vocabulary suggestion frequency
 - how to auto-apply ontology changes
 - knowledge base compilation feedback
 - ontology feedback loop
 - O7 configuration
 - minConceptsForNewType
 - minMentionsForVocab
 - generateOntologyProposals options
stub: false
compiled_at: 2026-04-24T17:30:50.180Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ontologyProposals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`ProposalGeneratorOptions` is a TypeScript type that defines the configuration for the [Ontology](../concepts/ontology.md) proposal generation process in YAAF [Source 1]. It is used as an argument to the `generateOntologyProposals` function to control the sensitivity and behavior of the system that suggests improvements to the [Knowledge Base Ontology](../subsystems/knowledge-base-ontology.md).

This configuration is a key part of the "[Ontology Feedback Loop](../concepts/ontology-feedback-loop.md) (O7)", where the system analyzes the compiled knowledge base to suggest evolutionary changes, such as new Entity Types or [Vocabulary](../concepts/vocabulary.md) terms [Source 1]. By adjusting these options, developers can tune how aggressively the system proposes changes and whether high-confidence suggestions should be applied automatically.

## Signature

`ProposalGeneratorOptions` is a type alias for an object with the following optional properties [Source 1]:

```typescript
export type ProposalGeneratorOptions = {
  /**
   * Minimum number of concept occurrences to suggest a new Entity Type.
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

### Properties

- **`minConceptsForNewType`** `?number`
  - The minimum number of unclassified concept occurrences required before the system will propose a new [Entity Type](../concepts/entity-type.md) to categorize them.
  - The default value is `3`.

- **`minMentionsForVocab`** `?number`
  - The minimum number of times a term must be mentioned across the knowledge base before it is suggested for addition to the official vocabulary.
  - The default value is `2`.

- **`autoEvolve`** `?boolean`
  - If set to `true`, high-confidence proposals will be automatically applied to the ontology. If `false`, all proposals are written to a file for manual review (`.kb-ontology-proposals.json`).
  - The default value is `false`.

## Examples

### Basic Usage

The following example shows how to call `generateOntologyProposals` with custom options to make the proposal generation more sensitive and enable automatic application of changes.

```typescript
import { generateOntologyProposals, ProposalGeneratorOptions } from 'yaaf';
import type { KBOntology } from 'yaaf';
import type { ConceptRegistry } from 'yaaf';

// Assume kbDir, ontology, and registry are already defined
declare const kbDir: string;
declare const ontology: KBOntology;
declare const registry: ConceptRegistry;

// Configure proposal generation to be more aggressive
// and to automatically apply changes.
const options: ProposalGeneratorOptions = {
  minConceptsForNewType: 2, // Suggest a new type after only 2 concepts
  minMentionsForVocab: 1,   // Suggest new vocab after a single mention
  autoEvolve: true,         // Automatically apply high-confidence proposals
};

async function runProposalGeneration() {
  const result = await generateOntologyProposals(kbDir, ontology, registry, options);

  console.log(`Generated ${result.proposals.length} proposals.`);
  console.log(`Auto-applied ${result.applied.length} proposals.`);
  console.log(`Proposals written to: ${result.proposalsPath}`);
}

runProposalGeneration();
```

## See Also

- `generateOntologyProposals`: The function that consumes this options type to generate ontology suggestions.
- `OntologyProposal`: The type representing a single suggestion for improving the ontology.

## Sources

[Source 1]: src/knowledge/compiler/ontologyProposals.ts