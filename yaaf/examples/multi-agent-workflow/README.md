# Multi-Agent Workflow

Compose multiple agents into workflows using `sequential()`, `parallel()`, and `transform()`.

## Run

```bash
GEMINI_API_KEY=... npm start
```

## What It Demonstrates

- **sequential()** — chain agents: output of one feeds the next
- **parallel()** — run multiple agents concurrently on the same input
- **transform()** — reshape data between agent stages
- Researcher → Drafter → Editor pipeline pattern
