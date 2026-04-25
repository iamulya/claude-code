# YAAF Knowledge Base — Complete Architecture Reference

> **Ground truth document.** Read this before making any changes to `src/knowledge/`.
> Updated: 2026-04-22 (v4). Covers all 63 source files. Reflects ADR-009 (Escalation Ladder), ADR-012 (Security Hardening v4).

---

## System Overview

The KB implements a **Karpathy-style "compile your knowledge" pipeline**:

```
raw/ (messy sources: PDFs, URLs, markdown, code)
  → [LLM extraction]
  → [LLM synthesis]
  → compiled/ (structured wiki: markdown articles with typed frontmatter)
```

At runtime, agents query the compiled wiki through tools (`search_kb`, `fetch_kb_document`, `list_kb_index`, `query_kb_graph`) — no vectors, no RAG, pure document retrieval with TF-IDF ranking and wikilink-based relationship traversal.

---

## Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ knowledge/                                                       │
│                                                                  │
│  ┌──────────────┐  ┌───────────────────────────────────────┐    │
│  │  ontology/    │  │  compiler/                             │    │
│  │              │  │                                         │    │
│  │  types.ts    │  │  compiler.ts      ← orchestrator        │    │
│  │  loader.ts   │  │  extractor/       ← LLM extraction      │    │
│  │  generator.ts│  │  synthesizer/     ← LLM synthesis       │    │
│  │  vocabulary.ts│  │  linter/         ← article validation   │    │
│  │  registry.ts │  │  ingester/        ← file format parsing  │    │
│  │              │  │  groundingPlugin  ← hallucination detect │    │
│  │              │  │  ontologyProposals← ontology feedback    │    │
│  │              │  │  contradictions   ← cross-article check  │    │
│  │              │  │  dedup            ← semantic dedup       │    │
│  │              │  │  differential     ← incremental compile  │    │
│  │              │  │  discovery        ← gap analysis         │    │
│  │              │  │  postprocess      ← wikilink resolution  │    │
│  │              │  │  versioning       ← article history      │    │
│  │              │  │  heal             ← LLM-powered repair   │    │
│  │              │  │  vision           ← image alt-text       │    │
│  │              │  │  lock             ← compile concurrency  │    │
│  └──────────────┘  └───────────────────────────────────────┘    │
│                                                                  │
│  ┌───────────────────────────────────────┐                      │
│  │  store/                                │                      │
│  │                                        │                      │
│  │  store.ts         ← document I/O       │                      │
│  │  tfidfSearch.ts   ← search engine      │                      │
│  │  tools.ts         ← agent-facing tools │                      │
│  │  knowledgeBase.ts ← high-level API     │                      │
│  │  federation.ts    ← multi-KB routing   │                      │
│  │  analytics.ts     ← usage tracking     │                      │
│  │  tokenizers.ts    ← text tokenization  │                      │
│  │  lruCache.ts      ← body cache         │                      │
│  │  wikilinkGraph.ts ← relationship graph  │                      │
│  └───────────────────────────────────────┘                      │
│                                                                  │
│  ┌───────────────────────────────────────┐                      │
│  │  utils/                                │                      │
│  │  frontmatter.ts  ← YAML frontmatter   │                      │
│  │  concurrency.ts  ← semaphore          │                      │
│  │  sentences.ts    ← sentence splitting  │                      │
│  └───────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Compile Pipeline (Exact Sequence)

`KBCompiler.compile()` in `compiler.ts` (1461 lines) orchestrates everything:

```
1.  Acquire compile lock            → lock.ts (PID-based, heartbeat, 3-strike timeout)
2.  Load ontology                   → ontology/loader.ts (YAML → KBOntology)
3.  Build concept registry          → ontology/registry.ts (scan compiled/ for existing articles)
4.  Discover raw source files       → compiler/discovery.ts (recursively walks raw/)
5.  Ingest raw files                → ingester/ (markdown, HTML, PDF, text, images)
6.  Run differential analysis       → differential.ts (SHA-256 hash manifest → changed files only)
7.  Extract article plans (LLM)     → extractor/ (source text → ArticlePlan[] + sourceTrustClassification)
8.  Deduplicate plans               → dedup.ts (Union-Find: title+source+description similarity)
9.  Synthesize articles (LLM)       → synthesizer/ (ArticlePlan → compiled markdown)
10. Run grounding verification      → groundingPlugin.ts (L1 keyword → L2 embedding → L3 LLM → L4 NLI)
    DEFAULT: warn (ADR-009). Every compile runs at least L1 grounding at zero cost.
11. Persist grounding report        → .kb-grounding-report.json (per-article scores)
12. Run contradiction detection     → contradictions.ts (cross-article conflict scan)
13. Run wikilink post-processing    → postprocess.ts (resolve aliases, segment oversize)
14. Run auto-lint                   → linter/ (13 checks across all articles)
15. Vocab sync                      → .kb-vocab-sync.json (sidecar for new terms)
16. Generate ontology proposals     → ontologyProposals.ts (4 proposal types → .kb-ontology-proposals.json)
17. Auto-evolve ontology            → ontologyProposals.ts::applyProposal (if --auto-evolve, confidence ≥ 0.8)
18. Persist lint report             → .kb-lint-report.json
19. Surface proposed entity types   → CompileResult.warnings[] (finding 1.2 fix)
20. Release compile lock
```

### Compile Output Files

| File | Purpose | Written by |
|---|---|---|
| `compiled/*.md` | Compiled wiki articles | synthesizer.ts |
| `.versions/` | Article version history | versioning.ts |
| `.kb-registry.json` | Concept registry (docId → meta) | compiler.ts |
| `.kb-lint-report.json` | Full lint report | compiler.ts |
| `.kb-grounding-report.json` | Per-article grounding scores | compiler.ts (7.1 fix) |
| `.kb-source-hashes.json` | SHA-256 manifest for differential | differential.ts |
| `.kb-vocab-sync.json` | Vocabulary additions sidecar | compiler.ts |
| `.kb-ontology-proposals.json` | Ontology evolution proposals | ontologyProposals.ts |
| `.kb-analytics.jsonl` | Runtime query hit data | analytics.ts |

---

## Ontology Layer (ontology/)

### `types.ts` (407 lines) — The complete domain model

| Type | Purpose |
|---|---|
| `KBOntology` | Root: `{ domain, entityTypes, relationshipTypes, vocabulary, budget, compiler }` |
| `EntityTypeSchema` | Per-type: description, extends, frontmatter schema, article structure, linkableTo, indexable, `freshness_ttl_days` |
| `FrontmatterFieldSchema` | Per-field: type, required, enum values, targetEntityType, default |
| `RelationshipType` | Directed edge: name, from, to, description, reciprocal |
| `VocabularyEntry` | Canonical term: aliases[], entityType?, docId? |
| `KBBudgetConfig` | Token limits for compile: text_document_tokens, image_tokens, max_images_per_fetch |
| `KBCompilerModelConfig` | LLM model names per pipeline stage |

### `loader.ts` (826 lines) — YAML → KBOntology

Key functions:
- `hydrateEntityType()` — Builds `EntityTypeSchema` from raw YAML. **Every new field must be added here.**
- `resolveInheritance()` — Merges parent→child for: frontmatter, articleStructure, linkableTo, freshness_ttl_days. **Every new heritable field must be propagated here.**
- `validateOntology()` — Cross-field validation: entity_ref targets, article structure, vocabulary entity types
- `OntologyLoader.load()` — Full lifecycle: parse YAML → hydrate → validate → resolve inheritance → merge vocab sidecar → throw on errors
- Reciprocal relationship validation: **exists** (line 372, severity: warning, not error)

### `generator.ts` (352 lines) — LLM-powered ontology bootstrap

- `OntologyGenerator.generate()` — Scans `srcDirs` for file tree + README + package.json context, sends to LLM, gets back a complete `ontology.yaml`, validates it, writes to disk
- **This is the "plan B" init path** — operators provide a domain description and entity type hints; the LLM drafts the entire ontology

