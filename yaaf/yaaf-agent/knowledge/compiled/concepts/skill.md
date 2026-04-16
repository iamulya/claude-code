---
title: Skill
entity_type: concept
summary: Modular markdown-based instructions injected into an agent's system prompt to provide specific domain expertise.
related_subsystems:
  - CLI
  - Agent
stub: false
compiled_at: 2026-04-16T14:07:45.014Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/getting-started.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/cli/add.ts
confidence: 0.95
---

## What It Is
A Skill in YAAF is a modular unit of domain-specific instructions used to extend an agent's capabilities. Unlike tools, which provide functional interfaces to external systems, skills are purely instructional. They solve the problem of managing complex system prompts by allowing developers to organize specific behaviors, business logic, or domain expertise into discrete, manageable Markdown files.

## How It Works in YAAF
Skills are implemented as Markdown files stored within a dedicated `skills/` directory at the root of a YAAF project. During the agent's initialization or execution, the framework reads these files and injects their content into the agent's system prompt. This mechanism allows the agent to adopt specialized knowledge or personas without requiring all instructions to be hardcoded into the main agent configuration.

The YAAF CLI facilitates the creation of these components through the `add` command:

```bash
yaaf add skill <name>
```

This command scaffolds a new Markdown file (e.g., `skills/code-review.md`) which the developer then populates with specific instructions for the LLM.

## Configuration
Skills are configured primarily through the project's file system structure. In a standard YAAF project, skills are located in the `skills/` directory:

```text
my-agent/
├── skills/
│   └── SKILL.md          # Agent skill instructions
├── src/
│   └── agent.ts          # Main agent configuration
└── ...
```

When using the `yaaf dev` runtime, developers can inspect how these skills contribute to the overall context budget using the `/context` slash command, which displays the various sections of the system prompt and their respective sizes.

## Sources
- `getting-started.md`
- `src/cli/add.ts`