---
title: Soul
entity_type: concept
summary: An optional configuration file defining an agent's personality, tone, and rules.
related_subsystems:
  - yaaf/gateway
stub: false
compiled_at: 2026-04-16T14:07:53.926Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/getting-started.md
confidence: 0.9
---

## What It Is
The Soul is a concept in YAAF used to define the identity and behavioral characteristics of an agent. It serves as a dedicated configuration layer for an agent's personality, name, conversational tone, and specific rules of engagement. By separating these traits into a distinct component, YAAF allows developers to manage the "persona" of an agent independently from its functional logic and tool definitions.

## How It Works in YAAF
In a YAAF project, the Soul is implemented as a Markdown file named `SOUL.md` located in the project's root directory. This file is optional and is primarily utilized through the `yaaf/gateway` module.

When the framework initializes an agent via the gateway, it reads the contents of `SOUL.md` and incorporates the defined personality traits and rules into the agent's operational context. This mechanism enables the agent to maintain a consistent voice and adhere to specific behavioral constraints without requiring those instructions to be hardcoded directly into the `Agent` class instantiation in TypeScript.

## Configuration
The Soul is configured by creating a `SOUL.md` file in the root of the project structure. 

### Project Placement
```text
my-agent/
├── src/
│   └── agent.ts          # Core logic
├── SOUL.md               # Personality and rules
└── package.json
```

### Content Structure
While the content is natural language Markdown, it typically defines:
*   **Identity**: The name and role of the agent.
*   **Tone**: The stylistic approach to communication (e.g., "friendly," "professional," or "concise").
*   **Rules**: Explicit instructions or constraints the agent must follow during interactions.

## Sources
*   Source 1: Getting Started