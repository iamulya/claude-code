---
summary: The process of validating the structural integrity, link consistency, and quality of the YAAF knowledge base.
title: KB Linting
entity_type: concept
related_subsystems:
  - Knowledge Compiler
stub: false
compiled_at: 2026-04-16T14:25:44.328Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/types.ts
confidence: 0.9
---

## What It Is
KB Linting is the automated validation process used within the YAAF knowledge compiler to ensure the structural integrity, consistency, and quality of the generated knowledge base. It identifies issues ranging from broken internal links to contradictory claims between different articles. By enforcing these rules, the framework prevents "knowledge rot" and ensures that LLM-powered agents have access to a reliable, well-connected source of truth.

## How It Works in YAAF
The linting system analyzes articles and their metadata against a set of predefined rules. Each identified problem is captured as a `LintIssue` object, which includes a classification code, a severity level, and metadata for remediation.

### Issue Classifications
Lint issues are identified by codes following a `NOUN_VERB` or `ADJECTIVE_NOUN` pattern. They are categorized into four primary groups:

*   **Structural Issues (Error severity):** These represent fundamental failures in the article's structure that prevent valid compilation. Examples include `BROKEN_WIKILINK` (a link target not found in the registry), `MISSING_REQUIRED_FIELD` in frontmatter, and `UNKNOWN_ENTITY_TYPE`.
*   **Linking Issues (Warning severity):** These focus on the connectivity and health of the knowledge graph. Examples include `ORPHANED_ARTICLE` (no other articles link to it), `NON_CANONICAL_WIKILINK` (using an alias instead of the primary title), and `UNLINKED_MENTION` (mentioning a known entity without a formal wikilink).
*   **Quality Issues (Info/Warning severity):** These assess the depth and accuracy of the content. Examples include `STUB_WITH_SOURCES` (an article that can be expanded because sources are available), `DUPLICATE_CANDIDATE` (articles with very similar titles), and `CONTRADICTORY_CLAIMS`.
*   **Plugin-defined Rules:** Developers can extend the linter with custom rules. These use the pattern `PLUGIN_<RuleId>` to allow for separate filtering.

### Severity Levels
Every issue is assigned one of three severity levels:
1.  `error`: Critical issues that must be resolved for a valid build.
2.  `warning`: Non-critical issues that may degrade agent performance or knowledge graph density.
3.  `info`: Suggestions for improvement or minor quality observations.

### Remediation and Auto-fixing
The framework provides a mechanism to programmatically resolve certain classes of issues via `KBLinter.fix()`. 

| Issue Type | Auto-fix Action |
| :--- | :--- |
| `NON_CANONICAL_WIKILINK` | Rewrites the link to use the canonical term. |
| `UNLINKED_MENTION` | Wraps the first occurrence of the entity name in a wikilink. |
| `MISSING_REQUIRED_FIELD` | Applies a default value if one is defined for the field. |

Issues that require human judgment or significant re-processing—such as `BROKEN_WIKILINK`, `STUB_WITH_SOURCES`, or `DUPLICATE_CANDIDATE`—cannot be auto-fixed and must be addressed manually or by triggering a new synthesis pass.

The result of an auto-fix operation is returned as an `AutoFixResult`, which tracks the `fixedCount`, a list of `FixedIssue` objects, and any issues that were skipped along with the reason for the skip.

## Sources
* `src/knowledge/compiler/linter/types.ts`