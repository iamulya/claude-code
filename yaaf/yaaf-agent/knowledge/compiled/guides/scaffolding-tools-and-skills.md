---
summary: How to use the YAAF CLI to quickly generate boilerplate code for new tools and skills.
title: Scaffolding Tools and Skills
entity_type: guide
difficulty: beginner
stub: false
compiled_at: 2026-04-16T14:16:11.499Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/add.ts
confidence: 0.95
---

## Overview
The YAAF CLI provides a scaffolding utility to accelerate the development of agent components. By using the `yaaf add` command, developers can generate standardized boilerplate for tools and skills, ensuring consistency across a project and reducing manual setup time.

## Prerequisites
* YAAF installed in your project.
* A terminal environment with access to the `yaaf` command-line interface.

## Step-by-Step

### 1. Scaffolding a New Tool
To create a new tool, use the `tool` subcommand followed by the desired name.

```bash
yaaf add tool my-custom-tool
```

The CLI generates a TypeScript file containing a tool definition using the `buildTool` factory. The generated boilerplate includes the following structure:

```typescript
import { buildTool } from 'yaaf';

export const myCustomToolTool = buildTool({
  name: 'my-custom-tool',
  description: '[Describe when the LLM should use this tool]',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '[Describe the input]',
      },
    },
    required: ['query'],
  },
  execute: async (input) => {
    // Implement your tool logic here
    return `my-custom-tool result for: ${input.query}`;
  },
});
```

### 2. Scaffolding a New Skill
To create a new skill definition, use the `skill` subcommand.

```bash
yaaf add skill my-skill-name
```

This command generates a `SKILL.md` file. In YAAF, skills are typically documented or defined in Markdown files to provide the LLM with high-level instructions or behavioral patterns.

## Configuration Reference

The `yaaf add` command accepts the following arguments:

| Argument | Type | Description |
| :--- | :--- | :--- |
| `component` | `tool` \| `skill` | The type of component to scaffold. |
| `name` | `string` | The name of the component, used for filenames and internal identifiers. |

## Common Mistakes
*   **Duplicate Names**: Attempting to scaffold a tool or skill with a name that already exists in the target directory will result in an error or potential overwrite, as the CLI checks for existing files using `existsSync`.
*   **Invalid Name Formats**: Using spaces or special characters in the name argument may lead to invalid TypeScript variable names in the generated boilerplate. It is recommended to use kebab-case or camelCase.

## Next Steps
*   Implement the logic within the generated `execute` function of your new tool.
*   Register the new tool within an agent configuration.
*   Define the specific prompts and constraints within the generated `SKILL.md`.

## Sources
* `src/cli/add.ts`