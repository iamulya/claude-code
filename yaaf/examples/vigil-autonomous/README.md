# Vigil Autonomous Agent

Tick-driven autonomous agent that runs continuously, proactively monitoring and acting without waiting for user messages.

## Run

```bash
GEMINI_API_KEY=... npm start
# or
OPENAI_API_KEY=sk-... npm start

# Run for 30 seconds then stop
GEMINI_API_KEY=... npx tsx src/main.ts --duration=30
```

## What It Demonstrates

- **vigil()** — factory for a proactive autonomous agent
- Tick-driven work loop: agent fires every N seconds automatically
- Cron-style scheduled tasks: daily/hourly recurring tasks
- **Brief output channel** — structured output separate from conversation
- **Session journal** — append-only log of all ticks and briefs
- Graceful shutdown: `vigil.stop()`
