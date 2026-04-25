---
title: Ontology Definition
summary: A structured YAML file (`ontology.yaml`) that defines the entities, relationships, and properties of a specific knowledge domain for YAAF agents.
entity_type: concept
related_subsystems:
 - knowledge
search_terms:
 - ontology.yaml file
 - knowledge domain schema
 - define agent knowledge structure
 - what is an ontology in YAAF
 - how to create ontology.yaml
 - entity types and relationships
 - knowledge graph schema
 - domain modeling for agents
 - OntologyGenerator
 - bootstrap knowledge base
 - LLM-generated ontology
stub: false
compiled_at: 2026-04-24T17:59:35.735Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/generator.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

An [Ontology](./ontology.md) Definition in YAAF is a structured schema, typically stored in a file named `ontology.yaml`, that formally describes a specific [Knowledge Domain](./knowledge-domain.md). It defines the types of entities that exist within that domain (e.g., 'function', 'guide', 'middleware'), their properties, and the relationships between them. This file acts as the foundational blueprint for an agent's knowledge base, ensuring that information is structured, consistent, and machine-readable.

The primary problem solved by the Ontology Definition is providing a formal model for an agent's knowledge. This allows other parts of the YAAF framework, such as the [Knowledge Compiler](../subsystems/knowledge-compiler.md) and query engine, to reliably process, index, and reason about the information related to a specific domain, like a software library or a business process.

## How It Works in YAAF

In YAAF, the `ontology.yaml` file is a central artifact of the knowledge subsystem. While it can be authored manually, the framework provides a utility called `OntologyGenerator` to bootstrap its creation using a Large Language Model ([LLM](./llm.md)) [Source 1].

The generation process works as follows:
1.  A developer provides a high-level, natural language description of the knowledge domain (e.g., "FastAPI — a Python web framework...") [Source 1].
2.  The `OntologyGenerator` scans specified source code directories to build context. It analyzes the file tree structure and reads key files like `README` and `package.json` to understand the project's components [Source 1].
3.  This collected context, along with the domain description and optional hints about entity types, is passed to an LLM [Source 1].
4.  The LLM then generates a complete, valid `ontology.yaml` file tailored to the specific domain, which is written to the project's knowledge directory [Source 1].

Once created, this `ontology.yaml` file is used by other components, such as the `OntologyLoader`, to configure the agent's knowledge graph and guide the extraction of information from source documents [Source 1].

## Configuration

The primary way to configure and create an Ontology Definition is by using the `OntologyGenerator` class, typically within a build script. The generator is configured with an LLM function and an output path, and its `generate` method is called with details about the domain.

The following example demonstrates how to bootstrap an `ontology.yaml` file [Source 1]:

```typescript
import { OntologyGenerator, makeGenerateFn } from 'yaaf/knowledge';

// Assume 'myModel' is a configured LLM client
const generateFn = makeGenerateFn(myModel);

const generator = new OntologyGenerator({
  generateFn: generateFn,
  outputPath: './knowledge/ontology.yaml',
});

await generator.generate({
  // A 1-3 sentence description of the domain
  domain: 'Acme SDK — a TypeScript library for interacting with the Acme Corp API.',
  
  // Directories to scan for context
  srcDirs: ['./src'],
  
  // Optional hints to guide the LLM
  entityTypeHints: ['class', 'method', 'configuration', 'tutorial'],
});
```

Key configuration options for the generation process include [Source 1]:
*   `domain`: A required, high-level description of the knowledge domain.
*   `srcDirs`: An array of source directories to scan for context.
*   `entityTypeHints`: An optional array of strings to suggest potential entity types to the LLM.
*   `outputPath`: The file path where `ontology.yaml` will be written.

## Sources

[Source 1] src/knowledge/ontology/generator.ts