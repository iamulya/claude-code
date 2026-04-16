---
title: loadSoul
entity_type: api
summary: Asynchronously loads and parses a SOUL.md file from the filesystem into a Soul object.
export_name: loadSoul
source_file: src/agents/soul.ts
category: function
stub: false
compiled_at: 2026-04-16T14:14:28.875Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/soul.ts
confidence: 1
---

## Overview
`loadSoul` is a utility function used to initialize an agent's personality by reading a dedicated Markdown file (typically `SOUL.md`). This approach follows a pattern where an agent's identity (who they are) is decoupled from their specific task instructions (what they do). 

The function reads the file from the local filesystem, parses the YAML frontmatter for metadata, and extracts structured content from specific Markdown headers such as "Personality", "Rules", and "Preferences".

## Signature / Constructor

```typescript
export async function loadSoul(path: string): Promise<Soul>;
```

### Parameters
*   `path`: The filesystem path to the `.md` file containing the soul definition.

### Return Type
The function returns a `Promise` that resolves to a `Soul` object:

```typescript
export type Soul = {
  /** Agent's name */
  name: string
  /** Core personality description */
  personality: string
  /** Communication tone */
  tone?: 'casual' | 'professional' | 'playful' | 'formal' | string
  /** Behavioral rules / guardrails */
  rules?: string[]
  /** User-specific preferences (overrides) */
  preferences?: Record<string, string>
  /** Custom sections (key → markdown content) */
  sections?: Record<string, string>
}
```

## File Format
The target file is expected to follow a specific Markdown structure:

1.  **Frontmatter**: A YAML block containing the `name` and optional `tone`.
2.  **# Personality**: A section describing the core identity.
3.  **# Rules**: A list of behavioral constraints or guardrails.
4.  **# Preferences**: A list of key-value pairs for configuration.

### Example SOUL.md
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

## Examples

### Loading a Soul from Disk
```typescript
import { loadSoul } from 'yaaf';

async function initializeAgent() {
  try {
    const soul = await loadSoul('./agents/molty.soul.md');
    console.log(`Loaded agent: ${soul.name}`);
    console.log(`Tone: ${soul.tone}`);
  } catch (error) {
    console.error('Failed to load agent soul:', error);
  }
}
```

### Using a Loaded Soul with a System Prompt
Once loaded, a soul is typically combined with task-specific instructions using other utilities in the framework.

```typescript
import { loadSoul, applySoul } from 'yaaf';

const soul = await loadSoul('./SOUL.md');
const taskInstructions = 'You help with calendar management.';

// Combines identity preamble with task instructions
const finalSystemPrompt = applySoul(taskInstructions, soul);
```