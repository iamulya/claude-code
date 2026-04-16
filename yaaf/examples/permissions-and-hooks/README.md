# Permissions & Hooks

Tool-level permission policies and lifecycle hooks for controlling agent behavior.

## Run

```bash
GEMINI_API_KEY=... npm start
# or
OPENAI_API_KEY=sk-... npm start
```

## What It Demonstrates

- **PermissionPolicy** — declarative tool-level access control
- **cliApproval()** — interactive terminal approval for destructive tools
- **Hooks** — lifecycle callbacks (beforeToolCall, afterToolCall, onError)
- Read/write tool classification (`isReadOnly`, `isDestructive`)
- Simulated file system tools with permission gates
