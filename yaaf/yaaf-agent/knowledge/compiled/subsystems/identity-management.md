---
title: Identity Management
entity_type: subsystem
summary: The framework component responsible for handling agent personas, loading SOUL.md files, and constructing personality-aware system prompts.
primary_files:
  - src/agents/soul.ts
exports:
  - Soul
  - createSoul
  - loadSoul
  - parseSoulMd
  - applySoul
stub: false
compiled_at: 2026-04-16T14:14:18.511Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/soul.ts
confidence: 0.95
---

## Purpose
The Identity Management subsystem provides a structured approach to defining agent personas. It is designed to separate an agent's **identity** (who the agent is) from its **instructions** (what the agent does). This separation allows developers to maintain consistent personalities across different tasks and tools. The subsystem is inspired by the `SOUL.md` approach, where personality traits, communication styles, and behavioral guardrails are externalized into dedicated configuration files.

## Architecture
The subsystem is centered around the `Soul` data structure and a set of utility functions for parsing and applying these identities to Large Language Model (LLM) interactions.

### The Soul Object
The core of the subsystem is the `Soul` type, which encapsulates the following attributes:
- **Name**: The identifier for the agent.
- **Personality**: A core description of the agent's character.
- **Tone**: The communication style (e.g., casual, professional, playful).
- **Rules**: A list of behavioral guardrails or constraints.
- **Preferences**: Key-value pairs for user-specific or environment-specific overrides (e.g., language or timezone).
- **Sections**: Custom markdown blocks for additional identity context.

```typescript
export type Soul = {
  name: string
  personality: string
  tone?: 'casual' | 'professional' | 'playful' | 'formal' | string
  rules?: string[]
  preferences?: Record<string, string>
  sections?: Record<string, string>
}
```

## Key APIs
The subsystem provides several functions to manage the lifecycle of an agent's identity:

### `loadSoul(path: string)`
An asynchronous function that reads a `SOUL.md` file from the filesystem and parses it into a `Soul` object.

### `parseSoulMd(content: string)`
Parses a raw markdown string into a `Soul` object. It extracts metadata from YAML frontmatter and content from markdown headers.

### `createSoul(config: Soul)`
A programmatic factory function to create a `Soul` object directly from a configuration object.

### `applySoul(systemPrompt: string, soul: Soul)`
The primary integration function. It prepends the agent's identity and personality traits to a task-specific system prompt, creating a unified instruction set for the LLM.

## Configuration
Identity is primarily configured via `SOUL.md` files. These files use a combination of YAML frontmatter for metadata and standard Markdown for descriptive content.

### SOUL.md Format
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

## Integration Points
The Identity Management subsystem interacts with the broader framework by influencing the construction of system messages. When an agent is initialized or a request is prepared, `applySoul` is used to merge the static identity defined in the `Soul` object with the dynamic instructions required for a specific task. This ensures that the LLM maintains its persona while executing specific functional logic.