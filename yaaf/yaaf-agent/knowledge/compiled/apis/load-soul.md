---
summary: An asynchronous function to load a `Soul` object from a SOUL.md file.
export_name: loadSoul
source_file: src/agents/soul.ts
category: function
title: loadSoul
entity_type: api
search_terms:
 - load agent personality
 - read SOUL.md file
 - import agent identity
 - parse soul from file
 - agent configuration file
 - how to define an agent's character
 - soul file format
 - loading agent traits
 - filesystem soul loading
 - async soul creation
 - agent identity from disk
stub: false
compiled_at: 2026-04-24T17:19:14.675Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/soul.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `load[[[[[[[[Soul]]]]]]]]` function is an asynchronous utility that reads an agent's personality configuration from a specified file path and parses it into a `Soul` object [Source 1]. This function is the primary method for loading a predefined agent identity from the filesystem.

The function expects the file to be in the Soul.md format, which separates the agent's core identity (name, personality, tone) from its task-specific instructions. This separation allows for reusable and clearly defined agent personas [Source 1]. Because it performs file I/O, the function returns a `Promise` that resolves with the `Soul` object.

## Signature

```typescript
export async function loadSoul(path: string): Promise<Soul>;
```

### Parameters

-   `path` (`string`): The relative or absolute path to the SOUL.md file on the filesystem.

### Returns

-   `Promise<Soul>`: A promise that resolves to a `Soul` object representing the parsed contents of the file.

The resolved `Soul` object has the following structure [Source 1]:

```typescript
export type Soul = {
  /** Agent's name */
  name: string;
  /** Core personality description */
  personality: string;
  /** Communication tone */
  tone?: "casual" | "professional" | "playful" | "formal" | string;
  /** Behavioral rules / guardrails */
  rules?: string[];
  /** User-specific preferences (overrides) */
  preferences?: Record<string, string>;
  /** Custom sections (key → markdown content) */
  sections?: Record<string, string>;
};
```

## Examples

### Loading a SOUL.md file

The following example demonstrates how to load an agent's soul from a file named `SOUL.md` in the same directory.

```typescript
import { loadSoul } from 'yaaf';

async function initializeAgent() {
  try {
    // Load the soul from the filesystem
    const agentSoul = await loadSoul('./SOUL.md');

    console.log(`Successfully loaded soul for: ${agentSoul.name}`);
    console.log(`Personality: ${agentSoul.personality}`);

    // The soul can now be used to configure an agent
  } catch (error) {
    console.error("Failed to load the agent's soul:", error);
  }
}

initializeAgent();
```

### Example SOUL.md File Format

The `loadSoul` function expects a file with YAML [Frontmatter](../concepts/frontmatter.md) for metadata and markdown sections for content, as shown below [Source 1].

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

## See Also

-   `createSoul`: For creating a `Soul` object programmatically instead of loading from a file.
-   `parseSoulMd`: For parsing a `Soul` object from a string containing SOUL.md content.
-   `applySoul`: For combining a `Soul` object with a task-specific [System Prompt](../concepts/system-prompt.md).
-   `Soul`: The type definition for an agent's identity.

## Sources

[Source 1]: src/agents/soul.ts