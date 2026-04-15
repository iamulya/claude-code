# Knowledge Base Agent — YAAF Example

A complete, runnable example of the YAAF Knowledge Base compilation pipeline.

Raw source files (papers, notes, tool docs) are compiled by LLMs into a structured wiki, then a YAAF agent answers questions using that wiki as context — **no RAG, no vector search**.

---

## How It Works

```
kb/raw/          →   compile.ts   →   kb/compiled/   →   chat.ts
(sources)            (pipeline)        (wiki)             (agent)

papers/              Ingester          concepts/           KBAgent
notes/               Extractor         research-papers/    with 3 tools:
tools/               Synthesizer       tools/              - search_kb
                     Linter                                - list_kb
                                                           - get_article
```

The compiled wiki is injected **directly into the agent's system prompt**. No retrieval step — the LLM reads the full wiki and reasons across it naturally.

---

## What's in the KB

The example ships with 5 source files covering:

| Source | Topic |
|--------|-------|
| `raw/papers/attention-is-all-you-need.md` | Transformer architecture, attention mechanism, results |
| `raw/notes/llm-primer.md` | LLMs: architecture, scaling, alignment, context windows |
| `raw/notes/rlhf-guide.md` | RLHF: SFT, reward modeling, PPO, DPO, RLAIF |
| `raw/notes/rag-guide.md` | RAG: pipeline, limitations, hybrid search, KB vs RAG |
| `raw/tools/pytorch-overview.md` | PyTorch: tensors, autograd, multi-head attention in code |
| `raw/tools/hugging-face-transformers.md` | Pipelines, tokenizers, Trainer, PEFT/LoRA |

The compiler will produce articles in `kb/compiled/`: concepts like Transformer, Attention Mechanism, LLM, RLHF, RAG; a research paper article; and tool articles for PyTorch and Hugging Face Transformers.

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

# Combine flags
npm run compile -- --incremental --fix
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

To expand the knowledge base:

### From a file
Add any `.md`, `.txt`, `.json`, or code file to `kb/raw/`:

```bash
cp my-notes.md kb/raw/notes/
npm run compile -- --incremental
```

### From a web page (web clipper)
```bash
npm install @mozilla/readability jsdom turndown   # one-time
npm run compile -- --clip https://example.com/article
```

The clipper downloads the page, extracts the main content using Mozilla Readability, converts it to Markdown, saves images locally, and adds it to `kb/raw/web-clips/`.

### Updating the ontology
Edit `kb/ontology.yaml` to add new entity types or vocabulary, then recompile:

```bash
npm run compile   # full recompile to apply new schema
```

---

## Custom Model Config

Override which models are used for each pipeline stage:

```bash
# Gemini — use different models per stage
GEMINI_API_KEY=... GEMINI_EXTRACTION_MODEL=gemini-2.5-flash GEMINI_SYNTHESIS_MODEL=gemini-2.5-pro npm run compile

# OpenAI
OPENAI_API_KEY=... OPENAI_EXTRACTION_MODEL=gpt-4o-mini OPENAI_SYNTHESIS_MODEL=gpt-4o npm run compile
```

**Recommended pairings:**

| Stage | Model | Why |
|-------|-------|-----|
| Extraction | `gemini-2.5-flash` / `gpt-4o-mini` — fastest&cheapest | One call per source file |
| Synthesis | `gemini-2.5-pro` / `gpt-4o` — most capable | One call per article (writes encyclopedia content) |
| Chat | auto-detected from env | Full context window used |

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
