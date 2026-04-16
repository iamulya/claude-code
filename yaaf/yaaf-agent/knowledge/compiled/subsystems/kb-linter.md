---
primary_files:
  - src/knowledge/compiler/linter/checks.ts
  - src/knowledge/compiler/linter/index.ts
title: KB Linter
entity_type: subsystem
summary: The KB Linter provides deterministic static analysis for Knowledge Base articles to ensure structural integrity, linking consistency, and content quality.
exports:
  - extractWikilinks
  - buildLinkGraph
  - checkMissingEntityType
  - checkUnknownEntityType
  - checkMissingRequiredFields
  - checkInvalidFieldValues
  - checkBrokenWikilinks
  - checkNonCanonicalWikilinks
  - checkUnlinkedMentions
  - checkOrphanedArticle
  - checkMissingReciprocalLinks
  - checkLowArticleQuality
  - checkBrokenSourceRefs
  - checkStubWithSources
  - checkDuplicateCandidates
  - checkContradictoryClaims
stub: false
compiled_at: 2026-04-16T14:24:45.657Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/checks.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/index.ts
confidence: 0.95
---

## Purpose
The KB Linter is a static analysis subsystem within the YAAF knowledge compiler. Its primary purpose is to validate the integrity and quality of compiled articles without requiring LLM intervention. It ensures that the Knowledge Base (KB) adheres to defined ontologies, maintains a healthy internal linking structure, and identifies potential content gaps or contradictions.

The linter is designed to be fast and deterministic, allowing it to run on every invocation of the `kb lint` command.

## Architecture
The subsystem is structured around a suite of individual check functions that categorize issues into three severity levels:

### Structural Checks (Errors)
These checks identify critical failures that block the compilation process:
*   **MISSING_ENTITY_TYPE**: The `entity_type` field is absent from the article frontmatter.
*   **UNKNOWN_ENTITY_TYPE**: The provided `entity_type` does not exist in the defined ontology.
*   **MISSING_REQUIRED_FIELD**: Required frontmatter fields for a specific entity type are missing.
*   **INVALID_FIELD_VALUE**: Frontmatter fields violate type or enum constraints.

### Linking Checks (Warnings)
These checks identify issues that degrade the navigability and interconnectedness of the KB:
*   **BROKEN_WIKILINK**: A `[[target]]` reference points to a non-existent article.
*   **NON_CANONICAL_WIKILINK**: A link uses an alias instead of the canonical title.
*   **UNLINKED_MENTION**: A known entity is mentioned in the text but lacks a formal `[[wikilink]]`.
*   **ORPHANED_ARTICLE**: An article exists but is not linked to by any other article.
*   **MISSING_RECIPROCAL_LINK**: A link exists from Article A to B, but the expected reciprocal link from B to A is missing.

### Quality Checks (Info)
These checks highlight opportunities for content improvement:
*   **LOW_ARTICLE_QUALITY**: The article body is too short for a non-stub entry.
*   **BROKEN_SOURCE_REF**: The path in the `compiled_from` metadata does not exist on disk.
*   **STUB_WITH_SOURCES**: An article marked as a stub has available source material and could be expanded.
*   **DUPLICATE_CANDIDATE**: An article has a title highly similar to another entry.
*   **CONTRADICTORY_CLAIMS**: Detects disagreeing factual statements (e.g., different numeric values) about the same subject across different articles.

## Key APIs
The KB Linter exposes several functions for analyzing articles and their relationships:

### Link Analysis
*   `extractWikilinks(body: string)`: Parses article text to identify all internal links, supporting both `[[Target]]` and `[[Target|Display Text]]` syntax.
*   `buildLinkGraph(articles: ParsedCompiledArticle[], registry: ConceptRegistry)`: Constructs a bidirectional graph of all articles to facilitate orphan detection and reciprocal link validation.

### Validation Functions
The subsystem exports specific functions for every check type (e.g., `checkMissingEntityType`, `checkBrokenWikilinks`, `checkContradictoryClaims`). These functions typically take a `ParsedCompiledArticle` and relevant context (like the `KBOntology` or `LinkGraph`) and return `LintIssue` objects.

## Configuration
The linter's behavior can be adjusted via `LintOptions`. Key configuration parameters include:
*   `minWordCount`: The threshold used by `checkLowArticleQuality` to determine if an article is too short.
*   `threshold`: The similarity score used by `checkDuplicateCandidates` to flag potential duplicates.
*   `rawDir`: The directory path used to verify if stubs have corresponding raw source material for expansion.