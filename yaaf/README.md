# YAAF — Yet Another Agentic Framework

> A production-grade, security-hardened, multi-provider autonomous agent framework for TypeScript.

Zero runtime dependencies. Multi-provider (Gemini, OpenAI, Anthropic, Groq, Ollama). OWASP LLM Top 10 aligned (9.3/10). Ship agents as CLIs, web APIs, edge functions, or chat bots — all from one codebase. Compile your knowledge into a self-healing, LLM-readable wiki.

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
| **Built-in Dev UI** | `devUi: true` | ❌ | ❌ |
| Built-in diagnostics | `doctor: true` (16 events) | ❌ | ❌ |
| Ship as CLI product | `createCLI()` | ❌ | ❌ |
| Ship as HTTP API | `createServer()` | ❌ | ❌ |
| Ship to edge | `createWorker()` | ❌ | ✅ |
| Premium terminal UI | `createInkCLI()` | ❌ | ❌ |
| OWASP LLM security | **9.3/10** (11 modules) | ❌ | ❌ |
| IAM (RBAC + ABAC) | Built-in | ❌ | ❌ |
| A2A protocol | Client + Server | ❌ | ❌ |
| Remote WebSocket sessions | Built-in (RFC 6455) | ❌ | ❌ |
| OpenAPI → Tools | `OpenAPIToolset` | Plugin | ❌ |
| MCP OAuth | PKCE + Client Credentials | ❌ | ❌ |
| Memory strategies | 7 built-in | 3 | ❌ |
| Context compaction | 7 strategies | ❌ | ❌ |
| Model specs registry | 40+ models | ❌ | ❌ |
| Multi-agent swarms | Mailbox IPC | ❌ | ❌ |
| Permission system | Glob patterns | ❌ | ❌ |
| OpenTelemetry | Built-in | Plugin | ❌ |
| **Knowledge Base** | **Compile + self-heal** | ❌ | ❌ |
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
# Hosted providers — set one key, provider auto-detected
export GEMINI_API_KEY=...           # → Gemini 2.5 Flash
export ANTHROPIC_API_KEY=sk-ant-... # → Claude Sonnet
export OPENAI_API_KEY=sk-...        # → GPT-4o

# Any OpenAI-compatible endpoint — Qwen, GLM, DeepSeek, Groq, Ollama…
export LLM_BASE_URL=http://localhost:11434/v1
export LLM_MODEL=qwen2.5:72b

# Override the model name for any provider
export LLM_MODEL=gemini-2.0-flash
```

---

## Dev UI — Interactive Browser Dashboard

YAAF ships a zero-dependency, self-contained browser UI for local agent development.
Enable it with one flag on `createServer()`:

```typescript
import { createServer } from 'yaaf/server';

const handle = await createServer(agent, {
  port: 3456,
  devUi: true,  // ← opens a full dashboard at http://localhost:3456
  multiTurn: true,
});
```

**Features:**

- **Chat interface** — send messages, view streaming responses with full markdown rendering
  (headings, bold/italic, code blocks with syntax highlighting, tables, blockquotes, 
  nested lists, task lists, strikethrough, links)
- **Inspector panel** — live latency (TTFT + total), token usage (prompt/completion/cache),
  tool call timeline, and request payload
- **LLM Turns timeline** — collapsible view of every agentic loop iteration showing:
  - **↑ Input**: full messages array sent to the LLM (system prompt, user message, tool results)
  - **↓ Output**: the LLM's response text and/or tool call requests with arguments
- **Settings drawer** — toggle dark mode, multi-turn, conversation persistence; clear history
- **Empty state** — quick-start prompt chips to get going
- **Responsive** — mobile-friendly with bottom-sheet inspector
- **Syntax highlighting** — inline tokenizer for JS/TS, Python, JSON, Bash, CSS
- **Dark mode** — full dark theme with carefully tuned token colors

**Architecture:** The Dev UI is served as a single self-contained HTML page. CSS and client-side
JS live in standalone files (`devUi.styles.css`, `devUi.client.js`) which are read via
`readFileSync` and inlined at startup — no bundler, no CDN, no external dependencies.

---

## Knowledge Base — Compile Your Knowledge

YAAF implements a [Karpathy-style](https://docs.yaaf.dev/knowledge-base) "compile your knowledge" pipeline. Raw source material (research papers, web clips, documentation, code) is read from a `raw/` directory and compiled by an LLM into a structured, cross-linked wiki in `compiled/`. A self-healing linter then keeps the KB consistent.

This is a fundamentally different alternative to RAG. Instead of embedding chunks and retrieving at query time, the LLM **authors** encyclopedia-style articles with explicit wikilinks. The compiled wiki is human-readable, diffable, and directly consumable as agent context.

```typescript
import { KBCompiler } from 'yaaf/knowledge';

