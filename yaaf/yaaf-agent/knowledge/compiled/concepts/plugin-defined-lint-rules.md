---
summary: The mechanism by which YAAF plugins can extend the Knowledge Base Linter with custom rules and checks, allowing for domain-specific validation of knowledge base content.
title: Plugin-Defined Lint Rules
entity_type: concept
related_subsystems:
 - Knowledge Base
 - Linter
search_terms:
 - custom linter rules
 - extending the linter
 - plugin validation checks
 - knowledge base quality control
 - domain-specific linting
 - how to add a new lint rule
 - PLUGIN_ lint code prefix
 - validating knowledge base content
 - custom checks for articles
 - plugin-based static analysis
 - linter extension points
 - knowledge base consistency
stub: false
compiled_at: 2026-04-24T18:00:18.420Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/types.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Plugin-Defined Lint Rules are a YAAF mechanism that allows plugins to extend the capabilities of the core Knowledge Base [Linter](./linter.md). This feature enables developers to create and enforce custom, domain-specific quality and consistency checks on knowledge base articles, beyond the standard set of rules provided by the framework. These rules can validate content, [Frontmatter](./frontmatter.md), or relationships between articles according to project-specific requirements.

## How It Works in YAAF

The YAAF linter system is designed to recognize and process lint issues originating from external plugins through a specific naming convention for the issue identifier, or `LintCode` [Source 1].

The core `LintCode` type, which enumerates all possible issue classifications, includes a template literal type specifically for plugins: `` `PLUGIN_${string}` ``. This allows any string prefixed with `PLUGIN_` to be a valid lint code [Source 1].

According to source code comments, this convention serves a practical purpose: "Plugin rules use the pattern `PLUGIN_<RuleId>` so they can be filtered separately" [Source 1]. [when](../apis/when.md) a plugin identifies a violation of one of its custom rules, it generates a `LintIssue` object. The `code` property of this object must be set to a string that follows this pattern, for example, `PLUGIN_MISSING_API_EXAMPLE`.

Like core lint rules, a plugin-defined rule can specify a `severity` ("error", "warning", or "info"), a human-readable `message`, and a `suggestion` for how to fix the issue. Plugins can also create rules that are automatically correctable by the linter's `fix()` method. To do this, the plugin sets the `autoFixable` property of the `LintIssue` to `true` and provides a `fix` object containing the text to find and its replacement [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/linter/types.ts