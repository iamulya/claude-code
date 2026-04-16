---
summary: A factory function that creates a SystemPromptBuilder pre-configured with standard identity and environment sections.
export_name: defaultPromptBuilder
source_file: src/prompt/systemPrompt.ts
category: function
title: defaultPromptBuilder
entity_type: api
stub: false
compiled_at: 2026-04-16T14:32:09.131Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/prompt/systemPrompt.ts
confidence: 1
---

## Overview
The `defaultPromptBuilder` is a factory function designed to simplify the initialization of a `SystemPromptBuilder`. It bootstraps a prompt with a standard set of sections that are commonly required for production-grade agents, including identity definitions and environment context.

By using this function, developers ensure that the resulting system prompt follows the framework's recommended section-based architecture, which separates static, cacheable content from dynamic, turn-specific information.

## Signature / Constructor

```typescript
export function defaultPromptBuilder(basePrompt: string): SystemPromptBuilder
```

### Parameters
*   **basePrompt**: A string defining the agent's core persona or identity. This is injected into the builder as a static identity section.

### Return Value
Returns an instance of `SystemPromptBuilder` pre-loaded with:
1.  **Identity Section**: Created from the `basePrompt`.
2.  **Environment Section**: Automatically includes system metadata such as the current working directory (CWD), platform, shell, OS version, and current date.

## Methods & Properties
As a factory function, `defaultPromptBuilder` does not have methods of its own. It returns a `SystemPromptBuilder` instance, which provides a fluent API for further customization:

*   **addStatic(name, fn)**: Adds a section that is computed once and cached for the session.
*   **addDynamic(name, fn, reason)**: Adds a section computed on every turn (e.g., for memory or real-time clock data).
*   **build()**: Asynchronously assembles all sections into a single string.

## Examples

### Basic Usage
This example shows how to create a builder with a base persona and then extend it with specific rules.

```typescript
import { defaultPromptBuilder } from 'yaaf';

const builder = defaultPromptBuilder('You are a helpful coding assistant.')
  .addStatic('rules', () => '## Rules\n- Always verify before deleting files\n- Use TypeScript for all examples');

// The resulting prompt will include the identity, the environment info, and the rules.
const systemPrompt = await builder.build();
```

### Integration with Agent Configuration
The builder can be used to provide the system prompt during agent initialization.

```typescript
const builder = defaultPromptBuilder('Expert DevOps Architect');

const agent = new Agent({
  // Use the built string directly
  systemPrompt: await builder.build(),
  
  // Or provide a lazy provider that re-evaluates if needed
  systemPromptProvider: () => builder.build(),
});
```

## See Also
*   `SystemPromptBuilder`
*   `envSection`
*   `identitySection`