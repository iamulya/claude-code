---
title: CompiledDocument
entity_type: api
summary: Represents a compiled KB article with metadata, body content, and token estimates.
export_name: CompiledDocument
source_file: src/knowledge/store/store.ts
category: type
stub: false
compiled_at: 2026-04-16T14:29:47.834Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/store.ts
confidence: 0.98
---

## Overview
`CompiledDocument` is a TypeScript type that represents the runtime state of a Knowledge Base (KB) article. It is the primary data structure used by the `KBStore` to provide read-only access to articles that have been processed from raw markdown files. 

A `CompiledDocument` contains the document's content (stripped of frontmatter), calculated metrics such as word counts and token estimates, and the original metadata extracted from the markdown frontmatter.

## Signature
```typescript
export type CompiledDocument = {
  /** Unique document identifier (e.g. "concepts/attention-mechanism") */
  docId: string
  /** Canonical article title */
  title: string
  /** Entity type from ontology */
  entityType: string
  /** Full markdown body (without frontmatter) */
  body: string
  /** Whether this is a stub article */
  isStub: boolean
  /** Word count of the body */
  wordCount: number
  /** Estimated token count */
  tokenEstimate: number
  /** Raw frontmatter key-value pairs */
  frontmatter: Record<string, unknown>
}
```

## Properties
| Property | Type |