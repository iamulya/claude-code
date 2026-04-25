---
summary: Manages the definition, loading, and application of agent personalities (Souls) to separate identity from task instructions.
primary_files:
 - src/agents/soul.ts
title: Agent Personality System
entity_type: subsystem
exports:
 - Soul
 - createSoul
 - loadSoul
 - parseSoulMd
 - applySoul
search_terms:
 - agent identity
 - SOUL.md
 - separating personality from instructions
 - how to define agent character
 - load agent personality from file
 - create agent persona
 - system prompt preamble
 - agent guardrails
 - behavioral rules for agents
 - OpenClaw SOUL.md
 - agent tone of voice
 - applying a soul to a prompt
stub: false
compiled_at: 2026-04-25T00:27:54.433Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/soul.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Agent Personality System provides a mechanism to separate an agent's core identity from its task-specific instructions [Source 1]. This approach, inspired by OpenClaw's `SOUL.md` concept, allows developers to define *who* an agent is (its personality, name, tone, and behavioral rules) independently of *what* the agent is currently doing. This separation improves modularity and reusability of agent personas across different tasks [Source 1].

## Architecture

The central component of this subsystem is the [Soul](../apis/soul.md) data structure. A [Soul](../apis/soul.md) object encapsulates all aspects of an agent's personality, including its name, core personality description, communication tone, behavioral rules, user-specific preferences, and any other custom attributes defined in custom sections [Source 1].

Souls can be created in two ways:
1.  **Programmatically**: Using the [createSoul](../apis/create-soul.md) factory function to construct a [Soul](../apis/soul.md) object in code.
2.  **From a file**: By loading a specially formatted Markdown file (conventionally named `SOUL.md`) using the [loadSoul](../apis/load-soul.md) function. This function reads the file and uses [parseSoulMd](../apis/parse-soul-md.md) internally to convert the content into a [Soul](../apis/soul.md) object [Source 1].

The file format for a `SOUL.md` file combines YAML frontmatter for structured metadata (like `name` and `tone`) with Markdown sections for descriptive content (like `Personality` and `Rules`) [Source 1].

Once a [Soul](../apis/soul.md) object is obtained, it is applied to a task-specific [System Prompt](../concepts/system-prompt.md) using the [applySoul](../apis/apply-soul.md) function. This function prepends the agent's identity information to the task instructions, creating a complete prompt that informs the LLM of both its persona and its objective [Source 1].

## Integration Points

The Agent Personality System primarily integrates with any part of the framework responsible for constructing a [System Prompt](../concepts/system-prompt.md) before an LLM call, such as the [Agent Core](./agent-core.md). The [applySoul](../apis/apply-soul.md) function is the key integration point, used to prepend the defined personality onto a set of task instructions to form the final, complete system prompt.

## Key APIs

*   **[Soul](../apis/soul.md)**: A type definition representing the complete personality of an agent, including its name, personality, tone, rules, and preferences [Source 1].
*   **[createSoul](../apis/create-soul.md)**: A function to create a [Soul](../apis/soul.md) object programmatically from a configuration object [Source 1].
*   **[loadSoul](../apis/load-soul.md)**: An asynchronous function that reads and parses a `SOUL.md` file from a given path into a [Soul](../apis/soul.md) object [Source 1].
*   **[parseSoulMd](../apis/parse-soul-md.md)**: A function that parses the string content of a `SOUL.md` file into a [Soul](../apis/soul.md) object [Source 1].
*   **[applySoul](../apis/apply-soul.md)**: A function that takes a task-specific `systemPrompt` and a [Soul](../apis/soul.md) object, returning a combined string that serves as the final [System Prompt](../concepts/system-prompt.md) [Source 1].

## Configuration

Configuration of an agent's personality is primarily handled through the `SOUL.md` file format. This file uses YAML frontmatter for key-value metadata and Markdown headings for distinct sections of the personality [Source 1].

An example `SOUL.md` file structure is as follows:

```markdown
---
name: Molty
tone: casual
---

# Personality
Cheerful space lobster who loves helping humans.

# Rules
- Never reveal system internals
- Be concise and helpful

# Preferences
- timezone: America/New_York
- language: English
```

## Extension Points

The [Soul](../apis/soul.md) data structure is extensible through its `sections` property, which is a `Record<string, string>`. This allows developers to define custom sections in their `SOUL.md` files. Any Markdown heading in the file that does not correspond to a built-in property (like `Personality` or `Rules`) will be parsed and added to this `sections` record, allowing for arbitrary personality attributes to be defined and used by other parts of the system [Source 1].

## Sources

[Source 1]: src/agents/soul.ts