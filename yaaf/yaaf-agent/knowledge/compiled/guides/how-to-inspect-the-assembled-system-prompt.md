---
title: How to Inspect the Assembled System Prompt
summary: Learn how to use the YAAF CLI to inspect the system prompt that will be injected into your agent at runtime.
entity_type: guide
difficulty: beginner
search_terms:
 - debug system prompt
 - view agent context
 - how to see final prompt
 - YAAF CLI context command
 - inspect agent instructions
 - check system message
 - list context sources
 - verify agent prompt
 - troubleshoot agent behavior
 - what is my agent's prompt
 - yaaf context list
 - assembled prompt inspection
stub: false
compiled_at: 2026-04-24T18:07:11.302Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/context.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

This guide explains how to use the YAAF command-line interface ([CLI](../subsystems/cli.md)) to view the complete, assembled [System Prompt](../concepts/system-prompt.md) for an agent. The system prompt is constructed from various [Context Sources](../concepts/context-sources.md) within a project. Inspecting the final prompt is a crucial step for debugging agent behavior and verifying that all necessary instructions and context are being included at runtime [Source 1].

## Prerequisites

- A YAAF project must be initialized.
- The [YAAF CLI](../concepts/yaaf-cli.md) must be installed and accessible in your system's PATH.

## Step-by-Step

To inspect the system prompt that will be provided to an agent, follow these steps.

1.  **Navigate to Project Root**: Open a terminal or command prompt and change the directory to the root of your YAAF agent project.

2.  **Run the Context Command**: Execute the `context list` command.

    ```bash
    yaaf context list
    ```

3.  **Analyze the Output**: The command will scan the project for all configured context sources, assemble them, and print the final system prompt to the console [Source 1]. This output represents the exact content that will be injected into the system prompt [when](../apis/when.md) the agent runs [Source 1].

## Next Steps

After inspecting the prompt, you may want to:
- Modify the project's context sources if the prompt is incorrect or incomplete.
- Proceed with testing your agent, now confident in its base instructions.

## Sources

- [Source 1] src/cli/context.ts