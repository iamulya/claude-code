---
summary: Utility function to build a vocabulary alias expansion map from an ontology vocabulary for L1 grounding.
export_name: buildVocabularyAliasMap
source_file: src/knowledge/compiler/groundingPlugin.ts
category: function
title: buildVocabularyAliasMap
entity_type: api
search_terms:
 - L1 grounding
 - vocabulary expansion
 - ontology aliases
 - synonym matching
 - grounding plugin configuration
 - keyword overlap improvement
 - how to handle synonyms in grounding
 - MultiLayerGroundingPlugin vocabulary
 - create vocabulary alias map
 - stemmed token mapping
 - canonical term expansion
 - knowledge base grounding
stub: false
compiled_at: 2026-04-25T00:05:20.941Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/groundingPlugin.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `buildVocabularyAliasMap` function is a utility that processes the `vocabulary` section of an [Ontology](../concepts/ontology.md) to create a synonym expansion map. This map is specifically designed to be used with the `MultiLayerGroundingPlugin` to improve its L1 (keyword overlap) grounding checks [Source 1].

The L1 grounding layer works by comparing stemmed tokens between a generated claim and the source text. Without synonym expansion, this check is very literal. For example, if a claim mentions "attention blocks" but the source text uses the term "transformer layers," the L1 check might fail to see the connection, even if both terms refer to the same concept in the project's [Vocabulary](../concepts/vocabulary.md) [Source 1].

This function solves that problem by creating a lookup map where each key is a stemmed alias (or canonical term) from the vocabulary, and its value is an array of all other stemmed aliases for that same concept (including the canonical term). When the `MultiLayerGroundingPlugin` is configured with this map, its L1 check can expand a token found in a claim to all its known synonyms, significantly improving the accuracy of the keyword overlap analysis [Source 1].

## Signature

The function takes a vocabulary object, typically from an [Ontology](../concepts/ontology.md), and returns a `Map` structured for synonym expansion [Source 1].

```typescript
export function buildVocabularyAliasMap(
  vocabulary: Record<string, { aliases?: string[] }>
): Map<string, string[]>;
```

**Parameters:**

- `vocabulary`: An object representing the ontology's vocabulary. Each key is a canonical term, and the value is an object that can contain an `aliases` array of synonymous terms.

**Returns:**

- `Map<string, string[]>`: A map where each key is a stemmed token (from a canonical term or an alias) and the value is an array of all stemmed sibling tokens for that concept.

## Examples

### Basic Usage

This example shows how to generate the alias map and pass it to the `MultiLayerGroundingPlugin`.

```typescript
import { buildVocabularyAliasMap } from 'yaaf';
import { MultiLayerGroundingPlugin } from 'yaaf'; // Assuming this is the class location

// Assume 'ontology' is loaded and has a vocabulary property
const ontology = {
  vocabulary: {
    "Transformer Layer": {
      aliases: ["attention block", "self-attention layer"]
    },
    "GPU": {
      aliases: ["Graphics Processing Unit"]
    }
  }
};

// Build the alias map from the ontology's vocabulary
const vocabularyAliases = buildVocabularyAliasMap(ontology.vocabulary);

// Configure the grounding plugin with the alias map
const groundingPlugin = new MultiLayerGroundingPlugin({
  vocabularyAliases: vocabularyAliases,
  // ... other options
});
```
[Source 1]

### Map Structure

To illustrate the output, consider the following vocabulary:

```typescript
const vocabulary = {
  "Transformer Layer": {
    aliases: ["attention block", "self-attention layer"]
  }
};

const aliasMap = buildVocabularyAliasMap(vocabulary);
```

The resulting `aliasMap` would contain entries that (conceptually, after stemming) look like this:

- `"transform"` → `["transform", "layer", "attent", "block", "self-attent"]`
- `"layer"` → `["transform", "layer", "attent", "block", "self-attent"]`
- `"attent"` → `["transform", "layer", "attent", "block", "self-attent"]`
- `"block"` → `["transform", "layer", "attent", "block", "self-attent"]`
- `"self-attent"` → `["transform", "layer", "attent", "block", "self-attent"]`

*Note: The exact stemmed tokens depend on the Porter stemming algorithm used internally.*

## See Also

- [MultiLayerGroundingOptions](./multi-layer-grounding-options.md): The configuration object where the output of this function is used.
- [Ontology](../concepts/ontology.md): The high-level concept that contains the vocabulary data.
- [Vocabulary](../concepts/vocabulary.md): The concept describing the structure of terms and aliases.

## Sources

[Source 1]: src/knowledge/compiler/groundingPlugin.ts