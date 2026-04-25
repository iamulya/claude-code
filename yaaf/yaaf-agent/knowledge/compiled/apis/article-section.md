---
summary: Defines the structure and content of a section within a knowledge base article.
export_name: ArticleSection
source_file: src/knowledge/ontology/index.ts
category: type
title: ArticleSection
entity_type: api
search_terms:
 - knowledge base article structure
 - define article sections
 - KB content model
 - ontology article schema
 - how to structure wiki pages
 - article content blocks
 - heading and content type
 - YAAF knowledge base schema
 - article body definition
 - markdown section type
 - wiki page content
 - structured article content
stub: false
compiled_at: 2026-04-24T16:50:07.551Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `ArticleSection` type is a part of the YAAF Knowledge Base [Ontology](../concepts/ontology.md) system. It defines the data structure for a single, distinct section within an article, typically corresponding to a heading and the content that follows it.

This type is used to model the body of a knowledge base article in a structured format, allowing the framework's compiler and other [Tools](../subsystems/tools.md) to process, validate, and render article content consistently. An entire article body is typically represented as an array of `ArticleSection` objects.

## Signature

`ArticleSection` is a type alias for an object with a heading and content.

```typescript
export type ArticleSection = {
  /**
   * The title or heading of the section.
   */
  heading: string;

  /**
   * The raw content of the section, usually in Markdown format.
   */
  content: string;
};
```

## Examples

The following examples demonstrate how to use the `ArticleSection` type to structure article content.

### Defining a Single Section

This example shows the creation of a single `ArticleSection` object.

```typescript
import type { ArticleSection } from 'yaaf';

const overviewSection: ArticleSection = {
  heading: 'Overview',
  content: 'This section provides a high-level summary of the topic, explaining its purpose and context.',
};
```

### Defining a Full Article Body

An array of `ArticleSection` objects can be used to represent the complete body of an article.

```typescript
import type { ArticleSection } from 'yaaf';

const articleBody: ArticleSection[] = [
  {
    heading: 'Introduction',
    content: 'This is the introductory paragraph of the article.',
  },
  {
    heading: 'Core Concepts',
    content: 'Here, we explain the main ideas and principles.',
  },
  {
    heading: 'Conclusion',
    content: 'This section summarizes the key takeaways from the article.',
  },
];
```

## Sources

[Source 1] src/knowledge/ontology/index.ts