---
summary: Provides shared utility functions to support the knowledge base compilation process, including content fencing, entity pluralization, and deterministic document ID generation.
primary_files:
 - src/knowledge/compiler/utils.ts
title: KB Compilation Pipeline
entity_type: subsystem
exports:
 - fenceContent
 - pluralizeEntityType
 - generateDocId
search_terms:
 - knowledge base helpers
 - KB compilation utilities
 - how to generate docId
 - pluralize entity type
 - fence LLM content
 - prompt injection prevention
 - deterministic ID generation
 - slugify article title
 - knowledge base file naming
 - compiler utility functions
 - securely wrap untrusted content
 - cryptographic delimiter
stub: false
compiled_at: 2026-04-25T00:28:49.941Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/utils.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Knowledge Base Compilation Utilities subsystem provides a centralized collection of shared helper functions used throughout the [knowledge base compilation pipeline](./knowledge-base-compiler.md) [Source 1]. Its primary purpose is to eliminate duplicated logic across different compilation stages by offering standardized solutions for common tasks. These tasks include securely preparing untrusted content for LLM prompts, pluralizing entity type names for consistent directory structures, and generating deterministic document identifiers from article metadata [Source 1].

## Architecture

This subsystem is architecturally simple, consisting of a set of stateless, exported functions from the `src/knowledge/compiler/utils.ts` file [Source 1]. It does not maintain any internal state or manage complex classes. The key components are individual utility functions designed to perform a single, well-defined task.

## Integration Points

The utilities in this subsystem are designed to be called by various other parts of the [Knowledge Compilation System](./knowledge-compilation-system.md).

- **`fenceContent`**: This function is used by components that construct prompts for LLMs, such as the [Knowledge Compiler Extractor](./knowledge-compiler-extractor.md), [Knowledge Compiler Synthesizer](./knowledge-compiler-synthesizer.md), and linter heal prompts, to prevent prompt injection vulnerabilities [Source 1].
- **`pluralizeEntityType` and `generateDocId`**: These functions are used by the core [Knowledge Base Compiler](./knowledge-base-compiler.md) and any other system responsible for creating, organizing, or referencing knowledge base articles on the filesystem [Source 1].

## Key APIs

The subsystem exports several key utility functions:

- **`fenceContent(content: string)`**: Wraps a string of untrusted content with a cryptographically random delimiter. This prevents an LLM from "breaking out" of a data section in a prompt by guessing the closing delimiter, which is a crucial security measure [Source 1].
- **`pluralizeEntityType(entityType: string)`**: Converts a singular entity type name (e.g., 'concept', 'api') into its correct plural form (e.g., 'concepts', 'apis'). It handles irregular plurals and standard English rules to ensure consistent directory naming within the knowledge base [Source 1].
- **`generateDocId(canonicalTitle: string, entityType: string)`**: Creates a deterministic, unique document identifier (docId) from an article's canonical title and entity type. The format is `{pluralized-entity-type}/{slug}`, for example, `concepts/attention-mechanism` [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/utils.ts