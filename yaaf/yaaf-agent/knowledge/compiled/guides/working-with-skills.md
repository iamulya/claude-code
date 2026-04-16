---
title: Working with Skills
entity_type: guide
summary: How to create, load, and use markdown-based skills to extend agent capabilities.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:36:20.931Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/skills.ts
confidence: 0.85
---

## Overview
Skills in YAAF are markdown-based capability packs that extend an agent's instructions at runtime without requiring code changes. They allow developers to inject domain knowledge, specific constraints, reusable workflows, and few-shot demonstrations directly into an agent's system prompt.

By the end of this guide, you will be able to:
1. Create skill files using the `.md` format.
2. Load skills from the file system or define them inline.
3. Attach skills to an agent to modify its behavior.

## Prerequisites
- A TypeScript project with YAAF installed.
- Basic familiarity with YAML frontmatter and Markdown.

## Step-by-Step

### 1. Create a Skill File
Skills are typically stored as `.md` files. Each file must contain a YAML frontmatter block to define its metadata.

Create a file named `skills/security-review.md`:
```markdown
---
name: security-review
description: OWASP security review checklist
version: 1.0.0
always: true
tags: [security, review]
---

## Security Review Protocol
When reviewing code, always check for:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
3. Insecure dependency versions
4. Hardcoded secrets or API keys
```

### 2. Load Skills from a Directory
Use the `loadSkills` function to import all markdown files from a specific directory. This function is non-recursive.

```typescript
import { loadSkills } from 'yaaf';

async function initializeSkills() {
  // Loads all .md files in the ./skills directory
  const skills = await loadSkills('./skills');
  return skills;
}
```

### 3. Define an Inline Skill
If you do not want to use the file system, you can define skills directly in your code using `defineSkill`.

```typescript
import { defineSkill } from 'yaaf';

const loggingSkill = defineSkill({
  name: 'structured-logging',
  description: 'Ensures the agent outputs logs in JSON format',
  instructions: `
## Logging Requirements
All operational logs must be formatted as valid JSON objects containing 'level', 'message', and 'timestamp'.
  `,
  always: true
});
```

### 4. Attach Skills to an Agent
When instantiating an `Agent`, provide the array of skills. The framework automatically builds the effective system prompt by appending the skill instructions to the base `systemPrompt`.

```typescript
import { Agent, loadSkills } from 'yaaf';

async function startAgent() {
  const skills = await loadSkills('./skills');
  
  const agent = new Agent({
    systemPrompt: 'You are a senior software engineer.',
    skills: [
      ...skills,
      loggingSkill // Adding the inline skill defined in step 3
    ],
  });

  // The agent now operates with the combined instructions of the 
  // base prompt and all loaded skills.
}
```

### 5. Manage Skills with SkillRegistry
For more complex applications, use the `SkillRegistry` to manage skill lifecycles and events.

```typescript
import { SkillRegistry } from 'yaaf';

const registry = new SkillRegistry({
  onLoad: (skill) => console.log(`Skill loaded: ${skill.name}`),
  onError: (error, path) => console.error(`Failed to load ${path}:`, error)
});
```

## Configuration Reference

### SkillFrontmatter
These fields are defined in the YAML block at the top of a `.md` file.

| Field | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `name` | `string` | The unique identifier for the skill. | Filename (if loaded from disk) |
| `description` | `string` | A short summary of what the skill does. | `undefined` |
| `version` | `string` | Versioning string for the skill. | `undefined` |
| `always` | `boolean` | If true, the skill is always included in the system prompt. | `true` |
| `tags` | `string[]` | Metadata for filtering or searching skills. | `undefined` |

### Skill Object
The `Skill` type extends `SkillFrontmatter` with the following:

| Field | Type | Description |
| :--- | :--- | :--- |
| `instructions` | `string` | The full markdown content after the frontmatter. |
| `filePath` | `string` | The source path (only present if loaded via `loadSkill` or `loadSkills`). |

## Common Mistakes
1. **Missing Name in Frontmatter**: If the `name` field is missing in the markdown frontmatter, YAAF will fall back to using the filename as the skill name.
2. **Recursive Directory Loading**: `loadSkills` is non-recursive. If you organize skills in subdirectories, they will not be detected unless you call `loadSkills` on each subdirectory.
3. **Skill Injection Logic**: By default, `buildSkillSection` only includes skills where `always` is set to `true`. If a skill is not appearing in the prompt, verify the `always` flag or ensure it is explicitly requested in `forcedNames`.

## Next Steps
- Learn about the `Agent` architecture to see how skills are processed.
- Explore the `SkillRegistry` for advanced event-driven skill management.

## Sources
- `src/skills.ts`