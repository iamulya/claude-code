# Streaming Agent

Real-time token streaming with `agent.runStream()` — observe text deltas, tool calls, and usage events as they happen.

## Run

```bash
GEMINI_API_KEY=... npm start
# or
OPENAI_API_KEY=sk-... npm start
```

## What It Demonstrates

- **agent.runStream()** — async generator yielding `RunnerStreamEvent`
- Real-time token printing: `event.type === 'text_delta'` → `event.content`
- Observing tool calls: `tool_call_start`, `tool_call_result`
- LLM usage events: `usage`, `final_response`
- Streaming with **AbortController** (user cancel mid-generation)
- Progress indicator driven entirely by stream events
