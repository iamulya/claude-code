---
summary: A subsystem responsible for modular construction, section-based assembly, and optimization of LLM prompts.
primary_files:
  - src/prompt/systemPrompt.ts
title: Prompt Management
entity_type: subsystem
exports:
  - SystemPromptBuilder
  - envSection
  - rulesSection
  - identitySection
  - dateSection
  - defaultPromptBuilder
  - fromSections
stub: false
compiled_at: 2026-04-16T14:32:08.649Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/prompt/systemPrompt.ts
confidence: 0.9
---

## Purpose
The Prompt Management subsystem provides a structured approach to building and maintaining complex system prompts. It replaces monolithic string concatenation with a composable, section-based architecture. This system is designed to optimize Large Language Model (LLM) performance and cost by explicitly managing prompt caching through the separation of static and dynamic content.

## Architecture
The core of the subsystem is the `SystemPromptBuilder`, which acts as a fluent, section-registry-based composer. It organizes prompts into distinct logical blocks, each with specific caching behaviors and ordering.

### Section Types
The framework categorizes prompt content into two primary types to maximize the efficiency of provider-side prompt caching:

1.  **Static Sections**: These are computed once and cached for the lifetime of the session. They are intended for content that does not change between turns, such as the agent's identity, core rules, and tool definitions.
2.  **Dynamic Sections**: These are recomputed on every turn. Because they change frequently (e.g., current time, memory retrieval, or changing environment variables), they prevent prompt-cache hits. The framework requires developers to provide a reason when adding dynamic sections to ensure they are used judiciously.

### Boundary Marker
The subsystem utilizes a boundary marker to separate static content from dynamic content. This mirrors the `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` constant, ensuring that LLM providers can cache the prefix of the prompt (the static portion) while only processing the dynamic suffix on each turn.

### Priority and Ordering
By default, sections are rendered in the order they are inserted. However, each section can carry an optional `order` weight for precise placement, where lower values result in earlier placement in the final string.

## Key APIs
The subsystem exposes several functions and classes for prompt assembly:

### SystemPromptBuilder
The primary class for constructing prompts. It provides methods like `.addStatic()` and `.addDynamic()` to register prompt fragments.

```typescript
const builder = new SystemPromptBuilder()
  .addStatic('identity', () => 'You are a helpful coding assistant.')
  .addStatic('rules', () => '## Rules\n- Never make up code')
  .addDynamic('memory', () => memoryStore.buildPrompt(), 'memory is updated per turn');

const systemPrompt = await builder.build();
```

### Helper Functions
*   **`defaultPromptBuilder(basePrompt)`**: Creates a `SystemPromptBuilder` pre-loaded with sensible defaults, including an identity section and a standard environment section.
*   **`envSection()`**: Generates a section containing environment metadata such as the current working directory (CWD), platform, shell, OS version, and date.
*   **`rulesSection(rules)`**: Formats an array of strings into a standardized rules/safety section.
*   **`identitySection(prompt)`**: Wraps a persona or identity string into a dedicated section.
*   **`dateSection()`**: A dynamic section that provides the current date and time.
*   **`fromSections(entries)`**: A utility for quick assembly from an array of name/function pairs.

## Configuration
Prompt builders can be integrated into an agent's lifecycle through the `AgentConfig` in two ways:

1.  **Static Injection**: Building the prompt once and passing the resulting string to the `systemPrompt` field.
2.  **Lazy Provider**: Passing a function to `systemPromptProvider`, which allows the prompt to be re-evaluated at the start of each run.

```typescript
// As a lazy provider (re-evaluated each run):
const agent = new Agent({
  systemPromptProvider: () => promptBuilder.build(),
  // ...
});
```

## Extension Points
Developers can extend the prompt management system by creating custom section functions. These functions typically return a string or a section configuration that the `SystemPromptBuilder` can consume. This allows for the creation of domain-specific prompt libraries (e.g., specialized coding rules, security headers, or persona templates) that can be shared across different agents.