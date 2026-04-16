---
title: System Prompt
entity_type: concept
summary: The foundational instructions that define an agent's behavior, persona, and constraints.
related_subsystems:
  - Agent
  - CLI
stub: false
compiled_at: 2026-04-16T14:07:46.547Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/getting-started.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/context.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/anthropic.ts
confidence: 1
---

## What It Is
The System Prompt is the primary mechanism for steering an LLM-powered agent's behavior. It establishes the agent's identity (persona), operational boundaries (constraints), and specific capabilities (skills). In YAAF, the system prompt is not merely a static string but a dynamically assembled context that can incorporate external files and modular instructions to maintain a clean separation of concerns.

## How It Works in YAAF
YAAF treats the system prompt as a composite entity. While it can be defined as a simple string during agent initialization, the framework is designed to aggregate instructions from multiple project sources at runtime.

### Assembly Logic
When an agent is initialized or run, YAAF scans the project structure to build the final prompt:
- **Core Prompt**: The `systemPrompt` string defined in the `Agent` constructor.
- **Skills**: Markdown files located in the `skills/` directory are injected as specific behavioral instructions.
- **Soul**: The `SOUL.md` file, which defines the agent's name, tone, and rules, is optionally included (typically via the `yaaf/gateway`).

### Provider Abstraction
YAAF abstracts the structural requirements of different LLM providers. For example, while OpenAI-compatible models treat the system prompt as a message with a `system` role, the Anthropic adapter (implementing the Messages API) maps the prompt to a top-level `system` field, as it is not considered a standard message role in that architecture.

### Inspection and Debugging
The framework provides tools to inspect the final assembled prompt:
- **CLI**: The `yaaf context list` command scans the project and displays what will be injected into the prompt.
- **REPL**: During development using `yaaf dev`, the `/context` slash command shows the various system prompt sections and their respective token sizes.

## Configuration
The system prompt can be configured directly in code or managed through the filesystem.

### Code Configuration
The most direct method is passing a string to the `Agent` constructor in `src/agent.ts`.

```typescript
import { Agent } from 'yaaf';

const agent = new Agent({
  name: 'Assistant',
  systemPrompt: 'You are a helpful assistant. Use a professional tone.',
  // ... other config
});
```

### Filesystem Configuration
For production-grade agents, YAAF encourages using specific files to manage prompt complexity:
- **`skills/*.md`**: Used for modular instructions (e.g., `skills/code-review.md`).
- **`SOUL.md`**: Used for defining the "personality" of the agent, including its name and core rules.

The project structure typically organizes these components as follows:
```
my-agent/
├── src/
│   └── agent.ts          # Main configuration
├── skills/
│   └── RESEARCH.md       # Skill-specific instructions
└── SOUL.md               # Persona and constraints
```