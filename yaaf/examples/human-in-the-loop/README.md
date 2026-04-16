# Human-in-the-Loop

Demonstrates agent suspension and resumption for human approval of destructive operations.

## Flow

```
1. Human sends: "Deploy v1.2.3 to production"
2. Agent calls step() → LLM decides to call deploy_to_production()
3. Tool is marked requiresApproval → agent SUSPENDS
4. Thread is serialized to disk (DB/Redis in production)
5. Human receives notification and approves/rejects via CLI prompt
6. Thread is deserialized and agent.resume() continues
7. Tool executes → LLM summarizes → done
```

## Run

```bash
GEMINI_API_KEY=... npm start

# With a custom deploy message
GEMINI_API_KEY=... npm run start:approve
```

## What It Demonstrates

- **requiresApproval** tool flag for dangerous operations
- Agent suspension mid-execution
- Thread serialization / deserialization (crash-safe)
- `agent.resume()` — continue from the exact suspension point
- Interactive CLI approval prompt
