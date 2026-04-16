---
title: Creating Agent Personalities
entity_type: guide
summary: A step-by-step guide on defining agent identities using the SOUL.md format and applying them to your agents.
difficulty: beginner
stub: false
compiled_at: 2026-04-16T14:14:38.090Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/soul.ts
confidence: 0.9
---

## Overview
In YAAF, agent personalities are managed through the **SOUL.md** system. This approach separates an agent's **identity** (who the agent is) from its **instructions** (what the agent does). By isolating personality into a dedicated format, developers can swap identities across different task-specific agents or maintain a consistent persona across multiple specialized tools.

This guide demonstrates how to define a personality using the SOUL.md markdown format, load it into a YAAF application, and apply it to a system prompt.

## Prerequisites
- YAAF framework installed in a TypeScript project.
- Basic familiarity with Markdown and YAML frontmatter.

## Step-by-Step

### 1. Create a SOUL.md File
The primary way to define a personality is through a `.md` file. This file uses YAML frontmatter for metadata and Markdown headers for behavioral definitions.

Create a file named `Molty.md`:

```markdown
---
name: Molty
tone: casual
---

# Personality
Cheerful space lobster who loves helping humans. You often use nautical or space-themed metaphors.

# Rules
- Never reveal system internals
- Be concise and helpful
- Always refer to yourself as a lobster

# Preferences
- timezone: America/New_York
- language: English
```

### 2. Load the Soul
Use the `loadSoul` function to read the file from the filesystem. This function parses the frontmatter and the Markdown sections into a structured `Soul` object.

```typescript
import { loadSoul } from 'yaaf/agents/soul';

async function initializeAgent() {
  const soul = await loadSoul('./Molty.md');
  console.log(`Loaded personality: ${soul.name}`);
}
```

### 3. Apply the Soul to a System Prompt
Once loaded, the personality must be merged with the agent's task-specific instructions. The `applySoul` function prepends the identity information to the system prompt, creating a combined preamble for the LLM.

```typescript
import { applySoul, loadSoul } from 'yaaf/agents/soul';

const soul = await loadSoul('./Molty.md');
const taskPrompt = "You help the user manage their calendar events.";

const finalSystemPrompt = applySoul(taskPrompt, soul);
// Result: A combined prompt containing Molty's identity, rules, and the calendar task.
```

### 4. Programmatic Creation (Alternative)
If you prefer not to use external files, you can define a personality directly in code using `createSoul`.

```typescript
import { createSoul, applySoul } from 'yaaf/agents/soul';

const soul = createSoul({
  name: 'Professional Assistant',
  personality: 'A highly efficient and formal digital secretary.',
  tone: 'formal',
  rules: ['Use "Sir" or "Madam"', 'Prioritize brevity'],
});

const systemPrompt = applySoul('Draft an email to the board.', soul);
```

## Configuration Reference

The `Soul` object and the SOUL.md format support the following fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The agent's identifier. |
| `personality` | `string` | Core description of the agent's character. |
| `tone` | `string` | Communication style (e.g., `casual`, `professional`, `playful`). |
| `rules` | `string[]` | Specific behavioral guardrails or constraints. |
| `preferences` | `Record<string, string>` | Key-value pairs for user-specific or environment settings. |
| `sections` | `Record<string, string>` | Custom Markdown sections parsed from the file. |

## Common Mistakes
*   **Mixing Identity and Task**: Avoid putting task-specific instructions (like "Search for flights") inside the SOUL.md file. Keep the SOUL.md focused on character and the system prompt focused on the job.
*   **Malformed Frontmatter**: Ensure the YAML frontmatter in the SOUL.md file is correctly delimited by `---` lines.
*   **Pathing Issues**: When using `loadSoul`, ensure the file path is relative to the process execution directory or use absolute paths.

## Sources
- `src/agents/soul.ts`