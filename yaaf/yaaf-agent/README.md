# 🤖 YAAF Expert Agent

A self-referential agent built **with** YAAF, **for** YAAF developers. It serves a browser-based Dev UI backed by a pre-compiled Knowledge Base of 900+ articles covering every API, subsystem, concept, and guide in YAAF.

## Quick Start

```bash
npm install -g yaaf-agent
```

Set one API key and run:

```bash
# Hosted providers
GEMINI_API_KEY=...      yaaf-agent   # Google Gemini (recommended)
ANTHROPIC_API_KEY=...   yaaf-agent   # Anthropic Claude
OPENAI_API_KEY=...      yaaf-agent   # OpenAI GPT-4o

# Any OpenAI-compatible endpoint (Qwen, GLM, DeepSeek, Groq, Ollama…)
LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=qwen2.5:72b yaaf-agent
```

Or run without installing globally:

```bash
GEMINI_API_KEY=... npx yaaf-agent
```

Open [http://localhost:3001](http://localhost:3001) in your browser and start asking questions about YAAF.

---

### Contributing / Running from source

```bash
git clone https://github.com/your-org/yaaf
cd yaaf && npm install
cd yaaf-agent && npm install

export GEMINI_API_KEY=...
npm start        # → http://localhost:3001
npm run dev      # + source-level code intelligence tools
```

## How It Works

The agent uses YAAF's Knowledge Base system — not a giant system prompt or RAG — to answer questions:

```
User question
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ Agent (auto-detected provider)                           │
│                                                         │
│  "search_kb"     → Full-text search → top 8 results    │
│  "read_kb"       → Read full article by docId           │
│  "list_kb_index" → Browse articles by entity type       │
│                                                         │
│  Synthesise answer from KB articles + working examples   │
└─────────────────────────────────────────────────────────┘
     │
     ▼
Streaming markdown response in Dev UI
  (headings, code blocks, lists, tables, syntax highlighting)
```

### KB Tools

| Tool | Description |
|------|-------------|
| `search_kb` | Full-text search across all 900+ articles — use this first |
| `read_kb` | Fetch the full content of a specific article by docId |
| `list_kb_index` | Browse articles by entity type (api, concept, subsystem, guide, plugin) |

### Dev Mode

For framework contributors who want source-level code intelligence tools:

```bash
npm run dev    # adds read_file, grep_search, list_dir, etc.
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     yaaf-agent                                │
│                                                              │
│  ┌────────────┐  ┌───────────────────┐  ┌────────────────┐  │
│  │  main.ts   │  │  KBStore          │  │  Dev UI        │  │
│  │  (server   │  │  (pre-compiled    │  │  (browser      │  │
│  │   entry)   │  │   KB, 900+ docs)  │  │   dashboard)   │  │
│  │            │  │                   │  │                │  │
│  │  HTTP/SSE  │  │  search_kb        │  │  Streaming MD  │  │
│  │  server    │  │  read_kb          │  │  Inspector     │  │
│  │  port 3001 │  │  list_kb_index    │  │  Tool timeline │  │
│  └─────┬──────┘  └───────┬───────────┘  └────────┬───────┘  │
│        │                 │                        │          │
│        └─────────────────┼────────────────────────┘          │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              YAAF Framework (dogfood)                  │   │
│  │  • Agent (contextManager: 'auto')                     │   │
│  │  • createServer({ devUi: true })                      │   │
│  │  • createKBTools(store)                               │   │
│  │  • Model specs registry                               │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Knowledge Base

The KB is pre-compiled from YAAF's source code and documentation. It lives in `knowledge/` and is loaded at startup via `KBStore`:

```
knowledge/
├── ontology.yaml          ← domain schema (entity types, vocabulary)
├── src/                   ← raw source material (TS signatures, docs)
├── compiled/              ← 900+ LLM-authored wiki articles
├── .kb-registry.json      ← article index (auto-maintained)
└── scripts/
    ├── init-ontology.ts   ← LLM-powered ontology generator
    ├── extract-source.ts  ← TypeScript → curated raw/ files
    ├── build-kb.ts        ← compilation entrypoint
    └── llm-client.ts      ← unified provider detection (KB scripts)
```

### KB Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Init ontology** | `npm run kb:init` | LLM-guided `ontology.yaml` generator (3-step interactive wizard) |
| **Full build** | `npm run kb:build` | Extract source + compile all articles |
| **Incremental** | `npm run kb:incremental` | Only recompile changed sources (fast) |
| **Lint** | `npm run kb:lint` | Validate compiled KB (no LLM calls) |
| **Extract** | `npm run kb:extract` | Re-extract TypeScript signatures from source |

### Rebuilding the KB

```bash
# Full rebuild — provider auto-detected from env vars
GEMINI_API_KEY=... npm run kb:build

# With a local model via Ollama
LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=qwen2.5:72b npm run kb:build

# Two-stage: cheap model for extraction, capable for synthesis
LLM_BASE_URL=http://localhost:11434/v1 \
  KB_EXTRACTION_MODEL=qwen2.5:7b \
  KB_SYNTHESIS_MODEL=qwen2.5:72b \
  npm run kb:build

# Incremental (only changed files — much faster)
GEMINI_API_KEY=... npm run kb:incremental
```

## Configuration

### Agent (runtime)

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP server port (default: `3001`) |
| `LLM_BASE_URL` | Base URL for any OpenAI-compatible endpoint (activates compat mode) |
| `LLM_MODEL` | Model name for any provider |
| `LLM_API_KEY` | API key for `LLM_BASE_URL` providers |
| `GEMINI_API_KEY` | Selects Google Gemini (auto-detected) |
| `ANTHROPIC_API_KEY` | Selects Anthropic Claude (auto-detected) |
| `OPENAI_API_KEY` | Selects OpenAI (auto-detected) |
| `YAAF_AGENT_MODEL` | Alias for `LLM_MODEL` (backward compat) |

**Provider resolution order:**
1. `LLM_BASE_URL` set → OpenAI-compatible mode (Qwen, GLM, DeepSeek, Groq, Ollama…)
2. `GEMINI_API_KEY` → Google Gemini
3. `ANTHROPIC_API_KEY` → Anthropic Claude
4. `OPENAI_API_KEY` → OpenAI

### KB compilation

| Variable | Description |
|----------|-------------|
| `LLM_BASE_URL` | OpenAI-compatible endpoint for KB compilation |
| `LLM_MODEL` | Model for both extraction + synthesis stages |
| `LLM_API_KEY` | API key for `LLM_BASE_URL` providers |
| `KB_BASE_URL` | Override `LLM_BASE_URL` for KB only |
| `KB_API_KEY` | Override `LLM_API_KEY` for KB only |
| `KB_MODEL` | Override `LLM_MODEL` for both KB stages |
| `KB_EXTRACTION_MODEL` | Fast/cheap model for the extraction stage |
| `KB_SYNTHESIS_MODEL` | Capable model for the synthesis stage |
| `GEMINI_API_KEY` | Selects Gemini for KB (auto-detected) |
| `ANTHROPIC_API_KEY` | Selects Anthropic for KB (auto-detected) |
| `OPENAI_API_KEY` | Selects OpenAI for KB (auto-detected) |

### Examples

```bash
# Gemini — single model for everything
GEMINI_API_KEY=... npm start

# Gemini — override model
GEMINI_API_KEY=... LLM_MODEL=gemini-2.5-pro npm start

# Qwen via Ollama
LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=qwen2.5:72b npm start

# GLM-4 via Zhipu AI
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4 LLM_API_KEY=<key> LLM_MODEL=glm-4-flash npm start

# DeepSeek
LLM_BASE_URL=https://api.deepseek.com/v1 LLM_API_KEY=<key> LLM_MODEL=deepseek-chat npm start

# Groq (hosted Llama)
LLM_BASE_URL=https://api.groq.com/openai/v1 LLM_API_KEY=<key> LLM_MODEL=llama-3.3-70b-versatile npm start
```

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------| 
| `ci.yml` | Every push + PR | TypeScript build + tests |
| `kb-build.yml` | Push to `main` when `knowledge/src/**` changes | Incremental KB recompile + auto-commit |

The KB build workflow uses `GEMINI_API_KEY` as a GitHub Actions secret. To switch providers in CI, replace it with `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `LLM_BASE_URL` + `LLM_MODEL` + `LLM_API_KEY`.
