# Travel Booking Agent

A fully functional travel booking agent built on the **Agentic** framework.

## What it demonstrates

- **Tool System** — 6 tools built with `buildTool()` (flights, hotels, weather, attractions, budget, booking)
- **Agent Runner** — The core `AgentRunner` LLM↔tool loop
- **ChatModel Adapter** — OpenAI-compatible LLM client (works with OpenAI, Groq, Ollama, etc.)
- **Interactive REPL** — Real-time conversation with tool-call logging

## Quick Start

```bash
# From this directory
npm install

# Run the self-test (no API key needed)
npx tsx src/test.ts

# Interactive mode (requires API key)
OPENAI_API_KEY=sk-... npx tsx src/main.ts

# Demo mode (scripted conversation)
OPENAI_API_KEY=sk-... npx tsx src/main.ts --demo
```

## Supported LLM Providers

Any OpenAI-compatible API works:

```bash
# OpenAI (default)
OPENAI_API_KEY=sk-... npx tsx src/main.ts

# Groq (fast, free tier)
OPENAI_API_KEY=gsk_... OPENAI_BASE_URL=https://api.groq.com/openai/v1 OPENAI_MODEL=llama-3.3-70b-versatile npx tsx src/main.ts

# Ollama (local, free)
OPENAI_API_KEY=ollama OPENAI_BASE_URL=http://localhost:11434/v1 OPENAI_MODEL=llama3.1 npx tsx src/main.ts

# Together AI
OPENAI_API_KEY=... OPENAI_BASE_URL=https://api.together.xyz/v1 npx tsx src/main.ts
```

## Architecture

```
main.ts          → CLI entry point (REPL + demo mode)
├── openai.ts    → ChatModel adapter (OpenAI-compatible)
├── tools.ts     → 6 travel tools with mock data
└── test.ts      → Self-test for all tools
```

The agent loop is powered by `AgentRunner` from the core framework:

```
User message → [AgentRunner] → [LLM] → tool_calls? → [execute tools] → [LLM] → ... → final text
```

## Tools

| Tool | Description | Read-Only |
|------|-------------|-----------|
| `search_flights` | Search flights between cities | ✅ |
| `search_hotels` | Search hotels in a city | ✅ |
| `check_weather` | Get 5-day weather forecast | ✅ |
| `get_attractions` | Get top attractions | ✅ |
| `estimate_budget` | Estimate total trip budget | ✅ |
| `book_trip` | Book a trip (mock) | ❌ |

## Example Conversation

```
You: Plan a 5-day trip to Paris for 2 people in June

⚡ search_flights origin=New York, destination=Paris, date=2025-06-15
  ✓ search_flights completed in 2ms
⚡ search_hotels city=Paris, checkin=2025-06-15, checkout=2025-06-20
  ✓ search_hotels completed in 1ms
⚡ check_weather city=Paris
  ✓ check_weather completed in 1ms

🤖 Agent: I found several options for your Paris trip!

**Flights (NYC → Paris):**
- United UA1234 — $420 (nonstop, 7h 30m)
- Delta DL1567 — $455 (nonstop, 7h 45m)
...
```
