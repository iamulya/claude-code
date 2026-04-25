---
summary: Defines the metadata structure for a YAAF skill, typically found at the top of a markdown skill file.
export_name: SkillFrontmatter
source_file: src/skills.ts
category: type
title: SkillFrontmatter
entity_type: api
search_terms:
 - skill metadata
 - skill configuration
 - markdown skill header
 - skill.md format
 - skill properties
 - define skill metadata
 - skill name and description
 - skill tags
 - skill versioning
 - always inject skill
 - skill frontmatter fields
 - YAML header for skills
stub: false
compiled_at: 2026-04-24T17:38:18.051Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/skills.ts
compiled_from_quality: unknown
confidence: 0.98
---
## Overview

`Skill[[Frontmatter]]` is a TypeScript type that defines the metadata for a YAAF [Skill](./skill.md). This metadata is typically specified in a YAML block at the beginning of a `.md` skill file. It provides essential information about the skill, such as its name, description, and how it should be injected into an agent's [System Prompt](../concepts/system-prompt.md) [Source 1].

This type is a core part of the `Skill` type, which combines the [Frontmatter](../concepts/frontmatter.md) with the skill's instructional content. Functions like `load[[[[Skills]]]]` parse this frontmatter from files, and it is used by the `SkillRegistry` to manage the collection of available [Skills](../concepts/skills.md) [Source 1].


---

[Next: Signature →](skill-frontmatter-part-2.md) | 
*Part 1 of 3*