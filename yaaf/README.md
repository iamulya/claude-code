# YAAF — Yet Another Agentic Framework

> A production-grade, multi-provider autonomous agent framework for TypeScript.

Zero runtime dependencies. Multi-provider (Gemini, OpenAI, Groq, Ollama). Ship agents as CLIs, web APIs, edge functions, or chat bots — all from one codebase.

```bash
npm install yaaf
yaaf init my-agent && cd my-agent && npm install
yaaf dev
```

---

## Why YAAF?

| Feature | YAAF | LangChain.js | Vercel AI SDK |
|---------|------|-------------|---------------|
| Runtime deps | **0** | 50+ | 15+ |
| CLI scaffold | `yaaf init` | ❌ | ❌ |
| Ship as CLI product | `createCLI()` | ❌ | ❌ |
| Ship as HTTP API | `createServer()` | ❌ | ❌ |
| Ship to edge | `createWorker()` | ❌ | ✅ |
| Premium terminal UI | `createInkCLI()` | ❌ | ❌ |
| Memory strategies | 7 built-in | 3 | ❌ |
| Context compaction | 7 strategies | ❌ | ❌ |
| Multi-agent swarms | Mailbox IPC | ❌ | ❌ |
| Permission system | Glob patterns | ❌ | ❌ |
| OpenTelemetry | Built-in | Plugin | ❌ |
| Type safety | Full | Partial | Full |

---

## Quick Start

```typescript
import { Agent, buildTool } from 'yaaf';

const searchTool = buildTool({
  name: 'search',
  description: 'Search the web',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  async call({ query }) {
    return { data: await fetchResults(query) };
  },
});

const agent = new Agent({
  systemPrompt: 'You are a helpful research assistant.',
  tools: [searchTool],
});

// Batch
const response = await agent.run('What is quantum computing?');

// Streaming
for await (const event of agent.runStream('Explain relativity')) {
  if (event.type === 'text_delta') process.stdout.write(event.content);
}
```

**Set one API key and go:**

```bash
export GOOGLE_API_KEY=...           # → auto-selects Gemini
export OPENAI_API_KEY=sk-...        # → auto-selects GPT-4o
export ANTHROPIC_API_KEY=sk-ant-... # → auto-selects Claude
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Delivery Runtimes                            │
│   createCLI()    createServer()    createWorker()    createInkCLI() │
│   yaaf/cli-runtime   yaaf/server     yaaf/worker      yaaf/cli-ink │
├─────────────────────────────────────────────────────────────────────┤
│                      Stream Adapter                                 │
│         adaptStream()  ←  RunnerStreamEvent → RuntimeStreamEvent    │
├─────────────────────────────────────────────────────────────────────┤
│                        Agent (high-level)                           │
│   run() / runStream() / events / hooks / permissions / sandbox      │
├────────────────────┬───────────────────────────────────┬────────────┤
│   AgentRunner      │     Memory                        │  Context   │
│   LLM ↔ Tool loop  │     MemoryStore + 7 strategies    │  Manager + │
│   Streaming        │     TeamMemory (multi-agent)      │  7 compact │
│   Retry + backoff  │     Relevance scoring             │  strategies│
├────────────────────┼───────────────────────────────────┼────────────┤
│   Tools            │     Models                       │  Plugins    │
│   buildTool()      │     GeminiChatModel              │  MCP        │
│   ToolLoopDetector │     OpenAIChatModel              │  Honcho     │
│   Schema validation│     RouterChatModel              │  AgentFS    │
│                    │     BYO ChatModel interface      │  Camoufox   │
├────────────────────┴───────────────────────────────────┴────────────┤
│  Skills · Permissions · Hooks · Sandbox · Session · SecureStorage   │
│  SystemPromptBuilder · ContextEngine · Vigil · Heartbeat · Gateway  │
├─────────────────────────────────────────────────────────────────────┤
│                       OpenTelemetry                                 │
│              Traces · Metrics · Logs · Cost tracking                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Documentation

The full documentation is split into focused chapters:

### Getting Started

| Doc | Description |
|-----|-------------|
| [Getting Started](docs/getting-started.md) | Installation, first agent, CLI commands, project structure |
| [Agent](docs/agent.md) | `Agent` class API, config, events, streaming, factory methods |
| [Tools](docs/tools.md) | `buildTool()`, schemas, permissions, context, validation |

### Core Systems

| Doc | Description |
|-----|-------------|
| [Memory Strategies](docs/memory.md) | 7 built-in memory strategies, extraction + retrieval |
| [Context Compaction](docs/compaction.md) | 7 compaction strategies, production pipelines |
| [Permissions & Hooks](docs/permissions.md) | `PermissionPolicy`, `Hooks`, `cliApproval()` |
| [System Prompts](docs/prompts.md) | `SystemPromptBuilder`, `ContextEngine`, `Soul` |

### Delivery & Deployment

| Doc | Description |
|-----|-------------|
| [CLI Runtime](docs/cli-runtime.md) | `createCLI()`, `createInkCLI()`, slash commands, streaming |
| [Server Runtime](docs/server-runtime.md) | `createServer()`, REST API, SSE streaming, rate limiting |
| [Worker Runtime](docs/worker-runtime.md) | `createWorker()`, Cloudflare Workers, Vercel Edge, Deno |
| [Gateway & Channels](docs/gateway.md) | Multi-channel transport, Telegram, Slack, Discord |

### Advanced

| Doc | Description |
|-----|-------------|
| [Multi-Agent](docs/multi-agent.md) | Orchestrator, Mailbox IPC, AgentRouter, delegates |
| [Observability](docs/telemetry.md) | OpenTelemetry spans, metrics, logs, cost tracking |
| [Plugins](docs/plugins.md) | Plugin architecture, MCP, Honcho, AgentFS, Camoufox |
| [Security](docs/security.md) | Sandbox, SecureStorage, session persistence, approvals |

---

## Subpackage Map

YAAF uses opt-in subpackages to keep the core zero-dep:

```typescript
// Core (zero dependencies)
import { Agent, buildTool, MemoryStore, ContextManager } from 'yaaf';

