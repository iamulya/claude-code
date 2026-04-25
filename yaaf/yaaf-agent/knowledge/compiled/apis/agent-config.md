---
summary: The interface defining the configuration options for an `Agent` instance, including name, system prompt, and tools.
export_name: AgentConfig
source_file: src/agent.ts
category: type
title: AgentConfig
entity_type: api
search_terms:
 - agent configuration
 - how to create an agent
 - agent constructor options
 - set agent system prompt
 - add tools to agent
 - configure agent model
 - agent name
 - systemPromptProvider
 - LLM provider settings
 - agent setup
 - new Agent options
 - YAAF agent initialization
stub: false
compiled_at: 2026-04-25T00:04:03.012Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/resolver.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`AgentConfig` is a TypeScript interface that defines the set of options for configuring an instance of the [Agent](./agent.md) class. It serves as the primary mechanism for specifying an agent's core identity, capabilities, and behavior. This includes its name, the system prompt that guides its actions, the tools it can use, and the underlying Large Language Model (LLM) it should connect to.

This configuration object is passed directly to the `Agent` constructor upon instantiation.

## Signature

The `AgentConfig` interface includes the following properties:

```typescript
import type { AgentTool } from './tool';
import type { ChatModel } from './runner';

export interface AgentConfig {
  /**
   * A descriptive name for the agent.
   */
  name: string;

  /**
   * The system prompt that defines the agent's identity, rules, and goals.
   * This should be a static string. For dynamic prompts, use `systemPromptProvider`.
   */
  systemPrompt?: string;

  /**
   * A function that returns the system prompt as a string or a promise resolving
   * to a string. This is evaluated for each agent run, allowing for dynamic
   * prompts that can change based on state or environment.
   */
  systemPromptProvider?: () => string | Promise<string>;

  /**
   * An array of tools the agent is equipped with.
   */
  tools?: AgentTool[];

  /**
   * An already instantiated ChatModel. If provided, this will be used
   * directly, bypassing the automatic model resolution from environment
   * variables.
   */
  chatModel?: ChatModel;

  /**
   * The name of the LLM provider (e.g., 'openai', 'gemini').
   * Note: This is a legacy option. The recommended approach is to use
   * environment variables for model resolution.
   * @see [[ResolverConfig]]
   */
  provider?: string;

  /**
   * The specific model name to use (e.g., 'gpt-4o', 'gemini-1.5-pro').
   * Note: This is a legacy option. The recommended approach is to use
   * environment variables for model resolution.
   * @see [[ResolverConfig]]
   */
  model?: string;
}
```

## Properties

- **`name`**: `string` (required)
  A human-readable name for the agent, used for logging and identification.

- **`systemPrompt`**: `string` (optional)
  A static string that serves as the system prompt for the agent. It defines the agent's persona, instructions, and constraints. If both `systemPrompt` and `systemPromptProvider` are provided, the behavior is undefined.

- **`systemPromptProvider`**: `() => string | Promise<string>` (optional)
  A function that returns the system prompt. This function is executed at the beginning of each `agent.run()`. It is useful for creating dynamic prompts that incorporate information like the current date, working directory, or other context that changes between runs [Source 3].

- **`tools`**: `AgentTool[]` (optional)
  An array of tool objects, typically created with [buildTool](./build-tool.md) or [agentTool](./agent-tool.md), that the agent can use to perform actions [Source 1].

- **`chatModel`**: `ChatModel` (optional)
  A pre-configured and instantiated `ChatModel` instance. Providing this property bypasses YAAF's automatic model resolution based on environment variables. This is useful for fine-grained control over the model's configuration or for using custom model adapters [Source 2].

- **`provider`**: `string` (optional)
  A legacy property to specify the LLM provider. The modern approach is to use environment variables like `OPENAI_API_KEY` or `GEMINI_API_KEY` for auto-detection [Source 2].

- **`model`**: `string` (optional)
  A legacy property to specify the model name. The modern approach is to use the `LLM_MODEL` environment variable [Source 2].

## Examples

### Basic Agent Configuration

This example shows a minimal configuration for a "Greeter" agent with a static system prompt and one tool [Source 1].

```typescript
import { Agent, buildTool } from 'yaaf';

const greetTool = buildTool({
  name: 'greet',
  description: 'Greet someone by name',
  inputSchema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
  async call({ name }) {
    return { data: `Hello, ${name}! 👋` };
  },
});

const agent = new Agent({
  name: 'Greeter',
  systemPrompt: 'You are a friendly greeter. Always greet the user by name.',
  tools: [greetTool],
});
```

### Dynamic System Prompt

This example uses a `systemPromptProvider` along with a [SystemPromptBuilder](./system-prompt-builder.md) to create a system prompt that includes the current date, which is re-evaluated on every run [Source 3].

```typescript
import { Agent, SystemPromptBuilder, dateSection } from 'yaaf';

const promptBuilder = new SystemPromptBuilder()
  .addStatic('identity', () => 'You are a helpful assistant aware of the current time.')
  .addDynamic(dateSection());

const agent = new Agent({
  name: 'TimeAwareAgent',
  systemPromptProvider: () => promptBuilder.build(),
  tools: [],
});
```

## See Also

- [Agent](./agent.md): The class that consumes this configuration object.
- [SystemPromptBuilder](./system-prompt-builder.md): A utility for composing complex system prompts.
- [buildTool](./build-tool.md): The factory function for creating tools to include in the `tools` array.
- [ResolverConfig](./resolver-config.md): The configuration used for automatic LLM provider resolution.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/resolver.ts
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts