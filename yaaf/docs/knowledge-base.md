# YAAF Knowledge Base

YAAF ships with a Karpathy-style "compile your knowledge" pipeline: raw source material (papers, web clips, code, documentation) is ingested from a `raw/` directory and compiled by an LLM into a structured, wiki-like knowledge base in a `compiled/` directory. A self-healing linter then keeps the KB consistent.

This approach bypasses RAG entirely. Instead of embedding and retrieving chunks at query time, the LLM reads the well-structured compiled wiki — complete with wikilinks, frontmatter, and cross-references — as part of its context. The result is a knowledge base that is legible to both humans and LLMs.

---

## Quickstart

```typescript
import { KBCompiler, makeGenerateFn } from 'yaaf/knowledge'
import { GeminiChatModel } from 'yaaf'

// 1. Create the compiler (loads ontology.yaml + .kb-registry.json from disk)
const compiler = await KBCompiler.create({
  kbDir: './my-kb',
  extractionModel: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
  synthesisModel:  makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-pro' })),
})

// 2. Compile raw/ → compiled/
const result = await compiler.compile()

console.log(`Created ${result.synthesis.created} articles`)
console.log(`Updated ${result.synthesis.updated} articles`)
console.log(`Stubs:   ${result.synthesis.stubsCreated}`)

if (result.lint) {
  console.log(`Lint errors: ${result.lint.summary.errors}`)
  console.log(`Auto-fixable: ${result.lint.summary.autoFixable}`)
}
```

---

## Directory Structure

```
my-kb/
│
├── ontology.yaml              ← Required: domain schema (entity types, relationships, vocabulary)
│
├── raw/                       ← Your source material — put anything here
│   ├── papers/                ← Research papers (.md, .html)
│   ├── web-clips/             ← Obsidian Web Clipper output
│   ├── tools/                 ← Tool and library documentation
│   ├── datasets/              ← Dataset descriptions
│   └── notes/                 ← Personal notes, rough drafts
│
├── compiled/                  ← LLM-authored wiki (managed by the compiler)
│   ├── concepts/              ← Concept articles
│   ├── tools/                 ← Tool articles
│   ├── research-papers/       ← Research paper articles
│   └── assets/                ← Local copies of images from sources
│
├── .kb-registry.json          ← Auto-maintained: index of all compiled articles
└── .kb-lint-report.json       ← Last lint report (useful for CI)
```

---

## Ontology

The `ontology.yaml` file is the schema for your knowledge base. It defines what kinds of entities exist, what their frontmatter fields are, how articles should be structured, and the vocabulary of known terms. **The compiler will refuse to run without a valid ontology.**

### Generating your ontology with `kb:init`

YAAF includes an LLM-powered ontology generator that scans your project and drafts a complete `ontology.yaml`. This is the recommended way to bootstrap a new KB.

#### Interactive mode

```bash
npm run kb:init
```

```
🧠  YAAF KB — Ontology Generator

Step 1 of 3 — Describe your knowledge domain
  > FastAPI — a Python web framework for building REST APIs quickly.
    Covers routing, validation, dependency injection, and deployment.

Step 2 of 3 — Source directories to scan
  > ./src, ./docs

Step 3 of 3 — Entity type hints (optional)
  > endpoint, decorator, middleware, guide

Generating ontology.yaml...
  Model:  gemini-2.5-flash
  Scanning: ./src, ./docs

✓  ontology.yaml written to: ./knowledge/ontology.yaml
```

#### Non-interactive mode (for CI or scripting)

```bash
npx tsx knowledge/scripts/init-ontology.ts \
  --domain "My SDK — a TypeScript library for X" \
  --src ./src --src ./docs \
  --entity-types "class,function,guide" \
  --model gemini-2.5-flash
```

#### Programmatic usage

```typescript
import { OntologyGenerator, makeGenerateFn } from 'yaaf/knowledge'
import { GeminiChatModel } from 'yaaf'

const generator = new OntologyGenerator({
  generateFn: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
  outputPath: './knowledge/ontology.yaml',
})

const result = await generator.generate({
  domain: 'Acme SDK — a TypeScript library for building widgets.',
  srcDirs: ['./src'],
  entityTypeHints: ['class', 'hook', 'guide'],
})

console.log(`Written to: ${result.outputPath}`)
if (result.warnings.length > 0) {
  console.log('Warnings:', result.warnings)
}
```

The generator:
1. Scans the file tree (depth 3, skipping `node_modules`/`dist`/`.git`)
2. Reads `README.md` + `package.json` for domain context
3. Sends all context + your domain description to an LLM with the YAAF ontology as a format reference
4. Writes and validates the result with `OntologyLoader.load()`
5. Reports any validation warnings before you run `kb:build`

> **Tip:** Always review and edit the generated ontology before your first `kb:build`. The LLM does 90% of the work, but your domain expertise should refine entity types, article structures, and vocabulary terms.

### Full ontology.yaml reference