// Gateway — channels, soul, approvals (zero deps)
import { Gateway, Soul, ApprovalManager } from 'yaaf/gateway';

// CLI runtime — readline-based (zero deps)
import { createCLI } from 'yaaf/cli-runtime';

// Premium CLI — Ink/React terminal UI (requires: ink, react)
import { createInkCLI } from 'yaaf/cli-ink';

// HTTP server (zero deps — uses node:http)
import { createServer } from 'yaaf/server';

// Edge/worker (zero deps — uses Web Fetch API)
import { createWorker } from 'yaaf/worker';
```

---

## Examples

| Example | Features |
|---------|----------|
| [travel-agent](examples/travel-agent/) | Agent, multi-turn REPL, tool events, Gemini + OpenAI |
| [permissions-and-hooks](examples/permissions-and-hooks/) | PermissionPolicy, cliApproval(), Hooks, audit log |
| [secure-storage](examples/secure-storage/) | SecureStorage, env/password/machine key modes |
| [session-persistence](examples/session-persistence/) | Session.resumeOrCreate(), crash recovery |
| [system-prompt-builder](examples/system-prompt-builder/) | SystemPromptBuilder, static/dynamic sections |
| [model-router](examples/model-router/) | RouterChatModel, custom routing, router.stats() |
| [plan-mode](examples/plan-mode/) | planMode, onPlan approval gate |
| [vigil-autonomous](examples/vigil-autonomous/) | vigil(), tick loop, cron schedule |

```bash
cd examples/<example-name>
GOOGLE_API_KEY=... npx tsx src/main.ts
```

---

## Multi-Provider Support

```typescript
import { GeminiChatModel, OpenAIChatModel, RouterChatModel } from 'yaaf';

// Gemini
const gemini = new GeminiChatModel({ model: 'gemini-2.5-flash' });

// OpenAI
const openai = new OpenAIChatModel({ model: 'gpt-4o' });

// Groq (OpenAI-compatible)
const groq = new OpenAIChatModel({
  baseUrl: 'https://api.groq.com/openai/v1',
  model: 'llama-3.3-70b-versatile',
});

// Ollama (local)
const ollama = new OpenAIChatModel({
  baseUrl: 'http://localhost:11434/v1',
  apiKey: 'ollama',
  model: 'llama3.1',
});

// Smart routing — cheap requests → fast model, complex → capable
const router = new RouterChatModel({
  fast: gemini,
  capable: openai,
  route: (ctx) => ctx.messages.length > 10 ? 'capable' : 'fast',
});
```

---

## Design Principles

1. **Zero Runtime Dependencies** — The core framework ships nothing but TypeScript. Optional features (Ink, OTel) are peer dependencies.
2. **Fail-Closed Safety** — Permissions default to deny. Tools are write-capable and permission-gated by default.
3. **Ship Anywhere** — One agent, multiple delivery targets: CLI, HTTP API, edge function, chat bot.
4. **Streaming First** — Every runtime supports streaming with a unified `RuntimeStreamEvent` type.
5. **Memory is Composable** — Extraction (when to persist) and retrieval (what to inject) are independent interfaces.
6. **Context is Finite** — `ContextManager` actively manages token budgets with 7 pluggable compaction strategies.
7. **Observable by Default** — Every action emits both typed events and OpenTelemetry spans.
8. **Plugin-First** — External capabilities are typed adapter interfaces. No vendor coupling.

---

## License

MIT
