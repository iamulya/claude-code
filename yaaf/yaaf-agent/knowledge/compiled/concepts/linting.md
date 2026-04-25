---
summary: The overall process of analyzing knowledge base articles to identify structural, linking, and quality issues, ensuring consistency and correctness.
title: Linting
entity_type: concept
related_subsystems:
 - knowledge_compiler
search_terms:
 - knowledge base validation
 - wiki quality check
 - find broken links
 - identify orphaned articles
 - enforce frontmatter schema
 - autofix wiki errors
 - knowledge base consistency
 - linting rules for docs
 - detecting unlinked mentions
 - canonical link enforcement
 - structural analysis of articles
 - how to check for duplicate articles
stub: false
compiled_at: 2026-04-24T17:57:48.034Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/types.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

In the context of the YAAF Knowledge Base (KB), Linting is the automated process of analyzing articles to detect a wide range of potential issues. This process serves as a quality assurance mechanism, ensuring that the entire knowledge base remains consistent, structurally sound, and correctly interlinked. It identifies problems that could degrade the user experience or violate the architectural principles of the KB, such as broken links, missing metadata, or orphaned content [Source 1].

## How It Works in YAAF

The linting process identifies problems and categorizes them into distinct types, each with a specific severity level. Each problem found is encapsulated in a `LintIssue` object, which contains details about the issue, its location, and potential remedies [Source 1].

### Issue Categories and Codes

Lint issues are classified by a `LintCode`, which follows a `NOUN_VERB` or `ADJECTIVE_NOUN` pattern. The primary categories are [Source 1]:

*   **Structural Issues:** These are considered errors and represent fundamental problems with an article's structure or metadata.
    *   `BROKEN_WIKILINK`: A wikilink points to a target that does not exist.
    *   `MISSING_REQUIRED_FIELD`: A mandatory [Frontmatter](./frontmatter.md) field is absent.
    *   `UNKNOWN_ENTITY_TYPE`: The `entity_type` field contains a value not defined in the system's [Ontology](./ontology.md).
    *   `INVALID_FIELD_VALUE`: A field's value violates type constraints (e.g., an incorrect enum value).

*   **Linking Issues:** These are typically treated as warnings and relate to the interconnectedness of articles.
    *   `ORPHANED_ARTICLE`: No other article links to this one.
    *   `NON_CANONICAL_WIKILINK`: A link uses an alias or redirect instead of the target's canonical title.
    *   `UNLINKED_MENTION`: The text mentions a known KB entity by name, but does not use a wikilink to it.
    *   `MISSING_RECIPROCAL_LINK`: For entity relationships that should be bidirectional, Article A links to B, but B does not link back to A.

*   **Quality Issues:** These are informational notices or warnings about the content itself.
    *   `STUB_WITH_SOURCES`: An article is marked as a stub but has associated source material, indicating it can be expanded.
    *   `LOW_ARTICLE_QUALITY`: The article body is very short and is not explicitly marked as a stub.
    *   `BROKEN_SOURCE_REF`: A source path listed in the metadata does not exist on disk.
    *   `DUPLICATE_CANDIDATE`: Two articles have highly similar titles, suggesting they might be duplicates.
    *   `CONTRADICTORY_CLAIMS`: Different articles make conflicting statements about the same entity.

*   **Plugin-defined Rules:** The system is extensible, allowing plugins to define their own linting rules. These are identified by codes following the pattern `PLUGIN_<RuleId>` [Source 1].

### [Auto-Fixing](./auto-fixing.md)

A key feature of the YAAF [Linter](./linter.md) is its ability to automatically fix certain classes of issues. The `LintIssue` object contains an `autoFixable` boolean flag indicating whether a human or a recompilation is required.

**Auto-fixable issues include:**
*   `NON_CANONICAL_WIKILINK`: The linter can rewrite the link to its canonical form.
*   `UNLINKED_MENTION`: The linter can wrap the first occurrence of the mentioned entity in a wikilink.
*   `MISSING_REQUIRED_FIELD`: If a default value exists for the field, the linter can apply it.

**Issues requiring manual intervention include:**
*   `BROKEN_WIKILINK`: A human must decide the correct link target.
*   `STUB_WITH_SOURCES`: This requires triggering a new content synthesis pass.
*   `DUPLICATE_CANDIDATE`: A human must decide whether to merge or delete articles.

[when](../apis/when.md) an issue is auto-fixable, the `LintIssue` object may contain a `fix` property with `findText` and `replaceWith` fields, allowing a tool like `KBLinter.fix()` to apply the change without re-parsing the entire article [Source 1].

## Sources

[Source 1]: `src/knowledge/compiler/linter/types.ts`