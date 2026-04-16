---
title: loadSkills
entity_type: api
summary: Asynchronously loads all markdown skill files from a specified directory.
export_name: loadSkills
source_file: src/skills.ts
category: function
stub: false
compiled_at: 2026-04-16T14:36:09.316Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/skills.ts
confidence: 0.9
---

## Overview
`loadSkills` is a utility function used to ingest markdown-based capability packs (Skills) from the local filesystem. It scans a specified directory for `.md` files, parses their frontmatter and content, and returns an array of `Skill` objects. 

This function is typically used during agent initialization to populate an agent's instructions with domain knowledge, reusable workflows, or few-shot demonstrations stored as external files. It performs a non-recursive search of the target directory. If a markdown file lacks a `name` field in its frontmatter, the function defaults to using the filename as the skill's name.

## Signature / Constructor

```typescript
export async function loadSkills(dir: string): Promise<Skill[]>;
```

### Parameters
- `dir`: A string representing the path to the directory containing skill markdown files.

### Return Type
The function returns a `Promise` that resolves to an array of `Skill` objects.

### Related Types
The `Skill` object returned by this function is defined as:

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

### Loading Skills for an Agent
This example demonstrates how to load skills from a local directory and provide them to a new agent instance.

```typescript
import { loadSkills, Agent } from 'yaaf';

async function initializeAgent() {
  // Load all skills from the './skills' directory
  const skills = await loadSkills('./skills');

  const agent = new Agent({
    systemPrompt: 'You are a coding assistant.',
    skills,
  });

  // The agent's effective system prompt will now include 
  // the base prompt plus all loaded skill instructions.
}
```

## See Also
- `loadSkill`: Loads a single skill from a specific file path.
- `defineSkill`: Defines a skill object inline without filesystem access.
- `SkillRegistry`: A class for managing and watching skill updates.