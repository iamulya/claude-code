---
title: KB Linting Rules
entity_type: concept
summary: A set of deterministic static analysis checks used by the YAAF Knowledge Base compiler to ensure structural integrity, link consistency, and content quality.
related_subsystems:
  - Knowledge Base Compiler
  - Linter
stub: false
compiled_at: 2026-04-16T14:24:51.226Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/checks.ts
confidence: 0.9
---

## What It Is
KB Linting Rules are a suite of deterministic static checks performed by the YAAF Knowledge Base (KB) compiler. These rules are designed to validate the integrity of the documentation, ensure consistency across the ontology, and maintain high content quality without requiring LLM-based evaluation. 

The linter runs during the `kb lint` invocation and categorizes issues into three severity levels:
1.  **Structural (Errors):** Critical issues that block the compilation process.
2.  **Linking (Warnings):** Issues that degrade the quality or navigability of the KB but do not prevent compilation.
3.  **Quality (Info):** Suggestions for improvement or identification of potential content gaps.

## How It Works in YAAF
The linting engine processes compiled articles in parallel to ensure high performance. It utilizes several internal mechanisms to validate the KB state, including a `ConceptRegistry` for entity lookups, an alias index for resolving synonyms, and a bidirectional `LinkGraph` for analyzing relationships between articles.

### Structural Rules
These rules ensure that every article adheres to the required schema defined by the YAAF ontology.
*   **MISSING_ENTITY_TYPE:** Triggered if the `entity_type` field is absent from the frontmatter.
*   **UNKNOWN_ENTITY_TYPE:** Triggered if the provided `entity_type` does not exist within the defined ontology.
*   **MISSING_REQUIRED_FIELD:** Triggered when a field marked as required for a specific entity type is missing.
*   **INVALID_FIELD_VALUE:** Triggered when a frontmatter field violates type constraints or enum definitions (e.g., an invalid value in a restricted field).

### Linking Rules
These rules maintain the connectivity and canonical accuracy of the KB.
*   **BROKEN_WIKILINK:** Identifies `[[wikilinks]]` where the target does not exist in the registry.
*   **NON_CANONICAL_WIKILINK:** Flags links that use an alias instead of the canonical title of an article.
*   **UNLINKED_MENTION:** Uses the `scanForEntityMentions` utility to find text that matches a known entity but lacks a formal wikilink.
*   **ORPHANED_ARTICLE:** Identifies articles that have no incoming links from any other article in the KB.
*   **MISSING_RECIPROCAL_LINK:** Checks for reciprocal relationships defined in the ontology; if Article A links to Article B, this rule flags if Article B does not link back to Article A.

### Quality Rules
These rules identify opportunities for content refinement.
*   **LOW_ARTICLE_QUALITY:** Flags articles where the body text falls below a minimum word count threshold (excluding stubs).
*   **BROKEN_SOURCE_REF:** Validates that the path specified in the `compiled_from` metadata exists on the local disk.
*   **STUB_WITH_SOURCES:** Identifies articles marked as stubs that have associated raw source material available, suggesting they can be expanded.
*   **DUPLICATE_CANDIDATE:** Flags articles with titles that are highly similar to existing entries.
*   **CONTRADICTORY_CLAIMS:** Uses pattern matching to detect factual disagreements between articles, specifically focusing on numeric values in claims formatted as "X is/has/uses N."

## Configuration
The behavior of the linter is governed by `LintOptions`. Developers can tune specific thresholds for quality checks to suit the needs of their specific KB.

```typescript
// Example configuration parameters for linting checks
const lintOptions = {
  minWordCount: 100,      // Threshold for LOW_ARTICLE_QUALITY
  duplicateThreshold: 0.8 // Similarity score for DUPLICATE_CANDIDATE
};
```

The linter also utilizes a `LinkGraph` built via `buildLinkGraph` to perform graph-based analysis for orphans and reciprocal links.

## Sources
* `src/knowledge/compiler/linter/checks.ts`