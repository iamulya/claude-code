---
title: Agent
entity_type: concept
summary: An autonomous entity that uses a Large Language Model (LLM) to reason, use tools, and achieve goals.
stub: false
compiled_at: 2026-04-16T14:16:42.819Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/init.ts
confidence: 1
---

## What It Is
The Agent is the central abstraction in YAAF. It represents an autonomous unit that leverages a Large Language Model (LLM) to perform reasoning, execute tasks, and interact with external systems. The Agent concept solves the problem of orchestrating LLM interactions by encapsulating personality, specific capabilities, and tool access into a single, deployable entity.

## How It Works in YAAF
In YAAF, an Agent is instantiated using the `Agent` class. The framework provides a standardized project structure for agents, which can be scaffolded using the `yaaf init` CLI command. 

An Agent project typically consists of:
- **The Agent Instance**: The core logic imported from the `yaaf` package.
- **Tools**: Discrete functions defined via `buildTool` that the agent can invoke to perform actions (e.g., web searches).
- **Behavioral Templates**: Markdown files that define the agent's identity and capabilities, specifically `SOUL.md` (personality and core instructions) and `SKILL.md` (functional expertise).
- **Provider Configuration**: Integration with LLM providers such as OpenAI, Anthropic, or Google.

The Agent operates by receiving input, determining which tools are necessary to fulfill a request based on their `inputSchema` and `description`, and executing the `execute` logic defined within those tools.

## Configuration
Agents are configured through environment variables for provider access and through code for functional capabilities.

### Provider Setup
The Agent requires an API key for the chosen LLM provider, set via environment variables:

```bash
export GOOGLE_API_KEY=your-key-here
# or
export OPENAI_API_KEY=your-key-here
# or
export ANTHROPIC_API_KEY=your-key-here
```

### Tool Integration
Capabilities are added to an Agent by defining tools. A tool includes a schema that tells the Agent when and how to use it.

```typescript
import { buildTool } from 'yaaf';

export const searchTool = buildTool({
  name: 'search',
  description: 'Search the web for information. Use this when the user asks about current events or facts you are unsure about.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
    },
    required: ['query'],
  },
  execute: async (input) => {
    // Implementation for external API integration
    return `Search results for: "${input.query}"`;
  },
});
```

## Sources
- `src/cli/init.ts`