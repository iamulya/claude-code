---
title: Interactive Agent Development
entity_type: guide
summary: How to use the YAAF dev CLI to interactively test agent behavior, inspect system prompts, and monitor token usage.
difficulty: beginner
stub: false
compiled_at: 2026-04-16T14:16:24.531Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/dev.ts
confidence: 0.9
---

## Overview
The YAAF development CLI provides an interactive Read-Eval-Print Loop (REPL) designed for rapid agent prototyping and debugging. This environment allows developers to communicate with agents in real-time, inspect the underlying system prompts, verify tool availability, and monitor the financial or computational cost of LLM interactions through token usage tracking.

## Prerequisites
- A YAAF project environment.
- Node.js installed and configured.
- An agent configuration accessible within the project directory.

## Step-by-Step

### 1. Launching the Dev REPL
To start an interactive session, execute the `dev` command via the YAAF CLI. This command initializes the agent and opens a terminal interface for direct communication.

```bash
npx yaaf dev
```

The framework uses `node:readline` to manage the terminal interface and `node:fs` to resolve and load the necessary agent configurations from the local file system.

### 2. Interacting with the Agent
Once the session is active, you can type messages directly into the prompt. The agent processes these inputs and returns responses to the terminal, simulating a production chat environment.

### 3. Managing the Session with Slash Commands
The REPL supports several slash commands to inspect the agent's internal state and manage the conversation flow:

*   **/context**: Use this command to inspect the current system prompt. This is useful for verifying how instructions and state are being formatted for the LLM.
*   **/tools**: Use this command to list all tools currently available to the agent. This helps ensure that tool definitions are correctly loaded and recognized by the framework.
*   **/cost**: Use this command to display the token usage for the current session. This provides immediate feedback on the resource consumption of your prompts and agent responses.
*   **/clear**: Use this command to reset the conversation. This clears the current message history, allowing you to test agent behavior from a clean state without exiting the REPL.
*   **/quit**: Use this command to exit the interactive session and return to the standard terminal prompt.

## Configuration Reference
The interactive development environment is driven by the `runDev` function, which processes command-line arguments to configure the session.

| Argument | Type | Description |
| :--- | :--- | :--- |
| `args` | `string[]` | An array of strings representing command-line arguments, typically used to specify the path to the agent configuration or environment settings. |