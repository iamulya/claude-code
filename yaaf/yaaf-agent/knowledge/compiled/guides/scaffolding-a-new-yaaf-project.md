---
summary: A step-by-step guide on how to initialize a new YAAF agent project using the `yaaf init` CLI command.
title: Scaffolding a New YAAF Project
entity_type: guide
difficulty: beginner
search_terms:
 - create new yaaf project
 - initialize yaaf agent
 - yaaf cli init
 - start a new agent
 - project setup
 - boilerplate agent code
 - how to start with yaaf
 - yaaf project structure
 - generate agent files
 - scaffold agent
 - new project command
 - getting started guide
stub: false
compiled_at: 2026-04-25T00:26:50.103Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/init.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

This guide walks through the process of creating a new, fully-functional YAAF agent project from scratch using a single command. The YAAF [CLI](../subsystems/cli.md) provides an `init` command that scaffolds a complete project structure, allowing developers to get started quickly [Source 1].

By following this guide, you will:
- Use the `yaaf init` command to generate a new project directory.
- Understand the file structure of a standard YAAF agent project.
- Run the scaffolded agent for the first time.

The generated project includes a TypeScript configuration, a main entry point with a sample [Agent](../apis/agent.md), an example tool, templates for the agent's [Skill](../apis/skill.md) and [Soul](../apis/soul.md), and a test scaffold [Source 1].

## Prerequisites

Before you begin, ensure you have the following installed and configured:

1.  **Node.js and npm (or a compatible package manager):** YAAF is a TypeScript framework and runs on Node.js.
2.  **YAAF CLI:** The `yaaf` command-line tool must be installed globally or accessible via `npx`.
3.  **LLM API Key:** The scaffolded agent requires an API key for an LLM provider. You must set one of the following environment variables [Source 1]:
    - `GOOGLE_API_KEY`
    - `OPENAI_API_KEY`
    - `ANTHROPIC_API_KEY`

## Step-by-Step

### Step 1: Run the `init` Command

Open your terminal and navigate to the directory where you want to create your new project. Run the `yaaf init` command, followed by the desired name for your project.

```bash
yaaf init my-new-agent
```

If a name is not provided, the [CLI](../subsystems/cli.md) may prompt you for one. This command creates a new directory named `my-new-agent` and populates it with the necessary files and subdirectories [Source 1].

### Step 2: Review the Project Structure

After the command completes, your new project directory will contain the following structure [Source 1]:

```
my-new-agent/
├── src/
│   ├── tools/
│   │   └── search.ts   # An example tool
│   ├── index.ts        # Main agent entry point
│   └── index.test.ts   # Test scaffold
├── SKILL.md            # Template for defining agent skills
├── SOUL.md             # Template for defining the agent's persona
├── package.json
└── tsconfig.json
```

-   **`src/index.ts`**: This is the main application file where the [Agent](../apis/agent.md) is defined and instantiated.
-   **`src/tools/search.ts`**: An example tool that demonstrates how to define custom functionality for the agent.
-   **`SKILL.md`**: A markdown file used to declare the agent's high-level capabilities. See [How to use Skills in YAAF Agents](./how-to-use-skills-in-yaaf-agents.md).
-   **`SOUL.md`**: A markdown file for defining the agent's personality, tone, and core directives. See [Soul](../apis/soul.md).
-   **`package.json`**: Defines project metadata, scripts, and dependencies.
-   **`tsconfig.json`**: The TypeScript compiler configuration for the project.

### Step 3: Install Dependencies

Navigate into the newly created project directory and install the required npm packages.

```bash
cd my-new-agent
npm install
```

### Step 4: Set Your LLM API Key

Before running the agent, you must configure your LLM provider's API key. Export it as an environment variable in your terminal session.

For example, if you are using OpenAI:
```bash
export OPENAI_API_KEY="your-key-here"
```
Replace the placeholder with your actual API key [Source 1].

### Step 5: Run the Agent

You can now run your new agent using the start script defined in `package.json`.

```bash
npm start
```

This will typically execute the `src/index.ts` file using a TypeScript runner like `tsx`. You should see output in your console indicating that the agent is running and ready to receive input.

## Common Mistakes

1.  **API Key Not Set:** If you forget to set the environment variable for your LLM API key, the agent will fail to initialize its connection to the LLM provider and will likely exit with an authentication error.
2.  **Dependencies Not Installed:** Running `npm start` before `npm install` will result in "module not found" errors. Always install dependencies after scaffolding a new project.
3.  **Directory Already Exists:** The `yaaf init` command may fail if a directory with the same name as your project already exists in the current location. Ensure the target directory name is unique.

## Next Steps

Now that you have a basic agent running, you can start customizing it:

-   **Add More Tools:** Learn how to create new tools and skills with [Scaffolding New Tools and Skills with yaaf add](./scaffolding-new-tools-and-skills-with-yaaf-add.md).
-   **Refine Agent Behavior:** Edit the `SOUL.md` and `SKILL.md` files to change your agent's personality and capabilities.
-   **Interactive Development:** Use the YAAF REPL for a more fluid development experience by following the [Developing Agents with the YAAF Dev REPL](./developing-agents-with-the-yaaf-dev-repl.md) guide.
-   **Create a User Interface:** Expose your agent's functionality through a command-line interface by [Building a CLI for Your YAAF Agent](./building-a-cli-for-your-yaaf-agent.md).

## Sources
[Source 1] Source: src/cli/init.ts