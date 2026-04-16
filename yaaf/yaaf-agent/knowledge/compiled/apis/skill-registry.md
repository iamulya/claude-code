---
title: SkillRegistry
entity_type: api
summary: A class for managing a collection of skills, supporting loading, updating, and event-driven notifications.
export_name: SkillRegistry
source_file: src/skills.ts
category: class
stub: false
compiled_at: 2026-04-16T14:36:16.555Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/skills.ts
confidence: 0.95
---

## Overview
The `SkillRegistry` class is a central container for managing "Skills"—markdown-based capability packs that extend an agent's instructions at runtime. Skills allow developers to add domain knowledge, define reusable workflows, and provide few-shot demonstrations without changing application code. 

A skill consists of a markdown file with YAML frontmatter and instruction content. The registry facilitates the lifecycle of these skills, including loading them from the filesystem or defining them inline, and provides an event-driven system for responding to skill updates or removals.

## Signature / Constructor
```typescript
export class SkillRegistry
```

## Events
The `SkillRegistry` utilizes the `SkillRegistryEvents` type to handle lifecycle notifications:

| Event | Payload Type | Description |
| :--- | :--- | :--- |
| `onLoad` | `(skill: Skill) => void` | Triggered when a skill is successfully loaded or updated. |
| `onRemove` | `(name: string) => void` | Triggered when a skill is removed from the registry. |
| `onError` | `(error: Error, filePath: string) => void` | Triggered when an error occurs during file watching or reloading. |

## Examples

### Loading Skills from a Directory
Skills can be loaded from a directory and passed to an agent configuration. The agent's effective system prompt becomes a combination of its base prompt and the injected skill instructions.

```typescript
import { loadSkills, Agent } from 'yaaf';

// Load all skills from a directory
const skills = await loadSkills('./skills');

const agent = new Agent({
  systemPrompt: 'You are a coding assistant.',
  skills,
});

// The agent's effective system prompt = base + all skill injections
```

### Defining an Inline Skill
Skills can also be defined programmatically using the `defineSkill` utility.

```typescript
import { defineSkill } from 'yaaf';

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

## See Also
### Related Types
* **Skill**: An object containing `SkillFrontmatter` and the full `instructions` string.
* **SkillFrontmatter**: Metadata for a skill, including `name`, `description`, `version`, `always` (boolean), and `tags`.

### Related Functions
* **loadSkills(dir: string)**: Loads all `.md` skill files from a directory.
* **loadSkill(filePath: string)**: Loads a single skill from a specific file path.
* **defineSkill(skill: Skill)**: Defines a skill inline.
* **buildSkillSection(skills: Skill[], forcedNames?: string[])**: Generates the markdown block used for system prompt injection.

### Sources
* `src/skills.ts`