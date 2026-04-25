---
title: Developing Agents with the YAAF Dev REPL
entity_type: guide
summary: Learn how to use the YAAF CLI's interactive REPL for rapid agent development, testing, and debugging.
difficulty: beginner
search_terms:
 - interactive agent testing
 - YAAF CLI
 - agent development loop
 - how to debug YAAF agent
 - REPL for LLM agents
 - yaaf dev command
 - live agent chat
 - test agent tools
 - inspect agent context
 - reset agent conversation
 - check token usage
 - rapid prototyping agents
 - local agent development
stub: false
compiled_at: 2026-04-24T18:06:57.388Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/dev.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

This guide explains how to use the YAAF development Read-Eval-Print Loop (REPL), an interactive command-line environment for building and testing agents. The REPL allows developers to chat directly with their agent, inspect its state, and debug its behavior in real-time without needing a separate frontend application [Source 1].

By following this guide, you will learn how to:
*   Start the interactive development session.
*   Send messages to your agent.
*   Use built-in commands to inspect context, [Tools](../subsystems/tools.md), and token usage.
*   Reset the conversation state.
*   Exit the REPL.

## Prerequisites

Before starting, ensure you have a functional YAAF agent project set up and all its dependencies installed. The `yaaf dev` command must be run from the root directory of your agent project.

## Step-by-Step

The development REPL is invoked through the YAAF command-line interface ([CLI](../subsystems/cli.md)).

### Step 1: Start the REPL

Navigate to your agent's project directory in your terminal and run the following command:

```bash
yaaf dev
```

This will start the agent and present you with an interactive prompt, ready to accept input [Source 1].

### Step 2: Chat with the Agent

Once the REPL is running, you can interact with your agent by typing a message and pressing Enter. The agent will process the input and print its response to the console.

```
> Hello, who are you?
I am a helpful assistant powered by YAAF. How can I assist you today?
>
```

### Step 3: Use REPL Commands

The REPL includes several built-in slash commands for debugging and managing the session. These commands are not sent to the agent but are interpreted by the REPL itself [Source 1].

*   **Inspect the [System Prompt](../concepts/system-prompt.md):** To view the full system context and prompt being used by the agent, use the `/context` command.
    ```
    > /context
    (The agent's system prompt and configuration will be displayed here)
    ```

*   **List Available Tools:** To see a list of all tools the agent has been configured to use, run `/tools`.
    ```
    > /tools
    (A list of the agent's available tools will be displayed here)
    ```

*   **Check Token Usage:** To get a summary of token consumption for the current session, use the `/cost` command.
    ```
    > /cost
    (A summary of prompt tokens, completion tokens, and total cost will be displayed here)
    ```

*   **Reset the Conversation:** To clear the current conversation history and start fresh, use `/clear`. This is useful for testing the agent's behavior from a clean state.
    ```
    > /clear
    Conversation has been reset.
    ```

*   **Exit the REPL:** To stop the agent and exit the interactive session, use the `/quit` command.
    ```
    > /quit
    Goodbye!
    ```

## Common Mistakes

1.  **Command Not Found:** If your shell returns `yaaf: command not found`, ensure that YAAF is installed correctly and that its `bin` directory is in your system's `PATH`.
2.  **Agent Fails to Start:** The REPL may fail to start if the agent's configuration is invalid (e.g., missing API keys, incorrect model names). Check the console for error messages upon starting `yaaf dev`.
3.  **Typing Slash Commands as Messages:** Remember that commands like `/tools` or `/context` are interpreted by the REPL. If you want to send a message to the agent that starts with a slash, you may need to escape it, depending on your agent's input parsing.

## Next Steps

After familiarizing yourself with the development REPL, you can move on to more advanced tasks:
*   Build and register a custom tool for your agent.
*   Configure different [LLM](../concepts/llm.md) providers and models.
*   Package your agent for deployment.

## Sources

[Source 1] src/cli/dev.ts