---
title: SoulConfig
entity_type: api
summary: Defines the structure for configuring an agent's personality, role, rules, and tone.
export_name: SoulConfig
source_file: src/gateway/soul.ts
category: type
search_terms:
 - agent personality configuration
 - define agent role
 - set agent rules
 - agent tone of voice
 - SOUL.md structure
 - configure agent identity
 - how to define a soul
 - yaaf/gateway soul
 - agent persona
 - system prompt personality
 - character definition for LLM
 - agent behavior guidelines
stub: false
compiled_at: 2026-04-24T17:38:59.865Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
compiled_from_quality: documentation
confidence: 1
---

## Overview

`[[[[[[[[Soul]]]]]]]]Config` is a TypeScript type that defines the configuration object for an agent's core identity and personality traits [Source 1]. It is part of the optional `yaaf/gateway` module and is used as the input for the `Soul` class constructor.

This configuration object allows developers to specify an agent's name, role, personality, behavioral rules, and tone in a structured format. The `Soul` class consumes this object to generate a `SoulTransform`, which can then be applied to a `ContextEngine` to inject the agent's personality into the [System Prompt](../concepts/system-prompt.md) [Source 1].

## Signature

`SoulConfig` is a type alias for an object with the following optional properties [Source 1]:

```typescript
export type SoulConfig = {
  name?: string;
  role?: string;
  personality?: string;
  rules?: string[];
  tone?: string;
};
```

### Properties

| Property      | Type       | Description                                                              |
| :------------ | :--------- | :----------------------------------------------------------------------- |
| `name`        | `string`   | The agent's name.                                                        |
| `role`        | `string`   | A description of the agent's role or specialization.                     |
| `personality` | `string`   | A description of the agent's character traits and demeanor.              |
| `rules`       | `string[]` | A list of specific, hard-coded rules the agent must follow.              |
| `tone`        | `string`   | A description of the agent's communication style and tone of voice.      |

## Examples

The most common use of `SoulConfig` is to provide an inline configuration to the `Soul` class constructor [Source 1].

```typescript
import { Soul, type SoulConfig } from 'yaaf/gateway';

// Define the agent's personality using the SoulConfig type.
const atlasConfig: SoulConfig = {
  name: 'Atlas',
  role: 'Senior DevOps Engineer specializing in Kubernetes and CI/CD.',
  personality: 'Precise, thorough, and has a slightly dry humor. Proactive about security.',
  rules: [
    'Always explain the "why" behind recommendations',
    'Suggest monitoring for any infrastructure change',
    'Default to least-privilege access patterns',
  ],
  tone: 'Professional but approachable. Uses analogies for complex concepts.'
};

// Create a new Soul instance from the configuration object.
const soul = new Soul(atlasConfig);

// This soul instance can then be used to create a transform
// that injects this personality into a ContextEngine.
// const transform = soul.toTransform();
// engine.setSoul(transform);
```

## See Also

*   **Soul**: The class that consumes a `SoulConfig` object to manage an agent's personality.
*   **ContextEngine**: A higher-level prompt manager that can use the output of a `Soul` instance to shape the final system prompt.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md