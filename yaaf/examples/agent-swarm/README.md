# Agent Swarm

Coordinated multi-agent pool with inter-agent messaging, task lifecycle tracking, and a self-correcting refinement loop.

## Architecture

```
Coordinator Agent
    ├── Research Worker  (web search + summarise)
    ├── Analysis Worker  (synthesise + critique)
    └── Writer Worker    (final report assembly)
```

## Run

```bash
GEMINI_API_KEY=... npm start
# or
OPENAI_API_KEY=sk-... npm start
```

## What It Demonstrates

- **AgentOrchestrator** — spawn, monitor, and kill agents as a managed pool
- **Mailbox** — file-based inter-agent message passing (IPC)
- **TaskManager** — track task lifecycle (pending → running → completed)
- **loop workflow** — self-correcting refinement loop
- **EventBus** — typed publish-subscribe for swarm coordination events
- **buildCoordinatorPrompt** — coordinator-worker prompt pattern
