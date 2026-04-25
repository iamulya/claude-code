---
summary: The result object returned by the ontology proposal generation process, including generated and applied proposals.
export_name: ProposalResult
source_file: src/knowledge/compiler/ontologyProposals.ts
category: type
title: ProposalResult
entity_type: api
search_terms:
 - ontology evolution results
 - auto-evolve output
 - ontology suggestions
 - knowledge base compilation feedback
 - generateOntologyProposals return type
 - applied ontology changes
 - list of generated proposals
 - proposals file path
 - ontology feedback loop
 - KB compilation analysis
 - what does generateOntologyProposals return
stub: false
compiled_at: 2026-04-24T17:30:56.402Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ontologyProposals.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ProposalResult` type defines the structure of the object returned by the `generate[[[[[[[[Ontology]]]]]]]]Proposals` function. This object encapsulates the complete outcome of the Ontology analysis and proposal generation process, which is a key part of the framework's "[Ontology Feedback Loop](../concepts/ontology-feedback-loop.md) (O7)" [Source 1].

It contains a list of all generated `OntologyProposal` suggestions, a list of proposals that were automatically applied to the [Knowledge Base Ontology](../subsystems/knowledge-base-ontology.md), and the file path where all generated proposals were saved for human review [Source 1].

## Signature

`ProposalResult` is a TypeScript type alias with the following structure:

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

### Properties

- **`proposals: OntologyProposal[]`**
  An array of all `OntologyProposal` objects generated during the analysis. This includes suggestions for new entity types, [Vocabulary](../concepts/vocabulary.md) entries, relationships, and fields [Source 1].

- **`applied: OntologyProposal[]`**
  A subset of the `proposals` array containing only those proposals that were automatically applied to the ontology. This array will be empty unless the `autoEvolve` option was set to `true` [when](./when.md) calling `generateOntologyProposals` [Source 1].

- **`proposalsPath: string`**
  The file system path where the full list of generated proposals was written, typically `.kb-ontology-proposals.json` [Source 1].

## Examples

The following example demonstrates how to use the `generateOntologyProposals` function and process the resulting `ProposalResult` object.

```typescript
import {
  generateOntologyProposals,
  ProposalResult,
} from 'yaaf';
import { myOntology, myConceptRegistry } from './my-kb';

async function analyzeAndLogProposals() {
  const kbDirectory = './my-knowledge-base';

  // Generate proposals, allowing high-confidence ones to be auto-applied
  const result: ProposalResult = await generateOntologyProposals(
    kbDirectory,
    myOntology,
    myConceptRegistry,
    { autoEvolve: true }
  );

  console.log(`Generated ${result.proposals.length} ontology proposals.`);
  console.log(`Proposals written to: ${result.proposalsPath}`);

  if (result.applied.length > 0) {
    console.log(`Automatically applied ${result.applied.length} proposals:`);
    for (const proposal of result.applied) {
      console.log(`- [${proposal.kind}] ${proposal.reason}`);
    }
  } else {
    console.log('No proposals were auto-applied. Please review the proposals file.');
  }
}

analyzeAndLogProposals();
```

## See Also

- `generateOntologyProposals`: The function that returns a `ProposalResult`.
- `OntologyProposal`: The type for an individual suggestion contained within the `proposals` and `applied` arrays.

## Sources

[Source 1]: src/knowledge/compiler/ontologyProposals.ts