// Build GenerateFns without hardcoding a provider —
// auto-detected from GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY / LLM_BASE_URL
import { createKBGenerateFns } from './scripts/llm-client.js';
const { extractionFn, synthesisFn } = await createKBGenerateFns();

// 1. Bootstrap your ontology (first time only)
//    Run: npm run kb:init
//    Or programmatically:
import { OntologyGenerator } from 'yaaf/knowledge';
const gen = new OntologyGenerator({
  generateFn: synthesisFn,
  outputPath: './my-kb/ontology.yaml',
});
await gen.generate({ domain: 'My project — does X, Y, Z.' });

// 2. Create the compiler — reads ontology.yaml from my-kb/
const compiler = await KBCompiler.create({
  kbDir: './my-kb',
  extractionModel: extractionFn,
  synthesisModel:  synthesisFn,
});

// 3. Compile raw/ → compiled/
const result = await compiler.compile({
  incrementalMode: true,  // skip sources older than their compiled article
  autoLint: true,         // run the self-healing linter after synthesis
  autoFix: true,          // auto-fix broken wikilinks and unlinked mentions
  onProgress: (event) => {
    if (event.stage === 'synthesize' && event.event.type === 'article:written') {
      console.log(`✓ ${event.event.title} (${event.event.wordCount} words)`);
    }
  },
});

console.log(`Created:  ${result.synthesis.created} articles`);
console.log(`Updated:  ${result.synthesis.updated} articles`);

// 4. Give an agent access to the compiled KB (runtime)
import { Agent, KBStore, createKBTools } from 'yaaf';

const store = new KBStore('./my-kb');
await store.load();

const agent = new Agent({
  systemPrompt: 'You are an expert on my project.',
  tools: createKBTools(store),  // search_kb, read_kb, list_kb_index
});
```

```
raw/ (your source material)
  research papers, web clips, docs, code, notes
        │
        ▼
  Stage 1: Ingester — .md / .html / .txt / .json / code
        │
        ▼
  Stage 2: Concept Extractor — fast LLM (extraction model)
           vocabulary scan + entity classification → CompilationPlan
        │
        ▼
  Stage 3: Knowledge Synthesizer — capable LLM (synthesis model)
           authors encyclopedia-style articles → compiled/**/*.md
        │
        ▼
  Stage 4: Linter — 13 static checks, no LLM
           structural · linking · quality → auto-fix + LintReport
        │
        ▼
compiled/ (structured, LLM-ready wiki)
  concepts/ · tools/ · research-papers/ · ...
```

**What the compiled wiki looks like:**

```markdown
---
title: "Attention Mechanism"
entity_type: concept
tags: [nlp, transformers, deep-learning]
status: established
compiled_at: "2024-01-15T10:30:00.000Z"
compiled_from: [raw/papers/attention-paper.md, raw/web-clips/attention.md]
confidence: 0.95
stub: false
---

## Overview

The **attention mechanism** is the core component of the [[Transformer]] architecture.
It allows models to dynamically weight input positions...

## How It Works

First described in [[Attention Is All You Need]] (2017), the scaled dot-product
attention is implemented in [[PyTorch]] as `nn.MultiheadAttention`.
```

**Clip web pages directly into your KB:**

```typescript
// Programmatic Obsidian Web Clipper — saves Markdown + local images
const result = await compiler.clip('https://arxiv.org/abs/1706.03762');
// → raw/web-clips/attention-is-all-you-need/index.md
```

**The self-healing loop:**

```typescript
// Find all issues (no LLM required — all static checks)
const report = await compiler.lint();

