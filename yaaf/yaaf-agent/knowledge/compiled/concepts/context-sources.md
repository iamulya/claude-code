---
title: Context Sources
summary: Mechanisms and locations from which YAAF gathers information to construct the system prompt and agent context.
entity_type: concept
related_subsystems:
 - CLI
search_terms:
 - system prompt construction
 - how to build agent context
 - where does system prompt come from
 - agent background information
 - context injection
 - finding context files
 - yaaf context list command
 - project context scanning
 - runtime prompt assembly
 - configuring agent instructions
 - prompt engineering sources
 - agent setup information
stub: false
compiled_at: 2026-04-24T17:53:46.459Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/cli/context.ts
compiled_from_quality: unknown
confidence: 0.85
---

## What It Is

Context Sources are the various locations and files within a YAAF project from which the framework gathers information to construct an agent's [System Prompt](./system-prompt.md) [Source 1]. The system prompt provides the Large Language Model ([LLM](./llm.md)) with essential background information, instructions, and data necessary to perform its tasks effectively. The concept of Context Sources provides a structured way to manage and assemble this foundational context at runtime.

## How It Works in YAAF

YAAF discovers and assembles context by scanning the project's file system for designated context sources [Source 1]. The framework reads the content from these sources and injects it into the system prompt that is sent to the LLM.

The implementation details suggest a file-based [Discovery](./discovery.md) mechanism, as evidenced by the use of Node.js file system modules like `readFileSync` and `readdirSync` in related tooling [Source 1].

Developers can inspect the final, assembled system prompt by using the `yaaf context list` command-line interface ([CLI](../subsystems/cli.md)) tool. This command scans for all available context sources and displays the combined output, showing exactly what will be provided to the agent at runtime [Source 1].

## Sources

[Source 1] src/cli/context.ts