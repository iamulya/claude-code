---
title: Scaffolding a New Project
entity_type: guide
summary: A step-by-step guide to initializing a new YAAF project using the CLI tools.
difficulty: beginner
stub: false
compiled_at: 2026-04-16T14:16:33.929Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/init.ts
confidence: 0.9
---

## Overview
The YAAF CLI provides a scaffolding utility to jumpstart development. By using the initialization command, developers can generate a production-grade project structure that includes TypeScript configurations, a sample agent, example tools, and templates for defining agent behavior.

This guide walks through the process of creating a new project from scratch using the `yaaf init` command.

## Prerequisites
Before scaffolding a new project, ensure the following are available:
*   **Node.js**: A compatible runtime environment for TypeScript development.
*   **API Keys**: Access to a supported LLM provider (OpenAI, Anthropic, or Google).

## Step-by-Step

### 1. Initialize the Project
Run the initialization command to create the project directory and generate the boilerplate code. You can optionally provide a project name as an argument.

```bash
npx yaaf init my-agent-project
```

If no name is provided, the CLI will use the current directory or prompt for a name.

### 2. Configure Environment Variables
YAAF requires an API key to communicate with LLM providers. Create a `.env` file in the root of your project or export the variables in your terminal:

```bash
export GOOGLE_API_KEY=your-key-here
# or
export OPENAI_API_KEY=your-key-here
# or
export ANTHROPIC_API_KEY=your-key-here
```

### 3. Review the Generated Structure
The `init` command creates several key files and directories:

*   **`src/index.ts`**: The entry point of the application containing a sample agent instance.
*   **`src/tools/search.ts`**: A sample tool implementation using `buildTool`.
*   **`SKILL.md`**: A template for defining the functional capabilities and instructions for the agent.
*   **`SOUL.md`**: A template for defining the agent's personality, tone, and behavioral constraints.
*   **`tsconfig.json`**: Pre-configured TypeScript settings for the YAAF environment.
*   **Test Scaffold**: A testing setup using `vitest`.

### 4. Examine the Sample Tool
The scaffold includes a `searchTool` located in `src/tools/search.ts`. This demonstrates how to define tool schemas and execution logic:

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
    // Replace with real search API (e.g., Brave, Tavily, SearXNG)
    return `Search results for: "${input.query}"\n\n[Replace this with a real search integration]`;
  },
});
```

### 5. Run Tests
The project includes a test scaffold to ensure the environment is correctly configured. Run the tests using `vitest`:

```bash
npm test
```

## Configuration Reference

The following environment variables are commonly used during project initialization:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | API key for OpenAI models. |
| `ANTHROPIC_API_KEY` | API key for Anthropic models. |
| `GOOGLE_API_KEY` | API key for Google (Gemini) models. |

## Common Mistakes
*   **Missing API Keys**: The agent will fail to initialize or respond if the provider's API key is not set in the environment.
*   **Directory Conflicts**: Running `yaaf init` in a non-empty directory may cause errors if files like `package.json` or `tsconfig.json` already exist.
*   **TypeScript Version**: Ensure you are using a modern version of TypeScript as YAAF utilizes advanced type features for provider-agnostic tool definitions.

## Sources
* `src/cli/init.ts`