// Preview what auto-fix would change
const preview = await compiler.fix(report, true /* dryRun */);
console.log(`Would fix ${preview.fixedCount} issues`);

// Apply fixes: rewrites [[alias]] → [[canonical]], adds [[wikilinks]] to mentions
await compiler.fix(report);
```

**[Full Knowledge Base documentation →](docs/knowledge-base.md)**

---

## YAAF Expert Agent — Dogfood Demo

`yaaf-agent/` is a self-referential agent built **with** YAAF, **for** YAAF developers. It ships a pre-compiled Knowledge Base of 900+ articles covering every API, subsystem, concept, and guide in YAAF, served through the built-in Dev UI.

```bash
npm install -g yaaf-agent

# Pick any provider
export GEMINI_API_KEY=...                         # Gemini (recommended)
# export LLM_BASE_URL=http://localhost:11434/v1   # or any local model
# export LLM_MODEL=qwen2.5:72b

yaaf-agent
# → http://localhost:3001  (Dev UI with streaming chat + tool inspector)
```

Or run without installing:

```bash
GEMINI_API_KEY=... npx yaaf-agent
```

**What it demonstrates:**

| Feature | How it's used |
|---------|---------------|
| `KBStore` + `createKBTools()` | 900+ compiled articles searchable via `search_kb`, `read_kb`, `list_kb_index` |
| `createServer({ devUi: true })` | Full browser dashboard with streaming markdown, token inspector, tool timeline |
| `contextManager: 'auto'` | Prevents token overruns regardless of which model is selected |
| Unified `LLM_*` env vars | Works with Gemini, Claude, OpenAI, Qwen, GLM, DeepSeek, Ollama — one config |
| `YaafDaemon` | Optional background TypeScript + test watcher with proactive LLM diagnosis |

**Supported providers (zero code changes):**

```bash
GEMINI_API_KEY=...                                          npm start  # Gemini
ANTHROPIC_API_KEY=...                                       npm start  # Claude
OPENAI_API_KEY=...                                          npm start  # OpenAI
LLM_BASE_URL=http://localhost:11434/v1  LLM_MODEL=qwen2.5:72b npm start  # Qwen/Ollama
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4 LLM_API_KEY=... LLM_MODEL=glm-4-flash npm start
```

**[Full yaaf-agent documentation →](yaaf-agent/README.md)**

---

## Security — OWASP LLM Top 10 Aligned (9.3/10)

YAAF ships with 11 security modules across 3 defense layers — zero external dependencies.

### One-Line Security

```typescript
const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
  tools: [myTools],
  security: true,                 // ← enables PromptGuard + OutputSanitizer + PiiRedactor
  toolResultBoundaries: true,     // ← wraps tool outputs in safe delimiters
});
```

### Fine-Grained Control

```typescript
const agent = new Agent({
  systemPrompt: '...',
  security: {
    promptGuard: { mode: 'block', sensitivity: 'high' },
    outputSanitizer: { stripHtml: true },
    piiRedactor: { categories: ['email', 'ssn', 'credit_card', 'api_key'] },
  },
  toolResultBoundaries: true,
});
```

### OWASP Scorecard

| # | Risk | Score | Components |
|---|------|-------|------------|
| LLM01 | Prompt Injection | **10/10** | PromptGuard (15+ patterns) · InputAnomalyDetector (entropy, repetition) · tool result boundaries |
| LLM02 | Insecure Output | **9/10** | OutputSanitizer (XSS/HTML/URL) · StructuredOutputValidator (JSON schema, URL allowlists) |
| LLM04 | Model DoS | **10/10** | Guardrails (global budgets) · PerUserRateLimiter (per-identity) · InputAnomalyDetector (length) |
| LLM05 | Supply Chain | **8/10** | TrustPolicy (SHA-256 hashes, semver constraints, MCP tool allowlists) |
| LLM06 | Sensitive Info | **9/10** | PiiRedactor (9 categories, Luhn validation, bidirectional) |
| LLM07 | Insecure Plugins | **9/10** | TrustPolicy (integrity verification, unknown entity policy) |
| LLM08 | Excessive Agency | **10/10** | IAM (RBAC + ABAC) · Permissions · PerUserRateLimiter |
| LLM09 | Overreliance | **8/10** | GroundingValidator (keyword overlap scoring) · StructuredOutputValidator |

### Security Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                  LAYER 1: INPUT PROTECTION                    │
│  PromptGuard · InputAnomalyDetector · PiiRedactor (input)     │
├───────────────────────────────────────────────────────────────┤
│                LAYER 2: EXECUTION SAFETY                      │
│  TrustPolicy · Tool Result Boundaries · PerUserRateLimiter    │
├───────────────────────────────────────────────────────────────┤
│                 LAYER 3: OUTPUT PROTECTION                    │
│  OutputSanitizer · StructuredOutputValidator · GroundingValid. │
├───────────────────────────────────────────────────────────────┤
│    SecurityAuditLog — centralized event log, NDJSON, SIEM     │
└───────────────────────────────────────────────────────────────┘
```

