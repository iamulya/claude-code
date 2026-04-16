# Doctor Diagnostics

Uses `YaafDoctor` to analyse agent failures at runtime — detecting tool errors, LLM misconfigurations, and performance issues automatically.

## Run

```bash
GEMINI_API_KEY=... npm start
```

## What It Demonstrates

- **YaafDoctor** — runtime diagnostic engine
- **doctor.onIssue()** — listener for detected problems
- Automatic analysis of tool failures (simulated database error)
- Issue classification: type, summary, and detailed breakdown
