---
title: defineSkill
entity_type: api
summary: A utility function to define a skill inline within code rather than loading from a file.
export_name: defineSkill
source_file: src/skills.ts
category: function
stub: false
compiled_at: 2026-04-16T14:36:11.094Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/skills.ts
confidence: 0.9
---

## Overview
`defineSkill` is a utility function used to programmatically define a skill within TypeScript code. While YAAF typically loads skills from markdown files on disk, `defineSkill` allows developers to create skills dynamically or hardcode them within the application logic.

Skills are markdown-based capability packs that extend an agent's instructions at runtime. They can provide domain knowledge, define reusable workflows, or offer few-shot demonstrations. Using `defineSkill` returns a `Skill` object that can be passed directly to an agent's configuration.

## Signature / Constructor

```typescript
export function defineSkill(skill: Skill): Skill;
```

### Input Types

The function accepts a `Skill` object, which combines `SkillFrontmatter` with instruction content:

```typescript
export type Skill = SkillFrontmatter & {
  /** The full instruction content (after frontmatter) */
  instructions: string;
  /** Source file path, if loaded from disk */
  filePath?: string;
};

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

## Examples

### Inline Skill Definition
This example demonstrates how to define a security-focused skill and provide it to an agent.

```typescript
import { defineSkill, Agent } from 'yaaf';

const securitySkill = defineSkill({
  name: 'security-review',
  description: 'OWASP security review checklist',
  always: true,
  instructions: `
## Security Review Protocol
When reviewing code, always check for:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
3. Broken authentication
`,
});

const agent = new Agent({
  systemPrompt: 'You are a coding assistant.',
  skills: [securitySkill],
});
```

## See Also
- `loadSkill`: Load a single skill from a markdown file.
- `loadSkills`: Load all skills from a directory.
- `SkillRegistry`: A class for managing and watching skill collections.