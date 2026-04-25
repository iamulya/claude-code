---
summary: A step-by-step guide to installing YAAF, creating your first agent, and understanding the basic project structure and CLI commands.
title: Getting Started with YAAF
entity_type: guide
difficulty: beginner
search_terms:
 - how to install yaaf
 - yaaf tutorial
 - create first yaaf agent
 - yaaf cli commands
 - yaaf project structure
 - set up llm provider yaaf
 - yaaf environment variables
 - yaaf init command
 - yaaf dev repl
 - build a simple agent
 - typescript agent framework
 - scaffold new agent project
 - getting started with agents
 - yaaf hello world
stub: false
compiled_at: 2026-04-24T18:07:05.746Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
compiled_from_quality: documentation
confidence: 1
---

## Overview

This guide provides a complete walkthrough for setting up a new YAAF project. It covers installing the framework, configuring an [LLM](../concepts/llm.md) provider, creating a basic agent with a single tool, and exploring the default project structure and command-line interface ([CLI](../subsystems/cli.md)) [Source 1].

## Prerequisites

Before starting, ensure you have access to an API key from a supported LLM provider, such as Google, OpenAI, Anthropic, or Groq. For local development, an installation of Ollama can be used instead [Source 1].

## Step-by-Step

### 1. Install YAAF

YAAF can be installed directly into an existing project or used to scaffold a new project structure [Source 1].

To add YAAF to an existing project, run:

```bash
npm install yaaf
```

To create a new agent project from a template, use the `init` command:

```bash
npx yaaf init my-agent
cd my-agent
npm install
```

### 2. Configure Environment Variables

YAAF automatically detects the LLM provider based on environment variables. Set the appropriate variable for your chosen provider. Only one is required [Source 1].

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

### 3. Create an Agent

An agent is defined by its configuration, [System Prompt](../concepts/system-prompt.md), and a set of [Tools](../subsystems/tools.md) it can use. The following example creates a simple "Greeter" agent [Source 1].

```typescript
import { Agent, buildTool } from 'yaaf';

// 1. Define a tool for the agent to use
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

// 2. Create the agent instance
const agent = new Agent({
  name: 'Greeter',
  systemPrompt: 'You are a friendly greeter. Always greet the user by name.',
  tools: [greetTool],
});

// 3. Run the agent with a prompt
const response = await agent.run('Say hello to Alice');
console.log(response);
```

### 4. Use the Development REPL

YAAF includes an interactive development environment (REPL) for testing agents. Start it by running the `dev` command in your project's root directory [Source 1].

```bash
yaaf dev
```

Inside the REPL, you can interact with your agent and use special slash commands for debugging and inspection [Source 1].

| Command | Description |
|---------|-------------|
| `/quit` | Exit the REPL |
| `/clear` | Clear screen and reset conversation |
| `/tools` | List available tools in the project |
| `/context` | Show system prompt sections and sizes |
| `/cost` | Show token usage and estimated cost |
| `/help` | Show all commands |

## Project Structure and CLI

The `yaaf init` command generates a standard project structure to organize agent components [Source 1].

### Directory Layout

```
my-agent/
├── src/
│   ├── agent.ts          # Agent configuration and entry point
│   └── tools/
│       └── search.ts     # Tool definitions
├── skills/
│   └── SKILL.md          # Agent skill instructions
├── SOUL.md               # Agent personality (optional)
├── tests/
│   └── agent.test.ts     # Test scaffold
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### Key Files

| File | Purpose |
|------|---------|
| `src/agent.ts` | The main agent definition, including system prompt, tools, and model configuration. |
| `src/tools/*.ts` | Each file defines a tool by exporting a `buildTool()` result. |
| `skills/*.md` | Markdown files containing instructions that are injected into the system prompt. |
| `SOUL.md` | An optional file defining the agent's personality, tone, and rules. |
| `.yaaf/[[Memory]]/` | A directory created at runtime for auto-managed [Memory Storage](../concepts/memory-storage.md). |

### Core CLI Commands

YAAF provides a set of CLI commands for managing the agent lifecycle [Source 1].

| Command | Description |
|---------|-------------|
| `yaaf init <name>` | Scaffolds a new agent project. Use `--template` for different starters. |
| `yaaf dev` | Starts the interactive development REPL. |
| `yaaf add <component> <name>` | Adds a new component, such as a `tool` or `skill`. |
| `yaaf context list` | Inspects the agent's context budget. |
| `yaaf run` | Runs the agent in production mode. |
| `yaaf status` | Shows the current project status. |

## Next Steps

After mastering the basics, explore more advanced topics:

*   **Agent API**: Learn about the full configuration options for the `Agent` class.
*   **Tools**: Dive deeper into building robust, production-grade tools.
*   **[CLI Runtime](../subsystems/cli-runtime.md)**: Package and ship your agent as a command-line application.
*   **[Server Runtime](../subsystems/server-runtime.md)**: Deploy your agent as an HTTP API service.

## Sources

[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md