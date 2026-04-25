---
title: Skill
summary: Represents a complete YAAF skill, combining frontmatter metadata with its instructional content.
export_name: Skill
source_file: src/skills.ts
category: type
entity_type: api
search_terms:
 - skill definition
 - agent capabilities
 - markdown instructions
 - system prompt extension
 - reusable workflows
 - domain knowledge injection
 - few-shot examples
 - SKILL.md format
 - load skills from directory
 - define skill inline
 - skill frontmatter
 - skill instructions
 - agent instruction packs
stub: false
compiled_at: 2026-04-24T17:37:46.853Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/skills.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/add.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `Skill` type represents a markdown-based capability pack for a YAAF agent. [Skills](../concepts/skills.md) allow developers to extend an agent's instructions, domain knowledge, and constraints at runtime without requiring code changes. They are typically defined in `.md` files with a YAML [Frontmatter](../concepts/frontmatter.md) block [Source 1].

A `Skill` object combines the metadata from its frontmatter (like `name` and `description`) with the main instructional content of the markdown file. These skills are then used to build a "skill injection block" that is appended to the agent's [System Prompt](../concepts/system-prompt.md), effectively augmenting its core instructions [Source 1].

Common use cases for skills include:
- Adding domain-specific knowledge and constraints.
- Defining reusable workflows and standard operating procedures.
- Providing examples and few-shot demonstrations to guide the agent's behavior [Source 1].

## Signature

A `Skill` is a TypeScript type alias that combines `[[[[[[[[SkillFrontmatter]]]]]]]]` with the core instruction content [Source 1].

### SkillFrontmatter
This type defines the metadata for a skill, typically parsed from the YAML frontmatter of a skill's markdown file [Source 1].

```typescript
export type SkillFrontmatter = {
  /** Display name for the skill */
  name: string;
  /** Short description shown in skill listings */
  description?: string;
  /** Version string */
  version?: string;
  /** Whether this skill is always injected (default: true) */
  always?: boolean;
  /** List of tags for filtering/search */
  tags?: string[];
};
```

### Skill
This is the complete type for a skill object [Source 1].

```typescript
export type Skill = SkillFrontmatter & {
  /** The full instruction content (after frontmatter) */
  instructions: string;
  /** Source file path, if loaded from disk */
  filePath?: string;
};
```

## Examples

### Inline Skill Definition

A skill can be defined directly in code without a corresponding markdown file using the `defineSkill` helper function [Source 1].

```typescript
// Inline skill definition
const securitySkill = defineSkill({
  name: 'security-review',
  description: 'OWASP security review checklist',
  instructions: `
## Security Review Protocol
When reviewing code, always check for:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
...`,
});
```

### Loading Skills for an Agent

Skills are commonly loaded from a directory and passed to an `Agent`'s constructor. The agent's effective system prompt becomes a combination of its base prompt and the injected skill instructions [Source 1].

```typescript
// Load all skills from a directory
const skills = await loadSkills('./skills');

const agent = new Agent({
  systemPrompt: 'You are a coding assistant.',
  skills,
});

// The agent's effective system prompt = base + all skill injections
```

## See Also

- `loadSkills`: A function to load all skills from a directory.
- `defineSkill`: A helper function to define a `Skill` object inline.
- `buildSkillSection`: A function to construct the text block injected into the system prompt from a list of skills.
- `SkillRegistry`: A class for managing a collection of skills, including watching for file changes.

## Sources

[Source 1]: src/skills.ts
[Source 2]: src/[CLI](../subsystems/cli.md)/add.ts