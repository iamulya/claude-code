---
summary: The capability of the Knowledge Base Linter to automatically resolve certain identified issues in articles, such as rewriting non-canonical wikilinks or adding missing required fields.
title: Auto-Fixing
entity_type: concept
related_subsystems:
 - knowledge_base
search_terms:
 - automatic knowledge base repair
 - linting auto fix
 - how to fix lint issues automatically
 - KBLinter.fix()
 - NON_CANONICAL_WIKILINK fix
 - UNLINKED_MENTION fix
 - MISSING_REQUIRED_FIELD fix
 - self-healing knowledge base
 - automated article correction
 - YAAF linter
 - knowledge base quality
 - fixing broken links automatically
stub: false
compiled_at: 2026-04-24T17:52:38.865Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/types.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Auto-Fixing is a feature of the YAAF Knowledge Base [Linter](./linter.md) that automatically resolves certain categories of [Linting](./linting.md) issues without human intervention. It is designed to handle simple, unambiguous problems, thereby reducing the manual maintenance burden of the knowledge base. By correcting issues like inconsistent linking or missing metadata, Auto-Fixing helps maintain the structural integrity and quality of the knowledge base articles.

## How It Works in YAAF

The [Knowledge Base Linter](../subsystems/knowledge-base-linter.md) identifies problems and represents each one as a `LintIssue` object. Each `LintIssue` contains a property, `autoFixable`, which is a boolean flag indicating whether the issue can be resolved programmatically [Source 1].

[when](../apis/when.md) an auto-fix operation is triggered (e.g., via `KBLinter.fix()`), the system iterates through all identified issues. For those marked as `autoFixable`, it applies a predefined correction. For issues involving text replacement within an article's body, the `LintIssue` object may include a `fix` property. This property specifies the exact text to find and its replacement, allowing the fixer to apply the change without needing to re-parse the entire article [Source 1].

The result of an auto-fix run is an `AutoFixResult` object, which reports which issues were fixed and which were skipped [Source 1].

### Auto-Fixable Issues

According to the framework's type definitions, the following `LintCode`s are designated as auto-fixable [Source 1]:

*   **`NON_CANONICAL_WIKILINK`**: Rewrites a wikilink that uses an alias to its canonical form. For example, if "Agent" is an alias for the canonical article "Agent Architecture", a link like `Agent` would be automatically changed to `Agent Architecture`.
*   **`UNLINKED_MENTION`**: Adds a wikilink to the first occurrence of a known knowledge base entity that is mentioned in plain text. The `fix` object for this issue specifies that only the first occurrence should be replaced.
*   **`MISSING_REQUIRED_FIELD`**: Adds a required [Frontmatter](./frontmatter.md) field to an article if a default value for that field is available.

### Non-Auto-Fixable Issues

Many issues require human judgment or more complex operations and are therefore not auto-fixable. Examples include [Source 1]:

*   **`BROKEN_WIKILINK`**: The target of a wikilink does not exist. This requires a human to decide whether to remove the link or change its target.
*   **`DUPLICATE_CANDIDATE`**: Two articles appear to cover the same topic. This requires a human decision on whether to merge or delete one of the articles.
*   **`STUB_WITH_SOURCES`**: An article is a stub but has available source material. The fix requires triggering a full synthesis pass, which is a separate, more intensive operation than a simple text replacement.

## Sources

[Source 1] `src/knowledge/compiler/linter/types.ts`