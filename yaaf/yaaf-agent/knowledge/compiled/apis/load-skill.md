---
summary: Asynchronously loads a single YAAF skill from a specified file path.
export_name: loadSkill
source_file: src/skills.ts
category: function
title: loadSkill
entity_type: api
search_terms:
 - load skill from file
 - import skill markdown
 - read skill file
 - skill file loading
 - how to load a single skill
 - asynchronously load skill
 - skill file path
 - parse skill from markdown
 - YAAF skill loading
 - add skill from disk
 - skill file format
stub: false
compiled_at: 2026-04-24T17:19:03.331Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/skills.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `load[[[[[[[[Skill]]]]]]]]` function asynchronously loads a single YAAF Skill from a specified `.md` file on the filesystem [Source 1]. It parses the file, separating the YAML [Frontmatter](../concepts/frontmatter.md) from the markdown content, and returns a `Skill` object.

This function is used [when](./when.md) an application needs to load a specific, known skill by its path, rather than loading all [Skills](../concepts/skills.md) from a directory. Skills are markdown-based capability packs that extend an agent's instructions at runtime, allowing for the addition of domain knowledge, reusable procedures, or few-shot examples without code changes [Source 1].

The resulting `Skill` object can then be passed to an `Agent` constructor or managed by a `SkillRegistry` [Source 1].

## Signature

```typescript
export async function loadSkill(filePath: string): Promise<Skill>;
```

**Parameters:**

*   `filePath` (`string`): The absolute or relative path to the `.md` skill file to be loaded.

**Returns:**

*   `Promise<Skill>`: A promise that resolves to a `Skill` object. The `Skill` object contains the parsed frontmatter (like `name`, `description`, `tags`) as well as the `instructions` content from the body of the markdown file and the original `filePath` [Source 1].

## Examples

### Loading a single skill for an agent

This example demonstrates how to load a specific skill from a file and provide it to a new `Agent` instance.

```typescript
import { loadSkill, Agent } from 'yaaf';
import * as path from 'path';

async function createReviewAgent() {
  try {
    // Define the path to the skill file
    const skillPath = path.join(__dirname, 'skills', 'code-review.md');

    // Load the single skill
    const codeReviewSkill = await loadSkill(skillPath);

    // Initialize an agent with the loaded skill
    const agent = new Agent({
      systemPrompt: 'You are a senior software engineer who reviews code.',
      skills: [codeReviewSkill],
    });

    console.log('Agent created with code review skill:', codeReviewSkill.name);
    // The agent is now ready to use with the skill's instructions
    // integrated into its system prompt.

  } catch (error) {
    console.error('Failed to load skill and create agent:', error);
  }
}

createReviewAgent();
```

## See Also

*   `loadSkills`: For loading all skills from a directory.
*   `defineSkill`: For defining a skill inline as a code object.
*   `SkillRegistry`: A class for managing a collection of skills, including watching files for changes.
*   `Skill`: The type definition for a skill object.

## Sources

[Source 1]: src/skills.ts