### `vocabulary.ts` (215 lines) — Term normalization

- `buildAliasIndex()` — `Map<lowercase alias → canonical term>` from ontology vocabulary
- `normalizeWikilinks()` — Rewrites `[[alias]]` → `[[canonical term]]` in article text
- `scanForEntityMentions()` — Finds vocabulary term occurrences for backlink/mention counting
- `resolveWikilink()` — Single alias → canonical resolution

### `registry.ts` (222 lines) — Concept registry CRUD

- `buildConceptRegistry()` — Scans `compiled/` directory, parses frontmatter, returns `Map<docId, ConceptRegistryEntry>`
- `findByWikilink()` — Resolves `[[text]]` to a registry entry (tries docId, then title)
- `upsertRegistryEntry()`, `removeRegistryEntry()` — CRUD
- `serializeRegistry()` / `deserializeRegistry()` — JSON persistence
- `findByEntityType()` — Filter registry by type

---

## Compiler Layer (compiler/)

### `extractor/` — Source → Article Plans

- `extractor.ts` (763 lines) — Main extraction: batches source files, calls LLM, parses JSON response into `ArticlePlan[]`. Returns `{ plans, proposed }` where `proposed` captures unknown entity types (finding 1.2)
- `prompt.ts` (280 lines) — System/user prompt construction for extraction LLM call
- `types.ts` (207 lines) — `CompilationPlan`, `ArticlePlan`, `CandidateConcept`, `ArticleAction`

### `synthesizer/` — Article Plans → Compiled Markdown

- `synthesizer.ts` (497 lines) — `KnowledgeSynthesizer.synthesizeArticle()`: builds LLM prompt, calls model, parses output, validates frontmatter, writes versioned file
- `frontmatter.ts` (411 lines) — `validateFrontmatter()` (type checking against schema), `buildCompleteFrontmatter()` (compiler-injected fields: entity_type, compiled_at, expires_at, confidence, compiled_from, compiled_from_quality)
- `prompt.ts` (391 lines) — System/user prompt construction for synthesis LLM call

### `groundingPlugin.ts` (1176 lines) — Multi-layer hallucination detection

Four layers, each progressively more expensive (ADR-002, ADR-009):
- **L1**: Stemmed keyword overlap between claim tokens and source tokens. `buildVocabularyAliasMap()` expands through ontology aliases. Zero-cost, **always runs** (ADR-009: `groundingAction` default changed from `"skip"` to `"warn"`).
- **L2**: Embedding cosine similarity (opt-in via `embedFn`). Runs on articles that pass L1 but are ambiguous.
- **L3**: LLM claim-level verification (opt-in via `generateFn`). Runs on claims that L2 can't confidently verify.
- **L4**: NLI verifier (opt-in via `nliVerifyFn`). Detects explicit contradictions between claim and source.

### `contradictions.ts` (409 lines) — Cross-article conflict detection

- `detectContradictions()` — Scans all compiled articles, pairs high-overlap sentences, checks for:
  - Numeric disagreement (same context, different numbers)
  - Temporal conflict (same verb-phrase context, different years — finding 5.3 fix)
  - Negation conflict (affirmative vs negative of same statement)

### `dedup.ts` (227 lines) — Semantic deduplication

- `deduplicatePlans()` — **Union-Find** algorithm (finding 5.1 fix). Builds pairwise similarity edges using three signals: title Jaccard (40%), source path overlap (30%), description Jaccard (30% — ADR/A5 fix). Finds connected components, merges sources into smallest-docId survivor. Deterministic regardless of file scan order.

### `ontologyProposals.ts` (379 lines) — Ontology feedback loop

Four proposal types:
1. `add_entity_type` — ≥N concepts with unknown type
2. `add_vocabulary` — High-frequency terms not in vocab
3. `add_relationship` — Cross-type wikilinks with no relationship defined
4. `add_field` — Frontmatter fields appearing in articles but not in schema

