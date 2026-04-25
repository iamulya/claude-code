---
summary: Learn how to define, load, and integrate markdown-based skills to extend your YAAF agent's capabilities.
title: How to use Skills in YAAF Agents
entity_type: guide
difficulty: beginner
search_terms:
 - add capabilities to agent
 - extend agent prompt
 - markdown skills for LLM
 - YAAF skill definition
 - load skills from directory
 - inline skill definition
 - dynamic agent instructions
 - reusable agent workflows
 - few-shot examples for agents
 - what is a YAAF skill
 - buildSkillSection usage
 - SkillRegistry
 - agent system prompt injection
 - manage agent knowledge
stub: false
compiled_at: 2026-04-24T18:07:29.739Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/skills.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

This guide demonstrates how to extend a YAAF agent's capabilities using [[]]s]]. [Skill](../apis/skill.md)s]]]]]]]] are markdown-based documents that add domain knowledge, constraints, or reusable procedures to an agent's [System Prompt](../concepts/system-prompt.md) without requiring code changes [Source 1].

By following this guide, you will learn how to:
1.  Create a Skill as a markdown file with [Frontmatter](../concepts/frontmatter.md).
2.  Load one or more Skills from a directory.
3.  Integrate the loaded Skills into an agent's configuration.
4.  Define a Skill directly in code for simpler use cases.

## Step-by-Step

### Step 1: Create a Skill File

A Skill is defined in a `.md` file containing YAML frontmatter followed by markdown content [Source 1]. The markdown content serves as the instructions that will be injected into the agent's system prompt.

Create a directory named `skills` in your project root. Inside this directory, create a file named `code-review.md` with the following content:

```markdown
---
name: "code-review"
description: "A skill for performing a high-level code review."
version: "1.0"
always: true
tags:
  - "engineering"
  - "quality"
---

## Code Review Protocol

when asked to review code, follow these steps:

1.  **Clarity:** Is the code easy to understand? Are variable names clear?
2.  **Correctness:** Does the code do what it's intended to do? Are there obvious bugs?
3.  **Best Practices:** Does the code adhere to common language and framework best practices?
```

The frontmatter defines the skill's metadata, and the content below the `---` block provides the instructions for the agent [Source 1].

### Step 2: Load Skills from a Directory

YAAF provides a utility function, `loadSkills`, to load all valid skill files from a specified directory. This function reads each `.md` file, parses its frontmatter, and returns an array of `Skill` objects [Source 1].

In your agent's setup file, use the following code to load all skills from the `./skills` directory:

```typescript
import { loadSkills } from 'yaaf-agent'; // Assuming yaaf-agent is the package name

async function initializeSkills() {
  try {
    const skills = await loadSkills('./skills');
    console.log('Successfully loaded skills:', skills.map(s => s.name));
    return skills;
  } catch (error) {
    console.error('Failed to load skills:', error);
    return [];
  }
}

// You will use the result of this function in the next step.
```

### Step 3: Integrate Skills with an Agent

Once the skills are loaded, pass them to the `Agent` constructor via the `skills` property. The agent will automatically use the `buildSkillSection` utility to append the instructions from all `always: true` skills to its base system prompt [Source 1].

```typescript
import { Agent } from 'yaaf-agent';
import { loadSkills } from 'yaaf-agent';

async function createAgentWithSkills() {
  // Load skills from the directory
  const skills = await loadSkills('./skills');

  // Create the agent instance
  const agent = new Agent({
    systemPrompt: 'You are a senior software engineer assistant.',
    skills, // Pass the loaded skills here
  });

  // The agent's effective system prompt now includes the Code Review Protocol.
  return agent;
}
```

### Step 4: Define a Skill Inline (Optional)

For simple or dynamically generated skills, you can define them directly in your code using the `defineSkill` function, bypassing the need for a separate `.md` file [Source 1].

```typescript
import { Agent, defineSkill } from 'yaaf-agent';

// Define a skill programmatically
const securitySkill = defineSkill({
  name: 'security-review',
  description: 'OWASP security review checklist',
  always: true,
  instructions: `
## Security Review Protocol
when reviewing code, always check for:
1. SQL injection vulnerabilities
2. Cross-Site Scripting (XSS) vulnerabilities
3. Insecure direct object references
`,
});

// Use the inline skill when creating an agent
const agent = new Agent({
  systemPrompt: 'You are a security-focused coding assistant.',
  skills: [securitySkill],
});
```

## Configuration Reference

[when](../apis/when.md) creating a skill, either in a markdown file's frontmatter or with `defineSkill`, the following properties are available [Source 1]:

| Field         | Type      | Default | Description                                                              |
|---------------|-----------|---------|--------------------------------------------------------------------------|
| `name`        | `string`  |         | **Required.** The display name for the skill. Used as a fallback from the filename if not provided in a file. |
| `description` | `string`  |         | A short description shown in skill listings.                             |
| `version`     | `string`  |         | A version string for the skill (e.g., "1.0.0").                           |
| `always`      | `boolean` | `true`  | If `true`, the skill's instructions are always injected into the system prompt. |
| `tags`        | `string[]`|         | A list of tags for filtering and organization.                           |

## Common Mistakes

1.  **Forgetting the `name` field:** While `loadSkills` will use the filename as a fallback, it is best practice to explicitly define the `name` in the frontmatter for clarity and consistency [Source 1].
2.  **Creating excessively large skills:** The total size of all injected skill instructions is capped at 64 KB to prevent excessive [Context Window](../concepts/context-window.md) consumption. Keep skill instructions concise and focused [Source 1].
3.  **Incorrect Directory Path:** When using `loadSkills`, a common error is providing an incorrect relative path to the skills directory, leading to an empty array of skills being loaded. Ensure the path is correct relative to the process's current working directory.

## Sources

[Source 1] src/skills.ts