**[Full security documentation →](docs/security.md)**

---

## IAM — Identity & Access Management

Built-in RBAC, ABAC, multi-tenant data scoping, and audit logging:

```typescript
import { Agent, rbac, abac, TenantScopeStrategy } from 'yaaf';

const agent = new Agent({
  systemPrompt: '...',
  tools: [invoiceTool, reportTool, adminTool],
  accessPolicy: {
    authorization: rbac({
      viewer: ['search_*', 'read_*'],
      editor: ['search_*', 'read_*', 'write_*'],
      admin: ['*'],
    }),
    dataScope: new TenantScopeStrategy({ field: 'tenantId' }),
    onDecision: (event) => auditLog.write(event),
  },
});

// Each run carries user identity
const result = await agent.run('Show my invoices', {
  user: {
    userId: 'alice-123',
    roles: ['editor'],
    attributes: { tenantId: 'acme', department: 'finance' },
  },
});
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Delivery Runtimes                            │
│   createCLI()    createServer()    createWorker()    createInkCLI() │
│   yaaf/cli-runtime   yaaf/server     yaaf/worker      yaaf/cli-ink │
├─────────────────────────────────────────────────────────────────────┤
│                       Dev UI (yaaf/server)                          │
│   Self-contained HTML dashboard · SSE streaming · Inspector panel   │
│   LLM Turns timeline · Token usage · Dark mode · Markdown renderer  │
├─────────────────────────────────────────────────────────────────────┤
│                    Remote & Interop Layer                            │
│   RemoteSessionServer (yaaf/remote)     A2A Server/Client           │
│   WebSocket (RFC 6455) + HTTP fallback  Agent Cards + JSON-RPC 2.0  │
├─────────────────────────────────────────────────────────────────────┤
│                      Stream Adapter                                 │
│         adaptStream()  ←  RunnerStreamEvent → RuntimeStreamEvent    │
├─────────────────────────────────────────────────────────────────────┤
│                        Agent (high-level)                           │
│   run() / runStream() / events / hooks / permissions / sandbox      │
│   security: true  ·  toolResultBoundaries  ·  accessPolicy          │
├────────────────────┬───────────────────────────────────┬────────────┤
│   AgentRunner      │     Memory                        │  Context   │
│   LLM ↔ Tool loop  │     MemoryStore + 7 strategies    │  Manager + │
│   Streaming        │     TeamMemory (multi-agent)      │  7 compact │
│   Retry + backoff  │     Relevance scoring             │  strategies│
├────────────────────┼───────────────────────────────────┼────────────┤
│   Tools            │     Models                        │  Plugins   │
│   buildTool()      │     GeminiChatModel               │  MCP +     │
│   OpenAPIToolset   │     OpenAIChatModel               │  MCP OAuth │
│   ToolLoopDetector │     AnthropicChatModel            │  Honcho    │
│   Schema validation│     RouterChatModel               │  AgentFS   │
│                    │     BYO ChatModel interface       │  Camoufox  │
├────────────────────┴───────────────────────────────────┴────────────┤
│  Skills · Permissions · Hooks · Sandbox · Session · SecureStorage   │
│  SystemPromptBuilder · ContextEngine · Vigil · Heartbeat · Gateway  │
│  Doctor (built-in expert agent) · Model Specs Registry              │
├─────────────────────────────────────────────────────────────────────┤
│                    Knowledge Base (yaaf/knowledge)                  │
│  KBCompiler · ConceptExtractor · KnowledgeSynthesizer · KBLinter    │
│  Ingester (md/html/txt/json/code) · KBClipper · OntologyLoader      │
│  13 lint checks · auto-fix · wikilink graph · .kb-registry.json     │
├─────────────────────────────────────────────────────────────────────┤
│                      Security & IAM                                 │
│  PromptGuard · OutputSanitizer · PiiRedactor · InputAnomalyDetector │
│  TrustPolicy · GroundingValidator · PerUserRateLimiter              │
│  StructuredOutputValidator · SecurityAuditLog · RBAC/ABAC · Scoping │
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
| [**Knowledge Base**](docs/knowledge-base.md) | **Compile raw sources into a self-healing LLM-ready wiki** |

### Security & IAM

| Doc | Description |
|-----|-------------|
| [Security](docs/security.md) | OWASP LLM alignment, 11 security modules, `security: true`, audit log |
| [IAM](docs/iam.md) | RBAC, ABAC, tenant scoping, identity providers, audit |

### Delivery & Deployment

| Doc | Description |
|-----|-------------|
| [CLI Runtime](docs/cli-runtime.md) | `createCLI()`, `createInkCLI()`, slash commands, streaming |
| [Server Runtime](docs/server-runtime.md) | `createServer()`, REST API, SSE streaming, Dev UI, rate limiting |
| [Worker Runtime](docs/worker-runtime.md) | `createWorker()`, Cloudflare Workers, Vercel Edge, Deno |
| [Gateway & Channels](docs/gateway.md) | Multi-channel transport, Telegram, Slack, Discord |

### Advanced

| Doc | Description |
|-----|-------------|
| [Multi-Agent](docs/multi-agent.md) | Orchestrator, Mailbox IPC, AgentRouter, delegates |
| [Human-in-the-Loop](docs/human-in-the-loop.md) | `agent.step()`, `agent.resume()`, `AgentThread`, durable pause/resume |
| [YAAF Doctor](docs/doctor.md) | Built-in diagnostic agent, 16-event live watch, auto-attach, daemon mode |
| [Observability](docs/telemetry.md) | OpenTelemetry spans, metrics, logs, cost tracking |
| [Plugins](docs/plugins.md) | Plugin architecture, MCP, Honcho, AgentFS, Camoufox |

### Interoperability

| Doc | Description |
|-----|-------------|
| [A2A Protocol](docs/a2a.md) | Cross-framework agent communication (JSON-RPC 2.0, Agent Cards) |
| [Remote Sessions](docs/remote-sessions.md) | WebSocket + HTTP server for distributed agent serving |
| [MCP OAuth](docs/mcp-oauth.md) | OAuth 2.0 (PKCE + Client Credentials) for authenticated MCP servers |
| [OpenAPI Toolset](docs/openapi.md) | Auto-generate tools from OpenAPI 3.x specs |

---

## Subpackage Map

YAAF uses opt-in subpackages to keep the core zero-dep:

```typescript
// Core (zero dependencies)
import { Agent, buildTool, MemoryStore, ContextManager } from 'yaaf';