```yaml
# ── Domain ─────────────────────────────────────────────────────────────────────
domain: "Machine Learning Research"   # One-line description of your KB's subject area

# ── Entity Types ───────────────────────────────────────────────────────────────
# Define the types of articles your KB contains.
# Each entity type gets its own subdirectory in compiled/.
entity_types:

  concept:
    description: "A core idea, technique, or abstraction in ML"

    # Frontmatter schema — validated after every synthesis pass
    frontmatter:
      fields:
        title:
          description: "Full canonical title"
          type: string
          required: true

        entity_type:
          description: "Always 'concept'"
          type: string
          required: true

        tags:
          description: "Topical tags for discoverability"
          type: string[]
          required: false

        status:
          description: "Maturity of this concept in the field"
          type: enum
          required: false
          enum: [established, emerging, deprecated, speculative]

        introduced_in:
          description: "DocId of the research paper that introduced this concept"
          type: entity_ref
          required: false
          target_entity_type: research_paper

    # Article structure — sections the LLM is instructed to write
    article_structure:
      - heading: "Overview"
        description: "What is this concept? Define it clearly and concisely."
        required: true

      - heading: "How It Works"
        description: "Mechanism, math, or algorithm — as appropriate for the concept."
        required: false

      - heading: "Key Properties"
        description: "Important characteristics, edge cases, or trade-offs."
        required: false

      - heading: "Applications"
        description: "Where and how this concept is used in practice."
        required: false

      - heading: "Related Concepts"
        description: "Connections to other KB entities."
        required: false

    # Which other entity types this article can wikilink to
    linkable_to:
      - concept
      - research_paper
      - tool

    # Whether this entity type appears in the global index
    indexable: true

  research_paper:
    description: "An academic paper, preprint, or technical report"

    frontmatter:
      fields:
        title:
          description: "Full paper title"
          type: string
          required: true
        entity_type:
          description: "Always 'research_paper'"
          type: string
          required: true
        authors:
          description: "Author list"
          type: string[]
          required: false
        year:
          description: "Publication year"
          type: number
          required: false
        venue:
          description: "Conference, journal, or preprint server"
          type: string
          required: false
        url:
          description: "Link to the paper"
          type: url
          required: false

    article_structure:
      - heading: "Summary"
        description: "What this paper does and why it matters."
        required: true
      - heading: "Key Contributions"
        description: "Novel contributions — what is new compared to prior work."
        required: true
      - heading: "Architecture / Methods"
        description: "Technical details of the proposed approach."
        required: false
      - heading: "Results"
        description: "Quantitative results on key benchmarks."
        required: false
      - heading: "Limitations"
        description: "What the authors acknowledge the approach cannot do."
        required: false

    linkable_to:
      - concept
      - tool

    indexable: true

  tool:
    description: "A software library, framework, or research tool"

    frontmatter:
      fields:
        title:
          description: "Tool name"
          type: string
          required: true
        entity_type:
          description: "Always 'tool'"
          type: string
          required: true
        homepage:
          description: "Project homepage or documentation URL"
          type: url
          required: false
        language:
          description: "Primary programming language"
          type: enum
          required: false
          enum: [Python, TypeScript, JavaScript, Rust, Go, C++, Java, other]
        license:
          description: "Open source license"
          type: string
          required: false

    article_structure:
      - heading: "Overview"
        description: "What this tool does and what problem it solves."
        required: true
      - heading: "Installation"
        description: "How to install or set up the tool."
        required: false
      - heading: "Key Features"
        description: "Notable capabilities."
        required: false
      - heading: "Example Usage"
        description: "A concise, working code example."
        required: false

    linkable_to:
      - concept
      - research_paper

    indexable: true

# ── Relationship Types ─────────────────────────────────────────────────────────
# Defines named relationships between entity types.
# Used by the linter's MISSING_RECIPROCAL_LINK check.
relationship_types:
  - name: IMPLEMENTS
    from: tool
    to: concept
    description: "A tool that implements or is based on a concept"
    reciprocal: IMPLEMENTED_BY   # If A→B, the linter expects B→A with this rel name

  - name: INTRODUCED_BY
    from: concept
    to: research_paper
    description: "A concept first introduced in a paper"
    reciprocal: INTRODUCES

# ── Vocabulary ─────────────────────────────────────────────────────────────────
# Known terms and their canonical forms.
# Used by:
#  - The Extractor (static pass) for entity mention detection
#  - The Linter's NON_CANONICAL_WIKILINK and UNLINKED_MENTION checks
#  - The Auto-fixer to rewrite [[alias]] → [[canonical title]]
vocabulary:
  "attention mechanism":
    aliases:
      - attention
      - self-attention
      - scaled dot-product attention
    entity_type: concept
    doc_id: concepts/attention-mechanism   # docId of the compiled article

  "transformer":
    aliases:
      - transformer model
      - transformer architecture
    entity_type: concept
    doc_id: concepts/transformer

  "pytorch":
    aliases:
      - torch
      - PyTorch
    entity_type: tool
    doc_id: tools/pytorch

# ── Token Budget ───────────────────────────────────────────────────────────────
# Controls how much source material is sent to each LLM call.
budget:
  text_document_tokens: 8192     # Max tokens from each source document
  image_tokens: 1200             # Token cost per image (for vision-capable models)
  max_images_per_fetch: 3        # Max images included per synthesis call

# ── Compiler Model Config ──────────────────────────────────────────────────────
# Model names for each pipeline stage (informational — actual models are
# passed programmatically via KBCompilerOptions).
compiler:
  extraction_model: gemini-2.5-flash   # Fast/cheap — used for planning pass
  synthesis_model:  gemini-2.5-pro     # Capable — used for article authoring
```

