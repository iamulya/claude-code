---
summary: A specific type of lint issue where a wikilink uses an alias or non-standard name instead of the target article's canonical title, which can be automatically rewritten by the Auto-Fixer.
tags:
 - linter
 - wikilinks
title: NON_CANONICAL_WIKILINK
entity_type: concept
related_subsystems:
 - compiler
see_also:
 - "[Wikilinks](./wikilinks.md)"
 - "[Linting](./linting.md)"
 - "[Auto-Fixing](./auto-fixing.md)"
 - "[applyFixes](../apis/apply-fixes.md)"
search_terms:
 - wikilink alias
 - canonical link title
 - linter error types
 - auto-fix wikilinks
 - how to fix broken links
 - link rewriting
 - knowledge base consistency
 - lint issue codes
 - alias to canonical rewrite
 - wikilink validation
stub: false
compiled_at: 2026-04-25T00:22:02.558Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/fixer.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

`NON_CANONICAL_WIKILINK` is a specific type of lint issue identified by the YAAF knowledge base compiler. It occurs when a [wikilink](./wikilinks.md) in an article uses a non-canonical title, such as an alias or a redirect, instead of the official, canonical title of the target article. This is considered an issue because it can lead to inconsistencies and maintenance challenges within the knowledge base. Enforcing canonical titles ensures that all links pointing to a specific article are uniform, which simplifies parsing, validation, and [Wikilink Resolution](./wikilink-resolution.md).

## How It Works in YAAF

The YAAF linter detects `NON_CANONICAL_WIKILINK` issues during the knowledge base compilation process. This issue is classified as auto-fixable, meaning the framework can correct it without manual intervention [Source 1].

The [Auto-Fixing](./auto-fixing.md) mechanism, exposed via the `[[applyFixes]]` API, handles the correction. When a `NON_CANONICAL_WIKILINK` issue is found, the auto-fixer rewrites the link from its non-canonical form to the canonical one. For example, it would change `[[alias]]` to `[[canonical title]]` directly in the source markdown file [Source 1]. This process is conservative and only rewrites the link text, never removing content, ensuring the integrity of the article is maintained [Source 1].

## See Also

- [Auto-Fixing](./auto-fixing.md)
- [Linting](./linting.md)
- [Wikilinks](./wikilinks.md)
- [applyFixes](../apis/apply-fixes.md)

## Sources

[Source 1]: src/knowledge/compiler/linter/fixer.ts