---
primary_files:
  - src/knowledge/compiler/compiler.ts
  - src/knowledge/compiler/ingester/index.ts
  - src/knowledge/compiler/extractor/index.ts
  - src/knowledge/compiler/synthesizer/index.ts
  - src/knowledge/compiler/linter/index.ts
title: Knowledge Base System
entity_type: subsystem
summary: A Karpathy-style "knowledge compilation" pipeline that transforms messy source materials into a structured, LLM-authored wiki for agent consumption.
exports:
  - KBCompiler
  - KnowledgeBase
  - KBStore
  - FederatedKnowledgeBase
  - KBClipper
stub: false
compiled_at: 2026-04-16T14:22:22.868Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/compiler.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/extractor.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/ingester/html.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/postprocess.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/ontology/loader.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/federation.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/knowledgeBase.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/store.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/tools.ts
confidence: 1
---

## Purpose
The Knowledge Base (KB) System implements a "compile your knowledge" pipeline, inspired by Andrej Karpathy's "raw materials" approach to LLM context. It solves the problem of integrating messy, unstructured data—such as research papers, web clips, and documentation—into LLM-powered agents by transforming them into a structured, linked, and validated wiki.

The system moves beyond traditional RAG (Retrieval-Augmented Generation) by emphasizing a structured "compiled" layer where an LLM authors canonical articles based on raw sources, ensuring high-quality, consistent context for the agent at runtime.

## Architecture
The subsystem is divided into a compile-time pipeline and a runtime access layer.

### Compile-Time Pipeline
The `KBCompiler` coordinates four distinct stages to transform data:

1.  **Ingestion:** The `Ingester` layer normalizes various file formats (Markdown, HTML, PDF) into a standard `IngestedContent` format. It handles noise removal (via Mozilla Readability for HTML) and image extraction.
2.  **Extraction (Planning):** The `ConceptExtractor` performs static analysis and LLM-based classification to determine which entities (concepts, tools, papers) exist in the source material and how they map to the KB's ontology.
3.  **Synthesis (Authoring):** The `KnowledgeSynthesizer` uses an LLM to author or update markdown articles in the `compiled/` directory, following the structure defined in the ontology.
4.  **Linting & Post-Processing:** The `KBLinter` identifies broken links or orphaned articles, while post-processing steps resolve `[[wikilinks]]` and segment oversized articles into manageable parts.

### Runtime Layer
The runtime layer provides read-only access to the compiled wiki:

*   **KBStore:** A filesystem-backed store that reads compiled documents, generates an `llms.txt`-style index, and provides keyword search capabilities.
*   **KnowledgeBase:** The top-level entry point that ties the store to agent integration. It implements `ToolProvider` and `ContextProvider` interfaces.
*   **FederatedKnowledgeBase:** A specialized class that combines multiple KBs under named namespaces (e.g., `ml:concepts/attention`), allowing agents to search and retrieve documents across different domains simultaneously.

### Directory Layout
A standard YAAF Knowledge Base follows a specific directory structure:
*   `ontology.yaml`: Defines entity types, relationships, and frontmatter schemas.
*   `raw/`: Source files (e.g., research papers, web clips).
*   `compiled/`: The LLM-authored wiki articles.
*   `.kb-registry.json`: An auto-maintained index cache.

## Integration Points
The Knowledge Base System integrates with the broader YAAF framework through:

*   **Tools:** It provides three standard tools for agents: `list_kb_index`, `fetch_kb_document`, and `search_kb`.
*   **Context:** It provides a system prompt section that describes the available knowledge to the agent.
*   **Plugins:** The `KnowledgeBase` class can be registered with a `PluginHost`, allowing agents to auto-discover its tools and context.

## Key APIs

### KBCompiler
The single entry point for the compilation pipeline.
```ts
const compiler = await KBCompiler.create({
  kbDir: '/path/to/my-kb',
  extractionModel: makeGenerateFn(fastModel),
  synthesisModel:  makeGenerateFn(capableModel),
})
const result = await compiler.compile()
```

### KnowledgeBase
The primary runtime interface for loading and using a compiled KB.
```ts
const kb = await KnowledgeBase.load('./my-kb')
const agent = new Agent({
  tools: [...kb.tools()],
  systemPrompt: kb.systemPromptSection(),
})
```

### KBClipper
A programmatic utility for fetching URLs, applying Readability-based extraction, and saving the result to the `raw/` directory, mimicking the behavior of the Obsidian Web Clipper.

## Configuration
The system is primarily configured via `ontology.yaml` and `AgentConfig`.

*   **Ontology:** Defines the "rules" of the KB, including required frontmatter fields and valid entity types.
*   **CompileOptions:** Configures incremental mode, concurrency, and opt-in features like "Heal" (LLM-powered lint fixing), "Discover" (finding KB gaps), and "Vision" (generating alt-text for images).
*   **KBToolOptions:** Controls runtime behavior, such as maximum document characters and search result limits.

## Extension Points
*   **Ingesters:** Developers can provide custom `IngesterAdapter` implementations to support proprietary file formats.
*   **LLM Models:** The pipeline is provider-agnostic; any model can be used for extraction or synthesis by providing a `GenerateFn`.
*   **Strategies:** The system supports custom strategies for wikilink resolution and article segmentation during the post-processing phase.