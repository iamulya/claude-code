---
summary: Markdown-based capability packs that extend an agent's instructions at runtime without code changes.
title: Skills
entity_type: concept
search_terms:
 - agent capabilities
 - runtime instruction modification
 - markdown skills
 - extend system prompt
 - domain knowledge injection
 - reusable agent workflows
 - few-shot examples for agents
 - YAAF skill files
 - SKILL.md format
 - dynamic agent configuration
 - how to add knowledge to an agent
 - agent instruction management
stub: false
compiled_at: 2026-04-24T18:02:07.723Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/skills.ts
compiled_from_quality: unknown
confidence: 0.98
---

## What It Is

A [Skill](../apis/skill.md) in YAAF is a markdown-based capability pack that extends an agent's instructions at runtime without requiring code changes [Source 1]. Skills serve as a mechanism to modularize and manage an agent's knowledge and operational procedures. They allow developers to augment the agent's core [System Prompt](./system-prompt.md) with additional context, rules, and examples dynamically [Source 1].

The primary purposes of Skills are to:
*   **Add domain knowledge and constraints:** Inject specific information, terminology, or rules relevant to a particular task or domain.
*   **Define reusable workflows:** Document multi-step procedures or protocols for the agent to follow.
*   **Provide examples and few-shot demonstrations:** Guide the agent's behavior and output format through concrete examples [Source 1].

## How It Works in YAAF

Skills are typically defined in `.md` files, each containing a YAML [Frontmatter](./frontmatter.md) block followed by markdown content [Source 1].

A Skill is represented by the `Skill` type, which includes frontmatter fields and the instruction content. The frontmatter can contain the following fields:
*   `name`: A required display name for the skill. If a skill is loaded from a file that lacks this field, the filename is used as the name.
*   `description`: A short description for display in listings.
*   `version`: A version string for the skill.
*   `always`: A boolean that determines if the skill is always injected into the prompt. It defaults to `true`.
*   `tags`: A list of strings for filtering and organization [Source 1].

The markdown content following the frontmatter constitutes the `instructions` property of the Skill object [Source 1].

At runtime, the framework uses the `buildSkillSection` function to assemble the `instructions` from multiple Skills into a single text block. This block is then appended to the agent's base system prompt. By default, only Skills with `always` set to `true` are included, but this can be overridden by providing a list of `forcedNames`. To prevent excessive [Context Window](./context-window.md) consumption, the total size of the injected skill block is capped at 64 KB [Source 1].

Skills can be loaded from a directory using `loadSkills` or defined inline as objects using `defineSkill`. The `SkillRegistry` class provides a higher-level abstraction for managing skills, including dynamic loading, updating, and removal [Source 1].

## Configuration

Skills can be configured either by creating markdown files in a directory or by defining them directly in code.

### File-based Skill

A skill can be defined in a markdown file, such as `./skills/security-review.md`:

```markdown
---
name: security-review
description: OWASP security review checklist
tags:
  - security
  - code-review
always: true
---
## Security Review Protocol
When reviewing code, always check for:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
...
```

### Loading and Usage

Skills are loaded and passed to an agent during its initialization.

```typescript
// Load all skills from a directory
const skills = await loadSkills('./skills');

const agent = new Agent({
  systemPrompt: 'You are a coding assistant.',
  skills,
});

// The agent's effective system prompt will be the base prompt
// followed by the content of all loaded skills.
```
[Source 1]

### Inline Skill Definition

For simple or dynamically generated skills, the `defineSkill` function can be used:

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

const agent = new Agent({
  systemPrompt: 'You are a coding assistant.',
  skills: [securitySkill],
});
```
[Source 1]

## Sources
[Source 1] src/skills.ts