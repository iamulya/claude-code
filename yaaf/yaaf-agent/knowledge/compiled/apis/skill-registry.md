---
summary: Manages the collection of YAAF skills, providing methods for loading, defining, and accessing them.
export_name: SkillRegistry
source_file: src/skills.ts
category: class
title: SkillRegistry
entity_type: api
search_terms:
 - manage agent skills
 - load skills from directory
 - define inline skills
 - skill collection
 - agent capabilities
 - runtime instruction extension
 - skill lifecycle management
 - hot-reloading skills
 - skill events
 - onLoad skill
 - onRemove skill
 - skill error handling
 - YAAF skill management
stub: false
compiled_at: 2026-04-24T17:38:00.545Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/skills.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `SkillRegistry` class is responsible for managing a collection of `Skill` objects within a YAAF agent [Source 1]. [Skills](../concepts/skills.md) are markdown-based capability packs that extend an agent's instructions at runtime without requiring code changes. They can be used to add domain knowledge, define reusable procedures, or provide few-shot demonstrations to the agent's [System Prompt](../concepts/system-prompt.md) [Source 1].

The registry centralizes the lifecycle of Skills, including loading, updating, and removal, and emits events to notify other parts of the system about these changes [Source 1].

## Signature / Constructor

The source material provides the class declaration but does not include the constructor signature or its parameters [Source 1].

```typescript
export class SkillRegistry { /* ... */ }
```

## Methods & Properties

The provided source material does not detail the public methods or properties of the `SkillRegistry` class [Source 1].

## Events

A `SkillRegistry` instance can emit events related to the lifecycle of Skills. These events can be subscribed to via a configuration object of type `SkillRegistryEvents` [Source 1].

```typescript
export type SkillRegistryEvents = {
  /** Called [[[[[[[[when]]]]]]]] a [[Skill]] is loaded or updated */
  onLoad?: ([[Skill]]: Skill) => void;
  /** Called when a [[Skill]] is removed */
  onRemove?: (name: string) => void;
  /** Called when an error occurs during watch/reload */
  onError?: (error: Error, filePath: string) => void;
};
```

- **`onLoad`**: Fired when a new [Skill](./skill.md) is loaded or an existing one is updated. The payload is the `Skill` object itself.
- **`onRemove`**: Fired when a skill is removed from the registry. The payload is the `name` of the removed skill.
- **`onError`**: Fired if an error occurs during file watching or reloading of a skill from disk. The payload includes the `Error` object and the `filePath` of the file that caused the error.

## Examples

While the source material does not provide a direct example of instantiating `SkillRegistry`, it shows how to create the `Skill` objects that a registry would manage [Source 1].

### Loading Skills from a Directory

The `loadSkills` function can be used to load all `.md` skill files from a specified directory. These skills can then be passed to an agent, which would likely use a `SkillRegistry` internally.

```typescript
// Load all skills from a directory
const skills = await loadSkills('./skills');

const agent = new Agent({
  systemPrompt: 'You are a coding assistant.',
  skills,
});

// The agent's effective system prompt = base + all skill injections
```

### Defining a Skill Inline

The `defineSkill` function allows for creating a `Skill` object directly in code without a corresponding file.

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
```

## Sources

[Source 1]: src/skills.ts