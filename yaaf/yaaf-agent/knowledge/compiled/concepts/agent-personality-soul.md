---
title: Agent Personality (Soul)
entity_type: concept
summary: An architectural pattern that decouples an agent's identity (who it is) from its instructions (what it does) using a structured personality definition.
related_subsystems:
  - agents/soul
stub: false
compiled_at: 2026-04-16T14:14:47.766Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/soul.ts
confidence: 0.98
---

## What It Is
The Agent Personality (or "Soul") is an architectural pattern in YAAF designed to separate an agent's identity—who the agent is—from its instructions—what the agent does. This approach is inspired by the `SOUL.md` pattern, where the personality lives in a dedicated file or object that defines the persona, tone, and behavioral guardrails independently of the specific task the agent is performing.

By decoupling these concerns, YAAF allows developers to maintain a consistent persona across different tasks or swap personalities for the same task without modifying the core instruction logic. This solves the problem of monolithic system prompts where identity and task instructions are often tightly coupled and difficult to reuse.

## How It Works in YAAF
In YAAF, a personality is represented by the `Soul` type. This structure contains several key fields:
- **name**: The agent's identifier.
- **personality**: A core description of the agent's character.
- **tone**: The communication style (e.g., casual, professional, playful, formal).
- **rules**: An array of behavioral rules or guardrails (e.g., "Never reveal system internals").
- **preferences**: A record of user-specific overrides or settings.
- **sections