// Security (zero dependencies — included in core)
import {
  PromptGuard, OutputSanitizer, PiiRedactor,
  TrustPolicy, GroundingValidator, PerUserRateLimiter,
  InputAnomalyDetector, StructuredOutputValidator, SecurityAuditLog,
  securityHooks,
} from 'yaaf';

// IAM (zero dependencies — included in core)
import { rbac, abac, TenantScopeStrategy } from 'yaaf';

// AgentThread — stateless reducer / human-in-the-loop (zero deps)
import {
  createThread, forkThread, serializeThread, deserializeThread,
  type AgentThread, type StepResult, type SuspendReason, type SuspendResolution,
} from 'yaaf';

// A2A — cross-framework agent interop (zero deps)
import { A2AClient, A2AServer, serveA2A, a2aTool } from 'yaaf';

// MCP OAuth — authenticated MCP server connections (zero deps)
import { McpOAuthClient, FileTokenStore, oauthMcpServer } from 'yaaf';

// OpenAPI — auto-generate tools from specs (zero deps)
import { OpenAPIToolset } from 'yaaf';

// Knowledge Base — Karpathy-style compile pipeline (optional: readability, jsdom, turndown for HTML)
import {
  KBCompiler, makeGenerateFn, KBClipper,
  ConceptExtractor, KnowledgeSynthesizer, KBLinter,
  OntologyLoader, OntologyGenerator,
  ingestFile, canIngest,
  // Runtime — query compiled KBs
  KnowledgeBase, KBStore, createKBTools,
  FederatedKnowledgeBase,
} from 'yaaf/knowledge';