Auto-evolve (`--auto-evolve`): applies proposals with confidence ≥ 0.8. `applyProposal()` supports `add_vocabulary` and `add_relationship` only — `add_entity_type` requires human review. Protected by `WeakSet<KBOntology>` concurrency lock.

### `linter/` — 13 Lint Checks

| # | Code | What it checks |
|---|---|---|
| 1 | MISSING_ENTITY_TYPE | Article has no `entity_type` frontmatter |
| 2 | UNKNOWN_ENTITY_TYPE | `entity_type` not in ontology |
| 3 | MISSING_REQUIRED_FIELD | Required frontmatter field absent |
| 4 | INVALID_FIELD_VALUE | Field value doesn't match type/enum |
| 5 | BROKEN_WIKILINK | `[[target]]` has no matching article |
| 6 | NON_CANONICAL_WIKILINK | `[[alias]]` should be `[[canonical term]]` |
| 7 | UNLINKED_MENTION | Body mentions a known entity without `[[wikilink]]` |
| 8 | ORPHANED_ARTICLE | No other article links to this one |
| 9 | MISSING_RECIPROCAL_LINK | A→B exists but B→A doesn't (uses ontology relationship types) |
| 10 | LOW_ARTICLE_QUALITY | Body too short (< 200 words for non-stubs) |
| 11 | BROKEN_SOURCE_REF | `compiled_from` paths don't exist on disk |
| 12 | STUB_WITH_SOURCES | Stub article has source material (should be re-synthesized) |
| 13 | (checks.ts) | Additional checks may be present |

### Other Compiler Modules

| Module | Lines | Purpose |
|---|---|---|
| `differential.ts` | 531 | SHA-256 hash manifest, only recompile changed sources. Detects ontology changes (O1) |
| `discovery.ts` | 397 | Gap analysis: finds topics in sources with no compiled article |
| `postprocess.ts` | 459 | Wikilink resolution (alias→canonical), article segmentation (split oversize articles) |
| `versioning.ts` | 228 | SHA-256 content hash, `.versions/` backup, prune old versions |
| `heal.ts` | 371 | LLM-powered repair: broken wikilinks, stubs, thin articles, orphans |
| `vision.ts` | 419 | Vision pass: auto-generate alt-text for images via vision LLM |
| `lock.ts` | 307 | PID-based compile lock with heartbeat + 3-strike stale detection |
| `atomicWrite.ts` | 73 | Write-to-temp + rename for crash-safe file writes |
| `llmClient.ts` | 367 | LLM call abstraction: makeGenerateFn, model wrappers |
| `retry.ts` | 108 | withRetry() utility for LLM calls |
| `schemas.ts` | 158 | Zod schemas for proposals file validation |
| `utils.ts` | 120 | Shared helpers |

### Ingester (`ingester/`)

| Module | Lines | Format |
|---|---|---|
| `markdown.ts` | 75 | `.md` files → text + image refs |
| `html.ts` | 543 | `.html` → cleaned text (tag stripping, link extraction) |
| `pdf.ts` | 560 | `.pdf` → text (LLM-powered via Gemini/Claude/OpenAI vision) |
| `text.ts` | 217 | `.txt`, `.csv`, `.json`, code files → text |
| `images.ts` | 318 | Image files → ImageRef objects for vision pass |
| `ssrf.ts` | 231 | URL ingestion with SSRF prevention (blocked private IPs, DNS rebind protection) |
| `ingestCache.ts` | 175 | Content-hash cache to avoid re-ingesting unchanged files |

---

## Store Layer (store/)

### `store.ts` (832 lines) — Document I/O + Index

- `KBStore` — Loads compiled/ directory, parses frontmatter for all articles, manages lazy body loading
- `DocumentMeta` — Lightweight: docId, title, entityType, isStub, wordCount, tokenEstimate, frontmatter, summary
- `CompiledDocument` — Full: everything in DocumentMeta + body
- `SearchResult` — Deprecated sync search result (has `frontmatter`)
- `KBStoreOptions.maxCachedBodies` — LRU cache size (default 200, Infinity = eager mode)
- `searchAsync()` → delegates to `KBSearchAdapter` (plugin system)
- `search()` → deprecated sync keyword search (only works in eager mode)

