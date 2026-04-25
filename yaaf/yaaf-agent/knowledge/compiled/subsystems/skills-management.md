---
summary: Provides mechanisms for defining, loading, and injecting markdown-based skills into agent prompts.
primary_files:
 - src/skills.ts
title: Skills Management
entity_type: subsystem
exports:
 - Skill
 - SkillFrontmatter
 - loadSkills
 - loadSkill
 - defineSkill
 - buildSkillSection
 - SkillRegistry
search_terms:
 - agent capabilities
 - markdown skills
 - dynamic prompt injection
 - how to add knowledge to agent
 - reusable agent instructions
 - skill files
 - SKILL.md format
 - loading skills from directory
 - inline skill definition
 - prompt engineering framework
 - agent instruction management
 - capability packs
stub: false
compiled_at: 2026-04-24T18:19:42.841Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/skills.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The [Skill](../apis/skill.md)s]]]]]]]] Management subsystem provides a mechanism for extending an agent's capabilities and knowledge at runtime without requiring code changes [Source 1]. Skills are defined in markdown files and act as "capability packs" that can be dynamically loaded and injected into an agent's [System Prompt](../concepts/system-prompt.md). This allows for the addition of domain-specific knowledge, constraints, reusable workflows, procedures, and few-shot examples to guide the agent's behavior [Source 1].

## Architecture

The core of the subsystem is the `Skill` data structure. A Skill consists of two main parts: YAML [Frontmatter](../concepts/frontmatter.md) and markdown content [Source 1].

-   **Frontmatter**: A YAML block at the beginning of a skill file that defines metadata such as `name`, `description`, `version`, `tags`, and a boolean `always` flag to control automatic injection [Source 1]. The `SkillFrontmatter` type defines this structure.
-   **Instructions**: The markdown content following the frontmatter, which contains the actual instructions, knowledge, or examples to be provided to the agent [Source 1].

Skills are typically stored as `.md` files in a directory and loaded into the application. If a skill file's frontmatter does not specify a `name`, the filename is used as the default name [Source 1]. The subsystem also includes a `SkillRegistry` class, which provides an event-based interface for managing the lifecycle of skills, including loading, updating, and removal [Source 1].

## Integration Points

The primary integration point for the Skills Management subsystem is the agent's prompt construction process. An array of `Skill` objects can be passed to the `Agent` constructor during initialization [Source 1].

Before an agent interacts with the [LLM](../concepts/llm.md), the `buildSkillSection` function is used to compile the instructions from all relevant skills into a single markdown block. This block is then appended to the agent's base system prompt, effectively augmenting its core instructions with the loaded capabilities [Source 1].

## Key APIs

The public API for this subsystem is exposed through the `src/skills.ts` module [Source 1].

-   **`Skill`**: A type representing a single skill, containing its frontmatter metadata and instruction content.
-   **`defineSkill(skill: Skill): Skill`**: A helper function to define a skill programmatically in code, rather than loading it from a file.
-   **`loadSkill(filePath: string): Promise<Skill>`**: Asynchronously loads and parses a single skill from a specified file path.
-   **`loadSkills(dir: string): Promise<Skill[]>`**: Asynchronously loads all `.md` skill files from a given directory (non-recursively).
-   **`buildSkillSection(skills: Skill[], forcedNames?: string[]): string`**: Compiles the instruction content from a list of skills into a single string formatted for injection into a system prompt. It includes skills where `always` is `true`, plus any skills whose names are provided in the `forcedNames` array. To prevent excessive context usage, the total size of the injected skill block is capped at 64 KB.
-   **`SkillRegistry`**: A class for managing a collection of skills dynamically. It emits events such as `onLoad`, `onRemove`, and `onError` to allow other parts of the system to react to changes in available skills.

## Configuration

Configuration of the Skills Management subsystem occurs in two primary ways:

1.  **Agent Initialization**: Developers provide a list of active skills to an agent via its constructor. This can be done by loading skills from a directory or defining them inline [Source 1].

    ```typescript
    // Load all skills from a directory
    const skills = await loadSkills('./skills');

    const agent = new Agent({
      systemPrompt: 'You are a coding assistant.',
      skills,
    });
    ```

2.  **Skill Frontmatter**: Individual skills are configured via the YAML frontmatter in their respective `.md` files. This allows authors to control metadata and behavior, most notably the `always` flag, which determines if a skill is injected into the prompt by default [Source 1].

    ```yaml
    ---
    name: security-review
    description: OWASP security review checklist
    always: true
    tags: [security, code-review]
    ---
    ## Security Review Protocol
    When reviewing code, always check for...
    ```

## Extension Points

The primary method for extending the system with new capabilities is by authoring new skill files. Developers can create new `.md` files containing domain-specific knowledge, [Tools](./tools.md), or procedures and place them in the designated skills directory to be loaded by the framework [Source 1].

## Sources

[Source 1]: src/skills.ts