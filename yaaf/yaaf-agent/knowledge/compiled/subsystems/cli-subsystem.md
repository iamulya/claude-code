---
title: CLI Subsystem
entity_type: subsystem
summary: Provides command-line tools for project initialization, scaffolding, and management within the YAAF framework.
primary_files:
  - src/cli/init.ts
exports:
  - initProject
stub: false
compiled_at: 2026-04-16T14:16:33.642Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/init.ts
confidence: 0.95
---

## Purpose
The CLI Subsystem provides a suite of command-line utilities designed to streamline the development lifecycle of LLM-powered agents. Its primary responsibility is project scaffolding, allowing developers to generate a standardized, production-ready project structure with minimal manual configuration. By automating the creation of boilerplate code, configuration files, and directory structures, the subsystem ensures consistency across YAAF-based projects.

## Architecture
The subsystem is structured around command execution modules that interact with the host file system. The core logic resides in `src/cli/init.ts`, which handles the `yaaf init` command.

### Project Scaffolding
When initializing a project, the subsystem generates a comprehensive directory structure and set of files:
- **Configuration**: TypeScript configuration and environment variable templates.
- **Agent Logic**: A sample entry point featuring a pre-configured agent.
- **Tools**: Example tool implementations (e.g., a web search tool) using the framework's tool-building utilities.
- **Documentation Templates**: Standardized Markdown files for defining agent behavior, specifically `SKILL.md` and `SOUL.md`.
- **Testing**: A test scaffold integrated with the Vitest framework.

## Key APIs
The CLI Subsystem exposes programmatic entry points for its commands, allowing the scaffolding logic to be invoked outside of a terminal environment if necessary.

### initProject
The `initProject` function is the primary entry point for project creation.
- **Signature**: `initProject(nameArg?: string): Promise<void>`
- **Functionality**: Creates a new directory (if a name is provided) and populates it with the standard YAAF project template. It utilizes `node:fs/promises` for asynchronous file operations and `node:path` for cross-platform path resolution.

## Configuration
The CLI Subsystem prepares the environment for agent execution by scaffolding a `.env` template. This template includes placeholders for major LLM provider credentials:
- `GOOGLE_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

## Extension Points
The scaffolding process includes an example of how to extend the agent's capabilities using the `buildTool` utility. The generated `searchTool` serves as a template for developers to implement custom integrations:

```typescript
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

### Sources
- `src/cli/init.ts`