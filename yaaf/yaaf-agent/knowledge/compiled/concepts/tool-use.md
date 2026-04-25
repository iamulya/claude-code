---
title: Tool Use
entity_type: concept
summary: The capability of an LLM to use external functions or APIs, which sometimes must be explicitly disabled for certain tasks like summarization.
search_terms:
 - disable tool calling
 - prevent function calling
 - anti-tool preamble
 - LLM summarization without tools
 - force model to summarize
 - stop agent from using tools
 - context compaction prompt
 - structured summarization
 - how to control tool use
 - YAAF function calling
 - model instruction following
stub: false
compiled_at: 2026-04-24T18:04:28.736Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/compactionPrompts.ts
compiled_from_quality: unknown
confidence: 0.85
---

## What It Is

Tool Use refers to the ability of a Large Language Model ([LLM](./llm.md)) within an agent to invoke external functions or APIs to acquire information or perform actions. While this capability is central to agent functionality, it can be undesirable for certain tasks. For example, [when](../apis/when.md) an LLM is instructed to summarize a conversation, it should perform the summarization directly rather than attempting to call a tool. To prevent the model from misinterpreting such instructions, YAAF employs specific prompting techniques to inhibit tool use when necessary [Source 1].

## How It Works in YAAF

YAAF manages the inhibition of tool use through an "anti-tool preamble" included in certain prompts. This preamble is a set of instructions designed to explicitly direct the model to follow the primary instruction (e.g., summarization) and to avoid calling any [Tools](../subsystems/tools.md) [Source 1].

This mechanism is notably used in the context of conversation summarization, also known as [Context Compaction](./context-compaction.md). The `buildCompactionPrompt` function, which generates prompts for creating structured conversation summaries, incorporates this anti-tool preamble to ensure the model produces a high-quality summary instead of attempting to use a tool [Source 1].

## Sources

[Source 1] `src/context/compactionPrompts.ts`