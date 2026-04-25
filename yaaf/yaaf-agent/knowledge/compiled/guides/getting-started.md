---
summary: A step-by-step guide to installing YAAF, creating your first agent, and understanding basic project structure.
title: Getting Started
entity_type: guide
difficulty: beginner
search_terms:
 - install yaaf
 - new yaaf project
 - yaaf tutorial
 - how to create an agent
 - yaaf example
 - yaaf cli commands
 - set up llm provider
 - yaaf project layout
 - yaaf init command
 - first yaaf agent
 - yaaf environment variables
 - beginner agent framework
 - scaffold agent project
 - yaaf dev repl
stub: false
compiled_at: 2026-04-25T00:26:46.237Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md
compiled_from_quality: documentation
confidence: 1
---

## Overview

This guide provides a complete walkthrough for setting up a new YAAF project. By the end, you will have installed the YAAF framework, configured an LLM provider, created and run a simple agent, and learned the basic structure of a YAAF project and its command-line interface [Source 1].

## Prerequisites

Before starting, ensure you have an API key from a supported LLM provider. YAAF auto-detects providers via environment variables [Source 1].

## Step-by-Step

### Step 1: Installation

YAAF can be installed as a dependency in an existing project or used to scaffold a new project from a template [Source 1].

To add YAAF to an existing project, run:

```bash
npm install yaaf
```

To create a new, fully structured YAAF agent project, use the `init` command:

```bash
npx yaaf init my-agent
cd my-agent
npm install
```

This command creates a new directory with a recommended project structure [Source 1].

### Step 2: Environment Setup

YAAF requires an environment variable to be set for your chosen LLM provider. Set **one** of the following configurations in your shell or `.env` file [Source 1].

**Google Gemini (Recommended)**
The free tier includes a 1 million token context window [Source 1].
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

**Groq**
Groq uses an OpenAI-compatible API and is known for its speed [Source 1].
```bash
export OPENAI_API_KEY=gsk_...
export OPENAI_BASE_URL=https://api.groq.com/openai/v1
export OPENAI_MODEL=llama-3.3-70b-versatile
```

**Ollama (Local)**
For running local models via Ollama, no API key is needed [Source 1].
```bash
export OPENAI_API_KEY=ollama
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=llama3.1
```

### Step 3: Create Your First Agent

The following example demonstrates how to define a tool, create an [Agent](../apis/agent.md), and run it with a simple prompt [Source 1].

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

// 3. Run
const response = await agent.run('Say hello to Alice');
console.log(response);
```

This code performs three main actions:
1.  **Defines a Tool**: `buildTool` creates a simple tool named `greet` that the agent can use.
2.  **Creates an Agent**: A new `Agent` instance is configured with a name, a [System Prompt](../concepts/system-prompt.md) to guide its behavior, and the list of available [Tools](../subsystems/tools.md).
3.  **Runs the Agent**: The `agent.run()` method executes the agent with a user prompt. The LLM will determine that it should use the `greet` tool to fulfill the request [Source 1].

### Step 4: Understand the Project Structure

When you create a project with `yaaf init`, the following file structure is generated [Source 1]:

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

**Key Files and Directories**

| File / Directory | Purpose |
| --- | --- |
| `src/agent.ts` | The main entry point for defining the agent, including its [System Prompt](../concepts/system-prompt.md), [Tools](../subsystems/tools.md), and model configuration [Source 1]. |
| `src/tools/*.ts` | Each file in this directory should define and export one or more tools using `buildTool()` [Source 1]. |
| `skills/*.md` | Markdown files containing instructions that are injected into the agent's [System Prompt](../concepts/system-prompt.md) as [Skills](../concepts/skills.md) [Source 1]. |
| `SOUL.md` | An optional file defining the agent's [Agent Personality](../concepts/agent-personality.md), including its name, tone, and behavioral rules. This is used by certain framework components like `yaaf/gateway` [Source 1]. |
| `.yaaf/memory/` | A directory created at runtime for auto-managed [Memory Storage](../concepts/memory-storage.md) [Source 1]. |

### Step 5: Use the YAAF CLI

The YAAF [CLI](../subsystems/cli.md) provides commands for project scaffolding, development, and inspection [Source 1].

**Core Commands**

| Command | Description |
| --- | --- |
| `yaaf init my-agent` | Scaffolds a new agent project. Use `--template` for different starting points (e.g., `personal-assistant`) [Source 1]. |
| `yaaf dev` | Starts an interactive development REPL for chatting with your agent [Source 1]. |
| `yaaf add tool <name>` | Scaffolds a new tool file in `src/tools/` [Source 1]. |
| `yaaf add skill <name>` | Scaffolds a new skill file in `skills/` [Source 1]. |
| `yaaf context list` | Inspects the context budget and the size of each section of the system prompt [Source 1]. |
| `yaaf run` | Runs the agent in production mode [Source 1]. |
| `yaaf status` | Shows the current project status [Source 1]. |

**Development REPL Slash Commands**

While running the `yaaf dev` REPL, the following commands are available [Source 1]:

| Command | Description |
| --- | --- |
| `/quit` | Exits the REPL. |
| `/clear` | Clears the screen and resets the conversation history. |
| `/tools` | Lists all tools available to the agent. |
| `/context` | Shows the assembled [System Prompt](../concepts/system-prompt.md) sections and their token sizes. |
| `/cost` | Displays token usage and estimated cost for the current session. |
| `/help` | Shows a list of all available slash commands. |

## Next Steps

Now that you have a basic agent running, you can explore more advanced features:
*   **[Agent](../apis/agent.md)**: Read the full API reference for configuring your agent.
*   **[Tools](../subsystems/tools.md)**: Learn how to build more complex, production-grade tools.
*   **[CLI Runtime](../subsystems/cli-runtime.md)**: Package and distribute your agent as a command-line application.
*   **[Server Runtime](../subsystems/server-runtime.md)**: Deploy your agent as an HTTP API service.

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/getting-started.md