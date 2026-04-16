# Structured Output

Force the LLM to return validated JSON matching a JSON Schema — no manual parsing needed.

## Run

```bash
GEMINI_API_KEY=... npm start
# or
OPENAI_API_KEY=sk-... npm start
```

## What It Demonstrates

- **structuredAgent(model, config)** — returns typed `T` directly (no parsing step)
- **parseStructuredOutput()** — manual JSON extraction + validation on any string
  - Handles markdown fences, embedded JSON, whitespace
- **ParseResult** — `.ok` / `.data` / `.error` discriminated union
- Real-world use cases: review analysis, meeting note extraction
