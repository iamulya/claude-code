---
title: Scaffolding New Tools and Skills with yaaf add
summary: Learn how to use the `yaaf add` CLI command to quickly generate boilerplate for new YAAF tools and skills.
entity_type: guide
difficulty: beginner
search_terms:
 - yaaf cli
 - generate new tool
 - create skill file
 - scaffold yaaf component
 - add tool command
 - add skill command
 - boilerplate generation
 - how to create a tool in yaaf
 - yaaf tool template
 - SKILL.md file
 - command line interface
 - getting started with tools
 - tool creation helper
stub: false
compiled_at: 2026-04-24T18:07:45.568Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/add.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

This guide demonstrates how to use the `yaaf add` command-line interface ([CLI](../subsystems/cli.md)) utility to quickly scaffold new components within a YAAF project. The command generates boilerplate code for [Tools](../subsystems/tools.md) and creates placeholder files for [Skill](../apis/skill.md)s, accelerating the development process by providing a standard starting point [Source 1].

You will learn how to:
*   Generate a new Tool file with a pre-defined structure.
*   Generate a new `SKILL.md` file.

## Prerequisites

Before you begin, ensure that the [YAAF CLI](../concepts/yaaf-cli.md) is installed and accessible in your project's environment.

## Step-by-Step

The `yaaf add` command supports scaffolding two primary component types: `tool` and `skill` [Source 1].

### Scaffolding a New Tool

A Tool is a function that an agent can execute to interact with external systems or perform specific tasks. The `yaaf add tool` command creates a new TypeScript file with the necessary structure for a tool definition.

1.  **Run the command:**
    Open your terminal and run the command, replacing `<name>` with the desired name for your tool in PascalCase. For this example, we will create a tool named `WebSearchTool`.

    ```bash
    yaaf add tool WebSearchTool
    ```

2.  **Review the generated file:**
    The command will generate a new file, typically `WebSearchTool.ts`, in the appropriate directory. The contents of the file will be a template based on the `buildTool` helper function [Source 1].

    ```typescript
    // Generated file: WebSearchTool.ts

    import { buildTool } from 'yaaf';

    export const webSearchTool = buildTool({
     name: 'WebSearchTool',
     description: '[Describe [[[[[[[[when]]]]]]]] the [[[[[[[[LLM]]]]]]]] should use this tool]',
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
       return `WebSearchTool result for: ${input.query}`;
     },
    });
    ```

3.  **Implement the tool logic:**
    You must now edit the generated file to provide the actual implementation.
    *   Update the `description` field to clearly explain what the tool does and when the LLM should use it.
    *   Update the `inputSchema` to accurately describe the inputs your tool requires.
    *   Replace the placeholder comment in the `execute` function with your tool's business logic.

### Scaffolding a New Skill

A Skill in YAAF is defined in a `SKILL.md` file, which describes a capability or a set of behaviors for the agent.

1.  **Run the command:**
    To create a new skill definition file, use the `yaaf add skill` command, replacing `<name>` with the name of the skill.

    ```bash
    yaaf add skill DocumentAnalysis
    ```

2.  **Result:**
    This command creates a new file named `SKILL.md` in the appropriate location within your project structure [Source 1]. You can then edit this markdown file to define the skill's purpose, goals, and constraints.

## Common Mistakes

1.  **Not Updating Placeholder Descriptions:** The generated tool template includes placeholder text like `[Describe when the LLM should use this tool]`. Failing to replace this with a clear, detailed description will prevent the agent's LLM from understanding how and when to use the tool effectively.
2.  **Leaving Placeholder Logic in `execute`:** The scaffolded `execute` function contains placeholder logic. Developers must replace this with the actual implementation for the tool to perform its intended function.
3.  **Incorrect `inputSchema`:** The default schema includes a single `query` property. If your tool requires different or additional inputs, you must update the `inputSchema` to match. An incorrect schema will lead to runtime errors or the LLM providing invalid arguments.

## Next Steps

*   After creating a tool, the next step is to integrate it into an agent's configuration so it can be used during task execution.
*   Learn more about writing effective tool descriptions and JSON schemas to ensure the LLM can reliably and safely use your custom tools.

## Sources

[Source 1]: src/cli/add.ts