---
summary: Defines a single section of content to be included in the agent's system prompt, with properties like ID, name, content, priority, and droppability.
export_name: ContextSection
source_file: src/agents/contextEngine.ts
category: type
title: ContextSection
entity_type: api
search_terms:
 - system prompt section
 - agent context management
 - prompt engineering
 - droppable context
 - context priority
 - how to build a system prompt
 - dynamic prompt construction
 - token budget management
 - ContextEngine configuration
 - prompt section properties
 - what is a context section
 - modular prompt building
stub: false
compiled_at: 2026-04-24T16:58:13.300Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/contextEngine.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ContextSection` type defines the structure for a single, modular piece of content intended for an agent's [System Prompt](../concepts/system-prompt.md) [Source 1]. It is a core component used by the `ContextEngine` to dynamically assemble the final system prompt based on priority and token constraints.

Each section has content, an identifier, and metadata that controls its placement and whether it can be omitted if the total prompt size exceeds a defined limit. This allows for building flexible and robust system prompts that can adapt to different situations and [Token Budget](../concepts/token-budget.md)s.

## Signature

`ContextSection` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type ContextSection = {
  /** Unique identifier for this section */
  id: string;
  /** Display name */
  name: string;
  /** Content to inject */
  content: string;
  /** Priority (higher = earlier in prompt). Default: 50 */
  priority?: number;
  /** Whether this section can be omitted under token pressure */
  droppable?: boolean;
};
```

### Properties

- **`id: string`**
  A unique string to identify the context section.

- **`name: string`**
  A human-readable name for the section, useful for debugging and inspection.

- **`content: string`**
  The actual text content that will be injected into the system prompt.

- **`priority?: number`**
  An optional number that determines the section's order in the prompt. Sections with a higher priority value are placed earlier. The default priority is 50.

- **`droppable?: boolean`**
  An optional boolean indicating whether the `ContextEngine` is allowed to remove this section to stay within a character or Token Budget. If `false` or undefined, the section is considered essential and will always be included.

## Examples

Here is an example of defining an array of `ContextSection` objects to be used by a `ContextEngine`.

```typescript
import { ContextSection } from 'yaaf';

const agentContextSections: ContextSection[] = [
  {
    id: 'core-rules',
    name: 'Core Rules',
    content: 'You are a helpful assistant. You must always be polite.',
    priority: 100, // Highest priority, will appear first.
    droppable: false, // Essential, cannot be dropped.
  },
  {
    id: 'tool-definitions',
    name: 'Available Tools',
    content: 'You have access to a calculator and a web search tool.',
    priority: 50, // Default priority.
    droppable: false,
  },
  {
    id: 'example-qa',
    name: 'Example Q&A',
    content: 'User: "What is 2+2?"\nAssistant: "2+2 equals 4."',
    priority: 20, // Lower priority.
    droppable: true, // Can be dropped if the prompt is too long.
  },
  {
    id: 'current-date',
    name: 'Current Date',
    content: `Today's date is ${new Date().toISOString()}.`,
    priority: 10, // Lowest priority.
    droppable: true,
  },
];

// This array would then be passed to a ContextEngine instance
// to build the final system prompt.
```

## See Also

- `ContextEngine`: The class that consumes `ContextSection` objects to build the final system prompt.

## Sources

[Source 1]: src/agents/contextEngine.ts