### `tfidfSearch.ts` (633 lines) — TF-IDF Search Engine

- `TfIdfSearchPlugin` implements `KBSearchAdapter`
- TF-IDF cosine similarity with IDF+1 smoothing
- Optional embedding blending (when `embedFn` provided)
- Vocabulary expansion: query terms → alias-expanded terms (0.5× IDF decay)
- Concurrent embedding build with lock + abort (R-5 reload safety)
- **`frontmatter` included in `KBSearchResult`** (1.1 fix)

### `tools.ts` (378 lines) — Agent-Facing KB Tools

Four tools via `createKBTools()`:
1. `list_kb_index` — Returns llms.txt-style table of contents
2. `fetch_kb_document` — Fetches full article content (with staleness annotation if `expires_at` is past)
3. `search_kb` — TF-IDF search with entity type filtering (with staleness annotation per result)
4. `query_kb_graph` — Traverse the relationship graph by docId with direction and relationship filtering

Security:
- `assertSafeDocId()` — Path traversal prevention (`..`, absolute paths, null bytes, length limit)
- `stalenessNote()` — Reads `expires_at` from frontmatter, returns `[STALE: compiled N days ago]` or null

### `knowledgeBase.ts` (403 lines) — High-Level API

- `KnowledgeBase` — Combines KBStore + createKBTools in a single class
- Auto-loads on first access, provides `tools` property for agent wiring
- Manages store lifecycle (load, reload)

### `federation.ts` (744 lines) — Multi-KB Routing

- `FederatedKnowledgeBase` — Routes queries across multiple KBStores with namespace prefixes
- Unified search: searches all KBs, merges results by score, deduplicates
- Namespace-qualified docIds: `namespace:docId`

### `tokenizers.ts` (445 lines) — Text Tokenization

| Tokenizer | Strategy |
|---|---|
| `EnglishTokenizer` | Whitespace + stop words + optional Porter stemming |
| `UnicodeTokenizer` | Unicode-aware: CJK character bigrams, Thai trigrams, Arabic word splitting |
| `NgramTokenizer` | Character n-grams (configurable n) |
| `HybridTokenizer` | Auto-detects script, dispatches to English/Unicode/Ngram |

### `analytics.ts` (124 lines) — Runtime Hit Tracking

- `KBAnalytics` — Records document fetches/searches to `.kb-analytics.jsonl`
- Ring-buffer with debounced flush (5s idle or 500 entries)
- Used by Discovery phase to prioritize stale but frequently-accessed articles

### `wikilinkGraph.ts` (175 lines) — Relationship Graph Engine

- `WikilinkGraphPlugin` implements `KBGraphAdapter`
- Builds in-memory bidirectional adjacency list from `[[wikilinks]]` in article bodies
- Relationship labels inferred from ontology `relationship_types` by matching `(from.entityType, to.entityType)`
- Direction-aware queries: outgoing, incoming, or both
- Alias-aware resolution (docId, title, and aliases all match)
- Deduplicates links within articles, ignores self-references
- Zero-dependency (in-memory). Users with Neo4j/Memgraph can implement `KBGraphAdapter` and register via `PluginHost`

---

## Data Flow Paths (Complete)

### Ontology Field → Compiled Article → Agent Query

```
ontology.yaml  (freshness_ttl_days: 90)
  ↓ loader.ts::hydrateEntityType()     ← reads field from YAML
  ↓ loader.ts::resolveInheritance()    ← propagates to child types
  ↓ EntityTypeSchema.freshness_ttl_days
  ↓ synthesizer.ts                     ← schema = ontology.entityTypes[plan.entityType]
  ↓ frontmatter.ts::buildCompleteFrontmatter({ freshnessTtlDays: schema.freshness_ttl_days })
  ↓ compiled article frontmatter       ← expires_at: ISO date
  ↓ store.ts::loadDocument()           ← parsed into DocumentMeta.frontmatter
  ↓ tfidfSearch.ts::search()           ← included in KBSearchResult.frontmatter
  ↓ tools.ts::stalenessNote()          ← reads expires_at, returns annotation or null
  ↓ agent receives "[STALE: ...]" or clean content
```

