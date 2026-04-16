---
summary: Modular units of information injected into the LLM prompt at specific locations with defined priority.
title: Context Section
entity_type: concept
related_subsystems:
  - Context Management
stub: false
compiled_at: 2026-04-16T14:17:09.313Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/contextManager.ts
confidence: 0.9
---

## What It Is
A **Context Section** is a modular unit of information used by YAAF to construct the prompt seen by a Large Language Model (LLM). It allows developers to inject specific data—such as environment variables, Git status, project-specific instructions (e.g., `CLAUDE.md`), or tool schemas—into the conversation without manually concatenating strings.

In YAAF's architecture, Context Sections represent the "fixed overhead" of a session. While conversation messages grow dynamically, Context Sections provide a structured way to manage the system and user context that typically persists or updates independently of the message history.

## How It Works in YAAF
Context Sections are managed by the `ContextManager`. Each section is defined by a unique key and a set of instructions on how and where it should appear in the final payload sent to the LLM.

The framework supports two primary placement strategies:
*   **system**: The content is injected into the system prompt.
*   **user**: The content is injected into the first user message of the conversation.

The `ContextManager` aggregates these sections alongside the message history. If a section's content is set to `null`, it is omitted from the prompt. When multiple sections are present, the `priority` field determines the order of injection, with higher priority values being processed first.

### Technical Definition
As defined in `src/context/contextManager.ts`, a `ContextSection` consists of the following structure:

```typescript
export type ContextSection = {
  /** Unique key for this section (e.g., 'git_status', 'memory') */
  key: string
  /** Content to inject. null = omit this section. */
  content: string | null
  /** Where to inject: 'system' (in system prompt) or 'user' (first user msg) */
  placement: 'system' | 'user'
  /** Priority — higher = injected first */
  priority?: number
}
```

## Configuration
Developers register sections with the `ContextManager` to ensure they are included in the LLM's context window. This is typically done during the initialization of an agent or session.

```typescript
const ctx = new ContextManager({
  contextWindowTokens: 200_000,
  maxOutputTokens: 16_384,
  // ... additional configuration
});

// Registering a section for environment information
ctx.addSection({ 
  key: 'env_info', 
  content: 'OS: Darwin, Node: v20.0.0', 
  placement: 'system',
  priority: 100 
});

// Registering a section for project-specific memory
ctx.addSection({ 
  key: 'memory', 
  content: 'User prefers functional programming patterns.', 
  placement: 'user' 
});
```

## Sources
* `src/context/contextManager.ts`