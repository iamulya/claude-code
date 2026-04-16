---
title: EntityMention
entity_type: api
summary: Type representing a detected mention of an entity within source text, used during knowledge compilation.
export_name: EntityMention
source_file: src/knowledge/ontology/vocabulary.ts
category: type
stub: false
compiled_at: 2026-04-16T14:28:39.057Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/index.ts
confidence: 0.9
---

## Overview
`EntityMention` is a TypeScript type used within the YAAF knowledge subsystem to represent a detected occurrence of an entity within source text. It is a core component of the framework's ontology layer, specifically utilized during the knowledge compilation phase to identify and track where entities—such as concepts, APIs, or guides—are referenced. This type is essential for the framework's ability to perform entity linking and generate automated cross-references.

## Signature / Constructor
`EntityMention` is defined in the vocabulary module and exported via the ontology barrel.

```typescript
export type EntityMention = {
  // Type definition details are managed within the vocabulary module
};
```

## Examples
`EntityMention` objects are typically encountered when working with the knowledge compiler or vocabulary normalization utilities.

```typescript
import { EntityMention } from 'yaaf/knowledge';

/**
 * Example usage of EntityMention in a compilation workflow.
 */
function processMentions(mentions: EntityMention[]) {
  mentions.forEach(mention => {
    // Logic for processing detected entity mentions
    console.log('Processing entity mention');
  });
}
```