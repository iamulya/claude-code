# Model Router

Demonstrates YAAF's model routing — directing requests to different LLM providers based on task complexity, cost, or latency requirements.

## Run

```bash
GEMINI_API_KEY=... npm start
# or
OPENAI_API_KEY=sk-... npm start
```

## What It Demonstrates

- Model selection based on task characteristics
- Cost-optimized routing (cheap model for simple tasks, powerful model for complex ones)
- Fallback chains across providers
- Provider-specific configuration
