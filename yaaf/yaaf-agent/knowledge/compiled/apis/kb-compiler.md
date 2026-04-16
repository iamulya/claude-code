---
summary: A class that manages the ingestion of raw sources and synthesis of a structured knowledge base.
export_name: KBCompiler
source_file: src/knowledge/index.ts
category: class
title: KBCompiler
entity_type: api
stub: false
compiled_at: 2026-04-16T14:08:33.628Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/knowledge-base.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/compiler.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/index.ts
confidence: 1
---

## Overview
The `KBCompiler` is the central coordinator for the YAAF knowledge base pipeline. It implements a "compile your knowledge" architecture where raw, unstructured source materials (such as research papers, web clips, and code) are transformed into a structured, human-readable, and LLM-friendly wiki.

The compiler manages four distinct stages:
1.  **Ingestion**: Parsing various file formats (Markdown, HTML, PDF, etc.) into a common internal representation.
2.  **Extraction**: Using a fast LLM to identify concepts and plan article updates based on the provided ontology.
3.  **Synthesis**: Using a high-capability LLM to author or update articles in the `compiled/` directory.
4.  **Linting & Healing**: Validating the resulting wiki for consistency, broken links, and schema adherence.

This approach replaces traditional Retrieval-Augmented Generation (RAG) by providing the LLM with a well-structured context that includes explicit cross-references (wikilinks) and metadata (frontmatter).

## Signature / Constructor

The `KBCompiler` is typically initialized using the static `create` factory method, which loads the required `ontology.yaml` and `.kb-registry.json` from the specified directory.

```typescript
class KBCompiler {
  static create(options: KBCompilerOptions): Promise<KBCompiler>;
  
  compile(options?: CompileOptions): Promise<CompileResult>;
}
```

### KBCompilerOptions
| Property | Type | Description |
| :--- | :--- | :--- |
| `kbDir` | `string` | Path to the knowledge base root directory. |
| `extractionModel` | `GenerateFn` | LLM function used for the planning and extraction phase. |
| `synthesisModel` | `GenerateFn` | LLM function used for authoring and updating articles. |
| `pluginHost` | `PluginHost` | (Optional) Host for custom ingester or synthesizer plugins. |

### CompileOptions
| Property | Type | Description |
| :--- | :--- | :--- |
| `incrementalMode` | `boolean` | If true, only processes source files newer than their compiled counterparts. |
| `concurrency` | `number` | Max parallel synthesis calls (default: 3). |
| `dryRun` | `boolean` | Runs the pipeline without writing changes to disk. |
| `onProgress` | `Function` | Callback for real-time pipeline updates. |
| `heal` | `boolean \| HealOptions` | Opt-in LLM-powered fixing of lint issues. |
| `discover` | `boolean \| DiscoveryOptions` | Opt-in LLM-powered identification of knowledge gaps. |
| `vision` | `boolean \| VisionPassOptions` | Opt-in vision pass for generating image alt-text. |

## Methods & Properties

### `compile()`
Executes the full compilation pipeline.
*   **Parameters**: `options?: CompileOptions`
*   **Returns**: `Promise<CompileResult>` containing statistics on created/updated articles, lint reports, and any errors encountered.

### `static create()`
Factory method to instantiate the compiler. It validates the existence of the `ontology.yaml` file in the `kbDir`.
*   **Parameters**: `options: KBCompilerOptions`
*   **Returns**: `Promise<KBCompiler>`

## Events
The compiler provides progress updates via the `onProgress` callback in `CompileOptions`.

| Event Stage | Payload Description |
| :--- | :--- |
| `scan` | `{ stage: 'scan', fileCount: number }` - Initial file discovery. |
| `ingest` | Progress of reading and parsing raw files. |
| `extract` | Progress of the LLM planning phase. |
| `synthesis` | Progress of article authoring. |

## Examples

### Basic Compilation
This example demonstrates initializing the compiler with Gemini models and running a standard compilation pass.

```typescript
import { KBCompiler, makeGenerateFn } from 'yaaf/knowledge'
import { GeminiChatModel } from 'yaaf'

// 1. Initialize the compiler
const compiler = await KBCompiler.create({
  kbDir: './my-kb',
  extractionModel: makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-flash' })),
  synthesisModel:  makeGenerateFn(new GeminiChatModel({ model: 'gemini-2.5-pro' })),
})

// 2. Run the pipeline
const result = await compiler.compile({
  incrementalMode: true,
  onProgress: (event) => {
    console.log(`Current stage: ${event.stage}`);
  }
})

console.log(`Successfully synthesized ${result.synthesis.created} new articles.`);
```

### Advanced Pipeline with Healing
Enabling the "heal" feature allows the compiler to automatically fix broken wikilinks or low-quality articles identified during the linting stage.

```typescript
const result = await compiler.compile({
  heal: true,
  lintOptions: {
    severity: 'error'
  }
});

if (result.fixes) {
  console.log(`Auto-fixed ${result.fixes.fixedCount} issues.`);
}
```

## See Also
*   `KBOntology` — The schema definition required by the compiler.
*   `KnowledgeBase` — The runtime store for querying compiled articles.
*   `GenerateFn` — The function signature for LLM integration.