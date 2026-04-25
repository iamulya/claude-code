---
summary: Constructs the markdown block containing skill instructions to be appended to an agent's system prompt.
export_name: buildSkillSection
source_file: src/skills.ts
category: function
title: buildSkillSection
entity_type: api
search_terms:
 - add skills to system prompt
 - construct skill instructions
 - agent prompt engineering
 - dynamically add instructions
 - skill injection block
 - how to use skills
 - force skill inclusion
 - system prompt context limit
 - skill markdown generation
 - combine multiple skills
 - YAAF skills
 - what is a skill section
stub: false
compiled_at: 2026-04-24T16:53:46.401Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/skills.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `build[[[[[[[[Skill]]]]]]]]Section` function compiles an array of `Skill` objects into a single markdown string suitable for injection into an agent's [System Prompt](../concepts/system-prompt.md) [Source 1]. This allows an agent's capabilities and instructions to be extended dynamically.

By default, the function includes only those [Skills](../concepts/skills.md) where the `always` property in their [Frontmatter](../concepts/frontmatter.md) is set to `true` (which is the default if unspecified). This behavior can be overridden by providing an array of Skill names to the optional `forcedNames` parameter, which will cause those specific skills to be included regardless of their `always` status [Source 1].

To prevent excessive context consumption in the [LLM](../concepts/llm.md), the total size of the generated skill block is capped at 64 KB. If the combined instructions exceed this limit, the output will be truncated [Source 1].

## Signature

```typescript
export function buildSkillSection(
  skills: Skill[],
  forcedNames?: string[]
): string;
```

**Parameters:**

*   `skills`: `Skill[]`
    *   An array of `Skill` objects to be considered for inclusion.
*   `forcedNames`: `string[]` (optional)
    *   An array of skill names to include in the output, even if their `always` property is `false`.

**Returns:**

*   `string`
    *   A single markdown-formatted string containing the instructions from all selected skills.

## Examples

### Basic Usage

This example demonstrates how `buildSkillSection` includes skills that are always active by default.

```typescript
import { defineSkill, buildSkillSection } from 'yaaf';

const codingSkill = defineSkill({
  name: 'coder',
  description: 'General coding conventions',
  instructions: 'Write clean, well-commented code.',
  // 'always' is true by default
});

const reviewSkill = defineSkill({
  name: 'reviewer',
  description: 'Code review guidelines',
  instructions: 'Review code for clarity and correctness.',
  always: false, // This skill is not included by default
});

const skills = [codingSkill, reviewSkill];

// Only the 'coder' skill will be included in the output
const skillSection = buildSkillSection(skills);

console.log(skillSection);
/*
Output will contain the instructions from codingSkill:
---
## Skill: coder
General coding conventions

Write clean, well-commented code.
---
*/
```

### Forcing Specific Skills

This example shows how to use the `forcedNames` parameter to include a skill that is not marked as `always: true`.

```typescript
import { defineSkill, buildSkillSection } from 'yaaf';

const codingSkill = defineSkill({
  name: 'coder',
  instructions: 'Write clean, well-commented code.',
});

const reviewSkill = defineSkill({
  name: 'reviewer',
  instructions: 'Review code for clarity and correctness.',
  always: false,
});

const skills = [codingSkill, reviewSkill];

// Force the 'reviewer' skill to be included
const skillSection = buildSkillSection(skills, ['reviewer']);

console.log(skillSection);
/*
Output will contain instructions from both skills:
---
## Skill: coder

Write clean, well-commented code.
---
## Skill: reviewer

Review code for clarity and correctness.
---
*/
```

## See Also

*   `defineSkill`: A helper function to define a `Skill` object inline.
*   `loadSkills`: A function to load skills from a directory of markdown files.
*   `SkillRegistry`: A class for managing a collection of skills, including watching for file changes.

## Sources

[Source 1]: src/skills.ts