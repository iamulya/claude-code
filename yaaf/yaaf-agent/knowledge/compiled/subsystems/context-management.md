---
primary_files:
  - src/context/contextManager.ts
summary: Orchestrates the LLM context window, including message history, system/user context injection, and automated compaction.
title: Context Management
entity_type: subsystem
exports:
  - ContextManager
  - CompactionStrategy
  - SummarizeStrategy
  - CompositeStrategy
  - SystemPromptBuilder
  - ContextEngine
stub: false
compiled_at: 2026-04-16T14:05:49.352Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/agent.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/compaction.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/human-in-the-loop.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/prompts.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/circuitBreaker.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/compactionPrompts.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/contentReplacement.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/contextManager.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/historySnip.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/strategies.ts
confidence: 1
---

## Purpose
The Context Management subsystem solves the problem of the finite LLM context window. It manages the full lifecycle of what the LLM sees during an agent session, including system prompts, user-provided context (such as memory files), and the running conversation history. Its primary responsibility is to monitor token usage and trigger automated **compaction** to prevent context overflow while preserving as much relevant information as possible.

## Architecture
The subsystem is structured around several key components that handle prompt assembly, token budgeting, and history reduction.

### ContextManager
The `ContextManager` is the central orchestrator. it tracks:
- **System Context**: Cached information like Git status, date, and environment info.
- **User Context**: Static context from files like `CLAUDE.md` or memory stores.
- **Conversation Messages**: The running history of user, assistant, and tool messages.
- **Token Budgeting**: Real-time tracking of usage against the model's context window.

### SystemPromptBuilder
A section-based, cache-aware utility for assembling the system prompt. It supports:
- **Static Sections**: Cached for the duration of a session