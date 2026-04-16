---
title: Skill System
entity_type: subsystem
summary: The architectural component responsible for loading, managing, and injecting markdown-based skills into agent system prompts.
primary_files:
  - src/skills.ts
exports:
  - Skill
  - SkillRegistry
  - loadSkills
  - defineSkill
  - buildSkillSection
stub: false
compiled_at: 2026-04-16T14:36:00.264Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/skills.ts
confidence: 0.9
---

## Purpose
The Skill System provides a mechanism for extending an agent's capabilities and instructions at runtime without requiring code changes. It allows developers to package domain knowledge, specific constraints, reusable workflows, and few-shot demonstrations into discrete markdown-based "capability packs." These skills are injected into the agent's system prompt to modify its behavior or provide specialized expertise for specific tasks.

## Architecture
The subsystem is built around a markdown-based format where instructions are paired with metadata defined in YAML frontmatter.

### Data Model
The core data structure is the `Skill`, which combines `SkillFrontmatter` with raw instruction content:
*   **SkillFrontmatter**: Contains metadata such as `name`, `description`, `version`, and `tags`. It also includes an `always` boolean flag which determines if the skill should be automatically included in prompt construction.
*   **Skill**: Represents the complete object, including the `instructions` (the body of the markdown file) and an optional `filePath` if the skill was loaded from the file system.

### Skill Registry
The `SkillRegistry` class manages the lifecycle of skills within an application. It supports event-driven updates through `SkillRegistryEvents`, allowing the system to react when skills are loaded, updated, removed, or when errors occur during file watching and reloading.

## Integration Points
The Skill System integrates primarily with the agent's prompt generation logic. When an agent is initialized, it can be provided with an array of skills. The framework then uses the `buildSkillSection` utility to append these instructions to the base system prompt, creating an "effective system prompt" that combines core instructions with active skills.

## Key APIs
The subsystem exports several functions for managing skills both from the file system and programmatically:

*   `loadSkills(dir: string)`: Asynchronously loads all `.md` files from a specified directory.
*   `loadSkill(filePath: string)`: Loads a single skill from a specific file path.
*   `defineSkill(skill: Skill)`: Allows for the inline, programmatic definition of a skill without requiring a physical file.
*   `buildSkillSection(skills: Skill[], forcedNames?: string[])`: Aggregates the instructions from the provided skills into a single string block for prompt injection.

```typescript
// Example of defining a skill inline
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

## Configuration
Skills are configured primarily through their markdown frontmatter. The `always` field is a key configuration point:
*   If `always` is `true` (default), the skill is injected into the system prompt automatically.
*   If `always` is `false`, the skill is only injected if its name is explicitly included in the `forcedNames` parameter of the `buildSkillSection` call.

## Extension Points
Developers can extend the behavior of the Skill System through the `SkillRegistryEvents` interface. This allows for custom logic during the skill lifecycle:

*   **onLoad**: Triggered when a skill is first loaded or updated on disk.
*   **onRemove**: Triggered when a skill is deleted from the registry.
*   **onError**: Triggered during failures in the file system watching or reloading process.