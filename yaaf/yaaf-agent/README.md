# 🤖 YAAF Expert Agent

A self-referential agent built **with** YAAF, **for** YAAF developers. It has deep knowledge of every YAAF subsystem and can read, search, compile, test, and diagnose the YAAF codebase on your machine.

## Modes

### Interactive REPL (`npm start`)

Ask the agent anything about YAAF — architecture, APIs, configuration, debugging. It uses actual code intelligence tools to ground every answer in the real source code.

```
$ npm start

  ╔══════════════════════════════════════════════╗
  ║       🤖 YAAF Expert Agent v0.1.0           ║
  ║       Mode: Interactive REPL                ║
  ╚══════════════════════════════════════════════╝

> How does the AgentRunner handle context overflow?

The AgentRunner wraps the LLM call in a try/catch that detects context-too-large
errors and triggers emergency compaction via the ContextManager...

[searches src/agents/runner.ts:709-730]
```

### Daemon Mode (`npm run daemon`)

A proactive background agent that periodically compiles the project and runs tests. It **only surfaces new problems** — no noise when everything is green.

```
$ npm run daemon

  ╔══════════════════════════════════════════════╗
  ║       🤖 YAAF Expert Agent v0.1.0           ║
  ║       Mode: Daemon (every 30s)              ║
  ╚══════════════════════════════════════════════╝

  ✓ Initial check: All clear
  [09:15:30] Tick #1 ●
  [09:16:00] Tick #2 ●

  🔴 2 new TypeScript error(s) detected:
    src/agent.ts(357,17): error TS2352: Conversion of type...
    src/models/openai.ts(184,5): error TS2322: Type 'number'...

  📋 Agent Brief:
    Two new compile errors appeared in agent.ts and openai.ts.
    Root cause: the ChatModel interface doesn't include contextWindowTokens.
    Fix: cast through `unknown` first — see line 357 of agent.ts.
```

### Watch Mode (`npm start -- --watch`)

Lightweight error watcher — no LLM calls, just `tsc --noEmit` every 10 seconds. Zero API cost.

```
$ npm start -- --watch
  [09:15:30] ● Check #1: clean
  ✗ 1 new error(s) at 09:16:00:
    src/agent.ts(357,17): error TS2352: ...
  ✓ All 1 error(s) resolved!
```

## Setup

```bash
cd yaaf/yaaf-agent
npm install

# Set your LLM API key (needed for interactive + daemon modes)
export GEMINI_API_KEY=...    # or OPENAI_API_KEY=...

# Interactive
npm start

# Daemon
npm run daemon

# Watch (no LLM)
npm start -- --watch
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    yaaf-agent                                │
│                                                             │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  main.ts   │  │  prompt.ts   │  │     tools.ts        │ │
│  │  (entry    │  │  (dynamic    │  │  (read_file,        │ │
│  │   point)   │  │   system     │  │   grep_search,      │ │
│  │            │  │   prompt     │  │   list_dir,         │ │
│  │  3 modes:  │  │   builder)   │  │   run_tsc,          │ │
│  │  • REPL    │  │              │  │   run_tests,        │ │
│  │  • Daemon  │  │  Ingests:    │  │   get_structure)    │ │
│  │  • Watch   │  │  • docs/*.md │  │                     │ │
│  │            │  │  • README    │  │  All sandboxed to   │ │
│  │            │  │  • index.ts  │  │  YAAF project root  │ │
│  │            │  │  • file tree │  │                     │ │
│  └─────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
│        │                │                      │            │
│        └────────────────┼──────────────────────┘            │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              YAAF Framework (dogfood)                   ││
│  │  • Agent (interactive)  • Vigil (daemon)                ││
│  │  • contextManager:'auto'  • Model specs registry        ││
│  │  • createCLI()  • toStreamableAgent()                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              daemon.ts                                  ││
│  │  • YaafDaemon extends Vigil                            ││
│  │  • ErrorTracker (diff-based, only surfaces NEW issues) ││
│  │  • healthCheck() → DaemonIssue[]                       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Tools

| Tool | Description |
|------|-------------|
| `read_file` | Read file contents with optional line ranges |
| `grep_search` | Pattern search across YAAF source (ripgrep-style) |
| `list_dir` | List directory contents |
| `run_tsc` | Run TypeScript compiler in check mode |
| `run_tests` | Run vitest test suite |
| `get_project_structure` | Get full file tree map |

## How It Works

1. **At startup**, the system prompt is dynamically assembled from:
   - All `docs/*.md` documentation files
   - The README.md
   - All public API exports from `src/index.ts`
   - A recursive file tree of the project

2. **In interactive mode**, the developer asks questions. The agent uses its tools to search the actual source code, verify claims, and provide grounded answers with exact file paths and line numbers.

3. **In daemon mode**, the `YaafDaemon` (extending `Vigil`) wakes on a timer and:
   - Runs `tsc --noEmit` to detect compilation errors
   - Runs `npm test` if compilation passes
   - Diffs results against the last known state
   - Only surfaces **new** issues via `brief()`
   - Uses the LLM to diagnose root causes and suggest fixes

4. **In watch mode**, a zero-cost loop runs `tsc --noEmit` every 10s with no LLM calls — pure filesystem watching with terminal output.
