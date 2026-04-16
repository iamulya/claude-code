---
title: Skill
entity_type: api
summary: The core data structure representing a markdown-based capability pack, including frontmatter metadata and instruction content.
export_name: Skill
source_file: src/skills.ts
category: type
stub: false
compiled_at: 2026-04-16T14:36:03.827Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/skills.ts
confidence: 0.95
---

## Overview
A `Skill` is a markdown-based capability pack used to extend an agent's instructions at runtime without requiring code changes. Skills serve as modular units of behavior that can inject domain knowledge, constraints, reusable workflows, and few-shot demonstrations into an agent's system prompt.

In practice, a Skill typically originates from a `.md` file containing YAML frontmatter for metadata and markdown content for the instructions. When an agent is initialized with a collection of skills, the framework aggregates their instruction blocks to form the effective system prompt.

## Signature / Constructor
The `Skill` entity is a TypeScript type that combines metadata (frontmatter) with the core instruction content.

```typescript
export type Skill = SkillFrontmatter & {
  /** The full instruction content (after frontmatter) */
  instructions: string
  /** Source file path, if loaded from disk */
  filePath?: string
}

export type SkillFrontmatter = {
  /** Display name for the skill */
  name: string
  /** Short description shown in skill listings */
  description?: string
  /** Version string */
  version?: string
  /** Whether this skill is always injected (default: true) */
  always?: boolean
  /** List of tags for filtering/search */
  tags?: string[]
}
```

## Methods & Properties
As a type definition, `Skill` exposes the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The unique identifier or display name for the skill. |
| `instructions` | `string` | The actual markdown content that will be injected into the agent's prompt. |
| `description` | `string` | (Optional) A brief summary of the skill's purpose. |
| `version` | `string` | (Optional) Versioning information for the skill pack. |
| `always` | `boolean` | (Optional) If `true` (default), the skill is automatically included in the system prompt. |
| `tags` | `string[]` | (Optional) Metadata tags used for filtering or searching within a registry. |
| `filePath` | `string` | (Optional) The filesystem path from which the skill was loaded. |

## Examples

### Loading Skills from Disk
Skills are commonly stored as markdown files and loaded into an agent during initialization.

```typescript
import { Agent, loadSkills } from 'yaaf';

// Load all skills from a directory
const skills = await loadSkills('./skills');

const agent = new Agent({
  systemPrompt: 'You are a coding assistant.',
  skills,
});

// The agent's effective system prompt = base + all skill injections
```

### Defining an Inline Skill
Skills can also be defined programmatically using the `defineSkill` helper.

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
3. Insecure direct object references`,
});
```

## See Also
- `loadSkills`: Function to load multiple skills from a directory.
- `loadSkill`: Function to load a single skill from a file.
- `defineSkill`: Factory function for creating inline skill objects.
- `SkillRegistry`: Class for managing and watching skill collections.