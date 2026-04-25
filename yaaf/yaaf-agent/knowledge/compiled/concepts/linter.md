---
summary: A core YAAF component for static analysis of the knowledge base, identifying issues, and applying automated corrections, including LLM-powered fixes.
tags:
 - knowledge-base
 - compiler
title: Linter
entity_type: concept
related_subsystems:
 - compiler
see_also:
 - concept:Auto-Fixing
 - concept:Linting
 - concept:Plugin-Defined Lint Rules
 - concept:Frontmatter Validation
 - api:KBLinter
search_terms:
 - knowledge base static analysis
 - KB self-healing
 - how to fix broken wikilinks
 - find unlinked mentions
 - validate frontmatter
 - automated KB maintenance
 - linting rules for agents
 - KBLinter class
 - applyFixes function
 - LintReport
 - LLM-based linting
 - Karpathy self-healing pass
 - knowledge base quality
 - content integrity checks
stub: false
compiled_at: 2026-04-25T00:20:40.601Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/fixer.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/linter.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/reader.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/llmClient.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/utils/frontmatter.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

The Linter is a component within the YAAF compiler subsystem responsible for performing static analysis on the knowledge base content. Its primary purpose is to identify and report issues, ensuring the quality, consistency, and structural integrity of the articles that form the agent's knowledge [Source 3].

The Linter implements what has been described as a "self-healing" pass for the knowledge base. This process involves three main steps [Source 3]:
1.  Scan the compiled knowledge base for a wide range of potential issues.
2.  Automatically fix issues that can be resolved without human intervention.
3.  Produce a human-readable report of any remaining issues that require manual review.

Issues detected by the linter range from structural problems, such as missing required [Frontmatter](./frontmatter.md) fields, to content-level inconsistencies, like non-canonical [Wikilinks](./wikilinks.md) or unlinked mentions of known concepts [Source 1]. For more complex analysis or corrections, the linter can also leverage an [LLM](./llm.md) [Source 5].

## How It Works in YAAF

The core of the linter is the [KBLinter](../apis/kb-linter.md) class, which orchestrates the entire analysis and correction process [Source 3].

The workflow proceeds as follows:

1.  **Reading and Parsing**: The linter begins by reading all compiled markdown articles referenced in the `ConceptRegistry`. The `readCompiledArticles` function loads each file and `parseCompiledArticle` separates its content into a [ParsedCompiledArticle](../apis/parsed-compiled-article.md) object, containing the parsed [Frontmatter](./frontmatter.md) and the markdown body [Source 4]. This parsing step uses a shared, spec-compliant YAML library to handle the [Frontmatter](./frontmatter.md) correctly [Source 4, Source 6].

2.  **Linting**: The [KBLinter](../apis/kb-linter.md) instance executes a set of static checks in parallel across all parsed articles. These checks can be built-in rules or custom rules provided by plugins through a `LinterRuleAdapter`, as described in [Plugin-Defined Lint Rules](./plugin-defined-lint-rules.md) [Source 3].

3.  **Reporting**: The findings from all checks are aggregated into a single, structured [LintReport](../apis/lint-report.md) object. This report contains a list of [LintIssue](../apis/lint-issue.md) objects, each detailing a specific problem with a corresponding [LintCode](../apis/lint-code.md) and [LintSeverity](../apis/lint-severity.md) [Source 2, Source 3].

4.  **Auto-Fixing**: If invoked, the linter's `fix()` method uses the `applyFixes` function to attempt to resolve issues automatically [Source 1, Source 3]. This [Auto-Fixing](./auto-fixing.md) mechanism is designed to be conservative; it never removes content, only adding or rewriting it. It applies fixes for one issue at a time and groups changes by file to minimize writes [Source 1]. Common auto-fixable issues include:
    *   `NON_CANONICAL_WIKILINK`: Rewrites a wikilink alias to its canonical title (e.g., `[[alias]]` → `[[canonical title]]`).
    *   `UNLINKED_MENTION`: Adds a wikilink to the first occurrence of a term that matches a known concept.
    *   `MISSING_REQUIRED_FIELD`: Injects a default value for a required field into the article's [Frontmatter](./frontmatter.md).

    The result of this operation is an [AutoFixResult](../apis/auto-fix-result.md) object, which details every [FixedIssue](../apis/fixed-issue.md) that was successfully resolved [Source 1].

5.  **LLM-Powered Healing**: For issues beyond the scope of simple static rules, the linter can utilize an [LLM](./llm.md). By using a client created with [makeKBLLMClient](../apis/make-kbllm-client.md), it can perform "Phase C" healing tasks, such as generating a fix for a malformed wikilink based on a natural language prompt [Source 5].

## See Also

*   [Auto-Fixing](./auto-fixing.md)
*   [Linting](./linting.md)
*   [Plugin-Defined Lint Rules](./plugin-defined-lint-rules.md)
*   [Frontmatter Validation](./frontmatter-validation.md)
*   [KBLinter](../apis/kb-linter.md)

## Sources

*   [Source 1]: `src/knowledge/compiler/linter/fixer.ts`
*   [Source 2]: `src/knowledge/compiler/linter/index.ts`
*   [Source 3]: `src/knowledge/compiler/linter/linter.ts`
*   [Source 4]: `src/knowledge/compiler/linter/reader.ts`
*   [Source 5]: `src/knowledge/compiler/llmClient.ts`
*   [Source 6]: `src/knowledge/utils/frontmatter.ts`