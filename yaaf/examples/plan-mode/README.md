# Plan Mode

Agent plans before executing — with optional human approval of the plan.

## Run

```bash
GEMINI_API_KEY=... npm start
# or
OPENAI_API_KEY=sk-... npm start
```

## What It Demonstrates

- **planMode: true** — agent generates a plan before tool execution
- **planMode.onPlan** — interactive approval gate before execution
- Auto-plan: plan generated, printed, then automatically approved
- Plan rejection: user can reject a plan and stop execution
- Combined with permissions for extra safety
