---
summary: Sections of a system prompt that are recomputed on every turn, used for content that changes frequently like memory or environment variables.
primary_files:
 - src/prompt/systemPrompt.ts
 - src/constants/prompts.ts
 - src/constants/systemPromptSections.ts
title: Dynamic Prompt Sections
entity_type: concept
related_subsystems:
 - prompting
see_also:
 - Static Prompt Sections
search_terms:
 - prompt sections that change
 - how to update system prompt every turn
 - uncached prompt sections
 - turn-specific prompt content
 - adding memory to system prompt
 - environment variables in prompt
 - dynamic prompt content
 - YAAF prompt builder
 - per-turn prompt computation
 - avoiding prompt cache hits
 - SystemPromptBuilder dynamic sections
 - what is a dynamic section
 - lazy prompt evaluation
stub: false
compiled_at: 2026-04-24T17:54:35.740Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/prompt/systemPrompt.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

A Dynamic Prompt Section is a component of an agent's [System Prompt](./system-prompt.md) that is re-evaluated on every turn of a conversation [Source 1]. This contrasts with Static Prompt Sections, which are computed once and cached for the duration of a session.

Dynamic sections are necessary for including information that changes frequently, such as:
*   The agent's short-term [Memory](./memory.md).
*   The current date and time.
*   Environment variables like the current working directory (`cwd`).

Because they are recomputed on each turn, dynamic sections prevent the use of prompt-caching mechanisms, which can impact performance and cost. Therefore, they should be used sparingly and only for content that is genuinely volatile [Source 1].

## How It Works in YAAF

In YAAF, dynamic sections are managed by the `SystemPromptBuilder` class. This builder composes the final system prompt by assembling various static and dynamic sections [Source 1].

[when](../apis/when.md) a system prompt is constructed, all static sections are rendered first. A special boundary marker is then inserted. Finally, all dynamic sections are rendered after this marker. This separation clearly delineates the cacheable (static) part of the prompt from the non-cacheable (dynamic) part [Source 1].

Developers add dynamic sections using the `.addDynamic()` method on a `SystemPromptBuilder` instance. This method requires a name for the section, a function to generate its content, and a string argument explaining why the section must be dynamic [Source 1].

YAAF provides several built-in functions for creating common dynamic sections, such as `dateSection()` for the current date and time, and `envSection()` for environment details like `cwd`, OS, and platform information [Source 1].

## Configuration

Dynamic sections are configured during the agent's setup phase using the `SystemPromptBuilder`.

The following example demonstrates adding two dynamic sections: one for environment information and another for conversational memory.

```typescript
// Source: src/prompt/systemPrompt.ts [Source 1]

const builder = new SystemPromptBuilder()
  // Static sections are added first
  .addStatic('identity', () => 'You are a helpful coding assistant.')
  .addStatic('rules', () => '## Rules\n- Never make up code\n- Always ask before deleting files')
  
  // Dynamic sections are added with a reason for their volatility
  .addDynamic('env', () => `CWD: ${process.cwd()}\nDate: ${new Date().toISOString()}`,
    'cwd and date change per session')
  .addDynamic('memory', () => memoryStore.buildPrompt(), 'memory is updated per turn');

// The built prompt can be passed to the agent configuration.
// Using a provider function ensures the prompt is rebuilt for each run.
const agent = new Agent({
  systemPromptProvider: () => builder.build(),
  // ... other agent configuration
});
```

## See Also

*   Static Prompt Sections

## Sources

[Source 1]: src/prompt/systemPrompt.ts