---
summary: A plugin capability interface that allows plugins to dynamically inject relevant context into an agent's prompt.
title: ContextProvider
entity_type: concept
see_also:
 - "[AgentFS Plugin](../plugins/agent-fs-plugin.md)"
 - "[Honcho Plugin](../plugins/honcho-plugin.md)"
 - "[Context Window](./context-window.md)"
 - "[Section-based Prompt Assembly](./section-based-prompt-assembly.md)"
search_terms:
 - dynamic prompt injection
 - how to add context to prompts
 - automatic context management
 - plugin context provider
 - injecting data into LLM
 - context provider interface
 - AgentFS context
 - Honcho context
 - prompt enrichment
 - contextual information for agents
 - auto-context injection
stub: false
compiled_at: 2026-04-25T00:17:28.193Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/agentfs.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/honcho.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

A `ContextProvider` is a standardized plugin capability interface within YAAF. Its purpose is to allow plugins to dynamically contribute relevant information to an agent's prompt before it is sent to an [LLM](./llm.md). This mechanism enables a modular architecture where the agent's core logic does not need to be aware of every potential source of context. Instead, plugins can encapsulate the logic for retrieving and formatting specific types of contextual data, such as filesystem state, user memory, or external data sources.

The primary problem solved by the `ContextProvider` concept is the decoupling of context generation from the agent's main reasoning loop. The agent runtime can simply query all registered `ContextProvider` plugins to assemble a complete, context-rich prompt, making the system more extensible and maintainable.

## How It Works in YAAF

Plugins that manage state or have access to information that would be useful for an [LLM](./llm.md)'s reasoning process can implement the `ContextProvider` interface. During an [Agent Turn](./agent-turn.md), just before the prompt is finalized for an [LLM Call](./llm-call.md), the YAAF runtime iterates through all registered plugins that have this capability.

Each `ContextProvider` is invoked to supply its piece of context. This context is then integrated into the final prompt, typically within a designated section. This ensures the [LLM](./llm.md) has the most current and relevant information to perform its task.

Two examples of this pattern in YAAF are:

*   **[AgentFS Plugin](../plugins/agent-fs-plugin.md)**: This plugin implements `ContextProvider` to inject a representation of its virtual filesystem tree into the prompt. This gives the [LLM](./llm.md) awareness of available files, directories, and mounted tools, enabling it to perform filesystem operations more effectively [Source 1].
*   **[Honcho Plugin](../plugins/honcho-plugin.md)**: This plugin, which provides cloud-based memory and user modeling, implements `ContextProvider` for "auto-context injection." It likely contributes relevant user memories, conversation history, or insights from the Honcho service to ground the agent's responses and decisions [Source 2].

## Configuration

The `ContextProvider` interface itself does not have a dedicated configuration. However, the plugins that implement it may offer configuration options that affect the context they provide. For instance, the `HonchoPlugin` has a `contextTokens` setting in its configuration, which likely controls the [Token Budget](./token-budget.md) allocated to the context it injects into the prompt [Source 2]. Configuration is therefore specific to each implementing plugin.

## See Also

*   [AgentFS Plugin](../plugins/agent-fs-plugin.md)
*   [Honcho Plugin](../plugins/honcho-plugin.md)
*   [Context Window](./context-window.md)
*   [Section-based Prompt Assembly](./section-based-prompt-assembly.md)

## Sources

[Source 1]: src/integrations/agentfs.ts
[Source 2]: src/integrations/honcho.ts