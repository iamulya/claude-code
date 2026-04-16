# Memory Agent

Demonstrates long-term persistent memory — the agent remembers facts across restarts.

## Run

```bash
GEMINI_API_KEY=... npm start
# or
OPENAI_API_KEY=sk-... npm start
```

## What It Demonstrates

- **MemoryStore** — file-based persistent memory with 4 types: user, feedback, project, reference
- `MemoryStore.save()`, `scan()`, `read()` operations
- **MemoryRelevanceEngine** — LLM-powered relevance scoring
- **RelevanceQueryFn** — pluggable LLM adapter for the relevance engine
- Injecting memories into system prompts for long-term recall
- Memory persisting across Agent instances (simulated restart)
