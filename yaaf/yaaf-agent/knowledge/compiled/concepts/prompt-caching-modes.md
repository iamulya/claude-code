---
title: Prompt Caching Modes
entity_type: concept
summary: Different strategies for caching prompt sections (session, turn, never) to optimize token usage and computation.
primary_files:
 - src/system-prompt-builder.ts
 - src/context-engine.ts
 - src/gateway/soul.ts
related_subsystems:
 - ContextEngine
search_terms:
 - prompt optimization
 - reduce token usage
 - static vs dynamic prompt sections
 - session cache
 - turn-based prompt updates
 - how to cache system prompts
 - SystemPromptBuilder cache
 - volatile prompt data
 - YAAF prompt performance
 - session vs turn vs never
 - prompt section recomputation
 - agent prompt management
stub: false
compiled_at: 2026-04-24T18:00:34.514Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md
compiled_from_quality: documentation
confidence: 0.95
---

## What It Is

Prompt Caching Modes are strategies within YAAF that determine how frequently different sections of a [System Prompt](./system-prompt.md) are computed and updated [Source 1]. This mechanism allows developers to optimize agent performance and reduce [LLM](./llm.md) token costs by avoiding the unnecessary recalculation of static or semi-static information.

The core problem solved by these modes is balancing prompt dynamism with efficiency. An agent's prompt often contains a mix of stable data (e.g., core identity, rules, tool definitions) and volatile data (e.g., current time, recent conversation [Memory](./memory.md)). Recomputing the entire prompt on every turn is inefficient. Caching modes provide granular control, ensuring that only the sections that have actually changed are re-evaluated, while stable sections are cached and reused [Source 1].

## How It Works in YAAF

Prompt Caching is primarily implemented in the `SystemPromptBuilder`, a utility for assembling prompts from various sections [Source 1]. [when](../apis/when.md) adding a section to the builder, a developer can specify a cache mode that dictates its lifecycle.

YAAF defines three distinct caching modes [Source 1]:

| Mode      | When Computed                 | Common Use Case                               |
| :-------- | :---------------------------- | :-------------------------------------------- |
| `session` | Once per session, cached until `reset()` is called. | Identity, rules, [Skills](./skills.md), and other static data. |
| `turn`    | Every time `build()` is called. | Timestamps, conversation memory, and turn-specific context. |
| `never`   | Every time the section is accessed. | Truly volatile data that may change multiple times within a single turn's logic. |

The `session` mode is the default. Sections configured with this mode are computed once and their output is stored for the agent's entire session. The `turn` mode is for dynamic data that must be fresh for each interaction. The `never` mode is for the most volatile data that requires re-computation on every access [Source 1].

## Configuration

Developers configure caching behavior by using different methods on an instance of `SystemPromptBuilder`. The `addStatic()` method corresponds to the `session` cache mode, while `addDynamic()` corresponds to the `turn` mode [Source 1].

The following example demonstrates how to configure a prompt with both static and dynamic sections:

```typescript
import { SystemPromptBuilder } from 'yaaf';

const builder = new SystemPromptBuilder();

// This section uses 'session' caching. It is computed once.
builder.addStatic('identity', () => 'You are a DevOps assistant.', 0);

// This section also uses 'session' caching.
builder.addStatic('rules', () => `
## Rules
- Never delete production databases
- Always ask before modifying config files
`, 50);

// This section uses 'turn' caching. It is recomputed on every build() call.
builder.addDynamic('timestamp', () => `Current time: ${new Date().toISOString()}`, 'time', 210);

const prompt = await builder.build();
```

In this example, the agent's identity and rules are established once and reused across multiple turns. The timestamp, however, is regenerated every time the prompt is built to ensure it is always current [Source 1].

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/prompts.md