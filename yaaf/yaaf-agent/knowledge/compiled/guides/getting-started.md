---
title: Getting Started
entity_type: guide
summary: A step-by-step guide to installing YAAF, creating your first agent, and setting up your environment.
difficulty: beginner
stub: false
compiled_at: 2026-04-16T14:07:37.326Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/getting-started.md
confidence: 1
---

## Overview
This guide provides instructions for initializing a YAAF project, configuring environment variables for LLM providers, and implementing a basic agent with tool-calling capabilities. By the end of this guide, a developer will have a functional agent capable of processing natural language inputs and executing defined tools.

## Prerequisites
Before beginning, ensure that Node.js and npm are installed in the development environment. Access to an LLM provider (such as Google Gemini, OpenAI, or Anthropic) or a local instance of Ollama is required for the agent to function.

## Step-by-Step

### 1. Installation
YAAF can be added to an existing project or used to scaffold a new project structure.

**To add to an existing project:**
```bash
npm install yaaf
```

**To scaffold a new project:**
```bash
npx yaaf init my-agent
cd my-agent
npm install
```

### 2. Environment Setup
YAAF automatically detects the LLM provider based on available environment variables. Configure exactly one of the following providers:

**Google Gemini (Recommended)**
```bash
export GOOGLE_API_KEY=your-key-here
```

**OpenAI**
```bash
export OPENAI_API_KEY=sk-...
```

**Anthropic**
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

**Groq (OpenAI-compatible)**
```bash
export OPENAI_API_KEY=gsk_...
export OPENAI_BASE_URL=https://api.groq.com/openai/v1
export OPENAI_MODEL=llama-3.3-70b-versatile
```

**Ollama (Local)**
```bash
export OPENAI_API_KEY=ollama
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=llama3.1
```

### 3. Creating the Agent
Define an agent by specifying its name, system prompt, and available tools.

```typescript
import { Agent, buildTool } from 'yaaf';

// 1. Define tools
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
  isReadOnly: () => true,
});

// 2. Create the agent
const agent = new Agent({
  name: 'Greeter',
  systemPrompt: 'You are a friendly greeter. Always greet the user by name.',
  tools: [greetTool],
});

// 3. Run the agent
const response = await agent.run('Say hello to Alice');
console.log(response);
```

### 4. Development and Execution
Use the YAAF CLI to interact with the agent or manage the project.

*   **Interactive REPL:** Run `yaaf dev` to start a development session.
*   **Production Mode:** Run `yaaf run` to execute the agent in a production environment.
*   **Project Status:** Run `yaaf status` to view the current configuration.

## Configuration Reference

### CLI Commands
The YAAF CLI provides several utilities for project management and debugging.

| Command | Description |
|---------|-------------|
| `yaaf init <name>` | Scaffolds a new project (optional `--template` flag). |
| `yaaf dev` | Starts an interactive REPL for testing. |
| `yaaf add <type> <name>` | Adds components like `tool` or `skill`. |
| `yaaf context list` | Inspects the current context budget. |
| `yaaf status` | Displays project status. |

### Project Structure
A standard YAAF project initialized via the CLI follows this directory layout:

| File/Folder | Purpose |
|------|---------|
| `src/agent.ts` | Main entry point; contains system prompts and model config. |
| `src/tools/` | Directory for tool definitions exported via `buildTool()`. |
| `skills/` | Markdown files containing instructions injected into the system prompt. |
| `SOUL.md` | Optional file defining agent personality, tone, and rules. |
| `.yaaf/memory/` | Runtime storage for auto-managed agent memory. |

### REPL Slash Commands
While running `yaaf dev`, the following commands are available:

| Command | Description |
|---------|-------------|
| `/quit` | Exit the REPL. |
| `/clear` | Clear the screen and reset the conversation history. |
| `/tools` | List all tools available in the project. |
| `/context` | Show system prompt sections and their token sizes. |
| `/cost` | Display token usage and estimated session cost. |
| `/help` | Show all available commands. |

## Next Steps
*   **Agent API**: Explore the full configuration reference for the Agent class.
*   **Tools**: Learn how to build production-grade tools with complex schemas.
*   **CLI Runtime**: Learn how to package an agent as a standalone CLI product.
*   **Server Runtime**: Deploy an agent as a production-ready HTTP API.

## Sources
*   Source 1: `getting-started.md`