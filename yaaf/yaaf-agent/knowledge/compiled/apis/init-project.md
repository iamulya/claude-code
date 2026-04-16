---
title: initProject
entity_type: api
summary: Scaffolds a new YAAF agent project with TypeScript configuration, sample agents, and tools.
export_name: initProject
source_file: src/cli/init.ts
category: function
stub: false
compiled_at: 2026-04-16T14:16:30.577Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/init.ts
confidence: 1
---

## Overview
`initProject` is a utility function used to bootstrap a new YAAF-based project. It automates the creation of a directory structure and the essential files required to develop, test, and run LLM-powered agents. 

When invoked, the function generates a fully working project environment that includes:
*   **TypeScript Configuration**: Pre-configured `tsconfig.json` for agent development.
*   **Sample Agent**: A baseline agent implementation to serve as a starting point.
*   **Example Tool**: A functional tool scaffold (e.g., a web search tool) demonstrating how to extend agent capabilities.
*   **Templates**: Standardized `SKILL.md` and `SOUL.md` files for defining agent behavior and personality.
*   **Test Scaffold**: A testing environment configured with Vitest.
*   **Environment Setup**: Templates for required environment variables such as `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_API_KEY`.

## Signature / Constructor

```typescript
export async function initProject(nameArg?: string): Promise<void>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `nameArg` | `string` (optional) | The name of the project directory to create. If omitted, the function scaffolds the project in the current working directory. |

## Examples

### Programmatic Project Initialization
This example demonstrates how to trigger the project scaffolding logic programmatically.

```typescript
import { initProject } from 'yaaf/cli';

async function setup() {
  try {
    // Scaffolds a new project in a directory named 'my-weather-agent'
    await initProject('my-weather-agent');
    console.log('Project successfully initialized.');
  } catch (error) {
    console.error('Failed to initialize project:', error);
  }
}

setup();
```

### Scaffolded Tool Example
The `initProject` function generates an example tool similar to the following structure within the new project:

```typescript
import { buildTool } from 'yaaf';

export const searchTool = buildTool({
  name: 'search',
  description: 'Search the web for information.',
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
    // Placeholder for real search integration
    return `Search results for: "${input.query}"`;
  },
});
```

## See Also
* [Source: src/cli/init.ts](https://github.com/example/yaaf/blob/main/src/cli/init.ts)