---
title: Knowledge Base Compiler
entity_type: subsystem
summary: The subsystem responsible for processing, linting, and analyzing the YAAF knowledge base, including LLM-powered discovery of structural gaps.
primary_files:
  - src/knowledge/compiler/discovery.ts
  - src/knowledge/compiler/linter/checks.ts
  - src/knowledge/compiler/linter/linter.ts
  - src/knowledge/compiler/linter/types.ts
exports:
  - KBLinter
  - discoverGaps
  - buildLinkGraph
stub: false
compiled_at: 2026-04-16T14:22:33.216Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/discovery.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/checks.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/linter.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/types.ts
confidence: 0.95
---

## Purpose
The Knowledge Base Compiler subsystem ensures the structural integrity, factual consistency, and navigational connectivity of the YAAF knowledge base. It provides a "self-healing" pipeline that validates compiled articles against the system ontology, identifies missing or weak connections between concepts, and automatically repairs common formatting or linking errors.

The subsystem serves two primary functions:
1.  **Static Validation:** Deterministic checks for syntax, required metadata, and link integrity.
2.  **Discovery:** LLM-powered analysis to identify conceptual gaps and suggest new content based on the existing knowledge graph.

## Architecture
The subsystem is organized into an orchestration layer, a suite of deterministic linting rules, and an asynchronous discovery engine.

### KBLinter (Orchestrator)
The `KBLinter` class acts as the central coordinator. It scans the compiled knowledge base directory, executes all registered linting checks in parallel, and aggregates the results into a structured `LintReport`. It also manages the application of auto-fixes for resolvable issues.

### Static Check Engine
The compiler executes a variety of deterministic checks categorized by severity:
*   **Structural (Errors):** Validates that articles contain required frontmatter fields (e.g., `entity_type`) and that these values conform to the defined ontology.
*   **Linking (Warnings):** Detects broken wikilinks, non-canonical aliases, unlinked mentions of known entities, orphaned articles, and missing reciprocal links.
*   **Quality (Info):** Identifies low-quality stubs, broken source references, duplicate article candidates, and contradictory factual claims.

### Discovery Engine
The Discovery Engine (`discovery.ts`) uses LLM-powered graph analysis to perform high-level structural audits. Unlike static checks, discovery is an opt-in process that identifies:
*   **Missing Articles:** Frequently mentioned concepts that lack dedicated articles.
*   **Weak Connections:** Articles that are conceptually related but lack cross-references.
*   **Depth Imbalances:** Entity types with uneven coverage or significantly lower detail than the rest of the KB.

## Key APIs
The subsystem exposes several high-level functions and classes for managing KB quality:

### KBLinter
The primary class for executing validation passes.
*   `lint()`: Scans the compiled KB and returns a `LintReport`.
*   `fix(report)`: Applies automated repairs to the KB based on a `LintReport` and returns an `AutoFixResult`.

### discoverGaps
An asynchronous function that performs LLM-powered analysis.
```typescript
async function discoverGaps(
  llm: LLMCallFn,
  compiledDir: string,
  registry: ConceptRegistry,
  ontology: KBOntology,
  options?: DiscoveryOptions
): Promise<DiscoveryResult>
```

### buildLinkGraph
A utility function that constructs a bidirectional link graph from compiled articles, used for detecting orphaned content and reciprocal relationship violations.

## Configuration
The behavior of the compiler and linter can be adjusted via `DiscoveryOptions` and `LintOptions`.

### Discovery Configuration
Discovery requires an explicit `--discover` flag and can be configured with:
*   `maxCalls`: Limits the number of LLM invocations (default: 5).
*   `onProgress`: A callback for monitoring the progress of the discovery scan.

### Lint Severity
Issues are classified into three severity levels:
*   `error`: Blocks compilation (e.g., `MISSING_ENTITY_TYPE`).
*   `warning`: Degrades KB quality but allows usage (e.g., `ORPHANED_ARTICLE`).
*   `info`: Suggests improvement opportunities (e.g., `STUB_WITH_SOURCES`).

## Extension Points
The Knowledge Base Compiler supports extension through the YAAF plugin system:

### Plugin Rules
Developers can define custom linting rules using the `LinterRuleAdapter`. These rules are integrated into the `KBLinter` execution pipeline. Plugin-defined rules are identified by the `PLUGIN_` prefix in their `LintCode`.

### Auto-Fixers
The subsystem supports automated resolution for specific issue types:
*   **NON_CANONICAL_WIKILINK:** Rewrites aliases to their canonical form.
*   **UNLINKED_MENTION:** Automatically wraps the first occurrence of a known entity in wikilink syntax.
*   **MISSING_REQUIRED_FIELD:** Applies default values where defined in the ontology.