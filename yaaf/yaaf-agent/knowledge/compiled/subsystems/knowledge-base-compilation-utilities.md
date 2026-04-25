---
summary: Shared helpers for the Knowledge Base compilation pipeline, centralizing logic like content fencing, pluralization, and docId generation.
title: Knowledge Base Compilation Utilities
entity_type: subsystem
primary_files:
 - src/knowledge/compiler/utils.ts
exports:
 - fenceContent
 - pluralizeEntityType
 - generateDocId
search_terms:
 - KB compilation helpers
 - knowledge base build tools
 - how to generate docId
 - pluralize entity names
 - content fencing for LLMs
 - prompt injection prevention
 - securely pass data to LLM
 - deterministic document ID
 - slugify title
 - knowledge base file naming
 - shared build utilities
 - compilation pipeline logic
stub: false
compiled_at: 2026-04-24T18:14:07.002Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/utils.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Knowledge Base Compilation [Utilities](./utilities.md) subsystem provides a collection of shared helper functions used throughout the YAAF Knowledge Base (KB) compilation pipeline [Source 1]. Its primary purpose is to centralize and deduplicate common logic, such as generating document identifiers, pluralizing [Entity Type](../concepts/entity-type.md) names for directory structures, and securely fencing content for [LLM](../concepts/llm.md) prompts. By consolidating these functions, the subsystem ensures consistency and maintainability across different stages of the compilation process [Source 1].

## Architecture

This subsystem is not a complex, stateful service but rather a simple module exporting a set of stateless, pure functions. Each function addresses a specific, recurring task within the KB compilation [workflow](../concepts/workflow.md) [Source 1].

- **`fenceContent`**: A security-oriented utility that wraps untrusted string content with a cryptographically random delimiter. This prevents [Prompt Injection](../concepts/prompt-injection.md) attacks where the content might contain a closing delimiter to "break out" of its data context and manipulate the LLM.
- **`pluralizeEntityType`**: A string manipulation utility that converts a singular entity type name (e.g., 'concept', 'api') into its correct plural form (e.g., 'concepts', 'apis'). It handles standard English rules as well as irregular plurals.
- **`generateDocId`**: A deterministic ID generation function that creates a unique, filesystem-friendly document identifier from a canonical title and an entity type.

## Integration Points

The utilities in this subsystem are designed to be called by various other components within the broader Knowledge Base compilation system [Source 1].

- The `fenceContent` function is used by any module that constructs prompts for an LLM, including those for content extraction, synthesis, and healing.
- The `pluralizeEntityType` and `generateDocId` functions are used by the components responsible for organizing and writing the compiled knowledge base articles to the file system, ensuring a consistent directory and naming scheme.

## Key APIs

The public API surface of this subsystem consists of three main functions [Source 1].

### `fenceContent()`

Wraps a string of content in a secure, randomly generated delimiter to safely include it in an LLM prompt. This prevents the content from being misinterpreted as instructions.

```typescript
function fenceContent(content: string): { fenced: string; delimiter: string; }
```

**Example Usage:**
```typescript
const { fenced, delimiter } = fenceContent(articleBody);
// LLM prompt: `The article is fenced with ${delimiter}:\n${fenced}`
```

### `pluralizeEntityType()`

Converts a singular entity type string into its plural form, which is used for creating directory names in the compiled knowledge base.

```typescript
function pluralizeEntityType(entityType: string): string
```

**Example Usage:**
```typescript
pluralizeEntityType('concept'); // → 'concepts'
pluralizeEntityType('category'); // → 'categories'
```

### `generateDocId()`

Creates a deterministic, slug-based document ID from a title and entity type. The format is `{pluralized-entity-type}/{slug}`.

```typescript
function generateDocId(canonicalTitle: string, entityType: string): string
```

**Example Usage:**
```typescript
generateDocId('Attention Mechanism', 'concept'); // → 'concepts/attention-mechanism'
```

## Sources

[Source 1]: `src/knowledge/compiler/utils.ts`