### Field types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Free text | `"My Article"` |
| `string[]` | Array of strings | `["nlp", "transformers"]` |
| `number` | Numeric value | `2017` |
| `boolean` | True/false | `true` |
| `date` | ISO date string | `"2024-01-15"` |
| `url` | URL string | `"https://arxiv.org/..."` |
| `url[]` | Array of URLs | |
| `enum` | One of a set of values | `"active"` |
| `enum[]` | Array of enum values | |
| `entity_ref` | DocId of another article | `"concepts/transformer"` |
| `entity_ref[]` | Array of docIds | |

---

## Pipeline Architecture

```
raw/ (source material)
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 1: Ingester                                       │
│                                                          │
│  ingestFile(path) → IngestedContent                      │
│  ・ Markdown  — frontmatter stripped, images resolved     │
│  ・ HTML      — Readability extraction → Markdown        │
│  ・ Text      — wrapped as-is                            │
│  ・ JSON      — pretty-printed + key summary             │
│  ・ Code      — docstring/comment extraction             │
│  ・ Images    — magic-byte MIME detection, saved locally │
└──────────────────────────────────────────────────────────┘
  │  IngestedContent[]
  ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 2: Concept Extractor                              │
│                                                          │
│  Pass 1 — Static (no LLM):                              │
│  ・ Vocabulary scan → entity mention counts              │
│  ・ Registry lookup → known article matches              │
│  ・ Directory hinting (raw/papers/ → research_paper)     │
│  ・ Token estimation → truncation decision               │
│                                                          │
│  Pass 2 — LLM (extraction model — fast/cheap):           │
│  ・ System: ontology entity types + rules                │
│  ・ User:   static analysis + source text                │
│  ・ Output: JSON ArticlePlan[] per source                │
│                                                          │
│  Pass 3 — Post-processing:                               │
│  ・ docId validation against slug format                 │
│  ・ knownLinkDocIds filtered vs registry (no hallucinations)│
│  ・ Multi-source merge: same docId → unified plan        │
│  ・ Skipped/errored sources → plan.skipped list          │
└──────────────────────────────────────────────────────────┘
  │  CompilationPlan
  ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 3: Knowledge Synthesizer                          │
│                                                          │
│  Per ArticlePlan (concurrency-limited, default: 3):      │
│  ・ Gather source IngestedContent[]                      │
│  ・ Load existing article (if action='update')           │
│  ・ Build synthesis prompt:                              │
│    System: entity type schema + authoring rules          │
│    User:   wikilink targets + sources + existing article │
│  ・ Call synthesis model (capable/expensive)             │
│  ・ Parse LLM output (YAML frontmatter + body)           │
│  ・ Validate frontmatter against ontology schema         │
│  ・ Inject compiler metadata (compiled_at, stub, etc.)   │
│  ・ Write compiled/{docId}.md                            │
│  ・ Update ConceptRegistry                               │
│                                                          │
│  Stub articles for candidateNewConcepts (confidence>0.7) │
└──────────────────────────────────────────────────────────┘
  │  SynthesisResult + compiled/** + .kb-registry.json
  ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 4: Linter / Health Check                          │
│                                                          │
│  Static checks (all 13 — no LLM):                       │
│  STRUCTURAL:                                             │
│  ・ MISSING_ENTITY_TYPE      entity_type field absent    │
│  ・ UNKNOWN_ENTITY_TYPE      not in ontology             │
│  ・ MISSING_REQUIRED_FIELD   required frontmatter absent │
│  ・ INVALID_FIELD_VALUE      enum/type violation         │
│  LINKING:                                                │
│  ・ BROKEN_WIKILINK          [[target]] not in registry  │
│  ・ NON_CANONICAL_WIKILINK   [[alias]] vs [[canonical]]  │
│  ・ UNLINKED_MENTION         entity mentioned, not linked │
│  ・ ORPHANED_ARTICLE         no incoming wikilinks       │
│  ・ MISSING_RECIPROCAL_LINK  A→B but B doesn't→A        │
│  QUALITY:                                                │
│  ・ LOW_ARTICLE_QUALITY      body too short (<50 words)  │
│  ・ BROKEN_SOURCE_REF        compiled_from path missing  │
│  ・ STUB_WITH_SOURCES        stub can be expanded        │
│  ・ DUPLICATE_CANDIDATE      similar title collision     │
│                                                          │
│  Auto-fix pass (optional):                               │
│  ・ NON_CANONICAL_WIKILINK   rewrite [[alias]] → [[canonical]] │
│  ・ UNLINKED_MENTION         add [[wikilink]] to 1st occurrence │
│  ・ MISSING_REQUIRED_FIELD   inject default value        │
└──────────────────────────────────────────────────────────┘
  │  LintReport + .kb-lint-report.json
  ▼
compiled/ (structured, LLM-ready wiki)
```

---

## Compiled Article Format

Every compiled article is a Markdown file with YAML frontmatter:

