---
summary: A type of linting issue where a term corresponding to a known entity is mentioned without a wikilink, which can be automatically fixed.
tags:
 - linter
 - wikilinks
title: UNLINKED_MENTION
entity_type: concept
related_subsystems:
 - linter-fixer
see_also:
 - "[Linting](./linting.md)"
 - "[Auto-Fixing](./auto-fixing.md)"
 - "[Wikilinks](./wikilinks.md)"
 - "[applyFixes](../apis/apply-fixes.md)"
search_terms:
 - missing wikilink
 - how to add links automatically
 - linter error UNLINKED_MENTION
 - auto-linking entities
 - knowledge base linking
 - auto-fix lint issue
 - add missing link
 - wikilink linter rule
 - automatic entity linking
 - fix unlinked terms
 - linter fixer
stub: false
compiled_at: 2026-04-25T00:26:04.207Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/fixer.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

`UNLINKED_MENTION` is a specific type of linting issue identified by the YAAF knowledge base compiler. It occurs when a term that has a corresponding canonical article title exists within an article's text but is not formatted as a [wikilink](./wikilinks.md). This is considered an issue because it hinders the interconnectedness and discoverability of concepts within the knowledge base. The `UNLINKED_MENTION` issue is classified as auto-fixable [Source 1].

## How It Works in YAAF

During the [Linting](./linting.md) process, the YAAF compiler scans article content for terms that match the titles of other known entities. If a match is found without the `[[...]]` syntax, it is flagged as an `UNLINKED_MENTION` issue.

This issue can be resolved automatically by the framework's Auto-Fixer mechanism, which is invoked via the [applyFixes](../apis/apply-fixes.md) function. The specific fix for an `UNLINKED_MENTION` issue is to add a wikilink around the first occurrence of the unlinked term in the file [Source 1]. The Auto-Fixer is designed to be conservative, applying changes for one issue at a time and grouping all fixes for a single file into one write operation to ensure atomicity and prevent data loss [Source 1].

## See Also

- [Auto-Fixing](./auto-fixing.md)
- [Linting](./linting.md)
- [Wikilinks](./wikilinks.md)
- [applyFixes](../apis/apply-fixes.md)

## Sources

[Source 1]: src/knowledge/compiler/linter/fixer.ts