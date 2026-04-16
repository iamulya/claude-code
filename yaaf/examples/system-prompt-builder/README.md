# System Prompt Builder

Section-based, cacheable system prompt assembly with static and dynamic content.

## Run

```bash
GEMINI_API_KEY=... npm start
# or
OPENAI_API_KEY=sk-... npm start
```

## What It Demonstrates

- **SystemPromptBuilder** — section-based, cached prompt assembly
- **Static sections** (session-cached): identity, rules, tool guides
- **Dynamic sections** (per-turn): environment info, live memory, date/time
- **DYNAMIC_BOUNDARY_MARKER** — separates cacheable from per-turn content
- **defaultPromptBuilder()** — sensible-defaults factory
- **addWhen()** — conditional sections
- **Agent.create()** — async factory for builder resolution
- **reset()** — clear cache for a fresh session
