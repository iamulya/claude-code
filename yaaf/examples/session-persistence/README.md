# Session Persistence

Demonstrates JSONL-based session persistence — conversations survive process restarts.

## Run

Run **twice** to see persistence in action:

```bash
# First run: creates session, runs a conversation
GEMINI_API_KEY=... npm start

# Second run: resumes the session, agent remembers history
GEMINI_API_KEY=... npm start
```

Without an API key, the example still demonstrates session file operations.

## What It Demonstrates

- **Session.resumeOrCreate(id, dir)** — load existing or create fresh
- Conversation history surviving process restarts (crash recovery)
- **session.append()** — persist new turns incrementally
- **listSessions(dir)** — enumerate all persisted sessions
- **pruneOldSessions(maxAgeMs, dir)** — automatic housekeeping
