---
summary: The architectural pattern of dividing system prompts into modular sections to optimize for caching and context management.
title: System Prompt Composition
entity_type: concept
related_subsystems:
  - Prompting
stub: false
compiled_at: 2026-04-16T14:32:08.000Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/prompt/systemPrompt.ts
confidence: 0.95
---

## What It Is
System Prompt Composition is an architectural pattern in YAAF that treats the system prompt as a modular assembly of discrete sections rather than a monolithic string. This approach addresses the complexity of managing LLM instructions by allowing developers to decouple persona definitions, safety rules, environment metadata, and dynamic session state.

The primary goal of this composition pattern is to optimize for **prompt caching**. By separating content that remains stable (static) from content that changes frequently (dynamic), YAAF ensures that the LLM provider can cache the bulk of the system instructions, reducing latency and token costs.

## How It Works in YAAF
The framework implements this concept through the `SystemPromptBuilder` class. This builder acts as a registry for prompt sections, which are rendered into a final string based on their type and priority.

### Section Types
YAAF distinguishes between two primary types of sections:
1.  **Static Sections**: These are computed once and cached for the lifetime of the session. They are intended for content that does not change between turns, such as the agent's identity, core rules, or tool definitions.
2.  **Dynamic Sections**: These are recomputed on every turn. Because they change frequently, they prevent prompt-cache hits for any content following them. Developers must provide a reason when adding a dynamic section to justify the cache miss.

### The Boundary Marker
To maximize cache efficiency, YAAF utilizes a **boundary marker** (referencing the `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` constant). The builder ensures that static, cross-session cacheable content is placed before this marker, while per-user or per-turn dynamic content is placed after it.

### Priority and Ordering
By default, sections are rendered in the order they are inserted into the builder. However, each section can be assigned an optional `order` weight. Sections with lower weights are rendered earlier in the final prompt, allowing for precise placement of critical instructions or identity markers.

### Standard Sections
YAAF provides several pre-built section generators:
*   **Identity**: Defines the persona or role of the agent.
*   **Rules**: Contains safety guidelines and operational constraints.
*   **Environment**: Injects system metadata such as the current working directory (CWD), platform, shell, and OS version.
*   **Date/Time**: Injects the current timestamp, typically treated as a dynamic section.

## Configuration
Developers can use the fluent API of the `SystemPromptBuilder` to assemble prompts or use helper functions for common configurations.

### Using the Fluent API
```typescript
const builder = new SystemPromptBuilder()
  .addStatic('identity', () => 'You are a helpful coding assistant.')
  .addStatic('rules', () => '## Rules\n- Never make up code\n- Always ask before deleting files')
  .addDynamic('env', () => `CWD: ${process.cwd()}`, 'CWD may change if the agent navigates directories')
  .addDynamic('memory', () => memoryStore.buildPrompt(), 'memory is updated per turn');

// Render the prompt
const systemPrompt = await builder.build();
```

### Using Default Builders
The `defaultPromptBuilder` function provides a pre-configured instance containing standard identity and environment sections.

```typescript
const builder = defaultPromptBuilder('You are a helpful coding assistant.')
  .addStatic('rules', () => '## Rules\n- Always verify before deleting');

const agent = new Agent({ 
  systemPrompt: await builder.build() 
});
```

### Integration with Agents
The composed prompt can be passed to an agent as a static string or as a `systemPromptProvider` for lazy evaluation, ensuring the prompt is re-evaluated at the start of each run.

```typescript
const agent = new Agent({
  systemPromptProvider: () => promptBuilder.build(),
});
```