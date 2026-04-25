---
summary: Creates a YAAF skill definition programmatically, without requiring a file.
export_name: defineSkill
source_file: src/skills.ts
category: function
title: defineSkill
entity_type: api
search_terms:
 - create skill inline
 - programmatic skill definition
 - define agent capabilities in code
 - how to add instructions to an agent
 - dynamic skill creation
 - skill without markdown file
 - runtime agent instructions
 - YAAF skill object
 - agent capability factory
 - in-memory skill
stub: false
compiled_at: 2026-04-24T17:01:11.765Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/skills.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `defineSkill` function is a factory for creating a `Skill` object in [Memory](../concepts/memory.md). It allows for the programmatic definition of an agent's capabilities without needing to create and load a corresponding `.md` file from the filesystem [Source 1].

This is useful for defining [Skills](../concepts/skills.md) dynamically at runtime, for Skills that are generated based on application state, or for simple Skills where managing a separate file would be inconvenient. The resulting `Skill` object can be passed directly to an `Agent` constructor or a `SkillRegistry` [Source 1].

## Signature

The function takes a single argument, an object conforming to the `Skill` type, and returns it [Source 1].

```typescript
export function defineSkill([[Skill]]: Skill): Skill;
```

### Parameters

The `[[Skill]]` parameter is an object with the following structure [Source 1]:

```typescript
export type Skill = {
  /** Display name for the [[Skill]] */
  name: string;

  /** Short description shown in [[Skill]] listings */
  description?: string;

  /** Version string */
  version?: string;

  /** Whether this skill is always injected (default: true) */
  always?: boolean;

  /** List of tags for filtering/search */
  tags?: string[];

  /** The full instruction content (after frontmatter) */
  instructions: string;

  /** Source file path, if loaded from disk */
  filePath?: string;
};
```

- **`name`** (string, required): The display name for the skill.
- **`instructions`** (string, required): The full content of the skill's instructions that will be injected into the agent's [System Prompt](../concepts/system-prompt.md).
- **`description`** (string, optional): A short description shown in skill listings.
- **`version`** (string, optional): A version string for the skill.
- **`always`** (boolean, optional): If `true` (the default), the skill is always injected into the system prompt. If `false`, it must be explicitly requested.
- **`tags`** (string[], optional): A list of tags for filtering and searching skills.
- **`filePath`** (string, optional): This field is typically used [when](./when.md) a skill is loaded from disk via `loadSkill` and is not usually set when using `defineSkill`.

## Examples

The following example demonstrates how to define a skill inline for performing a security review checklist and pass it to an agent [Source 1].

```typescript
import { Agent, defineSkill } from 'yaaf';

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

const agent = new Agent({
  systemPrompt: 'You are a senior security engineer.',
  skills: [securitySkill],
});

// The agent's effective system prompt will now include the security review protocol.
```

## Sources

[Source 1]: src/skills.ts