### Raw Source → Compiled Article

```
raw/paper.pdf
  ↓ discovery.ts::discoverSources()    ← finds all files in raw/
  ↓ ingester/pdf.ts                    ← extracts text + images via LLM vision
  ↓ ingestCache.ts                     ← SHA-256 content hash → skip if unchanged
  ↓ differential.ts                    ← hash manifest → skip if source unchanged
  ↓ extractor.ts::buildPlan()          ← LLM extracts ArticlePlan[]
  ↓ dedup.ts::deduplicatePlans()       ← Union-Find merges duplicates
  ↓ synthesizer.ts::synthesizeArticle()← LLM writes article markdown
  ↓ frontmatter.ts::buildCompleteFrontmatter()  ← compiler metadata injected
  ↓ versioning.ts::writeWithVersioning() ← SHA-256 check, backup old, atomic write
  ↓ compiled/concepts/attention.md
```

### Agent Search Query → Results

```
Agent calls search_kb({ query: "attention mechanism" })
  ↓ tools.ts::search_kb               ← assertSafeDocId, stripNs
  ↓ store.ts::searchAsync()            ← delegates to adapter
  ↓ tfidfSearch.ts::search()           ← tokenize, expand via vocab, TF-IDF cosine
  ↓   optional: blendEmbeddingScores() ← if embedFn provided
  ↓ KBSearchResult[]                   ← includes frontmatter
  ↓ tools.ts::stalenessNote()          ← per-result staleness check
  ↓ tool result JSON to agent
  ↓ promptGuard.ts::scan()             ← SKIPS regex patterns for KB tool results (8.2 fix)
  ↓                                      canary detection still runs
```

### Ontology Evolution Lifecycle

```
1. INIT:
   OntologyGenerator.generate()        ← LLM drafts ontology.yaml from srcDirs + domain description
   OR: manual authoring by operator

2. COMPILE:
   compiler.ts::compile()              ← loads ontology, extracts, synthesizes, lints
   ↓ unknown entity types → CompileResult.warnings[] (1.2 fix)
   ↓ vocab sidecar → .kb-vocab-sync.json (new terms for next load)
   ↓ ontologyProposals.ts              ← analyzes registry, generates proposals

3. PROPOSE:
   .kb-ontology-proposals.json         ← 4 proposal kinds, confidence-scored
   ↓ operator reviews proposals

4. EVOLVE:
   --auto-evolve flag                  ← applies confidence ≥ 0.8 proposals
   ↓ applyProposal(): add_vocabulary, add_relationship (auto)
   ↓ add_entity_type (human review only — too risky)
   ↓ serializeOntology() → updated ontology.yaml
```

---

## Plugin Integration Points

The KB uses the plugin system (`plugin/types.ts`) for extensibility:

| Interface | Default Implementation | Purpose |
|---|---|---|
| `KBSearchAdapter` | `TfIdfSearchPlugin` | Pluggable search engine |
| `KBGroundingAdapter` | `MultiLayerGroundingPlugin` | Pluggable hallucination detection |
| `KBOntologyAdapter` | (proposals system) | Pluggable ontology evolution |
| `KBGraphAdapter` | `WikilinkGraphPlugin` | Pluggable relationship graph |

Key plugin types used by KB:
- `KBSearchDocument` — What the adapter indexes (docId, title, entityType, body, frontmatter)
- `KBSearchResult` — What the adapter returns (docId, title, entityType, isStub, score, excerpt, **frontmatter**)
- `KBSearchOptions` — maxResults, entityType, namespace

> **Warning**: `SearchResult` (in `store.ts`) and `KBSearchResult` (in `plugin/types.ts`) are **different types** used in different code paths. See the engineering discipline doc for details.