// Remote sessions — WebSocket/HTTP agent serving (zero deps)
import { RemoteSessionServer, startRemoteServer } from 'yaaf/remote';

// Gateway — channels, soul, approvals (zero deps)
import { Gateway, Soul, ApprovalManager } from 'yaaf/gateway';

// CLI runtime — readline-based (zero deps)
import { createCLI } from 'yaaf/cli-runtime';

// Premium CLI — Ink/React terminal UI (requires: ink, react)
import { createInkCLI } from 'yaaf/cli-ink';

// HTTP server with Dev UI (zero deps — uses node:http)
import { createServer } from 'yaaf/server';

// Edge/worker (zero deps — uses Web Fetch API)
import { createWorker } from 'yaaf/worker';
```

---

## Examples

| Example | Features |
|---------|----------|
| [**playground**](examples/playground/) | **Interactive Dev UI**, 5 real tools, multi-turn, `createServer()`, `devUi: true` |
| [knowledge-base](examples/knowledge-base/) | `KBCompiler`, ontology authoring, web clipping, lint + auto-fix |
| [human-in-the-loop](examples/human-in-the-loop/) | `agent.step()`, `agent.resume()`, `requiresApproval`, durable pause/resume |
| [a2a-interop](examples/a2a-interop/) | A2A protocol, YAAF ↔ Vercel AI SDK cross-framework communication |
| [remote-sessions](examples/remote-sessions/) | WebSocket server, HTTP chat, session persistence, management |
| [mcp-oauth](examples/mcp-oauth/) | OAuth 2.0 (PKCE + Client Credentials), token persistence, mock server |
| [openapi-tools](examples/openapi-tools/) | OpenAPIToolset, auto-generated tools, httpbin.org live API |
| [multi-agent-workflow](examples/multi-agent-workflow/) | Orchestrator, delegates, multi-agent pipeline |
| [agent-swarm](examples/agent-swarm/) | Mailbox IPC, peer-to-peer swarm communication |
| [iam-multi-tenant](examples/iam-multi-tenant/) | RBAC, ABAC, tenant scoping, IAM policies |
| [deep-research](examples/deep-research/) | Multi-step research, context assembly, structured synthesis |
| [travel-agent](examples/travel-agent/) | Agent, multi-turn REPL, tool events, Gemini + OpenAI |
| [doctor-diagnostics](examples/doctor-diagnostics/) | Doctor auto-diagnosis, 16-event watch, error batching |
| [streaming-agent](examples/streaming-agent/) | runStream(), text_delta events, streaming UX |
| [structured-output](examples/structured-output/) | JSON schema output, structured data extraction |
| [memory-agent](examples/memory-agent/) | Memory strategies, extraction + retrieval |
| [guardrails-and-cost](examples/guardrails-and-cost/) | Cost tracking, guardrails, token budgets |
| [permissions-and-hooks](examples/permissions-and-hooks/) | PermissionPolicy, cliApproval(), Hooks, audit log |
| [secure-storage](examples/secure-storage/) | SecureStorage, env/password/machine key modes |
| [session-persistence](examples/session-persistence/) | Session.resumeOrCreate(), crash recovery |
| [system-prompt-builder](examples/system-prompt-builder/) | SystemPromptBuilder, static/dynamic sections |
| [model-router](examples/model-router/) | RouterChatModel, custom routing, router.stats() |
| [plan-mode](examples/plan-mode/) | planMode, onPlan approval gate |
| [vigil-autonomous](examples/vigil-autonomous/) | vigil(), tick loop, cron schedule |

```bash
cd examples/<example-name>
npm install
GEMINI_API_KEY=... npx tsx src/index.ts
```

---

## Multi-Provider Support

```typescript
import { GeminiChatModel, OpenAIChatModel, AnthropicChatModel, RouterChatModel } from 'yaaf';

