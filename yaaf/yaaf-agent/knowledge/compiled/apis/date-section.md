---
summary: Generates a dynamic date and time section for the system prompt.
export_name: dateSection
source_file: src/prompt/systemPrompt.ts
category: function
title: dateSection
entity_type: api
stub: false
compiled_at: 2026-04-16T14:32:27.431Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/prompt/systemPrompt.ts
confidence: 0.9
---

## Overview
The `dateSection` function is a utility used to generate a dynamic date and time component for an agent's system prompt. It ensures that the LLM has access to the current temporal context, which is essential for tasks involving scheduling, relative time calculations, or time-sensitive data retrieval.

In the YAAF prompt architecture, `dateSection` is classified as a dynamic section. Because it is recomputed frequently to maintain accuracy, it is typically placed after the dynamic boundary in a `SystemPromptBuilder` to avoid invalidating static prompt caches. This function mirrors the session-start date functionality found in the framework's internal `getSessionStartDate` utility.

## Signature
```typescript
export function dateSection(): {
  name: string;
  fn: () => string;
  cache: 'turn' | 'session' | 'none';
  priority?: number;
}
```

### Parameters
This function does not take any parameters.

### Return Value
Returns a section configuration object compatible with the `SystemPromptBuilder`. This object includes a function that, when executed, returns a string representation of the current date and time.

## Examples

### Basic Usage with SystemPromptBuilder
This example demonstrates how to manually add a date section to a custom prompt builder.

```typescript
import { SystemPromptBuilder, dateSection } from 'yaaf';

const builder = new SystemPromptBuilder()
  .addStatic('identity', () => 'You are a helpful assistant.')
  .addDynamic(
    'current_time', 
    dateSection(), 
    'Provides the agent with the current date for time-sensitive tasks'
  );

const systemPrompt = await builder.build();
```

### Integration in Agent Configuration
The `dateSection` is often used indirectly via the `defaultPromptBuilder`, but it can be explicitly provided to an agent's prompt provider.

```typescript
const agent = new Agent({
  systemPromptProvider: async () => {
    const builder = new SystemPromptBuilder()
      .addSection(dateSection());
    return builder.build();
  },
  // ... other config
});
```

## See Also
- `SystemPromptBuilder`
- `envSection`
- `identitySection`
- `defaultPromptBuilder`