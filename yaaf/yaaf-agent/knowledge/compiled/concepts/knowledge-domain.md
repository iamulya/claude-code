---
title: Knowledge Domain
summary: The specific subject area or expertise that a YAAF agent operates within, defined by its ontology.
primary_files:
 - src/knowledge/ontology/generator.ts
 - src/knowledge/ontology/loader.js
entity_type: concept
related_subsystems:
 - knowledge
search_terms:
 - what is a knowledge domain
 - agent subject matter expertise
 - defining agent scope
 - ontology generation
 - domain description for LLM
 - how to describe agent's purpose
 - specialized agent knowledge
 - ontology bootstrap
 - project context for agent
 - subject area
 - agent expertise definition
 - scoping LLM knowledge
stub: false
compiled_at: 2026-04-24T17:57:00.674Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/generator.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

A Knowledge Domain is a high-level, human-readable description of the specific subject area or field of expertise in which a YAAF agent operates [Source 1]. It serves as the foundational definition of the agent's scope, answering the question of what the agent is an expert *about*. For example, a domain could be "a TypeScript library for financial calculations" or "a Python web framework for building REST APIs" [Source 1].

This concept is crucial for bootstrapping an agent's knowledge base. The domain description provides the necessary context for [Tools](../subsystems/tools.md) that automatically generate the agent's core `Ontology.yaml` file, which structures its understanding of the subject matter [Source 1].

## How It Works in YAAF

In YAAF, the Knowledge Domain is primarily used as a key input for the `OntologyGenerator` class. This class is responsible for using a Large Language Model ([LLM](./llm.md)) to draft an initial `Ontology.yaml` file tailored to a specific project [Source 1].

The process involves the following steps:
1.  A developer provides a 1-3 sentence string describing the Knowledge Domain.
2.  This string is passed as the `domain` property within the `GenerateOntologyOptions` object to the `OntologyGenerator.generate()` method.
3.  The `OntologyGenerator` combines this domain description with other contextual information, such as the project's file tree, README, and package manifests (`package.json`, `pyproject.toml`).
4.  This combined context is then used to prompt an LLM, which generates an [Ontology](./ontology.md) that reflects the concepts, entities, and relationships relevant to the specified domain [Source 1].

The domain description directly guides the LLM in inferring appropriate entity types (e.g., 'function', 'decorator', 'guide') and structuring the knowledge base correctly for the agent's intended purpose [Source 1].

## Configuration

A developer specifies the Knowledge Domain [when](../apis/when.md) using the `OntologyGenerator` to bootstrap an agent's knowledge base. This is done by setting the `domain` property in the options passed to the `generate` method.

The following example demonstrates how to configure the Knowledge Domain for an agent intended to be an expert on a fictional "Acme SDK" [Source 1].

```typescript
import { OntologyGenerator, makeGenerateFn } from 'yaaf/knowledge';

// Assume `myModel` is a configured LLM instance
const gen = new OntologyGenerator({
  generateFn: makeGenerateFn(myModel),
  outputPath: './knowledge/ontology.yaml',
});

// The `domain` string defines the agent's area of expertise.
await gen.generate({
  domain: 'Acme SDK — a TypeScript library for interacting with the Acme Corp API.',
  srcDirs: ['./src'],
});
```

## Sources

[Source 1]: src/knowledge/ontology/generator.ts