---
summary: An issue where a required field is absent from an article's frontmatter, which can be automatically injected with a default value by the Auto-Fixer.
tags:
 - linter
 - frontmatter
title: MISSING_REQUIRED_FIELD
entity_type: concept
related_subsystems:
 - linter
see_also:
 - "[Frontmatter](./frontmatter.md)"
 - "[Linting](./linting.md)"
 - "[Auto-Fixing](./auto-fixing.md)"
 - "[Frontmatter Validation](./frontmatter-validation.md)"
search_terms:
 - missing frontmatter field
 - required frontmatter key
 - auto-fix frontmatter
 - linter error missing field
 - inject default value
 - frontmatter validation error
 - how to fix missing required field
 - YAAF linter auto-fix
 - article metadata validation
 - knowledge base compilation error
 - autofixable lint issue
stub: false
compiled_at: 2026-04-25T00:21:29.324Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/fixer.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

`MISSING_REQUIRED_FIELD` is a type of lint issue identified by the YAAF knowledge base compiler. It occurs when a mandatory field is absent from an article's [Frontmatter](./frontmatter.md). The [Frontmatter](./frontmatter.md) section contains critical metadata for each article, and the absence of a required field can cause issues with compilation, rendering, or indexing. This issue signals a violation of the defined article structure.

## How It Works in YAAF

The YAAF linter detects `MISSING_REQUIRED_FIELD` issues during its validation pass over knowledge base articles. This issue is categorized as auto-fixable [Source 1].

The framework's Auto-Fixer component can automatically resolve this problem. The designated fix is to inject a default value for the missing field directly into the article's [Frontmatter](./frontmatter.md) section. This process is handled by the `[[applyFixes]]` function, which is designed to be conservative, applying one fix at a time and writing changes to the file only once per run [Source 1]. This ensures that articles conform to the required schema with minimal manual intervention.

## See Also

- [Auto-Fixing](./auto-fixing.md)
- [Frontmatter](./frontmatter.md)
- [Frontmatter Validation](./frontmatter-validation.md)
- [Linting](./linting.md)

## Sources

[Source 1]: src/knowledge/compiler/linter/fixer.ts