---

## Security Model

| Component | What it protects against |
|---|---|
| `lock.ts` | Concurrent compilation (PID lock + heartbeat + 3-strike stale detection) |
| `ssrf.ts` | SSRF in URL ingestion (blocked private IPs, DNS rebind, allowlist mode) |
| `tools.ts::assertSafeDocId` | Path traversal via docId (`../`, absolute paths, null bytes) |
| `promptGuard.ts` | KB result injection — skips regex patterns for `fetch_kb_document` and `search_kb` tool results (8.2 fix), canary still active |
| `atomicWrite.ts` | Crash-safe writes (temp file + rename) |
| `ontologyProposals.ts` | Proposal tampering (Zod schema validation, prototype pollution prevention) |
| `loader.ts::SIDECAR_KEY_DENYLIST` | Prototype pollution via vocab sidecar keys |

---

## Test Coverage Map

| Test File | What it covers |
|---|---|
| `knowledge-ontology.test.ts` | Loader, validator, alias index, wikilink resolution, entity mentions, registry CRUD, serialization roundtrip, **freshness_ttl_days e2e**, **reciprocal validation** |
| `knowledge-compiler.test.ts` | Full compile pipeline, ingestion failures, produce warnings |
| `knowledge-extractor.test.ts` | Article plan extraction, proposed types |
| `knowledge-synthesizer.test.ts` | Article synthesis, frontmatter validation |
| `knowledge-linter.test.ts` | All 13 lint checks |
| `knowledge-graph.test.ts` | **WikilinkGraphPlugin**: graph building, relationship inference, direction queries, alias resolution, filtering, dedup, maxResults |
| `infrastructure.test.ts` | Atomic writes, lock, dedup, contradictions, grounding, tokenizers, differential |
| `integration-gaps.test.ts` | TF-IDF scoring, vocabulary expansion |
| `security-hardening.test.ts` | SSRF, prompt guard, path traversal |

| `knowledge-hardening.test.ts` | Heal, qualityHistory, citationIndex, tool confidence decay |
| `knowledge-adr012.test.ts` | ADR-012 regression: Fix 2 (L1 escalation), Fix 3 (source trust), Fix 4 (vocab cap), Fix 6 (heal guards), Fix 7 (diffengine YAML), Fix 8 (L4 top-K), Fix 11 (verificationLevel), Fix 12 (Object.create null) |

### **Known coverage gaps** (as of v4):
- ~~`freshness_ttl_days` end-to-end~~ (CLOSED: 8 tests in knowledge-ontology.test.ts)
- ~~`heal.ts` LLM-powered repair~~ (CLOSED: Fix-6 tests in knowledge-adr012.test.ts)
- `OntologyGenerator.generate()` (LLM-dependent, no unit test)
- `FederatedKnowledgeBase` cross-KB operations
- `vision.ts` image alt-text generation

---

## Key Architecture Decisions (ADRs)

Documented in `ARCHITECTURE_DECISIONS.md`:

1. **ADR-001**: TF-IDF stemming is OFF by default — vocab expansion is the right tool for morphological matching in curated KBs
2. **ADR-002**: L1 grounding is vocabulary co-occurrence, NOT fact verification — it's the cheap pre-filter for L2/L3
3. **ADR-003**: Three independent tokenization systems (grounding, search, contradiction detection) intentionally use different strategies for different precision/recall tradeoffs
4. **ADR-004**: Relationship graph is plugin-based (`KBGraphAdapter`). Default `WikilinkGraphPlugin` builds from wikilinks. Users with graph databases can swap in their own implementation via `PluginHost`.
5. **ADR-012**: Security Hardening v4 — L1 escalation-only, system-assigned source trust, vocabulary worm cap, heal output validation, yaml library parser parity, L4 top-K NLI, atomic cache writes, verificationLevel observability, null-prototype vocabulary map. Documented accepted risks: LLM oracle, federated score rigging, three-tokenizer design.