```markdown
---
title: "Attention Mechanism"
entity_type: concept
tags:
  - nlp
  - transformers
  - deep-learning
status: established
introduced_in: research-papers/attention-is-all-you-need

# Compiler-injected metadata (always present, always accurate)
stub: false
compiled_at: "2024-01-15T10:30:00.000Z"
compiled_from:
  - /my-kb/raw/papers/attention-paper.md
  - /my-kb/raw/web-clips/attention-mechanism-explained.md
confidence: 0.95
---

## Overview

The **attention mechanism** is a core component of modern neural network architectures,
particularly the [[Transformer]]. It allows a model to weigh the relevance of different
parts of the input when producing an output.

## How It Works

Attention computes a weighted sum of value vectors using scores derived from query-key
dot products. For an input sequence of length $n$:

$$\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right) V$$

This was introduced in [[Attention Is All You Need]] (2017).

## Applications

- Machine translation
- Document summarization
- Image captioning (cross-modal attention)
- [[PyTorch]] provides `torch.nn.MultiheadAttention` as a built-in module.
```

### Compiler-injected frontmatter fields

These fields are always written by the compiler and cannot be overridden by LLM output:

| Field | Type | Description |
|-------|------|-------------|
| `stub` | boolean | `true` if this is a placeholder article awaiting more sources |
| `compiled_at` | ISO timestamp | When this article was last synthesized |
| `compiled_from` | string[] | Absolute paths of source files used |
| `confidence` | number (0–1) | Extractor's confidence that this plan is correct |

### DocId format

Articles are identified by a `docId` — a relative path within `compiled/` without the `.md` extension:

```
concepts/attention-mechanism        → compiled/concepts/attention-mechanism.md
tools/pytorch                       → compiled/tools/pytorch.md
research-papers/attention-is-all-you-need → compiled/research-papers/attention-is-all-you-need.md
```

DocIds are computed deterministically by:
1. Converting the canonical title to lowercase
2. Replacing non-alphanumeric characters with hyphens
3. Prefixing with the pluralized entity type directory

---

## KBCompiler API

### `KBCompiler.create(options)`

Async factory — loads ontology and registry from disk. Throws if `ontology.yaml` is missing or has validation errors.

```typescript
const compiler = await KBCompiler.create({
  // Required
  kbDir: './my-kb',
  extractionModel: someGenerateFn,
  synthesisModel: anotherGenerateFn,

  // Optional
  rawDirName: 'raw',           // default: 'raw'
  compiledDirName: 'compiled', // default: 'compiled'
  ontologyPath: undefined,     // default: {kbDir}/ontology.yaml
  autoLint: true,              // default: true — run linter after compile
  autoFix: false,              // default: false — auto-apply fixable issues
})
```

### `compiler.compile(options?)`

Run the full pipeline. Returns `Promise<CompileResult>`.

```typescript
const result = await compiler.compile({
  incrementalMode: true,   // skip sources older than their compiled article
  concurrency: 3,          // parallel synthesis calls (default: 3)
  dryRun: false,           // run pipeline but don't write to disk
  onProgress: (event) => { // real-time progress callback
    if (event.stage === 'ingest') {
      console.log(`Ingested ${event.processed}/${event.total}: ${event.file}`)
    } else if (event.stage === 'synthesize') {
      const e = event.event
      if (e.type === 'article:written') {
        console.log(`✓ ${e.docId} (${e.wordCount} words)`)
      }
    }
  },
  lintOptions: {
    minArticleWordCount: 80,      // default: 50
    duplicateSimilarityThreshold: 0.12,  // default: 0.15
  },
})

console.log(result.synthesis.created)   // new articles written
console.log(result.synthesis.updated)   // existing articles updated
console.log(result.synthesis.failed)    // articles that encountered errors
console.log(result.lint?.summary)       // lint report summary
console.log(result.ingestErrors)        // source files that failed to ingest
```

### `compiler.lint(options?)`

Run only the linter on the current `compiled/` directory (no compilation).

```typescript
const report = await compiler.lint({
  minArticleWordCount: 50,
  skipDocIds: ['concepts/scratch-note'],
})

for (const issue of report.issues) {
  console.log(`[${issue.severity}] ${issue.code} @ ${issue.docId}: ${issue.message}`)
  if (issue.suggestion) console.log(`  → ${issue.suggestion}`)
}
```

### `compiler.fix(report, dryRun?)`

Apply auto-fixable issues from a lint report.

```typescript
const report = await compiler.lint()
const fixes = await compiler.fix(report)
console.log(`Fixed ${fixes.fixedCount} issues`)
```

### `compiler.clip(url)`