// Gemini
const gemini = new GeminiChatModel({ model: 'gemini-2.5-flash' });

// OpenAI
const openai = new OpenAIChatModel({ model: 'gpt-4o' });

// Anthropic
const claude = new AnthropicChatModel({ model: 'claude-sonnet-4' });

// Groq (OpenAI-compatible)
const groq = new OpenAIChatModel({
  baseUrl: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama-3.3-70b-versatile',
});

// Ollama (local)
const ollama = new OpenAIChatModel({
  baseUrl: 'http://localhost:11434/v1',
  apiKey: 'ollama',
  model: 'llama3.1',
});

// Qwen via Ollama or Alibaba DashScope
const qwen = new OpenAIChatModel({
  baseUrl: 'http://localhost:11434/v1',     // Ollama
  // baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',  // DashScope
  apiKey: process.env.LLM_API_KEY ?? 'ollama',
  model: 'qwen2.5:72b',
});

// GLM-4 via Zhipu AI
const glm = new OpenAIChatModel({
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: process.env.LLM_API_KEY,
  model: 'glm-4-flash',
});

// DeepSeek
const deepseek = new OpenAIChatModel({
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: process.env.LLM_API_KEY,
  model: 'deepseek-chat',
});

// Smart routing — cheap requests → fast model, complex → capable
const router = new RouterChatModel({
  fast: qwen,
  capable: claude,
  route: (ctx) => ctx.messages.length > 10 ? 'capable' : 'fast',
});
```

**Or use env vars — provider auto-detected at startup:**

```bash
# LLM_BASE_URL activates OpenAI-compatible mode for any provider
LLM_BASE_URL=http://localhost:11434/v1  LLM_MODEL=qwen2.5:72b      npx tsx src/main.ts
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4  LLM_API_KEY=... LLM_MODEL=glm-4-flash npx tsx src/main.ts
LLM_BASE_URL=https://api.deepseek.com/v1           LLM_API_KEY=... LLM_MODEL=deepseek-chat npx tsx src/main.ts

# Hosted providers
GEMINI_API_KEY=...      LLM_MODEL=gemini-2.5-pro   npx tsx src/main.ts
ANTHROPIC_API_KEY=...   LLM_MODEL=claude-opus-4    npx tsx src/main.ts
OPENAI_API_KEY=...      LLM_MODEL=gpt-4o           npx tsx src/main.ts
```

---

## A2A — Cross-Framework Agent Interop

Expose any YAAF agent as an [A2A](https://a2a-protocol.org) server, or call remote agents from any framework:

```typescript
import { Agent, serveA2A, A2AClient, a2aTool } from 'yaaf';

// Expose a YAAF agent as an A2A server
const handle = await serveA2A(myAgent, {
  name: 'Weather Specialist',
  skills: [{ id: 'weather', name: 'Weather Lookup' }],
  port: 4100,
});
// Agent Card at: http://localhost:4100/.well-known/agent.json

// Call any remote A2A agent as a YAAF tool (one-liner)
const weatherTool = a2aTool('https://weather-agent.example.com');
const agent = new Agent({ tools: [weatherTool] });
```

---

## Remote Sessions — WebSocket Agent Serving

Serve agents over WebSocket + HTTP with persistent sessions:

```typescript
import { RemoteSessionServer } from 'yaaf/remote';

const server = new RemoteSessionServer(myAgent, {
  port: 8080,
  maxSessions: 100,
  sessionTimeoutMs: 30 * 60_000,
});

