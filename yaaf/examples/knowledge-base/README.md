# Knowledge Base Agent — YAAF Example

A complete, runnable example of the YAAF Knowledge Base system.

Raw source files (papers, notes, tool docs) are compiled by LLMs into a structured wiki, then a YAAF agent answers questions using that wiki — **no RAG, no vector search**.

---

## How It Works

```
kb/raw/          →   compile.ts   →   kb/compiled/   →   chat.ts
(sources)            (pipeline)        (wiki)             (agent)

papers/              Ingester          concepts/           KBAgent
notes/               Extractor         research-papers/    with 3 tools:
tools/               Synthesizer       tools/              - list_kb_index
                     Linter                                - fetch_kb_document
                                                           - search_kb
```

### Architecture (v2)

The KB system has two halves:

- **Compile-time** (`KBCompiler`) — Runs the raw/ → compiled/ pipeline. Ingests PDFs/markdown/HTML, extracts concepts via LLM, synthesizes encyclopedia-style articles, and lints.
- **Runtime** (`KnowledgeBase`) — Loads compiled articles and exposes them as YAAF tools. The agent dynamically searches and retrieves articles on demand.

```typescript
import { Agent } from 'yaaf'
import { KnowledgeBase } from 'yaaf/knowledge'

// Load the compiled KB and create an agent
const kb = await KnowledgeBase.load('./kb')
const agent = new Agent({
  tools:        kb.tools(),               // list_kb_index, fetch_kb_document, search_kb
  systemPrompt: kb.systemPromptSection(),  // tells the agent what articles are available
})

const answer = await agent.run('How does the attention mechanism work?')
```

---

## What's in the KB

The example ships with 6 source files covering:

| Source | Topic |
|--------|-------|
| `raw/papers/attention-is-all-you-need.md` | Transformer architecture, attention mechanism, results |
| `raw/notes/llm-primer.md` | LLMs: architecture, scaling, alignment, context windows |
| `raw/notes/rlhf-guide.md` | RLHF: SFT, reward modeling, PPO, DPO, RLAIF |
| `raw/notes/rag-guide.md` | RAG: pipeline, limitations, hybrid search, KB vs RAG |
| `raw/tools/pytorch-overview.md` | PyTorch: tensors, autograd, multi-head attention in code |
| `raw/tools/hugging-face-transformers.md` | Pipelines, tokenizers, Trainer, PEFT/LoRA |

---

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Set your API key
export GEMINI_API_KEY=...           # Google Gemini (recommended)
export OPENAI_API_KEY=sk-...        # OpenAI (alternative)
export ANTHROPIC_API_KEY=sk-ant-... # Anthropic (alternative)

# 3. Compile the KB (runs the pipeline: ingest → extract → synthesize → lint)
npm run compile

# 4. Chat with the KB agent
npm run chat

# OR: run demo questions automatically
npm run demo

# OR: compile + chat in one command
npm start
```

---

## Runtime Tools

The agent gets three tools via `kb.tools()`:

| Tool | Purpose | Example Input |
|------|---------|---------------|
| `list_kb_index` | Browse all articles with summaries | `{}` or `{ entityType: "concept" }` |
| `fetch_kb_document` | Read a specific article's full content | `{ docId: "concepts/attention-mechanism" }` |
| `search_kb` | Search articles by keyword | `{ query: "transformer" }` |

The agent autonomously decides when to use each tool — it browses the index, searches for topics, and fetches specific articles as needed to answer your questions.

---

## Compiler Options

```bash
# Skip sources older than their compiled article — much faster on reruns
npm run compile -- --incremental

# Auto-fix lint issues (broken wikilinks, unlinked mentions)
npm run compile -- --fix

# Lint only (no compile step) — useful for CI
npm run compile -- --lint-only

# Clip a web page and add it to raw/web-clips/ before compiling
# (requires: npm install @mozilla/readability jsdom turndown)
npm run compile -- --clip https://arxiv.org/abs/1706.03762

# [Opt-in] LLM-powered heal: fix broken wikilinks, expand thin articles
npm run compile -- --heal

# [Opt-in] LLM-powered discovery: find missing articles and weak connections
npm run compile -- --discover

# [Opt-in] Vision pass: auto-generate alt-text for images
npm run compile -- --vision

# Combine flags
npm run compile -- --incremental --fix --heal --discover
```

---

## Chat Commands

In the interactive REPL:

| Command | Description |
|---------|-------------|
| `/list` | List all KB articles with word counts |
| `/topics` | List all topics the agent knows about |
| `/reset` | Clear conversation history |
| `/exit` | Quit |

---

## Example Questions to Try

```
What is the attention mechanism and how does it work mathematically?
How does RLHF work? What are the three phases?
Explain the difference between RAG and a compiled knowledge base.
How do I implement multi-head attention in PyTorch?
What are the key differences between PyTorch and JAX?
What models are available in Hugging Face Transformers?
What did the "Attention Is All You Need" paper achieve on WMT 2014?
What is LoRA and how does it reduce fine-tuning memory requirements?
What are the limitations of RAG?
How does RLHF relate to Constitutional AI and RLAIF?
```

---

## Adding More Sources

### From a file
Add any `.md`, `.txt`, `.json`, `.pdf`, or code file to `kb/raw/`:

```bash
cp my-notes.md kb/raw/notes/
npm run compile -- --incremental
```

### From a PDF (LLM extraction)

PDF extraction is **automatic** — just drop a PDF into `raw/` and recompile. The compiler auto-detects your API key and uses LLM-based extraction:

| Key Set | Extractor Used |
|---------|---------------|
| `GEMINI_API_KEY` | Gemini Flash (fastest, cheapest) |
| `OPENAI_API_KEY` | GPT-4o |
| `ANTHROPIC_API_KEY` | Claude Sonnet |

Tables, equations, figures, and multi-column layouts are preserved faithfully.

### From a web page (web clipper)
```bash
npm install @mozilla/readability jsdom turndown   # one-time
npm run compile -- --clip https://example.com/article
```

### Updating the ontology
Edit `kb/ontology.yaml` to add new entity types or vocabulary, then recompile:

```bash
npm run compile   # full recompile to apply new schema
```

---

## Custom Model Config

```bash
# Gemini — use different models per stage
GEMINI_API_KEY=... GEMINI_EXTRACTION_MODEL=gemini-2.5-flash GEMINI_SYNTHESIS_MODEL=gemini-2.5-pro npm run compile

# OpenAI
OPENAI_API_KEY=... OPENAI_EXTRACTION_MODEL=gpt-4o-mini OPENAI_SYNTHESIS_MODEL=gpt-4o npm run compile
```

---

## KB Directory Structure

```
kb/
├── ontology.yaml         ← Schema: entity types, relationships, vocabulary
├── raw/                  ← Your source material (put anything here)
│   ├── papers/
│   ├── notes/
│   ├── tools/
│   └── web-clips/        ← Created by --clip
├── compiled/             ← LLM-authored wiki (managed by compiler)
│   ├── concepts/
│   ├── research-papers/
│   └── tools/
├── .kb-registry.json     ← Auto-maintained article index
└── .kb-lint-report.json  ← Last lint check results
```
