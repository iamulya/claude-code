---
summary: The management and formatting of conversational history across multiple turns in an agent interaction.
title: multi-turn history
entity_type: concept
related_subsystems:
 - runtime
see_also:
 - concept:Agent Turn
 - api:DevUiOptions
search_terms:
 - conversation history management
 - chat history formatting
 - how to handle multiple turns
 - server-side history formatting
 - dialogue state tracking
 - maintaining conversation context
 - YAAF dev ui history
 - multiTurn option
 - long conversations with agents
 - agent memory over time
 - turn-based interaction
 - session history
stub: false
compiled_at: 2026-04-25T00:21:47.704Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/devUi.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Multi-turn history is the concept of managing and formatting the sequence of user inputs and agent responses over the course of an entire conversation. Since Large Language Models (LLMs) are typically stateless, the framework must explicitly provide the conversational history as context for each new [Agent Turn](./agent-turn.md). This ensures the agent can understand follow-up questions, references to previous statements, and the overall flow of the dialogue.

This process involves not only storing the messages but also formatting them into a structure that the underlying LLM can process effectively.

## How It Works in YAAF

YAAF implements server-side logic for managing and formatting conversational history. The framework tracks the dialogue and prepares it for inclusion in the context sent to the LLM for the next turn.

The status of this feature is exposed to various parts of the framework. For example, the YAAF Development UI is made aware of whether server-side history formatting is active through a configuration option. The `DevUiOptions` type includes a `multiTurn` boolean property that explicitly signals if this functionality is enabled for the running agent instance [Source 1]. This allows development tools to accurately reflect the agent's conversational capabilities.

## Configuration

The activation of multi-turn history formatting is represented as a boolean flag in configuration objects passed to framework components. The `DevUiOptions` type provides an example of how this state is communicated.

```typescript
export type DevUiOptions = {
  /** Agent display name */
  name: string;
  /** Agent version */
  version: string;
  /** Whether the agent supports runStream() */
  streaming: boolean;
  /** Model identifier (shown in inspector). Null = not known. */
  model: string | null;
  /** Whether server-side multi-turn history formatting is active */
  multiTurn: boolean;
  /** System prompt to show read-only in Settings. Null = not exposed. */
  systemPrompt: string | null;
};
```
In this example, the `multiTurn` property indicates to the Dev UI whether the server is managing the conversation history across multiple turns [Source 1].

## See Also

- [Agent Turn](./agent-turn.md)
- [DevUiOptions](../apis/dev-ui-options.md)

## Sources

[Source 1]: src/runtime/devUi.ts