# Deep Research — YAAF Feature Stress-Test

A multi-agent research pipeline that exercises **10+ YAAF subsystems** with real API calls.

## Features Exercised

| Feature | How It's Used |
|---------|---------------|
| **Hooks** | `beforeToolCall`, `afterToolCall`, `afterLLM` — progress logging, cost tracking, loop detection |
| **Guardrails** | `maxCostUSD: 0.50`, `maxTokensPerSession: 500K`, `maxTurnsPerRun: 60` |
| **CostTracker** | Per-model token accounting with USD pricing (`gemini-2.0-flash` rate) |
| **Doctor** | Auto-diagnostics attached to all 3 agents |
| **ContextManager** | Truncation + micro-compaction on the Searcher agent |
| **Session** | `Session.resumeOrCreate()` — crash recovery across restarts |
| **ToolLoopDetector** | Pattern detection (`threshold: 3, windowSize: 10`) blocks repetitive calls |
| **Streaming** | `runStream()` on all 3 agents for real-time progress |
| **A2A** | `serveA2A()` exposes the pipeline as a cross-framework service (--serve mode) |
| **RemoteSessionServer** | WebSocket + HTTP chat endpoints (--serve mode) |

## Architecture

```
Searcher Agent (15 max iterations, 6 tools, Doctor, ContextManager, Session)
    │  HN Search, Wikipedia, GitHub Search, GitHub Repo, URL Fetch
    │
    ▼ search results (structured text)
Analyst Agent (Doctor, Hooks)
    │  No tools — pure LLM reasoning
    │
    ▼ competitive analysis (SWOT, comparison matrix, trends)
Writer Agent (save_report tool, Doctor, Hooks)
    │  Saves Markdown report to ./output/
    ▼
output/research-report-[topic].md
```

## Usage

```bash
# Research mode (default)
GEMINI_API_KEY=... npx tsx src/index.ts "AI agent frameworks 2025"
GEMINI_API_KEY=... npx tsx src/index.ts   # defaults to "AI agent frameworks"

# Server mode (A2A + WebSocket)
GEMINI_API_KEY=... npx tsx src/index.ts --serve
```

## Server Mode

When started with `--serve`, the pipeline runs as:

- **A2A Server** at `http://localhost:4200` — cross-framework agent protocol
- **HTTP Chat** at `http://localhost:4201/chat` — REST endpoint
- **WebSocket** at `ws://localhost:4201/ws` — streaming

```bash
curl -X POST http://localhost:4201/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Research AI agents in 2025"}'
```

## Sample Output

```
Pipeline Summary
  Total time:    37.2s
  LLM calls:     7
  Tool calls:    12
  Total tokens:  17,415
  Total cost:    $0.0030
  Guardrails:    ok
```
