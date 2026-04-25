---
summary: Defines the TypeScript type and runtime schema for the source hash manifest, mapping raw file paths to their SHA-256 hashes.
export_name: SourceHashManifestSchema
source_file: src/knowledge/compiler/schemas.ts
category: const
title: SourceHashManifestSchema
entity_type: api
search_terms:
 - differential compilation
 - incremental build
 - detecting changed files
 - file hash manifest
 - SHA-256 file checksum
 - how to skip recompiling articles
 - .kb-source-hashes.json schema
 - source file tracking
 - knowledge base compiler state
 - YAAF build optimization
 - what is SourceHashManifestSchema
 - zod schema for file hashes
 - DifferentialEngine state
 - build cache validation
stub: false
compiled_at: 2026-04-24T17:39:20.651Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/differential.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/schemas.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`SourceHashManifestSchema` is a Zod schema used to validate the structure and content of the source hash manifest file, typically named `.kb-source-hashes.json` [Source 1]. This manifest is a critical component of YAAF's [Differential Compilation Engine](../subsystems/differential-compilation-engine.md), which optimizes the knowledge base build process by avoiding unnecessary work [Source 1].

The manifest stores a mapping of every raw source file path to its corresponding SHA-256 hash. By comparing the hashes of current source files against the stored hashes in the manifest, the `DifferentialEngine` can efficiently identify which files have been added, changed, or deleted since the last compilation. This information is then used to determine which compiled articles are "stale" (requiring re-synthesis) and which are "clean" (can be skipped), significantly reducing the number of [LLM](../concepts/llm.md) calls during a build [Source 1].

This schema acts as a contract, ensuring that the manifest file read by the compiler is in a valid and expected format before being used for differential compilation logic [Source 2].

## Signature

`SourceHashManifestSchema` is a `zod` object schema.

```typescript
import { z } from "zod";

export const SourceHashManifestSchema = z.object({
  version: z.literal(1),
  generatedAt: z.number(),
  hashes: z.record(z.string(), z.string()),
  OntologyHash: z.string().optional(),
});
```
[Source 2]

The corresponding TypeScript type can be inferred from the schema:

```typescript
import { z } from "zod";
import { SourceHashManifestSchema } from "./schemas";

export type SourceHashManifest = z.infer<typeof SourceHashManifestSchema>;

/* Inferred type:
{
  version: 1;
  generatedAt: number;
  hashes: Record<string, string>;
  OntologyHash?: string | undefined;
}
*/
```

## Properties

The schema defines the following properties for a valid source hash manifest object:

- **`version: 1`**: A literal number indicating the version of the manifest schema. Currently, it must be `1` [Source 2].
- **`generatedAt: number`**: A Unix timestamp (number) indicating [when](./when.md) the manifest file was created [Source 2].
- **`hashes: Record<string, string>`**: The core data of the manifest. This is an object where each key is a string representing the relative path to a raw source file, and the corresponding value is a string containing the file's SHA-256 hash [Source 1, Source 2].
- **`[[Ontology]]Hash?: string`**: An optional string containing a hash of the [Ontology](../concepts/ontology.md) configuration used during the build. This can be used to invalidate all articles if the core ontology changes [Source 2].

## Examples

### Example Manifest File

A typical `.kb-source-hashes.json` file validated by this schema would look like this:

```json
{
  "version": 1,
  "generatedAt": 1678886400000,
  "hashes": {
    "src/agent.ts": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "src/runtime/local.ts": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "docs/concepts/plugins.md": "f0e9d8c7b6a5f0e9d8c7b6a5f0e9d8c7b6a5f0e9d8c7b6a5f0e9d8c7b6a5f0e9"
  },
  "ontologyHash": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
}
```

### Validating a Manifest Object

This example shows how to use `SourceHashManifestSchema` to parse and validate a manifest object in TypeScript.

```typescript
import { SourceHashManifestSchema } from "./schemas";

const manifestContent = {
  version: 1,
  generatedAt: Date.now(),
  hashes: {
    'path/to/file1.txt': 'sha256-hash-1',
    'path/to/file2.txt': 'sha256-hash-2',
  },
};

try {
  const validatedManifest = SourceHashManifestSchema.parse(manifestContent);
  console.log("Manifest is valid:", validatedManifest);
} catch (error) {
  console.error("Manifest validation failed:", error);
}
```

## Sources

[Source 1]: src/knowledge/compiler/differential.ts
[Source 2]: src/knowledge/compiler/schemas.ts