const handle = await server.start();
// HTTP:      POST http://localhost:8080/chat
// WebSocket: ws://localhost:8080/ws
// Sessions:  GET  http://localhost:8080/sessions
```

Zero-dependency WebSocket (RFC 6455 built-in — no `ws` package).

---

## OpenAPI → Tools (Zero Config)

Auto-generate agent tools from any OpenAPI 3.x spec:

```typescript
import { Agent, OpenAPIToolset } from 'yaaf';

const toolset = OpenAPIToolset.fromSpec(mySpec);
// or: OpenAPIToolset.fromUrl('https://api.example.com/openapi.json')

const agent = new Agent({
  tools: toolset.tools, // Each endpoint becomes a callable tool
});
```

---

## YAAF Doctor — Built-in Diagnostic Agent

Every YAAF agent ships with a built-in diagnostic agent. No extra install, no extra code.

**One flag:**
```typescript
const agent = new Agent({
  model: 'gpt-4o',
  tools: [myTools],
  doctor: true,   // ← watches for runtime errors, diagnoses automatically
});
```

**Or one env var (zero code changes):**
```bash
YAAF_DOCTOR=1 npx tsx src/main.ts
```

The Doctor silently subscribes to **16 event types** across every YAAF subsystem:

| Subsystem | Events watched |
|-----------|---------------|
| **Tools** | `tool:error` · `tool:blocked` · `tool:sandbox-violation` · `tool:validation-failed` · `tool:loop-detected` |
| **LLM** | `llm:retry` · `llm:empty-response` |
| **Context** | `context:overflow-recovery` · `context:output-continuation` · `context:compaction-triggered` · `context:budget-warning` · `iteration` |
| **Hooks & Guardrails** | `hook:error` · `hook:blocked` · `guardrail:warning` · `guardrail:blocked` |

When something fails, the Doctor uses its own LLM call to diagnose the root cause and log a fix — including code suggestions. Cascading errors (e.g., 20 `tool:blocked` from one permission bug) are batched into a single diagnosis call.

```bash
# Also available as a standalone CLI:
npx yaaf doctor                 # Interactive REPL — ask anything
npx yaaf doctor --daemon        # Periodic tsc + test watcher
npx yaaf doctor --watch         # Lightweight tsc loop (no LLM)
```

**[Full documentation →](docs/doctor.md)**

---

## Testing

YAAF has comprehensive test coverage with **1164 tests across 36 test files**:

```bash
npm test          # Run all tests (vitest)
npm run build     # TypeScript compile + copy Dev UI assets
```

---

## Design Principles

1. **Zero Runtime Dependencies** — The core framework ships nothing but TypeScript. Optional features (Ink, OTel, HTML parsing) are peer dependencies.
2. **Secure by Default** — `security: true` enables OWASP-aligned protection with one line. Permissions default to deny. Tools are write-capable and permission-gated by default.
3. **Ship Anywhere** — One agent, multiple delivery targets: CLI, HTTP API, edge function, chat bot, Dev UI.
4. **Streaming First** — Every runtime supports streaming with a unified `RuntimeStreamEvent` type.
5. **Memory is Composable** — Extraction (when to persist) and retrieval (what to inject) are independent interfaces.
6. **Context is Finite** — `ContextManager` actively manages token budgets with 7 pluggable compaction strategies.
7. **Observable by Default** — Every action emits typed `RunnerEvents` (22 event types) and OpenTelemetry spans. The built-in Doctor watches all of them.
8. **Defense in Depth** — 3 security layers (input → execution → output) with 11 composable modules, centralized audit logging, and per-user rate limiting.
9. **Identity-Aware** — Built-in RBAC + ABAC authorization with data scoping ensures agents only access what users are permitted to see.
10. **Plugin-First** — External capabilities are typed adapter interfaces. No vendor coupling. Plugin integrity verified via `TrustPolicy`.
11. **Compiled Knowledge** — Instead of RAG, YAAF compiles raw sources into a structured, cross-linked, self-healing wiki. The knowledge base is human-readable, diffable, and directly consumable as agent context.

---

## License

MIT