Clip a web page to `raw/web-clips/` as a Markdown file with locally-saved images. Requires optional peer dependencies — see [Web Clipping](#web-clipping).

```typescript
const { savedPath, title, imageCount } = await compiler.clip(
  'https://arxiv.org/abs/1706.03762'
)
console.log(`Saved: ${savedPath}`) // raw/web-clips/attention-is-all-you-need/index.md
```

### `compiler.reloadOntology()`

Reload `ontology.yaml` from disk (useful after editing the ontology without restarting).

### `compiler.conceptRegistry`

Access the in-memory `ConceptRegistry` (a `Map<docId, ConceptRegistryEntry>`).

### `compiler.knowledgeOntology`

Access the loaded `KBOntology` object.

---

## Source File Formats

The Ingester normalizes all supported source formats into a unified `IngestedContent` representation.

### Supported formats

| Extension(s) | Ingester | Notes |
|--------------|----------|-------|
| `.md`, `.markdown` | `MarkdownIngester` | Primary path — frontmatter stripped, images resolved |
| `.html`, `.htm` | `HtmlIngester` | Readability extraction + Turndown conversion. Requires optional deps. |
| `.txt`, `.text` | `PlainTextIngester` | Wrapped as-is in a markdown code block |
| `.json`, `.jsonl` | `JsonIngester` | Pretty-printed + key summary injected |
| `.ts`, `.tsx`, `.js`, `.jsx` | `CodeIngester` | Extracts JSDoc/TSDoc comments + function signatures |
| `.py` | `CodeIngester` | Extracts docstrings |
| `.go`, `.rs`, `.java`, `.c`, `.cpp` | `CodeIngester` | Extracts line-comment documentation headers |

### Image handling

Images embedded in source documents are handled automatically:

- **Local images** (e.g., `![](./diagram.png)`) — resolved relative to the source file, copied to `compiled/assets/`
- **Remote images** (e.g., `![](https://example.com/fig.png)`) — downloaded and saved locally
- **MIME detection** — magic-byte inspection to determine actual image type (not just extension)
- **Vision context** — images are included in the synthesis prompt when the model supports vision

---

## Web Clipping

The `KBClipper` provides a programmatic equivalent of the [Obsidian Web Clipper](https://obsidian.md/clipper), saving web pages as clean Markdown with locally saved images.

### Install optional dependencies

```bash
npm install @mozilla/readability jsdom turndown
```

### Usage

```typescript
// Via the compiler
const result = await compiler.clip('https://arxiv.org/abs/2301.13379')

// Or directly
import { KBClipper } from 'yaaf/knowledge'

const clipper = new KBClipper('./my-kb/raw/web-clips')

const result = await clipper.clip('https://example.com/article')
// → { savedPath: 'raw/web-clips/article-title/index.md', title: '...', imageCount: 3 }
```

The clipper:
1. Fetches the URL (with realistic browser headers)
2. Extracts the main article content using Mozilla Readability
3. Converts to Markdown with Turndown
4. Downloads all embedded images locally
5. Rewrites image references to use local paths
6. Saves as `raw/web-clips/{slug}/index.md`

---

## Concept Extractor

Use the `ConceptExtractor` directly when you want to preview the compilation plan before synthesis, or build a custom pipeline.

```typescript
import { ConceptExtractor, makeGenerateFn, ingestFile } from 'yaaf/knowledge'

// Ingest a source file
const content = await ingestFile('./raw/papers/my-paper.md')

// Build the extraction plan
const extractor = new ConceptExtractor(ontology, registry, extractionModel)
const plan = await extractor.buildPlan([content])

console.log('Articles to create:', plan.articles.filter(a => a.action === 'create').length)
console.log('Articles to update:', plan.articles.filter(a => a.action === 'update').length)
console.log('Skipped:', plan.skipped.length)

for (const article of plan.articles) {
  console.log(`\n${article.action.toUpperCase()}: ${article.canonicalTitle}`)
  console.log(`  docId:       ${article.docId}`)
  console.log(`  entityType:  ${article.entityType}`)
  console.log(`  confidence:  ${article.confidence}`)
  console.log(`  links to:    ${article.knownLinkDocIds.join(', ')}`)
  console.log(`  candidates:  ${article.candidateNewConcepts.map(c => c.name).join(', ')}`)
}
```

### `CompilationPlan` type

```typescript
type CompilationPlan = {
  sourceCount: number
  articles: ArticlePlan[]   // articles to create or update
  skipped: Array<{ sourcePath: string; reason: string }>
  createdAt: number
}

type ArticlePlan = {
  docId: string                         // e.g. "concepts/attention-mechanism"
  canonicalTitle: string                // e.g. "Attention Mechanism"
  entityType: string                    // e.g. "concept"
  action: 'create' | 'update' | 'skip'
  existingDocId: string | null          // for updates
  sourcePaths: string[]                 // source files contributing to this article
  knownLinkDocIds: string[]             // registry-validated wikilink targets
  candidateNewConcepts: CandidateConcept[] // concepts worth creating stubs for
  suggestedFrontmatter: Record<string, unknown>
  confidence: number                    // 0–1
}
```

---

## Knowledge Synthesizer

Use the `KnowledgeSynthesizer` directly for fine-grained control over the authoring step.

```typescript
import { KnowledgeSynthesizer, makeGenerateFn } from 'yaaf/knowledge'

const synthesizer = new KnowledgeSynthesizer(
  ontology,
  registry,
  synthesisModel,     // GenerateFn
  './my-kb/compiled', // output directory
)

const result = await synthesizer.synthesize(plan, contentsByPath, {
  concurrency: 5,
  dryRun: false,
  stubConfidenceThreshold: 0.75,  // default: 0.7
  onProgress: (event) => {
    switch (event.type) {
      case 'article:started':
        console.log(`⏳ Writing ${event.title}...`)
        break
      case 'article:written':
        console.log(`✓ ${event.title} — ${event.wordCount} words`)
        break
      case 'article:failed':
        console.error(`✗ ${event.title}: ${event.error.message}`)
        break
      case 'stub:created':
        console.log(`  (stub) ${event.title}`)
        break
    }
  },
})
```

---

## Linter Reference

### Running the linter

```typescript
const report = await compiler.lint()

console.log(`Checked ${report.articlesChecked} articles`)
console.log(`Errors:   ${report.summary.errors}`)
console.log(`Warnings: ${report.summary.warnings}`)
console.log(`Info:     ${report.summary.info}`)
console.log(`Auto-fixable: ${report.summary.autoFixable}`)
```

### Lint codes

#### Structural (severity: `error`)

| Code | Description | Auto-fixable |
|------|-------------|:---:|
| `MISSING_ENTITY_TYPE` | `entity_type` frontmatter field is absent | |
| `UNKNOWN_ENTITY_TYPE` | `entity_type` value not defined in ontology | |
| `MISSING_REQUIRED_FIELD` | Required frontmatter field is absent | ✓ (if default exists) |
| `INVALID_FIELD_VALUE` | Enum violation or type mismatch | |

#### Linking (severity: `warning` / `info`)

| Code | Severity | Description | Auto-fixable |
|------|----------|-------------|:---:|
| `BROKEN_WIKILINK` | error | `[[Target]]` not in registry | |
| `NON_CANONICAL_WIKILINK` | warning | `[[alias]]` used instead of `[[canonical title]]` | ✓ |
| `UNLINKED_MENTION` | info | Known entity mentioned in text without `[[wikilink]]` | ✓ |
| `ORPHANED_ARTICLE` | warning | No other article links to this one | |
| `MISSING_RECIPROCAL_LINK` | info | A→B but B doesn't→A (for defined reciprocal relationships) | |

#### Quality (severity: `info` / `warning`)

| Code | Severity | Description | Auto-fixable |
|------|----------|-------------|:---:|
| `LOW_ARTICLE_QUALITY` | warning | Body word count below threshold (non-stub) | |
| `BROKEN_SOURCE_REF` | info | `compiled_from` path no longer exists on disk | |
| `STUB_WITH_SOURCES` | info | Stub article may have expandable material in `raw/` | |
| `DUPLICATE_CANDIDATE` | warning | Two articles have very similar titles | |

### Auto-fix in detail

```typescript
const report = await compiler.lint()

// Preview what would be changed (dry run — no disk writes)
const preview = await compiler.fix(report, true /* dryRun */)
console.log(`Would fix: ${preview.fixedCount} issues`)
for (const f of preview.fixed) {
  console.log(`  ${f.code} @ ${f.docId}`)
}

// Apply fixes
const applied = await compiler.fix(report)
console.log(`Fixed: ${applied.fixedCount}`)
console.log(`Skipped: ${applied.skipped.length}`)
```

**What auto-fix does:**

- `NON_CANONICAL_WIKILINK` — rewrites `[[self-attention]]` to `[[Attention Mechanism]]` in all occurrences
- `UNLINKED_MENTION` — adds `[[Attention Mechanism]]` around the **first** occurrence of `attention mechanism` in the body
- `MISSING_REQUIRED_FIELD` with a default — injects `fieldName: defaultValue` into the frontmatter

**What auto-fix does NOT do:**

- Delete content
- Change article structure
- Add or remove sections
- Rewrite body prose

---

## Model Adapters

The pipeline accepts any model via two interfaces:

### `GenerateFn`

The simplest interface — a plain async function:

```typescript
type GenerateFn = (systemPrompt: string, userPrompt: string) => Promise<string>
```

Build one from any YAAF model using `makeGenerateFn`:

```typescript
import { makeGenerateFn } from 'yaaf/knowledge'
import { GeminiChatModel, AnthropicChatModel, OpenAIChatModel } from 'yaaf'

// Gemini
const extractFn = makeGenerateFn(
  new GeminiChatModel({ model: 'gemini-2.5-flash' }),
  { temperature: 0.0, maxTokens: 2048 }
)

// Claude
const synthFn = makeGenerateFn(
  new AnthropicChatModel({ model: 'claude-opus-4-5' }),
  { temperature: 0.1, maxTokens: 8192 }
)

// Or any object with a .complete() method:
const customFn = makeGenerateFn({
  complete: async (params) => {
    const response = await myCustomProvider.generate(params)
    return { content: response.text }
  }
})
```

### `ModelLike`

Pass a YAAF model object directly to `KBCompiler.create()` — it is normalized automatically:

```typescript
const compiler = await KBCompiler.create({
  kbDir: './my-kb',
  extractionModel: new GeminiChatModel({ model: 'gemini-2.5-flash' }),
  synthesisModel:  new GeminiChatModel({ model: 'gemini-2.5-pro' }),
})
```

### Recommended model pairing

| Stage | Recommended model | Why |
|-------|------------------|-----|
| Extraction | `gemini-2.5-flash`, `claude-haiku`, `gpt-4o-mini` | Fast, cheap — runs once per source file |
| Synthesis | `gemini-2.5-pro`, `claude-opus-4-5`, `gpt-4o` | Capable — writes encyclopedia articles |

---

## Incremental Compilation

By default `compile()` processes all source files every time. In incremental mode, source files that are **older than their compiled article** are skipped:

```typescript
const result = await compiler.compile({
  incrementalMode: true,
})
```

**When incremental doesn't skip a file:**
- The compiled article for that source doesn't exist yet
- The source file's mtime is newer than the compiled article

**Important:** The first run is always a full compile. Subsequent runs benefit from incremental mode.

---

## Wikilinks

Compiled articles use Obsidian-style `[[wikilinks]]`:

```markdown
The [[Transformer]] relies on the [[Attention Mechanism]] as its core building block.
[[PyTorch]] provides `nn.MultiheadAttention` for this operation.

# Display text alternative:
[[Attention Mechanism|attention]] was first described in [[Attention Is All You Need|the 2017 paper]].
```

The linter resolves wikilinks by:
1. Exact canonical title match (case-insensitive)
2. Alias lookup via the vocabulary
3. Direct docId match

Wikilinks that don't resolve to any registry entry are flagged as `BROKEN_WIKILINK` (error).

---

## Runtime — KBStore, Tools & Federation

Once your KB is compiled, the runtime layer provides search and retrieval for agents.

### KBStore — Load and query a compiled KB

```typescript
import { KBStore, createKBTools } from 'yaaf/knowledge'

const store = new KBStore('./knowledge')
await store.load()

console.log(`Loaded ${store.getAllDocuments().length} articles`)

// Full-text search
const results = store.search('context compaction', { maxResults: 5 })
for (const r of results) {
  console.log(`${r.docId} (score: ${r.score.toFixed(2)}): ${r.title}`)
}

// Read a specific article
const doc = store.getDocument('concepts/context-compaction')
console.log(doc?.frontmatter.title, doc?.body.slice(0, 200))
```

### createKBTools — Give an agent KB access

One-liner to give any YAAF agent full KB access:

```typescript
import { Agent, KBStore, createKBTools } from 'yaaf'

const store = new KBStore('./knowledge')
await store.load()

const kbTools = createKBTools(store, {
  maxDocumentChars: 20_000,
  maxSearchResults: 8,
  maxExcerptChars: 1_200,
})

const agent = new Agent({
  systemPrompt: 'You are an expert on my project.',
  tools: [...kbTools],  // search_kb, read_kb, list_kb_index
})
```

This creates three tools:

| Tool | Description |
|------|-------------|
| `search_kb` | Full-text search, returns top N results with excerpts |
| `read_kb` | Fetch a single article by docId (full content) |
| `list_kb_index` | Browse all articles, optionally filtered by entity type |

### FederatedKnowledgeBase — Multiple KBs

Combine multiple KBs into a unified, namespace-aware knowledge layer:

```typescript
import { KBStore, FederatedKnowledgeBase } from 'yaaf/knowledge'

const yaafKB = new KBStore('./yaaf-kb')
const teamKB = new KBStore('./team-kb')
await Promise.all([yaafKB.load(), teamKB.load()])

const federated = new FederatedKnowledgeBase([
  { name: 'yaaf', store: yaafKB },
  { name: 'team', store: teamKB },
])

// Cross-KB search
const results = federated.search('memory strategy')
// → results from both KBs, with namespace prefixes
```

---

## CI Integration

### GitHub Actions — Automated KB Builds

YAAF includes a ready-to-use GitHub Actions workflow (`.github/workflows/kb-build.yml`) that:

1. Triggers on pushes to `main` when `knowledge/src/**` or `ontology.yaml` changes
2. Runs `kb:incremental` to recompile only changed articles
3. Commits the updated `compiled/` directory back to the branch with `[skip ci]`
4. Supports manual full-rebuild via `workflow_dispatch`

**Required secret:** `GEMINI_API_KEY` — add it in GitHub → Settings → Secrets.

### Lint gate in CI

Use `.kb-lint-report.json` for CI gates:

```bash
# In your CI pipeline:
node -e "
  const report = require('./.kb-lint-report.json')
  if (report.summary.errors > 0) {
    console.error('KB has', report.summary.errors, 'error(s)')
    process.exit(1)
  }
"
```

Or run lint programmatically:

```typescript
import { KBCompiler } from 'yaaf/knowledge'

const compiler = await KBCompiler.create({
  kbDir: './my-kb',
  extractionModel: /* ... */,
  synthesisModel:  /* ... */,
})

const report = await compiler.lint()

if (report.summary.errors > 0) {
  console.error(`KB has ${report.summary.errors} error(s):`)
  for (const issue of report.issues.filter(i => i.severity === 'error')) {
    console.error(`  [${issue.code}] ${issue.docId}: ${issue.message}`)
  }
  process.exit(1)
}
```

---

## Stub Articles

When the Extractor identifies a concept mentioned in sources but not yet in the KB, it generates a `CandidateConcept`. The Synthesizer turns high-confidence candidates into **stub articles**:

```markdown
---
title: "Multi-Head Attention"
entity_type: concept
stub: true
compiled_at: "2024-01-15T10:30:00.000Z"
compiled_from: []
confidence: 0.5
---

# Multi-Head Attention

> **Stub article** — This article was auto-generated from mentions in source material.
> Expand it by adding source documents that cover this topic.

## Overview

Attention computed in parallel across multiple heads, allowing the model to
attend to different representation subspaces simultaneously.

## Related

- [[Attention Mechanism]]
```

Stubs are:
- Tagged `stub: true` — so the linter treats them as incomplete (bypasses quality checks)
- Linked from the parent article that triggered their creation
- Flagged by `STUB_WITH_SOURCES` when the linter finds they could be expanded

To expand a stub, add source material about the topic to `raw/` and re-run `compile()`.

---

## Troubleshooting

### Ontology validation errors

```
Error: ontology.yaml has 2 error(s):
  [error] entity_types: At least one entity type must be defined
  [error] entityTypes.concept.linkableTo: References unknown entity type "[concept]"
```

**Cause 1:** `linkable_to: [concept]` is being parsed as the string `"[concept]"` instead of an array.  
**Fix:** Use block list syntax:
```yaml
linkable_to:
  - concept
  - tool
```

**Cause 2:** An entity type is referenced in `linkable_to` before it's defined.  
**Fix:** All entity types referenced in `linkable_to` must be defined in `entity_types`.

---

### HTML ingestion fails

```
Error: HTML ingestion requires optional dependencies.
Run: npm install @mozilla/readability jsdom turndown
```

HTML ingestion uses three optional peer dependencies that must be installed separately. The core `yaaf` package stays lightweight — install only what you need.

---

### Synthesis produces low-quality articles

**Symptoms:** Articles are generic, miss key concepts, or don't use wikilinks.

**Fixes:**
1. Use a more capable synthesis model (`gemini-2.5-pro` > `gemini-2.5-flash`)
2. Add more entries to the `vocabulary` in `ontology.yaml` — the extractor uses these for static analysis
3. Check that sources are high-quality Markdown (not just raw HTML dumps)
4. Review the `article_structure` in your ontology — more specific section descriptions produce better output

---

### Articles have broken wikilinks

**Symptoms:** Lint reports `BROKEN_WIKILINK` for many articles.

**Likely cause:** The synthesis model invented wikilink targets that don't exist.

**How this is prevented:** The Extractor only passes `knownLinkDocIds` (registry-validated) to the Synthesizer. The synthesis prompt explicitly says "only wikilink from this list." Hallucinated links may appear in the body prose.

**Fix:**
1. Run `compiler.lint()` to get the report
2. Inspect `BROKEN_WIKILINK` issues — are the targets concepts worth adding?
3. Either add source material for the missing concepts, or manually clean the article

---

### Registry gets out of sync

**Symptoms:** `BROKEN_WIKILINK` for articles you know exist. Registry shows stale entries.

**Fix:**
```typescript
// Delete .kb-registry.json and let it rebuild from compiled/
import { rm } from 'fs/promises'
await rm('./my-kb/.kb-registry.json', { force: true })

// KBCompiler.create() will rebuild the registry from compiled/ on next run
const compiler = await KBCompiler.create({ kbDir: './my-kb', ... })
```

---

## Module Exports

All knowledge base APIs are available from `yaaf/knowledge`:

```typescript
import {
  // Pipeline coordinator
  KBCompiler,

  // Model adapter factory
  makeGenerateFn,

  // Web clipper
  KBClipper,

  // Individual pipeline stages
  ConceptExtractor,
  KnowledgeSynthesizer,
  KBLinter,

  // Ontology tools
  OntologyLoader,
  OntologyGenerator,       // ← NEW: LLM-powered ontology drafting
  validateOntology,
  buildConceptRegistry,
  buildAliasIndex,
  scanForEntityMentions,
  serializeRegistry,
  deserializeRegistry,
  upsertRegistryEntry,

  // Runtime — load + query compiled KBs
  KnowledgeBase,
  KBStore,
  createKBTools,            // ← NEW: one-liner agent KB tools
  FederatedKnowledgeBase,   // ← NEW: multi-KB federation

  // Ingestion utilities
  ingestFile,
  canIngest,
  requiredOptionalDeps,
  detectMimeType,

  // Linter utilities
  extractWikilinks,
  buildLinkGraph,

  // Frontmatter utilities
  serializeFrontmatter,
  validateFrontmatter,
} from 'yaaf/knowledge'
```

---

## Design Notes

### Why not RAG?

RAG (retrieval-augmented generation) retrieves chunks at query time based on embedding similarity. This works well for large, heterogeneous corpora but has limitations:

- **No structure** — the LLM gets random chunks, not a coherent view of the topic
- **No cross-references** — relationships between concepts aren't captured
- **Stale embeddings** — adding new documents requires re-indexing
- **Black box** — you can't read what the LLM "knows"

The KB compilation approach trades query-time cost for compile-time cost. The compiled wiki is:
- **Human-readable** — you can inspect and edit any article
- **Cross-linked** — wikilinks capture relationships explicitly
- **Deterministic** — the same sources produce the same KB
- **Healable** — the linter finds and fixes inconsistencies automatically

### Why static analysis before LLM?

The Extractor deliberately runs a vocabulary scan before calling the LLM. This:
1. Reduces the LLM's planning burden — it's told what entities it already knows about
2. Prevents hallucinated links — only registry-validated docIds reach the Synthesizer
3. Saves tokens — static hints let the LLM focus on novel classification

### Ontology as the source of truth

The ontology is not just configuration — it's used at every stage:
- **Extractor** uses it to build the extraction prompt and validate entity types
- **Synthesizer** uses it to build the synthesis prompt (article structure + required fields)
- **Linter** uses it to validate frontmatter values, linkable_to relationships, and reciprocal links
- **Vocabulary** section powers the alias index for both static analysis and the auto-fixer

A well-designed ontology produces a well-structured KB. Take the time to define clear `article_structure` sections with specific descriptions — the LLM uses them literally.
