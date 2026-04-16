---
summary: Generates a standard environment section containing CWD, platform, shell, and OS information for the system prompt.
export_name: envSection
source_file: src/prompt/systemPrompt.ts
category: function
title: envSection
entity_type: api
stub: false
compiled_at: 2026-04-16T14:32:20.226Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/prompt/systemPrompt.ts
confidence: 0.9
---

## Overview
The `envSection` function is a utility used to generate a standardized block of system environment information for an agent's system prompt. It captures metadata about the runtime environment, including the current working directory (CWD), operating system platform, shell, OS version, and the current date.

This function is designed to work with the `SystemPromptBuilder` to provide the LLM with context about the system it is operating within. By default, this section is often treated as dynamic (recomputed per turn) because the current working directory or the system time may change during a session, although it can be configured for session-level caching if the environment is stable.

## Signature / Constructor

```typescript
export function envSection(options: {
  /**
   * Configuration options for environment detection and formatting.
   */
}): {
  name: string;
  fn: () => string;
  cache: 'session' | 'turn';
};
```

### Parameters
- `options`: An object containing configuration for the environment section. (Note: Specific property fields are internal to the implementation but generally control the detail level of the output).

### Return Value
Returns a section definition object compatible with `SystemPromptBuilder`, containing:
- `name`: The identifier for the section (typically "env").
- `fn`: A function that resolves the environment string.
- `cache`: The caching strategy, defaulting to `turn` to account for potential changes in the working directory or time.

## Examples

### Basic Usage with SystemPromptBuilder
This example demonstrates how to manually add the environment section to a custom prompt builder.

```typescript
import { SystemPromptBuilder, envSection } from 'yaaf';

const builder = new SystemPromptBuilder()
  .addStatic('identity', () => 'You are a system administrator.')
  .addSection(envSection({}));

const systemPrompt = await builder.build();
```

### Output Format
When rendered, the section typically produces a string similar to the following:

```text
## Environment
CWD: /Users/project/yaaf
Platform: darwin
Shell: /bin/zsh
OS: macOS 14.5
Date: 2023-10-27T10:00:00.000Z
```

## See Also
- SystemPromptBuilder
- defaultPromptBuilder
- dateSection