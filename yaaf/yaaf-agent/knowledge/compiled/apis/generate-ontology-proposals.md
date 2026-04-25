---
summary: Analyzes the compiled knowledge base state and generates suggestions for ontology evolution.
export_name: generateOntologyProposals
source_file: src/knowledge/compiler/ontologyProposals.ts
category: function
title: generateOntologyProposals
entity_type: api
search_terms:
 - ontology evolution
 - suggest new entity types
 - knowledge base schema suggestions
 - auto-evolve ontology
 - ontology feedback loop
 - propose vocabulary additions
 - discover new relationships
 - find missing frontmatter fields
 - how to update ontology automatically
 - ontology proposal generation
 - KB schema maintenance
 - .kb-ontology-proposals.json
 - O7 process
stub: false
compiled_at: 2026-04-24T17:08:37.328Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ontologyProposals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `generate[[Ontology]]Proposals` function is a key component of the YAAF knowledge base compilation process, specifically serving the "[Ontology Feedback Loop](../concepts/ontology-feedback-loop.md) (O7)" [Source 1]. After each compilation, this function analyzes the current state of the knowledge base, including extracted concepts and compiled articles, to generate suggestions for improving the underlying [Ontology](../concepts/ontology.md).

It produces four main types of suggestions, encapsulated as `OntologyProposal` objects [Source 1]:
1.  **New [Entity Type](../concepts/entity-type.md)s**: Suggested [when](./when.md) a significant number of concepts do not fit into any existing Entity Type.
2.  **New [Vocabulary](../concepts/vocabulary.md) entries**: Suggested for terms that appear frequently throughout the knowledge base but are not yet part of the formal vocabulary.
3.  **New relationships**: Inferred from [Wikilinks](../concepts/wikilinks.md) that connect different entity types.
4.  **New fields**: Suggested when [Frontmatter](../concepts/frontmatter.md) fields are used in articles but are not defined in the ontology's schema.

The generated proposals are written to a file named `.kb-ontology-proposals.json` in the knowledge base directory for human review. For high-confidence proposals, they can be applied automatically by setting the `autoEvolve` option to `true` or by using the `--auto-evolve` command-line flag during compilation [Source 1].

## Signature

The function takes the knowledge base directory, the current ontology, and the [Concept Registry](../subsystems/concept-registry.md) as input, and returns a promise that resolves to a `ProposalResult` object.

```typescript
import type { [[[[[[[[KBOntology]]]]]]]] } from "../ontology/types.js";
import type { ConceptRegistry } from "../ontology/index.js";

export async function generateOntologyProposals(
  kbDir: string,
  ontology: KBOntology,
  registry: ConceptRegistry,
  options?: [[[[[[[[ProposalGeneratorOptions]]]]]]]]
): Promise<ProposalResult>;
```

### Parameters

*   `kbDir` (string): The path to the root directory of the knowledge base.
*   `ontology` (KBOntology): The currently loaded ontology object.
*   `registry` (ConceptRegistry): The concept registry built during the compilation process.
*   `options` (ProposalGeneratorOptions, optional): Configuration options for the proposal generation process.

### Configuration (`ProposalGeneratorOptions`)

The optional `options` object allows for customizing the proposal generation logic [Source 1].

```typescript
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

### Return Value (`ProposalResult`)

The function returns a `ProposalResult` object containing the outcome of the operation [Source 1].

```typescript
export type ProposalResult = {
  /** Generated proposals */
  proposals: OntologyProposal[];
  /** Proposals that were auto-applied (if autoEvolve=true) */
  applied: OntologyProposal[];
  /** Path where proposals were written */
  proposalsPath: string;
};
```

### Related Types (`OntologyProposal`)

Each proposal is represented by an `OntologyProposal` object, which details the suggested change [Source 1].

```typescript
export type OntologyProposal = {
  kind: "add_entity_type" | "add_vocabulary" | "add_relationship" | "add_field";
  confidence: number; // 0–1
  reason: string;
  /** For add_entity_type */
  entityType?: string;
  /** For add_vocabulary */
  term?: string;
  /** For add_relationship */
  from?: string;
  to?: string;
  /** Extra structured data */
  details?: Record<string, unknown>;
};
```

## Examples

The following example demonstrates how to invoke `generateOntologyProposals` after compiling a knowledge base.

```typescript
import { generateOntologyProposals } from 'yaaf';
// These are illustrative imports for a typical KB compilation flow
import { loadOntology, createConceptRegistry, compileKnowledgeBase } from 'yaaf/knowledge';

async function runOntologyEvolution() {
  const kbDir = './my-knowledge-base';

  // 1. Assume the KB has been compiled and we have the necessary artifacts
  const ontology = await loadOntology(kbDir);
  const registry = await createConceptRegistry(kbDir, ontology); // Simplified for example

  // 2. Generate ontology proposals
  const result = await generateOntologyProposals(kbDir, ontology, registry, {
    minConceptsForNewType: 5,
    minMentionsForVocab: 3,
    autoEvolve: false, // Manually review proposals
  });

  console.log(`Generated ${result.proposals.length} proposals.`);
  console.log(`Proposals written to: ${result.proposalsPath}`);

  if (result.proposals.length > 0) {
    console.log('Review the proposals and consider updating your ontology.');
  }
}

runOntologyEvolution();
```

## See Also

*   `loadProposals`: A related function for loading and validating previously generated proposals from the `.kb-ontology-proposals.json` file [Source 1].

## Sources

*   [Source 1]: `src/knowledge/compiler/ontologyProposals.ts`